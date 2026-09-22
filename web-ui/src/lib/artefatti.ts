import * as fs from 'fs';

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

export function leggiPassiTest(percorsoMessaggi: string): Array<{
  testo: string;
  esito: Esito;
  messaggio?: string;
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
      passi.push({
        testo,
        esito: ESITI[risultato.status as string] ?? 'saltato',
        ...(risultato.message ? { messaggio: String(risultato.message) } : {}),
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
