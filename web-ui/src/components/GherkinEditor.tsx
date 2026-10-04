'use client';

import { useEffect, useRef } from 'react';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  ViewPlugin,
  Decoration,
  hoverTooltip,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { foldGutter, foldService, foldKeymap } from '@codemirror/language';
import { lintGutter } from '@codemirror/lint';
import { gherkinLanguage, gherkinTheme, gherkinLinter } from '@/lib/gherkin-cm';
import { GHERKIN_PREFIX_RE } from '@/lib/autocomplete';
import { matchesCatalog } from '@/lib/catalog-match';

// Fold ranges for Gherkin: each Scenario/Scenario Outline block is collapsible
const gherkinFoldService = foldService.of((state, _lineStart, lineEnd) => {
  const line = state.doc.lineAt(lineEnd);
  if (!/^\s*Scenario(?:\s+Outline)?:/i.test(line.text)) return null;
  const STOP = /^\s*(Scenario(?:\s+Outline)?:|Feature:|Rule:|Background:|@\S)/i;
  for (let num = line.number + 1; num <= state.doc.lines; num++) {
    const nl = state.doc.line(num);
    if (STOP.test(nl.text)) {
      let end = num - 1;
      while (end > line.number && state.doc.line(end).text.trim() === '') end--;
      const to = state.doc.line(end).to;
      return to > lineEnd ? { from: lineEnd, to } : null;
    }
  }
  const to = state.doc.length;
  return to > lineEnd ? { from: lineEnd, to } : null;
});

// ---------------------------------------------------------------------------
// Unknown-step decoration plugin
// ---------------------------------------------------------------------------

const STEP_LINE_RE = /^(\s+)(given|when|then|and|but)\s+(.+)/i;
const unknownStepMark = Decoration.mark({ class: 'cm-unknown-step' });

function buildUnknownDecorations(
  view: EditorView,
  expressions: string[]
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  if (expressions.length === 0) return builder.finish();
  for (let i = 1; i <= view.state.doc.lines; i++) {
    const line = view.state.doc.line(i);
    const m = line.text.match(STEP_LINE_RE);
    if (!m) continue;
    const stepText = m[3].trim();
    if (matchesCatalog(stepText, expressions)) continue;
    // Mark only the step text portion (after the keyword prefix)
    const stepStart = line.from + line.text.indexOf(m[3]);
    builder.add(stepStart, line.to, unknownStepMark); // ascending order — Pitfall 1
  }
  return builder.finish();
}

function createUnknownStepPlugin(expressionsRef: { current: string[] }) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildUnknownDecorations(view, expressionsRef.current);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged) {
          this.decorations = buildUnknownDecorations(u.view, expressionsRef.current);
        }
      }
    },
    { decorations: v => v.decorations }
  );
}

function createHoverTooltip(expressionsRef: { current: string[] }, testoRef: { current: string }) {
  return hoverTooltip((_view, pos, side) => {
    // We need to check if the hovered position is inside an unknown step mark.
    // We do this by finding the line and re-evaluating the step.
    // hoverTooltip fires with the EditorView available via _view.
    const view = _view;
    const line = view.state.doc.lineAt(pos);
    const m = line.text.match(STEP_LINE_RE);
    if (!m) return null;
    const stepText = m[3].trim();
    // Only show tooltip if the step is unknown
    if (matchesCatalog(stepText, expressionsRef.current)) return null;
    // Compute the range of the step text within the line
    const stepStart = line.from + line.text.indexOf(m[3]);
    const stepEnd = line.to;
    // Ensure the hover position falls within the step text range
    if (pos < stepStart || (side < 0 ? pos <= stepStart : pos >= stepEnd)) return null;
    return {
      pos: stepStart,
      end: stepEnd,
      above: true,
      create() {
        const dom = document.createElement('div');
        dom.textContent = testoRef.current;
        dom.className = 'cm-unknown-tooltip';
        return { dom };
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GherkinEditorProps {
  value: string;
  onChange: (v: string) => void;
  /** Step expressions from catalog — used for autocomplete and unknown-step detection */
  stepExpressions: string[];
  /** Legacy: initialValue for backward compatibility */
  initialValue?: string;
  /** The accessible name of the text field (a field without a name is read as nothing). */
  etichetta?: string;
  /** Tooltip of an unknown step. Default: a plain notice. */
  etichettaPassoSconosciuto?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GherkinEditor — CodeMirror 6 based Gherkin editor
 *
 * Features:
 *  - Gherkin syntax highlighting (teal keywords, green steps, gray comments, orange tags)
 *  - Inline Gherkin linter (errors/warnings)
 *  - Autocomplete from step expressions (prefix-match, case-insensitive, max 8)
 *  - Unknown-step inline decoration (orange underline) with hover tooltip
 *  - Line numbers, active-line gutter, undo/redo history
 *  - Controlled value: syncs from outside (value prop) and emits to onChange
 */
const GherkinEditor = function GherkinEditor({
    value, onChange, stepExpressions, initialValue, etichetta, etichettaPassoSconosciuto,
  }: GherkinEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    // Track last value sent/received to avoid infinite loops
    const lastValueRef = useRef<string>(value ?? initialValue ?? '');
    // Keep stepExpressions accessible in autocomplete/decoration closures without recreating extensions
    const stepExpressionsRef = useRef<string[]>(stepExpressions);
    // WR-03: keep latest onChange in a ref so the init closure never goes stale
    const onChangeRef = useRef(onChange);
    // The tooltip text is read when the tooltip opens, so a ref keeps it current
    const etichettaRef = useRef(etichetta);
    const tooltipRef = useRef(etichettaPassoSconosciuto ?? 'Step not in catalog');

    // Update refs when props change
    useEffect(() => {
      stepExpressionsRef.current = stepExpressions;
    }, [stepExpressions]);

    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
      tooltipRef.current = etichettaPassoSconosciuto ?? 'Step not in catalog';
    }, [etichettaPassoSconosciuto]);

    // ---------------------------------------------------------------------------
    // Autocomplete source
    // ---------------------------------------------------------------------------

    function gherkinComplete(context: CompletionContext): CompletionResult | null {
      const textToCursor = context.state.doc.sliceString(0, context.pos);
      const m = textToCursor.match(GHERKIN_PREFIX_RE);
      if (!m) return null;

      const prefix = m[2].toLowerCase();
      const all = stepExpressionsRef.current;
      const startsWith = all.filter(e => e.toLowerCase().startsWith(prefix));
      const contains   = all.filter(e => !e.toLowerCase().startsWith(prefix) && e.toLowerCase().includes(prefix));
      const filtered   = [...startsWith, ...contains].slice(0, 8);

      if (filtered.length === 0) return null;

      // Replace from start of the text after the keyword on the current line
      const line = context.state.doc.lineAt(context.pos);
      const lineText = line.text.trimStart();
      const indentLen = line.text.length - lineText.length;
      const keywordMatch = lineText.match(/^(Given|When|Then|And|But)\s/);
      if (!keywordMatch) return null;
      const replaceFrom = line.from + indentLen + keywordMatch[1].length + 1;

      return {
        from: replaceFrom,
        options: filtered.map(expression => ({
          label: expression,
          type: 'text',
        })),
      };
    }

    // ---------------------------------------------------------------------------
    // Editor initialization (runs once on mount)
    // ---------------------------------------------------------------------------

    useEffect(() => {
      if (!containerRef.current) return;

      const startValue = value ?? initialValue ?? '';
      lastValueRef.current = startValue;

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          lastValueRef.current = newValue;
          // WR-03: call via ref so we always invoke the latest onChange, not the stale closure
          onChangeRef.current(newValue);
        }
      });

      // Unknown-step plugin instances (created once; read refs dynamically)
      const unknownStepPlugin = createUnknownStepPlugin(stepExpressionsRef);
      const unknownStepHover  = createHoverTooltip(stepExpressionsRef, tooltipRef);

      const view = new EditorView({
        state: EditorState.create({
          doc: startValue,
          extensions: [
            gherkinLanguage,
            gherkinTheme,
            gherkinLinter,
            lintGutter(),
            lineNumbers(),
            highlightActiveLineGutter(),
            history(),
            keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
            gherkinFoldService,
            foldGutter({ openText: '▼', closedText: '▶' }),
            autocompletion({ override: [gherkinComplete], activateOnTyping: true, maxRenderedOptions: 10 }),
            // Unknown-step decoration extensions (after autocompletion)
            unknownStepPlugin,
            unknownStepHover,
            updateListener,
            // The text field gets a name: an editor nobody can name is read as nothing.
            EditorView.contentAttributes.of({ 'aria-label': etichettaRef.current ?? 'Gherkin Editor' }),
            EditorView.theme({
              '&': {
                fontFamily: 'var(--font-mono, ui-monospace, "Cascadia Code", "Fira Mono", monospace)',
                fontSize: '0.875rem',
                minHeight: '400px',
              },
              '.cm-scroller': {
                minHeight: '400px',
              },
              '.cm-content': {
                padding: '0.5rem 0',
                caretColor: 'var(--foreground)',
              },
              '.cm-cursor': {
                borderLeftColor: 'var(--foreground)',
              },
              '.cm-gutters': {
                backgroundColor: 'var(--muted)',
                borderRight: '1px solid var(--border)',
                color: 'var(--muted-foreground)',
              },
              '.cm-activeLineGutter': {
                backgroundColor: 'var(--accent)',
              },
              '.cm-foldGutter .cm-gutterElement': {
                cursor: 'pointer',
                color: 'var(--muted-foreground)',
                padding: '0 2px',
                fontSize: '0.6rem',
                lineHeight: '1.5rem',
                userSelect: 'none',
              },
              '.cm-foldGutter .cm-gutterElement:hover': {
                color: 'var(--foreground)',
              },
              // Unknown-step decoration styles
              '.cm-unknown-step': {
                borderBottom: '2px solid oklch(0.65 0.2 35)',
              },
              '.cm-unknown-tooltip': {
                padding: '2px 8px',
                fontSize: '0.75rem',
                borderRadius: 'var(--radius-dettaglio)',
              },
            }),
          ],
        }),
        parent: containerRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------------------------------------------------------------------------
    // Sync value prop → EditorView (controlled component)
    // ---------------------------------------------------------------------------

    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;

      const current = view.state.doc.toString();
      // Only update if the value came from outside (not from our own onChange)
      if (current !== value && lastValueRef.current !== value) {
        lastValueRef.current = value;
        view.dispatch({
          changes: { from: 0, to: current.length, insert: value },
        });
      }
    }, [value]);

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
      <div
        ref={containerRef}
        className="w-full rounded-scheda border border-border bg-background text-foreground overflow-hidden"
        style={{ minHeight: '400px', fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}
      />
    );
  };

GherkinEditor.displayName = 'GherkinEditor';

export { GherkinEditor };
export default GherkinEditor;
