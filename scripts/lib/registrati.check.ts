/**
 * registrati.check.ts — quali scenari sono usciti da una registrazione.
 *
 * Uso:  npm run check:registrati
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { eRegistrato, scenariRegistrati } from "./registrati";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

console.log("\n--- scenari registrati ---\n");

eq("il tag sopra la Feature lo dice", eRegistrato("# generato-da: bdd-generate\n\n@shop @orders @generato\nFeature: x\n"), true);
eq("il marcatore nel commento non basta: serve il tag", eRegistrato("# generato-da: bdd-generate\nFeature: x\n"), false);
eq("un tag simile non e' il tag", eRegistrato("@generatore\nFeature: x\n"), false);
eq("un @generato su uno scenario non fa registrata la Feature", eRegistrato("Feature: x\n  @generato\n  Scenario: y\n"), false);

const radice = fs.mkdtempSync(path.join(os.tmpdir(), "registrati-"));
try {
  const scrivi = (rel: string, testo: string): void => {
    fs.mkdirSync(path.dirname(path.join(radice, rel)), { recursive: true });
    fs.writeFileSync(path.join(radice, rel), testo);
  };
  scrivi("generated/s1.feature", "@generato @da-rivedere\nFeature: s1\n");
  scrivi("shop/orders/new-order.feature", "@shop @orders @generato\nFeature: New order\n");
  scrivi("shop/orders/a-mano.feature", "@shop @orders\nFeature: A mano\n");
  eq(
    "trova i registrati sia nella loro cartella sia nell'albero, e non gli altri",
    scenariRegistrati(radice).map((f) => path.relative(radice, f).replace(/\\/g, "/")),
    ["generated/s1.feature", "shop/orders/new-order.feature"]
  );
  eq("una cartella che non c'e' da' un elenco vuoto", scenariRegistrati(path.join(radice, "manca")), []);
} finally {
  fs.rmSync(radice, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
