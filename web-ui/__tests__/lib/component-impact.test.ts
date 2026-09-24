import { describe, it, expect } from 'vitest';
import { computeComponentImpact, countAnchoredSteps, componentImpactKey } from '@/lib/component-impact';
import type { CatalogStep } from '@/lib/types';

function step(expression: string, components?: CatalogStep['components']): CatalogStep {
  return {
    expression,
    parameters: [],
    app: 'app-a',
    area: 'test',
    domain: 'app-a/test',
    status: 'implemented',
    sourceRef: `x.ts:1`,
    documented: true,
    components,
  };
}

describe('computeComponentImpact', () => {
  it('groups steps by component, most-used first', () => {
    const steps = [
      step('a', [{ role: 'button', name: 'Add to cart' }]),
      step('b', [{ role: 'button', name: 'Add to cart' }]),
      step('c', [{ role: 'link', name: 'Checkout' }]),
      step('d'), // non ancorato: non deve comparire
    ];

    const impact = computeComponentImpact(steps);

    expect(impact).toHaveLength(2);
    expect(impact[0]).toMatchObject({ role: 'button', name: 'Add to cart' });
    expect(impact[0]!.steps.map((s) => s.expression)).toEqual(['a', 'b']);
    expect(impact[1]!.steps.map((s) => s.expression)).toEqual(['c']);
  });

  it('keeps the same component on different pages distinct', () => {
    const steps = [
      step('a', [{ role: 'button', name: 'Submit', page: 'LoginPage' }]),
      step('b', [{ role: 'button', name: 'Submit', page: 'CheckoutPage' }]),
    ];

    const impact = computeComponentImpact(steps);

    expect(impact).toHaveLength(2);
    expect(new Set(impact.map((i) => i.page))).toEqual(new Set(['LoginPage', 'CheckoutPage']));
  });

  it('produces a stable key that distinguishes page-qualified components', () => {
    const a = componentImpactKey({ role: 'button', name: 'Submit', page: 'LoginPage' });
    const b = componentImpactKey({ role: 'button', name: 'Submit', page: 'CheckoutPage' });
    const c = componentImpactKey({ role: 'button', name: 'Submit' });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it('returns an empty map when nothing is anchored', () => {
    expect(computeComponentImpact([step('a'), step('b')])).toEqual([]);
  });
});

describe('countAnchoredSteps', () => {
  it('counts only steps with at least one component', () => {
    const steps = [
      step('a', [{ role: 'button', name: 'X' }]),
      step('b'),
      step('c', []),
    ];
    expect(countAnchoredSteps(steps)).toBe(1);
  });

  it('is zero for a catalog with no anchoring at all', () => {
    expect(countAnchoredSteps([step('a'), step('b')])).toBe(0);
  });
});
