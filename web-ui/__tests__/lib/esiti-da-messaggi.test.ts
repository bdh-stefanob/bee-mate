import { describe, it, expect } from 'vitest';
import { estraiVoci } from '@/lib/esiti-da-messaggi';
import { improntaDiTesto } from '@/lib/impronta-scenario';

/**
 * Le fixture sono messaggi Cucumber minimi costruiti qui, con `shop`/`order`.
 * Il formato e' quello vero: source, gherkinDocument, pickle, testCase,
 * testCaseStarted, testStepFinished, testCaseFinished, testRunFinished.
 */
let contatore = 0;
const nuovoId = (prefisso: string) => `${prefisso}-${++contatore}`;
const ts = (ms: number) => ({ seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1_000_000 });
const T0 = Date.parse('2026-09-30T14:36:40.000Z');

interface PassoSpec {
  testo: string;
  stato: string;
  messaggio?: string;
}
interface CasoSpec {
  uri: string;
  /** Il nome nella definizione (gherkinDocument). */
  definizione: string;
  /** Il nome del pickle: per uno Scenario Outline ha i segnaposto sostituiti. */
  nomePickle?: string;
  passi: PassoSpec[];
  inizio?: number;
  fine?: number;
  finito?: boolean;
  seRipete?: boolean;
  idDefinizione?: string;
}

const righe = (...messaggi: object[]) => messaggi.map((m) => JSON.stringify(m)).join('\n') + '\n';

function sorgente(uri: string, testo: string, scenari: Array<{ id: string; nome: string; inRule?: boolean }>) {
  const diretti = scenari.filter((s) => !s.inRule).map((s) => ({ scenario: { id: s.id, name: s.nome } }));
  const inRule = scenari.filter((s) => s.inRule);
  const figli: object[] = [...diretti];
  if (inRule.length) figli.push({ rule: { name: 'una regola', children: inRule.map((s) => ({ scenario: { id: s.id, name: s.nome } })) } });
  return [
    { source: { uri, data: testo, mediaType: 'text/x.cucumber.gherkin+plain' } },
    { gherkinDocument: { uri, feature: { name: 'Ordini', children: [{ background: { id: 'bg' } }, ...figli] } } },
  ];
}

function caso(c: CasoSpec): object[] {
  const pickleId = nuovoId('pickle');
  const pickleSteps = c.passi.map((p) => ({ id: nuovoId('ps'), text: p.testo }));
  const tcId = nuovoId('tc');
  const tcsId = nuovoId('tcs');
  const testSteps = pickleSteps.map((ps) => ({ id: nuovoId('ts'), pickleStepId: ps.id }));
  const inizio = c.inizio ?? T0;
  const fine = c.fine ?? inizio + 1500;
  const out: object[] = [
    { pickle: { id: pickleId, uri: c.uri, name: c.nomePickle ?? c.definizione, astNodeIds: [c.idDefinizione ?? 'MANCANTE'], steps: pickleSteps } },
    { testCase: { id: tcId, pickleId, testSteps } },
    { testCaseStarted: { id: tcsId, testCaseId: tcId, attempt: 0, timestamp: ts(inizio) } },
  ];
  c.passi.forEach((p, i) => {
    out.push({
      testStepFinished: {
        testCaseStartedId: tcsId,
        testStepId: testSteps[i].id,
        testStepResult: { status: p.stato, duration: ts(100), ...(p.messaggio ? { message: p.messaggio } : {}) },
        timestamp: ts(inizio + (i + 1) * 100),
      },
    });
  });
  if (c.finito !== false) {
    out.push({ testCaseFinished: { testCaseStartedId: tcsId, willBeRetried: c.seRipete ?? false, timestamp: ts(fine) } });
  }
  return out;
}

const OPZIONI = { ambiente: 'staging', esecuzione: 'test-abc123' };
const TESTO = 'Feature: Ordini\n  Scenario: Il cliente completa l\'ordine\n    Given a\n';
const URI = 'src/features/shop/order/completa-ordine.feature';

function semplice(passi: PassoSpec[], extra: Partial<CasoSpec> = {}): string {
  return righe(
    ...sorgente(URI, TESTO, [{ id: 'sc1', nome: "Il cliente completa l'ordine" }]),
    ...caso({ uri: URI, definizione: "Il cliente completa l'ordine", idDefinizione: 'sc1', passi, ...extra }),
    { testRunFinished: { success: passi.every((p) => p.stato === 'PASSED') } }
  );
}

describe('estraiVoci: dai messaggi di Cucumber a un esito per scenario', () => {
  it('uno scenario con tutti i passi superati e\' passato, con la durata da inizio a fine del caso', () => {
    const voci = estraiVoci(
      semplice([{ testo: 'a', stato: 'PASSED' }, { testo: 'b', stato: 'PASSED' }], { inizio: T0, fine: T0 + 4321 }),
      OPZIONI
    );
    expect(voci).toHaveLength(1);
    expect(voci[0]).toMatchObject({
      file: 'shop/order/completa-ordine.feature',
      nome: "Il cliente completa l'ordine",
      esito: 'passato',
      durataMs: 4321,
      quando: new Date(T0 + 4321).toISOString(),
      ambiente: 'staging',
      esecuzione: 'test-abc123',
    });
    expect(voci[0].passoFallito).toBeUndefined();
  });

  it('un passo fallito rende lo scenario fallito e dice quale: numero, totale, testo', () => {
    const voci = estraiVoci(
      semplice([
        { testo: 'a', stato: 'PASSED' },
        { testo: 'b', stato: 'PASSED' },
        { testo: 'il cliente aggiunge Maglia blu', stato: 'FAILED', messaggio: 'boom' },
        { testo: 'd', stato: 'SKIPPED' },
      ]),
      OPZIONI
    );
    expect(voci[0].esito).toBe('fallito');
    expect(voci[0].passoFallito).toMatchObject({
      numero: 3,
      totale: 4,
      testo: 'il cliente aggiunge Maglia blu',
      motivo: 'errore',
    });
    expect(voci[0].passoFallito?.riepilogo?.primaRiga).toBe('boom');
  });

  it('uno scenario verde in un\'esecuzione con testRunFinished.success false resta passato', () => {
    // L'altro scenario dell'esecuzione e' rosso: guardare il successo globale
    // darebbe un falso rosso al primo.
    const uriB = 'src/features/shop/order/altro.feature';
    const testo = righe(
      ...sorgente(URI, TESTO, [{ id: 'sc1', nome: "Il cliente completa l'ordine" }]),
      ...sorgente(uriB, 'x', [{ id: 'sc2', nome: 'Un altro' }]),
      ...caso({ uri: URI, definizione: "Il cliente completa l'ordine", idDefinizione: 'sc1', passi: [{ testo: 'a', stato: 'PASSED' }] }),
      ...caso({ uri: uriB, definizione: 'Un altro', idDefinizione: 'sc2', passi: [{ testo: 'b', stato: 'FAILED', messaggio: 'x' }] }),
      { testRunFinished: { success: false } }
    );
    const voci = estraiVoci(testo, OPZIONI);
    const verde = voci.find((v) => v.nome === "Il cliente completa l'ordine");
    const rosso = voci.find((v) => v.nome === 'Un altro');
    expect(verde?.esito).toBe('passato');
    expect(rosso?.esito).toBe('fallito');
  });

  it('un passo UNDEFINED, senza passi falliti, non e\' verde: fallito, non collegato', () => {
    const voci = estraiVoci(
      semplice([{ testo: 'a', stato: 'PASSED' }, { testo: 'un passo mai scritto', stato: 'UNDEFINED' }]),
      OPZIONI
    );
    expect(voci[0].esito).toBe('fallito');
    expect(voci[0].passoFallito).toMatchObject({ numero: 2, totale: 2, motivo: 'non-collegato', testo: 'un passo mai scritto' });
  });

  it('un passo PENDING, senza passi falliti, non e\' verde nemmeno lui', () => {
    const voci = estraiVoci(semplice([{ testo: 'a', stato: 'PENDING' }]), OPZIONI);
    expect(voci[0].esito).toBe('fallito');
    expect(voci[0].passoFallito?.motivo).toBe('non-collegato');
  });

  it('un passo AMBIGUO e\' un errore, non un passo non collegato', () => {
    const voci = estraiVoci(semplice([{ testo: 'a', stato: 'AMBIGUOUS', messaggio: 'due definizioni' }]), OPZIONI);
    expect(voci[0].passoFallito?.motivo).toBe('errore');
  });

  it('uno scenario i cui passi sono tutti saltati non e\' verde: non produce una voce', () => {
    const voci = estraiVoci(semplice([{ testo: 'a', stato: 'SKIPPED' }, { testo: 'b', stato: 'SKIPPED' }]), OPZIONI);
    expect(voci).toEqual([]);
  });

  it('piu\' scenari nella stessa esecuzione danno una voce ciascuno, e la chiave e\' file + titolo', () => {
    const testo = righe(
      ...sorgente(URI, TESTO, [{ id: 'a', nome: 'Primo' }, { id: 'b', nome: 'Secondo' }]),
      ...caso({ uri: URI, definizione: 'Primo', idDefinizione: 'a', passi: [{ testo: 'x', stato: 'PASSED' }] }),
      ...caso({ uri: URI, definizione: 'Secondo', idDefinizione: 'b', passi: [{ testo: 'y', stato: 'FAILED', messaggio: 'no' }] })
    );
    const voci = estraiVoci(testo, OPZIONI);
    expect(voci.map((v) => [v.file, v.nome, v.esito])).toEqual([
      ['shop/order/completa-ordine.feature', 'Primo', 'passato'],
      ['shop/order/completa-ordine.feature', 'Secondo', 'fallito'],
    ]);
  });

  it('i percorsi con barre rovesciate diventano barre in avanti, senza il prefisso src/features/', () => {
    const uriWin = 'src\\features\\shop\\order\\completa-ordine.feature';
    const testo = righe(
      ...sorgente(uriWin, TESTO, [{ id: 'sc1', nome: 'Titolo' }]),
      ...caso({ uri: uriWin, definizione: 'Titolo', idDefinizione: 'sc1', passi: [{ testo: 'a', stato: 'PASSED' }] })
    );
    expect(estraiVoci(testo, OPZIONI)[0].file).toBe('shop/order/completa-ordine.feature');
  });

  it('uno Scenario Outline con tre esempi, uno rosso: una sola voce, rossa, con il titolo non espanso', () => {
    const testo = righe(
      ...sorgente(URI, TESTO, [{ id: 'out', nome: 'Login <utente>' }]),
      ...caso({ uri: URI, definizione: 'Login <utente>', nomePickle: 'Login anna', idDefinizione: 'out', passi: [{ testo: 'a', stato: 'PASSED' }] }),
      ...caso({ uri: URI, definizione: 'Login <utente>', nomePickle: 'Login berto', idDefinizione: 'out', passi: [{ testo: 'a', stato: 'FAILED', messaggio: 'no' }] }),
      ...caso({ uri: URI, definizione: 'Login <utente>', nomePickle: 'Login carla', idDefinizione: 'out', passi: [{ testo: 'a', stato: 'PASSED' }] })
    );
    const voci = estraiVoci(testo, OPZIONI);
    expect(voci).toHaveLength(1);
    expect(voci[0].nome).toBe('Login <utente>');
    expect(voci[0].esito).toBe('fallito');
    expect(voci[0].passoFallito?.numero).toBe(1);
  });

  it('uno scenario dentro una Rule si trova', () => {
    const testo = righe(
      ...sorgente(URI, TESTO, [{ id: 'r1', nome: 'Dentro la regola', inRule: true }]),
      ...caso({ uri: URI, definizione: 'Dentro la regola', idDefinizione: 'r1', passi: [{ testo: 'a', stato: 'PASSED' }] })
    );
    expect(estraiVoci(testo, OPZIONI).map((v) => v.nome)).toEqual(['Dentro la regola']);
  });

  it('un caso senza testCaseFinished (messaggi tagliati a meta\') non produce nessuna voce', () => {
    const voci = estraiVoci(semplice([{ testo: 'a', stato: 'PASSED' }], { finito: false }), OPZIONI);
    expect(voci).toEqual([]);
  });

  it('un tentativo con willBeRetried true non conta: conta quello che segue', () => {
    const testo = righe(
      ...sorgente(URI, TESTO, [{ id: 'sc1', nome: 'Titolo' }]),
      ...caso({ uri: URI, definizione: 'Titolo', idDefinizione: 'sc1', passi: [{ testo: 'a', stato: 'FAILED', messaggio: 'prima volta' }], seRipete: true, inizio: T0, fine: T0 + 1000 }),
      ...caso({ uri: URI, definizione: 'Titolo', idDefinizione: 'sc1', passi: [{ testo: 'a', stato: 'PASSED' }], inizio: T0 + 2000, fine: T0 + 3000 })
    );
    const voci = estraiVoci(testo, OPZIONI);
    expect(voci).toHaveLength(1);
    expect(voci[0].esito).toBe('passato');
  });

  it('le righe che non sono JSON si saltano e il resto si legge', () => {
    const testo = 'questa non e\' una riga JSON\n' + semplice([{ testo: 'a', stato: 'PASSED' }]) + '{"troncata": \n';
    expect(estraiVoci(testo, OPZIONI)).toHaveLength(1);
  });

  it('un testo vuoto o senza messaggi non lancia: nessuna voce', () => {
    expect(estraiVoci('', OPZIONI)).toEqual([]);
    expect(estraiVoci('\n\n', OPZIONI)).toEqual([]);
  });

  it('l\'impronta e\' quella del source dei messaggi, uguale con fine riga CRLF e LF', () => {
    const lf = estraiVoci(semplice([{ testo: 'a', stato: 'PASSED' }]), OPZIONI)[0].impronta;
    expect(lf).toBe(improntaDiTesto(TESTO));
    const crlf = righe(
      ...sorgente(URI, TESTO.replace(/\n/g, '\r\n'), [{ id: 'sc1', nome: "Il cliente completa l'ordine" }]),
      ...caso({ uri: URI, definizione: "Il cliente completa l'ordine", idDefinizione: 'sc1', passi: [{ testo: 'a', stato: 'PASSED' }] })
    );
    expect(estraiVoci(crlf, OPZIONI)[0].impronta).toBe(lf);
  });

  it('l\'ambiente puo\' essere sconosciuto (null): non si inventa', () => {
    const voci = estraiVoci(semplice([{ testo: 'a', stato: 'PASSED' }]), { ambiente: null, esecuzione: 'test-x' });
    expect(voci[0].ambiente).toBeNull();
  });

  it('una voce non porta mai una schermata, il messaggio grezzo o i codici colore', () => {
    const grezzo = '\u001b[31mErrore\u001b[39m\nPagina attesa: Carrello (/carrello)\nIndirizzo ora: https://esempio.invalid/prodotti\n    at C:\\Users\\qualcuno\\src\\x.ts:1:1';
    const testo =
      semplice([{ testo: 'a', stato: 'FAILED', messaggio: grezzo }]).trimEnd() +
      '\n' +
      JSON.stringify({ attachment: { testCaseStartedId: 'x', mediaType: 'image/png', body: 'AAAA'.repeat(50), contentEncoding: 'BASE64' } }) +
      '\n';
    const [voce] = estraiVoci(testo, OPZIONI);
    expect(Object.keys(voce).sort()).toEqual(
      ['ambiente', 'durataMs', 'esecuzione', 'esito', 'file', 'impronta', 'nome', 'passoFallito', 'quando'].sort()
    );
    expect(Object.keys(voce.passoFallito ?? {}).sort()).toEqual(['motivo', 'numero', 'riepilogo', 'testo', 'totale']);
    const json = JSON.stringify(voce);
    expect(json).not.toContain('data:image');
    expect(json).not.toContain('AAAAAAAA');
    expect(json).not.toContain('\u001b');
    expect(json).not.toContain('\\u001b');
    expect(voce.passoFallito?.riepilogo).toMatchObject({ paginaAttesa: 'Carrello (/carrello)' });
  });
});
