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
interface MessaggioCucumber {
  pickle?: { steps?: Array<{ id: string; text?: string }> };
  testCase?: { testSteps?: Array<{ id: string; pickleStepId?: string }> };
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
  primaRiga: string;
}

const RIGA_PAGINA_ATTESA = /^\s*Pagina attesa\s*:\s*(.+)$/m;
const RIGA_INDIRIZZO_ORA = /^\s*Indirizzo ora\s*:\s*(.+)$/m;

export function riepilogoErrore(messaggioPulito: string): RiepilogoErrore {
  const primaRiga = messaggioPulito.split('\n').find((r) => r.trim()) ?? messaggioPulito;
  const paginaAttesa = RIGA_PAGINA_ATTESA.exec(messaggioPulito)?.[1]?.trim();
  const indirizzoOra = RIGA_INDIRIZZO_ORA.exec(messaggioPulito)?.[1]?.trim();
  return {
    primaRiga: primaRiga.trim(),
    ...(paginaAttesa ? { paginaAttesa } : {}),
    ...(indirizzoOra ? { indirizzoOra } : {}),
  };
}

export function leggiPassiTest(percorsoMessaggi: string): Array<{
  testo: string;
  esito: Esito;
  messaggio?: string;
  riepilogo?: RiepilogoErrore;
  schermata?: string;
}> {
  let righe: string[];
  try {
    righe = fs.readFileSync(percorsoMessaggi, 'utf-8').split('\n').filter((r) => r.trim());
  } catch {
    return [];
  }

  // Il testo del passo sta nel pickle; l'esito arriva dopo, con l'id del passo.
  const testoPerId = new Map<string, string>();
  const passi: Array<{
    testo: string;
    esito: Esito;
    messaggio?: string;
    riepilogo?: RiepilogoErrore;
    schermata?: string;
    testCaseStartedId: string;
  }> = [];

  // Gli allegati (screenshot) nascono nell'hook `After`, non nel passo fallito:
  // l'envelope `attachment` porta il `testStepId` del passo dell'hook, non
  // quello del passo che e' fallito (verificato su un'esecuzione vera contro
  // il bersaglio pubblico "demo": l'hook e il passo fallito hanno id diversi).
  // L'unico identificativo che lega davvero l'allegato al caso di prova e'
  // `testCaseStartedId`, condiviso da tutti gli step (compresi gli hook) dello
  // stesso scenario. Si raccolgono qui, per caso di prova, e si assegnano poi
  // al passo fallito di quello stesso caso.
  const schermatePerCaso = new Map<string, string>();

  for (const riga of righe) {
    let m: MessaggioCucumber;
    try {
      m = JSON.parse(riga) as MessaggioCucumber;
    } catch {
      continue;
    }
    if (m.pickle?.steps) {
      for (const s of m.pickle.steps) testoPerId.set(s.id, s.text ?? '');
    }
    if (m.testCase?.testSteps) {
      for (const s of m.testCase.testSteps) {
        if (s.pickleStepId) testoPerId.set(s.id, testoPerId.get(s.pickleStepId) ?? '');
      }
    }
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
      const testo = testoPerId.get(id);
      // Gli hook non hanno un testo: non sono passi dello scenario.
      if (!testo) continue;
      // Il messaggio grezzo puo' portare i codici colore che Playwright si
      // mette da solo quando chi lo lancia sembra un terminale a colori: qui
      // non c'e' un terminale, quindi si puliscono prima che arrivino a
      // qualunque schermata (finding F1). Il riepilogo si calcola dal testo
      // gia' pulito, cosi' anche lui non porta escape.
      const messaggio = risultato.message ? rimuoviCodiciAnsi(String(risultato.message), REPO_ROOT) : undefined;
      passi.push({
        testo,
        esito: ESITI[risultato.status as string] ?? 'saltato',
        ...(messaggio ? { messaggio, riepilogo: riepilogoErrore(messaggio) } : {}),
        testCaseStartedId,
      });
    }
  }

  return passi.map(({ testCaseStartedId, ...passo }) => {
    if (passo.esito !== 'fallito') return passo;
    const schermata = schermatePerCaso.get(testCaseStartedId);
    return schermata ? { ...passo, schermata } : passo;
  });
}
