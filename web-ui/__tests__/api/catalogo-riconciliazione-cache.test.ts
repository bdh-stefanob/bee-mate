import { describe, it, expect, vi, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// GET /api/catalogo/riconciliazione e' una funzione pura del catalogo: finche' il
// file non cambia, il conto non si rifa'. Se cambia (anche da fuori) si rifa'.

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-riconc-cache-'));
vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));
const conteggio = vi.hoisted(() => ({ chiamate: 0 }));
vi.mock('@/lib/riconciliazione', async (originale) => {
  const reale = await originale<typeof import('@/lib/riconciliazione')>();
  return {
    ...reale,
    individuaCoppieConTetto: (...args: Parameters<typeof reale.individuaCoppieConTetto>) => {
      conteggio.chiamate++;
      return reale.individuaCoppieConTetto(...args);
    },
  };
});

const { GET } = await import('@/app/api/catalogo/riconciliazione/route');

afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

function step(expression: string, componente: string) {
  return {
    expression,
    parameters: [],
    app: 'a',
    area: 'a',
    domain: 'a',
    status: 'implemented',
    sourceRef: 'x.ts:1',
    documented: true,
    components: [{ role: 'button', name: componente, page: 'HomePage' }],
  };
}

function scriviCatalogo(steps: unknown[], secondiFa: number): void {
  const p = path.join(RADICE, 'step-catalog.json');
  fs.writeFileSync(p, JSON.stringify({ totalSteps: steps.length, steps }));
  const t = new Date(Date.now() - secondiFa * 1000);
  fs.utimesSync(p, t, t);
}

const NOMI = (corpo: { coppie: Array<{ a?: unknown; b?: unknown }> }) => JSON.stringify(corpo);

describe('GET /api/catalogo/riconciliazione: una cache che non mostra mai un catalogo vecchio', () => {
  it('con il catalogo invariato il conto si fa una volta sola, e la risposta e\' la stessa', async () => {
    scriviCatalogo([step('the user adds the item', 'Add'), step('the user adds an item', 'Add')], 3600);
    conteggio.chiamate = 0;
    const a = await (await GET()).json();
    const b = await (await GET()).json();
    expect(conteggio.chiamate).toBe(1);
    expect(NOMI(b)).toBe(NOMI(a));
    expect(a.coppie.length).toBeGreaterThan(0);
  });

  it('un catalogo cambiato da fuori si vede alla chiamata dopo', async () => {
    scriviCatalogo([step('the user adds the item', 'Add'), step('the user adds an item', 'Add')], 3600);
    const prima = await (await GET()).json();
    expect(prima.coppie.length).toBeGreaterThan(0);
    scriviCatalogo([step('the user adds the item', 'Add'), step('the page shows the footer', 'Footer')], 1800);
    const dopo = await (await GET()).json();
    expect(dopo.coppie).toEqual([]);
  });

  it('un catalogo che non si legge e\' un errore 500, come prima', async () => {
    fs.writeFileSync(path.join(RADICE, 'step-catalog.json'), 'non e\' JSON');
    const t = new Date(Date.now() - 900 * 1000);
    fs.utimesSync(path.join(RADICE, 'step-catalog.json'), t, t);
    const risposta = await GET();
    expect(risposta.status).toBe(500);
    expect(await risposta.json()).toEqual({ errore: 'catalogo_non_disponibile' });
  });
});
