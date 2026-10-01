/**
 * leggi-json.check.ts
 * -------------------
 * (F6) Un file che una persona puo' aver salvato a mano (`bdd-targets.json`,
 * `step-catalog.json`...) comincia con un BOM se passa dal Blocco note o da
 * PowerShell 5.1: `JSON.parse` esplode con "Unexpected token" e l'intera
 * diagnosi cade. E quando il file e' davvero rotto, l'errore deve nominare
 * il file, non lo stack.
 *
 * Uso:  npx ts-node scripts/lib/leggi-json.check.ts
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { FileNonLeggibile, leggiJson, leggiTesto, senzaBom } from "./leggi-json";
import { loadTargets, requiredVars } from "./targets";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

const cartella = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-leggi-json-"));
const scrivi = (nome: string, testo: string): string => {
  const p = path.join(cartella, nome);
  fs.writeFileSync(p, testo, "utf-8");
  return p;
};

console.log("\n--- leggiJson (F6) ---\n");

eq("senzaBom toglie il BOM iniziale", senzaBom("﻿{\"a\":1}"), "{\"a\":1}");
eq("senzaBom lascia stare un testo senza BOM", senzaBom("{\"a\":1}"), "{\"a\":1}");
eq("un JSON normale si legge", leggiJson(scrivi("normale.json", "{\"a\":1}")), { a: 1 });
eq("un JSON con il BOM si legge", leggiJson(scrivi("bom.json", "﻿{\"a\":1}")), { a: 1 });
eq("leggiTesto toglie il BOM anche dal testo", leggiTesto(scrivi("env.txt", "﻿CHIAVE=1")), "CHIAVE=1");

const rotto = scrivi("rotto.json", "{ rotto");
try {
  leggiJson(rotto);
  fail("un JSON rotto deve dare errore", "non ha dato errore");
} catch (e) {
  eq("l'errore e' di tipo FileNonLeggibile", e instanceof FileNonLeggibile, true);
  const m = (e as Error).message;
  eq("il messaggio nomina il file", m.includes("rotto.json"), true);
  eq("il messaggio non contiene uno stack", /\n\s+at /.test(m), false);
}

try {
  leggiJson(path.join(cartella, "non-esiste.json"));
  fail("un file assente deve dare errore", "non ha dato errore");
} catch (e) {
  eq(
    "un file assente da' FileNonLeggibile col nome del file",
    e instanceof FileNonLeggibile && (e as Error).message.includes("non-esiste.json"),
    true
  );
}

console.log("\n--- i bersagli con il BOM (F6) ---\n");

const conBom = scrivi(
  "targets-bom.json",
  "﻿" + JSON.stringify({ demo: { url: "https://demo.invalid", login: { steps: [{ value: "${VAR_PROVA_F6}" }] } } })
);
eq("loadTargets legge un file con il BOM", loadTargets(conBom).map((t) => t.name), ["demo"]);
eq("requiredVars legge un file con il BOM", [...requiredVars(conBom)], [["demo", ["VAR_PROVA_F6"]]]);

fs.rmSync(cartella, { recursive: true, force: true });
console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
