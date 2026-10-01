/**
 * schede-url.ts
 * -------------
 * Quale scheda e' attiva, letta e scritta dall'indirizzo. Puro: niente React,
 * niente Next, cosi' si prova senza browser (vedi `useSchedaUrl.ts` per la
 * parte che li usa).
 *
 * LE TRE FONTI (decisione Q5 della spec del Catalogo a schede)
 *   1. `?scheda=` nell'indirizzo, se valido: vince sempre, cosi' un link porta
 *      dove dice.
 *   2. L'ultima scheda visitata in questa finestra, se valida.
 *   3. La predefinita.
 * Un valore sconosciuto in (1) o in (2) fa passare alla fonte dopo: un link
 * vecchio, o una scheda che oggi non esiste piu', non rompe niente.
 */

/** I parametri che appartengono a una scheda: su un'altra non significano niente. */
export const PARAMETRI_DI_SCHEDA = ['q', 'app', 'stato', 'senza-componente', 'ambigua', 'ordina'] as const;

/** Dove si ricorda l'ultima scheda visitata: una comodita' per finestra, vedi la spec ("Quale scheda si apre"). */
export const CHIAVE_ULTIMA_SCHEDA = 'cruscotto.catalogo.scheda';

type ValoreParametro = string | readonly string[] | null | undefined;

function primo(valore: ValoreParametro): string | null {
  if (valore === null || valore === undefined) return null;
  if (typeof valore === 'string') return valore;
  return valore.length > 0 ? (valore[0] ?? null) : null;
}

/** La scheda dell'indirizzo se e' valida (confronto ESATTO), altrimenti la predefinita. Parametro ripetuto: il primo. */
export function schedaDaUrl<T extends string>(valore: ValoreParametro, valide: readonly T[], predefinita: T): T {
  const v = primo(valore);
  return v !== null && (valide as readonly string[]).includes(v) ? (v as T) : predefinita;
}

/**
 * L'indirizzo per cambiare scheda: toglie i parametri di filtro, tiene gli
 * estranei, e scrive SEMPRE `scheda=<id>` (anche per la predefinita: un link
 * copiato e' cosi' esplicito).
 */
export function urlConScheda(
  percorso: string,
  parametri: string | URLSearchParams,
  parametro: string,
  id: string,
  opzioni: { mantieni?: readonly string[] } = {}
): string {
  const origine = new URLSearchParams(typeof parametri === 'string' ? parametri : parametri.toString());
  const mantieni = new Set(opzioni.mantieni ?? []);
  for (const chiave of PARAMETRI_DI_SCHEDA) {
    if (!mantieni.has(chiave)) origine.delete(chiave);
  }
  origine.delete(parametro);
  origine.set(parametro, id);
  return `${percorso}?${origine.toString()}`;
}

export type FonteScheda = 'indirizzo' | 'ricordata' | 'predefinita';

/** Quale scheda mostrare all'apertura, e da quale fonte viene. */
export function schedaIniziale<T extends string>(opzioni: {
  url: ValoreParametro;
  ricordata: string | null | undefined;
  valide: readonly T[];
  predefinita: T;
}): { scheda: T; fonte: FonteScheda } {
  const { url, ricordata, valide, predefinita } = opzioni;
  const e = (valide as readonly string[]);
  const daUrl = primo(url);
  if (daUrl !== null && e.includes(daUrl)) return { scheda: daUrl as T, fonte: 'indirizzo' };
  if (ricordata && e.includes(ricordata)) return { scheda: ricordata as T, fonte: 'ricordata' };
  return { scheda: predefinita, fonte: 'predefinita' };
}

/** Il minimo di `Storage` che serve: cosi' i test passano un finto e la pagina `window.localStorage`. */
export interface ArchivioScheda {
  getItem(chiave: string): string | null;
  setItem(chiave: string, valore: string): void;
}

/** L'ultima scheda ricordata, o null: archivio assente, bloccato o vuoto non sono un errore. */
export function leggiSchedaRicordata(archivio: Pick<ArchivioScheda, 'getItem'> | null): string | null {
  if (!archivio) return null;
  try {
    return archivio.getItem(CHIAVE_ULTIMA_SCHEDA);
  } catch {
    return null;
  }
}

/** Ricorda la scheda; se non si puo' (finestra privata, dati bloccati) la comodita' sparisce in silenzio. */
export function ricordaScheda(archivio: Pick<ArchivioScheda, 'setItem'> | null, id: string): void {
  if (!archivio) return;
  try {
    archivio.setItem(CHIAVE_ULTIMA_SCHEDA, id);
  } catch {
    // Niente da mostrare: apre su Step, come la prima volta.
  }
}
