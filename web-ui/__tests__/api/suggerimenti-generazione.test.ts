import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * (F6) Il flusso dei Suggerimenti con i dati veri: lo scenario lo scrive il
 * generatore vero, dalla registrazione di prova e da un catalogo che ha
 * candidati applicabili (`wanted`, senza parametri: uno `implemented` e' gia' realizzato e non si applica). Il collaudo V1 non
 * aveva niente da applicare: con `catalog.json` tutti i candidati sono
 * `deprecated`. Qui si prova `POST /api/suggerimenti` -> proposte, `applica` ->
 * file riscritti, `annulla` -> file identici a prima (confronto degli hash).
 *
 * I giudici (tsc, dry-run) sono finti: lanciarli veri e' un altro lavoro, gia'
 * coperto altrove. Tutto il resto e' vero.
 */

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-suggerimenti-gen-'));
vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));
vi.mock('@/lib/suggerimenti-giudici', () => ({
  giudiciVeri: () => async () => (['tsc', 'dry-run', 'validatore'] as const).map((nome) => ({ nome, ok: true })),
}));

const { POST: prepara } = await import('@/app/api/suggerimenti/route');
const { POST: applica } = await import('@/app/api/suggerimenti/applica/route');
const { POST: annulla } = await import('@/app/api/suggerimenti/annulla/route');

const REPO = path.resolve(__dirname, '..', '..', '..');
const FIXTURE = path.join(REPO, 'test-fixtures', 'generate');
const FEATURE_REL = 'src/features/generated/prova.feature';
const STEPS_REL = 'src/steps/generated/prova.steps.ts';

const hash = (rel: string) => createHash('sha256').update(fs.readFileSync(path.join(RADICE, rel))).digest('hex');
const tutti = () => ({ feature: hash(FEATURE_REL), steps: hash(STEPS_REL) });

function richiesta(url: string, corpo: unknown = {}) {
  return new Request(`http://127.0.0.1:3000${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' },
    body: JSON.stringify(corpo),
  });
}

beforeAll(() => {
  fs.mkdirSync(path.join(RADICE, 'reports', 'cruscotto'), { recursive: true });
  execFileSync(
    process.execPath,
    [
      path.join(REPO, 'node_modules', 'ts-node', 'dist', 'bin.js'),
      path.join(REPO, 'scripts', 'generate.ts'),
      path.join(FIXTURE, 'recording.json'),
      '--scout', path.join(FIXTURE, 'scout'),
      '--catalog', path.join(FIXTURE, 'catalog-con-candidati.json'),
      '--out', 'src',
      '--manifest', path.join('reports', 'cruscotto', 'generazione-manifesto.json'),
      '--name', 'prova',
    ],
    { cwd: RADICE, env: { ...process.env, TS_NODE_PROJECT: path.join(REPO, 'tsconfig.json') }, stdio: 'pipe' }
  );
}, 120_000);
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('suggerimenti su uno scenario generato dalla registrazione di prova', () => {
  it('propone le frasi del catalogo, applicabili', async () => {
    const corpo = await (await prepara(richiesta('/api/suggerimenti'))).json();
    expect(corpo.stato).toBe('pronte');
    expect(corpo.applicabili).toBeGreaterThanOrEqual(1);
    const riga = corpo.righe.find((r: { voce: string }) => r.voce === 'the customer cancels an order');
    expect(riga).toMatchObject({ etichetta: 'il cliente annulla un ordine', classe: 'stessi-componenti', motivoNonApplicabile: null });
  });

  it('applica riscrive i file, annulla li riporta identici a prima (stessi hash)', async () => {
    const corpo = await (await prepara(richiesta('/api/suggerimenti'))).json();
    const prima = tutti();

    const res = await applica(richiesta('/api/suggerimenti/applica', {
      id: corpo.id,
      scelte: [{ passo: 2, voce: 'the customer cancels an order' }],
    }));
    expect(await res.json()).toMatchObject({ esito: 'applicato', usate: 1 });

    const dopo = tutti();
    expect(dopo.feature).not.toBe(prima.feature);
    expect(dopo.steps).not.toBe(prima.steps);
    expect(fs.readFileSync(path.join(RADICE, FEATURE_REL), 'utf-8')).toContain('the customer cancels an order');

    const ann = await annulla(richiesta('/api/suggerimenti/annulla', { id: corpo.id }));
    expect(await ann.json()).toEqual({ esito: 'annullato' });
    expect(tutti()).toEqual(prima);
  });
});
