import { describe, it, expect } from 'vitest';
import type { CatalogStep } from '@/lib/types';
import { filterSteps, uniqueAreas, uniqueStatuses } from '@/lib/catalog';

// Sample fixture mirroring real step-catalog.json structure
const steps: CatalogStep[] = [
  {
    expression: 'I add {string} to the basket',
    parameters: ['{string}'],
    app: 'app-a',
    area: 'imported',
    domain: 'app-a/imported',
    status: 'wanted',
    sourceRef: 'steps/checkout.ts:1',
    documented: true,
  },
  {
    expression: 'I am logged in as {string}',
    parameters: ['{string}'],
    app: 'app-a',
    area: 'auth',
    domain: 'app-a/auth',
    status: 'implemented',
    sourceRef: 'steps/auth.ts:1',
    documented: true,
  },
  {
    expression: 'I click the checkout button',
    parameters: [],
    app: 'app-a',
    area: 'common',
    domain: 'app-a/common',
    status: 'implemented',
    sourceRef: 'steps/common.ts:1',
    documented: true,
  },
  {
    expression: 'I view my order history',
    parameters: [],
    app: 'app-a',
    area: 'orders',
    domain: 'app-a/orders',
    status: 'wanted',
    sourceRef: 'steps/orders.ts:1',
    documented: false,
  },
  {
    expression: 'the basket contains {int} items',
    parameters: ['{int}'],
    app: 'app-a',
    area: 'imported',
    domain: 'app-a/imported',
    status: 'implemented',
    sourceRef: 'steps/checkout.ts:10',
    documented: true,
  },
];

describe('filterSteps', () => {
  it('Test 1: filtra per query case-insensitive su expression (basket)', () => {
    const result = filterSteps(steps, { query: 'basket' });
    expect(result).toHaveLength(2);
    expect(result.every(s => s.expression.toLowerCase().includes('basket'))).toBe(true);
  });

  it('Test 2: filtra per area (auth)', () => {
    const result = filterSteps(steps, { area: 'auth' });
    expect(result).toHaveLength(1);
    expect(result[0].area).toBe('auth');
  });

  it('Test 3: filtra per status (wanted)', () => {
    const result = filterSteps(steps, { status: 'wanted' });
    expect(result).toHaveLength(2);
    expect(result.every(s => s.status === 'wanted')).toBe(true);
  });

  it('Test 4: nessun filtro ritorna tutti gli step', () => {
    expect(filterSteps(steps, {})).toHaveLength(steps.length);
  });

  it('Test 5: filtri combinati (query+area+status) applicano AND', () => {
    // "basket" + area "imported" + status "wanted" → solo il primo step
    const result = filterSteps(steps, { query: 'basket', area: 'imported', status: 'wanted' });
    expect(result).toHaveLength(1);
    expect(result[0].expression).toBe('I add {string} to the basket');
  });

  it('Test 4b: query vuota non filtra', () => {
    expect(filterSteps(steps, { query: '' })).toHaveLength(steps.length);
  });
});

describe('uniqueAreas', () => {
  it('Test 6a: ritorna le aree distinte ordinate', () => {
    const areas = uniqueAreas(steps);
    expect(areas).toEqual(['auth', 'common', 'imported', 'orders']);
  });
});

describe('uniqueStatuses', () => {
  it('Test 6b: ritorna gli status distinti ordinati', () => {
    const statuses = uniqueStatuses(steps);
    expect(statuses).toEqual(['implemented', 'wanted']);
  });
});
