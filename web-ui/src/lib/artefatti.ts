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
    testStepId: string;
    testStepResult?: { status?: string; message?: unknown };
  };
}

export function leggiPassiTest(percorsoMessaggi: string): Array<{
  testo: string;
  esito: Esito;
  messaggio?: string;
}> {
  let righe: string[];
  try {
    righe = fs.readFileSync(percorsoMessaggi, 'utf-8').split('\n').filter((r) => r.trim());
  } catch {
    return [];
  }

  // Il testo del passo sta nel pickle; l'esito arriva dopo, con l'id del passo.
  const testoPerId = new Map<string, string>();
  const passi: Array<{ testo: string; esito: Esito; messaggio?: string }> = [];

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
    if (m.testStepFinished) {
      const id = m.testStepFinished.testStepId as string;
      const risultato = m.testStepFinished.testStepResult ?? {};
      const testo = testoPerId.get(id);
      // Gli hook non hanno un testo: non sono passi dello scenario.
      if (!testo) continue;
      passi.push({
        testo,
        esito: ESITI[risultato.status as string] ?? 'saltato',
        ...(risultato.message ? { messaggio: String(risultato.message) } : {}),
      });
    }
  }
  return passi;
}
