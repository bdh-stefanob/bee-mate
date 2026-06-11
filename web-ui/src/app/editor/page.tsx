'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
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

function EditorContent() {
  const { t } = useLanguage();
  const { settings } = useSettings();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');

  const [isSaving, setIsSaving] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalSelected, setProposalSelected] = useState<Set<string>>(new Set());
  const [isProposing, setIsProposing] = useState(false);
  const [content, setContent] = useState<string>(() => {
    if (stepParam) return `  Given ${safeDecodeURI(stepParam)}`;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gsd-editor-draft') ?? '';
    }
    return '';
  });
  const [stepExpressions, setStepExpressions] = useState<string[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const editorRef = useRef<GherkinEditorHandle | null>(null);

  // Persist draft to localStorage so navigating to catalog and back doesn't lose content
  useEffect(() => {
    localStorage.setItem('gsd-editor-draft', content);
  }, [content]);

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

  // Save feature file to src/features/ on the local server filesystem
  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    const featureMatch = content.match(/Feature:\s*(.+)/i);
    const featureName = featureMatch ? featureMatch[1].trim() : 'scenario';
    const slug = slugify(featureName) || 'scenario';

    // Derive app/flow from @tag1 @tag2 on the first tag line
    const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m);
    const tags = tagLine?.[1].match(/@(\S+)/g)?.map(t => t.slice(1)) ?? [];
    const appSlug  = tags[0] ? slugify(tags[0]) : null;
    const flowSlug = tags[1] ? slugify(tags[1]) : null;

    // filePath is relative to FEATURES_DIR (src/features/)
    const filePath = appSlug && flowSlug
      ? `${appSlug}/${flowSlug}/${slug}.feature`
      : `${slug}.feature`;

    setIsSaving(true);
    try {
      const res = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filePath }),
      });
      const data = await res.json() as { ok?: boolean; path?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');
      toast.success(`Salvato in ${data.path}`);
      if (unknownSteps.length > 0) {
        setProposalSelected(new Set(unknownSteps));
        setProposalOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Salvataggio fallito: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }, [content, unknownSteps]);

  // Ctrl+S → save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  // Propose unknown steps to catalog as @wanted
  const handlePropose = useCallback(async () => {
    const expressions = [...proposalSelected];
    if (!expressions.length) return;
    const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m);
    const tags = tagLine?.[1].match(/@(\S+)/g)?.map(tag => tag.slice(1)) ?? [];
    const app  = tags[0] ? slugify(tags[0]) : '';
    const area = tags[1] ? slugify(tags[1]) : 'to-classify';
    setIsProposing(true);
    try {
      const res = await fetch('/api/catalog/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expressions, app, area }),
      });
      const data = await res.json() as { ok?: boolean; added?: number; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Unknown error');
      toast.success(`${data.added} step aggiunti al catalogo come @wanted`);
      setProposalOpen(false);
      // Refresh step expressions so unknownSteps recalculates
      const catalogRes = await fetch('/api/catalog');
      const catalogData = await catalogRes.json() as { steps?: CatalogStep[] };
      if (catalogData.steps) setStepExpressions(catalogData.steps.map(s => s.expression));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore proposta');
    } finally {
      setIsProposing(false);
    }
  }, [proposalSelected, content]);

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
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            title="Ctrl+S"
            className="px-3 py-1.5 text-sm rounded-md border border-green-600 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
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
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">⚠ {unknownSteps.length} step non nel catalogo</p>
                <button
                  onClick={() => { setProposalSelected(new Set(unknownSteps)); setProposalOpen(o => !o); }}
                  className="shrink-0 text-[10px] px-2 py-0.5 rounded border border-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                >
                  {proposalOpen ? 'Chiudi ▲' : 'Proponi al catalogo ▼'}
                </button>
              </div>

              {proposalOpen && (
                <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-800 flex flex-col gap-2">
                  <div className="space-y-1">
                    {unknownSteps.map(s => (
                      <label key={s} className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={proposalSelected.has(s)}
                          onChange={() => setProposalSelected(prev => {
                            const next = new Set(prev);
                            if (next.has(s)) { next.delete(s); } else { next.add(s); }
                            return next;
                          })}
                          className="mt-0.5 shrink-0 accent-orange-600"
                        />
                        <span className="font-mono">{s}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePropose}
                      disabled={isProposing || proposalSelected.size === 0}
                      className="text-[10px] px-2 py-0.5 rounded bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-50"
                    >
                      {isProposing ? 'Aggiunta…' : `Aggiungi ${proposalSelected.size} come @wanted`}
                    </button>
                    <button
                      onClick={() => setProposalOpen(false)}
                      className="text-[10px] px-2 py-0.5 rounded border border-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                    >
                      Ignora
                    </button>
                  </div>
                </div>
              )}
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

export default function EditorPage() {
  return (
    <Suspense>
      <EditorContent />
    </Suspense>
  );
}
