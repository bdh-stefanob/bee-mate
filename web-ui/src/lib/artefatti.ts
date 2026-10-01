import * as fs from 'fs';
import { rimuoviCodiciAnsi } from './ansi';
import { REPO_ROOT } from './repo';

/**
 * I risultati si leggono da qui, non dall'output a schermo: un conteggio preso
 * da un riassunto pensato per le persone dava 92 invece di 0.
 *
 * Un file che non c'e' non fa cadere la finestra: restituisce vuoto, e la
 * schermata lo dice.
 */
interface TracciaGrezza {
  durationSeconds?: number;
  intents?: Array<{ label?: string; steps?: unknown[]; assertions?: unknown[] }>;
}

export function leggiTraccia(percorso: string): {
  passi: Array<{ nome: string; gesti: number; verifiche: number }>;
  durata: number;
} {
  let grezza: TracciaGrezza;
  try {
    grezza = JSON.parse(fs.readFileSync(percorso, 'utf-8')) as TracciaGrezza;
  } catch {
    return { passi: [], durata: 0 };
  }
  return {
    durata: grezza.durationSeconds ?? 0,
    passi: (grezza.intents ?? []).map((i) => ({
      nome: i.label ?? '(senza nome)',
      gesti: (i.steps ?? []).length,
      verifiche: (i.assertions ?? []).length,
    })),
  };
}

type Esito = 'passato' | 'fallito' | 'saltato';

const ESITI: Record<string, Esito> = {
  PASSED: 'passato',
  FAILED: 'fallito',
  SKIPPED: 'saltato',
  UNDEFINED: 'saltato',
  PENDING: 'saltato',
  AMBIGUOUS: 'fallito',
};

/** Forma minima di un messaggio del formato Cucumber (`.ndjson`) che ci interessa. */
interface Marca {
  seconds?: number | string;
  nanos?: number;
}
interface NodoScenario {
  scenario?: { id?: string; name?: string };
  rule?: { children?: NodoScenario[] };
}
interface MessaggioCucumber {
  source?: { uri?: string; data?: string };
  gherkinDocument?: { feature?: { children?: NodoScenario[] } };
  pickle?: {
    id?: string;
    uri?: string;
    name?: string;
    astNodeIds?: string[];
    steps?: Array<{ id: string; text?: string }>;
  };
  testCase?: { id?: string; pickleId?: string; testSteps?: Array<{ id: string; pickleStepId?: string }> };
  testCaseStarted?: { id?: string; testCaseId?: string; timestamp?: Marca };
  testCaseFinished?: { testCaseStartedId?: string; willBeRetried?: boolean; timestamp?: Marca };
  testStepFinished?: {
    testCaseStartedId: string;
    testStepId: string;
    testStepResult?: { status?: string; message?: unknown };
  };
  attachment?: {
    testCaseStartedId?: string;
    testStepId?: string;
    mediaType?: string;
    contentEncoding?: string;
    body?: string;
  };
}

/**
 * Cosa dire in una riga sola di un passo fallito, prima dello stack tecnico.
 *
 * `expectVisible` (in `src/support/base.page.ts`) aggiunge gia', in fondo al
 * messaggio, due righe con l'etichetta fissa "Pagina attesa" e "Indirizzo
 * ora": e' il posto piu' affidabile da cui leggere cosa il test si aspettava
 * e dove si e' trovato davvero, la promessa fatta in
 * `docs/TESTER-DASHBOARD-GUIDE.md` §3. Quando quelle righe non ci sono (un
 * errore che non passa da li'), resta la prima riga del messaggio: sempre
 * meglio di niente, mai lo stack intero.
 */
export interface RiepilogoErrore {
  paginaAttesa?: string;
  indirizzoOra?: string;
  /**
   * Presente solo quando l'indirizzo raggiunto COINCIDE con la pagina attesa e
   * il locator che manca e' un `getByRole`: il tester e' nel posto giusto e
   * manca l'elemento. Senza questo, "attesa /x · raggiunto /x" non dice nulla.
   */
  elementoMancante?: { ruolo: string; nome: string };
  primaRiga: string;
}

const RIGA_PAGINA_ATTESA = /^\s*Pagina attesa\s*:\s*(.+)$/m;
const RIGA_INDIRIZZO_ORA = /^\s*Indirizzo ora\s*:\s*(.+)$/m;

const RIGA_LOCATOR_RUOLO =
  /^\s*Locator\s*:\s*getByRole\(\s*(['"])(.+?)\1\s*,\s*\{\s*name\s*:\s*(['"])(.*?)\3/m;

function percorsoDi(valore: string): string {
  let p = valore;
  try {
    p = new URL(valore).pathname;
  } catch {
    p = valore.split(/[?#]/)[0];
  }
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

/** `AppPage (/app)` -> `/app`; un valore senza parentesi resta com'e'. */
function percorsoAtteso(paginaAttesa: string): string {
  return percorsoDi(/\(([^)]*)\)\s*$/.exec(paginaAttesa)?.[1] ?? paginaAttesa);
}

export function riepilogoErrore(messaggioPulito: string): RiepilogoErrore {
  const primaRiga = messaggioPulito.split('\n').find((r) => r.trim()) ?? messaggioPulito;
  const paginaAttesa = RIGA_PAGINA_ATTESA.exec(messaggioPulito)?.[1]?.trim();
  const indirizzoOra = RIGA_INDIRIZZO_ORA.exec(messaggioPulito)?.[1]?.trim();
  const locator = RIGA_LOCATOR_RUOLO.exec(messaggioPulito);
  const paginaGiusta =
    !!paginaAttesa && !!indirizzoOra && percorsoAtteso(paginaAttesa) === percorsoDi(indirizzoOra);
  return {
    primaRiga: primaRiga.trim(),
    ...(paginaAttesa ? { paginaAttesa } : {}),
    ...(indirizzoOra ? { indirizzoOra } : {}),
    ...(paginaGiusta && locator ? { elementoMancante: { ruolo: locator[2], nome: locator[4] } } : {}),
  };
}

/**
 * Un caso di prova: uno scenario (o un esempio di uno Scenario Outline) cosi'
 * come i messaggi lo raccontano.
 */
export interface CasoAnalizzato {
  /** `testCaseStarted.id`: lo stesso identificativo che lega i passi e gli allegati. */
  id: string;
  /** L'`uri` del pickle, com'e' (su Windows ha le barre rovesciate). */
  uri: string;
  /**
   * Il nome della DEFINIZIONE nel `gherkinDocument`, non quello del pickle: per
   * uno Scenario Outline il pickle sostituisce i segnaposto, e `Login <utente>`
   * diventerebbe tanti nomi che nessun elenco conosce. Si risale con
   * `pickle.astNodeIds[0]`; se non si trova resta il nome del pickle.
   */
  nome: string;
  /** I passi dello scenario, in ordine (gli hook non ci sono). */
  passiPickle: Array<{ id: string; testo: string }>;
  /** Gli esiti, nell'ordine in cui sono arrivati; gli hook non hanno `pickleStepId`. */
  passi: Array<{ pickleStepId?: string; stato: string; messaggio?: string }>;
  inizioMs?: number;
  fineMs?: number;
  /** C'e' un `testCaseFinished`: senza, il processo e' stato ucciso a meta'. */
  finito: boolean;
  /** Il tentativo e' fallito e Cucumber lo ripete: il suo esito non conta. */
  ritentato: boolean;
}

export interface PassoAnalizzato {
  testo: string;
  stato: string;
  /** Il messaggio grezzo, ancora con i codici colore: chi lo mostra lo ripulisce. */
  messaggio?: string;
  testCaseStartedId: string;
}

export interface AnalisiMessaggi {
  casi: CasoAnalizzato[];
  /** Il testo dei `.feature` com'erano al lancio, per `uri`. */
  sorgenti: Map<string, string>;
  /** Tutti i passi (non gli hook) nell'ordine di fine, come li leggeva `leggiPassiTest`. */
  passi: PassoAnalizzato[];
  /** La prima immagine allegata a ciascun caso, come data URI. */
  schermatePerCaso: Map<string, string>;
}

function inMillisecondi(m?: Marca): number | undefined {
  if (!m || m.seconds === undefined) return undefined;
  const secondi = Number(m.seconds);
  if (!Number.isFinite(secondi)) return undefined;
  return secondi * 1000 + Math.round((m.nanos ?? 0) / 1e6);
}

function raccogliDefinizioni(nodi: NodoScenario[] | undefined, nomi: Map<string, string>): void {
  for (const nodo of nodi ?? []) {
    if (nodo.scenario?.id && nodo.scenario.name !== undefined) nomi.set(nodo.scenario.id, nodo.scenario.name);
    if (nodo.rule) raccogliDefinizioni(nodo.rule.children, nomi);
  }
}

/**
 * Legge i messaggi di Cucumber UNA volta e li restituisce in una forma che
 * serve a tutti: la schermata Esecuzione (i passi di una prova) e l'indice degli
 * esiti per scenario. Una fonte sola per leggere il formato, cosi' i due non
 * possono capire cose diverse dello stesso file.
 *
 * Le righe che non sono JSON si saltano (un file troncato si legge fin dove
 * arriva). Mai un'eccezione: un testo illeggibile da' un'analisi vuota.
 */
export function analizzaMessaggi(testo: string): AnalisiMessaggi {
  const sorgenti = new Map<string, string>();
  const definizioni = new Map<string, string>();
  const picklePerId = new Map<string, NonNullable<MessaggioCucumber['pickle']>>();
  const picklePerCaso = new Map<string, string>(); // testCase.id -> pickle.id
  const casiPerId = new Map<string, CasoAnalizzato>();
  const casi: CasoAnalizzato[] = [];
  const passi: PassoAnalizzato[] = [];
  const schermatePerCaso = new Map<string, string>();
  // Il testo del passo sta nel pickle; l'esito arriva dopo, con l'id del passo.
  const testoPerId = new Map<string, string>();
  const pickleStepPerTestStep = new Map<string, string>();

  for (const riga of testo.split('\n')) {
    if (!riga.trim()) continue;
    let m: MessaggioCucumber;
    try {
      m = JSON.parse(riga) as MessaggioCucumber;
    } catch {
      continue;
    }
    if (m === null || typeof m !== 'object') continue;

    if (m.source?.uri !== undefined && typeof m.source.data === 'string') {
      sorgenti.set(m.source.uri, m.source.data);
    }
    if (m.gherkinDocument) raccogliDefinizioni(m.gherkinDocument.feature?.children, definizioni);
    if (m.pickle) {
      if (m.pickle.id) picklePerId.set(m.pickle.id, m.pickle);
      for (const s of m.pickle.steps ?? []) testoPerId.set(s.id, s.text ?? '');
    }
    if (m.testCase?.testSteps) {
      if (m.testCase.id && m.testCase.pickleId) picklePerCaso.set(m.testCase.id, m.testCase.pickleId);
      for (const s of m.testCase.testSteps) {
        if (s.pickleStepId) {
          testoPerId.set(s.id, testoPerId.get(s.pickleStepId) ?? '');
          pickleStepPerTestStep.set(s.id, s.pickleStepId);
        }
      }
    }
    if (m.testCaseStarted?.id) {
      const pickle = picklePerId.get(picklePerCaso.get(m.testCaseStarted.testCaseId ?? '') ?? '');
      const idNodo = pickle?.astNodeIds?.[0];
      const caso: CasoAnalizzato = {
        id: m.testCaseStarted.id,
        uri: pickle?.uri ?? '',
        nome: (idNodo !== undefined ? definizioni.get(idNodo) : undefined) ?? pickle?.name ?? '',
        passiPickle: (pickle?.steps ?? []).map((s) => ({ id: s.id, testo: s.text ?? '' })),
        passi: [],
        inizioMs: inMillisecondi(m.testCaseStarted.timestamp),
        finito: false,
        ritentato: false,
      };
      casiPerId.set(caso.id, caso);
      casi.push(caso);
    }
    if (m.testCaseFinished?.testCaseStartedId) {
      const caso = casiPerId.get(m.testCaseFinished.testCaseStartedId);
      if (caso) {
        caso.finito = true;
        caso.ritentato = m.testCaseFinished.willBeRetried === true;
        caso.fineMs = inMillisecondi(m.testCaseFinished.timestamp);
      }
    }
    // Gli allegati (screenshot) nascono nell'hook `After`, non nel passo fallito:
    // l'envelope `attachment` porta il `testStepId` del passo dell'hook, non
    // quello del passo che e' fallito (verificato su un'esecuzione vera contro
    // il bersaglio pubblico "demo": l'hook e il passo fallito hanno id diversi).
    // L'unico identificativo che lega davvero l'allegato al caso di prova e'
    // `testCaseStartedId`, condiviso da tutti gli step (compresi gli hook) dello
    // stesso scenario. Si raccolgono qui, per caso di prova, e si assegnano poi
    // al passo fallito di quello stesso caso.
    if (m.attachment) {
      const { testCaseStartedId, mediaType, body } = m.attachment;
      // Al massimo una schermata per caso di prova: se il passo fallito ne ha
      // gia' una, un secondo allegato non la sostituisce.
      if (
        testCaseStartedId &&
        mediaType?.startsWith('image/') &&
        body &&
        !schermatePerCaso.has(testCaseStartedId)
      ) {
        schermatePerCaso.set(testCaseStartedId, `data:${mediaType};base64,${body}`);
      }
    }
    if (m.testStepFinished) {
      const id = m.testStepFinished.testStepId;
      const testCaseStartedId = m.testStepFinished.testCaseStartedId;
      const risultato = m.testStepFinished.testStepResult ?? {};
      const messaggio = risultato.message ? String(risultato.message) : undefined;
      const stato = String(risultato.status ?? '');
      const testoPasso = testoPerId.get(id);
      const caso = casiPerId.get(testCaseStartedId);
      if (caso) {
        const pickleStepId = pickleStepPerTestStep.get(id);
        caso.passi.push({
          ...(pickleStepId ? { pickleStepId } : {}),
          stato,
          ...(messaggio ? { messaggio } : {}),
        });
      }
      // Gli hook non hanno un testo: non sono passi dello scenario.
      if (testoPasso) passi.push({ testo: testoPasso, stato, ...(messaggio ? { messaggio } : {}), testCaseStartedId });
    }
  }

  return { casi, sorgenti, passi, schermatePerCaso };
}

export function leggiPassiTest(percorsoMessaggi: string): Array<{
  testo: string;
  esito: Esito;
  messaggio?: string;
  riepilogo?: RiepilogoErrore;
  schermata?: string;
}> {
  let contenuto: string;
  try {
    contenuto = fs.readFileSync(percorsoMessaggi, 'utf-8');
  } catch {
    return [];
  }

  const analisi = analizzaMessaggi(contenuto);
  return analisi.passi.map((p) => {
    // Il messaggio grezzo puo' portare i codici colore che Playwright si
    // mette da solo quando chi lo lancia sembra un terminale a colori: qui
    // non c'e' un terminale, quindi si puliscono prima che arrivino a
    // qualunque schermata (finding F1). Il riepilogo si calcola dal testo
    // gia' pulito, cosi' anche lui non porta escape.
    const messaggio = p.messaggio ? rimuoviCodiciAnsi(p.messaggio, REPO_ROOT) : undefined;
    const passo = {
      testo: p.testo,
      esito: ESITI[p.stato] ?? ('saltato' as Esito),
      ...(messaggio ? { messaggio, riepilogo: riepilogoErrore(messaggio) } : {}),
    };
    if (passo.esito !== 'fallito') return passo;
    const schermata = analisi.schermatePerCaso.get(p.testCaseStartedId);
    return schermata ? { ...passo, schermata } : passo;
  });
}
