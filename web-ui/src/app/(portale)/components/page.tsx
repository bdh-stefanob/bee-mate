'use client';

import { useEffect, useState } from 'react';
import type { CatalogStep } from '@/lib/types';
import { computeComponentImpact, countAnchoredSteps, type ComponentImpact } from '@/lib/component-impact';
import { buildCatalogHeaders } from '@/lib/catalog';
import { useSettings } from '@/hooks/useSettings';
import { Badge } from '@/components/ui/badge';

/**
 * "If I change this component, how many scenarios does it touch?"
 *
 * This is the reverse index: for each frontend component that a catalog step
 * declares (via `@component` in the step definition, populated by
 * `scripts/lib/generate-emit.ts` when a step is generated from a recording),
 * how many steps depend on it. It lives on the catalog portal — not on the
 * cruscotto control screen — because it is a catalog-authoring question:
 * you ask it while deciding whether a UI change is safe, which is exactly
 * what this page is for.
 *
 * Only steps that came from a recording carry `@component` today. The 137
 * hand-written steps have no anchor and are correctly absent here — see the
 * "not anchored" count below, which mirrors what the cruscotto diagnosis
 * already reports.
 */
export default function ComponentsPage() {
  const { settings, loaded } = useSettings();
  const [steps, setSteps] = useState<CatalogStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loaded) return;
    fetch('/api/catalog', { headers: buildCatalogHeaders(settings) })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSteps(data.steps ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
        setLoading(false);
      });
  }, [loaded, settings]);

  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Error: {error}
        </div>
      </div>
    );
  }

  const impact = computeComponentImpact(steps);
  const anchored = countAnchoredSteps(steps);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
          Component impact
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>
          For each frontend component a step declares, how many catalog steps use it.
          Answers &ldquo;if I change this, how many scenarios break?&rdquo; before it happens.
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {anchored} of {steps.length} steps are anchored to a component
          {steps.length > 0 ? ` (${Math.round((anchored / steps.length) * 100)}%)` : ''}. The rest were
          written by hand, not generated from a recording, and have no anchor to show here.
        </p>
      </div>

      {impact.length === 0 ? (
        <div
          className="rounded-lg border p-4 text-sm"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)', color: 'var(--testo-tenue)' }}
        >
          No step in the catalog declares a component yet. Generate a scenario from a real recording
          (<code>npm run generate</code>) — the steps it proposes carry <code>@component</code> tags, and
          running <code>npm run catalog</code> afterwards will populate this page.
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-lg border"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
        >
          <table className="min-w-[600px] w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--bordo)' }}>
                <th className="text-left px-3 py-2">Component</th>
                <th className="text-left px-3 py-2">Page</th>
                <th className="text-left px-3 py-2">Steps</th>
              </tr>
            </thead>
            <tbody>
              {impact.map((item) => {
                const key = `${item.page ?? ''}\u0000${item.role}\u0000${item.name}`;
                const isOpen = expanded.has(key);
                return (
                  <>
                    <tr
                      key={key}
                      className="border-b cursor-pointer select-none"
                      style={{ borderColor: 'var(--bordo)' }}
                      onClick={() => toggle(key)}
                      aria-expanded={isOpen}
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {item.role} &ldquo;{item.name}&rdquo;
                      </td>
                      <td className="px-3 py-2">{item.page ?? '—'}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
                        >
                          {item.steps.length} {item.steps.length === 1 ? 'step' : 'steps'}
                        </Badge>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${key}-detail`} style={{ background: 'var(--superficie-tenue)' }}>
                        <td colSpan={3} className="px-3 py-2">
                          <ul className="flex flex-col gap-1">
                            {item.steps.map((s, i) => (
                              <li key={`${s.sourceRef}-${i}`} className="font-mono text-xs" style={{ color: 'var(--testo-tenue)' }}>
                                {s.expression}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
