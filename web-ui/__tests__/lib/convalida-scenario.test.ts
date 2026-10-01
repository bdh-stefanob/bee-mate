import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  convalidaTesto,
  leggiMessaggiDryRun,
  controlloVero,
  lanciaDryRun,
  type Lanciatore,
} from '@/lib/convalida-scenario';
import type { CatalogStep } from '@/lib/types';

function passo(expression: string, extra: Partial<CatalogStep> = {}): CatalogStep {
  return {
    expression,
    parameters: [],
    app: 'shop',
    area: 'order',
    domain: 'shop',
    status: 'implemented',
    sourceRef: 'src\\steps\\shop\\x.steps.ts:1',
    documented: true,
    ...extra,
  };
}

const CATALOGO: CatalogStep[] = [
  passo('the user is logged in', { app: 'common', area: 'common' }),
  passo('the page shows {string}', { app: 'common', area: 'common', parameters: ['{string}'] }),
  passo('the user adds the item'),
  passo('the user pays by card'),
  passo('the user opens the shop'),
  passo('the user waits for the review', { status: 'wanted' }),
];

const scenario = (...passi: string[]) =>
  ['@shop', 'Feature: Pagamento', '', '  Scenario: Pagamento', ...passi.map((p) => `    ${p}`), ''].join('\n');

const BUONO = scenario('Given the user is logged in', 'When the user adds the item', 'Then the page shows "Done"');

describe('convalidaTesto: livello 1, in memoria', () => {
  it('un testo buono non ha ne blocchi ne avvisi', () => {
    expect(convalidaTesto({ testo: BUONO, prima: BUONO, catalogo: CATALOGO })).toEqual({ blocchi: [], avvisi: [] });
  });

  it('sintassi non valida: blocca, con la riga', () => {
    const rotto = 'Feature: F\n  Scenario: S\n    Given x\n  Scenario Outline\n';
    const e = convalidaTesto({ testo: rotto, prima: BUONO, catalogo: CATALOGO });
    expect(e.blocchi[0]).toMatchObject({ codice: 'sintassi' });
    expect(typeof e.blocchi[0].riga).toBe('number');
  });

  it('titolo vuoto: blocca', () => {
    const t = BUONO.replace('Scenario: Pagamento', 'Scenario:');
    expect(convalidaTesto({ testo: t, prima: BUONO, catalogo: CATALOGO }).blocchi.map((b) => b.codice)).toContain('titolo');
  });

  it('titolo oltre 80 caratteri: blocca', () => {
    const t = BUONO.replace('Scenario: Pagamento', `Scenario: ${'x'.repeat(81)}`);
    expect(convalidaTesto({ testo: t, prima: BUONO, catalogo: CATALOGO }).blocchi.map((b) => b.codice)).toContain('titolo');
  });

  it('nessun passo: blocca', () => {
    const t = 'Feature: F\n  Scenario: S\n';
    expect(convalidaTesto({ testo: t, prima: BUONO, catalogo: CATALOGO }).blocchi.map((b) => b.codice)).toContain('nessun-passo');
  });

  it('una frase che nessuno step riconosce: blocca, con la frase e la riga', () => {
    const t = scenario('Given the user is logged in', 'When the user dances');
    const e = convalidaTesto({ testo: t, prima: BUONO, catalogo: CATALOGO });
    expect(e.blocchi).toContainEqual({ codice: 'sconosciuto', frase: 'the user dances', riga: 6 });
  });

  it('una frase gia sconosciuta prima della modifica avvisa soltanto: il giudice e il controllo vero', () => {
    const prima = scenario('Given the user is logged in', 'When the user dances');
    const dopo = prima.replace('Pagamento', 'Altro');
    const e = convalidaTesto({ testo: dopo, prima, catalogo: CATALOGO });
    expect(e.blocchi).toEqual([]);
    expect(e.avvisi.map((a) => a.codice)).toContain('sconosciuto-gia');
  });

  it('una frase con parametro riconosciuta dal catalogo passa', () => {
    expect(convalidaTesto({ testo: BUONO, prima: BUONO, catalogo: CATALOGO }).blocchi).toEqual([]);
  });

  it('un\'ambiguita introdotta dalla modifica blocca', () => {
    // "the user adds the item" combacia con la frase esatta e con "the user adds the {word}"
    const catalogo2 = [...CATALOGO, passo('the user adds the {word}', { parameters: ['{word}'] })];
    const t = scenario('Given the user is logged in', 'When the user adds the item');
    const e = convalidaTesto({ testo: t, prima: BUONO.replace('the user adds the item', 'the user pays by card'), catalogo: catalogo2 });
    expect(e.blocchi).toContainEqual(expect.objectContaining({ codice: 'ambiguo', frase: 'the user adds the item' }));
  });

  it('un\'ambiguita che c\'era gia avvisa soltanto', () => {
    const catalogo2 = [...CATALOGO, passo('the user adds the {word}', { parameters: ['{word}'] })];
    const t = scenario('Given the user is logged in', 'When the user adds the item');
    const e = convalidaTesto({ testo: t, prima: t, catalogo: catalogo2 });
    expect(e.blocchi).toEqual([]);
    expect(e.avvisi.map((a) => a.codice)).toContain('ambiguo-gia');
  });

  it('nessun Then: avvisa, non blocca', () => {
    const t = scenario('Given the user is logged in', 'When the user adds the item');
    const e = convalidaTesto({ testo: t, prima: t, catalogo: CATALOGO });
    expect(e.blocchi).toEqual([]);
    expect(e.avvisi.map((a) => a.codice)).toContain('nessuna-verifica');
  });

  it('un And dopo un Then conta come verifica', () => {
    const t = scenario('Given the user is logged in', 'Then the page shows "a"', 'And the page shows "b"');
    expect(convalidaTesto({ testo: t, prima: t, catalogo: CATALOGO }).avvisi.map((a) => a.codice)).not.toContain('nessuna-verifica');
  });

  it('tolto "the user is logged in": avvisa che senza sessione lo scenario puo fermarsi', () => {
    const dopo = scenario('When the user adds the item', 'Then the page shows "Done"');
    const e = convalidaTesto({ testo: dopo, prima: BUONO, catalogo: CATALOGO });
    expect(e.avvisi.map((a) => a.codice)).toContain('senza-accesso');
    expect(e.blocchi).toEqual([]);
  });

  it('un passo @wanted: avvisa che il test partira e fallira', () => {
    const t = scenario('Given the user is logged in', 'When the user waits for the review', 'Then the page shows "Done"');
    const e = convalidaTesto({ testo: t, prima: BUONO, catalogo: CATALOGO });
    expect(e.avvisi).toContainEqual({ codice: 'wanted', frase: 'the user waits for the review' });
    expect(e.blocchi).toEqual([]);
  });

  it('un documento @non-automatizzato o una struttura complessa: blocca', () => {
    const doc = '@non-automatizzato\nFeature: F\n  Scenario: S\n    Given the user is logged in\n';
    expect(convalidaTesto({ testo: doc, prima: BUONO, catalogo: CATALOGO }).blocchi.map((b) => b.codice)).toContain('struttura');
    const due = `${BUONO}\n  Scenario: Altro\n    Given the user is logged in\n`;
    expect(convalidaTesto({ testo: due, prima: BUONO, catalogo: CATALOGO }).blocchi.map((b) => b.codice)).toContain('struttura');
  });
});

describe('convalidaTesto: gli altri scenari dopo una rinomina', () => {
  const VECCHIO = 'the user adds the item';
  const NUOVO = 'the user puts the item in the cart';
  const catPrima = CATALOGO;
  const catDopo = CATALOGO.map((s) => (s.expression === VECCHIO ? { ...s, expression: NUOVO } : s));
  const aperto = scenario('Given the user is logged in', `When ${NUOVO}`);
  const apertoPrima = scenario('Given the user is logged in', `When ${VECCHIO}`);

  it('una riga riscritta correttamente non e un problema', () => {
    const e = convalidaTesto({
      testo: aperto,
      prima: apertoPrima,
      catalogo: catDopo,
      catalogoPrima: catPrima,
      altri: [{ file: 'shop/order/b.feature', prima: apertoPrima, dopo: aperto }],
    });
    expect(e.blocchi).toEqual([]);
  });

  it('una riga con la frase vecchia che la riscrittura non ha riconosciuto (passo "*") blocca', () => {
    const altro = ['Feature: B', '  Scenario: B', `    * ${VECCHIO}`, ''].join('\n');
    const e = convalidaTesto({
      testo: aperto,
      prima: apertoPrima,
      catalogo: catDopo,
      catalogoPrima: catPrima,
      altri: [{ file: 'shop/order/b.feature', prima: altro, dopo: altro }],
    });
    expect(e.blocchi).toContainEqual({ codice: 'frase-orfana', frase: VECCHIO, file: 'shop/order/b.feature' });
  });

  it('una riga gia sconosciuta prima, in un altro file, non e colpa della modifica', () => {
    const altro = ['Feature: B', '  Scenario: B', '    Given something unknown', ''].join('\n');
    const e = convalidaTesto({
      testo: aperto,
      prima: apertoPrima,
      catalogo: catDopo,
      catalogoPrima: catPrima,
      altri: [{ file: 'shop/order/b.feature', prima: altro, dopo: altro }],
    });
    expect(e.blocchi).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Livello 2: la lettura dei messaggi
// ---------------------------------------------------------------------------

/** Messaggi nella forma vera di Cucumber, ridotti a cio' che il lettore guarda. */
function messaggi(passi: Array<{ testo: string; stato: string }>, opzioni: { senzaCasi?: boolean } = {}): string {
  const righe: object[] = [];
  const pickleSteps = passi.map((p, i) => ({ id: `ps${i}`, text: p.testo }));
  righe.push({ meta: { protocolVersion: '1' } });
  righe.push({ pickle: { id: 'p1', uri: 'src/features/shop/a.feature', name: 'S', steps: pickleSteps } });
  if (!opzioni.senzaCasi) {
    righe.push({
      testCase: { id: 'tc1', pickleId: 'p1', testSteps: passi.map((_, i) => ({ id: `ts${i}`, pickleStepId: `ps${i}` })) },
    });
    righe.push({ testCaseStarted: { id: 'tcs1', testCaseId: 'tc1' } });
    passi.forEach((p, i) =>
      righe.push({ testStepFinished: { testCaseStartedId: 'tcs1', testStepId: `ts${i}`, testStepResult: { status: p.stato } } })
    );
    righe.push({ testCaseFinished: { testCaseStartedId: 'tcs1' } });
  }
  return righe.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

describe('leggiMessaggiDryRun', () => {
  it('tutto verde (SKIPPED in una prova a vuoto): ok', () => {
    const e = leggiMessaggiDryRun(messaggi([{ testo: 'a', stato: 'SKIPPED' }, { testo: 'b', stato: 'SKIPPED' }]));
    expect(e).toEqual({ ok: true });
  });

  it('un passo non definito: no, con la frase', () => {
    const e = leggiMessaggiDryRun(messaggi([{ testo: 'a', stato: 'SKIPPED' }, { testo: 'manca', stato: 'UNDEFINED' }]));
    expect(e).toEqual({ ok: false, motivo: 'indefinito', passi: ['manca'] });
  });

  it('un passo ambiguo: no, con la frase', () => {
    const e = leggiMessaggiDryRun(messaggi([{ testo: 'doppio', stato: 'AMBIGUOUS' }]));
    expect(e).toEqual({ ok: false, motivo: 'ambiguo', passi: ['doppio'] });
  });

  it('indefinito prevale su ambiguo e le frasi non si ripetono', () => {
    const e = leggiMessaggiDryRun(
      messaggi([{ testo: 'x', stato: 'UNDEFINED' }, { testo: 'x', stato: 'UNDEFINED' }, { testo: 'y', stato: 'AMBIGUOUS' }])
    );
    expect(e).toEqual({ ok: false, motivo: 'indefinito', passi: ['x'] });
  });

  it('nessun caso eseguito (tutto filtrato o niente letto): non si e potuto controllare', () => {
    expect(leggiMessaggiDryRun(messaggi([{ testo: 'a', stato: 'SKIPPED' }], { senzaCasi: true }))).toMatchObject({ ok: false, motivo: 'nessuna-prova' });
    expect(leggiMessaggiDryRun('')).toMatchObject({ ok: false, motivo: 'nessuna-prova' });
  });

  it('righe illeggibili: no', () => {
    expect(leggiMessaggiDryRun('non e json\n')).toMatchObject({ ok: false });
  });
});

describe('controlloVero: il lanciatore e iniettato', () => {
  const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'convalida-'));
  afterAll(() => fs.rmSync(radice, { recursive: true, force: true }));

  const lanciatoreCon = (codice: number, testo: string, extra: { scaduto?: boolean } = {}): Lanciatore =>
    async ({ cartellaMessaggi, nomeMessaggi }) => {
      fs.mkdirSync(cartellaMessaggi, { recursive: true });
      fs.writeFileSync(path.join(cartellaMessaggi, nomeMessaggi), testo);
      return { codice, scaduto: extra.scaduto ?? false, uscita: '' };
    };

  it('verde', async () => {
    const lancia = lanciatoreCon(0, messaggi([{ testo: 'a', stato: 'SKIPPED' }]));
    expect(await controlloVero(radice, ['shop/a.feature'], lancia)).toEqual({ ok: true });
  });

  it('passi non definiti letti dai messaggi anche se l uscita e 0', async () => {
    const lancia = lanciatoreCon(0, messaggi([{ testo: 'manca', stato: 'UNDEFINED' }]));
    expect(await controlloVero(radice, ['shop/a.feature'], lancia)).toEqual({ ok: false, motivo: 'indefinito', passi: ['manca'] });
  });

  it('errore di compilazione: uscita diversa da 0 e nessun passo da nominare', async () => {
    const lancia = lanciatoreCon(1, '');
    expect(await controlloVero(radice, ['shop/a.feature'], lancia)).toMatchObject({ ok: false, motivo: 'compilazione' });
  });

  it('un tempo scaduto vale fallito', async () => {
    const lancia = lanciatoreCon(0, messaggi([{ testo: 'a', stato: 'SKIPPED' }]), { scaduto: true });
    expect(await controlloVero(radice, ['shop/a.feature'], lancia)).toMatchObject({ ok: false, motivo: 'tempo' });
  });

  it('un lanciatore che esplode vale fallito, non un errore', async () => {
    const lancia: Lanciatore = async () => {
      throw new Error('boom');
    };
    expect(await controlloVero(radice, ['shop/a.feature'], lancia)).toMatchObject({ ok: false, motivo: 'compilazione' });
  });

  it('non passa mai un percorso fuori da src/features e li unisce per BDD_PATHS', async () => {
    let visti: string[] = [];
    const lancia: Lanciatore = async (o) => {
      visti = o.percorsi;
      return { codice: 0, scaduto: false, uscita: '' };
    };
    await controlloVero(radice, ['shop/a.feature', 'shop/b.feature'], lancia);
    expect(visti).toEqual(['src/features/shop/a.feature', 'src/features/shop/b.feature']);
    await expect(controlloVero(radice, ['../../etc/passwd'], lancia)).resolves.toMatchObject({ ok: false });
  });
});

// ---------------------------------------------------------------------------
// Un solo caso con Cucumber vero: lo si ASSUME nel resto, qui lo si conferma.
// ---------------------------------------------------------------------------

const CUCUMBER_BIN = path.resolve(process.cwd(), '..', 'node_modules', '@cucumber', 'cucumber', 'bin', 'cucumber.js');

describe.skipIf(!fs.existsSync(CUCUMBER_BIN))('Cucumber vero: la prova a vuoto segnala non definito e ambiguo', () => {
  const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'cucumber-vero-'));
  afterAll(() => fs.rmSync(radice, { recursive: true, force: true }));

  const scrivi = (rel: string, testo: string) => {
    const p = path.join(radice, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, testo);
  };

  it('legge dai messaggi i passi non definiti e quelli ambigui, con uscita 0', async () => {
    const lib = JSON.stringify(path.resolve(path.dirname(CUCUMBER_BIN), '..', 'lib', 'index.js'));
    scrivi(
      'cucumber.js',
      `module.exports = { default: { require: ['steps/**/*.js'], paths: (process.env.BDD_PATHS || '').split(';').filter(Boolean), tags: 'not @non-automatizzato', format: [] } };\n`
    );
    scrivi(
      'steps/s.js',
      `const { Given } = require(${lib});\nGiven('uno', function () {});\nGiven('doppio', function () {});\nGiven('do{word}', function () {});\n`
    );
    scrivi('src/features/shop/ok.feature', 'Feature: ok\n  Scenario: ok\n    Given uno\n');
    scrivi('src/features/shop/manca.feature', 'Feature: manca\n  Scenario: manca\n    Given uno\n    And non esiste\n');
    scrivi('src/features/shop/ambiguo.feature', 'Feature: amb\n  Scenario: amb\n    Given doppio\n');

    const lancia: Lanciatore = (o) => lanciaDryRun({ ...o, cucumberJs: CUCUMBER_BIN });
    expect(await controlloVero(radice, ['shop/ok.feature'], lancia)).toEqual({ ok: true });
    expect(await controlloVero(radice, ['shop/manca.feature'], lancia)).toEqual({ ok: false, motivo: 'indefinito', passi: ['non esiste'] });
    expect(await controlloVero(radice, ['shop/ambiguo.feature'], lancia)).toEqual({ ok: false, motivo: 'ambiguo', passi: ['doppio'] });
    // anche mescolati, in una sola prova
    const misto = await controlloVero(radice, ['shop/ok.feature', 'shop/manca.feature'], lancia);
    expect(misto).toMatchObject({ ok: false, motivo: 'indefinito' });
  }, 60_000);
});
