'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { GherkinEditor, type GherkinEditorHandle } from '@/components/GherkinEditor';
import { GherkinToolbar } from '@/components/GherkinToolbar';
import { StepBrowser } from '@/components/StepBrowser';
import { ImportDropzone } from '@/components/ImportDropzone';
import type { CatalogStep } from '@/lib/types';
import { slugify } from '@/lib/repo';
import { formatGherkin } from '@/lib/gherkin-cm';
import { useLanguage } from '@/providers/Providers';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';

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
function safeDecodeURI(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function matchesCatalog(stepText: string, expressions: string[]): boolean {
  return expressions.some(expr => {
    const segments = expr.split(/\{[^}]+\}/);
    const pattern = segments
      .map(s => s.replace(/[.*+?^$|[\]\\()[\]{}]/g, '\\$&'))
      .join('.+');
    try { return new RegExp(`^${pattern}$`, 'i').test(stepText); }
    catch { return false; }
  });
}

export default function EditorPage() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');

  const initialContent = stepParam
    ? `  Given ${safeDecodeURI(stepParam)}`
    : '';

  const [content, setContent] = useState<string>(initialContent);
  const [stepExpressions, setStepExpressions] = useState<string[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
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
      .catch((err: Error) => { toast.error(`Catalog non disponibile: ${err.message}`); });
  }, []);

  // Steps in content not found in the catalog
  const unknownSteps = useMemo(() => {
    if (!stepExpressions.length || !content.trim()) return [];
    const stepLineRe = /^\s+(?:given|when|then|and|but)\s+(.+)/gim;
    const seen = new Set<string>();
    const result: string[] = [];
    for (const m of content.matchAll(stepLineRe)) {
      const text = m[1].trim();
      if (!seen.has(text) && !matchesCatalog(text, stepExpressions)) {
        seen.add(text);
        result.push(text);
      }
    }
    return result;
  }, [content, stepExpressions]);

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

  // Commit contenuto corrente su GitHub via /api/github/push
  const handleCommitGitHub = useCallback(async () => {
    if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) return;

    const featureMatch = content.match(/Feature:\s*(.+)/i);
    const featureName = featureMatch ? featureMatch[1].trim() : 'scenario';
    const slug = slugify(featureName) || 'scenario';
    const filePath = `src/features/${slug}.feature`;

    setIsCommitting(true);
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-token': settings.githubToken,
          'x-github-owner': settings.githubOwner,
          'x-github-repo': settings.githubRepo,
          'x-github-branch': settings.githubBranch || 'main',
        },
        body: JSON.stringify({ content, filePath }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');
      toast.success(t.editor.commitGitHubSuccess);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`${t.editor.commitGitHubError}: ${msg}`);
    } finally {
      setIsCommitting(false);
    }
  }, [content, settings, t]);

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
        <div className="flex items-center gap-2">
          {settings.githubToken && (
            <button
              onClick={handleCommitGitHub}
              disabled={isCommitting || !content.trim()}
              className="px-3 py-1.5 text-sm rounded-md border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCommitting ? t.editor.commitGitHubLoading : t.editor.commitGitHub}
            </button>
          )}
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-sm rounded-md border border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 transition-colors"
          >
            {t.editor.download}
          </button>
        </div>
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
          {unknownSteps.length > 0 && (
            <div className="rounded-md border border-orange-300 bg-orange-50 dark:bg-orange-950 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">
              <p className="font-semibold">⚠ {unknownSteps.length} step non nel catalogo:</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 font-mono">
                {unknownSteps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
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
