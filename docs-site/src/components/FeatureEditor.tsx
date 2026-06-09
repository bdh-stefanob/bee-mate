/**
 * FeatureEditor
 * -------------
 * Monaco-based Gherkin editor with:
 *  - Custom Gherkin syntax highlighting
 *  - Step autocomplete from step-catalog.json (fetched at runtime)
 *  - Live inline validation: red underline on steps not in catalog
 *  - Toolbar: Add Scenario / Add Outline / Add Table templates
 *  - Export: download as .feature or copy to clipboard
 *
 * Inspired by the Automator-GE POC, rebuilt as a React island for Astro.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import JiraExportModal from './JiraExportModal';

// Load Monaco from CDN — avoids Vite worker-file configuration issues and
// keeps the bundle small for GitHub Pages hosting.
loader.config({
  paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs' },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogStep {
  expression: string;
  parameters: string[];
  domain: string;
  page?: string;
  sourceRef: string;
  doc: { intent?: string; params: Record<string, string> };
}

interface StepCatalog {
  steps: CatalogStep[];
}

// ---------------------------------------------------------------------------
// Utilities (mirrors validate-steps.ts — kept in sync manually)
// ---------------------------------------------------------------------------

function cucumberExprToRegex(expr: string): RegExp {
  const parts = expr.split(/(\{[^}]+\})/);
  const pattern = parts
    .map((part) => {
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
    })
    .join('');
  return new RegExp(`^${pattern}$`, 'i');
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

// Boots Blue #1B448E (primary brand) — dark theme
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

// Boots Blue #1B448E — light theme
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

// Templates include @ticket: tag + a description line (free text between
// "Scenario:" and the first step — valid Gherkin, great for Jira refs/notes).
const SCENARIO_TPL =
  '\n  @ticket:\n  Scenario: <title>\n    Jira: BOOT-\n\n    Given \n    When \n    Then \n';
const OUTLINE_TPL =
  '\n  @ticket:\n  Scenario Outline: <title>\n    Jira: BOOT-\n\n    Given \n    When \n    Then \n\n    Examples:\n      | param |\n      | value |\n';
const TABLE_TPL = '\n    | column1 | column2 |\n    | value1  | value2  |\n';

// Tag options for the "+ Tag" toolbar control and Monaco autocomplete.
const TAG_OPTIONS: { value: string; label: string; detail: string }[] = [
  { value: '@ticket:',    label: '@ticket:       Jira issue',           detail: 'Es. @ticket:BOOT-123 — collega lo scenario alla user story / bug' },
  { value: '@regression', label: '@regression    Suite regressione',    detail: 'Include questo scenario nella suite di regressione' },
  { value: '@smoke',      label: '@smoke         Smoke test',           detail: 'Test di fumo eseguito ad ogni build' },
  { value: '@sanity',     label: '@sanity        Sanity post-deploy',   detail: 'Verifica rapida dopo un deploy in ambiente' },
  { value: '@wip',        label: '@wip           Work in progress',     detail: 'Scenario in lavorazione — escluso automaticamente dal CI' },
];

// ---------------------------------------------------------------------------
// Starlight theme sync
// ---------------------------------------------------------------------------

/** Returns 'boots-dark' or 'boots-light' tracking Starlight's data-theme toggle. */
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

export default function FeatureEditor({ base = '' }: { base?: string }) {
  const monacoTheme = useStarlightTheme();

  const [catalog, setCatalog]         = useState<StepCatalog | null>(null);
  const [value, setValue]             = useState(DEFAULT_CONTENT);
  const [errorCount, setErrorCount]   = useState(0);
  const [copied, setCopied]           = useState(false);
  const [showJiraExport, setShowJiraExport] = useState(false);

  const editorRef   = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef   = useRef<typeof import('monaco-editor') | null>(null);
  const catalogRef  = useRef<StepCatalog | null>(null);
  const compiledRef = useRef<RegExp[]>([]);

  // Load catalog once on mount
  useEffect(() => {
    const url = `${base}/api/steps.json`;
    fetch(url)
      .then((r) => r.json())
      .then((c: StepCatalog) => {
        setCatalog(c);
        catalogRef.current  = c;
        compiledRef.current = c.steps.map((s) => cucumberExprToRegex(s.expression));
        // Trigger validation now that catalog is ready
        if (editorRef.current && monacoRef.current) {
          runValidation(editorRef.current.getValue());
        }
      })
      .catch(() => console.warn('Could not load step catalog — validation disabled.'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  // Validation: set Monaco model markers for unrecognised steps
  const runValidation = useCallback((content: string) => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    if (!catalogRef.current) {
      monaco.editor.setModelMarkers(model, 'step-validator', []);
      return;
    }

    const markers: MonacoEditor.IMarkerData[] = [];

    content.split('\n').forEach((line, idx) => {
      const m = line.match(STEP_KEYWORD_RE);
      if (!m) return;
      const stepText = m[4].trim();
      if (!stepText) return;

      const matched = compiledRef.current.some((r) => r.test(stepText));
      if (!matched) {
        markers.push({
          startLineNumber: idx + 1,
          endLineNumber:   idx + 1,
          startColumn:     1,
          endColumn:       line.length + 1,
          message:         `Step not in catalog: "${stepText}". Check the sidebar or ask Steve.`,
          severity:        monaco.MarkerSeverity.Error,
        });
      }
    });

    monaco.editor.setModelMarkers(model, 'step-validator', markers);
    setErrorCount(markers.length);
  }, []);

  // Called once before Monaco renders — register language + theme
  const handleBeforeMount = useCallback((monaco: typeof import('monaco-editor')) => {
    monacoRef.current = monaco;

    // Always (re-)define themes so they are available even when Monaco CDN is
    // served from browser cache with Gherkin already registered from a prior session.
    monaco.editor.defineTheme('boots-dark',  BOOTS_DARK);
    monaco.editor.defineTheme('boots-light', BOOTS_LIGHT);

    if (!monaco.languages.getLanguages().find((l) => l.id === 'gherkin')) {
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

      // Step autocomplete — triggers on space/tab after Given/When/Then/And/But
      monaco.languages.registerCompletionItemProvider('gherkin', {
        triggerCharacters: [' ', '\t'],
        provideCompletionItems: (model, position) => {
          const cat = catalogRef.current;
          if (!cat) return { suggestions: [] };

          const lineContent = model.getLineContent(position.lineNumber);
          const stepMatch   = lineContent.match(STEP_KEYWORD_RE);
          if (!stepMatch) return { suggestions: [] };

          const stepStartCol =
            lineContent.indexOf(stepMatch[2]) + stepMatch[2].length + stepMatch[3].length + 1;

          return {
            suggestions: cat.steps.map((s) => ({
              label:         s.expression,
              kind:          monaco.languages.CompletionItemKind.Snippet,
              insertText:    s.expression,
              detail:        [s.page, s.doc.intent].filter(Boolean).join(' — '),
              documentation: [
                s.doc.intent ? `**Intent:** ${s.doc.intent}` : '',
                s.page       ? `**Page:** \`${s.page}\``     : '',
                s.sourceRef  ? `**Source:** \`${s.sourceRef}\`` : '',
              ]
                .filter(Boolean)
                .join('\n\n'),
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber:   position.lineNumber,
                startColumn:     stepStartCol,
                endColumn:       lineContent.length + 1,
              },
            })),
          };
        },
      });

      // Tag autocomplete — triggers on '@' at the start of a (possibly indented) line
      monaco.languages.registerCompletionItemProvider('gherkin', {
        triggerCharacters: ['@'],
        provideCompletionItems: (model, position) => {
          const lineContent = model.getLineContent(position.lineNumber);
          const trimmed     = lineContent.trimStart();
          if (!trimmed.startsWith('@')) return { suggestions: [] };
          const indent = lineContent.length - trimmed.length;

          return {
            suggestions: TAG_OPTIONS.map((t) => ({
              label:         t.value,
              kind:          monaco.languages.CompletionItemKind.Keyword,
              insertText:    t.value,
              detail:        t.detail,
              documentation: t.detail,
              range: {
                startLineNumber: position.lineNumber,
                endLineNumber:   position.lineNumber,
                startColumn:     indent + 1,   // from '@'
                endColumn:       position.column,
              },
            })),
          };
        },
      });
    }
  }, []);

  // Called after Monaco mounts — wire change listener + fix cursor alignment
  const handleMount = useCallback(
    (editorInst: MonacoEditor.IStandaloneCodeEditor) => {
      editorRef.current = editorInst;

      // Double-RAF layout + scroll reset: Starlight's CSS transitions are still
      // running when Monaco initialises. Two frames ensure Monaco remeasures after
      // the browser has painted its final position. setScrollTop(0) guards against
      // an initialisation quirk where Monaco scrolls 19px (one line) down on mount,
      // making the first line appear above the gutter.
      requestAnimationFrame(() => {
        editorInst.layout();
        requestAnimationFrame(() => {
          editorInst.layout();
          editorInst.setScrollTop(0);
        });
      });

      // ResizeObserver keeps layout in sync for subsequent container resizes.
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

  // Insert a template snippet at current cursor position
  function insertTemplate(tpl: string) {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.getPosition();
    if (!pos) return;
    ed.executeEdits('insert-template', [
      {
        range: {
          startLineNumber: pos.lineNumber,
          startColumn:     pos.column,
          endLineNumber:   pos.lineNumber,
          endColumn:       pos.column,
        },
        text: tpl,
      },
    ]);
    ed.focus();
  }

  // Insert a @tag on a new line above the current cursor line.
  // If the tag ends with ':' (e.g. @ticket:) the cursor lands after it
  // so the user can type the value immediately.
  function insertTag(tagValue: string) {
    const ed = editorRef.current;
    if (!ed) return;
    const pos = ed.getPosition();
    if (!pos) return;
    const lineNum = pos.lineNumber;
    ed.executeEdits('insert-tag', [
      {
        range: {
          startLineNumber: lineNum,
          startColumn:     1,
          endLineNumber:   lineNum,
          endColumn:       1,
        },
        text: `  ${tagValue}\n`,
      },
    ]);
    if (tagValue.endsWith(':')) {
      ed.setPosition({ lineNumber: lineNum, column: 3 + tagValue.length });
    }
    ed.focus();
  }

  function handleDownload() {
    const content = editorRef.current?.getValue() ?? value;
    const blob    = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = 'scenario.feature';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    navigator.clipboard
      .writeText(editorRef.current?.getValue() ?? value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => alert('Copy failed — please select and copy manually.'));
  }

  // ---------------------------------------------------------------------------
  // Styles (inline to keep the component self-contained)
  // ---------------------------------------------------------------------------
  const btn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,               // override Starlight sibling-margin rules
    padding: '0.35rem 0.75rem',
    fontSize: '0.82rem',
    lineHeight: 1.2,
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '4px',
    background: 'var(--sl-color-bg-nav)',
    color: 'var(--sl-color-text)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  // Defined explicitly (no spread) to avoid React shorthand/longhand conflicts
  // that produce empty border-top-style/width in the computed style.
  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
    padding: '0.35rem 0.75rem',
    fontSize: '0.82rem',
    lineHeight: 1.2,
    border: '1px solid var(--sl-color-accent)',
    borderRadius: '4px',
    background: 'var(--sl-color-accent)',
    color: 'var(--sl-color-accent-high)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    fontWeight: 600,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        gap: '0.4rem',
      }}>
        <button style={btn} title="Insert Scenario template" onClick={() => insertTemplate(SCENARIO_TPL)}>
          + Scenario
        </button>
        <button style={btn} title="Insert Scenario Outline template" onClick={() => insertTemplate(OUTLINE_TPL)}>
          + Outline
        </button>
        <button style={btn} title="Insert data table template" onClick={() => insertTemplate(TABLE_TPL)}>
          + Table
        </button>
        {/* Native <select> styled as a button — zero extra state, browser handles the dropdown */}
        <select
          style={{ ...btn, paddingRight: '0.5rem' }}
          title="Insert tag above cursor line"
          value=""
          onChange={(e) => { if (e.target.value) insertTag(e.target.value); e.target.value = ''; }}
        >
          <option value="" disabled>+ Tag</option>
          {TAG_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {catalog && errorCount === 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--sl-color-green, #3fb950)', whiteSpace: 'nowrap' }}>
            All steps valid
          </span>
        )}
        {errorCount > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--sl-color-red, #f85149)', whiteSpace: 'nowrap' }}>
            {errorCount} step{errorCount !== 1 ? 's' : ''} not in catalog
          </span>
        )}
        {!catalog && (
          <span style={{ fontSize: '0.8rem', color: 'var(--sl-color-gray-3, #8b949e)', whiteSpace: 'nowrap' }}>
            Loading catalog...
          </span>
        )}

        <button style={btn} onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button style={btn} onClick={() => setShowJiraExport(true)}>
          Export to Jira
        </button>
        <button style={btnPrimary} onClick={handleDownload}>
          Download .feature
        </button>
      </div>

      {/* ── Monaco ── */}
      <div style={{
        border: '1px solid var(--sl-color-hairline)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <Editor
          height="65vh"
          language="gherkin"
          value={value}
          theme={monacoTheme}
          onChange={(v) => setValue(v ?? '')}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: false,       // ResizeObserver in handleMount drives layout()
            fixedOverflowWidgets: true,   // overlays at doc root — avoids Starlight clip
            // Sticky scroll overlays the first line with a floating scope widget,
            // making line numbers appear offset. Disabled to keep numbers correct.
            stickyScroll: { enabled: false },
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>

      {/* ── Hint ── */}
      <p style={{ fontSize: '0.78rem', color: 'var(--sl-color-gray-3, #8b949e)', margin: 0 }}>
        Scrivi <strong>Given / When / Then</strong> + spazio per l'autocomplete degli step.
        Usa <strong>+ Tag</strong> o digita <strong>@</strong> per aggiungere riferimenti Jira, categorie di test e altro.
        Tra <code>Scenario:</code> e il primo step puoi inserire testo libero (link, note, ticket) — è Gherkin valido.
        Step sottolineati in <span style={{ color: 'var(--sl-color-red, #f85149)' }}>rosso</span> non
        sono nel catalogo — riusa uno step esistente o chiedi a Steve.
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
