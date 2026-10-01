import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-suggerimenti-'));
vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));

// I giudici veri lanciano tsc e Cucumber: qui sono finti, e si possono far dire di no.
let diNo: string | null = null;
vi.mock('@/lib/suggerimenti-giudici', () => ({
  giudiciVeri: () => async () =>
    (['tsc', 'dry-run', 'validatore'] as const).map((nome) => ({ nome, ok: nome !== diNo })),
}));

const { POST: prepara } = await import('@/app/api/suggerimenti/route');
const { POST: applica } = await import('@/app/api/suggerimenti/applica/route');
const { POST: annulla } = await import('@/app/api/suggerimenti/annulla/route');

const compitoFixture = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'assistente', 'compito.json'), 'utf-8')
);
const ID = compitoFixture.id as string;

const FEATURE =
  `# generato-da: bdd-generate · rigenerabile\n\n@generato\nFeature: s1\n  Scenario: s1\n` +
  `    Given Sono dentro\n    When Conferma l'ordine\n    When Controllo il totale\n`;
const step = (frase: string, parola: string) =>
  `/**\n * @intent  ${frase}\n */\n${parola}(${JSON.stringify(frase)}, async function () {});\n`;
const STEPS =
  `// generato-da: bdd-generate · rigenerabile\n` +
  [step('Sono dentro', 'Given'), step("Conferma l'ordine", 'When'), step('Controllo il totale', 'When')].join('\n');

function scrivi(compito: unknown) {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(path.join(RADICE, 'src', 'features', 'generated'), { recursive: true });
  fs.mkdirSync(path.join(RADICE, 'src', 'steps', 'generated'), { recursive: true });
  fs.mkdirSync(path.join(RADICE, 'reports', 'cruscotto'), { recursive: true });
  fs.writeFileSync(path.join(RADICE, 'src', 'features', 'generated', 's1.feature'), FEATURE);
  fs.writeFileSync(path.join(RADICE, 'src', 'steps', 'generated', 's1.steps.ts'), STEPS);
  fs.writeFileSync(
    path.join(RADICE, 'reports', 'cruscotto', 'generazione-manifesto.json'),
    JSON.stringify({
      files: [
        { path: 'src/steps/generated/s1.steps.ts', origin: 'deterministico' },
        { path: 'src/features/generated/s1.feature', origin: 'deterministico' },
      ],
      ...(compito ? { compito } : {}),
    })
  );
}

function richiesta(url: string, corpo: unknown = {}, sito = 'same-origin') {
  return new Request(`http://127.0.0.1:3000${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': sito },
    body: JSON.stringify(corpo),
  });
}

const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf-8');
const FEATURE_REL = 'src/features/generated/s1.feature';
const SCELTA = { passo: 2, voce: 'the user confirms the order' };

beforeEach(() => {
  diNo = null;
  scrivi(compitoFixture);
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('POST /api/suggerimenti', () => {
  it('con candidati applicabili: pronte, con la frase del tester e quella del catalogo', async () => {
    const corpo = await (await prepara(richiesta('/api/suggerimenti'))).json();
    expect(corpo.stato).toBe('pronte');
    expect(corpo.id).toBe(ID);
    expect(corpo.origin).toBe('deterministico');
    expect(corpo.applicabili).toBe(2);
    expect(corpo.righe.find((r: { passo: number }) => r.passo === 2)).toMatchObject({
      etichetta: "Conferma l'ordine", voce: 'the user confirms the order', classe: 'stessi-componenti', motivoNonApplicabile: null,
    });
  });

  it('scrive il compito e la proposta sotto reports/assistente/<id>/, e due richieste danno gli stessi file', async () => {
    await prepara(richiesta('/api/suggerimenti'));
    const cartella = path.join('reports', 'assistente', ID);
    const a = [leggi(path.join(cartella, 'compito.json')), leggi(path.join(cartella, 'proposta.json'))];
    await prepara(richiesta('/api/suggerimenti'));
    expect([leggi(path.join(cartella, 'compito.json')), leggi(path.join(cartella, 'proposta.json'))]).toEqual(a);
  });

  it('senza compito nel manifesto (una generazione di prima): nessuno, e non e\' un errore', async () => {
    scrivi(null);
    const res = await prepara(richiesta('/api/suggerimenti'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stato: 'nessuno' });
  });

  it('senza manifesto: nessuno', async () => {
    fs.rmSync(path.join(RADICE, 'reports'), { recursive: true, force: true });
    expect(await (await prepara(richiesta('/api/suggerimenti'))).json()).toEqual({ stato: 'nessuno' });
  });

  it('con un catalogo che non ha niente da proporre: nessuno, e non scrive niente', async () => {
    const vuoto = { ...compitoFixture, passi: compitoFixture.passi.map((p: object) => ({ ...p, candidati: [] })) };
    scrivi(vuoto);
    expect(await (await prepara(richiesta('/api/suggerimenti'))).json()).toEqual({ stato: 'nessuno' });
    expect(fs.existsSync(path.join(RADICE, 'reports', 'assistente'))).toBe(false);
  });

  it('con soli candidati non applicabili (gia\' realizzati, con parametri): nessuno', async () => {
    const solo = {
      ...compitoFixture,
      passi: compitoFixture.passi.filter((p: { n: number }) => p.n === 1 || p.n === 5),
    };
    scrivi(solo);
    expect(await (await prepara(richiesta('/api/suggerimenti'))).json()).toEqual({ stato: 'nessuno' });
  });

  it('un compito non valido nel manifesto: nessuno', async () => {
    scrivi({ ...compitoFixture, valori: ['segreto'] });
    expect(await (await prepara(richiesta('/api/suggerimenti'))).json()).toEqual({ stato: 'nessuno' });
  });

  it('da un\'altra origine: 403', async () => {
    expect((await prepara(richiesta('/api/suggerimenti', {}, 'cross-site'))).status).toBe(403);
  });
});

describe('POST /api/suggerimenti/applica', () => {
  it('applica la scelta nel .feature e negli step, e il manifesto resta com\'era (le regole non sono un assistente)', async () => {
    await prepara(richiesta('/api/suggerimenti'));
    const res = await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [SCELTA] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ esito: 'applicato', usate: 1, origineFile: 'deterministico' });
    expect(leggi(FEATURE_REL)).toContain('When the user confirms the order');
    expect(leggi('src/steps/generated/s1.steps.ts')).toContain('When("the user confirms the order"');
    const m = JSON.parse(leggi('reports/cruscotto/generazione-manifesto.json'));
    expect(m.files.map((f: { origin: string }) => f.origin)).toEqual(['deterministico', 'deterministico']);
  });

  it('un giudice che dice no: rifiutato, e i file sono quelli di prima', async () => {
    await prepara(richiesta('/api/suggerimenti'));
    diNo = 'dry-run';
    const corpo = await (await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [SCELTA] }))).json();
    expect(corpo.esito).toBe('rifiutato-dai-giudici');
    expect(corpo.giudici.find((g: { ok: boolean }) => !g.ok).nome).toBe('dry-run');
    expect(leggi(FEATURE_REL)).toBe(FEATURE);
    expect(leggi('src/steps/generated/s1.steps.ts')).toBe(STEPS);
  });

  it('una scelta non applicabile: 400 con il codice, niente scritto', async () => {
    await prepara(richiesta('/api/suggerimenti'));
    const res = await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [{ passo: 1, voce: 'the user is logged in' }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).codice).toBe('non-applicabile');
    expect(leggi(FEATURE_REL)).toBe(FEATURE);
  });

  it('una proposta scaduta (lo scenario e\' stato rigenerato) non si applica', async () => {
    await prepara(richiesta('/api/suggerimenti'));
    scrivi({ ...compitoFixture, id: '20261001-160000-ffff' });
    const res = await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [SCELTA] }));
    expect(res.status).toBe(400);
    expect((await res.json()).codice).toBe('scaduta');
    expect(leggi(FEATURE_REL)).toBe(FEATURE);
  });

  it('un id che e\' un percorso: rifiutato', async () => {
    const res = await applica(richiesta('/api/suggerimenti/applica', { id: '../../etc', scelte: [SCELTA] }));
    expect(res.status).toBe(400);
    expect((await res.json()).codice).toBe('id-non-valido');
  });

  it('senza aver chiesto i suggerimenti non ci sono file da cui applicare', async () => {
    const res = await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [SCELTA] }));
    expect(res.status).toBe(400);
    expect((await res.json()).codice).toBe('compito-non-trovato');
  });

  it('corpo malformato o scelte strane: 400', async () => {
    expect((await applica(richiesta('/api/suggerimenti/applica', { id: ID }))).status).toBe(400);
    expect((await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [{ passo: 'due', voce: 'x' }] }))).status).toBe(400);
    expect((await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [] }))).status).toBe(400);
  });

  it('da un\'altra origine: 403', async () => {
    expect((await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [SCELTA] }, 'cross-site'))).status).toBe(403);
  });
});

describe('applicate e annullate', () => {
  it('dopo l\'applicazione la finestra riaperta dice "applicate", e annulla riporta tutto com\'era', async () => {
    await prepara(richiesta('/api/suggerimenti'));
    await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [SCELTA] }));
    expect(await (await prepara(richiesta('/api/suggerimenti'))).json()).toEqual({ stato: 'applicate', id: ID, usate: 1 });

    const res = await annulla(richiesta('/api/suggerimenti/annulla', { id: ID }));
    expect(await res.json()).toEqual({ esito: 'annullato' });
    expect(leggi(FEATURE_REL)).toBe(FEATURE);
    expect((await (await prepara(richiesta('/api/suggerimenti'))).json()).stato).toBe('pronte');
  });

  it('annulla dopo una modifica a mano: 400, e i file restano com\'erano', async () => {
    await prepara(richiesta('/api/suggerimenti'));
    await applica(richiesta('/api/suggerimenti/applica', { id: ID, scelte: [SCELTA] }));
    fs.appendFileSync(path.join(RADICE, FEATURE_REL), '    # ritocco\n');
    const dopo = leggi(FEATURE_REL);
    const res = await annulla(richiesta('/api/suggerimenti/annulla', { id: ID }));
    expect(res.status).toBe(400);
    expect((await res.json()).codice).toBe('modificato-a-mano');
    expect(leggi(FEATURE_REL)).toBe(dopo);
  });

  it('annulla da un\'altra origine: 403', async () => {
    expect((await annulla(richiesta('/api/suggerimenti/annulla', { id: ID }, 'cross-site'))).status).toBe(403);
  });
});

describe('il prodotto senza suggerimenti', () => {
  it('chiedere i suggerimenti e non usarli non cambia nessun file dello scenario', async () => {
    await prepara(richiesta('/api/suggerimenti'));
    expect(leggi(FEATURE_REL)).toBe(FEATURE);
    expect(leggi('src/steps/generated/s1.steps.ts')).toBe(STEPS);
  });
});
