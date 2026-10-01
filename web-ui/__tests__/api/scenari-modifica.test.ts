import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-modifica-'));

vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));

// Il registro vero guarda i processi in corso: qui si decide a mano se ce n'e' uno.
const fin = vi.hoisted(() => ({ inCorso: undefined as undefined | { id: string; nome: string; avvio: string } }));
vi.mock('@/lib/registro', () => ({ operazioneInCorso: () => fin.inCorso }));

// La rigenerazione del catalogo lancerebbe ts-node: qui si conta solo se viene chiesta.
const rigenera = vi.hoisted(() => ({ chiamate: 0 }));
vi.mock('@/lib/rigenerazione-catalogo', () => ({
  tentaRigenerazioneCatalogo: async () => {
    rigenera.chiamate++;
    return true;
  },
}));

// Il controllo vero lancerebbe Cucumber: lo si decide a mano.
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
const { GET: statoAnnulla, POST: annulla } = await import('@/app/api/scenari/annulla/route');
const { POST: salva } = await import('@/app/api/scenari/salva/route');
const { conLaSerratura } = await import('@/lib/serratura-scenari');
const { improntaDiTesto } = await import('@/lib/impronta-scenario');
const { MARCATORE } = await import('@/lib/salva-scenario');

const DA = 'the user adds the item';
const A = 'the user puts the item in the cart';
const M = `# ${MARCATORE} · rigenerabile`;
const scenario = (titolo: string, ...passi: string[]) =>
  [M, '', '@shop @order @generato', `Feature: ${titolo}`, '', `  Scenario: ${titolo}`, ...passi.map((p) => `    ${p}`), ''].join('\n');
const PAGAMENTO = scenario('Pagamento', 'Given the user is logged in', `When ${DA}`, 'Then the page shows "Done"');
const ORDINE = scenario('Ordine', 'Given the user is logged in', `When ${DA}`);
const FILE = 'shop/order/pagamento.feature';
const PAGINA = `// ${MARCATORE} · rigenerabile\nexport class HomePage {}\n`;

const CATALOGO = {
  steps: [
    { expression: 'the user is logged in', parameters: [], app: 'common', area: 'common', domain: 'common', status: 'implemented', sourceRef: 'src\\steps\\common\\accesso.steps.ts:1', documented: true },
    { expression: 'the page shows {string}', parameters: ['{string}'], app: 'common', area: 'common', domain: 'common', status: 'implemented', sourceRef: 'src\\steps\\common\\verifica.steps.ts:1', documented: true },
    { expression: DA, parameters: [], app: 'shop', area: 'order', domain: 'shop', status: 'implemented', sourceRef: 'src\\steps\\shop\\order\\pagamento.steps.ts:7', documented: true },
    { expression: 'the user opens the shop', parameters: [], app: 'shop', area: 'order', domain: 'shop', status: 'implemented', sourceRef: 'src\\steps\\shop\\order\\pagamento.steps.ts:12', documented: true },
  ],
};
const STEPS = `// ${MARCATORE} · rigenerabile\n/**\n * @intent ${DA}\n */\nWhen("${DA}", async function () {});\n/**\n * @intent the user opens the shop\n */\nGiven("the user opens the shop", async function () {});\n`;

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

function post(url: string, corpo: unknown, sito: string | null = 'same-origin') {
  const h: Record<string, string> = { 'content-type': 'text/plain' };
  if (sito) h['sec-fetch-site'] = sito;
  return new Request(`http://127.0.0.1:3000${url}`, { method: 'POST', headers: h, body: JSON.stringify(corpo) });
}
const get = (url: string) => new Request(`http://127.0.0.1:3000${url}`);

const opTitolo = (nome = 'Pagamento rifiutato') => ({
  operazione: 'testo',
  file: FILE,
  versione: improntaDiTesto(PAGAMENTO),
  testo: PAGAMENTO.replace(/Pagamento/g, nome),
});
const opRinomina = () => ({ operazione: 'rinomina', file: FILE, versione: improntaDiTesto(PAGAMENTO), da: DA, a: A });

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(RADICE, { recursive: true });
  scrivi('step-catalog.json', JSON.stringify(CATALOGO));
  scrivi('src/steps/shop/order/pagamento.steps.ts', STEPS);
  scrivi('src/pages/shop/home.page.ts', PAGINA);
  scrivi(`src/features/${FILE}`, PAGAMENTO);
  scrivi('src/features/shop/order/ordine.feature', ORDINE);
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
    expect(r).not.toContain('\\\\'); // una barra rovesciata nel JSON
  }
});

describe('la guardia stessa-origine: ogni POST', () => {
  const casi: Array<[string, (s: string | null) => Promise<Response>]> = [
    ['anteprima', (s) => anteprima(post('/api/scenari/anteprima', opTitolo(), s))],
    ['modifica', (s) => modifica(post('/api/scenari/modifica', opTitolo(), s))],
    ['annulla', (s) => annulla(post('/api/scenari/annulla', {}, s))],
  ];
  for (const [nome, chiama] of casi) {
    for (const sito of ['cross-site', 'same-site']) {
      it(`${nome}: ${sito} risponde 403 e non scrive niente`, async () => {
        const prima = istantanea();
        const res = await chiama(sito);
        expect(res.status).toBe(403);
        expect(istantanea()).toEqual(prima);
      });
    }
    it(`${nome}: same-origin passa la guardia`, async () => {
      expect((await chiama('same-origin')).status).not.toBe(403);
    });
  }
});

describe('GET /api/scenari/contenuto', () => {
  it('legge testo, versione, passi e passi offribili', async () => {
    const res = await contenuto(get(`/api/scenari/contenuto?file=${FILE}`));
    expect(res.status).toBe(200);
    const c = await corpo(res);
    expect(c.versione).toBe(improntaDiTesto(PAGAMENTO));
    expect(c.semplice).toBe(true);
    expect((c.passi as Array<{ frase: string }>).map((p) => p.frase)).toContain(DA);
    expect((c.offribili as Array<{ frase: string }>).map((p) => p.frase)).toContain('the user opens the shop');
  });

  it.each([
    ['con ..', '../../package.json'],
    ['assoluto', '/etc/passwd'],
    ['assoluto di Windows', 'C:\\Windows\\win.ini'],
    ['estensione diversa', 'shop/order/pagamento.txt'],
    ['barra rovesciata', 'shop\\order\\pagamento.feature'],
  ])('percorso %s: 403', async (_n, file) => {
    const res = await contenuto(get(`/api/scenari/contenuto?file=${encodeURIComponent(file)}`));
    expect(res.status).toBe(403);
    await corpo(res);
  });

  it('un collegamento simbolico che esce da src/features: 403', async () => {
    fs.writeFileSync(path.join(RADICE, 'fuori.feature'), 'Feature: x\n');
    try {
      fs.symlinkSync(path.join(RADICE, 'fuori.feature'), path.join(RADICE, 'src', 'features', 'shop', 'ln.feature'));
    } catch {
      return; // Windows senza privilegio per i collegamenti: non si puo' provare qui
    }
    expect((await contenuto(get('/api/scenari/contenuto?file=shop/ln.feature'))).status).toBe(403);
  });

  it('inesistente: 404', async () => {
    expect((await contenuto(get('/api/scenari/contenuto?file=shop/non-c-e.feature'))).status).toBe(404);
  });
});

describe('POST /api/scenari/anteprima', () => {
  it('per una rinomina elenca gli scenari toccati e non scrive', async () => {
    const prima = istantanea();
    const res = await anteprima(post('/api/scenari/anteprima', opRinomina()));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect(c.tocca).toBe(true);
    expect((c.conseguenze as { scenari: Array<{ nome: string }> }).scenari.map((s) => s.nome).sort()).toEqual(['Ordine', 'Pagamento']);
    expect(istantanea()).toEqual(prima);
  });

  it('un blocco del controllo rapido torna con la frase', async () => {
    const op = { ...opTitolo(), testo: PAGAMENTO.replace(DA, 'the user dances') };
    const c = await corpo(await anteprima(post('/api/scenari/anteprima', op)));
    expect(c.ok).toBe(false);
    expect(c.blocchi).toContainEqual(expect.objectContaining({ codice: 'sconosciuto', frase: 'the user dances' }));
  });

  it('un corpo non valido: 400', async () => {
    expect((await anteprima(post('/api/scenari/anteprima', { operazione: 'sposta', file: FILE, versione: 'x' }))).status).toBe(400);
  });
});

describe('POST /api/scenari/modifica', () => {
  it('cambia il titolo, controlla, e restituisce il testo nuovo senza marcatore', async () => {
    const res = await modifica(post('/api/scenari/modifica', opTitolo()));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect(c.ok).toBe(true);
    expect(c.marcatoreTolto).toBe(true);
    expect(c.testo).toContain('Pagamento rifiutato');
    expect(String(c.testo).includes(MARCATORE)).toBe(false);
    expect(c.catalogoRigenerato).toBeNull();
    expect(rigenera.chiamate).toBe(0);
    expect(controllo.files).toEqual([[FILE]]);
  });

  it('andata e ritorno: la versione restituita e quella che si rilegge, e lo stesso percorso si rimanda com e', async () => {
    const c1 = await corpo(await modifica(post('/api/scenari/modifica', opTitolo('Primo'))));
    const letto = await corpo(await contenuto(get(`/api/scenari/contenuto?file=${FILE}`)));
    expect(letto.versione).toBe(c1.versione);
    // lo stesso `file`, con la versione nuova: e' la stessa operazione (non finisce in un "sposta")
    const c2 = await corpo(
      await modifica(post('/api/scenari/modifica', { operazione: 'testo', file: FILE, versione: c1.versione, testo: String(c1.testo).replace('Primo', 'Secondo') }))
    );
    expect(c2.ok).toBe(true);
    expect(fs.existsSync(path.join(RADICE, 'src', 'features', FILE))).toBe(true);
    expect(fs.existsSync(path.join(RADICE, 'src', 'features', 'src'))).toBe(false);
    expect(leggi(`src/features/${FILE}`)).toContain('Secondo');
  });

  it('una rinomina riscrive tutto, rigenera il catalogo e lascia la Page Object', async () => {
    const res = await modifica(post('/api/scenari/modifica', opRinomina()));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect(c.fileToccati).toBe(3);
    expect(c.catalogoRigenerato).toBe(true);
    expect(rigenera.chiamate).toBe(1);
    expect(leggi('src/features/shop/order/ordine.feature')).toContain(`When ${A}`);
    expect(leggi('src/steps/shop/order/pagamento.steps.ts')).toContain(`When("${A}"`);
    expect(leggi('src/pages/shop/home.page.ts')).toBe(PAGINA);
  });

  it('una rinomina di un passo `wanted` toglie la sua vecchia voce dal catalogo prima di rigenerare (se no resta un fantasma); annullando, toglie quella nuova', async () => {
    const catalogo = JSON.parse(JSON.stringify(CATALOGO)) as typeof CATALOGO;
    catalogo.steps.find((s) => s.expression === DA)!.status = 'wanted';
    catalogo.steps.push({ expression: 'a request nobody built', parameters: [], app: 'shop', area: 'order', domain: 'shop', status: 'wanted', sourceRef: '', documented: false });
    scrivi('step-catalog.json', JSON.stringify(catalogo));
    const voci = () => (JSON.parse(leggi('step-catalog.json')) as typeof CATALOGO).steps.map((s) => s.expression);

    expect((await modifica(post('/api/scenari/modifica', opRinomina()))).status).toBe(200);
    expect(voci()).not.toContain(DA);
    expect(voci()).toContain('a request nobody built'); // le richieste del team non si toccano

    // la rigenerazione (qui finta) ha aggiunto la voce nuova come fa extract-steps con le `wanted`
    const dopo = JSON.parse(leggi('step-catalog.json')) as typeof CATALOGO;
    dopo.steps.push({ ...catalogo.steps[2], expression: A });
    scrivi('step-catalog.json', JSON.stringify(dopo));
    expect((await annulla(post('/api/scenari/annulla', {}))).status).toBe(200);
    expect(voci()).not.toContain(A);
  });

  it('una versione vecchia: 409 conflitto, col file com e adesso, e niente scritto', async () => {
    scrivi(`src/features/${FILE}`, `${PAGAMENTO}# di un altro\n`);
    const prima = istantanea();
    const res = await modifica(post('/api/scenari/modifica', opTitolo()));
    const c = await corpo(res);
    expect(res.status).toBe(409);
    expect(c.errore).toBe('conflitto');
    expect((c.attuale as { testo: string }).testo).toContain('# di un altro');
    expect(istantanea()).toEqual(prima);
  });

  it('il controllo vero boccia: 422, con i passi, e tutto ripristinato', async () => {
    controllo.esito = { ok: false, motivo: 'indefinito', passi: ['the user adds the item'] };
    const prima = istantanea().filter((x) => !x.startsWith('reports'));
    const res = await modifica(post('/api/scenari/modifica', opRinomina()));
    const c = await corpo(res);
    expect(res.status).toBe(422);
    expect(c.errore).toBe('bocciato');
    expect(c.controllo).toEqual({ motivo: 'indefinito', passi: ['the user adds the item'] });
    expect(istantanea().filter((x) => !x.startsWith('reports'))).toEqual(prima);
    expect(rigenera.chiamate).toBe(0);
  });

  it('un blocco del controllo rapido: 400, niente scritto, niente controllo vero', async () => {
    const prima = istantanea();
    const res = await modifica(post('/api/scenari/modifica', { ...opTitolo(), testo: PAGAMENTO.replace(DA, 'the user dances') }));
    const c = await corpo(res);
    expect(res.status).toBe(400);
    expect(c.errore).toBe('bloccato');
    expect(istantanea()).toEqual(prima);
    expect(controllo.files).toEqual([]);
  });

  it('uno scenario non salvato (generated/) o un percorso strano: rifiutati', async () => {
    scrivi('src/features/generated/b.feature', scenario('B', `When ${DA}`));
    const res = await modifica(
      post('/api/scenari/modifica', { operazione: 'testo', file: 'generated/b.feature', versione: improntaDiTesto(leggi('src/features/generated/b.feature')), testo: 'x' })
    );
    expect(res.status).toBe(403);
    expect((await corpo(res)).ragione).toBe('registrato');
    expect((await modifica(post('/api/scenari/modifica', { ...opTitolo(), file: '../../x.feature' }))).status).toBe(403);
  });

  it('si sta registrando o eseguendo: 409 e niente scritto', async () => {
    fin.inCorso = { id: 'test-1', nome: 'test', avvio: new Date().toISOString() };
    const prima = istantanea();
    const res = await modifica(post('/api/scenari/modifica', opTitolo()));
    expect(res.status).toBe(409);
    expect((await corpo(res)).errore).toBe('operazione-in-corso');
    expect(istantanea()).toEqual(prima);
  });

  it('un\'altra modifica sta scrivendo: la serratura rifiuta, anche il salva della registrazione', async () => {
    let libera!: () => void;
    const attesa = new Promise<void>((r) => (libera = r));
    const tenuta = conLaSerratura(() => attesa);
    const prima = istantanea();
    const res = await modifica(post('/api/scenari/modifica', opTitolo()));
    expect(res.status).toBe(409);
    expect((await corpo(res)).errore).toBe('operazione-in-corso');
    const s = await salva(post('/api/scenari/salva', { app: 'shop', flusso: 'order', titolo: 'X' }));
    expect(s.status).toBe(409);
    expect(istantanea()).toEqual(prima);
    libera();
    await tenuta;
    expect((await modifica(post('/api/scenari/modifica', opTitolo()))).status).toBe(200);
  });
});

describe('annulla', () => {
  it('GET dice se c e qualcosa da annullare; POST annulla e restituisce lo scenario di prima', async () => {
    expect(await (await statoAnnulla()).json()).toEqual({ annullabile: false });
    await modifica(post('/api/scenari/modifica', opRinomina()));
    expect((await (await statoAnnulla()).json()).annullabile).toBe(true);

    const res = await annulla(post('/api/scenari/annulla', {}));
    const c = await corpo(res);
    expect(res.status).toBe(200);
    expect(rigenera.chiamate).toBe(2); // modifica + annulla: il catalogo segue le definizioni
    expect((c.attuale as { testo: string }).testo).toBe(PAGAMENTO);
    expect(leggi('src/features/shop/order/ordine.feature')).toBe(ORDINE);
    expect((await (await statoAnnulla()).json()).annullabile).toBe(false);
  });

  it('annullare due volte: 404 niente da annullare', async () => {
    await modifica(post('/api/scenari/modifica', opTitolo()));
    await annulla(post('/api/scenari/annulla', {}));
    const res = await annulla(post('/api/scenari/annulla', {}));
    expect(res.status).toBe(404);
    expect((await corpo(res)).errore).toBe('niente-da-annullare');
  });

  it('un file cambiato dopo la modifica: 409 cambiato-dopo, niente toccato', async () => {
    await modifica(post('/api/scenari/modifica', opTitolo()));
    scrivi(`src/features/${FILE}`, `${leggi(`src/features/${FILE}`)}# lavoro di un altro\n`);
    const prima = istantanea();
    const res = await annulla(post('/api/scenari/annulla', {}));
    expect(res.status).toBe(409);
    expect((await corpo(res)).errore).toBe('cambiato-dopo');
    expect(istantanea()).toEqual(prima);
  });
});
