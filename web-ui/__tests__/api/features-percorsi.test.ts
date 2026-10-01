import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-percorsi-'));

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

const salva = await import('@/app/api/features/route');
const sposta = await import('@/app/api/features/move/route');

const FEATURE = '@shop @cart\nFeature: x\n  Scenario: x\n    Given y\n';
const FEATURES = path.join(RADICE, 'src', 'features');

function post(url: string, corpo: unknown) {
  return new Request(`http://127.0.0.1:3000${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
    body: JSON.stringify(corpo),
  });
}

function tuttiIFile(dir = FEATURES, prefisso = ''): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? tuttiIFile(path.join(dir, e.name), `${prefisso}${e.name}/`) : [`${prefisso}${e.name}`],
  ).sort();
}

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(FEATURES, { recursive: true });
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('percorsi di POST /api/features e /api/features/move: sempre relativi a src/features/', () => {
  it('POST /api/features risponde col percorso ricevuto, relativo a src/features/', async () => {
    const res = await salva.POST(post('/api/features', { content: FEATURE, filePath: 'shop/cart/x.feature' }));
    expect(res.status).toBe(200);
    expect((await res.json()).path).toBe('shop/cart/x.feature');
  });

  it('andata e ritorno: rimandare il percorso restituito riscrive lo stesso file, non ne crea un altro', async () => {
    const primo = await (await salva.POST(post('/api/features', { content: FEATURE, filePath: 'shop/cart/x.feature' }))).json();
    const secondo = await (await salva.POST(post('/api/features', { content: FEATURE + '\n', filePath: primo.path }))).json();
    expect(secondo.path).toBe(primo.path);
    expect(tuttiIFile()).toEqual(['shop/cart/x.feature']);
  });

  it('POST /api/features/move risponde col percorso nuovo relativo a src/features/', async () => {
    await salva.POST(post('/api/features', { content: FEATURE, filePath: 'shop/cart/x.feature' }));
    const res = await sposta.POST(post('/api/features/move', { fromPath: 'shop/cart/x.feature', app: 'shop', flow: 'checkout' }));
    expect(res.status).toBe(200);
    expect((await res.json()).path).toBe('shop/checkout/x.feature');
    expect(tuttiIFile()).toEqual(['shop/checkout/x.feature']);
  });

  it('andata e ritorno dello spostamento: il percorso restituito si puo\' rimandare come fromPath', async () => {
    await salva.POST(post('/api/features', { content: FEATURE, filePath: 'shop/cart/x.feature' }));
    const primo = await (await sposta.POST(post('/api/features/move', { fromPath: 'shop/cart/x.feature', app: 'shop', flow: 'checkout' }))).json();
    const res = await sposta.POST(post('/api/features/move', { fromPath: primo.path, app: 'shop', flow: 'cart' }));
    expect(res.status).toBe(200);
    expect(tuttiIFile()).toEqual(['shop/cart/x.feature']);
  });
});
