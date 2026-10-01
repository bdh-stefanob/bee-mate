import { describe, it, expect } from 'vitest';
import {
  numeriCatalogo,
  numeriCoppie,
  numeroScenari,
  classificaCoppia,
  arricchisciCoppia,
  raggruppaCoppie,
  impattoComponente,
  dopoAggiornamento,
} from '@/lib/catalogo-numeri';
import type { CoppiaRiconciliazione, ComponenteConStep } from '@/components/cruscotto/catalogo/tipi';
import { catalogoGrande, stepUi } from '../fixtures/catalogo/grande';

const bottone = { role: 'button', name: 'Accedi' };
const link = { role: 'link', name: 'Accedi' };

function coppia(
  id: string,
  a: { espressione: string; componenti?: typeof bottone[]; app?: string },
  b: { espressione: string; componenti?: typeof bottone[]; app?: string },
  extra: Partial<CoppiaRiconciliazione> = {}
): CoppiaRiconciliazione {
  const lato = (x: typeof a) => ({ espressione: x.espressione, componenti: x.componenti ?? [], documentato: true, app: x.app ?? 'shop' });
  return { id, motivo: 'testo-quasi-uguale', spiegazione: '', stessoComponente: false, a: lato(a), b: lato(b), ...extra };
}

describe('numeriCatalogo', () => {
  it('catalogo vuoto: tutti zeri, nessun NaN', () => {
    const n = numeriCatalogo({ step: [], componenti: [] });
    expect(n).toMatchObject({ totale: 0, pronti: 0, richiesti: 0, altri: 0, ancorati: 0, componenti: 0 });
    expect(Object.values(n).some((v) => Number.isNaN(v))).toBe(false);
  });
  it('una voce (il caso di oggi)', () => {
    const n = numeriCatalogo({ step: [stepUi('the page shows {string}', { stato: 'implemented', app: 'common' })], componenti: [] });
    expect(n).toMatchObject({ totale: 1, pronti: 1, richiesti: 0, ancorati: 0, componenti: 0 });
  });
  it('137 voci: 10 pronti, 127 richiesti; la somma torna, con proposti e superati in "altri"', () => {
    const step = Array.from({ length: 137 }, (_, i) => stepUi(`s${i}`, { stato: i < 10 ? 'implemented' : 'wanted' }));
    const n = numeriCatalogo({ step, componenti: [] });
    expect(n.pronti).toBe(10);
    expect(n.richiesti).toBe(127);
    const misti = [stepUi('a', { stato: 'implemented' }), stepUi('b', { stato: 'proposed' }), stepUi('c', { stato: 'deprecated' }), stepUi('d', { stato: undefined })];
    const m = numeriCatalogo({ step: misti, componenti: [] });
    expect(m.pronti + m.richiesti + m.altri).toBe(m.totale);
    expect(m.altri).toBe(3);
  });
  it('"ancorati" conta gli step con almeno un componente, non i riferimenti', () => {
    const step = [stepUi('a', { componenti: [bottone, link] }), stepUi('b', { componenti: [bottone] }), stepUi('c')];
    expect(numeriCatalogo({ step, componenti: [] }).ancorati).toBe(2);
  });
  it('i componenti sono quelli distinti della mappa', () => {
    const c: ComponenteConStep = { role: 'button', name: 'X', step: ['a'], apps: ['shop'] };
    expect(numeriCatalogo({ step: [], componenti: [c, { ...c, name: 'Y' }] }).componenti).toBe(2);
  });
  it('a 500 voci non si blocca', () => {
    const t0 = Date.now();
    numeriCatalogo({ step: catalogoGrande(500), componenti: [] });
    expect(Date.now() - t0).toBeLessThan(200);
  });
});

describe('numeroScenari', () => {
  it('null mentre carica non e\' 0', () => {
    expect(numeroScenari(null)).toBeNull();
    expect(numeroScenari([])).toBe(0);
  });
  it('somma gli scenari eseguibili di tutti i file', () => {
    expect(numeroScenari([{ scenari: [{}, {}] }, { scenari: [{}] }])).toBe(3);
  });
});

describe('classificaCoppia', () => {
  it('stessi componenti: doppione', () => {
    const c = coppia('1', { espressione: 'a', componenti: [bottone] }, { espressione: 'b', componenti: [bottone] }, { stessoComponente: true, motivo: 'stessi-componenti' });
    expect(classificaCoppia(c)).toBe('doppione');
  });
  it('entrambe ancorate, componenti diversi: equivoco', () => {
    const c = coppia('1', { espressione: 'a', componenti: [bottone] }, { espressione: 'A', componenti: [link] });
    expect(classificaCoppia(c)).toBe('equivoco');
  });
  it('una ancorata e una no: da verificare, NON equivoco', () => {
    const c = coppia('1', { espressione: 'a', componenti: [bottone] }, { espressione: 'A' });
    expect(classificaCoppia(c)).toBe('da-verificare');
  });
  it('nessuna delle due ancorata: da verificare', () => {
    expect(classificaCoppia(coppia('1', { espressione: 'a' }, { espressione: 'A' }))).toBe('da-verificare');
  });
  it('applicazioni diverse: informativa, qualunque siano i componenti', () => {
    const c = coppia('1', { espressione: 'a', componenti: [bottone], app: 'shop' }, { espressione: 'A', componenti: [link], app: 'blog' }, { motivo: 'applicazioni-diverse' });
    expect(classificaCoppia(c)).toBe('informativa');
  });
});

describe('numeriCoppie', () => {
  const doppione = coppia('d', { espressione: 'a', componenti: [bottone] }, { espressione: 'b', componenti: [bottone] }, { stessoComponente: true });
  const equivoco = coppia('e', { espressione: 'c', componenti: [bottone] }, { espressione: 'C', componenti: [link] });
  const verificare = coppia('v', { espressione: 'x' }, { espressione: 'X' });
  const info = coppia('i', { espressione: 'y', app: 'shop' }, { espressione: 'Y', app: 'blog' }, { motivo: 'applicazioni-diverse' });

  it('il contatore e\' doppioni + equivoci; "da verificare" e "solo da sapere" non entrano', () => {
    expect(numeriCoppie([doppione, equivoco, verificare, info])).toEqual({
      azionabili: 2,
      doppioni: 1,
      equivoci: 1,
      daVerificare: 1,
      soloSapere: 1,
    });
  });
  it('nessuna coppia: tutto zero', () => {
    expect(numeriCoppie([])).toEqual({ azionabili: 0, doppioni: 0, equivoci: 0, daVerificare: 0, soloSapere: 0 });
  });
  it('raggruppa nei quattro gruppi, ordinando per uso complessivo decrescente e poi per id', () => {
    const usi = (n: number) => Array.from({ length: n }, (_, i) => ({ file: 'f', scenario: 's', riga: i }));
    const catalogo = [stepUi('a', { usatoIn: usi(1) }), stepUi('b', { usatoIn: usi(1) }), stepUi('c', { usatoIn: usi(5) }), stepUi('C')];
    const d1 = coppia('d1', { espressione: 'a', componenti: [bottone] }, { espressione: 'b', componenti: [bottone] }, { stessoComponente: true });
    const d2 = coppia('d0', { espressione: 'c', componenti: [bottone] }, { espressione: 'C', componenti: [bottone] }, { stessoComponente: true });
    const g = raggruppaCoppie([d1, d2, equivoco, verificare, info].map((x) => arricchisciCoppia(x, catalogo)));
    expect(g.doppioni.map((x) => x.id)).toEqual(['d0', 'd1']);
    expect(g.equivoci).toHaveLength(1);
    expect(g.daVerificare).toHaveLength(1);
    expect(g.informative).toHaveLength(1);
  });
});

describe('arricchisciCoppia', () => {
  it('prende usatoIn dal catalogo', () => {
    const uso = [{ file: 'shop/f/x.feature', scenario: 'uno', riga: 3 }];
    const c = arricchisciCoppia(coppia('1', { espressione: 'a' }, { espressione: 'b' }), [stepUi('a', { usatoIn: uso })]);
    expect(c.a.usatoIn).toEqual(uso);
  });
  it('frase non trovata: []', () => {
    const c = arricchisciCoppia(coppia('1', { espressione: 'a' }, { espressione: 'b' }), []);
    expect(c.a.usatoIn).toEqual([]);
    expect(c.b.usatoIn).toEqual([]);
  });
});

describe('impattoComponente', () => {
  const comp = (step: string[]): ComponenteConStep => ({ role: 'button', name: 'X', step, apps: ['shop'] });
  const uso = (file: string, scenario: string, riga = 1) => ({ file, scenario, riga });

  it('uno scenario che passa da due step conta una volta', () => {
    const step = [stepUi('a', { usatoIn: [uso('s/f/x.feature', 'uno', 1)] }), stepUi('b', { usatoIn: [uso('s/f/x.feature', 'uno', 2)] })];
    expect(impattoComponente(comp(['a', 'b']), step)).toBe(1);
  });
  it('nessuno scenario: 0', () => {
    expect(impattoComponente(comp(['a']), [stepUi('a')])).toBe(0);
  });
  it('scenari con lo stesso nome in file diversi sono due', () => {
    const step = [stepUi('a', { usatoIn: [uso('s/f/x.feature', 'uno'), uso('s/f/y.feature', 'uno')] })];
    expect(impattoComponente(comp(['a']), step)).toBe(2);
  });
  it('uno step citato dal componente ma assente dal catalogo: ignorato', () => {
    expect(impattoComponente(comp(['fantasma']), [])).toBe(0);
  });
});

describe('dopoAggiornamento: quando rileggere', () => {
  it('in corso -> ok: si', () => expect(dopoAggiornamento('in-corso', 'ok')).toBe(true));
  it('in corso -> fallita: no', () => expect(dopoAggiornamento('in-corso', 'fallita')).toBe(false));
  it('ok -> ok: no', () => expect(dopoAggiornamento('ok', 'ok')).toBe(false));
  it('assente -> ok: no', () => expect(dopoAggiornamento(null, 'ok')).toBe(false));
  it('in corso -> in corso: no', () => expect(dopoAggiornamento('in-corso', 'in-corso')).toBe(false));
});
