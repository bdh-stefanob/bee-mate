'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/providers/Providers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TagAggregate {
  page: string;
  display: string;
  stepCount: number;
  files: string[];
  steps: string[];
}

interface TagsResponse {
  pages: TagAggregate[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TagsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [pages, setPages] = useState<TagAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Traccia quali pagine hanno gli step espansi (slug come chiave)
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  function toggleSteps(page: string) {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(page)) {
        next.delete(page);
      } else {
        next.add(page);
      }
      return next;
    });
  }

  useEffect(() => {
    fetch('/api/tags')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: TagsResponse) => {
        if (data.error) throw new Error(data.error);
        setPages(data.pages ?? []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load tags');
        setLoading(false);
      });
  }, []);

  async function openInEditor(file: string) {
    const res = await fetch(`/api/download?file=${encodeURIComponent(file)}`);
    if (!res.ok) return;
    const content = await res.text();
    localStorage.setItem('gsd-editor-incoming', JSON.stringify({ content, filePath: file }));
    router.push('/editor');
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto flex flex-col gap-4">
      {/* Header */}
      <h1 className="text-2xl font-bold">{t.tags.title}</h1>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Empty state */}
      {!loading && !error && pages.length === 0 && (
        <p className="text-sm text-muted-foreground">{t.tags.empty}</p>
      )}

      {/* Page list */}
      {!loading && !error && pages.length > 0 && (
        <div className="flex flex-col gap-3">
          {pages.map(({ page, display, stepCount, files, steps }) => (
            <div
              key={page}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2"
            >
              {/* Page header row */}
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm text-foreground tracking-wide">
                  {display}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-medium shrink-0">
                  {stepCount} {t.tags.stepCount}
                </span>
              </div>

              {/* Files */}
              {files.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t.tags.files}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {files.map(file => (
                      <button
                        key={file}
                        onClick={() => openInEditor(file)}
                        className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate max-w-xs"
                        title={file}
                      >
                        {file}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps toggle — visibile solo se ci sono step */}
              {steps && steps.length > 0 && (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => toggleSteps(page)}
                    className="self-start text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    {expandedPages.has(page) ? t.tags.hideSteps : t.tags.showSteps}
                    <span>{expandedPages.has(page) ? '▲' : '▼'}</span>
                  </button>
                  {expandedPages.has(page) && (
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                        {t.tags.stepsLabel}
                      </span>
                      {steps.map((step, i) => (
                        <span
                          key={i}
                          className="font-mono text-xs text-foreground/80 hover:text-foreground px-2 py-0.5 rounded hover:bg-muted transition-colors"
                        >
                          {step}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
