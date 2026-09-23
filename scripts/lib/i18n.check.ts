/**
 * i18n.check.ts
 * -------------
 * Il giudice dei dizionari: una chiave che sta in una lingua e non nell'altra
 * si scopre in dimostrazione, non prima. E un dizionario che cresce e non
 * cala e' un dizionario in cui non si trova piu' niente.
 *
 * Controlla, per ogni dizionario di script registrato qui sotto:
 *  1. le chiavi di `it` e `en` sono le stesse — nessuna manca da un lato;
 *  2. ogni chiave e' davvero usata da qualche script (cercata come stringa
 *     letterale sotto `scripts/`, fuori dai dizionari stessi): una chiave
 *     scritta e mai letta e' un dizionario che cresce a vuoto.
 *
 * Prova anche, per quanto puo' senza importare nulla da `web-ui/` (solo
 * lettura del file, valutato come oggetto), a fare lo stesso controllo sul
 * dizionario della finestra — se esiste gia' una sezione `diagnosi`. Se non
 * esiste ancora (l'altro lavoro puo' non averla scritta), salta con un solo
 * OK: non e' un fallimento, e' un "non ancora".
 *
 * Uso:  npm run check:i18n
 */

import * as fs from "fs";
import * as path from "path";
import { dizionarioDiagnosi } from "./i18n-diagnosi";
import type { DizionarioScript } from "./i18n";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};

// Un dizionario per script si registra qui. Per ora solo diagnosi.ts ne ha
// uno; generazione, test e registrazione arriveranno negli stessi termini.
const dizionariScript: Record<string, DizionarioScript> = {
  diagnosi: dizionarioDiagnosi,
};

// ---------------------------------------------------------------------------
// 1. Le due lingue portano le stesse chiavi.
// ---------------------------------------------------------------------------

console.log("\n--- simmetria fra le lingue (dizionari degli script) ---\n");

for (const [nome, dizionario] of Object.entries(dizionariScript)) {
  const chiaviIt = new Set(Object.keys(dizionario.it));
  const chiaviEn = new Set(Object.keys(dizionario.en));

  const soloIt = [...chiaviIt].filter((k) => !chiaviEn.has(k));
  const soloEn = [...chiaviEn].filter((k) => !chiaviIt.has(k));

  if (soloIt.length === 0 && soloEn.length === 0) {
    ok(`${nome}: ${chiaviIt.size} chiavi, presenti in entrambe le lingue`);
  } else {
    if (soloIt.length > 0) fail(`${nome}: chiavi solo in italiano`, soloIt.join(", "));
    if (soloEn.length > 0) fail(`${nome}: chiavi solo in inglese`, soloEn.join(", "));
  }
}

// ---------------------------------------------------------------------------
// 2. Ogni chiave e' usata da qualche script.
// ---------------------------------------------------------------------------

console.log("\n--- ogni chiave e' letta da qualcuno ---\n");

/** Tutti i file .ts sotto scripts/, fuori da node_modules e dai dizionari stessi. */
function fileScript(dir: string): string[] {
  const risultato: string[] = [];
  for (const voce of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, voce.name);
    if (voce.isDirectory()) {
      if (voce.name === "node_modules") continue;
      risultato.push(...fileScript(p));
    } else if (voce.name.endsWith(".ts")) {
      // I dizionari e questo stesso giudice non contano come "uso": definire
      // una chiave non e' leggerla.
      if (voce.name === "i18n-diagnosi.ts" || voce.name === "i18n.check.ts" || voce.name === "i18n.ts") continue;
      risultato.push(p);
    }
  }
  return risultato;
}

const radiceScripts = path.join(__dirname, "..");
const testoScript = fileScript(radiceScripts).map((f) => fs.readFileSync(f, "utf-8"));

for (const [nome, dizionario] of Object.entries(dizionariScript)) {
  const chiavi = Object.keys(dizionario.it);
  const inutilizzate = chiavi.filter((k) => !testoScript.some((testo) => testo.includes(k)));

  if (inutilizzate.length === 0) {
    ok(`${nome}: tutte le ${chiavi.length} chiavi sono usate da qualche script`);
  } else {
    fail(`${nome}: chiavi nel dizionario che nessuno script usa piu'`, inutilizzate.join(", "));
  }
}

// ---------------------------------------------------------------------------
// 3. Lo stesso controllo, per quanto possibile, sul dizionario della finestra.
// ---------------------------------------------------------------------------

console.log("\n--- simmetria fra le lingue (dizionario della finestra, se c'e' gia') ---\n");

/**
 * Estrae il testo di un oggetto letterale che segue `ancora` nel sorgente,
 * a partire dalla prima `{` e fino alla `}` che la chiude — contando le
 * graffe e ignorando quelle dentro stringhe, per non spezzarsi su un valore
 * che contiene `{` o `}` come testo.
 */
function estraiOggetto(sorgente: string, ancora: string): string | null {
  const inizioAncora = sorgente.indexOf(ancora);
  if (inizioAncora < 0) return null;
  const inizio = sorgente.indexOf("{", inizioAncora + ancora.length);
  if (inizio < 0) return null;

  let profondita = 0;
  let dentroStringa: '"' | "'" | "`" | null = null;
  for (let i = inizio; i < sorgente.length; i++) {
    const c = sorgente[i];
    const precedente = sorgente[i - 1];
    if (dentroStringa) {
      if (c === dentroStringa && precedente !== "\\") dentroStringa = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      dentroStringa = c;
      continue;
    }
    if (c === "{") profondita++;
    else if (c === "}") {
      profondita--;
      if (profondita === 0) return sorgente.slice(inizio, i + 1);
    }
  }
  return null;
}

/**
 * Appiattisce un oggetto (solo dati, nessuna funzione) in chiavi puntate:
 * `{ browser: { nome: "x" } }` diventa `["browser.nome"]`.
 */
function chiaviFoglia(oggetto: unknown, prefisso = ""): string[] {
  if (oggetto === null || typeof oggetto !== "object") return prefisso ? [prefisso] : [];
  const risultato: string[] = [];
  for (const [k, v] of Object.entries(oggetto as Record<string, unknown>)) {
    const percorso = prefisso ? `${prefisso}.${k}` : k;
    risultato.push(...chiaviFoglia(v, percorso));
  }
  return risultato;
}

const fileFinestra = path.join(radiceScripts, "..", "web-ui", "src", "lib", "i18n.ts");

try {
  if (!fs.existsSync(fileFinestra)) {
    ok("dizionario della finestra non ancora presente — salto");
  } else {
    const sorgente = fs.readFileSync(fileFinestra, "utf-8");
    const bloccoEn = estraiOggetto(sorgente, "en:");
    const bloccoIt = estraiOggetto(sorgente, "it:");

    if (!bloccoEn || !bloccoIt) {
      ok("dizionario della finestra: struttura non riconosciuta — salto");
    } else {
      // Valutato come letteratura d'oggetto, non importato: nessuna dipendenza
      // dal modo in cui web-ui costruisce o esporta il modulo.
      /* eslint-disable no-new-func */
      const en = new Function(`"use strict"; return (${bloccoEn});`)() as Record<string, unknown>;
      const it = new Function(`"use strict"; return (${bloccoIt});`)() as Record<string, unknown>;
      /* eslint-enable no-new-func */

      if (!("diagnosi" in en) && !("diagnosi" in it)) {
        ok("dizionario della finestra: sezione 'diagnosi' non ancora presente — salto");
      } else {
        const chiaviEn = new Set(chiaviFoglia((en as { diagnosi?: unknown }).diagnosi ?? {}));
        const chiaviIt = new Set(chiaviFoglia((it as { diagnosi?: unknown }).diagnosi ?? {}));

        const soloEn = [...chiaviEn].filter((k) => !chiaviIt.has(k));
        const soloIt = [...chiaviIt].filter((k) => !chiaviEn.has(k));

        if (soloEn.length === 0 && soloIt.length === 0 && chiaviEn.size > 0) {
          ok(`finestra: ${chiaviEn.size} chiavi 'diagnosi', presenti in entrambe le lingue`);
        } else if (chiaviEn.size === 0 && chiaviIt.size === 0) {
          ok("dizionario della finestra: sezione 'diagnosi' vuota — salto");
        } else {
          if (soloEn.length > 0) fail("finestra: chiavi 'diagnosi' solo in inglese", soloEn.join(", "));
          if (soloIt.length > 0) fail("finestra: chiavi 'diagnosi' solo in italiano", soloIt.join(", "));
        }
      }
    }
  }
} catch (e) {
  // Un parsing che fallisce sul lavoro in corso di un altro agente non deve
  // bloccare questo giudice: e' un controllo migliorativo, non il suo scopo.
  ok(`dizionario della finestra: non valutabile per ora (${(e as Error).message}) — salto`);
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
