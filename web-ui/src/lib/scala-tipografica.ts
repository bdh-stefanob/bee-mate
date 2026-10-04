/**
 * La scala dei titoli e del testo del cruscotto, in un posto solo (audit UI del
 * 4/10, §3). Le pagine e i componenti non scelgono piu' da soli dimensione e peso
 * di un titolo: usano queste classi, cosi' H1, H2 e H3 sono sempre distinguibili.
 *
 * - H1, titolo di pagina: 24 px, peso 600.
 * - H2, titolo di sezione: 18 px, peso 600.
 * - H3, titolo di gruppo (sezione dentro una sezione): 14 px, peso 600, mai in
 *   maiuscolo (le maiuscole a 12 px si leggono male).
 * - Testo di lettura: al massimo ~80 battute per riga.
 * - Frase di un passo (nel Catalogo): monospazio a 14 px.
 *
 * Il colore resta a chi usa la classe (i token della palette): qui solo la scala.
 * Se la scala dovesse diventare un token di `globals.css`, si sposta da qui.
 */
export const TITOLO_PAGINA = 'text-2xl font-semibold';
export const TITOLO_SEZIONE = 'text-lg font-semibold';
export const TITOLO_GRUPPO = 'text-sm font-semibold';
export const TESTO_LETTURA = 'max-w-[80ch]';
export const FRASE_DI_PASSO = 'break-words font-mono text-sm';
