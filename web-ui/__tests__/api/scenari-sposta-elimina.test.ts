import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-sposta-elimina-'));

vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));

const fin = vi.hoisted(() => ({ inCorso: undefined as undefined | { id: string; nome: string; avvio: string } }));
vi.mock('@/lib/registro', () => ({ operazioneInCorso: () => fin.inCorso }));

const rigenera = vi.hoisted(() => ({ chiamate: 0 }));
vi.mock('@/lib/rigenerazione-catalogo', () => ({
  tentaRigenerazioneCatalogo: async () => {
    rigenera.chiamate++;
    return true;
  },
}));

const controllo = vi.hoisted(() => ({
  esito: { ok: true } as { ok: true } | { ok: false; motivo: string; passi?: string[] },
  files: [] as string[][],
}));
vi.mock('@/lib/convalida-scenario', async (originale) => ({
  ...(await originale<typeof import('@/lib/convalida-scenario')>()),
  controlloVero: async (_radice: string, files: string[]) => {
    controllo.files.push(files);
    return controllo.esito;
  },
}));

const { GET: contenuto } = await import('@/app/api/scenari/contenuto/route');
const { POST: anteprima } = await import('@/app/api/scenari/anteprima/route');
const { POST: modifica } = await import('@/app/api/scenari/modifica/route');
const { POST: annulla } = await import('@/app/api/scenari/annulla/route');
const { improntaDiTesto } = await import('@/lib/impronta-scenario');
const { leggiEsiti } = await import('@/lib/esiti-scenari');
const { MARCATORE } = await import('@/lib/salva-scenario');

const DA = 'the user adds the item';
const M = `# ${MARCATORE} · rigenerabile`;
const scenario = (flusso: string, nome: string, titolo: string, ...passi: string[]) =>
  [M, `# src/features/shop/${flusso}/${nome}.feature`, '', `@shop @${flusso} @generato`, `Feature: ${titolo}`, '', `  Scenario: ${titolo}`, ...passi.map((p) => `    ${p}`), ''].join('\n');

const FILE = 'shop/order/pagamento.feature';
const PAGAMENTO = scenario('order', 'pagamento', 'Pagamento', 'Given the user is logged in', `When ${DA}`, 'Then the page shows "Done"');
const ORDINE = scenario('order', 'ordine', 'Ordine', 'Given the user is logged in', `When ${DA}`);
const SOLO = scenario('lonely', 'solo', 'Da solo', 'When the user does a solo thing');
const PAGINA = `// ${MARCATORE} · rigenerabile\nexport class HomePage {}\n`;
const STEPS = `// ${MARCATORE} · rigenerabile\n// src/steps/shop/order/pagamento.steps.ts\n/**\n * @intent ${DA}\n */\nWhen("${DA}", async function () {});\n`;
const SOLO_STEPS = `// ${MARCATORE} · rigenerabile\n/**\n * @intent the user does a solo thing\n */\nWhen("the user does a solo thing", async function () {});\n`;

const voce = (expression: string, file: string, extra: Record<string, unknown> = {}) => ({
  expression,
  parameters: expression.includes('{string}') ? ['{string}'] : [],
  app: file.includes('common') ? 'common' : 'shop',
  area: file.includes('common') ? 'common' : 'order',
  domain: 'shop',
  status: 'implemented',
  sourceRef: `src\\steps\\${file}:3`,
  documented: true,
  ...extra,
});
const CATALOGO = {
  steps: [
    voce('the user is logged in', 'common\\accesso.steps.ts'),
    voce('the page shows {string}', 'common\\verifica.steps.ts'),
    voce(DA, 'shop\\order\\pagamento.steps.ts'),
    // Come ogni passo registrato: ha il suo codice ed e' `wanted` finche' il team non lo approva.
    voce('the user does a solo thing', 'shop\\lonely\\solo.steps.ts', { status: 'wanted' }),
  ],
};

function scrivi(rel: string, testo: string) {
  const p = path.join(RADICE, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, testo);
}
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf-8');
const esiste = (rel: string) => fs.existsSync(path.join(RADICE, rel));

function istantanea(): string[] {
  const out: string[] = [];
  const visita = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(RADICE, p);
      if (rel.startsWith('reports')) continue;
      if (e.isDirectory()) {
        out.push(`${rel}/`);
        visita(p);
      } else out.push(`${rel}:${fs.readFileSync(p, 'utf-8')}`);
    }
  };
  visita(RADICE);
  return out.sort();
}

function post(url: string, corpo: unknown, sito: string | null = 'same-origin') {
  const h: Record<string, string> = { 'content-type': 'text/plain' };
  if (sito) h['sec-fetch-site'] = sito;
  return new Request(`http://127.0.0.1:3000${url}`, { method: 'POST', headers: h, body: JSON.stringify(corpo) });
}
const get = (url: string) => new Request(`http://127.0.0.1:3000${url}`);

const opSposta = (file = FILE, flusso = 'account') => ({ operazione: 'sposta', file, versione: improntaDiTesto(leggi(`src/features/${file}`)), flusso });
const opElimina = (file = FILE) => ({ operazione: 'elimina', file, versione: improntaDiTesto(leggi(`src/features/${file}`)) });

const INDICE = path.join(RADICE, 'reports', 'esiti-scenari.json');
const voceEsito = {
  file: FILE,
  nome: 'Pagamento',
  esito: 'passato',
  quando: '2026-10-01T10:00:00.000Z',
  durataMs: 1000,
  ambiente: null,
  esecuzione: 'test-a',
  impronta: 'impronta-vecchia',
};

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(RADICE, { recursive: true });
  scrivi('step-catalog.json', JSON.stringify(CATALOGO));
  scrivi('src/steps/common/accesso.steps.ts', 'import { Given } from "@cucumber/cucumber";\nGiven("the user is logged in", async function () {});\n');
  scrivi('src/steps/common/verifica.steps.ts', 'import { Then } from "@cucumber/cucumber";\nThen("the page shows {string}", async function (_t: string) {});\n');
  scrivi('src/steps/shop/order/pagamento.steps.ts', STEPS);
  scrivi('src/steps/shop/lonely/solo.steps.ts', SOLO_STEPS);
  scrivi('src/pages/shop/home.page.ts', PAGINA);
  scrivi(`src/features/${FILE}`, PAGAMENTO);
  scrivi('src/features/shop/order/ordine.feature', ORDINE);
  scrivi('src/features/shop/lonely/solo.feature', SOLO);
  scrivi('reports/esiti-scenari.json', JSON.stringify({ versione: 1, voci: [voceEsito] }));
  fin.inCorso = undefined;
  rigenera.chiamate = 0;
  controllo.esito = { ok: true };
  controllo.files = [];
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

/** Tutto cio' che le rotte hanno risposto: niente percorsi assoluti, niente barre rovesciate. */
const risposte: string[] = [];
async function corpo(res: Response): Promise<Record<string, unknown>> {
  const testo = await res.clone().text();
  risposte.push(testo);
  return JSON.parse(testo) as Record<string, unknown>;
}
afterAll(() => {
  for (const r of risposte) {
    expect(r).not.toContain(RADICE);
    expect(r).not.toContain(RADICE.replace(/\\/g, '/'));
    expect(r).not.toContain('\\\\');
  }
});

describe('la guardia stessa-origine: sposta ed elimina', () => {
  const casi: Array<[string, (s: string | null) => Promise<Response>]> = [
    ['anteprima sposta', (s) => anteprima(post('/api/scenari/anteprima', opSposta(), s))],
    ['modifica sposta', (s) => modifica(post('/api/scenari/modifica', opSposta(), s))],
    ['anteprima elimina', (s) => anteprima(post('/api/scenari/anteprima', opElimina(), s))],
    ['modifica elimina', (s) => modifica(post('/api/scenari/modifica', opElimina(), s))],
  ];
  for (const [nome, chiama] of casi) {
    it(`${nome}: cross-site risponde 403 e non scrive niente`, async () => {
      const prima = istantanea();
      expect((await chiama('cross-site')).status).toBe(403);
      expect(istantanea()).toEqual(prima);
    });
  }
});

describe('POST /api/scenari/anteprima: sposta ed elimina', () => {
  it('elimina elenca cosa va e cosa resta, chiede sempre conferma e non scrive', async () => {
    const prima = istantanea();
    const res = await anteprima(post('/api/scenari/anteprima', opElimina()));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect(c.tocca).toBe(true);
    const passi = c.passi as { vanno: string[]; restano: Array<{ frase: string; motivo: string; usatoDa: string[] }> };
    expect(passi.vanno).toEqual([]);
    expect(passi.restano).toContainEqual({ frase: DA, motivo: 'condiviso', usatoDa: ['Ordine'] });
    expect(passi.restano.map((p) => p.frase)).toContain('the user is logged in');
    expect((c.conseguenze as { scenari: Array<{ nome: string }> }).scenari.map((s) => s.nome)).toEqual(['Pagamento']);
    expect(istantanea()).toEqual(prima);
  });

  it('sposta dice dove finisce lo scenario e che diventa tuo', async () => {
    const res = await anteprima(post('/api/scenari/anteprima', opSposta()));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect(c.tocca).toBe(true);
    expect(c.fileDopo).toBe('shop/account/pagamento.feature');
    expect((c.conseguenze as { scenari: Array<{ diventaTuo: boolean }> }).scenari[0].diventaTuo).toBe(true);
  });

  it('una destinazione occupata: 409 occupato; un nome non valido: 400 flusso', async () => {
    scrivi('src/features/shop/account/pagamento.feature', 'Feature: gia qui\n');
    const occupato = await anteprima(post('/api/scenari/anteprima', opSposta()));
    expect(occupato.status).toBe(409);
    expect((await corpo(occupato)).errore).toBe('occupato');
    const strano = await anteprima(post('/api/scenari/anteprima', opSposta(FILE, '../fuori')));
    expect(strano.status).toBe(400);
    expect((await corpo(strano)).errore).toBe('flusso');
  });

  it('un corpo senza il flusso, o con un flusso che non e una stringa: 400', async () => {
    expect((await anteprima(post('/api/scenari/anteprima', { operazione: 'sposta', file: FILE, versione: 'x' }))).status).toBe(400);
    expect((await anteprima(post('/api/scenari/anteprima', { operazione: 'sposta', file: FILE, versione: 'x', flusso: 4 }))).status).toBe(400);
  });
});

describe('POST /api/scenari/modifica: sposta', () => {
  it('sposta il file e i suoi step, risponde col percorso nuovo (relativo) e controlla il file nuovo', async () => {
    const res = await modifica(post('/api/scenari/modifica', opSposta()));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect(c.file).toBe('shop/account/pagamento.feature');
    expect(c.eliminato).toBe(false);
    expect(c.catalogoRigenerato).toBe(true);
    expect(esiste(`src/features/${FILE}`)).toBe(false);
    expect(esiste('src/steps/shop/order/pagamento.steps.ts')).toBe(false);
    expect(leggi('src/features/shop/account/pagamento.feature')).toContain('@shop @account @generato');
    expect(leggi('src/pages/shop/home.page.ts')).toBe(PAGINA);
    expect(controllo.files).toEqual([['shop/account/pagamento.feature']]);
  });

  it('andata e ritorno: il percorso restituito si rilegge, e col vecchio si ottiene 404', async () => {
    const c = await corpo(await modifica(post('/api/scenari/modifica', opSposta())));
    const letto = await corpo(await contenuto(get(`/api/scenari/contenuto?file=${c.file}`)));
    expect(letto.versione).toBe(c.versione);
    expect((await contenuto(get(`/api/scenari/contenuto?file=${FILE}`))).status).toBe(404);
  });

  it('l\'esito della prova segue lo scenario: risulta modificato dopo la prova, non mai eseguito', async () => {
    await modifica(post('/api/scenari/modifica', opSposta()));
    const voci = leggiEsiti(INDICE).voci;
    expect(voci).toEqual([{ ...voceEsito, file: 'shop/account/pagamento.feature' }]);
  });

  it('annullando, il file torna al suo posto e l\'esito con lui', async () => {
    const prima = istantanea();
    await modifica(post('/api/scenari/modifica', opSposta()));
    const res = await annulla(post('/api/scenari/annulla', {}));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect((c.attuale as { testo: string }).testo).toBe(PAGAMENTO);
    expect(c.file).toBe(FILE);
    expect(istantanea()).toEqual(prima);
    expect(leggiEsiti(INDICE).voci).toEqual([voceEsito]);
    expect(rigenera.chiamate).toBe(2);
  });

  it('un controllo vero che boccia lascia tutto com\'era e l\'esito dov\'era', async () => {
    controllo.esito = { ok: false, motivo: 'indefinito', passi: ['x'] };
    const prima = istantanea();
    const res = await modifica(post('/api/scenari/modifica', opSposta()));
    expect(res.status).toBe(422);
    await corpo(res);
    expect(istantanea()).toEqual(prima);
    expect(leggiEsiti(INDICE).voci).toEqual([voceEsito]);
    expect(rigenera.chiamate).toBe(0);
  });

  it('si sta registrando o eseguendo: 409 e niente scritto', async () => {
    fin.inCorso = { id: 'test-1', nome: 'test', avvio: new Date().toISOString() };
    const prima = istantanea();
    const res = await modifica(post('/api/scenari/modifica', opSposta()));
    expect(res.status).toBe(409);
    await corpo(res);
    expect(istantanea()).toEqual(prima);
  });
});

describe('POST /api/scenari/modifica: elimina', () => {
  it('lo scenario che condivide un passo: il passo resta e la Page Object e identica byte per byte', async () => {
    const steps = leggi('src/steps/shop/order/pagamento.steps.ts');
    const res = await modifica(post('/api/scenari/modifica', opElimina()));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect(c.eliminato).toBe(true);
    expect(c.file).toBeNull();
    expect((c.passi as { restano: Array<{ frase: string }> }).restano.map((p) => p.frase)).toContain(DA);
    expect(esiste(`src/features/${FILE}`)).toBe(false);
    expect(leggi('src/steps/shop/order/pagamento.steps.ts')).toBe(steps);
    expect(leggi('src/pages/shop/home.page.ts')).toBe(PAGINA);
    expect(controllo.files).toEqual([['shop/order/ordine.feature']]);
    expect(rigenera.chiamate).toBe(0);
  });

  it('uno scenario con i suoi passi: spariscono, il catalogo si rigenera, e l\'Annulla ricrea tutto', async () => {
    const prima = istantanea();
    const res = await modifica(post('/api/scenari/modifica', opElimina('shop/lonely/solo.feature')));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect((c.passi as { vanno: string[] }).vanno).toEqual(['the user does a solo thing']);
    expect(esiste('src/steps/shop/lonely/solo.steps.ts')).toBe(false);
    expect(c.catalogoRigenerato).toBe(true);
    // La rigenerazione conserva le voci `wanted` anche senza codice: senza questo resterebbe un fantasma "da realizzare".
    const voci = (JSON.parse(leggi('step-catalog.json')) as typeof CATALOGO).steps.map((s) => s.expression);
    expect(voci).not.toContain('the user does a solo thing');
    expect(voci).toContain(DA);

    const a = await annulla(post('/api/scenari/annulla', {}));
    const ca = await corpo(a);
    expect(a.status).toBe(200);
    expect((ca.attuale as { testo: string }).testo).toBe(SOLO);
    expect(rigenera.chiamate).toBe(2);
    // La rigenerazione (qui finta) rifa' dal codice la voce che l'eliminazione aveva tolto.
    scrivi('step-catalog.json', JSON.stringify(CATALOGO));
    expect(istantanea()).toEqual(prima);
  });

  it('un file con piu\' scenari non si elimina da qui: 403 con la ragione', async () => {
    scrivi('src/features/shop/order/due.feature', `${ORDINE}\n  Scenario: Altro\n    Given the user is logged in\n`);
    const res = await modifica(post('/api/scenari/modifica', opElimina('shop/order/due.feature')));
    expect(res.status).toBe(403);
    expect((await corpo(res)).ragione).toBe('complesso');
    expect(esiste('src/features/shop/order/due.feature')).toBe(true);
  });

  it('una versione vecchia: 409 conflitto, niente cancellato', async () => {
    const op = opElimina();
    scrivi(`src/features/${FILE}`, `${PAGAMENTO}# di un altro\n`);
    const prima = istantanea();
    const res = await modifica(post('/api/scenari/modifica', op));
    expect(res.status).toBe(409);
    expect((await corpo(res)).errore).toBe('conflitto');
    expect(istantanea()).toEqual(prima);
  });

  it('un percorso strano: rifiutato', async () => {
    expect((await modifica(post('/api/scenari/modifica', { ...opElimina(), file: '../../x.feature' }))).status).toBe(403);
  });
});

describe('POST /api/scenari/modifica: il testo avanzato di un file con piu scenari', () => {
  const DUE = 'shop/order/due.feature';
  const TESTO = ['@shop @order', 'Feature: Due', '  Scenario: A', '    Given the user is logged in', '  Scenario: B', `    When ${DA}`, ''].join('\n');
  beforeEach(() => scrivi(`src/features/${DUE}`, TESTO));

  it('si salva se ogni frase esiste nel catalogo', async () => {
    const nuovo = TESTO.replace('Scenario: B', 'Scenario: B bis');
    const res = await modifica(post('/api/scenari/modifica', { operazione: 'testo', file: DUE, versione: improntaDiTesto(TESTO), testo: nuovo }));
    expect(res.status).toBe(200);
    await corpo(res);
    expect(leggi(`src/features/${DUE}`)).toContain('B bis');
  });

  it('una frase sconosciuta blocca il salvataggio e dice quale: 400, niente scritto', async () => {
    const prima = istantanea();
    const res = await modifica(
      post('/api/scenari/modifica', { operazione: 'testo', file: DUE, versione: improntaDiTesto(TESTO), testo: TESTO.replace(`When ${DA}`, 'When the user dances') })
    );
    const c = await corpo(res);
    expect(res.status).toBe(400);
    expect(c.errore).toBe('bloccato');
    expect(c.dettagli).toContainEqual({ codice: 'sconosciuto', frase: 'the user dances', riga: 6 });
    expect(istantanea()).toEqual(prima);
    expect(controllo.files).toEqual([]);
  });
});
