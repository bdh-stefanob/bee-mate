'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

function statusClass(status: CatalogStep['status']): string {
  switch (status) {
    case 'implemented': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'wanted':      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'deprecated':  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
}

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
  const [pickerStep, setPickerStep] = useState<CatalogStep | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    fetch('/api/catalog')
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (data.steps) setSteps(data.steps); })
      .catch((err: Error) => { toast.error(`Step catalog non disponibile: ${err.message}`); });
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

  const handleStepClick = useCallback((step: CatalogStep) => {
    const hasParams = step.parameters && step.parameters.length > 0;
    if (hasParams) {
      setPickerStep(step);
    } else {
      const kw = guessKeyword(step.expression);
      onInsert(`    ${kw} ${step.expression}`);
    }
  }, [onInsert]);

  const handlePickerInsert = useCallback((line: string) => {
    onInsert(line);
    setPickerStep(null);
  }, [onInsert]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[activeIndex]) handleStepClick(filtered[activeIndex]); }
  };

  return (
    <div className="rounded-md border border-border bg-background">
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

              {/* Step list */}
              <ul ref={listRef} role="listbox" aria-label="Step expressions"
                  className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                {filtered.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                    {steps.length === 0 ? t.stepBrowser.loading : t.stepBrowser.noResults}
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
                        className={`relative px-3 py-2 cursor-pointer flex items-center gap-1.5 text-xs ${
                          active ? 'bg-teal-600 text-white' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {/* Dependency dot */}
                        {hasDeps && (
                          <Tooltip>
                            <TooltipTrigger
                              className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full p-0 border-0 bg-transparent ${
                                active ? '' : ''
                              }`}
                            >
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
                          className={`shrink-0 w-5 text-center text-[10px] font-bold rounded ${
                            active ? 'bg-white/20 text-white' : KEYWORD_CLASS[kw]
                          }`}
                          title={kw}
                        >
                          {KEYWORD_SHORT[kw]}
                        </span>

                        {/* Expression */}
                        <span className="flex-1 font-mono truncate" title={step.expression}>
                          {step.expression}
                        </span>

                        {/* Area badge */}
                        <Badge variant="outline"
                          className={`shrink-0 text-[10px] px-1 ${active ? 'border-teal-300 text-teal-100' : ''}`}>
                          {step.area}
                        </Badge>

                        {/* Param indicator */}
                        {hasParams && (
                          <Tooltip>
                            <TooltipTrigger
                              className={`shrink-0 inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] leading-none ${
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

                        {/* Status badge */}
                        <Badge variant="outline"
                          className={`shrink-0 text-[10px] px-1 ${active ? 'border-teal-300 text-teal-100' : statusClass(step.status)}`}>
                          {step.status}
                        </Badge>
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
