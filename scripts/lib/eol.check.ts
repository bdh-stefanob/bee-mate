/**
 * eol.check.ts
 * ------------
 * Controlli sul confronto fra testi che vengono da un checkout git.
 *
 * Il caso che conta e' il primo: e' quello che su una macchina Windows appena
 * clonata faceva dichiarare disallineate tutte le regole e tutti gli agenti.
 *
 * Uso:  npm run check:eol
 */

import { normalizzaFineRiga, stessoTesto } from "./eol";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

console.log("\n--- fine riga ---\n");

{
  // La regola generata, come la scrive il generatore e come git la rimette
  // sul disco di una macchina Windows.
  const atteso = "---\ninclusion: always\n---\n\n# Regola\n\nTesto.\n";
  const suDisco = "---\r\ninclusion: always\r\n---\r\n\r\n# Regola\r\n\r\nTesto.\r\n";
  eq("la stessa regola con i fine riga di Windows e' allineata", stessoTesto(suDisco, atteso), true);
}

eq("un testo davvero diverso resta diverso", stessoTesto("# A\n", "# B\n"), false);
eq("una riga in meno non e' un fine riga diverso", stessoTesto("a\nb\n", "a\n"), false);
eq("un testo gia' LF non viene toccato", normalizzaFineRiga("a\nb\n"), "a\nb\n");
eq("i CRLF diventano LF", normalizzaFineRiga("a\r\nb\r\n"), "a\nb\n");
eq("un ritorno a capo isolato non e' un fine riga", normalizzaFineRiga("a\rb"), "a\rb");

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
