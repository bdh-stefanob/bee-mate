import { describe, it, expect } from 'vitest';
import {
  SOGLIA_FILTRI,
  PASSO_FINESTRA,
  mostraFiltri,
  normalizza,
  filtraStep,
  filtraComponenti,
  filtraCoppie,
  conteggiStato,
  applicazioniDi,
  tagliaFinestra,
  ampliaFinestra,
  VISTA_STEP_VUOTA,
  VISTA_COMPONENTI_VUOTA,
  VISTA_COPPIE_VUOTA,
} from '@/lib/catalogo-filtri';
import type { ComponenteConStep } from '@/components/cruscotto/catalogo/tipi';
import { catalogoGrande, stepUi } from '../fixtures/catalogo/grande';

const bottone = { role: 'button', name: 'Accedi', page: 'Login' };

describe('mostraFiltri', () => {
  it('0, 1 e 8 voci: niente barra; 9: si', () => {
    expect(SOGLIA_FILTRI).toBe(8);
    expect(mostraFiltri(0)).toBe(false);
    expect(mostraFiltri(1)).toBe(false);
    expect(mostraFiltri(8)).toBe(false);
    expect(mostraFiltri(9)).toBe(true);
  });
});

describe('normalizza', () => {
  it('toglie maiuscole e accenti', () => {
    expect(normalizza('È già Così')).toBe('e gia cosi');
  });
});

describe('filtraStep: ricerca', () => {
  const step = [
    stepUi('the user opens the cart', { intento: 'Apre il carrello della spesa.' }),
    stepUi('the user logs in', { componenti: [bottone] }),
    stepUi('the page shows {string}'),
  ];

  it('query di soli spazi o vuota: tutto', () => {
    expect(filtraStep(step, { ...VISTA_STEP_VUOTA, q: '   ' })).toHaveLength(3);
    expect(filtraStep(step, VISTA_STEP_VUOTA)).toHaveLength(3);
  });
  it('insensibile a maiuscole e accenti, in tutte e due le direzioni', () => {
    expect(filtraStep(step, { ...VISTA_STEP_VUOTA, q: 'CARRELLO' })).toHaveLength(1);
    const conAccento = [stepUi('x', { intento: 'Perché funziona' })];
    expect(filtraStep(conAccento, { ...VISTA_STEP_VUOTA, q: 'perche' })).toHaveLength(1);
    const senza = [stepUi('x', { intento: 'perche funziona' })];
    expect(filtraStep(senza, { ...VISTA_STEP_VUOTA, q: 'perché' })).toHaveLength(1);
  });
  it('piu\' parole in AND', () => {
    expect(filtraStep(step, { ...VISTA_STEP_VUOTA, q: 'user cart' })).toHaveLength(1);
    expect(filtraStep(step, { ...VISTA_STEP_VUOTA, q: 'user banana' })).toHaveLength(0);
  });
  it('cerca in frase, intento, nome del componente e pagina', () => {
    expect(filtraStep(step, { ...VISTA_STEP_VUOTA, q: 'shows' })).toHaveLength(1);
    expect(filtraStep(step, { ...VISTA_STEP_VUOTA, q: 'spesa' })).toHaveLength(1);
    expect(filtraStep(step, { ...VISTA_STEP_VUOTA, q: 'accedi' })).toHaveLength(1);
    expect(filtraStep(step, { ...VISTA_STEP_VUOTA, q: 'login' }).map((s) => s.espressione)).toContain('the user logs in');
  });
});

describe('filtraStep: filtri', () => {
  const step = [
    stepUi('a', { app: 'shop', stato: 'implemented', componenti: [bottone] }),
    stepUi('b', { app: 'shop', stato: 'wanted' }),
    stepUi('c', { app: 'blog', stato: 'wanted', componenti: [bottone] }),
    stepUi('d', { app: 'common', stato: 'proposed' }),
    stepUi('e', { app: 'common', stato: 'deprecated' }),
  ];
  const nomi = (r: { espressione: string }[]) => r.map((s) => s.espressione);

  it('per applicazione', () => {
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, app: 'shop' }))).toEqual(['a', 'b']);
  });
  it('per stato', () => {
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, stato: 'pronto' }))).toEqual(['a']);
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, stato: 'richiesto' }))).toEqual(['b', 'c']);
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, stato: 'proposto' }))).toEqual(['d']);
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, stato: 'superato' }))).toEqual(['e']);
  });
  it('solo senza componente', () => {
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, senzaComponente: true }))).toEqual(['b', 'd', 'e']);
  });
  it('combinazioni', () => {
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, app: 'shop', senzaComponente: true }))).toEqual(['b']);
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, app: 'blog', stato: 'pronto' }))).toEqual([]);
  });
  it('conteggi per stato e applicazioni presenti, sul catalogo intero', () => {
    expect(conteggiStato(step)).toEqual({ pronto: 1, richiesto: 2, proposto: 1, superato: 1 });
    expect(applicazioniDi(step)).toEqual(['blog', 'common', 'shop']);
  });
  it('step senza campo stato (API piu\' vecchia): non rompe e non conta', () => {
    const vecchio = [stepUi('x', { stato: undefined })];
    expect(conteggiStato(vecchio)).toEqual({ pronto: 0, richiesto: 0, proposto: 0, superato: 0 });
    expect(filtraStep(vecchio, { ...VISTA_STEP_VUOTA, stato: 'pronto' })).toEqual([]);
  });
});

describe('filtraStep: ordinamento', () => {
  const nomi = (r: { espressione: string }[]) => r.map((s) => s.espressione);

  it('A-Z: insensibile ad accenti e maiuscole, stabile a parita\'', () => {
    const step = [stepUi('zeta'), stepUi('Alfa'), stepUi('èco'), stepUi('alfa')];
    expect(nomi(filtraStep(step, VISTA_STEP_VUOTA))).toEqual(['Alfa', 'alfa', 'èco', 'zeta']);
    // "Alfa" e "alfa" sono uguali per l'ordine: resta quello del catalogo.
    const rovesciato = [stepUi('alfa'), stepUi('Alfa')];
    expect(nomi(filtraStep(rovesciato, VISTA_STEP_VUOTA))).toEqual(['alfa', 'Alfa']);
  });
  it('piu\' usati: ordine decrescente per usi', () => {
    const uso = (n: number) => Array.from({ length: n }, (_, i) => ({ file: 'f', scenario: 's', riga: i }));
    const step = [stepUi('a', { usatoIn: uso(1) }), stepUi('b', { usatoIn: uso(3) }), stepUi('c')];
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, ordina: 'usi' }))).toEqual(['b', 'a', 'c']);
  });
  it('piu\' usati, a zero usi per tutti: torna A-Z', () => {
    const step = [stepUi('b'), stepUi('a')];
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, ordina: 'usi' }))).toEqual(['a', 'b']);
  });
  it('senza componente prima', () => {
    const step = [stepUi('a', { componenti: [bottone] }), stepUi('c'), stepUi('b')];
    expect(nomi(filtraStep(step, { ...VISTA_STEP_VUOTA, ordina: 'senza-componente' }))).toEqual(['b', 'c', 'a']);
  });
});

describe('filtraComponenti', () => {
  const comp = (name: string, step: string[], extra: Partial<ComponenteConStep> = {}): ComponenteConStep => ({
    role: 'button',
    name,
    page: 'Login',
    step,
    apps: ['shop'],
    ...extra,
  });
  const componenti = [
    comp('Accedi', ['s1']),
    comp('Email', ['s1', 's2', 's3'], { role: 'textbox' }),
    comp('Ricariche', ['s4'], { pagineAmbigue: ['Home', 'Conto'], apps: ['blog'] }),
  ];
  const step = [
    stepUi('s1', { usatoIn: [{ file: 'a/f/x.feature', scenario: 'uno', riga: 1 }] }),
    stepUi('s2', { usatoIn: [{ file: 'a/f/x.feature', scenario: 'uno', riga: 2 }, { file: 'a/f/y.feature', scenario: 'due', riga: 1 }] }),
    stepUi('s3'),
    stepUi('s4'),
  ];
  const nomi = (r: { name: string }[]) => r.map((c) => c.name);

  it('di default: piu\' step prima', () => {
    expect(nomi(filtraComponenti(componenti, step, VISTA_COMPONENTI_VUOTA))).toEqual(['Email', 'Accedi', 'Ricariche']);
  });
  it('per scenari: quanti distinti dipendono dal componente', () => {
    expect(nomi(filtraComponenti(componenti, step, { ...VISTA_COMPONENTI_VUOTA, ordina: 'scenari' }))[0]).toBe('Email');
  });
  it('A-Z', () => {
    expect(nomi(filtraComponenti(componenti, step, { ...VISTA_COMPONENTI_VUOTA, ordina: 'az' }))).toEqual(['Accedi', 'Email', 'Ricariche']);
  });
  it('solo pagine ambigue; per applicazione; ricerca su nome, pagina e frase', () => {
    expect(nomi(filtraComponenti(componenti, step, { ...VISTA_COMPONENTI_VUOTA, ambigua: true }))).toEqual(['Ricariche']);
    expect(nomi(filtraComponenti(componenti, step, { ...VISTA_COMPONENTI_VUOTA, app: 'blog' }))).toEqual(['Ricariche']);
    expect(nomi(filtraComponenti(componenti, step, { ...VISTA_COMPONENTI_VUOTA, q: 'email' }))).toEqual(['Email']);
    expect(nomi(filtraComponenti(componenti, step, { ...VISTA_COMPONENTI_VUOTA, q: 'conto' }))).toEqual(['Ricariche']);
    expect(nomi(filtraComponenti(componenti, step, { ...VISTA_COMPONENTI_VUOTA, q: 's4' }))).toEqual(['Ricariche']);
  });
});

describe('filtraCoppie', () => {
  const c = (id: string, a: string, b: string, appA = 'shop', appB = 'shop') => ({
    id,
    a: { espressione: a, app: appA },
    b: { espressione: b, app: appB },
  });
  const coppie = [c('1', 'the user clicks login', 'the user presses login'), c('2', 'opens cart', 'opens the cart', 'blog', 'blog')];
  it('ricerca nelle due frasi; per applicazione (di uno dei due lati)', () => {
    expect(filtraCoppie(coppie, { ...VISTA_COPPIE_VUOTA, q: 'presses' }).map((x) => x.id)).toEqual(['1']);
    expect(filtraCoppie(coppie, { ...VISTA_COPPIE_VUOTA, app: 'blog' }).map((x) => x.id)).toEqual(['2']);
    expect(filtraCoppie(coppie, VISTA_COPPIE_VUOTA)).toHaveLength(2);
  });
});

describe('finestra a 50', () => {
  const voci = catalogoGrande(137);
  it('50, poi 100, poi 137', () => {
    expect(PASSO_FINESTRA).toBe(50);
    let n = PASSO_FINESTRA;
    expect(tagliaFinestra(voci, n)).toHaveLength(50);
    n = ampliaFinestra(n, voci.length);
    expect(tagliaFinestra(voci, n)).toHaveLength(100);
    n = ampliaFinestra(n, voci.length);
    expect(tagliaFinestra(voci, n)).toHaveLength(137);
    expect(ampliaFinestra(n, voci.length)).toBe(137);
  });
});

describe('con 500 voci', () => {
  const voci = catalogoGrande(500);
  it('filtro e ordine restano rapidi e coerenti', () => {
    const t0 = Date.now();
    const r = filtraStep(voci, { ...VISTA_STEP_VUOTA, q: 'thing number4', ordina: 'usi' });
    expect(Date.now() - t0).toBeLessThan(500);
    expect(r).toHaveLength(0); // "number4" non esiste: le parole sono in AND
    const s = filtraStep(voci, { ...VISTA_STEP_VUOTA, q: 'number 49', ordina: 'usi' });
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.espressione.includes('49') || (x.intento ?? '').includes('49') || x.componenti.some((c) => c.name.includes('49')))).toBe(true);
  });
});
