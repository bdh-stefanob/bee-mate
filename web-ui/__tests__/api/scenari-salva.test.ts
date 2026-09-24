import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Una radice finta del repository, creata prima che il modulo della rotta la legga.
const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-salva-'));
vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));

const { POST } = await import('@/app/api/scenari/salva/route');

const GENERATO = '# generato-da: bdd-generate · rigenerabile\n# src/features/generated/s1.feature\n\n@generato\nFeature: s1\n  Scenario: s1\n    Given x\n';

function prepara(manifesto: unknown) {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(path.join(RADICE, 'src', 'features', 'generated'), { recursive: true });
  fs.mkdirSync(path.join(RADICE, 'reports', 'cruscotto'), { recursive: true });
  fs.writeFileSync(path.join(RADICE, 'src', 'features', 'generated', 's1.feature'), GENERATO);
  fs.writeFileSync(path.join(RADICE, 'reports', 'cruscotto', 'generazione-manifesto.json'), JSON.stringify(manifesto));
}

function richiesta(corpo: unknown, sito = 'same-origin') {
  return new Request('http://127.0.0.1:3000/api/scenari/salva', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': sito },
    body: JSON.stringify(corpo),
  });
}

const MANIFESTO = { files: [{ path: 'src/pages/generated/x.page.ts' }, { path: 'src/features/generated/s1.feature' }] };

beforeEach(() => prepara(MANIFESTO));
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('POST /api/scenari/salva', () => {
  it('sposta lo scenario indicato dal manifesto, non uno scelto dalla finestra', async () => {
    const res = await POST(richiesta({ app: 'shop', flusso: 'orders', titolo: 'New order', origine: '../../etc/x' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ file: 'shop/orders/new-order.feature', sovrascritto: false, rinominato: false });
    expect(fs.existsSync(path.join(RADICE, 'src', 'features', 'shop', 'orders', 'new-order.feature'))).toBe(true);
  });

  it('rifiuta una richiesta che non nasce dalla finestra', async () => {
    const res = await POST(richiesta({ app: 'shop', flusso: 'orders', titolo: 'X' }, 'cross-site'));
    expect(res.status).toBe(403);
  });

  it('un nome di cartella sbagliato torna con il suo codice, e il file resta dov\'era', async () => {
    const res = await POST(richiesta({ app: '../x', flusso: 'orders', titolo: 'X' }));
    expect(res.status).toBe(400);
    expect((await res.json()).codice).toBe('app');
    expect(fs.existsSync(path.join(RADICE, 'src', 'features', 'generated', 's1.feature'))).toBe(true);
  });

  it('senza manifesto dice che non trova lo scenario', async () => {
    fs.rmSync(path.join(RADICE, 'reports'), { recursive: true, force: true });
    const res = await POST(richiesta({ app: 'shop', flusso: 'orders', titolo: 'X' }));
    expect(res.status).toBe(404);
    expect((await res.json()).codice).toBe('non-trovato');
  });

  it('campi mancanti o del tipo sbagliato: 400', async () => {
    for (const corpo of [null, {}, { app: 'a', flusso: 'b' }, { app: 1, flusso: 'b', titolo: 'c' }]) {
      const res = await POST(richiesta(corpo));
      expect(res.status, JSON.stringify(corpo)).toBe(400);
    }
  });
});
