/**
 * browser-sources.check.ts
 * ------------------------
 * I due sorgenti che finiscono dentro al browser sono **stringhe**: la sonda del
 * DOM e la barra del recorder.
 *
 * PERCHE' SERVE UN CONTROLLO APPOSTA
 * `tsc` non li legge. Per lui sono testo, e un errore di sintassi la' dentro
 * compila benissimo: si scopre col browser aperto, a meta' di una registrazione
 * vera, e sembra un guasto dello strumento invece che un refuso. Qui vengono
 * compilati per davvero con `new Function`, che fa esattamente il parsing che
 * farebbe il browser, senza eseguirli.
 *
 * Il secondo controllo e' la lezione dei backtick: sono stringhe `String.raw`,
 * e un backtick — anche dentro un commento — chiude il template e rompe il file
 * che le contiene. E' successo tre volte.
 *
 * Uso:  npm run check:browser
 */

import { DOM_PROBE_SOURCE } from "./dom-probe";
import { RECORDER_OVERLAY_SOURCE } from "./recorder-overlay";
import { eseguibileMancante } from "./browser";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};

function compila(nome: string, sorgente: string): void {
  try {
    // Solo parsing: la funzione non viene chiamata. Nel browser quel codice
    // tocca il DOM, qui non c'e' e non serve.
    new Function(sorgente);
    ok(`${nome}: sintassi valida (${sorgente.length} caratteri)`);
  } catch (err) {
    fail(`${nome}: sintassi non valida`, (err as Error).message);
  }
}

function senzaBacktick(nome: string, sorgente: string): void {
  const i = sorgente.indexOf("`");
  if (i < 0) {
    ok(`${nome}: nessun backtick`);
    return;
  }
  const riga = sorgente.slice(0, i).split("\n").length;
  fail(`${nome}: backtick alla riga ${riga} del sorgente iniettato`, sorgente.slice(Math.max(0, i - 60), i + 20));
}

console.log("\n--- codice iniettato nel browser ---\n");

compila("dom-probe", DOM_PROBE_SOURCE);
compila("recorder-overlay", RECORDER_OVERLAY_SOURCE);
senzaBacktick("dom-probe", DOM_PROBE_SOURCE);
senzaBacktick("recorder-overlay", RECORDER_OVERLAY_SOURCE);

// Cio' che il resto del codice si aspetta di trovare esposto sulla finestra.
for (const atteso of ["describeAny", "describe", "closestInteractive", "isVisible"]) {
  if (DOM_PROBE_SOURCE.includes(`${atteso}:`)) ok(`dom-probe espone ${atteso}`);
  else fail(`dom-probe non espone piu' ${atteso}`, "chi lo chiama fallirebbe solo a browser aperto");
}

console.log("\n--- ripiego tra i browser ---\n");

// Ogni browser assente deve far provare il successivo: il recorder preferisce
// Chrome, e su una macchina senza Chrome deve arrivare al Chromium di Playwright.
const mancanti: Array<[string, string]> = [
  ["Chromium di Playwright non scaricato", "browserType.launch: Executable doesn't exist at /x/chrome"],
  ["Chrome non installato", "browserType.launch: Chromium distribution 'chrome' is not found at /opt/google/chrome/chrome"],
  ["Edge non installato", "browserType.launch: Chromium distribution 'msedge' is not found at /opt/microsoft/msedge/msedge"],
];
for (const [caso, messaggio] of mancanti) {
  if (eseguibileMancante(new Error(messaggio))) ok(`${caso}: si prova il browser successivo`);
  else fail(`${caso}: non riconosciuto come browser mancante`, "il ripiego si fermerebbe qui");
}
if (!eseguibileMancante(new Error("browserType.launch: Target page, context or browser has been closed"))) {
  ok("un errore diverso non fa ripiegare");
} else {
  fail("un errore diverso fa ripiegare", "tre canali ripeterebbero lo stesso errore");
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
