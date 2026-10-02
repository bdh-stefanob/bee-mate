import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { trovaUsatoIn, espressioneInRegex, type UsoScenario } from '@/lib/catalogo';
import type { CatalogStep } from '@/lib/types';

/**
 * La ricerca degli usi non deve cambiare risposta per essere piu' veloce: qui la si
 * confronta, su cataloghi e righe di ogni forma, con la definizione semplice e
 * lenta ("il primo step del catalogo la cui espressione regolare combacia vince").
 */

let tmp: string | null = null;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

function step(expression: string): CatalogStep {
  return { expression, parameters: [], app: 'a', area: 'a', domain: 'a', status: 'implemented', sourceRef: 'x.ts:1', documented: true };
}

function riferimento(steps: CatalogStep[], righe: Array<{ file: string; scenario: string; riga: number; testo: string }>): Map<string, UsoScenario[]> {
  const out = new Map<string, UsoScenario[]>();
  for (const s of steps) out.set(s.expression, []);
  const regex = steps.map((s) => ({ e: s.expression, r: espressioneInRegex(s.expression) }));
  for (const { file, scenario, riga, testo } of righe) {
    for (const { e, r } of regex) {
      if (r.test(testo)) {
        out.get(e)!.push({ file, scenario, riga });
        break;
      }
    }
  }
  return out;
}

function generatore(seme: number): () => number {
  let s = seme;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('trovaUsatoIn: stessa risposta della ricerca semplice', () => {
  const ESPRESSIONI = [
    'the user opens the page',
    'the user opens the page again',
    'the user opens {string}',
    'the user opens {string} and waits {int} seconds',
    'the user waits {int} seconds',
    'the user waits {float} seconds',
    'the page shows {string}',
    'the page shows',
    'the {word} button is visible',
    'the {word} {string} is {int}',
    '{string} is shown',
    'the user types {unknown} here',
    'the user types {string} {string}',
    'the cart has {int} items (max {int})',
    'a {string',
    'a {b {string} c',
    'price is 3.50 (approx.)',
    'the user opens the page', // doppione: vince il primo
  ];
  const VALORI: Record<string, string[]> = {
    '{string}': ['"ciao"', '""', '"a b c"', '"x" and "y"'],
    '{int}': ['3', '-7', '42'],
    '{float}': ['3.5', '-0.25', '7'],
    '{word}': ['submit', 'big', 'x-y'],
  };

  function istanzia(espressione: string, rnd: () => number): string {
    return espressione.replace(/\{string\}|\{int\}|\{float\}|\{word\}/g, (t) => {
      const v = VALORI[t];
      return v[Math.floor(rnd() * v.length)];
    });
  }

  it('su righe generate da quelle espressioni e su righe che non combaciano con nulla', () => {
    const rnd = generatore(4242);
    const steps = ESPRESSIONI.map(step);
    const righe: Array<{ file: string; scenario: string; riga: number; testo: string }> = [];
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ricerca-usi-'));
    const prefissi = ['Given', 'When', 'Then', 'And', 'But'];
    for (let f = 0; f < 6; f++) {
      let testoFile = `Feature: f${f}\n`;
      let riga = 1;
      for (let sc = 0; sc < 4; sc++) {
        testoFile += `\n  Scenario: scenario ${f}-${sc}\n`;
        riga += 2;
        for (let k = 0; k < 8; k++) {
          const base = rnd() < 0.8 ? ESPRESSIONI[Math.floor(rnd() * ESPRESSIONI.length)] : 'something that matches nothing ' + k;
          const testo = istanzia(base, rnd) + (rnd() < 0.1 ? ' extra' : '');
          testoFile += `    ${prefissi[Math.floor(rnd() * prefissi.length)]} ${testo}\n`;
          riga += 1;
          righe.push({ file: `d${f % 2}/f${f}.feature`, scenario: `scenario ${f}-${sc}`, riga, testo });
        }
      }
      const p = path.join(tmp, `d${f % 2}`, `f${f}.feature`);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, testoFile);
      const vecchio = new Date(Date.now() - 3600_000);
      fs.utimesSync(p, vecchio, vecchio);
    }
    // L'ordine delle righe nel riferimento deve essere quello di lettura: per file, in ordine di scansione.
    const ordinate = righe.slice().sort((a, b) => a.file.localeCompare(b.file) || a.riga - b.riga);
    const atteso = riferimento(steps, ordinate);
    const ottenuto = trovaUsatoIn(steps, tmp);
    for (const s of steps) {
      const norm = (l: UsoScenario[]) => l.map((u) => `${u.file}:${u.riga}:${u.scenario}`).sort();
      expect(norm(ottenuto.get(s.expression)!), s.expression).toEqual(norm(atteso.get(s.expression)!));
    }
    // E non e' un confronto fra due vuoti.
    expect([...ottenuto.values()].reduce((n, l) => n + l.length, 0)).toBeGreaterThan(20);
  });

  it('le espressioni con segnaposto inventati o parentesi restano frasi letterali', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ricerca-usi-'));
    const p = path.join(tmp, 'a.feature');
    fs.writeFileSync(p, 'Feature: x\n  Scenario: s\n    Given the user types {unknown} here\n    Given price is 3.50 (approx.)\n    Given price is 3x50 (approx.)\n    Given a {b {string} c\n');
    const vecchio = new Date(Date.now() - 3600_000);
    fs.utimesSync(p, vecchio, vecchio);
    const steps = [step('the user types {unknown} here'), step('price is 3.50 (approx.)'), step('a {b {string} c')];
    const usi = trovaUsatoIn(steps, tmp);
    expect(usi.get('the user types {unknown} here')).toHaveLength(1);
    expect(usi.get('price is 3.50 (approx.)')).toHaveLength(1);
    expect(usi.get('a {b {string} c')).toHaveLength(1);
  });

  it('con due espressioni che coprono la stessa riga vince la prima del catalogo, in qualunque ordine siano', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ricerca-usi-'));
    const p = path.join(tmp, 'a.feature');
    fs.writeFileSync(p, 'Feature: x\n  Scenario: s\n    Given the user opens "home"\n');
    const vecchio = new Date(Date.now() - 3600_000);
    fs.utimesSync(p, vecchio, vecchio);
    const generica = step('the user opens {string}');
    const esatta = step('the user opens "home"');
    expect(trovaUsatoIn([generica, esatta], tmp).get('the user opens {string}')).toHaveLength(1);
    expect(trovaUsatoIn([generica, esatta], tmp).get('the user opens "home"')).toHaveLength(0);
    expect(trovaUsatoIn([esatta, generica], tmp).get('the user opens "home"')).toHaveLength(1);
    expect(trovaUsatoIn([esatta, generica], tmp).get('the user opens {string}')).toHaveLength(0);
  });
});
