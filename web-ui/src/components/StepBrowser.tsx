'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CatalogStep } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepBrowserProps {
  onInsert: (expression: string) => void;
}

// ---------------------------------------------------------------------------
// Status badge colours (mirrors StepCatalog)
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * StepBrowser
 *
 * Collapsible panel that fetches /api/catalog and shows a filterable list
 * of step expressions. Clicking a row inserts "  Given <expression>" at the
 * current editor cursor via onInsert.
 *
 * Keyboard:
 *  - ArrowUp / ArrowDown navigate the list
 *  - Enter inserts the focused item
 */
export function StepBrowser({ onInsert }: StepBrowserProps) {
  const [steps, setSteps] = useState<CatalogStep[]>([]);
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Fetch catalog on mount
  useEffect(() => {
    fetch('/api/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.steps) setSteps(data.steps);
      })
      .catch(() => {/* silently ignore network errors */});
  }, []);

  // Filtered list
  const filtered = query.trim()
    ? steps.filter(
        s =>
          s.expression.toLowerCase().includes(query.toLowerCase()) ||
          s.area.toLowerCase().includes(query.toLowerCase())
      )
    : steps;

  // Reset active index on filter change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('li[role="option"]');
    const item = items[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleInsert = useCallback(
    (step: CatalogStep) => {
      onInsert(`  Given ${step.expression}`);
    },
    [onInsert]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) handleInsert(filtered[activeIndex]);
    }
  };

  return (
    <div className="rounded-md border border-border bg-background">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors rounded-t-md"
        aria-expanded={open}
        aria-controls="step-browser-panel"
      >
        <span>Steps {open ? '▲' : '▼'}</span>
        {steps.length > 0 && (
          <span className="text-xs text-muted-foreground font-normal">
            {filtered.length}/{steps.length}
          </span>
        )}
      </button>

      {/* Body */}
      {open && (
        <div id="step-browser-panel" className="border-t border-border">
          {/* Search */}
          <div className="p-2">
            <Input
              placeholder="Search steps…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-sm"
              aria-label="Filter steps"
            />
          </div>

          {/* List */}
          <ul
            ref={listRef}
            role="listbox"
            aria-label="Step expressions"
            className="overflow-y-auto"
            style={{ maxHeight: '300px' }}
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                {steps.length === 0 ? 'Loading…' : 'No steps found'}
              </li>
            ) : (
              filtered.map((step, i) => (
                <li
                  key={step.expression}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={e => {
                    e.preventDefault();
                    handleInsert(step);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-xs ${
                    i === activeIndex
                      ? 'bg-teal-600 text-white'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="flex-1 font-mono truncate" title={step.expression}>
                    {step.expression}
                  </span>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${i === activeIndex ? 'border-teal-300 text-teal-100' : ''}`}
                  >
                    {step.area}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${
                      i === activeIndex ? 'border-teal-300 text-teal-100' : statusClass(step.status)
                    }`}
                  >
                    {step.status}
                  </Badge>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StepBrowser;
