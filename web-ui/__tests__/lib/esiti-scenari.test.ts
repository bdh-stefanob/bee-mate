import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  leggiEsiti,
  registraEsiti,
  fondiEsiti,
  assicuraIndice,
  unisciEsiti,
  registraEsitiDiUnaProva,
} from '@/lib/esiti-scenari';
import type { VoceEsito } from '@/lib/esiti-da-messaggi';
import type { FileScenari } from '@/lib/scenari';

let tmp: string | null = null;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

/** Una radice con `src/features` (i .feature che esistono) e `reports/`. */
function radice(features: Record<string, string> = {}): { indice: string; features: string; messaggi: string; dir: string } {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'esiti-'));
  const featuresDir = path.join(tmp, 'src', 'features');
  fs.mkdirSync(featuresDir, { recursive: true });
  for (const [rel, testo] of Object.entries(features)) {
    fs.mkdirSync(path.dirname(path.join(featuresDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(featuresDir, rel), testo);
  }
  const messaggi = path.join(tmp, 'reports', 'cruscotto');
  fs.mkdirSync(messaggi, { recursive: true });
  return { indice: path.join(tmp, 'reports', 'esiti-scenari.json'), features: featuresDir, messaggi, dir: tmp };
}

function voce(extra: Partial<VoceEsito> = {}): VoceEsito {
  return {
    file: 'shop/order/ordine.feature',
    nome: 'Il cliente completa l\'ordine',
    esito: 'passato',
    quando: '2026-09-30T10:00:00.000Z',
    durataMs: 1000,
    ambiente: 'staging',
    esecuzione: 'test-a',
    impronta: 'aaaa',
    ...extra,
  };
}

const FEATURE = 'Feature: Ordini\n  Scenario: Il cliente completa l\'ordine\n    Given a\n';

describe('leggiEsiti', () => {
  it('senza file risponde "nessun esito", non un errore', () => {
    const r = radice();
    expect(leggiEsiti(r.indice)).toEqual({ stato: 'ok', voci: [] });
  });

  it('un file corrotto risponde illeggibile, e la lettura non lo modifica', () => {
    const r = radice();
    fs.writeFileSync(r.indice, '{ non e\' json');
    expect(leggiEsiti(r.indice)).toEqual({ stato: 'illeggibile', voci: [] });
    expect(fs.readFileSync(r.indice, 'utf-8')).toBe('{ non e\' json');
  });

  it('un file con un\'altra forma e\' illeggibile, non un indice vuoto', () => {
    const r = radice();
    fs.writeFileSync(r.indice, JSON.stringify({ versione: 99, voci: [] }));
    expect(leggiEsiti(r.indice).stato).toBe('illeggibile');
    fs.writeFileSync(r.indice, JSON.stringify({ versione: 1, voci: 'no' }));
    expect(leggiEsiti(r.indice).stato).toBe('illeggibile');
  });

  it('una voce malformata dentro un indice buono si salta, le altre si leggono', () => {
    const r = radice();
    fs.writeFileSync(r.indice, JSON.stringify({ versione: 1, voci: [voce(), { file: 5 }, null] }));
    const l = leggiEsiti(r.indice);
    expect(l.stato).toBe('ok');
    expect(l.voci).toHaveLength(1);
  });
});

describe('fondiEsiti (puro)', () => {
  it('un esito nuovo sostituisce quello dello stesso scenario e ambiente, e lascia gli altri', () => {
    const vecchie = [voce(), voce({ nome: 'Un altro' })];
    const r = fondiEsiti(vecchie, [voce({ esito: 'fallito', quando: '2026-09-30T11:00:00.000Z' })]);
    expect(r).toHaveLength(2);
    expect(r.find((v) => v.nome === 'Un altro')?.esito).toBe('passato');
    expect(r.find((v) => v.nome !== 'Un altro')?.esito).toBe('fallito');
  });

  it('un esito con quando piu\' vecchio non sostituisce uno piu\' recente', () => {
    const r = fondiEsiti([voce({ quando: '2026-09-30T12:00:00.000Z' })], [voce({ esito: 'fallito', quando: '2026-09-30T09:00:00.000Z' })]);
    expect(r).toHaveLength(1);
    expect(r[0].esito).toBe('passato');
  });

  it('lo stesso scenario su due ambienti: due voci, e un esito nuovo su uno non tocca l\'altro', () => {
    const r = fondiEsiti(
      [voce({ ambiente: 'staging' }), voce({ ambiente: 'produzione' })],
      [voce({ ambiente: 'staging', esito: 'fallito', quando: '2026-09-30T11:00:00.000Z' })]
    );
    expect(r).toHaveLength(2);
    expect(r.find((v) => v.ambiente === 'staging')?.esito).toBe('fallito');
    expect(r.find((v) => v.ambiente === 'produzione')?.esito).toBe('passato');
  });

  it('un ambiente sconosciuto (null) e\' una chiave a se\': non sostituisce un ambiente vero', () => {
    const r = fondiEsiti([voce({ ambiente: 'staging' })], [voce({ ambiente: null, quando: '2026-10-01T00:00:00.000Z' })]);
    expect(r).toHaveLength(2);
  });
});

describe('registraEsiti', () => {
  it('scrive un indice leggibile, e dopo la scrittura non resta un file temporaneo', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    registraEsiti(r.indice, [voce()], r.features);
    expect(leggiEsiti(r.indice).voci).toHaveLength(1);
    const rimasti = fs.readdirSync(path.dirname(r.indice)).filter((f) => f.includes('tmp'));
    expect(rimasti).toEqual([]);
  });

  it('scrivendo dopo un file corrotto, quello vecchio viene conservato come .illeggibile e il nuovo e\' valido', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    fs.writeFileSync(r.indice, 'corrotto');
    registraEsiti(r.indice, [voce()], r.features);
    expect(fs.readFileSync(`${r.indice}.illeggibile`, 'utf-8')).toBe('corrotto');
    expect(leggiEsiti(r.indice).stato).toBe('ok');
    expect(leggiEsiti(r.indice).voci).toHaveLength(1);
  });

  it('le voci di un file che non esiste piu\' si scartano alla scrittura', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    registraEsiti(r.indice, [voce({ file: 'shop/order/sparito.feature' }), voce()], r.features);
    expect(leggiEsiti(r.indice).voci.map((v) => v.file)).toEqual(['shop/order/ordine.feature']);
  });

  it('un esito nuovo si fonde con quelli gia\' scritti', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    registraEsiti(r.indice, [voce({ ambiente: 'staging' })], r.features);
    registraEsiti(r.indice, [voce({ ambiente: 'produzione', esito: 'fallito' })], r.features);
    expect(leggiEsiti(r.indice).voci.map((v) => v.ambiente).sort()).toEqual(['produzione', 'staging']);
  });

  it('se la cartella reports non c\'e\', la crea', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    fs.rmSync(path.dirname(r.indice), { recursive: true, force: true });
    registraEsiti(r.indice, [voce()], r.features);
    expect(leggiEsiti(r.indice).voci).toHaveLength(1);
  });
});

describe('unisciEsiti (puro)', () => {
  const elenco = (impronta: string, nome = 'Il cliente completa l\'ordine'): FileScenari[] => [
    {
      file: 'shop/order/ordine.feature',
      nome: 'Ordini',
      generato: false,
      nonAutomatizzati: 0,
      impronta,
      scenari: [{ nome, riga: 2 }],
    },
  ];

  it('aggiornato e\' vero solo se l\'impronta coincide', () => {
    const uguale = unisciEsiti(elenco('aaaa'), [voce({ impronta: 'aaaa' })]);
    expect(uguale[0].scenari[0].esiti[0].aggiornato).toBe(true);
    const diverso = unisciEsiti(elenco('bbbb'), [voce({ impronta: 'aaaa' })]);
    expect(diverso[0].scenari[0].esiti[0].aggiornato).toBe(false);
  });

  it('una voce senza impronta non e\' mai aggiornata: un verde non si da\' per buono', () => {
    const r = unisciEsiti(elenco('aaaa'), [voce({ impronta: '' })]);
    expect(r[0].scenari[0].esiti[0].aggiornato).toBe(false);
  });

  it('uno scenario rinominato risulta senza esiti, e una voce orfana non compare', () => {
    const r = unisciEsiti(elenco('aaaa', 'Un titolo nuovo'), [voce()]);
    expect(r[0].scenari[0].esiti).toEqual([]);
    expect(JSON.stringify(r)).not.toContain('test-a');
  });

  it('un file spostato risulta senza esiti', () => {
    const r = unisciEsiti(elenco('aaaa'), [voce({ file: 'shop/order/vecchio-posto.feature' })]);
    expect(r[0].scenari[0].esiti).toEqual([]);
  });

  it('gli esiti di piu\' ambienti si portano tutti, il piu\' recente per primo', () => {
    const r = unisciEsiti(elenco('aaaa'), [
      voce({ ambiente: 'produzione', quando: '2026-09-29T10:00:00.000Z' }),
      voce({ ambiente: 'staging', quando: '2026-09-30T10:00:00.000Z' }),
    ]);
    expect(r[0].scenari[0].esiti.map((e) => e.ambiente)).toEqual(['staging', 'produzione']);
  });

  it('un esito non porta schermate ne\' messaggi grezzi', () => {
    const r = unisciEsiti(elenco('aaaa'), [
      voce({
        esito: 'fallito',
        passoFallito: { numero: 1, totale: 2, testo: 'x', motivo: 'errore', riepilogo: { primaRiga: 'boom' } },
      }),
    ]);
    const json = JSON.stringify(r);
    expect(json).not.toContain('data:image');
    expect(Object.keys(r[0].scenari[0].esiti[0]).sort()).toEqual(
      ['aggiornato', 'ambiente', 'durataMs', 'esecuzione', 'esito', 'passoFallito', 'quando'].sort()
    );
  });
});

/** Un esito minimo di Cucumber per una sola prova: lo stesso formato che scrive l'esecuzione. */
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

describe('assicuraIndice: la ricostruzione dai .ndjson, una volta sola (O6)', () => {
  const URI = 'src/features/shop/order/ordine.feature';

  it('al primo avvio ricostruisce dalle esecuzioni gia\' fatte, con ambiente sconosciuto', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    fs.writeFileSync(path.join(r.messaggi, 'test-aaa.ndjson'), messaggiProva(URI, FEATURE, 'Il cliente completa l\'ordine', 'PASSED', Date.parse('2026-09-28T10:00:00Z')));
    fs.writeFileSync(path.join(r.messaggi, 'test-bbb.ndjson'), messaggiProva(URI, FEATURE, 'Il cliente completa l\'ordine', 'FAILED', Date.parse('2026-09-29T10:00:00Z')));
    assicuraIndice(r.indice, r.messaggi, r.features);
    const { voci } = leggiEsiti(r.indice);
    expect(voci).toHaveLength(1);
    expect(voci[0]).toMatchObject({ esito: 'fallito', ambiente: null, esecuzione: 'test-bbb', file: 'shop/order/ordine.feature' });
  });

  it('si fa una volta sola: dopo, anche con zero voci, il file esiste e non si rilegge niente', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    assicuraIndice(r.indice, r.messaggi, r.features);
    expect(fs.existsSync(r.indice)).toBe(true);
    expect(leggiEsiti(r.indice).voci).toEqual([]);
    // Arriva un .ndjson dopo: non entra, la ricostruzione e' gia' avvenuta.
    fs.writeFileSync(path.join(r.messaggi, 'test-ccc.ndjson'), messaggiProva(URI, FEATURE, 'Il cliente completa l\'ordine', 'PASSED', Date.parse('2026-09-28T10:00:00Z')));
    assicuraIndice(r.indice, r.messaggi, r.features);
    expect(leggiEsiti(r.indice).voci).toEqual([]);
  });

  it('salta senza errore file troncati, non JSON, vuoti e scenari il cui file non c\'e\' piu\'', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    const buono = messaggiProva(URI, FEATURE, 'Il cliente completa l\'ordine', 'PASSED', Date.parse('2026-09-28T10:00:00Z'));
    fs.writeFileSync(path.join(r.messaggi, 'test-buono.ndjson'), buono);
    fs.writeFileSync(path.join(r.messaggi, 'test-troncato.ndjson'), buono.split('\n').slice(0, 5).join('\n') + '\n{"testStepFi');
    fs.writeFileSync(path.join(r.messaggi, 'test-rotto.ndjson'), 'non e\' JSON per niente\n\u0000\u0000');
    fs.writeFileSync(path.join(r.messaggi, 'test-vuoto.ndjson'), '');
    fs.writeFileSync(
      path.join(r.messaggi, 'test-spostato.ndjson'),
      messaggiProva('src/features/shop/order/non-c-e-piu.feature', FEATURE, 'Uno scenario sparito', 'FAILED', Date.parse('2026-09-28T11:00:00Z'))
    );
    fs.writeFileSync(path.join(r.messaggi, 'altro-file.json'), '{}');
    expect(() => assicuraIndice(r.indice, r.messaggi, r.features)).not.toThrow();
    const { voci } = leggiEsiti(r.indice);
    expect(voci.map((v) => v.nome)).toEqual(['Il cliente completa l\'ordine']);
  });

  it('una cartella dei messaggi che non c\'e\' non e\' un errore', () => {
    const r = radice();
    fs.rmSync(r.messaggi, { recursive: true, force: true });
    expect(() => assicuraIndice(r.indice, r.messaggi, r.features)).not.toThrow();
    expect(leggiEsiti(r.indice)).toEqual({ stato: 'ok', voci: [] });
  });

  it('non tocca un indice che c\'e\' gia\'', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    registraEsiti(r.indice, [voce({ nome: 'Gia\' qui' })], r.features);
    const prima = fs.readFileSync(r.indice, 'utf-8');
    fs.writeFileSync(path.join(r.messaggi, 'test-aaa.ndjson'), messaggiProva(URI, FEATURE, 'Il cliente completa l\'ordine', 'PASSED', Date.parse('2026-09-28T10:00:00Z')));
    assicuraIndice(r.indice, r.messaggi, r.features);
    expect(fs.readFileSync(r.indice, 'utf-8')).toBe(prima);
  });

  it('la prova che si registra con l\'indice ancora assente porta il suo ambiente, senza un doppione sconosciuto', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    const ora = Date.parse('2026-09-30T10:00:00Z');
    fs.writeFileSync(path.join(r.messaggi, 'test-vecchia.ndjson'), messaggiProva(URI, FEATURE, 'Il cliente completa l\'ordine', 'FAILED', ora - 86400000));
    fs.writeFileSync(path.join(r.messaggi, 'test-nuova.ndjson'), messaggiProva(URI, FEATURE, 'Il cliente completa l\'ordine', 'PASSED', ora));
    registraEsitiDiUnaProva({ id: 'test-nuova', ambiente: 'staging', messaggi: 'reports/cruscotto/test-nuova.ndjson' }, r.dir);
    const { voci } = leggiEsiti(r.indice);
    expect(voci.map((v) => [v.ambiente, v.esito, v.esecuzione]).sort()).toEqual([
      [null, 'fallito', 'test-vecchia'],
      ['staging', 'passato', 'test-nuova'],
    ]);
  });

  it('con un indice corrotto non ricostruisce e non lo tocca: dice illeggibile', () => {
    const r = radice({ 'shop/order/ordine.feature': FEATURE });
    fs.writeFileSync(r.indice, 'corrotto');
    assicuraIndice(r.indice, r.messaggi, r.features);
    expect(fs.readFileSync(r.indice, 'utf-8')).toBe('corrotto');
    expect(leggiEsiti(r.indice).stato).toBe('illeggibile');
  });
});
