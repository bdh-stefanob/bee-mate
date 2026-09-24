/**
 * registrati.ts
 * -------------
 * Quali `.feature` sono usciti da una registrazione.
 *
 * Prima bastava la cartella: tutto cio' che la generazione scriveva stava in
 * `src/features/generated/`. Ora il tester puo' dare a uno scenario registrato
 * la sua casa (`src/features/<app>/<flusso>/`), e la cartella non basta piu':
 * "tutti gli scenari registrati" deve trovarlo anche li'. Il segno che viaggia
 * con il file e' il tag `@generato`, che la generazione mette sempre sopra la
 * Feature e che lo spostamento conserva.
 */

import * as fs from "fs";
import * as path from "path";

const TAG = "@generato";

/** Il testo di un `.feature` porta il tag, su una riga di tag prima di "Feature:". */
export function eRegistrato(testo: string): boolean {
  for (const grezza of testo.split(/\r?\n/)) {
    const riga = grezza.trim();
    if (/^Feature:/.test(riga)) return false;
    if (riga.startsWith("@") && riga.split(/\s+/).includes(TAG)) return true;
  }
  return false;
}

/** Tutti i `.feature` registrati sotto `radice`, con percorsi relativi alla cartella di lavoro. */
export function scenariRegistrati(radice: string): string[] {
  const trovati: string[] = [];
  const visita = (dir: string): void => {
    let voci: fs.Dirent[];
    try {
      voci = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const v of voci) {
      const pieno = path.join(dir, v.name);
      if (v.isDirectory()) visita(pieno);
      else if (v.name.endsWith(".feature") && eRegistrato(fs.readFileSync(pieno, "utf-8"))) {
        trovati.push(pieno);
      }
    }
  };
  visita(radice);
  return trovati.sort();
}
