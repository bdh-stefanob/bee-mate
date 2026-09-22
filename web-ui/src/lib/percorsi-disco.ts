import * as fs from 'fs';
import * as path from 'path';
import { dentroLaCartella } from './percorsi';

/**
 * Lo stesso controllo, piu' quello che solo il disco puo' dire.
 *
 * `resolve` non segue i collegamenti simbolici: un file dentro la cartella che
 * punta altrove supera il controllo sul testo e poi viene letto davvero, da
 * dove punta. `realpath` scioglie i collegamenti e il confronto si rifa' sul
 * percorso vero.
 *
 * Se il file non esiste non c'e' collegamento da sciogliere: passa il controllo
 * sul testo, e chi chiama decide cosa fare di un file che non c'e'.
 *
 * Vive in un modulo suo perche' importa `fs`: chi lo usa gira sul server.
 */
export function dentroLaCartellaSuDisco(
  radice: string,
  relativo: string,
  estensione: string
): string | null {
  const risolto = dentroLaCartella(radice, relativo, estensione);
  if (!risolto) return null;

  const prefisso = (radice + path.sep).toLowerCase();
  try {
    const vero = fs.realpathSync(risolto);
    if (!vero.toLowerCase().startsWith(prefisso)) return null;
    if (!vero.endsWith(estensione)) return null;
  } catch {
    // Il file non esiste: niente da seguire.
  }

  return risolto;
}
