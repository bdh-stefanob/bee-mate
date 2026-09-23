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

/**
 * I dizionari della finestra: due file JSON, uno per lingua.
 *
 * Questa parte cercava un modulo TypeScript che non e' mai esistito, e quindi
 * stampava "salto" e passava — sempre. Un giudice che passa sempre e' peggio
 * di nessun giudice: da' fiducia senza averla guadagnata. Ora guarda i file
 * veri, e se non li trova FALLISCE invece di scusarsi: i dizionari ci sono, e
 * se sparissero vorremmo saperlo.
 */
const cartellaMessaggi = path.join(radiceScripts, "..", "web-ui", "messages");
const fileEn = path.join(cartellaMessaggi, "en.json");
const fileIt = path.join(cartellaMessaggi, "it.json");

if (!fs.existsSync(fileEn) || !fs.existsSync(fileIt)) {
  fail(
    "dizionari della finestra non trovati",
    `attesi ${path.relative(process.cwd(), fileEn)} e ${path.relative(process.cwd(), fileIt)}`
  );
} else {
  const en = JSON.parse(fs.readFileSync(fileEn, "utf-8")) as Record<string, unknown>;
  const it = JSON.parse(fs.readFileSync(fileIt, "utf-8")) as Record<string, unknown>;

  const chiaviEn = new Set(chiaviFoglia(en));
  const chiaviIt = new Set(chiaviFoglia(it));

  const soloEn = [...chiaviEn].filter((k) => !chiaviIt.has(k));
  const soloIt = [...chiaviIt].filter((k) => !chiaviEn.has(k));

  if (soloEn.length > 0) fail("finestra: chiavi solo in inglese", soloEn.join(", "));
  if (soloIt.length > 0) fail("finestra: chiavi solo in italiano", soloIt.join(", "));
  if (soloEn.length === 0 && soloIt.length === 0) {
    ok(`finestra: ${chiaviEn.size} chiavi, presenti in tutt'e due le lingue`);
  }

  // Le chiavi che la diagnosi manda devono esistere nei dizionari della
  // finestra: e' il confine fra i due mondi, ed e' il punto in cui un buco
  // non si vedrebbe fino a quando il tester non apre quella schermata.
  // Quali chiavi ATTRAVERSANO il confine.
  //
  // Non quelle che questa macchina emette oggi: quelle dipendono dallo stato
  // in cui si trova, e un ramo che qui non si accende accenderebbe altrove.
  // Si prendono TUTTE le chiavi del dizionario della diagnosi, meno quelle che
  // vivono solo nel terminale — l'intestazione e la chiusura del referto, che
  // la finestra non mostra e pretenderle sarebbe un allarme falso. Un giudice
  // che grida al lupo viene spento.
  const SOLO_TERMINALE = ["diagnosi.intestazione", "diagnosi.prossimaCosa.", "diagnosi.tuttoApposto.", "diagnosi.nota"];
  const cheAttraversano = Object.keys(dizionariScript["diagnosi"]?.it ?? {}).filter(
    (k) => !SOLO_TERMINALE.some((p) => k === p || k.startsWith(p))
  );

  const mancantiNellaFinestra = cheAttraversano.filter((k) => !chiaviEn.has(k));
  if (mancantiNellaFinestra.length > 0) {
    fail(
      "la diagnosi manda chiavi che la finestra non sa tradurre",
      mancantiNellaFinestra.join(", ")
    );
  } else {
    ok(`le ${cheAttraversano.length} chiavi che la diagnosi manda alla finestra hanno tutte la loro traduzione`);
  }
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
