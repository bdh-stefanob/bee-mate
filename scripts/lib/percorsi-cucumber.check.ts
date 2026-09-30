/**
 * percorsi-cucumber.check.ts
 * ---------------------------
 * Scegliere un solo scenario nella schermata Esegui deve eseguire QUELLO.
 *
 * Il difetto che questo controllo ferma (collaudo del 30/9): la finestra
 * mandava il file scelto, ma Cucumber UNISCE i percorsi di `cucumber.js` a
 * quelli della riga di comando. Risultato: qualunque scelta eseguiva tutti gli
 * scenari con glue, e il rosso di un'altra applicazione finiva nella schermata
 * di chi voleva provare il proprio.
 *
 * Non serve un browser: e' un dry-run, che risolve i percorsi e i passi senza
 * eseguirli.
 *
 * Uso:  npx ts-node scripts/lib/percorsi-cucumber.check.ts
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..", "..");
const TMP = path.join(ROOT, "reports", ".percorsi-check");

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

console.log("\n--- percorsi di Cucumber ---\n");

/** Un passo che esiste davvero (src/steps/common/verifica.steps.ts). */
const feature = (nome: string): string =>
  `Feature: ${nome}\n  Scenario: ${nome}\n    Then the page shows "x"\n`;

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const a = path.join(TMP, "a.feature");
const b = path.join(TMP, "b.feature");
fs.writeFileSync(a, feature("scenario a"));
fs.writeFileSync(b, feature("scenario b"));

function scenariEseguiti(percorsi: string[]): string[] {
  const out = path.join(TMP, "messaggi.ndjson");
  execFileSync(
    process.execPath,
    [path.join(ROOT, "node_modules", "@cucumber", "cucumber", "bin", "cucumber.js"), "--dry-run", "--format", `message:${out}`],
    { cwd: ROOT, stdio: "pipe", env: { ...process.env, BDD_PATHS: percorsi.join(";") } }
  );
  return fs
    .readFileSync(out, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { pickle?: { name: string } })
    .filter((m) => m.pickle)
    .map((m) => m.pickle!.name);
}

try {
  eq("un percorso scelto: si esegue solo quello", scenariEseguiti([a]), ["scenario a"]);
  eq("due percorsi scelti: solo quei due", scenariEseguiti([a, b]).sort(), ["scenario a", "scenario b"]);
} catch (err) {
  fail("il dry-run", (err as Error).message);
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
