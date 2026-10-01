import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Radice finta: se una rotta scrive nonostante la guardia, scrive qui e il test lo vede.
const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-guardia-'));

vi.mock('@/lib/repo', async () => {
  const { dentroLaCartella } = await import('@/lib/percorsi');
  const features = path.join(RADICE, 'src', 'features');
  return {
    REPO_ROOT: RADICE,
    FEATURES_DIR: features,
    slugify: (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    safeFeaturePath: (rel: string) => dentroLaCartella(features, rel, '.feature'),
  };
});

const features = await import('@/app/api/features/route');
const sposta = await import('@/app/api/features/move/route');
const proponi = await import('@/app/api/catalog/propose/route');
const enums = await import('@/app/api/enums/route');
const push = await import('@/app/api/github/push/route');
const importa = await import('@/app/api/import/route');
const jira = await import('@/app/api/jira/sync/route');
const lingua = await import('@/app/api/lingua/route');

const FEATURE = '@shop @cart\nFeature: x\n  Scenario: x\n    Given y\n';

function json(url: string, metodo: string, corpo: unknown, sito: string | null, intestazioni: Record<string, string> = {}) {
  const h: Record<string, string> = { 'content-type': 'text/plain', ...intestazioni };
  if (sito) h['sec-fetch-site'] = sito;
  return new Request(`http://127.0.0.1:3000${url}`, { method: metodo, headers: h, body: JSON.stringify(corpo) });
}

function modulo(sito: string | null) {
  const f = new FormData(); // senza file: dopo la guardia, 400
  f.append('nota', 'x');
  const h: Record<string, string> = {};
  if (sito) h['sec-fetch-site'] = sito;
  return new Request('http://127.0.0.1:3000/api/import', { method: 'POST', headers: h, body: f });
}

interface Caso {
  nome: string;
  chiama: (sito: string | null) => Promise<Response>;
}

const CASI: Caso[] = [
  { nome: 'POST /api/features', chiama: s => features.POST(json('/api/features', 'POST', { content: FEATURE, filePath: 'shop/cart/x.feature' }, s)) },
  { nome: 'POST /api/features/move', chiama: s => sposta.POST(json('/api/features/move', 'POST', { fromPath: 'shop/cart/x.feature', app: 'shop', flow: 'altro' }, s)) },
  { nome: 'POST /api/catalog/propose', chiama: s => proponi.POST(json('/api/catalog/propose', 'POST', { steps: [{ expression: 'the user does a thing' }] }, s)) },
  { nome: 'PUT /api/enums', chiama: s => enums.PUT(json('/api/enums', 'PUT', { expression: 'e', paramEnums: [] }, s)) },
  // Per push, import, jira e lingua i casi sono costruiti in modo che, DOPO la
  // guardia, la rotta fallisca subito con 400 (intestazioni o corpo mancanti):
  // nessuna rete, nessun ts-node, nessun cookie. Cio' che si prova e' la guardia.
  { nome: 'POST /api/github/push', chiama: s => push.POST(json('/api/github/push', 'POST', { content: FEATURE, filePath: 'src/features/x.feature' }, s)) },
  { nome: 'POST /api/import', chiama: s => importa.POST(modulo(s)) },
  { nome: 'POST /api/jira/sync', chiama: s => jira.POST(json('/api/jira/sync', 'POST', {}, s)) },
  { nome: 'POST /api/lingua', chiama: s => lingua.POST(json('/api/lingua', 'POST', { lingua: 'xx' }, s)) },
];

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

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(path.join(RADICE, 'src', 'features', 'shop', 'cart'), { recursive: true });
  fs.writeFileSync(path.join(RADICE, 'src', 'features', 'shop', 'cart', 'x.feature'), FEATURE);
  fs.writeFileSync(path.join(RADICE, 'step-catalog.json'), JSON.stringify({ totalSteps: 0, steps: [] }));
  fs.writeFileSync(path.join(RADICE, 'step-enums.json'), JSON.stringify({ version: 1, enums: [], dependencies: [] }));
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('guardia stessa-origine sulle rotte di scrittura', () => {
  for (const caso of CASI) {
    it(`${caso.nome}: una richiesta da un'altra origine riceve 403 e non scrive niente`, async () => {
      const prima = istantanea();
      const res = await caso.chiama('cross-site');
      expect(res.status).toBe(403);
      expect(istantanea()).toEqual(prima);
    });

    it(`${caso.nome}: anche same-site (altra porta, stesso host) e' rifiutata`, async () => {
      const res = await caso.chiama('same-site');
      expect(res.status).toBe(403);
    });

    it(`${caso.nome}: dalla finestra (same-origin) la guardia non scatta`, async () => {
      const res = await caso.chiama('same-origin');
      expect(res.status).not.toBe(403);
    });
  }

  it("senza intestazioni moderne, un'origine estranea e' rifiutata (ricade su Origin)", async () => {
    const richiesta = new Request('http://127.0.0.1:3000/api/lingua', {
      method: 'POST',
      headers: { origin: 'https://sito-estraneo.invalid', 'content-type': 'text/plain' },
      body: JSON.stringify({ lingua: 'xx' }),
    });
    expect((await lingua.POST(richiesta)).status).toBe(403);
  });
});
