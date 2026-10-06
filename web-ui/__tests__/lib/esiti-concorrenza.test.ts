import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { leggiEsiti, registraEsitiDiUnaProva, assicuraIndiceAsync } from '@/lib/esiti-scenari';

/**
 * Due corsie che finiscono insieme scrivono entrambe l'indice degli esiti
 * (`reports/esiti-scenari.json`). Il dubbio che questo caso verifica: la
 * scrittura e' atomica, e due fusioni non si perdono a vicenda?
 */

let tmp: string | null = null;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

const FEATURE_A = 'Feature: Ordini\n  Scenario: Il cliente completa l\'ordine\n    Given a\n';
const FEATURE_B = 'Feature: Account\n  Scenario: Il cliente cambia la password\n    Given b\n';
const URI_A = 'src/features/shop/order/ordine.feature';
const URI_B = 'src/features/shop/account/password.feature';

function radice(): { dir: string; indice: string; features: string; messaggi: string } {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'esiti-conc-'));
  const features = path.join(tmp, 'src', 'features');
  fs.mkdirSync(path.join(features, 'shop', 'order'), { recursive: true });
  fs.mkdirSync(path.join(features, 'shop', 'account'), { recursive: true });
  fs.writeFileSync(path.join(features, 'shop', 'order', 'ordine.feature'), FEATURE_A);
  fs.writeFileSync(path.join(features, 'shop', 'account', 'password.feature'), FEATURE_B);
  const messaggi = path.join(tmp, 'reports', 'cruscotto');
  fs.mkdirSync(messaggi, { recursive: true });
  return {
    dir: tmp,
    indice: path.join(tmp, 'reports', 'esiti-scenari.json'),
    features,
    messaggi,
  };
}

/** Un esito minimo di Cucumber: lo stesso formato che scrive l'esecuzione. */
function messaggiProva(uri: string, testo: string, nome: string, stato: string, fineMs: number): string {
  const ts = (ms: number) => ({ seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1e6 });
  const m = [
    { source: { uri, data: testo } },
    { gherkinDocument: { uri, feature: { children: [{ scenario: { id: 'sc', name: nome } }] } } },
    { pickle: { id: 'p', uri, name: nome, astNodeIds: ['sc'], steps: [{ id: 'ps', text: 'a' }] } },
    { testCase: { id: 'tc', pickleId: 'p', testSteps: [{ id: 'ts', pickleStepId: 'ps' }] } },
    { testCaseStarted: { id: 'tcs', testCaseId: 'tc', timestamp: ts(fineMs - 500) } },
    { testStepFinished: { testCaseStartedId: 'tcs', testStepId: 'ts', testStepResult: { status: stato, ...(stato === 'FAILED' ? { message: 'boom' } : {}) }, timestamp: ts(fineMs - 100) } },
    { testCaseFinished: { testCaseStartedId: 'tcs', willBeRetried: false, timestamp: ts(fineMs) } },
  ];
  return m.map((x) => JSON.stringify(x)).join('\n') + '\n';
}

describe('due corsie che finiscono insieme non si perdono gli esiti a vicenda', () => {
  it('due prove registrate una dopo l\'altra, senza attesa: entrambe restano nell\'indice', () => {
    const r = radice();
    const ora = Date.parse('2026-10-06T10:00:00Z');
    fs.writeFileSync(path.join(r.messaggi, 'test-corsia1.ndjson'), messaggiProva(URI_A, FEATURE_A, 'Il cliente completa l\'ordine', 'PASSED', ora));
    fs.writeFileSync(path.join(r.messaggi, 'test-corsia2.ndjson'), messaggiProva(URI_B, FEATURE_B, 'Il cliente cambia la password', 'FAILED', ora + 1000));

    // Stesso tick, come se due processi finissero nello stesso istante: il server
    // esegue questi due callback uno dopo l'altro, senza cedere il turno.
    // La corsia 2 e' ancora in corso quando la 1 finisce: il suo file parziale non
    // deve entrare nella ricostruzione (se l'indice mancasse), altrimenti la 2
    // comparirebbe due volte, una con ambiente sconosciuto.
    registraEsitiDiUnaProva(
      { id: 'test-corsia1', ambiente: 'demo', messaggi: 'reports/cruscotto/test-corsia1.ndjson', altriInCorso: ['test-corsia2.ndjson'] },
      r.dir
    );
    registraEsitiDiUnaProva({ id: 'test-corsia2', ambiente: 'demo', messaggi: 'reports/cruscotto/test-corsia2.ndjson' }, r.dir);

    const { voci } = leggiEsiti(r.indice);
    expect(voci.map((v) => [v.file, v.esito, v.esecuzione]).sort()).toEqual(
      [
        [URI_A.replace('src/features/', ''), 'passato', 'test-corsia1'],
        [URI_B.replace('src/features/', ''), 'fallito', 'test-corsia2'],
      ].sort()
    );
  });

  it('non lascia file temporanei dietro la scrittura atomica', () => {
    const r = radice();
    const ora = Date.parse('2026-10-06T10:00:00Z');
    fs.writeFileSync(path.join(r.messaggi, 'test-corsia1.ndjson'), messaggiProva(URI_A, FEATURE_A, 'Il cliente completa l\'ordine', 'PASSED', ora));
    registraEsitiDiUnaProva({ id: 'test-corsia1', ambiente: 'demo', messaggi: 'reports/cruscotto/test-corsia1.ndjson' }, r.dir);
    expect(fs.readdirSync(path.join(r.dir, 'reports')).filter((n) => n.includes('.tmp-'))).toEqual([]);
  });

  it('una ricostruzione lenta (asincrona) non cancella la prova che finisce nel frattempo', async () => {
    // Il caso che puo' davvero intrecciarsi: la ricostruzione dell'indice legge i
    // file con `await`, e in quell'intervallo una corsia finisce e scrive. La
    // ricostruzione deve riconoscere l'indice gia' scritto e non sovrascriverlo.
    const r = radice();
    const ora = Date.parse('2026-10-06T10:00:00Z');
    fs.writeFileSync(path.join(r.messaggi, 'test-vecchia.ndjson'), messaggiProva(URI_A, FEATURE_A, 'Il cliente completa l\'ordine', 'FAILED', ora - 86400000));
    fs.writeFileSync(path.join(r.messaggi, 'test-corsia2.ndjson'), messaggiProva(URI_B, FEATURE_B, 'Il cliente cambia la password', 'PASSED', ora));

    const ricostruzione = assicuraIndiceAsync(r.indice, r.messaggi, r.features);
    registraEsitiDiUnaProva({ id: 'test-corsia2', ambiente: 'demo', messaggi: 'reports/cruscotto/test-corsia2.ndjson' }, r.dir);
    await ricostruzione;

    const { voci } = leggiEsiti(r.indice);
    const esecuzioni = voci.map((v) => v.esecuzione).sort();
    expect(esecuzioni).toEqual(['test-corsia2', 'test-vecchia'].sort());
    expect(voci.find((v) => v.esecuzione === 'test-corsia2')?.ambiente).toBe('demo');
  });
});
