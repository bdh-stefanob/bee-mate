import * as path from 'path';

/**
 * Il controllo sul testo di un percorso che arriva dalla finestra: dentro la
 * cartella che gli compete, e con l'estensione che ci si aspetta.
 *
 * `path.resolve` scioglie `..` e i percorsi assoluti, e il confronto col
 * prefisso include il separatore finale — senza, una cartella che *inizia*
 * come quella giusta (`recordings-altro/`) passerebbe. Il confronto e' in
 * minuscolo perche' su Windows e su macOS il disco non distingue le maiuscole.
 *
 * Qui non si tocca il disco, e non e' una svista: questo modulo finisce anche
 * nel pacchetto che gira nel browser, dove `fs` non esiste. Il secondo
 * controllo — i collegamenti simbolici — sta in `percorsi-disco.ts`, che gira
 * solo sul server.
 */
export function dentroLaCartella(
  radice: string,
  relativo: string,
  estensione: string
): string | null {
  const risolto = path.resolve(radice, relativo);
  const prefisso = (radice + path.sep).toLowerCase();

  if (!risolto.toLowerCase().startsWith(prefisso)) return null;
  if (!risolto.endsWith(estensione)) return null;

  return risolto;
}
