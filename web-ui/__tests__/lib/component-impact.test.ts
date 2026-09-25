import { describe, it, expect } from 'vitest';
import { computeComponentImpact, countAnchoredSteps, componentImpactKey } from '@/lib/component-impact';
import type { CatalogStep } from '@/lib/types';
import {
  catalogoVuoto,
  stepSenzaComponenti,
  equivocoDiDenominazione,
  paginaCompatibile,
  pagineDiverseNote,
  paginaAmbigua,
} from '../fixtures/catalogo';

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

describe('lo stesso nome su pagine diverse', () => {
  // Questo caso era stato tolto insieme alla correzione delle righe doppie, ed
  // e' stato rimesso: proteggeva una regola giusta. Un `button "Submit"` sulla
  // pagina di accesso NON e' quello del pagamento. Unirli gonfierebbe il raggio
  // d'impatto proprio mentre si toglie l'informazione che lo rende utile.
  it('resta due componenti distinti, non uno solo', () => {
    // Situazione "pagine diverse e note": stesso ruolo+nome, due pagine
    // entrambe dichiarate. Vedi __tests__/fixtures/catalogo/pagine-diverse-e-note.ts
    const impact = computeComponentImpact(pagineDiverseNote);

    expect(impact).toHaveLength(2);
    expect(new Set(impact.map((i) => i.page))).toEqual(new Set(['LoginPage', 'CheckoutPage']));
    expect(impact.every((i) => i.steps.length === 1)).toBe(true);
  });

  it("ma una pagina nota e una mancante sono la stessa cosa, e si uniscono", () => {
    // Il difetto vero visto dal tester: registrazioni fatte con versioni
    // diverse del registratore, una che segnava la pagina e una no. Il
    // conteggio usciva 1 invece di 2 — sbagliato per difetto, cioe' nella
    // direzione che fa sembrare un cambiamento piu' sicuro di quanto sia.
    // Situazione "pagina compatibile": stesso ruolo+nome, una occorrenza sa la
    // pagina e l'altra no. Vedi __tests__/fixtures/catalogo/pagina-compatibile.ts
    const impact = computeComponentImpact(paginaCompatibile);

    expect(impact).toHaveLength(1);
    expect(impact[0]!.page).toBe('LoginPage');
    expect(impact[0]!.steps).toHaveLength(2);
  });

  it("e con due pagine possibili non si indovina", () => {
    // Situazione "pagina ambigua". Vedi __tests__/fixtures/catalogo/pagina-ambigua.ts
    const impact = computeComponentImpact(paginaAmbigua);

    const incerta = impact.find((i) => i.pagineAmbigue);
    expect(incerta).toBeDefined();
    expect(new Set(incerta!.pagineAmbigue)).toEqual(new Set(['LoginPage', 'CheckoutPage']));
  });
});

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

  it('merges the same role+name when only one occurrence knows the page (the real catalog bug)', () => {
    // Caso vero del catalogo (2026-09-25): "the user signs in" ancora il
    // bottone con page, "the user click on the login button" lo ancora senza.
    // E' lo STESSO pulsante: prima si vedevano due righe da 1 step, la
    // risposta vera e' 1 riga da 2 step.
    const steps = [
      step('the user signs in', [{ role: 'button', name: 'Sign in', page: 'AccediPage' }]),
      step('the user click on the login button', [{ role: 'button', name: 'Sign in' }]),
    ];

    const impact = computeComponentImpact(steps);

    expect(impact).toHaveLength(1);
    expect(impact[0]).toMatchObject({ role: 'button', name: 'Sign in', page: 'AccediPage' });
    expect(impact[0]!.steps).toHaveLength(2);
    expect(impact[0]!.pagineAmbigue).toBeUndefined();
  });

  it('merges regardless of which occurrence (first or second) declares the page', () => {
    const stepsPageFirst = [
      step('a', [{ role: 'link', name: 'Sign in', page: 'HomePage' }]),
      step('b', [{ role: 'link', name: 'Sign in' }]),
    ];
    const stepsPageSecond = [
      step('a', [{ role: 'link', name: 'Sign in' }]),
      step('b', [{ role: 'link', name: 'Sign in', page: 'HomePage' }]),
    ];

    for (const steps of [stepsPageFirst, stepsPageSecond]) {
      const impact = computeComponentImpact(steps);
      expect(impact).toHaveLength(1);
      expect(impact[0]!.page).toBe('HomePage');
      expect(impact[0]!.steps).toHaveLength(2);
    }
  });

  it('keeps a single component when no occurrence declares a page', () => {
    const steps = [
      step('a', [{ role: 'link', name: 'Recharges' }]),
      step('b', [{ role: 'link', name: 'Recharges' }]),
    ];

    const impact = computeComponentImpact(steps);

    expect(impact).toHaveLength(1);
    expect(impact[0]!.page).toBeUndefined();
    expect(impact[0]!.pagineAmbigue).toBeUndefined();
    expect(impact[0]!.steps).toHaveLength(2);
  });

  it('due pagine note e diverse restano due componenti, ognuno col suo conteggio', () => {
    // Stessa situazione "pagine diverse e note" del primo test di questo
    // describe: coincidono di proposito, e' la stessa fixture condivisa.
    const impact = computeComponentImpact(pagineDiverseNote);

    // La pagina fa parte dell'identita' quando si conosce: due pulsanti con lo
    // stesso nome su pagine diverse sono due pulsanti. Unirli direbbe che
    // cambiandone uno se ne rompono due — cioe' il contrario di quello che
    // questa mappa serve a sapere.
    expect(impact).toHaveLength(2);
    expect(new Set(impact.map((i) => i.page))).toEqual(new Set(['LoginPage', 'CheckoutPage']));
    expect(impact.every((i) => i.steps.length === 1)).toBe(true);
  });

  it('keeps different roles with the same name distinct (naming clash, not a duplicate)', () => {
    // Caso vicino da NON toccare: button "Sign in" e link "Sign in" sono due
    // componenti diversi davvero — riconciliazione.ts si appoggia proprio a
    // questa distinzione per riconoscere un equivoco di denominazione.
    // Situazione "equivoco di denominazione". Vedi
    // __tests__/fixtures/catalogo/equivoco-di-denominazione.ts
    const impact = computeComponentImpact(equivocoDiDenominazione);

    expect(impact).toHaveLength(2);
    expect(new Set(impact.map((i) => i.role))).toEqual(new Set(['button', 'link']));
  });

  it('produces a stable key based on role+name only (page is not part of the identity)', () => {
    const a = componentImpactKey({ role: 'button', name: 'Submit', page: 'LoginPage' });
    const b = componentImpactKey({ role: 'button', name: 'Submit', page: 'CheckoutPage' });
    const c = componentImpactKey({ role: 'button', name: 'Submit' });
    const d = componentImpactKey({ role: 'link', name: 'Submit' });
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a).not.toBe(d);
  });

  it('returns an empty map when nothing is anchored', () => {
    // Situazione "step senza componenti agganciati".
    expect(computeComponentImpact(stepSenzaComponenti)).toEqual([]);
  });

  it('returns an empty map for an empty catalog', () => {
    // Situazione "catalogo vuoto".
    expect(computeComponentImpact(catalogoVuoto)).toEqual([]);
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
    // Situazione "step senza componenti agganciati".
    expect(countAnchoredSteps(stepSenzaComponenti)).toBe(0);
  });

  it('is zero for an empty catalog', () => {
    // Situazione "catalogo vuoto".
    expect(countAnchoredSteps(catalogoVuoto)).toBe(0);
  });
});
