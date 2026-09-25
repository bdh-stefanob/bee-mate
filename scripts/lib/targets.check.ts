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
import { accessoRegistrato } from "./targets";

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

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
