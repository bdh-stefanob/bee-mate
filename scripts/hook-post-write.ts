/**
 * hook-post-write.ts
 * ------------------
 * Dopo che l'assistente ha scritto un file, lancia il giudice che gli tocca.
 *
 * COME VIENE CHIAMATO
 * Da un hook `postToolUse` con matcher `fs_write`, dichiarato dentro l'agente
 * (`.amazonq/cli-agents/bdd-generate.json` → generato in `.kiro/agents/`).
 * L'evento arriva su stdin come JSON:
 *
 *   { "hook_event_name": "postToolUse", "cwd": "...", "tool_name": "fs_write",
 *     "tool_input": { "path": "src/features/x.feature", ... }, "tool_response": {...} }
 *
 * PERCHE' PROPAGA L'ESITO
 * Un exit code diverso da 0 fa arrivare lo stderr all'assistente come avviso:
 * e' il modo in cui scopre di aver scritto qualcosa che non passa, invece di
 * dichiarare finito un lavoro che non lo e'. Il giudizio resta deterministico e
 * non passa da lui — qui si limita a scattare da solo.
 *
 * Su un file che non ha un giudice (un `.md`, un JSON) esce 0 in silenzio: un
 * hook rumoroso viene disattivato, e allora non protegge piu' niente.
 */

import { execSync } from "child_process";
import * as fs from "fs";
import { controlloPer, percorsoScritto } from "./lib/hooks";

function eventoDaStdin(): unknown {
  try {
    // Il descrittore 0 funziona in ogni shell: niente dipendenze dal modo in
    // cui l'hook viene invocato.
    const testo = fs.readFileSync(0, "utf-8").trim();
    return testo ? JSON.parse(testo) : null;
  } catch {
    return null;
  }
}

function main(): void {
  const percorso = percorsoScritto(eventoDaStdin());
  if (!percorso) process.exit(0);

  const controllo = controlloPer(percorso);
  if (!controllo) process.exit(0);

  console.log(`\n  ${percorso}\n  ${controllo.perche}\n  → ${controllo.comando}\n`);
  try {
    // `shell: true` perche' su Windows npm e' uno script, non un eseguibile.
    execSync(controllo.comando, { stdio: "inherit", shell: true } as never);
  } catch (err) {
    process.exit((err as { status?: number }).status ?? 1);
  }
}

main();
