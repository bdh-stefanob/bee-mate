/**
 * targets.check.ts
 * -----------------
 * (F4) Un ambiente con indirizzo risolto e credenziali a posto non e'
 * ancora un ambiente su cui qualcuno ha fatto l'accesso: `accessoRegistrato`
 * e' la sola domanda che decide se la diagnosi puo' dire "tutto ok" invece
 * di "configurato, ma nessuno l'ha ancora aperto". Se questa domanda
 * rispondesse "si'" troppo presto, la schermata di controllo tornerebbe a
 * mentire — lo stesso difetto gia' visto altrove in questo giro di verifica.
 *
 * Uso:  npx ts-node scripts/lib/targets.check.ts
 */

import * as path from "path";
import type { Target } from "./targets";
import { accessoRegistrato, passwordDelBersaglio } from "./targets";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

console.log("\n--- accessoRegistrato (F4) ---\n");

const bersaglio = (parziale: Partial<Target>): Target => ({
  name: "demo",
  url: "https://demo.invalid",
  session: "reports/sessions/inesistente-per-il-check.json",
  ...parziale,
});

eq(
  "appena aggiunto — niente sessione, niente login — non e' un accesso registrato",
  accessoRegistrato(bersaglio({})),
  false
);

eq(
  "un login automatico configurato conta come accesso registrato",
  accessoRegistrato(bersaglio({ login: { steps: [] } })),
  true
);

eq(
  "una sessione salvata su disco conta come accesso registrato",
  // Questo file esiste di sicuro: e' se stesso.
  accessoRegistrato(bersaglio({ session: path.resolve(__filename) })),
  true
);

console.log("\n--- la password viene dall'ambiente, non da un nome fisso ---\n");

// Il difetto che questo caso ferma (collaudo del 30/9): il test generato leggeva
// `APP_PASSWORD`, un nome che nessuna schermata scrive. Le credenziali di un
// ambiente stanno nel suo blocco `login`, come ${VARIABILE} risolta da .env, e
// le scrive il Controllo. Il test deve prendere da li' la password.
process.env["CHECK_PWD_DEMO"] = "valore-di-prova";
const conLogin = (value: string, fill: { role?: string; name?: string; selector?: string }): Target =>
  bersaglio({
    login: { steps: [{ fill: { role: "textbox", name: "Username" }, value: "utente" }, { fill, value }] },
  });

eq(
  "la password e' quella del campo password del login, con ${VARIABILE} risolta",
  passwordDelBersaglio(conLogin("${CHECK_PWD_DEMO}", { selector: 'input[type="password"]' })),
  "valore-di-prova"
);
eq(
  "si riconosce anche per nome del campo",
  passwordDelBersaglio(conLogin("segreta", { role: "textbox", name: "Password" })),
  "segreta"
);
eq("un ambiente senza login non ha una password", passwordDelBersaglio(bersaglio({})), undefined);
eq(
  "una variabile mancante non diventa una password vuota che sembra buona",
  passwordDelBersaglio(conLogin("${CHECK_VARIABILE_INESISTENTE}", { selector: "#password" })),
  undefined
);

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
