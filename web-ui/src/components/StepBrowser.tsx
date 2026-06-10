'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { CatalogStep } from '@/lib/types';
import { useLanguage } from '@/providers/Providers';

export interface StepBrowserProps {
  onInsert: (expression: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusClass(status: CatalogStep['status']): string {
  switch (status) {
    case 'implemented':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'wanted':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'deprecated':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
}

/** Heuristic: guess likely Gherkin keyword from expression text */
function guessKeyword(expr: string): 'G' | 'W' | 'T' {
  const l = expr.toLowerCase();
  if (
    l.startsWith('i am') || l.startsWith('i have') ||
    l.startsWith('there is') || l.startsWith('there are') ||
    l.startsWith('a ') || l.startsWith('an ')
  ) return 'G';
  if (
    l.startsWith('i should') || l.startsWith('it should') ||
    l.startsWith('the ') || l.startsWith('my ') ||
    l.startsWith('they should')
  ) return 'T';
  return 'W';
}

const KEYWORD_CLASS: Record<'G' | 'W' | 'T', string> = {
  G: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  W: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  T: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StepBrowser({ onInsert }: StepBrowserProps) {
  const { t } = useLanguage();
  const [steps, setSteps] = useState<CatalogStep[]>([]);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => { if (data.steps) setSteps(data.steps); })
      .catch(() => {});
  }, []);

  const areas = useMemo(
    () => [...new Set(steps.map(s => s.area))].sort(),
    [steps]
  );

  const filtered = useMemo(() => {
    let list = steps;
    if (areaFilter) list = list.filter(s => s.area === areaFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.expression.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q)
      );
    }
    return list;
  }, [steps, areaFilter, query]);

  useEffect(() => { setActiveIndex(0); }, [query, areaFilter]);

  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('li[role="option"]');
    (items[activeIndex] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleInsert = useCallback((step: CatalogStep) => {
    const kw = guessKeyword(step.expression);
    const prefix = kw === 'G' ? 'Given' : kw === 'T' ? 'Then' : 'When';
    onInsert(`  ${prefix} ${step.expression}`);
  }, [onInsert]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIndex]) handleInsert(filtered[activeIndex]); }
  };

  return (
    <div className="rounded-md border border-border bg-background">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors rounded-t-md"
        aria-expanded={open}
        aria-controls="step-browser-panel"
      >
        <span>{t.stepBrowser.title} {open ? '▲' : '▼'}</span>
        {steps.length > 0 && (
          <span className="text-xs text-muted-foreground font-normal">
            {filtered.length}/{steps.length}
          </span>
        )}
      </button>

      {open && (
        <div id="step-browser-panel" className="border-t border-border">
          {/* Area filter pills */}
          {areas.length > 1 && (
            <div className="px-2 pt-2 flex flex-wrap gap-1">
              <button
                onClick={() => setAreaFilter(null)}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  areaFilter === null
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {t.stepBrowser.allAreas}
              </button>
              {areas.map(area => (
                <button
                  key={area}
                  onClick={() => setAreaFilter(area === areaFilter ? null : area)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    areaFilter === area
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="p-2">
            <Input
              placeholder={t.stepBrowser.search}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              aria-label="Filter steps"
            />
          </div>

          {/* List */}
          <ul ref={listRef} role="listbox" aria-label="Step expressions"
              className="overflow-y-auto" style={{ maxHeight: '300px' }}>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                {steps.length === 0 ? t.stepBrowser.loading : t.stepBrowser.noResults}
              </li>
            ) : (
              filtered.map((step, i) => {
                const kw = guessKeyword(step.expression);
                const active = i === activeIndex;
                return (
                  <li
                    key={`${step.sourceRef}-${i}`}
                    role="option"
                    aria-selected={active}
                    onMouseDown={e => { e.preventDefault(); handleInsert(step); }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-1.5 text-xs ${
                      active ? 'bg-teal-600 text-white' : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {/* Keyword type hint */}
                    <span
                      className={`shrink-0 w-5 text-center text-[10px] font-bold rounded ${
                        active ? 'bg-white/20 text-white' : KEYWORD_CLASS[kw]
                      }`}
                      title={kw === 'G' ? 'Given' : kw === 'W' ? 'When' : 'Then'}
                    >
                      {kw}
                    </span>

                    <span className="flex-1 font-mono truncate" title={step.expression}>
                      {step.expression}
                    </span>

                    <Badge variant="outline"
                      className={`shrink-0 text-[10px] px-1 ${active ? 'border-teal-300 text-teal-100' : ''}`}>
                      {step.area}
                    </Badge>
                    <Badge variant="outline"
                      className={`shrink-0 text-[10px] px-1 ${active ? 'border-teal-300 text-teal-100' : statusClass(step.status)}`}>
                      {step.status}
                    </Badge>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StepBrowser;
