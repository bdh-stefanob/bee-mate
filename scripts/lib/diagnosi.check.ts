/**
 * diagnosi.check.ts
 * -----------------
 * (F6) **Il primo avvio su una macchina nuova**: la diagnosi deve sempre
 * rispondere. Si lancia davvero `scripts/diagnosi.ts --json` in una cartella
 * vuota (niente `.env`, niente `reports/`, niente `bdd-targets.json`) e poi con
 * i file che una persona puo' aver rovinato a mano: BOM, JSON rotto, un tipo di
 * file che non ci si aspetta. In nessun caso un'eccezione, e quando un file non
 * si legge la voce lo NOMINA.
 *
 * Uso:  npx ts-node scripts/lib/diagnosi.check.ts
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

interface Voce {
  chiaveNome: string;
  esito: string;
  chiaveDettaglio: string;
  dati?: Record<string, string | number>;
}

const RADICE = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(RADICE, "scripts", "diagnosi.ts");
const TS_NODE = path.join(RADICE, "node_modules", "ts-node", "dist", "bin.js");

/** Lancia la diagnosi in una cartella vuota con i file dati. Mai usa la cartella vera. */
function diagnosi(file: Record<string, string>): { stato: number | null; voci: Voce[]; errore: string } {
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), "bdd-diagnosi-"));
  try {
    for (const [nome, testo] of Object.entries(file)) fs.writeFileSync(path.join(cartella, nome), testo, "utf-8");
    const r = spawnSync(process.execPath, [TS_NODE, SCRIPT, "--json"], {
      cwd: cartella,
      encoding: "utf-8",
      timeout: 120_000,
      env: { ...process.env, TS_NODE_PROJECT: path.join(RADICE, "tsconfig.json") },
    });
    let voci: Voce[] = [];
    try {
      voci = (JSON.parse(r.stdout) as { voci: Voce[] }).voci;
    } catch {
      /* resta vuoto: il caso lo segnala */
    }
    return { stato: r.status, voci, errore: r.stderr.split("\n").slice(0, 4).join(" | ") };
  } finally {
    fs.rmSync(cartella, { recursive: true, force: true });
  }
}

const voce = (voci: Voce[], nome: string): Voce | undefined => voci.find((v) => v.chiaveNome === nome);

console.log("\n--- la diagnosi risponde sempre (F6) ---\n");

{
  const r = diagnosi({});
  eq("cartella vuota: esce con 0", r.stato, 0);
  eq("cartella vuota: risponde con delle voci", r.voci.length > 0, true);
  eq("cartella vuota: Ambienti dice che manca", voce(r.voci, "diagnosi.ambienti.nome")?.chiaveDettaglio, "diagnosi.ambienti.nessuno");
  eq("cartella vuota: il catalogo e' assente, non un errore", voce(r.voci, "diagnosi.catalogo.nome")?.chiaveDettaglio, "diagnosi.catalogo.assente");
}

{
  const bersagli = JSON.stringify({ demo: { url: "https://demo.invalid", login: { steps: [{ value: "${VAR_PROVA_F6}" }] } } });
  const r = diagnosi({ "bdd-targets.json": "﻿" + bersagli });
  eq("bdd-targets.json con il BOM: esce con 0", r.stato, 0);
  const a = voce(r.voci, "diagnosi.ambienti.nome");
  eq("bdd-targets.json con il BOM: si legge (l'ambiente e' riconosciuto)", a?.chiaveDettaglio, "diagnosi.ambienti.nessunoUtilizzabileVariabili");
  eq("bdd-targets.json con il BOM: porta il NOME della variabile", a?.dati?.variabili, "VAR_PROVA_F6");
  eq("bdd-targets.json con il BOM: porta il nome dell'ambiente", a?.dati?.ambienti, "demo");
}

{
  const r = diagnosi({ "bdd-targets.json": "{ rotto" });
  eq("bdd-targets.json rotto: esce con 0", r.stato, 0);
  const a = voce(r.voci, "diagnosi.ambienti.nome");
  eq("bdd-targets.json rotto: la voce dice che non si legge", a?.chiaveDettaglio, "diagnosi.ambienti.illeggibile");
  eq("bdd-targets.json rotto: nomina il file", a?.dati?.file, "bdd-targets.json");
}

{
  const r = diagnosi({ "bdd-targets.json": "[1, 2]" });
  eq("bdd-targets.json che non e' un elenco: nessuna eccezione", r.stato, 0);
  eq("bdd-targets.json che non e' un elenco: nomina il file", voce(r.voci, "diagnosi.ambienti.nome")?.dati?.file, "bdd-targets.json");
}

{
  const r = diagnosi({ "bdd-targets.json": JSON.stringify({ vuoto: null }) });
  eq("un ambiente `null` nel file: nessuna eccezione", r.stato, 0);
}

{
  const r = diagnosi({ "step-catalog.json": "{ rotto" });
  eq("step-catalog.json rotto: esce con 0", r.stato, 0);
  const c = voce(r.voci, "diagnosi.catalogo.nome");
  eq("step-catalog.json rotto: la voce dice che non si legge", c?.chiaveDettaglio, "diagnosi.catalogo.illeggibile");
  eq("step-catalog.json rotto: nomina il file", c?.dati?.file, "step-catalog.json");
}

{
  const r = diagnosi({ "step-catalog.json": "﻿" + JSON.stringify({ steps: [{ components: [{}] }, {}] }) });
  eq("step-catalog.json con il BOM: si legge", voce(r.voci, "diagnosi.catalogo.nome")?.chiaveDettaglio, "diagnosi.catalogo.riepilogo");
  eq("step-catalog.json con il BOM: conta gli step", voce(r.voci, "diagnosi.catalogo.nome")?.dati?.steps, 2);
}

{
  const r = diagnosi({ "step-catalog.json": "[]" });
  eq("step-catalog.json che non e' un catalogo: nessuna eccezione", r.stato, 0);
}

{
  const r = diagnosi({ ".env": "﻿CHIAVE_PROVA=1\r\n" });
  eq(".env con il BOM e CRLF: nessuna eccezione", r.stato, 0);
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
