/**
 * La regola di larghezza e allineamento delle pagine del cruscotto, in un
 * posto solo (usata dal layout di `(cruscotto)`).
 *
 * - Pagine a UNA colonna (Controllo, Registra, Esecuzione): strette, per
 *   leggibilita' (spec del 22/9: le righe lunghe non si leggono).
 * - Pagine a DUE colonne (Scenari, Catalogo): larghe, perche' l'elenco e il
 *   dettaglio stanno affiancati.
 * - Tutte CENTRATE nell'area accanto alla barra laterale: prima le strette
 *   stavano a sinistra e le larghe al centro, e a 1920 px lo spazio vuoto
 *   cambiava lato da una pagina all'altra.
 *
 * Una rotta nuova e' a una colonna finche' non la si elenca qui.
 */
export type LarghezzaPagina = 'una-colonna' | 'due-colonne';

const DUE_COLONNE = ['/scenari', '/catalogo'];

export const CLASSE_CONTENITORE: Record<LarghezzaPagina, string> = {
  'una-colonna': 'mx-auto w-full min-w-0 max-w-3xl',
  'due-colonne': 'mx-auto w-full min-w-0 max-w-screen-xl',
};

export function larghezzaPagina(percorso: string | null | undefined): LarghezzaPagina {
  const pulito = (percorso ?? '').replace(/\/+$/, '');
  return DUE_COLONNE.some((r) => pulito === r || pulito.startsWith(`${r}/`)) ? 'due-colonne' : 'una-colonna';
}
