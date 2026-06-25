'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CatalogStep } from '@/lib/types';
import { buildCatalogHeaders } from '@/lib/catalog';
import { useSettings } from '@/hooks/useSettings';
import { useLanguage } from '@/providers/Providers';
import { StepParamPicker, type GherkinKeyword } from '@/components/StepParamPicker';
import { toast } from 'sonner';

export interface StepBrowserProps {
  onInsert: (expression: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function guessKeyword(expr: string): GherkinKeyword {
  const l = expr.toLowerCase();

  // Given: preconditions / starting state
  if (
    l.startsWith('i am') || l.startsWith('i have') ||
    l.startsWith('there is') || l.startsWith('there are') ||
    l.startsWith('a ') || l.startsWith('an ') ||
    l.startsWith('the user is on the') || l.startsWith('the user has') ||
    l.startsWith('the user is a') || l.startsWith('the user is logged')
  ) return 'Given';

  // Then: system outcomes / assertions
  if (
    l.startsWith('the system') ||
    l.startsWith('i should') || l.startsWith('it should') ||
    l.startsWith('they should') || l.startsWith('my ') ||
    /^the user (is successfully|lands on)/.test(l) ||
    /^the order (is|has|was)/.test(l) ||
    /^a (secure|confirmation|message|notification)/.test(l)
  ) return 'Then';

  // When: user actions (default for "the user does something")
  if (l.startsWith('the user')) return 'When';

  return 'When';
}

const KEYWORD_CLASS: Record<string, string> = {
  Given: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  When:  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Then:  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};
const KEYWORD_SHORT: Record<string, string> = { Given: 'G', When: 'W', Then: 'T' };

function renderExpression(expr: string, active: boolean) {
  const parts = expr.split(/(\{[^}]+\})/);
  return parts.map((part, i) =>
    /^\{[^}]+\}$/.test(part)
      ? <span key={i} className={active ? 'text-teal-200' : 'text-amber-600 dark:text-amber-400'}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="flex gap-2 items-center px-3 py-2">
      <div className="h-4 w-5 shrink-0 rounded animate-pulse bg-muted" />
      <div className="h-4 flex-1 rounded animate-pulse bg-muted" />
      <div className="h-4 w-16 shrink-0 rounded animate-pulse bg-muted" />
    </div>
  );
}

export function StepBrowser({ onInsert }: StepBrowserProps) {
  const { t } = useLanguage();
  const { settings, loaded } = useSettings();
  const [steps, setSteps] = useState<CatalogStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [keywordFilter, setKeywordFilter] = useState<GherkinKeyword | null>(null);
  const [pageFilter, setPageFilter] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pickerStep, setPickerStep] = useState<CatalogStep | null>(null);
  const [expandedList, setExpandedList] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!loaded) return;
    fetch('/api/catalog', { headers: buildCatalogHeaders(settings) })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (data.steps) setSteps(data.steps); })
      .catch((err: Error) => { toast.error(`Step catalog non disponibile: ${err.message}`); })
      .finally(() => setIsLoading(false));
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const areas = useMemo(
    () => [...new Set(steps.map(s => s.area))].sort(),
    [steps]
  );

  const areaCounts = useMemo(() => {
    const map = new Map<string, number>();
    steps.forEach(s => map.set(s.area, (map.get(s.area) ?? 0) + 1));
    return map;
  }, [steps]);

  const kwCounts = useMemo(() => {
    const base = areaFilter ? steps.filter(s => s.area === areaFilter) : steps;
    const kw = (s: CatalogStep) => s.keyword ?? guessKeyword(s.expression);
    return {
      Given: base.filter(s => kw(s) === 'Given').length,
      When:  base.filter(s => kw(s) === 'When').length,
      Then:  base.filter(s => kw(s) === 'Then').length,
    };
  }, [steps, areaFilter]);

  const pages = useMemo(
    () => [...new Set(steps.map(s => s.page).filter(Boolean) as string[])].sort(),
    [steps]
  );

  const pageCounts = useMemo(() => {
    const map = new Map<string, number>();
    steps.forEach(s => { if (s.page) map.set(s.page, (map.get(s.page) ?? 0) + 1); });
    return map;
  }, [steps]);

  const filtered = useMemo(() => {
    let list = steps;
    if (areaFilter) list = list.filter(s => s.area === areaFilter);
    if (keywordFilter) list = list.filter(s => (s.keyword ?? guessKeyword(s.expression)) === keywordFilter);
    if (pageFilter) list = list.filter(s => s.page === pageFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.expression.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q) ||
        (s.page ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [steps, areaFilter, keywordFilter, pageFilter, query]);

  useEffect(() => { setActiveIndex(0); }, [query, areaFilter, keywordFilter, pageFilter]);

  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('li[role="option"]');
    (items[activeIndex] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleStepClick = useCallback((step: CatalogStep) => {
    const hasParams = step.parameters && step.parameters.length > 0;
    if (hasParams) {
      setPickerStep(step);
    } else {
      const kw = step.keyword ?? guessKeyword(step.expression);
      onInsert(`    ${kw} ${step.expression}\n`);
    }
  }, [onInsert]);

  const handlePickerInsert = useCallback((line: string) => {
    onInsert(line.endsWith('\n') ? line : line + '\n');
    setPickerStep(null);
  }, [onInsert]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIndex]) handleStepClick(filtered[activeIndex]); }
  };

  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors rounded-t-md"
        aria-expanded={open}
      >
        <span>{t.stepBrowser.title} {open ? '▲' : '▼'}</span>
        {steps.length > 0 && (
          <span className="text-xs text-muted-foreground font-normal">
            {filtered.length}/{steps.length}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-border">
          {/* Param picker — shown instead of list when a parametric step is selected */}
          {pickerStep ? (
            <div className="p-2">
              <StepParamPicker
                step={pickerStep}
                defaultKeyword={guessKeyword(pickerStep.expression)}
                onInsert={handlePickerInsert}
                onClose={() => setPickerStep(null)}
              />
            </div>
          ) : (
            <>
              {/* Filters — area pills + keyword pills */}
              <div className="px-2 pt-2 pb-1 flex flex-col gap-1">
                {/* Area */}
                {areas.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setAreaFilter(null)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
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
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                          areaFilter === area
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {area}
                        <span className={`text-[9px] ${areaFilter === area ? 'text-teal-100' : ''}`}>
                          {areaCounts.get(area)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Keyword — sempre colorati, conteggio dinamico */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setKeywordFilter(null)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      keywordFilter === null
                        ? 'bg-foreground text-background border-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    All
                  </button>
                  {(['Given', 'When', 'Then'] as const).map(kw => {
                    const active = keywordFilter === kw;
                    const colorActive = kw === 'Given' ? 'bg-teal-600 text-white border-teal-600'
                      : kw === 'When' ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-purple-600 text-white border-purple-600';
                    const colorIdle = kw === 'Given'
                      ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                      : kw === 'When'
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
                    return (
                      <button
                        key={kw}
                        onClick={() => setKeywordFilter(active ? null : kw)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 font-medium ${
                          active ? colorActive : colorIdle
                        }`}
                      >
                        {kw[0]}
                        <span className="text-[9px] font-normal">{kwCounts[kw]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search */}
              <div className="p-2 pt-1">
                <Input
                  placeholder={t.stepBrowser.search}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 text-sm"
                  aria-label="Filter steps"
                />
              </div>

              {/* Page filter chips — shown only when catalog has pages */}
              {pages.length > 0 && (
                <div className="flex flex-wrap gap-1 px-2 pb-1">
                  <button
                    onClick={() => setPageFilter(null)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                      pageFilter === null
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {t.stepBrowser.allPages}
                  </button>
                  {pages.map(page => (
                    <button
                      key={page}
                      onClick={() => setPageFilter(page === pageFilter ? null : page)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${
                        pageFilter === page
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {page}
                      <span className={`text-[9px] ${pageFilter === page ? 'text-teal-100' : ''}`}>
                        {pageCounts.get(page)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Step list */}
              <ul ref={listRef} role="listbox" aria-label="Step expressions"
                  className="overflow-y-auto" style={{ maxHeight: expandedList ? '480px' : '180px' }}>
                {isLoading ? (
                  <li aria-busy="true">
                    <div className="space-y-1 py-1">
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </div>
                  </li>
                ) : filtered.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                    {t.stepBrowser.noResults}
                  </li>
                ) : (
                  filtered.map((step, i) => {
                    const kw = step.keyword ?? guessKeyword(step.expression);
                    const active = i === activeIndex;
                    const hasParams = step.parameters?.length > 0;
                    const hasEnums = step.paramEnums?.some(p => p.values.length > 0);
                    const hasDeps = (step.requires?.length ?? 0) > 0;

                    return (
                      <li
                        key={`${step.sourceRef}-${i}`}
                        role="option"
                        aria-selected={active}
                        onMouseDown={e => { e.preventDefault(); handleStepClick(step); }}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`cursor-pointer text-xs ${
                          active ? 'bg-teal-600 text-white' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <Tooltip>
                          <TooltipTrigger className="flex w-full items-center gap-1.5 px-3 py-1.5 bg-transparent border-0 text-inherit text-left outline-none cursor-pointer">
                            {/* Dependency dot — only shown when step has requires */}
                            {hasDeps && (
                              <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${active ? 'bg-orange-300' : 'bg-amber-400'}`} />
                            )}

                            {/* Keyword badge */}
                            <span className={`shrink-0 w-5 h-4 flex items-center justify-center text-[10px] font-bold rounded ${
                              active ? 'bg-white/20 text-white' : KEYWORD_CLASS[kw]
                            }`}>
                              {KEYWORD_SHORT[kw]}
                            </span>

                            {/* Expression — single line, truncated; tooltip shows full */}
                            <span className="flex-1 font-mono truncate min-w-0">
                              {renderExpression(step.expression, active)}
                            </span>

                            {/* Area */}
                            <span className={`shrink-0 text-[10px] max-w-[52px] truncate ${
                              active ? 'text-teal-100' : 'text-muted-foreground'
                            }`}>
                              {step.area}
                            </span>

                            {/* Proposed badge */}
                            {step.status === 'proposed' && (
                              <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-[#F97316] text-white font-medium">
                                Proposed
                              </span>
                            )}

                            {/* Param indicator */}
                            {hasParams && (
                              <span className={`shrink-0 text-[10px] font-semibold ${
                                active ? 'text-teal-200' : hasEnums ? 'text-primary' : 'text-muted-foreground'
                              }`}>
                                {hasEnums ? '~' : 'P'}
                              </span>
                            )}
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-[300px] p-3">
                            <p className="font-mono text-xs break-words leading-relaxed">
                              {renderExpression(step.expression, false)}
                            </p>
                            <div className="mt-1.5 text-[10px] text-muted-foreground">
                              {step.area}
                            </div>
                            {hasDeps && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-[10px] font-semibold text-amber-500 mb-1">Requires:</p>
                                <ul className="list-disc pl-3 space-y-0.5">
                                  {step.requires!.map(req => (
                                    <li key={req} className="font-mono text-[10px]">{req}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  })
                )}
              </ul>

              {/* Expand / collapse list toggle */}
              {!isLoading && filtered.length > 0 && (
                <button
                  onClick={() => setExpandedList(e => !e)}
                  className="w-full px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 border-t border-border transition-colors text-center"
                >
                  {expandedList
                    ? `Riduci ▲`
                    : `Mostra tutti (${filtered.length}) ▼`}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default StepBrowser;
