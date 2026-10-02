/**
 * lettura.ts
 * ----------
 * Le letture di sola lettura del cruscotto (mai i POST che avviano qualcosa):
 * con un limite di tempo, e distinguendo "non c'e' niente" da "non sono
 * riuscito a leggere".
 *
 * Senza limite, un server fermo o una rete che non risponde lasciavano lo
 * scheletro a schermo per sempre, senza un "Riprova". Con il limite la lettura
 * fallisce come fallirebbe con un errore 500, e le schermate mostrano lo stesso
 * stato di errore che gia' avevano.
 */

/** Dopo quanto una lettura senza risposta si considera fallita. */
export const LIMITE_LETTURA_MS = 15000;

/** `fetch` che si arrende dopo `ms`: la promessa viene rifiutata, anche a meta' del corpo. */
export function leggiConLimite(
  rotta: string,
  ms: number = LIMITE_LETTURA_MS,
  eseguiFetch: typeof fetch = (...argomenti) => fetch(...argomenti)
): Promise<Response> {
  return eseguiFetch(rotta, { signal: AbortSignal.timeout(ms) });
}

/** Cio' che la lettura dell'elenco degli scenari ha prodotto. */
export type EsitoElencoScenari<F> = { tipo: 'letto'; file: F[] } | { tipo: 'non-letto' };

/**
 * L'elenco degli scenari, letto in modo che un errore NON somigli mai a un
 * elenco vuoto: risposta non riuscita, connessione caduta, nessuna risposta
 * entro il limite, corpo senza la forma attesa → 'non-letto'. 'letto' con
 * `file: []` vuol dire che davvero non c'e' ancora nessuno scenario.
 */
export async function leggiElencoScenari<F = { file: string }>(
  eseguiFetch?: typeof fetch,
  ms: number = LIMITE_LETTURA_MS
): Promise<EsitoElencoScenari<F>> {
  try {
    const risposta = await leggiConLimite('/api/scenari', ms, eseguiFetch);
    if (!risposta.ok) return { tipo: 'non-letto' };
    const corpo = (await risposta.json()) as { file?: unknown };
    if (!Array.isArray(corpo.file)) return { tipo: 'non-letto' };
    return { tipo: 'letto', file: corpo.file as F[] };
  } catch {
    return { tipo: 'non-letto' };
  }
}

export type StatoElenco = 'in-lettura' | 'non-letto' | 'vuoto' | 'pieno';

/** Cosa mostrare dato l'esito (null = la richiesta non e' ancora tornata). */
export function statoElencoScenari(esito: EsitoElencoScenari<unknown> | null): StatoElenco {
  if (esito === null) return 'in-lettura';
  if (esito.tipo === 'non-letto') return 'non-letto';
  return esito.file.length === 0 ? 'vuoto' : 'pieno';
}
