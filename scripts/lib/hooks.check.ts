/**
 * hooks.check.ts
 * --------------
 * Controlli sull'automatismo che scatta dopo una scrittura dell'assistente.
 *
 * L'ultimo caso e' quello che conta piu' di tutti: verifica che l'hook sia
 * davvero dichiarato nell'agente generato e punti a uno script che esiste.
 * L'automatismo precedente era scritto in un formato inesistente e non lo
 * leggeva nessuno — sembrava un pezzo di metodo, ed era configurazione morta.
 *
 * Uso:  npm run check:hooks
 */

import * as fs from "fs";
import * as path from "path";
import { controlloPer, percorsoScritto } from "./hooks";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

console.log("\n--- quale giudice per quale file ---\n");

eq("uno scenario si valida", controlloPer("src/features/x.feature")?.comando, "npm run validate:steps");
eq("una step definition rigenera il catalogo", controlloPer("src/steps/x.steps.ts")?.comando, "npm run catalog");
eq("un .ts qualunque non scatena niente", controlloPer("scripts/lib/gold.ts"), null);
eq("un documento non scatena niente", controlloPer("docs/anti-entropy/README.md"), null);
eq("percorso Windows con le barre rovesciate", controlloPer("src\\features\\x.feature")?.comando, "npm run validate:steps");
eq("estensione in maiuscolo", controlloPer("SRC/FEATURES/X.FEATURE")?.comando, "npm run validate:steps");

console.log("\n--- l'evento ---\n");

eq(
  "il percorso si legge da tool_input",
  percorsoScritto({ tool_name: "fs_write", tool_input: { command: "create", path: "a/b.feature" } }),
  "a/b.feature"
);
eq("un evento senza percorso non fa cadere niente", percorsoScritto({ tool_name: "fs_write" }), null);
eq("un evento vuoto nemmeno", percorsoScritto(null), null);

console.log("\n--- l'hook e' dichiarato dove l'engine lo legge ---\n");

{
  const file = path.join(".kiro", "agents", "bdd-generate.json");
  const agente = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf-8")) as {
        hooks?: { postToolUse?: Array<{ matcher?: string; command?: string }> };
      })
    : {};
  const post = agente.hooks?.postToolUse ?? [];
  eq("l'agente che scrive ha un hook postToolUse", post.length > 0, true);
  eq("scatta sulle scritture di file", post[0]?.matcher, "fs_write");

  const comando = post[0]?.command ?? "";
  // Il pezzo che e' un percorso di file: se lo script non c'e', l'hook fallisce
  // a ogni scrittura, ed e' il genere di guasto che si disattiva invece di
  // correggersi.
  const script = comando.split(/\s+/).find((p) => p.endsWith(".ts")) ?? "";
  eq("e lancia uno script che esiste", script !== "" && fs.existsSync(script), true);
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
