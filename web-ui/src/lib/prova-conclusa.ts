import * as fs from 'fs';
import * as path from 'path';
import { leggiPassiTest } from './artefatti';
import { leggiEsiti, percorsoIndice } from './esiti-scenari';

/**
 * Una prova gia' conclusa, riaperta in sola lettura da Esecuzione
 * (`/esecuzione?prova=<id>`). L'id arriva dall'indirizzo e non e' fidato: si
 * dice cosa e' ammesso (minuscole, cifre, trattino) e il percorso si costruisce
 * dal solo id, dentro `reports/cruscotto/`. Un id valido ma senza file e' una
 * prova che la pulizia ha tolto: si dice, non e' un errore.
 */
export const ID_PROVA = /^[a-z0-9-]{1,80}$/;

export function idProvaValido(id: string | null | undefined): id is string {
  return typeof id === 'string' && ID_PROVA.test(id);
}

type PassiProva = ReturnType<typeof leggiPassiTest>;

export type LetturaProva =
  | { stato: 'non-valida' }
  | { stato: 'assente' }
  | {
      stato: 'ok';
      passi: PassiProva;
      /** ISO: quando la prova e' finita (o, senza stato su disco, l'ultima scrittura dei messaggi). */
      quando: string | null;
      /** `null` = sconosciuto (esito ricostruito dai vecchi file): il link funziona lo stesso. */
      ambiente: string | null;
    };

function percorsoMessaggi(radice: string, id: string): string {
  return path.join(radice, 'reports', 'cruscotto', `${id}.ndjson`);
}

/** C'e' ancora qualcosa da mostrare per questa prova? Senza leggere le schermate. */
export function provaEsiste(radice: string, id: string): boolean {
  if (!idProvaValido(id)) return false;
  try {
    return fs.statSync(percorsoMessaggi(radice, id)).isFile();
  } catch {
    return false;
  }
}

function quandoFinita(radice: string, id: string, messaggi: string): string | null {
  try {
    const stato = JSON.parse(fs.readFileSync(path.join(radice, 'reports', 'cruscotto', `${id}.json`), 'utf-8')) as {
      fine?: unknown;
      avvio?: unknown;
    };
    for (const v of [stato.fine, stato.avvio]) {
      if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return v;
    }
  } catch {
    // Nessuno stato: si ripiega sull'ultima scrittura dei messaggi.
  }
  try {
    return fs.statSync(messaggi).mtime.toISOString();
  } catch {
    return null;
  }
}

/** Legge una prova conclusa. Mai un'eccezione: i casi sono dichiarati. */
export function leggiProvaConclusa(radice: string, id: string): LetturaProva {
  if (!idProvaValido(id)) return { stato: 'non-valida' };
  const messaggi = percorsoMessaggi(radice, id);
  if (!provaEsiste(radice, id)) return { stato: 'assente' };

  // L'ambiente non e' ne' nei messaggi ne' nello stato: lo ricorda l'indice.
  const voce = leggiEsiti(percorsoIndice(radice)).voci.find((v) => v.esecuzione === id);
  return {
    stato: 'ok',
    passi: leggiPassiTest(messaggi),
    quando: quandoFinita(radice, id, messaggi),
    ambiente: voce?.ambiente ?? null,
  };
}
