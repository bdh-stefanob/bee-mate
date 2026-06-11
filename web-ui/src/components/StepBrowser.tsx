'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CatalogStep } from '@/lib/types';
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
  if (
    l.startsWith('i am') || l.startsWith('i have') ||
    l.startsWith('there is') || l.startsWith('there are') ||
    l.startsWith('a ') || l.startsWith('an ')
  ) return 'Given';
  if (
    l.startsWith('i should') || l.startsWith('it should') ||
    l.startsWith('the ') || l.startsWith('my ') ||
    l.startsWith('they should')
  ) return 'Then';
  return 'When';
}

const KEYWORD_CLASS: Record<string, string> = {
  Given: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  When:  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Then:  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};
const KEYWORD_SHORT: Record<string, string> = { Given: 'G', When: 'W', Then: 'T' };

const STATUS_TEXT_CLASS: Record<string, string> = {
  implemented: 'text-emerald-600 dark:text-emerald-400',
  wanted:      'text-amber-600 dark:text-amber-400',
  deprecated:  'text-red-500 dark:text-red-400',
};

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
  const [steps, setSteps] = useState<CatalogStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [keywordFilter, setKeywordFilter] = useState<GherkinKeyword | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pickerStep, setPickerStep] = useState<CatalogStep | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    fetch('/api/catalog')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (data.steps) setSteps(data.steps); })
      .catch((err: Error) => { toast.error(`Step catalog non disponibile: ${err.message}`); })
      .finally(() => setIsLoading(false));
  }, []);

  const areas = useMemo(
    () => [...new Set(steps.map(s => s.area))].sort(),
    [steps]
  );

  const filtered = useMemo(() => {
    let list = steps;
    if (areaFilter) list = list.filter(s => s.area === areaFilter);
    if (keywordFilter) list = list.filter(s => guessKeyword(s.expression) === keywordFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(s =>
        s.expression.toLowerCase().includes(q) ||
        s.area.toLowerCase().includes(q)
      );
    }
    return list;
  }, [steps, areaFilter, keywordFilter, query]);

  useEffect(() => { setActiveIndex(0); }, [query, areaFilter, keywordFilter]);

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
      const kw = guessKeyword(step.expression);
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

              {/* Keyword filter pills */}
              <div className="px-2 pb-1 flex gap-1">
                {([null, 'Given', 'When', 'Then'] as const).map(kw => (
                  <button
                    key={kw ?? 'all'}
                    onClick={() => setKeywordFilter(kw)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      keywordFilter === kw
                        ? kw === null
                          ? 'bg-teal-600 text-white border-teal-600'
                          : `border-transparent text-white ${kw === 'Given' ? 'bg-teal-700' : kw === 'When' ? 'bg-blue-600' : 'bg-purple-600'}`
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {kw ?? 'All'}
                  </button>
                ))}
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

              {/* Step list */}
              <ul ref={listRef} role="listbox" aria-label="Step expressions"
                  className="overflow-y-auto" style={{ maxHeight: '480px' }}>
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
                    const kw = guessKeyword(step.expression);
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
                        className={`relative px-3 py-2 cursor-pointer flex flex-col gap-0.5 text-xs ${
                          active ? 'bg-teal-600 text-white' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {/* Row 1: keyword + expression + param indicator */}
                        <div className="flex items-start gap-1.5 min-w-0">
                          {/* Dependency dot */}
                          {hasDeps && (
                            <Tooltip>
                              <TooltipTrigger className="shrink-0 mt-1 p-0 border-0 bg-transparent">
                                <span className={`block w-1.5 h-1.5 rounded-full ${active ? 'bg-orange-300' : 'bg-accent'}`} />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[240px] text-xs">
                                <p className="text-[11px] font-medium text-muted-foreground mb-1">Requires:</p>
                                <ul className="list-disc pl-3 space-y-0.5">
                                  {step.requires!.map(req => (
                                    <li key={req} className="font-mono">{req}</li>
                                  ))}
                                </ul>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          {/* Keyword badge */}
                          <span
                            className={`shrink-0 w-5 h-[18px] flex items-center justify-center text-[10px] font-bold rounded mt-0.5 ${
                              active ? 'bg-white/20 text-white' : KEYWORD_CLASS[kw]
                            }`}
                            title={kw}
                          >
                            {KEYWORD_SHORT[kw]}
                          </span>

                          {/* Expression — wraps instead of truncating */}
                          <span className="flex-1 font-mono leading-snug break-words min-w-0">
                            {renderExpression(step.expression, active)}
                          </span>

                          {/* Param indicator */}
                          {hasParams && (
                            <Tooltip>
                              <TooltipTrigger
                                className={`shrink-0 self-start mt-0.5 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] leading-none ${
                                  active
                                    ? 'border-teal-300 text-teal-100'
                                    : hasEnums
                                      ? 'border-primary/20 bg-primary/10 text-primary'
                                      : 'border-border text-muted-foreground font-mono'
                                }`}
                              >
                                {hasEnums ? '● ~' : '{P}'}
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">
                                {hasEnums
                                  ? `${step.paramEnums?.find(p => p.values.length > 0)?.values.length ?? 0} known values`
                                  : 'Free-text parameter'}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Row 2: area · status */}
                        <div className="flex items-center gap-1 pl-6">
                          <span className={`text-[10px] ${active ? 'text-teal-100' : 'text-muted-foreground'}`}>
                            {step.area}
                          </span>
                          <span className={`text-[10px] ${active ? 'text-teal-200' : 'text-muted-foreground/40'}`}>·</span>
                          <span className={`text-[10px] ${active ? 'text-teal-100' : STATUS_TEXT_CLASS[step.status] ?? 'text-muted-foreground'}`}>
                            {step.status}
                          </span>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default StepBrowser;
