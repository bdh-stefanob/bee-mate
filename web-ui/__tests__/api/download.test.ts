import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GET } from '@/app/api/download/route';
import { REPO_ROOT } from '@/lib/repo';

/**
 * Il percorso della feature non si scrive a mano.
 *
 * Questo test conteneva `auth/login.feature`, una cartella cancellata quando il
 * catalogo e' stato riazzerato: da allora restava rosso, e un rosso che resta
 * rosso smette di essere un segnale. Qui la feature si cerca su disco, cosi' il
 * test parla della rotta — che e' cio' che deve proteggere — e non
 * dell'inventario del catalogo, che cambia per conto suo.
 */
function primaFeature(): string {
  const radice = path.resolve(REPO_ROOT, 'src', 'features');
  const cerca = (dir: string): string | null => {
    for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
      const pieno = path.join(dir, voce.name);
      if (voce.isDirectory()) {
        const trovato = cerca(pieno);
        if (trovato) return trovato;
      } else if (voce.name.endsWith('.feature')) {
        return path.relative(radice, pieno).split(path.sep).join('/');
      }
    }
    return null;
  };
  const trovato = cerca(radice);
  if (!trovato) throw new Error('nessuna feature in src/features: il test non puo' + "' dire niente");
  return trovato;
}

function makeRequest(file: string): Request {
  return new Request(`http://localhost:3000/api/download?file=${encodeURIComponent(file)}`);
}

describe('GET /api/download', () => {
  const feature = primaFeature();

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
