/**
 * Da che larghezza la pagina Scenari va su due colonne (decisione O1): scritta
 * qui, in un posto solo, in due forme che devono dire lo stesso numero — la
 * media query per chi deve sapere in che disposizione si e' (focus, scorrimento)
 * e la classe per chi disegna. Cambiarla costa una riga.
 *
 * La barra laterale del cruscotto resta a 900px: fra 900 e 1099px c'e' la barra
 * a sinistra e la pagina a una colonna (il contenuto e' troppo stretto per
 * elenco e Gherkin affiancati).
 */
export const SOGLIA_DUE_COLONNE_PX = 1100;
export const MEDIA_DUE_COLONNE = `(min-width: ${SOGLIA_DUE_COLONNE_PX}px)`;

/** Le classi che dipendono dalla soglia: devono contenere lo stesso numero. */
export const CLASSE_DUE_COLONNE =
  'min-[1100px]:grid min-[1100px]:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] min-[1100px]:items-start';
export const CLASSE_ELENCO_STICKY =
  'min-[1100px]:sticky min-[1100px]:top-6 min-[1100px]:max-h-[calc(100vh-3rem)]';
export const CLASSE_ELENCO_ALTEZZA = 'max-h-[40vh] min-[1100px]:max-h-none';
/** Il riquadro dello scheletro che c'e' solo con due colonne. */
export const CLASSE_SOLO_DUE_COLONNE = 'hidden min-[1100px]:block';
/** Esegui ed Esporta occupano meta' riga sotto la soglia, la loro misura sopra. */
export const CLASSE_AZIONE_FLESSIBILE = 'flex-1 min-[1100px]:flex-none';
