import type { CatalogStep } from './types';
import { espressioneInRegex } from './catalogo';

/**
 * esportazione.ts
 * ---------------
 * Il pacchetto scaricabile di uno scenario: la frase la porta con se' la sua
 * storia intera — la Feature, la definizione degli step, le Page Object che
 * tocca — cosi' si puo' allegare o condividere senza che chi la riceve debba
 * andare a cercare il resto nel repository.
 *
 * FORMATO SCELTO: TESTO SEMPLICE CON UN MARCATORE PER FILE, NON ZIP NE' JSON
 * Deve potersi aprire senza strumenti speciali: un file di testo lo apre
 * qualunque editor con un doppio click, mentre uno zip richiede
 * un'estrazione e un json e' scomodo da leggere a colpo d'occhio per chi
 * vuole solo capire cosa contiene. Il marcatore (`=== percorso ===`) rende il
 * confine fra un file e l'altro non ambiguo, sia per una persona sia per uno
 * script che volesse ri-separarli.
 */

/** Le righe Given/When/Then/And/But di un file, solo il testo (senza indentazione, senza keyword). */
function righeStep(contenuto: string): string[] {
  const risultato: string[] = [];
  for (const grezza of contenuto.split(/\r?\n/)) {
    const m = grezza.trim().match(/^(?:Given|When|Then|And|But)\s+(.*)$/);
    if (m) risultato.push(m[1].trim());
  }
  return risultato;
}

/**
 * `sourceRef` senza il `:riga` finale: due step definiti nello stesso file
 * (righe diverse) devono contare come UN file di definizione, non due — vedi
 * il bug che questa funzione previene, trovato provando l'esportazione sui
 * dati veri: sei dei sette step catalogati vengono dallo stesso
 * `.steps.ts`, e senza questo si sarebbe incluso quel file sei volte.
 */
function fileDiSourceRef(sourceRef: string): string {
  return sourceRef.replace(/:\d+$/, '');
}

/**
 * I file di definizione (`sourceRef` del catalogo, uno per file distinto)
 * usati da uno scenario: uno per ogni passo del file `.feature` che
 * corrisponde a uno step noto, senza doppioni, nell'ordine in cui i passi
 * compaiono la prima volta.
 *
 * Un passo che non corrisponde a nessuno step del catalogo non contribuisce:
 * non e' un errore che deve bloccare l'esportazione, e' uno stato onesto — non
 * si conosce ancora la sua definizione, quindi non la si include.
 */
export function fileDiDefinizioneUsati(
  contenutoFeature: string,
  steps: readonly CatalogStep[]
): string[] {
  const testi = righeStep(contenutoFeature);
  const perStep = steps.map((s) => ({ sourceRef: s.sourceRef, regex: espressioneInRegex(s.expression) }));
  const filiVisti = new Set<string>();
  const risultato: string[] = [];

  for (const testo of testi) {
    for (const { sourceRef, regex } of perStep) {
      if (!regex.test(testo)) continue;
      const file = fileDiSourceRef(sourceRef);
      if (!filiVisti.has(file)) {
        filiVisti.add(file);
        risultato.push(sourceRef);
      }
      break;
    }
  }

  return risultato;
}

/**
 * I percorsi di import (cosi' come scritti nel file, relativi al file stesso)
 * delle Page Object che una definizione di step importa. Riconosce solo un
 * import il cui percorso contiene `/pages/`: e' cosi' che ogni Page Object
 * generata da questo progetto viene importata (vedi i file `*.steps.ts`
 * prodotti da `bdd-generate`) — non e' un risolutore di moduli generico.
 */
export function importPagineUsate(contenutoSteps: string): string[] {
  const risultato: string[] = [];
  const pattern = /from\s+["']([^"']*\/pages\/[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(contenutoSteps)) !== null) {
    risultato.push(m[1]);
  }
  return risultato;
}

export interface FileEsportato {
  /** Percorso da mostrare nel marcatore: relativo alla radice del repository. */
  percorso: string;
  contenuto: string;
}

/** Il testo del pacchetto: un marcatore seguito dal contenuto, per ciascun file, nell'ordine dato. */
export function costruisciEsportazione(file: readonly FileEsportato[]): string {
  return file
    .map(({ percorso, contenuto }) => `=== ${percorso} ===\n${contenuto.replace(/\r\n/g, '\n')}\n`)
    .join('\n');
}
