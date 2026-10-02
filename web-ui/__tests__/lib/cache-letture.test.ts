import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Si contano le letture di file (`readFileSync`) di tutto il codice sotto prova.
// Il resto di `fs` resta quello vero: i file si scrivono e si leggono davvero.
const conta = vi.hoisted(() => ({ letture: [] as string[] }));
vi.mock('fs', async (originale) => {
  const reale = await originale<typeof import('fs')>();
  const readFileSync = ((p: unknown, ...resto: unknown[]) => {
    conta.letture.push(String(p));
    return (reale.readFileSync as unknown as (...a: unknown[]) => unknown)(p, ...resto);
  }) as typeof reale.readFileSync;
  return { ...reale, readFileSync, default: { ...reale, readFileSync } };
});

import { riepilogaScenari } from '@/lib/scenari';
import { precaricaFeatures } from '@/lib/cache-file';
import { trovaUsatoIn, costruisciCatalogo } from '@/lib/catalogo';
import { leggiComportamenti } from '@/lib/descrizione-step';
import type { CatalogStep } from '@/lib/types';

let tmp: string | null = null;
beforeEach(() => {
  conta.letture.length = 0;
});
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

/** Un file che "esiste da un po'": la cache si fida solo di file non appena scritti. */
function scrivi(base: string, rel: string, testo: string, secondiFa = 3600): void {
  const p = path.join(base, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, testo);
  const t = new Date(Date.now() - secondiFa * 1000);
  fs.utimesSync(p, t, t);
}

function lettureDi(estensione: string): number {
  return conta.letture.filter((p) => p.endsWith(estensione)).length;
}

const feature = (n: number, nome = `scenario ${n}`, passo = 'the user opens the page'): string =>
  `Feature: funzione ${n}\n\n  Scenario: ${nome}\n    Given ${passo}\n    Then the page shows "ok"\n`;

function cartellaFeatures(n: number): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-letture-'));
  for (let i = 0; i < n; i++) scrivi(tmp, `app${i % 2}/f${i}.feature`, feature(i));
  return tmp;
}

describe('riepilogaScenari: ogni file si rilegge solo se e\' cambiato', () => {
  it('due chiamate di fila su una cartella invariata leggono ogni file una sola volta', () => {
    const dir = cartellaFeatures(5);
    const a = riepilogaScenari(dir);
    expect(lettureDi('.feature')).toBe(5);
    const b = riepilogaScenari(dir);
    expect(lettureDi('.feature')).toBe(5);
    expect(b).toEqual(a);
  });

  it('dopo aver toccato un solo file ne rilegge uno solo, e il risultato e\' quello nuovo', () => {
    const dir = cartellaFeatures(5);
    riepilogaScenari(dir);
    conta.letture.length = 0;
    scrivi(dir, 'app1/f1.feature', feature(1, 'titolo cambiato'), 1800);
    const r = riepilogaScenari(dir);
    expect(lettureDi('.feature')).toBe(1);
    expect(r.file.find((f) => f.file === 'app1/f1.feature')!.scenari[0].nome).toBe('titolo cambiato');
  });

  it('un file cambiato con la stessa dimensione (data diversa) si vede', () => {
    const dir = cartellaFeatures(2);
    scrivi(dir, 'app0/f0.feature', feature(0, 'aaaa'));
    expect(riepilogaScenari(dir).file.find((f) => f.file === 'app0/f0.feature')!.scenari[0].nome).toBe('aaaa');
    scrivi(dir, 'app0/f0.feature', feature(0, 'bbbb'), 1800);
    expect(riepilogaScenari(dir).file.find((f) => f.file === 'app0/f0.feature')!.scenari[0].nome).toBe('bbbb');
  });

  it('un file appena scritto non e\' mai dato per buono: due scritture nello stesso istante, stessa dimensione', () => {
    const dir = cartellaFeatures(1);
    scrivi(dir, 'app0/nuovo.feature', feature(9, 'aaaa'), 0);
    expect(riepilogaScenari(dir).file.find((f) => f.file === 'app0/nuovo.feature')!.scenari[0].nome).toBe('aaaa');
    scrivi(dir, 'app0/nuovo.feature', feature(9, 'bbbb'), 0);
    expect(riepilogaScenari(dir).file.find((f) => f.file === 'app0/nuovo.feature')!.scenari[0].nome).toBe('bbbb');
  });

  it('un file aggiunto compare, uno cancellato sparisce', () => {
    const dir = cartellaFeatures(3);
    expect(riepilogaScenari(dir).file).toHaveLength(3);
    scrivi(dir, 'app0/extra.feature', feature(7));
    expect(riepilogaScenari(dir).file).toHaveLength(4);
    fs.rmSync(path.join(dir, 'app0', 'f0.feature'));
    const r = riepilogaScenari(dir);
    expect(r.file.map((f) => f.file)).not.toContain('app0/f0.feature');
    expect(r.file).toHaveLength(3);
  });

  it('scenari e catalogo si dividono la lettura: un .feature aperto da uno non si riapre per l\'altro', () => {
    const dir = cartellaFeatures(5);
    riepilogaScenari(dir);
    expect(lettureDi('.feature')).toBe(5);
    trovaUsatoIn(STEPS, dir);
    expect(lettureDi('.feature')).toBe(5);
    // E se un file cambia, entrambi lo vedono con una lettura sola.
    scrivi(dir, 'app1/f1.feature', feature(1, 'titolo nuovo'), 1800);
    conta.letture.length = 0;
    const r = riepilogaScenari(dir);
    const u = trovaUsatoIn(STEPS, dir);
    expect(lettureDi('.feature')).toBe(1);
    expect(r.file.find((f) => f.file === 'app1/f1.feature')!.scenari[0].nome).toBe('titolo nuovo');
    expect(u.get('the user opens the page')!.find((x) => x.file === 'app1/f1.feature')!.scenario).toBe('titolo nuovo');
  });

  it('la lettura a freddo si puo\' fare prima, in modo asincrono: poi il conto non apre piu\' nessun file', async () => {
    const dir = cartellaFeatures(6);
    await precaricaFeatures(dir);
    expect(lettureDi('.feature')).toBe(0);
    const r = riepilogaScenari(dir);
    const u = trovaUsatoIn(STEPS, dir);
    expect(lettureDi('.feature')).toBe(0);
    expect(r.file).toHaveLength(6);
    expect(u.get('the user opens the page')).toHaveLength(6);
  });

  it('la lettura anticipata non da\' mai un testo vecchio: un file cambiato dopo si vede', async () => {
    const dir = cartellaFeatures(3);
    await precaricaFeatures(dir);
    scrivi(dir, 'app1/f1.feature', feature(1, 'titolo nuovo'), 1800);
    await precaricaFeatures(dir);
    expect(riepilogaScenari(dir).file.find((f) => f.file === 'app1/f1.feature')!.scenari[0].nome).toBe('titolo nuovo');
    // e un file scritto adesso (troppo recente per fidarsi) non si ricorda, ma si legge giusto
    scrivi(dir, 'app1/f1.feature', feature(1, 'titolo ancora nuovo'), 0);
    await precaricaFeatures(dir);
    expect(riepilogaScenari(dir).file.find((f) => f.file === 'app1/f1.feature')!.scenari[0].nome).toBe('titolo ancora nuovo');
  });

  it('una cartella che non c\'e\' non e\' un errore', async () => {
    await expect(precaricaFeatures('/non/esiste/proprio')).resolves.toBeUndefined();
  });

  it('chi riceve il risultato lo puo\' modificare senza sporcare la chiamata dopo', () => {
    const dir = cartellaFeatures(2);
    const a = riepilogaScenari(dir);
    a.file[0].scenari[0].nome = 'sporcato';
    a.file.pop();
    const b = riepilogaScenari(dir);
    expect(b.file).toHaveLength(2);
    expect(b.file.flatMap((f) => f.scenari.map((s) => s.nome))).not.toContain('sporcato');
  });
});

function step(expression: string, sourceRef = 'src/steps/x.steps.ts:1'): CatalogStep {
  return { expression, parameters: [], app: 'a', area: 'a', domain: 'a', status: 'implemented', sourceRef, documented: true };
}
const STEPS = [step('the user opens the page'), step('the page shows {string}')];

describe('trovaUsatoIn: stessa idea, per file', () => {
  it('due chiamate di fila leggono ogni .feature una sola volta, con lo stesso risultato', () => {
    const dir = cartellaFeatures(4);
    const a = trovaUsatoIn(STEPS, dir);
    expect(lettureDi('.feature')).toBe(4);
    const b = trovaUsatoIn(STEPS, dir);
    expect(lettureDi('.feature')).toBe(4);
    expect(b).toEqual(a);
    expect(a.get('the user opens the page')).toHaveLength(4);
  });

  it('dopo aver toccato un solo .feature ne rilegge uno solo', () => {
    const dir = cartellaFeatures(4);
    trovaUsatoIn(STEPS, dir);
    conta.letture.length = 0;
    scrivi(dir, 'app0/f2.feature', feature(2, 'nuovo titolo'), 1800);
    const r = trovaUsatoIn(STEPS, dir);
    expect(lettureDi('.feature')).toBe(1);
    expect(r.get('the user opens the page')!.find((u) => u.file === 'app0/f2.feature')!.scenario).toBe('nuovo titolo');
  });

  it('un file in cui la frase non c\'e\' piu\' non risulta piu\' fra gli usi', () => {
    const dir = cartellaFeatures(3);
    expect(trovaUsatoIn(STEPS, dir).get('the user opens the page')).toHaveLength(3);
    scrivi(dir, 'app1/f1.feature', feature(1, 'x', 'something else entirely'), 1800);
    const usi = trovaUsatoIn(STEPS, dir).get('the user opens the page')!;
    expect(usi.map((u) => u.file)).not.toContain('app1/f1.feature');
    expect(usi).toHaveLength(2);
  });

  it('un catalogo diverso rifa\' il conto senza rileggere i file', () => {
    const dir = cartellaFeatures(3);
    trovaUsatoIn(STEPS, dir);
    conta.letture.length = 0;
    const altri = [step('the user opens the page'), step('something else')];
    const r = trovaUsatoIn(altri, dir);
    expect(lettureDi('.feature')).toBe(0);
    expect(r.get('something else')).toEqual([]);
    expect(r.get('the user opens the page')).toHaveLength(3);
    // e tornando al catalogo di prima il risultato e' ancora quello di prima
    expect(trovaUsatoIn(STEPS, dir).get('the page shows {string}')).toHaveLength(3);
  });

  it('chi riceve la mappa la puo\' modificare senza sporcare la chiamata dopo', () => {
    const dir = cartellaFeatures(2);
    const a = trovaUsatoIn(STEPS, dir);
    a.get('the user opens the page')!.length = 0;
    a.get('the page shows {string}')![0].scenario = 'sporcato';
    const b = trovaUsatoIn(STEPS, dir);
    expect(b.get('the user opens the page')).toHaveLength(2);
    expect(b.get('the page shows {string}')![0].scenario).not.toBe('sporcato');
  });

  it('un file appena scritto non e\' mai dato per buono', () => {
    const dir = cartellaFeatures(1);
    scrivi(dir, 'app0/nuovo.feature', feature(9, 'aaaa'), 0);
    expect(trovaUsatoIn(STEPS, dir).get('the user opens the page')!.map((u) => u.scenario)).toContain('aaaa');
    scrivi(dir, 'app0/nuovo.feature', feature(9, 'bbbb'), 0);
    const nomi = trovaUsatoIn(STEPS, dir).get('the user opens the page')!.map((u) => u.scenario);
    expect(nomi).toContain('bbbb');
    expect(nomi).not.toContain('aaaa');
  });
});

describe('costruisciCatalogo / leggiComportamenti: anche i sorgenti degli step si leggono una volta', () => {
  function radiceConSorgenti(): { src: string; features: string } {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-letture-'));
    const src = path.join(tmp, 'src');
    const features = path.join(src, 'features');
    scrivi(features, 'a/uno.feature', feature(1));
    scrivi(src, 'steps/x.steps.ts', [
      'Given("the user opens the page", async function () {',
      '  await homePage.navigate();',
      '});',
    ].join('\n'));
    return { src, features };
  }

  it('due costruzioni di fila non rileggono ne\' .feature ne\' sorgenti', () => {
    const { src, features } = radiceConSorgenti();
    const a = costruisciCatalogo(STEPS, features, src);
    const letture = conta.letture.length;
    expect(lettureDi('x.steps.ts')).toBe(1);
    const b = costruisciCatalogo(STEPS, features, src);
    expect(conta.letture.length).toBe(letture);
    expect(b).toEqual(a);
    expect(a.step[0].comportamento?.chiamate).toEqual(['homePage.navigate()']);
  });

  it('un sorgente di step cambiato da fuori si vede alla chiamata dopo', () => {
    const { src } = radiceConSorgenti();
    const passi = [{ expression: 'the user opens the page', sourceRef: 'src/steps/x.steps.ts:1' }];
    expect(leggiComportamenti(src, passi).get('the user opens the page')!.chiamate).toEqual(['homePage.navigate()']);
    scrivi(src, 'steps/x.steps.ts', [
      'Given("the user opens the page", async function () {',
      '  await altraPagina.apri();',
      '});',
    ].join('\n'), 1800);
    expect(leggiComportamenti(src, passi).get('the user opens the page')!.chiamate).toEqual(['altraPagina.apri()']);
  });
});
