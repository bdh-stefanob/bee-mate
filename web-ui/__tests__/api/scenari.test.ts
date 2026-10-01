import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Una radice finta del repository, creata prima che il modulo della rotta la legga.
const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-scenari-'));
vi.mock('@/lib/repo', () => ({
  REPO_ROOT: RADICE,
  FEATURES_DIR: path.join(RADICE, 'src', 'features'),
}));

const { GET } = await import('@/app/api/scenari/route');
const { registraEsiti, percorsoIndice } = await import('@/lib/esiti-scenari');
const { improntaDiTesto } = await import('@/lib/impronta-scenario');
import type { RispostaScenari } from '@/lib/esiti-tipi';

const TESTO = 'Feature: Ordini\n  Scenario: Il cliente completa l\'ordine\n    Given a\n';
const FILE = 'shop/order/ordine.feature';

function prepara(): void {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(path.join(RADICE, 'src', 'features', 'shop', 'order'), { recursive: true });
  fs.mkdirSync(path.join(RADICE, 'reports', 'cruscotto'), { recursive: true });
  fs.writeFileSync(path.join(RADICE, 'src', 'features', FILE), TESTO);
}

async function leggi(): Promise<RispostaScenari> {
  const res = await GET();
  expect(res.status).toBe(200);
  return (await res.json()) as RispostaScenari;
}

const voce = (extra: Record<string, unknown> = {}) => ({
  file: FILE,
  nome: "Il cliente completa l'ordine",
  esito: 'fallito' as const,
  quando: '2026-09-30T14:36:53.739Z',
  durataMs: 10992,
  ambiente: 'staging',
  esecuzione: 'test-abc',
  impronta: improntaDiTesto(TESTO),
  passoFallito: { numero: 3, totale: 6, testo: 'il cliente aggiunge Maglia blu', motivo: 'errore' as const, riepilogo: { primaRiga: 'boom' } },
  ...extra,
});

beforeEach(prepara);
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('GET /api/scenari', () => {
  it('la risposta ha file, soloDescritti ed esiti; senza esiti salvati tutto e\' "mai eseguito"', async () => {
    const r = await leggi();
    expect(Object.keys(r).sort()).toEqual(['esiti', 'file', 'soloDescritti']);
    expect(r.esiti).toBe('ok');
    expect(r.soloDescritti).toBe(0);
    expect(r.file[0].file).toBe(FILE);
    expect(r.file[0].impronta).toBe(improntaDiTesto(TESTO));
    expect(r.file[0].scenari[0].esiti).toEqual([]);
  });

  it('conta i casi solo descritti, anche in file senza scenari eseguibili', async () => {
    fs.writeFileSync(path.join(RADICE, 'src', 'features', 'shop', 'doc.feature'), '@non-automatizzato\nFeature: D\n  Scenario: x\n  Scenario: y\n');
    expect((await leggi()).soloDescritti).toBe(2);
  });

  it('uno scenario con una voce valida ha aggiornato: true; dopo aver cambiato il file, false', async () => {
    registraEsiti(percorsoIndice(RADICE), [voce()], path.join(RADICE, 'src', 'features'));
    const prima = await leggi();
    expect(prima.file[0].scenari[0].esiti[0]).toMatchObject({ esito: 'fallito', aggiornato: true, ambiente: 'staging' });

    fs.writeFileSync(path.join(RADICE, 'src', 'features', FILE), TESTO.replace('completa', 'conclude'));
    const dopo = await leggi();
    expect(dopo.file[0].scenari[0].esiti).toEqual([]); // il titolo e' cambiato: un altro scenario
    fs.writeFileSync(path.join(RADICE, 'src', 'features', FILE), TESTO + '    And b\n');
    const modificato = await leggi();
    expect(modificato.file[0].scenari[0].esiti[0].aggiornato).toBe(false);
  });

  it('con l\'indice illeggibile esiti e\' "illeggibile" e tutti gli esiti sono vuoti', async () => {
    fs.writeFileSync(percorsoIndice(RADICE), '{ corrotto');
    const r = await leggi();
    expect(r.esiti).toBe('illeggibile');
    expect(r.file[0].scenari[0].esiti).toEqual([]);
    // La lettura non tocca il file.
    expect(fs.readFileSync(percorsoIndice(RADICE), 'utf-8')).toBe('{ corrotto');
  });

  it('nessun esito contiene schermate o messaggi grezzi', async () => {
    registraEsiti(percorsoIndice(RADICE), [voce()], path.join(RADICE, 'src', 'features'));
    const testo = JSON.stringify(await leggi());
    expect(testo).not.toContain('data:image');
    expect(testo).not.toContain('"messaggio"');
    expect(testo).not.toContain('"schermata"');
  });

  it('al primo avvio ricostruisce dai .ndjson gia\' fatti, con ambiente sconosciuto (O6)', async () => {
    const ts = (ms: number) => ({ seconds: Math.floor(ms / 1000), nanos: 0 });
    const uri = `src/features/${FILE}`;
    const m = [
      { source: { uri, data: TESTO } },
      { gherkinDocument: { uri, feature: { children: [{ scenario: { id: 's', name: "Il cliente completa l'ordine" } }] } } },
      { pickle: { id: 'p', uri, name: 'x', astNodeIds: ['s'], steps: [{ id: 'ps', text: 'a' }] } },
      { testCase: { id: 'tc', pickleId: 'p', testSteps: [{ id: 'ts', pickleStepId: 'ps' }] } },
      { testCaseStarted: { id: 'tcs', testCaseId: 'tc', timestamp: ts(1_700_000_000_000) } },
      { testStepFinished: { testCaseStartedId: 'tcs', testStepId: 'ts', testStepResult: { status: 'PASSED' }, timestamp: ts(1_700_000_000_500) } },
      { testCaseFinished: { testCaseStartedId: 'tcs', willBeRetried: false, timestamp: ts(1_700_000_001_000) } },
    ];
    fs.writeFileSync(path.join(RADICE, 'reports', 'cruscotto', 'test-vecchia.ndjson'), m.map((x) => JSON.stringify(x)).join('\n') + '\n');
    const r = await leggi();
    expect(r.file[0].scenari[0].esiti).toEqual([
      expect.objectContaining({ esito: 'passato', ambiente: null, aggiornato: true, esecuzione: 'test-vecchia' }),
    ]);
    expect(fs.existsSync(percorsoIndice(RADICE))).toBe(true);
  });
});
