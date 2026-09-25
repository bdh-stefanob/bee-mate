import { describe, it, expect } from 'vitest';
import { espressioneInRegex, trovaUsatoIn, costruisciCatalogo } from '@/lib/catalogo';
import type { CatalogStep } from '@/lib/types';
import { catalogoVuoto, stepSenzaComponenti } from '../fixtures/catalogo';

function step(expression: string, sourceRef: string, components?: CatalogStep['components']): CatalogStep {
  return {
    expression,
    parameters: [],
    app: 'a',
    area: 'a',
    domain: 'a',
    status: 'implemented',
    sourceRef,
    documented: true,
    components,
  };
}

describe('espressioneInRegex', () => {
  it('riconosce una frase senza parametri solo se identica', () => {
    const r = espressioneInRegex('the user land on the homepage');
    expect(r.test('the user land on the homepage')).toBe(true);
    expect(r.test('the user land on the homepage!')).toBe(false);
    expect(r.test('The user land on the homepage')).toBe(false);
  });

  it('riconosce {string} con il valore gia\' sostituito fra virgolette', () => {
    const r = espressioneInRegex('the page shows {string}');
    expect(r.test('the page shows "Good morning"')).toBe(true);
    expect(r.test('the page shows Good morning')).toBe(false);
  });
});

describe('trovaUsatoIn / costruisciCatalogo', () => {
  it('trova lo scenario e la riga che usa uno step, con e senza parametro', async () => {
    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogo-test-'));
    fs.writeFileSync(
      path.join(dir, 'x.feature'),
      [
        'Feature: prova',
        '',
        '  Scenario: uno',
        '    Given the user land on the homepage',
        '    Then the page shows "ciao"',
        '',
      ].join('\n')
    );

    const steps = [
      step('the user land on the homepage', 'x.ts:1'),
      step('the page shows {string}', 'x.ts:2'),
    ];

    const usi = trovaUsatoIn(steps, dir);
    expect(usi.get('the user land on the homepage')).toEqual([{ file: 'x.feature', scenario: 'uno', riga: 4 }]);
    expect(usi.get('the page shows {string}')).toEqual([{ file: 'x.feature', scenario: 'uno', riga: 5 }]);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('un file mancante o senza scenari non fa fallire nulla: elenco vuoto', () => {
    const steps = [step('x', 'x.ts:1')];
    expect(trovaUsatoIn(steps, '/percorso/che/non/esiste')).toEqual(new Map([['x', []]]));
  });

  it('costruisciCatalogo restituisce step + mappa componenti', () => {
    const steps = [
      step('a', 'x.ts:1', [{ role: 'button', name: 'X' }]),
      step('b', 'x.ts:2'),
    ];
    const dati = costruisciCatalogo(steps, '/percorso/che/non/esiste');
    expect(dati.step).toHaveLength(2);
    expect(dati.step[0]).toMatchObject({ espressione: 'a', usatoIn: [] });
    expect(dati.componenti).toHaveLength(1);
    expect(dati.componenti[0]).toMatchObject({ role: 'button', name: 'X', step: ['a'] });
  });

  it('costruisciCatalogo su un catalogo vuoto non fallisce: step e componenti vuoti', () => {
    // Situazione "catalogo vuoto".
    const dati = costruisciCatalogo(catalogoVuoto, '/percorso/che/non/esiste');
    expect(dati.step).toEqual([]);
    expect(dati.componenti).toEqual([]);
  });

  it('costruisciCatalogo su step senza componenti agganciati: nessun componente in mappa', () => {
    // Situazione "step senza componenti agganciati": il caso di chi scrive lo
    // step a mano.
    const dati = costruisciCatalogo(stepSenzaComponenti, '/percorso/che/non/esiste');
    expect(dati.step).toHaveLength(stepSenzaComponenti.length);
    expect(dati.componenti).toEqual([]);
  });
});
