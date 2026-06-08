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

const GHERKIN_THEME: import('monaco-editor').editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword.feature',  foreground: '569CD6', fontStyle: 'bold' },
    { token: 'keyword.step',     foreground: '4EC9B0', fontStyle: 'bold' },
    { token: 'tag',              foreground: 'B5CEA8' },
    { token: 'comment',          foreground: '6A9955', fontStyle: 'italic' },
    { token: 'string',           foreground: 'CE9178' },
    { token: 'variable',         foreground: 'DCDCAA' },
    { token: 'delimiter.table',  foreground: 'FFD700' },
  ],
  colors: {},
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_KEYWORD_RE = /^(\s*)(Given|When|Then|And|But)(\s+)(.*)/i;

const DEFAULT_CONTENT = `Feature: My Feature

  Scenario: Happy path
    Given
    When
    Then `;

const SCENARIO_TPL  = '\n  Scenario: <title>\n    Given \n    When \n    Then \n';
const OUTLINE_TPL   =
  '\n  Scenario Outline: <title>\n    Given \n    When \n    Then \n\n    Examples:\n      | param |\n      | value |\n';
const TABLE_TPL     = '\n    | column1 | column2 |\n    | value1  | value2  |\n';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeatureEditor({ base = '' }: { base?: string }) {
  const [catalog, setCatalog]       = useState<StepCatalog | null>(null);
  const [value, setValue]           = useState(DEFAULT_CONTENT);
  const [errorCount, setErrorCount] = useState(0);
  const [copied, setCopied]         = useState(false);

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
      monaco.editor.defineTheme('gherkin-dark', GHERKIN_THEME);
    }

    // Step autocomplete provider
    monaco.languages.registerCompletionItemProvider('gherkin', {
      triggerCharacters: [' ', '\t'],
      provideCompletionItems: (model, position) => {
        const cat = catalogRef.current;
        if (!cat) return { suggestions: [] };

        const lineContent = model.getLineContent(position.lineNumber);
        const stepMatch   = lineContent.match(STEP_KEYWORD_RE);
        if (!stepMatch) return { suggestions: [] };

        // Column where the step text starts (after keyword + space), 1-indexed
        const stepStartCol =
          lineContent.indexOf(stepMatch[2]) + stepMatch[2].length + stepMatch[3].length + 1;

        return {
          suggestions: cat.steps.map((s) => ({
            label:         s.expression,
            kind:          monaco.languages.CompletionItemKind.Snippet,
            insertText:    s.expression,
            detail:        s.doc.intent ?? '',
            documentation: [
              s.doc.intent   ? `**Intent:** ${s.doc.intent}`   : '',
              s.sourceRef    ? `**Source:** \`${s.sourceRef}\`` : '',
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
  }, []);

  // Called after Monaco mounts — wire change listener
  const handleMount = useCallback(
    (editorInst: MonacoEditor.IStandaloneCodeEditor) => {
      editorRef.current = editorInst;

      let timer: ReturnType<typeof setTimeout>;
      editorInst.onDidChangeModelContent(() => {
        clearTimeout(timer);
        timer = setTimeout(() => runValidation(editorInst.getValue()), 400);
      });

      // Initial validation (catalog may already be loaded)
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
    padding: '0.35rem 0.75rem',
    fontSize: '0.82rem',
    border: '1px solid var(--sl-color-hairline)',
    borderRadius: '4px',
    background: 'var(--sl-color-bg-nav)',
    color: 'var(--sl-color-text)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const btnPrimary: React.CSSProperties = {
    ...btn,
    background: 'var(--sl-color-accent)',
    color: 'var(--sl-color-accent-high)',
    borderColor: 'var(--sl-color-accent)',
    fontWeight: 600,
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        <button style={btn} title="Insert Scenario template" onClick={() => insertTemplate(SCENARIO_TPL)}>
          + Scenario
        </button>
        <button style={btn} title="Insert Scenario Outline template" onClick={() => insertTemplate(OUTLINE_TPL)}>
          + Outline
        </button>
        <button style={btn} title="Insert data table template" onClick={() => insertTemplate(TABLE_TPL)}>
          + Table
        </button>

        <span style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {catalog && errorCount === 0 && (
            <span style={{ fontSize: '0.82rem', color: 'var(--sl-color-green, #3fb950)' }}>
              ✅ All steps valid
            </span>
          )}
          {errorCount > 0 && (
            <span style={{ fontSize: '0.82rem', color: 'var(--sl-color-red, #f85149)' }}>
              ⛔ {errorCount} step{errorCount !== 1 ? 's' : ''} not in catalog
            </span>
          )}
          {!catalog && (
            <span style={{ fontSize: '0.82rem', color: 'var(--sl-color-gray-3, #8b949e)' }}>
              ⏳ Loading catalog…
            </span>
          )}
          <button style={btn} onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button style={btnPrimary} onClick={handleDownload}>
            ⬇ Download .feature
          </button>
        </span>
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
          theme="gherkin-dark"
          onChange={(v) => setValue(v ?? '')}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          options={{
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>

      {/* ── Hint ── */}
      <p style={{ fontSize: '0.78rem', color: 'var(--sl-color-gray-3, #8b949e)', margin: 0 }}>
        💡 Type <strong>Given / When / Then</strong> + space → step autocomplete from catalog.
        &nbsp; Steps in <span style={{ color: 'var(--sl-color-red, #f85149)' }}>red</span> are
        not in the catalog — reuse an existing step or ask Steve to add a new one.
      </p>
    </div>
  );
}
