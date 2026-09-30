import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GET } from '@/app/api/download/route';
import { REPO_ROOT } from '@/lib/repo';

/**
 * La feature la crea il test, e la toglie alla fine.
 *
 * Prima si cercava una feature vera su disco: il test dipendeva da cosa c'era nel
 * repository, e quando gli scenari di esempio sono stati tolti non partiva
 * nemmeno. La rotta si protegge con un file suo, non con l'inventario degli scenari.
 */
const CARTELLA = path.resolve(REPO_ROOT, 'src', 'features', 'zz-test-download');
const FEATURE = 'zz-test-download/rotta.feature';

function makeRequest(file: string): Request {
  return new Request(`http://localhost:3000/api/download?file=${encodeURIComponent(file)}`);
}

describe('GET /api/download', () => {
  const feature = FEATURE;
  beforeAll(() => {
    fs.mkdirSync(CARTELLA, { recursive: true });
    fs.writeFileSync(
      path.join(CARTELLA, 'rotta.feature'),
      'Feature: rotta di download\n  Scenario: esiste\n    Then the page shows "x"\n'
    );
  });
  afterAll(() => fs.rmSync(CARTELLA, { recursive: true, force: true }));

  it('Test 1: file valido (.feature esistente) → 200, contiene Feature:, Content-Disposition', async () => {
    const res = await GET(makeRequest(feature));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('Feature:');
    const cd = res.headers.get('Content-Disposition') ?? '';
    expect(cd).toContain(path.basename(feature));
  });

  it('Test 2: path traversal ../../package.json → 403', async () => {
    const res = await GET(makeRequest('../../package.json'));
    expect(res.status).toBe(403);
  });

  it('Test 3: estensione non .feature → 403', async () => {
    const res = await GET(makeRequest(feature.replace(/\.feature$/, '.txt')));
    expect(res.status).toBe(403);
  });

  it('Test 4: file inesistente .feature → 404', async () => {
    const res = await GET(makeRequest(feature.replace(/[^/]+\.feature$/, 'inesistente.feature')));
    expect(res.status).toBe(404);
  });
});
