import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-prova-'));
vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));

const { GET } = await import('@/app/api/prova/route');
const { avvia, azzeraPerTest, usaRegistrazioneEsiti, usaPulizia } = await import('@/lib/registro');

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'messaggi-con-schermata.ndjson');
const cartella = path.join(RADICE, 'reports', 'cruscotto');

const chiedi = (query: string) => GET(new Request(`http://localhost/api/prova?${query}`));

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(cartella, { recursive: true });
  azzeraPerTest();
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('GET /api/prova', () => {
  it('un id non valido e\' 400 e non legge niente', async () => {
    fs.writeFileSync(path.join(RADICE, 'reports', 'segreto.ndjson'), 'x');
    for (const id of ['', '../segreto', 'a/b', 'A']) {
      const res = await chiedi(`id=${encodeURIComponent(id)}`);
      expect(res.status).toBe(400);
    }
    expect((await chiedi('')).status).toBe(400);
  });

  it('una prova che c\'e\' si legge, anche se il registro in memoria non la conosce', async () => {
    fs.copyFileSync(FIXTURE, path.join(cartella, 'test-aaaaaaa1.ndjson'));
    const res = await chiedi('id=test-aaaaaaa1');
    expect(res.status).toBe(200);
    const corpo = await res.json();
    expect(corpo.stato).toBe('ok');
    expect(corpo.passi.some((p: { schermata?: string }) => p.schermata)).toBe(true);
  });

  it('una prova che non c\'e\' piu\' lo dice', async () => {
    const res = await chiedi('id=test-aaaaaaa2');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stato: 'assente' });
  });

  it('solo=esiste risponde senza le schermate', async () => {
    fs.copyFileSync(FIXTURE, path.join(cartella, 'test-aaaaaaa1.ndjson'));
    expect(await (await chiedi('id=test-aaaaaaa1&solo=esiste')).json()).toEqual({ esiste: true });
    expect(await (await chiedi('id=test-aaaaaaa2&solo=esiste')).json()).toEqual({ esiste: false });
  });

  it('una prova ancora in corso non si apre come conclusa', async () => {
    usaRegistrazioneEsiti(() => {});
    usaPulizia(() => {});
    const e = avvia('diagnosi', {}, () => ({ onRiga() {}, onFine() {}, termina() {} }));
    fs.writeFileSync(path.join(cartella, `${e.id}.ndjson`), '');
    expect(await (await chiedi(`id=${e.id}`)).json()).toEqual({ stato: 'in-corso' });
    usaRegistrazioneEsiti(undefined);
    usaPulizia(undefined);
  });
});
