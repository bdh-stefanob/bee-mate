import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Test di caratterizzazione di POST /api/catalogo/riconcilia: scritto PRIMA di
// estrarre la logica in `lib/rinomina-passo.ts`, deve passare identico prima e dopo.

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-riconcilia-'));
vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));
const rigenera = vi.fn(() => true);
vi.mock('@/lib/rigenerazione-catalogo', () => ({ tentaRigenerazioneCatalogo: () => rigenera() }));

const { POST } = await import('@/app/api/catalogo/riconcilia/route');

const DA = 'the user adds the item';
const A = 'the user puts the item in the cart';
const DEFINIZIONE =
  '/**\n * @intent  ' + DA + '\n */\nWhen("' + DA + '", async function () {\n  await shop.add();\n});\n';
const SCENARIO_1 = '@shop @cart\nFeature: One\n  Scenario: One\n    Given the user opens the shop\n    When ' + DA + '\n';
const SCENARIO_2 = 'Feature: Two\r\n  Scenario: Two\r\n    When ' + DA + '\r\n    And ' + DA + '\r\n';
const ESTRANEO = 'Feature: Other\n  Scenario: Other\n    When something else\n';

function catalogo(passi: { expression: string; sourceRef: string }[]) {
  fs.writeFileSync(path.join(RADICE, 'step-catalog.json'), JSON.stringify({ totalSteps: passi.length, steps: passi }));
}

function scrivi(rel: string, testo: string) {
  const p = path.join(RADICE, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, testo);
}
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf-8');

function istantanea(): string[] {
  const out: string[] = [];
  const visita = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) visita(p);
      else out.push(`${path.relative(RADICE, p)}:${fs.readFileSync(p, 'utf-8')}`);
    }
  };
  visita(RADICE);
  return out.sort();
}

function chiama(corpo: unknown, sito = 'same-origin', grezzo?: string) {
  return POST(
    new Request('http://127.0.0.1:3000/api/catalogo/riconcilia', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'sec-fetch-site': sito },
      body: grezzo ?? JSON.stringify(corpo),
    }),
  );
}

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(RADICE, { recursive: true });
  rigenera.mockClear();
  catalogo([{ expression: DA, sourceRef: 'src\\steps\\shop\\cart\\cart.steps.ts:4' }]);
  scrivi('src/steps/shop/cart/cart.steps.ts', DEFINIZIONE);
  scrivi('src/features/shop/cart/one.feature', SCENARIO_1);
  scrivi('src/features/shop/cart/two.feature', SCENARIO_2);
  scrivi('src/features/shop/cart/other.feature', ESTRANEO);
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('POST /api/catalogo/riconcilia (caratterizzazione)', () => {
  it('riscrive la frase in ogni scenario che la usa e nella definizione (anche @intent), e rigenera il catalogo', async () => {
    const res = await chiama({ da: DA, a: A });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, fileFeatureAggiornati: 2, catalogoRigenerato: true });

    expect(leggi('src/features/shop/cart/one.feature')).toBe(SCENARIO_1.replace(DA, A));
    // il file con CRLF resta CRLF, entrambe le righe riscritte
    expect(leggi('src/features/shop/cart/two.feature')).toBe(SCENARIO_2.split(DA).join(A));
    expect(leggi('src/features/shop/cart/other.feature')).toBe(ESTRANEO);
    const def = leggi('src/steps/shop/cart/cart.steps.ts');
    expect(def).toContain('When("' + A + '"');
    expect(def).toContain('@intent  ' + A);
    expect(def).not.toContain(DA);
    expect(rigenera).toHaveBeenCalledTimes(1);
  });

  it('riporta catalogoRigenerato: false quando la rigenerazione non riesce, a scrittura gia\' fatta', async () => {
    rigenera.mockReturnValueOnce(false);
    const res = await chiama({ da: DA, a: A });
    expect(res.status).toBe(200);
    expect((await res.json()).catalogoRigenerato).toBe(false);
    expect(leggi('src/steps/shop/cart/cart.steps.ts')).toContain(A);
  });

  it('con zero scenari che la usano riscrive solo la definizione', async () => {
    fs.rmSync(path.join(RADICE, 'src', 'features'), { recursive: true });
    scrivi('src/features/shop/cart/other.feature', ESTRANEO);
    const res = await chiama({ da: DA, a: A });
    expect(await res.json()).toEqual({ ok: true, fileFeatureAggiornati: 0, catalogoRigenerato: true });
    expect(leggi('src/steps/shop/cart/cart.steps.ts')).toContain(A);
  });

  const RIFIUTI: { nome: string; corpo?: unknown; grezzo?: string; sito?: string; stato: number; errore: string }[] = [
    { nome: 'altra origine', corpo: { da: DA, a: A }, sito: 'cross-site', stato: 403, errore: 'richiesta_non_ammessa' },
    { nome: 'corpo non JSON', grezzo: 'non json', stato: 400, errore: 'richiesta_non_leggibile' },
    { nome: 'corpo null', corpo: null, stato: 400, errore: 'richiesta_non_leggibile' },
    { nome: 'frase mancante', corpo: { da: DA }, stato: 400, errore: 'servono_due_frasi' },
    { nome: 'frase vuota', corpo: { da: DA, a: '   ' }, stato: 400, errore: 'servono_due_frasi' },
    { nome: 'frase non stringa', corpo: { da: DA, a: 3 }, stato: 400, errore: 'servono_due_frasi' },
    { nome: 'frase su piu\' righe', corpo: { da: DA, a: 'a\nb' }, stato: 400, errore: 'frase_non_valida' },
    { nome: 'frasi uguali', corpo: { da: DA, a: DA }, stato: 400, errore: 'le_frasi_sono_uguali' },
    { nome: 'frase con parametro (da)', corpo: { da: 'the page shows {string}', a: A }, stato: 400, errore: 'step_con_parametri_non_supportato' },
    { nome: 'frase con parametro (a)', corpo: { da: DA, a: 'the page shows {string}' }, stato: 400, errore: 'step_con_parametri_non_supportato' },
    { nome: 'step non nel catalogo', corpo: { da: 'una frase che non esiste', a: A }, stato: 404, errore: 'step_non_trovato' },
  ];
  for (const r of RIFIUTI) {
    it(`rifiuta con ${r.stato} ${r.errore} (${r.nome}) senza scrivere niente`, async () => {
      const prima = istantanea();
      const res = await chiama(r.corpo, r.sito, r.grezzo);
      expect(res.status).toBe(r.stato);
      expect((await res.json()).errore).toBe(r.errore);
      expect(istantanea()).toEqual(prima);
      expect(rigenera).not.toHaveBeenCalled();
    });
  }

  it('409 bersaglio_gia_esistente se la frase nuova e\' gia\' un altro step', async () => {
    catalogo([
      { expression: DA, sourceRef: 'src\\steps\\shop\\cart\\cart.steps.ts:4' },
      { expression: A, sourceRef: 'src\\steps\\shop\\cart\\cart.steps.ts:9' },
    ]);
    const prima = istantanea();
    const res = await chiama({ da: DA, a: A });
    expect(res.status).toBe(409);
    expect((await res.json()).errore).toBe('bersaglio_gia_esistente');
    expect(istantanea()).toEqual(prima);
  });

  it('500 catalogo_non_disponibile se step-catalog.json manca', async () => {
    fs.rmSync(path.join(RADICE, 'step-catalog.json'));
    const res = await chiama({ da: DA, a: A });
    expect(res.status).toBe(500);
    expect((await res.json()).errore).toBe('catalogo_non_disponibile');
  });

  it('500 definizione_non_trovata se il file della definizione non esiste, senza toccare gli scenari', async () => {
    fs.rmSync(path.join(RADICE, 'src', 'steps'), { recursive: true });
    const prima = istantanea();
    const res = await chiama({ da: DA, a: A });
    expect(res.status).toBe(500);
    expect((await res.json()).errore).toBe('definizione_non_trovata');
    expect(istantanea()).toEqual(prima);
  });

  it('500 definizione_non_trovata se il sourceRef esce da src/ (nessuna scrittura)', async () => {
    catalogo([{ expression: DA, sourceRef: '..\\fuori.steps.ts:1' }]);
    const prima = istantanea();
    const res = await chiama({ da: DA, a: A });
    expect(res.status).toBe(500);
    expect((await res.json()).errore).toBe('definizione_non_trovata');
    expect(istantanea()).toEqual(prima);
  });

  it('500 definizione_non_trovata se la frase e\' definita due volte nello stesso file: non scrive niente, scenari compresi', async () => {
    scrivi('src/steps/shop/cart/cart.steps.ts', DEFINIZIONE + 'Given("' + DA + '", async function () {});\n');
    const prima = istantanea();
    const res = await chiama({ da: DA, a: A });
    expect(res.status).toBe(500);
    expect((await res.json()).errore).toBe('definizione_non_trovata');
    expect(istantanea()).toEqual(prima);
  });

  it('500 definizione_non_trovata se la frase non compare nella definizione indicata dal catalogo', async () => {
    scrivi('src/steps/shop/cart/cart.steps.ts', 'When("altra", async function () {});\n');
    const prima = istantanea();
    const res = await chiama({ da: DA, a: A });
    expect(res.status).toBe(500);
    expect(istantanea()).toEqual(prima);
  });
});
