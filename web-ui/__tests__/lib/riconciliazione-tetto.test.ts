import { describe, it, expect } from 'vitest';
import { individuaCoppie, individuaCoppieConTetto, TETTO_COPPIE } from '@/lib/riconciliazione';
import { individuaCoppieRiferimento } from '../fixtures/catalogo/riconciliazione-riferimento';
import { catalogoFinto } from '../fixtures/catalogo/catalogo-finto';
import type { CatalogStep } from '@/lib/types';

/**
 * F9: la ricerca dei doppioni ha un tetto sul numero di coppie restituite.
 * Sotto il tetto il risultato e' quello di sempre; sopra, si restituiscono le
 * coppie piu' forti e si dice che l'elenco e' troncato, con il totale vero.
 */

function passo(espressione: string, i: number, extra: Partial<CatalogStep> = {}): CatalogStep {
  return {
    expression: espressione,
    parameters: [],
    app: 'portale',
    area: 'x',
    domain: 'x/x',
    status: 'implemented',
    sourceRef: `x.ts:${i}`,
    documented: true,
    ...extra,
  };
}

const quasiIdentici = (n: number): CatalogStep[] =>
  Array.from({ length: n }, (_, i) => passo(`the user click on item ${i}`, i));

describe('individuaCoppieConTetto', () => {
  it('il tetto proposto e 500', () => {
    expect(TETTO_COPPIE).toBe(500);
  });

  it('300 frasi che differiscono solo per un numero: restituisce il tetto, troncato, con il totale vero', () => {
    const steps = quasiIdentici(300);
    const r = individuaCoppieConTetto(steps);
    expect(r.troncato).toBe(true);
    expect(r.coppie).toHaveLength(TETTO_COPPIE);
    expect(r.totale).toBe((300 * 299) / 2);
    expect(r.totale).toBe(individuaCoppieRiferimento(steps).length);
  });

  it('100 frasi diverse: identico a individuaCoppie e al riferimento, non troncato', () => {
    const steps = catalogoFinto(100, 7);
    const attese = individuaCoppieRiferimento(steps);
    const r = individuaCoppieConTetto(steps);
    expect(r.troncato).toBe(false);
    expect(r.totale).toBe(attese.length);
    expect(r.coppie).toEqual(attese);
    expect(individuaCoppie(steps)).toEqual(attese);
  });

  it('un catalogo che arriva esattamente al tetto non e troncato', () => {
    const steps = catalogoFinto(300, 1);
    const n = individuaCoppieRiferimento(steps).length;
    const r = individuaCoppieConTetto(steps, n);
    expect(r.troncato).toBe(false);
    expect(r.coppie).toEqual(individuaCoppieRiferimento(steps));
    const r2 = individuaCoppieConTetto(steps, n - 1);
    expect(r2.troncato).toBe(true);
    expect(r2.coppie).toHaveLength(n - 1);
    expect(r2.totale).toBe(n);
  });

  it('sopra il tetto tiene le coppie piu forti: un doppione vero batte tante coppie deboli', () => {
    const steps = quasiIdentici(40); // 780 coppie "testo-quasi-uguale", senza componenti
    const x = [{ role: 'button', name: 'Pay' }];
    // in coda: un doppione vero (testo quasi uguale + stessi componenti)
    steps.push(passo('the user press the pay button', 100, { components: x }));
    steps.push(passo('The user press the pay button', 101, { components: x }));
    const r = individuaCoppieConTetto(steps, 10);
    expect(r.troncato).toBe(true);
    expect(r.coppie).toHaveLength(10);
    const forte = r.coppie.find((c) => c.stessoComponente);
    expect(forte).toBeDefined();
    expect(forte!.a.espressione).toBe('the user press the pay button');
    // le coppie restituite sono esattamente coppie del riferimento
    const tutte = individuaCoppieRiferimento(steps);
    for (const c of r.coppie) expect(tutte).toContainEqual(c);
  });

  it('le coppie restituite sono sempre una sottoparte di quelle vere, senza duplicati', () => {
    const steps = catalogoFinto(300, 2);
    const r = individuaCoppieConTetto(steps, 50);
    const tutte = individuaCoppieRiferimento(steps);
    expect(r.troncato).toBe(true);
    expect(r.coppie).toHaveLength(50);
    for (const c of r.coppie) expect(tutte).toContainEqual(c);
  });
});

describe('individuaCoppie: pezzi corti dopo aver tolto prefisso e suffisso comuni', () => {
  it('frasi che differiscono di pochi caratteri in testa, in coda o in mezzo: stesso verdetto del riferimento', () => {
    const basi = ['ab', 'abc', 'a', 'the user open the long menu now', 'x y z'];
    const steps: CatalogStep[] = [];
    let k = 0;
    for (const base of basi) {
      for (const variante of ['', ' 1', ' 12', '1 ', 'z', base.slice(1), base.slice(0, -1), 'q' + base, base + base]) {
        steps.push(passo(base + variante, k++));
        steps.push(passo(variante + base, k++));
      }
    }
    expect(individuaCoppie(steps)).toEqual(individuaCoppieRiferimento(steps));
  });
});

describe('individuaCoppieConTetto: tempo e peso sui cataloghi sporchi', () => {
  it.each([500, 1000, 2000])('%i voci quasi identiche: sotto 1 s e risposta sotto 1 MB', (n) => {
    const steps = quasiIdentici(n);
    const t0 = performance.now();
    const r = individuaCoppieConTetto(steps);
    const ms = performance.now() - t0;
    expect(r.troncato).toBe(true);
    expect(r.coppie).toHaveLength(TETTO_COPPIE);
    expect(r.totale).toBe((n * (n - 1)) / 2);
    expect(JSON.stringify(r).length).toBeLessThan(1_000_000);
    expect(ms).toBeLessThan(1000);
  }, 20000);
});
