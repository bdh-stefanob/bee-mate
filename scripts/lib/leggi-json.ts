/**
 * lib/leggi-json.ts
 * -----------------
 * (F6) **Un solo posto dove si leggono i file che una persona puo' aver salvato
 * a mano**: `bdd-targets.json`, `step-catalog.json`, `step-enums.json`, `.env`.
 *
 * Due difetti, uno stesso rimedio:
 * - un file salvato col Blocco note o da PowerShell 5.1 (`Set-Content -Encoding
 *   utf8`) comincia con un BOM, e `JSON.parse` risponde "Unexpected token": cade
 *   l'intera diagnosi per un carattere che non si vede;
 * - quando il file e' davvero rotto, lo stack non dice quale file: chi lo legge
 *   cerca nel posto sbagliato. L'errore di qui nomina **il file** e cosa fare.
 */

import * as fs from "fs";
import * as path from "path";

/** Il file c'e' (o dovrebbe esserci) ma non si legge come ci si aspetta. */
export class FileNonLeggibile extends Error {
  constructor(
    /** Il nome del file, senza cartelle: e' quello che la persona riconosce. */
    readonly file: string,
    motivo: string
  ) {
    super(
      `Il file "${file}" non si legge (${motivo}). ` +
        `Rimettilo com'era, oppure salvalo di nuovo come UTF-8; se non ti serve, spostalo e lo ricreo.`
    );
    this.name = "FileNonLeggibile";
  }
}

/** Il testo senza il BOM UTF-8 iniziale, se c'e'. */
export function senzaBom(testo: string): string {
  return testo.charCodeAt(0) === 0xfeff ? testo.slice(1) : testo;
}

/** Legge un file di testo tollerando il BOM. Un file che non si apre nomina il file. */
export function leggiTesto(file: string): string {
  try {
    return senzaBom(fs.readFileSync(file, "utf-8"));
  } catch (e) {
    throw new FileNonLeggibile(path.basename(file), (e as NodeJS.ErrnoException).code ?? "non si apre");
  }
}

/** Legge un file JSON tollerando il BOM. Mai un "Unexpected token" senza il nome del file. */
export function leggiJson<T = unknown>(file: string): T {
  const testo = leggiTesto(file);
  try {
    return JSON.parse(testo) as T;
  } catch {
    throw new FileNonLeggibile(path.basename(file), "non e' un JSON valido");
  }
}
