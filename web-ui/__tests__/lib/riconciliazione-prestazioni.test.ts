import { describe, it, expect } from 'vitest';
import { individuaCoppie } from '@/lib/riconciliazione';
import { individuaCoppieRiferimento } from '../fixtures/catalogo/riconciliazione-riferimento';
import type { StepComponentRef } from '@/lib/types';
import { catalogoFinto, generatore as generatoreTest } from '../fixtures/catalogo/catalogo-finto';
import type { CatalogStep } from '@/lib/types';

/**
 * F1: la ricerca dei doppioni non deve crescere al quadrato in tempo.
 * Il risultato deve restare IDENTICO a quello della versione precedente, tenuta
 * come riferimento in `fixtures/catalogo/riconciliazione-riferimento.ts`.
 */

function passo(espressione: string, i: number): CatalogStep {
  return {
    expression: espressione,
    parameters: [],
    app: 'portale',
    area: 'x',
    domain: 'x/x',
    status: 'implemented',
    sourceRef: `x.ts:${i}`,
    documented: true,
    components: i % 5 === 0 ? [{ role: 'button', name: 'A' }] : undefined,
  };
}

describe('individuaCoppie: stesso risultato della versione precedente', () => {
  it.each([1, 2, 3])('su un catalogo finto di 300 voci (seme %i) le coppie sono identiche, stesso ordine', (seme) => {
    const steps = catalogoFinto(300, seme);
    const atteso = individuaCoppieRiferimento(steps);
    // Il catalogo finto deve davvero produrre coppie di ogni tipo, altrimenti il confronto non dice nulla.
    expect(atteso.length).toBeGreaterThan(50);
    expect(new Set(atteso.map((c) => c.motivo))).toEqual(
      new Set(['testo-quasi-uguale', 'stessi-componenti', 'applicazioni-diverse'])
    );
    expect(individuaCoppie(steps)).toEqual(atteso);
  });

  it('componenti duplicati dentro uno step: stessa risposta del riferimento', () => {
    const x: StepComponentRef = { role: 'button', name: 'A' };
    const y: StepComponentRef = { role: 'button', name: 'B' };
    const base = catalogoFinto(1)[0]!;
    const steps = [
      { ...base, app: 'portale', expression: 'alpha uno', components: [x, x, y] },
      { ...base, app: 'portale', expression: 'beta due', components: [x, y, y] },
      { ...base, app: 'portale', expression: 'gamma tre', components: [x, x] },
      { ...base, app: 'portale', expression: 'delta quattro', components: [x] },
    ];
    expect(individuaCoppie(steps)).toEqual(individuaCoppieRiferimento(steps));
  });
});

describe('individuaCoppie: attorno alla soglia di somiglianza', () => {
  it('frasi con 0-12 modifiche (inserimenti, tolte, sostituzioni): stesso verdetto del riferimento', () => {
    const r = generatoreTest(11);
    const alfabeto = 'abcdefgh ';
    const casuale = (n: number) => Array.from({ length: n }, () => alfabeto[Math.floor(r() * alfabeto.length)]).join('');
    const steps = [];
    for (let i = 0; i < 120; i++) {
      const base = casuale(8 + Math.floor(r() * 50));
      steps.push(passo(base, i * 2));
      let v = base;
      const modifiche = Math.floor(r() * 13);
      for (let k = 0; k < modifiche; k++) {
        const pos = Math.floor(r() * (v.length + 1));
        const tipo = Math.floor(r() * 3);
        if (tipo === 0) v = v.slice(0, pos) + casuale(1) + v.slice(pos);
        else if (tipo === 1) v = v.slice(0, pos) + v.slice(pos + 1);
        else v = v.slice(0, pos) + casuale(1) + v.slice(pos + 1);
      }
      steps.push(passo(v, i * 2 + 1));
    }
    const atteso = individuaCoppieRiferimento(steps);
    expect(atteso.length).toBeGreaterThan(20);
    expect(individuaCoppie(steps)).toEqual(atteso);
  });
});

describe('individuaCoppie: il tempo non cresce al quadrato', () => {
  it('2000 voci in meno di 2 secondi', () => {
    const steps = catalogoFinto(2000, 7);
    const inizio = performance.now();
    individuaCoppie(steps);
    const trascorso = performance.now() - inizio;
    expect(trascorso).toBeLessThan(2000);
  }, 120_000);
});
