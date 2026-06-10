import { describe, it, expect } from 'vitest';
import { getSuggestions } from '@/lib/autocomplete';
import type { CatalogStep } from '@/lib/types';

// Fixture di step di test
const steps: CatalogStep[] = [
  {
    expression: 'I add {int} items to the basket',
    parameters: ['{int}'],
    app: 'app-a', area: 'basket', domain: 'basket',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
  {
    expression: 'I add a coupon to the basket',
    parameters: [],
    app: 'app-a', area: 'basket', domain: 'basket',
    status: 'wanted', sourceRef: 'test', documented: false,
  },
  {
    expression: 'I am on the login page',
    parameters: [],
    app: 'app-a', area: 'auth', domain: 'auth',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
  {
    expression: 'I land on the home page',
    parameters: [],
    app: 'app-a', area: 'checkout', domain: 'checkout',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
  {
    expression: 'the basket contains {int} items',
    parameters: ['{int}'],
    app: 'app-a', area: 'basket', domain: 'basket',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
  {
    expression: 'step alpha',
    parameters: [], app: 'app-a', area: 'test', domain: 'test',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
  {
    expression: 'step beta',
    parameters: [], app: 'app-a', area: 'test', domain: 'test',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
  {
    expression: 'step gamma',
    parameters: [], app: 'app-a', area: 'test', domain: 'test',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
  {
    expression: 'step delta',
    parameters: [], app: 'app-a', area: 'test', domain: 'test',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
  {
    expression: 'step epsilon',
    parameters: [], app: 'app-a', area: 'test', domain: 'test',
    status: 'implemented', sourceRef: 'test', documented: true,
  },
];

describe('getSuggestions', () => {
  it('Test 1: ritorna step la cui expression inizia con il prefisso (case-insensitive)', () => {
    const result = getSuggestions('Given I add', steps);
    // Deve trovare "I add {int} items" e "I add a coupon" — prefisso "i add"
    expect(result.length).toBeGreaterThanOrEqual(2);
    result.forEach(s => {
      expect(s.expression.toLowerCase()).toMatch(/^i add/);
    });
  });

  it('Test 2: con prefisso vuoto (keyword presente, testo vuoto) ritorna i primi step fino a 8', () => {
    const result = getSuggestions('When ', steps);
    // Prefisso vuoto → tutti gli step corrispondono; limitato a 8
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('Test 3: ritorna [] quando non c\'è keyword Gherkin sull\'ultima riga', () => {
    const result = getSuggestions('Feature: x', steps);
    expect(result).toEqual([]);
  });

  it('Test 4: usa l\'ULTIMA riga per il match (multi-riga)', () => {
    const result = getSuggestions('Given foo\nThen I land', steps);
    // Ultima riga è "Then I land" → prefisso "i land"
    // "I land on the home page" deve essere nel risultato
    expect(result.some(s => s.expression.toLowerCase().startsWith('i land'))).toBe(true);
    // Non deve fare match su "foo" (prima riga)
    result.forEach(s => {
      expect(s.expression.toLowerCase()).toMatch(/^i land/);
    });
  });

  it('Test 5: il risultato è limitato a max 8 elementi', () => {
    // Con prefisso vuoto abbiamo 10 step — deve restituirne max 8
    const result = getSuggestions('Given ', steps);
    expect(result.length).toBeLessThanOrEqual(8);
  });
});
