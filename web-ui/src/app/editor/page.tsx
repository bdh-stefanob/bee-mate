'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { GherkinEditor, type GherkinEditorHandle } from '@/components/GherkinEditor';
import { GherkinToolbar } from '@/components/GherkinToolbar';
import { StepBrowser } from '@/components/StepBrowser';
import { ImportDropzone } from '@/components/ImportDropzone';
import type { CatalogStep } from '@/lib/types';
import { slugify } from '@/lib/repo';
import { formatGherkin } from '@/lib/gherkin-cm';
import { useLanguage } from '@/providers/Providers';

/**
 * EditorPage (/editor)
 *
 * Two-column layout (lg: 2/3 editor | 1/3 step browser):
 *  Left column:
 *    - GherkinToolbar (structure/step keyword inserts + undo/redo)
 *    - GherkinEditor (CodeMirror 6, controlled)
 *    - ImportDropzone (below editor)
 *
 *  Right column:
 *    - StepBrowser (search + click-to-insert)
 *    - Feature Preview (<pre> of current content)
 *
 * ?step= pre-population: if the URL contains ?step=..., the editor is
 * pre-populated with "  Given <step>" on mount.
 */
export default function EditorPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');

  const initialContent = stepParam
    ? `  Given ${decodeURIComponent(stepParam)}`
    : '';

  const [content, setContent] = useState<string>(initialContent);
  const [stepExpressions, setStepExpressions] = useState<string[]>([]);
  const editorRef = useRef<GherkinEditorHandle | null>(null);

  // Load step expressions from catalog once
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: { steps?: CatalogStep[] }) => {
        if (data.steps) {
          setStepExpressions(data.steps.map(s => s.expression));
        }
      })
      .catch(() => {/* catalog not available — autocomplete disabled */});
  }, []);

  // Toolbar + StepBrowser insert handler
  const handleInsert = useCallback((text: string) => {
    editorRef.current?.insertAtCursor(text);
  }, []);

  // Undo / Redo via editor ref
  const handleUndo = useCallback(() => {
    editorRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.redo();
  }, []);

  // Format Gherkin indentation
  const handleFormat = useCallback(() => {
    const formatted = formatGherkin(content);
    if (formatted !== content) setContent(formatted);
  }, [content]);

  // Download current editor content as .feature file
  const handleDownload = useCallback(() => {
    const featureMatch = content.match(/Feature:\s*(.+)/i);
    const featureName = featureMatch ? featureMatch[1].trim() : 'scenario';
    const filename = slugify(featureName) || 'scenario';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.feature`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  return (
    <div className="p-4 lg:p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">{t.editor.title}</h1>
        <button
          onClick={handleDownload}
          className="px-3 py-1.5 text-sm rounded-md border border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors"
        >
          {t.editor.download}
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* LEFT COLUMN — editor */}
        <div className="flex flex-col gap-3 lg:w-2/3 min-w-0">
          <GherkinToolbar
            onInsert={handleInsert}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onFormat={handleFormat}
            formatLabel={t.editor.format}
          />
          <GherkinEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            stepExpressions={stepExpressions}
          />
          <ImportDropzone
            onImported={(featureContent) => setContent(featureContent)}
          />
        </div>

        {/* RIGHT COLUMN — step browser + preview */}
        <div className="flex flex-col gap-4 lg:w-1/3 min-w-0">
          <StepBrowser onInsert={handleInsert} />

          {/* Feature preview */}
          <div className="rounded-md border border-border bg-muted/30 flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                {t.editor.preview}
              </p>
            </div>
            <pre className="text-sm font-mono whitespace-pre-wrap text-foreground break-words p-3 overflow-auto flex-1 max-h-96">
              {content || t.editor.previewPlaceholder}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
