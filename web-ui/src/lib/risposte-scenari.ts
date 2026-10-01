import { ErrorePiano, type Operazione } from './piano-modifica';
import { SerraturaOccupata } from './serratura-scenari';

/**
 * Cio' che le rotte `/api/scenari/{contenuto,anteprima,modifica,annulla}` hanno in
 * comune: leggere l'operazione dal corpo e trasformare un errore in una risposta.
 *
 * Una risposta di errore porta solo un codice stabile (che la finestra traduce) e,
 * dove serve, frasi di step e nomi di scenario: mai il messaggio dell'eccezione
 * (puo' contenere un percorso assoluto, con dentro il nome di chi usa il computer).
 */

/** L'operazione dal corpo della richiesta, o `null` se non e' fatta come ci si aspetta. */
export function leggiOperazione(corpo: unknown): Operazione | null {
  if (typeof corpo !== 'object' || corpo === null) return null;
  const c = corpo as Record<string, unknown>;
  if (typeof c.file !== 'string' || typeof c.versione !== 'string') return null;
  if (c.operazione === 'testo' && typeof c.testo === 'string') {
    return { operazione: 'testo', file: c.file, versione: c.versione, testo: c.testo };
  }
  if (c.operazione === 'rinomina' && typeof c.da === 'string' && typeof c.a === 'string') {
    return { operazione: 'rinomina', file: c.file, versione: c.versione, da: c.da, a: c.a };
  }
  return null;
}

export interface RispostaErrore {
  stato: number;
  corpo: Record<string, unknown>;
}

export function rispostaErrore(e: unknown): RispostaErrore {
  if (e instanceof SerraturaOccupata) {
    return { stato: 409, corpo: { errore: 'operazione-in-corso' } };
  }
  if (e instanceof ErrorePiano) {
    return {
      stato: e.stato,
      corpo: {
        errore: e.codice,
        ...(e.ragione ? { ragione: e.ragione } : {}),
        ...(e.dettagli.length ? { dettagli: e.dettagli } : {}),
        ...(e.controllo ? { controllo: { motivo: e.controllo.motivo, passi: e.controllo.passi ?? [] } } : {}),
      },
    };
  }
  console.error('modifica degli scenari: errore inatteso:', e);
  return { stato: 500, corpo: { errore: 'errore-interno' } };
}
