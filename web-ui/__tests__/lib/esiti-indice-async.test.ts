import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { assicuraIndice, assicuraIndiceAsync, leggiEsiti } from '@/lib/esiti-scenari';

const URI = 'src/features/shop/order/ordine.feature';
const FEATURE = 'Feature: Ordine\n\n  Scenario: Il cliente completa l\'ordine\n    Given x\n';

let tmp: string | null = null;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

function radice(): { indice: string; messaggi: string; features: string } {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'indice-async-'));
  const features = path.join(tmp, 'src', 'features');
  fs.mkdirSync(path.join(features, 'shop', 'order'), { recursive: true });
  fs.writeFileSync(path.join(features, 'shop', 'order', 'ordine.feature'), FEATURE);
  const messaggi = path.join(tmp, 'reports', 'cruscotto');
  fs.mkdirSync(messaggi, { recursive: true });
  return { indice: path.join(tmp, 'reports', 'esiti-scenari.json'), messaggi, features };
}

function prova(esito: 'PASSED' | 'FAILED', fineMs: number): string {
  const ts = (ms: number) => ({ seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1e6 });
  const m = [
    { source: { uri: URI, data: FEATURE, mediaType: 'text/x.cucumber.gherkin+plain' } },
    { gherkinDocument: { uri: URI, feature: { children: [{ scenario: { id: '1', name: 'Il cliente completa l\'ordine' } }] } } },
    { pickle: { id: 'p', uri: URI, name: 'Il cliente completa l\'ordine', astNodeIds: ['1'], steps: [{ id: 'ps', text: 'x' }] } },
    { testCase: { id: 'tc', pickleId: 'p', testSteps: [{ id: 'ts', pickleStepId: 'ps' }] } },
    { testCaseStarted: { id: 'tcs', testCaseId: 'tc', timestamp: ts(fineMs - 500) } },
    { testStepFinished: { testCaseStartedId: 'tcs', testStepId: 'ts', testStepResult: { status: esito, ...(esito === 'FAILED' ? { message: 'boom' } : {}) }, timestamp: ts(fineMs - 100) } },
    { testCaseFinished: { testCaseStartedId: 'tcs', willBeRetried: false, timestamp: ts(fineMs) } },
  ];
  return m.map((x) => JSON.stringify(x)).join('\n') + '\n';
}

describe('assicuraIndiceAsync: la stessa ricostruzione, senza fermare il server', () => {
  it('da\' lo stesso indice di quella sincrona', async () => {
    const r = radice();
    fs.writeFileSync(path.join(r.messaggi, 'test-aaa.ndjson'), prova('PASSED', Date.parse('2026-09-28T10:00:00Z')));
    fs.writeFileSync(path.join(r.messaggi, 'test-bbb.ndjson'), prova('FAILED', Date.parse('2026-09-29T10:00:00Z')));
    assicuraIndice(r.indice, r.messaggi, r.features);
    const sincrono = leggiEsiti(r.indice);
    fs.rmSync(r.indice);
    await assicuraIndiceAsync(r.indice, r.messaggi, r.features);
    expect(leggiEsiti(r.indice)).toEqual(sincrono);
    expect(sincrono.voci).toHaveLength(1);
  });

  it('non tocca un indice che c\'e\' gia\', anche corrotto', async () => {
    const r = radice();
    fs.writeFileSync(r.indice, 'corrotto');
    fs.writeFileSync(path.join(r.messaggi, 'test-aaa.ndjson'), prova('PASSED', Date.parse('2026-09-28T10:00:00Z')));
    await assicuraIndiceAsync(r.indice, r.messaggi, r.features);
    expect(fs.readFileSync(r.indice, 'utf-8')).toBe('corrotto');
  });

  it('salta i file rotti e una cartella che non c\'e\', senza lanciare', async () => {
    const r = radice();
    fs.writeFileSync(path.join(r.messaggi, 'test-buono.ndjson'), prova('PASSED', Date.parse('2026-09-28T10:00:00Z')));
    fs.writeFileSync(path.join(r.messaggi, 'test-rotto.ndjson'), 'non e\' JSON\n\u0000');
    fs.writeFileSync(path.join(r.messaggi, 'test-vuoto.ndjson'), '');
    await expect(assicuraIndiceAsync(r.indice, r.messaggi, r.features)).resolves.toBeUndefined();
    expect(leggiEsiti(r.indice).voci).toHaveLength(1);
    fs.rmSync(r.indice);
    fs.rmSync(r.messaggi, { recursive: true });
    await expect(assicuraIndiceAsync(r.indice, r.messaggi, r.features)).resolves.toBeUndefined();
    expect(leggiEsiti(r.indice)).toEqual({ stato: 'ok', voci: [] });
  });

  it('rispetta l\'elenco dei file da escludere', async () => {
    const r = radice();
    fs.writeFileSync(path.join(r.messaggi, 'test-aaa.ndjson'), prova('PASSED', Date.parse('2026-09-28T10:00:00Z')));
    await assicuraIndiceAsync(r.indice, r.messaggi, r.features, ['test-aaa.ndjson']);
    expect(leggiEsiti(r.indice).voci).toEqual([]);
  });

  it('mentre ricostruisce, il server riesce a fare altro (il turno torna fra un file e l\'altro)', async () => {
    const r = radice();
    for (let i = 0; i < 60; i++) {
      fs.writeFileSync(path.join(r.messaggi, `test-${String(i).padStart(8, '0')}.ndjson`), prova('PASSED', Date.parse('2026-09-28T10:00:00Z') + i * 1000));
    }
    let giri = 0;
    const timer = setInterval(() => giri++, 1);
    await assicuraIndiceAsync(r.indice, r.messaggi, r.features);
    clearInterval(timer);
    expect(giri).toBeGreaterThan(5);
    expect(leggiEsiti(r.indice).voci).toHaveLength(1);
  });

  it('due chiamate insieme fanno una sola ricostruzione', async () => {
    const r = radice();
    fs.writeFileSync(path.join(r.messaggi, 'test-aaa.ndjson'), prova('PASSED', Date.parse('2026-09-28T10:00:00Z')));
    const a = assicuraIndiceAsync(r.indice, r.messaggi, r.features);
    const b = assicuraIndiceAsync(r.indice, r.messaggi, r.features);
    expect(a).toBe(b);
    await Promise.all([a, b]);
    expect(leggiEsiti(r.indice).voci).toHaveLength(1);
  });
});
