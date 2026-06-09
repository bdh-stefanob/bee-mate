/**
 * FeatureEditor
 * -------------
 * Monaco-based Gherkin editor with:
 *  - Gherkin syntax highlighting + live step validation (errors)
 *  - Basic Gherkin linting (warnings: empty steps, order, @ticket format)
 *  - Autosave to localStorage with beforeunload guard
 *  - StepBrowserPanel: drag-and-drop / double-click to insert steps
 *  - Toolbar: templates, tags, keyword selector, Jira export, download
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import JiraExportModal from './JiraExportModal';
import StepBrowserPanel from './StepBrowserPanel';
import type { CatalogStep } from './StepBrowserPanel';

loader.config({
  paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs' },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepCatalog {
  steps: CatalogStep[];
}

// ---------------------------------------------------------------------------
// Gherkin linting — pure function, no React dependencies
// ---------------------------------------------------------------------------

function computeLintWarnings(
  content: string,
  monaco: typeof import('monaco-editor'),
): MonacoEditor.IMarkerData[] {
  const markers: MonacoEditor.IMarkerData[] = [];
  const lines = content.split('\n');

  const ORDER: Record<string, number> = { given: 1, when: 2, then: 3 };

  let inScenario      = false;
  let lastKw: string | null = null;
  let stepCount       = 0;
  let scenarioLine    = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trimStart();

    // 1. Empty step (keyword with no text)
    if (/^(Given|When|Then|And|But)\s*$/i.test(trimmed)) {
      markers.push({
        startLineNumber: lineNum, endLineNumber: lineNum,
        startColumn:     1,       endColumn:     line.length + 1,
        message:  'Step vuoto — aggiungi il testo dopo la keyword',
        severity: monaco.MarkerSeverity.Warning,
        source:   'gherkin-linter',
      });
    }

    // 2. @ticket: value format check (PROJ-123)
    const ticketMatch = trimmed.match(/^@ticket:(.+)$/);
    if (ticketMatch) {
      const val = ticketMatch[1].trim();
      if (val && !/^[A-Za-z][A-Za-z0-9]+-\d+$/.test(val)) {
        markers.push({
          startLineNumber: lineNum, endLineNumber: lineNum,
          startColumn:     1,       endColumn:     line.length + 1,
          message:  `@ticket: formato non valido — atteso PROJ-123 (es. BOOT-456), trovato "${val}"`,
          severity: monaco.MarkerSeverity.Warning,
          source:   'gherkin-linter',
        });
      }
    }

    // 3. Track scenario boundaries
    if (/^\s*(Scenario Outline|Scenario|Background)\s*:/i.test(line)) {
      if (inScenario && stepCount === 0 && scenarioLine > 0) {
        markers.push({
          startLineNumber: scenarioLine,
          endLineNumber:   scenarioLine,
          startColumn:     1,
          endColumn:       (lines[scenarioLine - 1] ?? '').length + 1,
          message:  'Scenario senza step',
          severity: monaco.MarkerSeverity.Warning,
          source:   'gherkin-linter',
        });
      }
      inScenario   = true;
      lastKw       = null;
      stepCount    = 0;
      scenarioLine = lineNum;
    }

    // 4. Step order: Given → When → Then
    const kwMatch = trimmed.match(/^(Given|When|Then|And|But)\s+\S/i);
    if (kwMatch && inScenario) {
      const kw = kwMatch[1].toLowerCase();
      stepCount++;
      if (kw !== 'and' && kw !== 'but') {
        if (
          lastKw &&
          ORDER[kw]    !== undefined &&
          ORDER[lastKw] !== undefined &&
          ORDER[kw] < ORDER[lastKw]
        ) {
          markers.push({
            startLineNumber: lineNum, endLineNumber: lineNum,
            startColumn:     1,       endColumn:     line.length + 1,
            message:  `Ordine step inatteso: "${kwMatch[1]}" dopo "${lastKw}" — il flusso tipico è Given → When → Then`,
            severity: monaco.MarkerSeverity.Warning,
            source:   'gherkin-linter',
          });
        }
        lastKw = kw;
      }
    }
  });

  return markers;
}

// ---------------------------------------------------------------------------
// Gherkin Monarch tokenizer
// ---------------------------------------------------------------------------

const GHERKIN_MONARCH = {
  tokenizer: {
    root: [
      [/^(\s*)(Feature|Background|Scenario Outline|Scenario|Rule|Examples)(\s*:)/,
        ['', 'keyword.feature', '']],
      [/^(\s*)(Given|When|Then|And|But)(\s)/,
        ['', 'keyword.step', '']],
      [/^\s*@[^\s]+/, 'tag'],
      [/^\s*#.*$/, 'comment'],
      [/"[^"]*"/, 'string'],
      [/'[^']*'/, 'string'],
      [/<[^>]+>/, 'variable'],
      [/\|/, 'delimiter.table'],
    ],
  },
};

const BOOTS_DARK: import('monaco-editor').editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword.feature',  foreground: '5BA3E8', fontStyle: 'bold' },
    { token: 'keyword.step',     foreground: '4FC3F7', fontStyle: 'bold' },
    { token: 'tag',              foreground: '90CAF9' },
    { token: 'comment',          foreground: '546E7A', fontStyle: 'italic' },
    { token: 'string',           foreground: '80CBC4' },
    { token: 'variable',         foreground: 'FFECB3' },
    { token: 'delimiter.table',  foreground: 'FFD54F' },
  ],
  colors: {
    'editor.background':                       '#0A1628',
    'editor.foreground':                       '#E8F0FE',
    'editorLineNumber.foreground':             '#3A5078',
    'editorLineNumber.activeForeground':       '#5BA3E8',
    'editor.selectionBackground':              '#1B448E55',
    'editor.lineHighlightBackground':          '#0F1E3500',
    'editor.lineHighlightBorder':              '#0F1E3500',
    'editorCursor.foreground':                 '#4FC3F7',
    'editorSuggestWidget.background':          '#0F2342',
    'editorSuggestWidget.border':              '#1B448E',
    'editorSuggestWidget.foreground':          '#E8F0FE',
    'editorSuggestWidget.selectedBackground':  '#1B448E',
    'editorSuggestWidget.selectedForeground':  '#FFFFFF',
    'editorSuggestWidget.highlightForeground': '#4FC3F7',
    'editorWidget.background':                 '#0F2342',
    'editorWidget.border':                     '#1B448E',
    'editorHoverWidget.background':            '#0F2342',
    'editorHoverWidget.border':                '#1B448E',
    'scrollbarSlider.background':              '#1B448E40',
    'scrollbarSlider.hoverBackground':         '#1B448E80',
    'scrollbarSlider.activeBackground':        '#1B448EBF',
  },
};

const BOOTS_LIGHT: import('monaco-editor').editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'keyword.feature',  foreground: '1B448E', fontStyle: 'bold' },
    { token: 'keyword.step',     foreground: '0277BD', fontStyle: 'bold' },
    { token: 'tag',              foreground: '455A64' },
    { token: 'comment',          foreground: '78909C', fontStyle: 'italic' },
    { token: 'string',           foreground: '2E7D32' },
    { token: 'variable',         foreground: 'E65100' },
    { token: 'delimiter.table',  foreground: 'AD1457' },
  ],
  colors: {
    'editor.background':                       '#FAFCFF',
    'editor.foreground':                       '#1A2332',
    'editorLineNumber.foreground':             '#B0BEC5',
    'editorLineNumber.activeForeground':       '#1B448E',
    'editor.selectionBackground':              '#BBDEFB',
    'editor.lineHighlightBackground':          '#F0F4FF00',
    'editor.lineHighlightBorder':              '#F0F4FF00',
    'editorCursor.foreground':                 '#1B448E',
    'editorSuggestWidget.background':          '#FFFFFF',
    'editorSuggestWidget.border':              '#1B448E',
    'editorSuggestWidget.foreground':          '#1A2332',
    'editorSuggestWidget.selectedBackground':  '#EBF2FF',
    'editorSuggestWidget.selectedForeground':  '#1B448E',
    'editorSuggestWidget.highlightForeground': '#0277BD',
    'editorWidget.background':                 '#FFFFFF',
    'editorWidget.border':                     '#1B448E',
    'editorHoverWidget.background':            '#FFFFFF',
    'editorHoverWidget.border':                '#1B448E',
    'scrollbarSlider.background':              '#1B448E30',
    'scrollbarSlider.hoverBackground':         '#1B448E60',
    'scrollbarSlider.activeBackground':        '#1B448E99',
  },
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_KEYWORD_RE = /^(\s*)(Given|When|Then|And|But)(\s+)(.*)/i;

const DEFAULT_CONTENT = `Feature: My Feature

  @ticket:
  Scenario: Happy path
    Jira: BOOT-

    Given
    When
    Then `;

const SCENARIO_TPL =
  '\n  @ticket:\n  Scenario: <title>\n    Jira: BOOT-\n\n    Given \n    When \n    Then \n';
const OUTLINE_TPL =
  '\n  @ticket:\n  Scenario Outline: <title>\n    Jira: BOOT-\n\n    Given \n    When \n    Then \n\n    Examples:\n      | param |\n      | value |\n';
const TABLE_TPL = '\n    | column1 | column2 |\n    | value1  | value2  |\n';

const TAG_OPTIONS: { value: string; label: string; detail: string }[] = [
  { value: '@ticket:',    label: '@ticket:       Jira issue',           detail: 'Es. @ticket:BOOT-123 — collega lo scenario alla user story / bug' },
  { value: '@regression', label: '@regression    Suite regressione',    detail: 'Include questo scenario nella suite di regressione' },
  { value: '@smoke',      label: '@smoke         Smoke test',           detail: 'Test di fumo eseguito ad ogni build' },
  { value: '@sanity',     label: '@sanity        Sanity post-deploy',   detail: 'Verifica rapida dopo un deploy in ambiente' },
  { value: '@wip',        label: '@wip           Work in progress',     detail: 'Scenario in lavorazione — escluso automaticamente dal CI' },
];

const KEYWORDS = ['Given', 'When', 'Then'] as const;

// ---------------------------------------------------------------------------
// Starlight theme sync
// ---------------------------------------------------------------------------

function useStarlightTheme(): 'boots-dark' | 'boots-light' {
  const getTheme = () =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'light'
      ? 'boots-light'
      : 'boots-dark';

  const [theme, setTheme] = useState<'boots-dark' | 'boots-light'>(getTheme);

  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(getTheme()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  return theme;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'bdd-feature-draft';

export default function FeatureEditor({ base = '' }: { base?: string }) {
  const monacoTheme = useStarlightTheme();

  const [catalog, setCatalog]               = useState<StepCatalog | null>(null);
  const [value, setValue]                   = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) ?? DEFAULT_CONTENT; } catch { return DEFAULT_CONTENT; }
  });
  const [errorCount,  setErrorCount]        = useState(0);
  const [warnCount,   setWarnCount]         = useState(0);
  const [copied,      setCopied]            = useState(false);
  const [savedDraft,  setSavedDraft]        = useState(false);
  const [showJiraExport, setShowJiraExport] = useState(false);
  const [showBrowser, setShowBrowser]       = useState(true);
  const [keyword,     setKeyword]           = useState<string>('When');
  const [isDraggingStep, setIsDraggingStep] = useState(false);

  const isDirty = value !== DEFAULT_CONTENT;

  const editorRef   = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef   = useRef<typeof import('monaco-editor') | null>(null);
  const catalogRef  = useRef<StepCatalog | null>(null);
  const compiledRef = useRef<RegExp[]>([]);

  // Autosave to localStorage (debounced 800ms)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, value);
        setSavedDraft(true);
        setTimeout(() => setSavedDraft(false), 1500);
      } catch { /* localStorage non disponibile */ }
    }, 800);
    return () => clearTimeout(t);
  }, [value]);

  // Warn before close when dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Load catalog
  useEffect(() => {
    fetch(`${base}/api/steps.json`)
      .then(r => r.json())
      .then((c: StepCatalog) => {
        setCatalog(c);
        catalogRef.current  = c;
        compiledRef.current = c.steps.map(s => cucumberExprToRegex(s.expression));
        if (editorRef.current && monacoRef.current) runValidation(editorRef.current.getValue());
      })
      .catch(() => console.warn('Could not load step catalog — validation disabled.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  // Validation (errors) + linting (warnings)
  const runValidation = useCallback((content: string) => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;

    // Step catalog errors
    const errorMarkers: MonacoEditor.IMarkerData[] = [];
    if (catalogRef.current) {
      content.split('\n').forEach((line, idx) => {
        const m = line.match(STEP_KEYWORD_RE);
        if (!m) return;
        const stepText = m[4].trim();
        if (!stepText) return;
        if (!compiledRef.current.some(r => r.test(stepText))) {
          // Fuzzy suggestion: find catalog steps whose words overlap with the
          // mistyped text (case-insensitive, ignores {placeholders}).
          const typed = stepText.toLowerCase();
          const words = typed.split(/\s+/).filter(w => w.length > 2);
          const similar = catalogRef.current!.steps
            .map(s => {
              const expr = s.expression.replace(/\{[^}]+\}/g, '').toLowerCase();
              const score = words.filter(w => expr.includes(w)).length;
              return { expr: s.expression, score };
            })
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .map(x => `"${x.expr}"`);

          const hint = similar.length
            ? ` — simile a: ${similar.join(', ')}`
            : '';
          errorMarkers.push({
            startLineNumber: idx + 1, endLineNumber: idx + 1,
            startColumn:     1,       endColumn:     line.length + 1,
            message:  `Step non nel catalogo: "${stepText}"${hint}`,
            severity: monaco.MarkerSeverity.Error,
            source:   'step-validator',
          });
        }
      });
    }
    monaco.editor.setModelMarkers(model, 'step-validator', errorMarkers);
    setErrorCount(errorMarkers.length);

    // Gherkin linting warnings
    const warnMarkers = computeLintWarnings(content, monaco);
    monaco.editor.setModelMarkers(model, 'gherkin-linter', warnMarkers);
    setWarnCount(warnMarkers.length);
  }, []);

  const handleBeforeMount = useCallback((monaco: typeof import('monaco-editor')) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme('boots-dark',  BOOTS_DARK);
    monaco.editor.defineTheme('boots-light', BOOTS_LIGHT);

    if (!monaco.languages.getLanguages().find(l => l.id === 'gherkin')) {
      monaco.languages.register({ id: 'gherkin' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      monaco.languages.setMonarchTokensProvider('gherkin', GHERKIN_MONARCH as any);
      monaco.languages.setLanguageConfiguration('gherkin', {
        comments: { lineComment: '#' },
        autoClosingPairs: [
          { open: '"', close: '"' },
          { open: "'", close: "'" },
        ],
      });

      monaco.languages.registerCompletionItemProvider('gherkin', {
        // Space triggers the list on first keystroke after Given/When/Then.
        // Subsequent filtering is handled by quickSuggestions as the user types.
        triggerCharacters: [' ', '\t'],
        provideCompletionItems: (model, position) => {
          const cat = catalogRef.current;
          if (!cat) return { suggestions: [] };
          const lineContent = model.getLineContent(position.lineNumber);
          const stepMatch   = lineContent.match(STEP_KEYWORD_RE);
          if (!stepMatch) return { suggestions: [] };

          // stepStartCol = column just after keyword + whitespace (1-based)
          const kwOffset    = lineContent.search(/given|when|then|and|but/i);
          const stepStartCol = kwOffset + stepMatch[2].length + stepMatch[3].length + 1;

          // endColumn = cursor position (not end-of-line).
          // Using cursor as the range end means Monaco filters completions
          // against exactly what the user has typed so far, avoiding false
          // "no match" when the line already contains trailing text.
          const endCol = position.column;

          return {
            suggestions: cat.steps.map(s => ({
              label:      { label: s.expression, description: s.domain },
              kind:       monaco.languages.CompletionItemKind.Snippet,
              insertText: s.expression,
              // filterText must match the partially-typed step text so Monaco
              // shows the item while the user types (e.g. "I log" matches
              // "I log in with valid credentials").
              filterText:  s.expression,
              sortText:    s.expression,
              detail:      s.doc.intent ?? [s.page, s.domain].filter(Boolean).join(' · '),
              documentation: {
                value: [
                  s.doc.intent  ? `**@intent** ${s.doc.intent}`       : '',
                  s.page        ? `**page** \`${s.page}\``             : '',
                  s.sourceRef   ? `**src** \`${s.sourceRef}\``         : '',
                ].filter(Boolean).join('\n\n'),
                isTrusted: true,
              },
              range: {
                startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
                startColumn:     stepStartCol,        endColumn:     endCol,
              },
            })),
          };
        },
      });

      monaco.languages.registerCompletionItemProvider('gherkin', {
        triggerCharacters: ['@'],
        provideCompletionItems: (model, position) => {
          const lineContent = model.getLineContent(position.lineNumber);
          const trimmed     = lineContent.trimStart();
          if (!trimmed.startsWith('@')) return { suggestions: [] };
          const indent = lineContent.length - trimmed.length;
          return {
            suggestions: TAG_OPTIONS.map(t => ({
              label:         t.value,
              kind:          monaco.languages.CompletionItemKind.Keyword,
              insertText:    t.value,
              detail:        t.detail,
              documentation: t.detail,
              range: {
                startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
                startColumn:     indent + 1,          endColumn:     position.column,
              },
            })),
          };
        },
      });
    }
  }, []);

  const handleMount = useCallback(
    (editorInst: MonacoEditor.IStandaloneCodeEditor) => {
      editorRef.current = editorInst;

      requestAnimationFrame(() => {
        editorInst.layout();
        requestAnimationFrame(() => {
          editorInst.layout();
          editorInst.setScrollTop(0);
        });
      });

      const domNode = editorInst.getDomNode();
      if (domNode?.parentElement) {
        const ro = new ResizeObserver(() => editorInst.layout());
        ro.observe(domNode.parentElement);
        editorInst.onDidDispose(() => ro.disconnect());
      }

      let timer: ReturnType<typeof setTimeout>;
      editorInst.onDidChangeModelContent(() => {
        clearTimeout(timer);
        timer = setTimeout(() => runValidation(editorInst.getValue()), 400);
      });

      runValidation(editorInst.getValue());
    },
    [runValidation],
  );

  // Insert template at cursor
  function insertTemplate(tpl: string) {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.getPosition();
    if (!pos) return;
    ed.executeEdits('insert-template', [{
      range: {
        startLineNumber: pos.lineNumber, startColumn: pos.column,
        endLineNumber:   pos.lineNumber, endColumn:   pos.column,
      },
      text: tpl,
    }]);
    ed.focus();
  }

  // Insert @tag on new line above cursor
  function insertTag(tagValue: string) {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.getPosition();
    if (!pos) return;
    ed.executeEdits('insert-tag', [{
      range: {
        startLineNumber: pos.lineNumber, startColumn: 1,
        endLineNumber:   pos.lineNumber, endColumn:   1,
      },
      text: `  ${tagValue}\n`,
    }]);
    if (tagValue.endsWith(':')) {
      ed.setPosition({ lineNumber: pos.lineNumber, column: 3 + tagValue.length });
    }
    ed.focus();
  }

  // Insert a full step line from StepBrowserPanel (double-click)
  function insertStepText(text: string) {
    const ed     = editorRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const pos       = ed.getPosition();
    const lineNum   = pos?.lineNumber ?? 1;
    const model     = ed.getModel();
    const lineCount = model?.getLineCount() ?? 1;
    const targetLine = Math.min(lineNum + 1, lineCount + 1);

    if (lineNum >= lineCount) {
      const lastLen = model?.getLineLength(lineCount) ?? 0;
      ed.executeEdits('step-insert', [{
        range: new monaco.Range(lineCount, lastLen + 1, lineCount, lastLen + 1),
        text:  '\n' + text,
        forceMoveMarkers: true,
      }]);
    } else {
      ed.executeEdits('step-insert', [{
        range: new monaco.Range(targetLine, 1, targetLine, 1),
        text:  text + '\n',
        forceMoveMarkers: true,
      }]);
    }
    ed.setPosition({ lineNumber: targetLine, column: text.length + 1 });
    ed.focus();
  }

  // Drop handler: fires from the transparent overlay shown during drag
  function handleEditorDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingStep(false);
    const text = e.dataTransfer.getData('bdd-step');
    if (!text || !editorRef.current || !monacoRef.current) return;

    // getTargetAtClientPoint is public Monaco API → gives position under mouse
    const target = editorRef.current.getTargetAtClientPoint(e.clientX, e.clientY);
    const pos    = target?.position ?? editorRef.current.getPosition();
    if (!pos) return;

    const { lineNumber, column } = pos;
    const monaco = monacoRef.current;
    editorRef.current.executeEdits('drag-insert', [{
      range: new monaco.Range(lineNumber, column, lineNumber, column),
      text:  text + '\n',
      forceMoveMarkers: true,
    }]);
    editorRef.current.setPosition({ lineNumber: lineNumber + 1, column: 1 });
    editorRef.current.focus();
  }

  function cucumberExprToRegex(expr: string): RegExp {
    const parts = expr.split(/(\{[^}]+\})/);
    const pattern = parts.map(part => {
      if (part.startsWith('{') && part.endsWith('}')) {
        switch (part.slice(1, -1)) {
          case 'string':  return '"[^"]*"|\'[^\']*\'';
          case 'int':     return '-?\\d+';
          case 'float':   return '-?\\d*\\.?\\d+';
          case 'word':    return '\\S+';
          default:        return '.+';
        }
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return new RegExp(`^${pattern}$`, 'i');
  }

  function handleDownload() {
    const content = editorRef.current?.getValue() ?? value;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'scenario.feature'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    navigator.clipboard
      .writeText(editorRef.current?.getValue() ?? value)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => alert('Copy failed — please select and copy manually.'));
  }

  // ---------------------------------------------------------------------------
  // Button styles
  // ---------------------------------------------------------------------------

  const btn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    margin: 0, padding: '0.35rem 0.75rem',
    fontSize: '0.82rem', lineHeight: 1.2,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '4px', background: 'var(--sl-color-bg-nav)',
    color: 'var(--sl-color-text)', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0,
  };
  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    margin: 0, padding: '0.35rem 0.75rem',
    fontSize: '0.82rem', lineHeight: 1.2,
    border: '1px solid var(--sl-color-accent)',
    borderRadius: '4px', background: 'var(--sl-color-accent)',
    color: 'var(--sl-color-accent-high)', cursor: 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600,
  };
  const btnActive: React.CSSProperties = {
    ...btn,
    border: '1px solid var(--sl-color-accent)',
    color: 'var(--sl-color-accent)',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', flexDirection: 'row',
        flexWrap: 'nowrap', alignItems: 'center', gap: '0.4rem',
      }}>
        {/* Catalog toggle */}
        <button
          style={showBrowser ? btnActive : btn}
          title={showBrowser ? 'Nascondi Step Catalog' : 'Mostra Step Catalog'}
          onClick={() => setShowBrowser(b => !b)}
        >
          {showBrowser ? '‹ Catalog' : '› Catalog'}
        </button>

        {/* Keyword for insert */}
        <select
          style={{ ...btn, paddingRight: '0.5rem' }}
          value={keyword}
          title="Keyword usata quando si inserisce uno step dal catalog"
          onChange={e => setKeyword(e.target.value)}
        >
          {KEYWORDS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <div style={{ width: '1px', height: '1.2rem', background: 'var(--sl-color-hairline)', flexShrink: 0 }} />

        <button style={btn} title="Insert Scenario template" onClick={() => insertTemplate(SCENARIO_TPL)}>+ Scenario</button>
        <button style={btn} title="Insert Scenario Outline template" onClick={() => insertTemplate(OUTLINE_TPL)}>+ Outline</button>
        <button style={btn} title="Insert data table template" onClick={() => insertTemplate(TABLE_TPL)}>+ Table</button>

        <select
          style={{ ...btn, paddingRight: '0.5rem' }}
          value="" title="Insert tag above cursor line"
          onChange={e => { if (e.target.value) insertTag(e.target.value); e.target.value = ''; }}
        >
          <option value="" disabled>+ Tag</option>
          {TAG_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <div style={{ flex: 1 }} />

        {/* Status indicators */}
        {catalog && errorCount === 0 && warnCount === 0 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--sl-color-green, #3fb950)', whiteSpace: 'nowrap' }}>
            ✓ Tutto valido
          </span>
        )}
        {errorCount > 0 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--sl-color-red, #f85149)', whiteSpace: 'nowrap' }}>
            {errorCount} step{errorCount !== 1 ? 's' : ''} non nel catalogo
          </span>
        )}
        {warnCount > 0 && (
          <span style={{ fontSize: '0.78rem', color: '#E6A817', whiteSpace: 'nowrap' }}>
            {warnCount} avviso{warnCount !== 1 ? 'i' : ''}
          </span>
        )}
        {!catalog && (
          <span style={{ fontSize: '0.78rem', color: 'var(--sl-color-gray-3)', whiteSpace: 'nowrap' }}>
            Caricamento catalogo…
          </span>
        )}
        {savedDraft && (
          <span style={{ fontSize: '0.78rem', color: 'var(--sl-color-green, #3fb950)', whiteSpace: 'nowrap' }}>
            Salvato
          </span>
        )}
        {isDirty && (
          <button
            style={{ ...btn, fontSize: '0.78rem' }}
            title="Cancella la bozza e torna al template"
            onClick={() => {
              if (!confirm('Cancellare la bozza e tornare al template?')) return;
              try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
              setValue(DEFAULT_CONTENT);
              editorRef.current?.setValue(DEFAULT_CONTENT);
            }}
          >
            Reset
          </button>
        )}
        <button style={btn} onClick={handleCopy}>{copied ? 'Copiato' : 'Copia'}</button>
        <button style={btn} onClick={() => setShowJiraExport(true)}>Export Jira</button>
        <button style={btnPrimary} onClick={handleDownload}>Download .feature</button>
      </div>

      {/* ── Main area: Step Browser + Monaco ── */}
      <div style={{
        display: 'flex',
        height: '65vh',
        border: '1px solid var(--sl-color-hairline)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>

        {/* Step browser panel (collapsible) */}
        {showBrowser && (
          <div style={{ width: '270px', flexShrink: 0 }}>
            <StepBrowserPanel
              steps={catalog?.steps ?? []}
              keyword={keyword}
              onInsert={insertStepText}
              onDragActiveChange={setIsDraggingStep}
            />
          </div>
        )}

        {/* Monaco wrapper — receives drop via overlay */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Editor
            height="100%"
            language="gherkin"
            value={value}
            theme={monacoTheme}
            onChange={v => setValue(v ?? '')}
            beforeMount={handleBeforeMount}
            onMount={handleMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: false,
              fixedOverflowWidgets: true,
              stickyScroll: { enabled: false },
              quickSuggestions: { other: true, comments: false, strings: false },
              suggestOnTriggerCharacters: true,
            }}
          />

          {/* Drop overlay — visible only during step drag; sits on top of Monaco
              and avoids any conflict with Monaco's internal drag handling */}
          {isDraggingStep && (
            <div
              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
              onDrop={handleEditorDrop}
              onDragLeave={() => setIsDraggingStep(false)}
              style={{
                position: 'absolute', inset: 0, zIndex: 10,
                cursor: 'copy',
                background: 'rgba(27, 68, 142, 0.07)',
                border: '2px dashed #1B448E88',
                borderRadius: '0 4px 4px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'all',
              }}
            >
              <span style={{
                fontSize: '0.85rem', color: '#1B448E',
                background: 'rgba(255,255,255,0.85)',
                padding: '0.35rem 0.85rem', borderRadius: '20px',
                border: '1px solid #1B448E66',
                fontWeight: 600, letterSpacing: '0.02em',
                backdropFilter: 'blur(4px)',
              }}>
                Rilascia qui per inserire lo step
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Hint ── */}
      <p style={{ fontSize: '0.75rem', color: 'var(--sl-color-gray-3)', margin: 0, lineHeight: 1.5 }}>
        Scrivi <strong>Given / When / Then</strong> + spazio per l'autocomplete degli step dal catalogo.
        Usa il pannello <strong>Catalog</strong> per sfogliare, filtrare per dominio/page e trascinare o cliccare gli step.
        Step in <span style={{ color: 'var(--sl-color-red, #f85149)' }}>rosso</span> = non nel catalogo.
        Avvisi in <span style={{ color: '#E6A817' }}>arancio</span> = linting Gherkin (step vuoti, ordine, @ticket).
      </p>

      {/* ── Jira Export Modal ── */}
      {showJiraExport && (
        <JiraExportModal
          content={editorRef.current?.getValue() ?? value}
          onClose={() => setShowJiraExport(false)}
        />
      )}
    </div>
  );
}
