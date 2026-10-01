/**
 * cucumber-parallelo.check.ts
 * ----------------------------
 * Due ipotesi su Cucumber 10.9 che la spec dell'esecuzione avanzata dichiarava
 * "non provate", e che un dry-run non puo' provare perche' chiedono scenari che
 * partono davvero (con un browser, nascosto, senza rete):
 *
 *   1. `--fail-fast`: dopo il primo rosso gli scenari che restano escono
 *      SALTATI nel flusso di messaggi — e' cosi' che la schermata li mostrera' —
 *      e non spariscono.
 *   2. `--parallel N` con il formatter `message`: il flusso contiene ogni scenario
 *      una volta sola, con tutti i suoi passi, anche se i messaggi di scenari
 *      diversi si mescolano.
 *
 * Gli scenari usano passi scritti qui (un'attesa, un rosso voluto): non toccano
 * nessuna applicazione. Il browser serve perche' l'hook `Before` ne apre uno per
 * scenario. Senza browser il controllo dice "NON VERIFICATO" e non finge.
 *
 * Uso:  npx ts-node scripts/lib/cucumber-parallelo.check.ts
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { avviaBrowser } from "./browser";

const ROOT = path.join(__dirname, "..", "..");
const TMP = path.join(ROOT, "reports", ".parallelo-check");

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

interface Messaggio {
  pickle?: { id: string; name: string };
  testCase?: { id: string; pickleId: string };
  testCaseStarted?: { id: string; testCaseId: string };
  testCaseFinished?: { testCaseStartedId: string };
  testStepFinished?: { testCaseStartedId: string; testStepResult: { status: string } };
}

interface Esito {
  codice: number | null;
  iniziati: string[];
  /** Per scenario: lo stato di ogni passo (hook compresi), nell'ordine in cui arrivano. */
  stati: Record<string, string[]>;
  finiti: string[];
  messaggi: number;
  stderr: string;
}

function esegui(nome: string, percorsi: string[], extra: string[] = []): Esito {
  const out = path.join(TMP, `${nome}.ndjson`);
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "@cucumber", "cucumber", "bin", "cucumber.js"),
      "--require", path.join(TMP, "passi.js"),
      "--format", `message:${out}`,
      ...extra,
    ],
    {
      cwd: ROOT,
      encoding: "utf-8",
      // BASE_URL vuoto di proposito: nessun indirizzo, nessuna rete. `about:blank`
      // evita l'avviso di "nessun indirizzo" senza portare da nessuna parte.
      env: { ...process.env, BDD_PATHS: percorsi.join(";"), BASE_URL: "about:blank", BDD_HTML: path.join(TMP, `${nome}.html`) },
    }
  );
  const messaggi: Messaggio[] = fs.existsSync(out)
    ? fs.readFileSync(out, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Messaggio)
    : [];
  const nomePerPickle = new Map<string, string>();
  for (const m of messaggi) if (m.pickle) nomePerPickle.set(m.pickle.id, m.pickle.name);
  const nomePerCase = new Map<string, string>();
  for (const m of messaggi) if (m.testCase) nomePerCase.set(m.testCase.id, nomePerPickle.get(m.testCase.pickleId) ?? "?");
  const nomePerStart = new Map<string, string>();
  for (const m of messaggi) {
    if (m.testCaseStarted) nomePerStart.set(m.testCaseStarted.id, nomePerCase.get(m.testCaseStarted.testCaseId) ?? "?");
  }
  const stati: Record<string, string[]> = {};
  for (const m of messaggi) {
    if (!m.testStepFinished) continue;
    const n = nomePerStart.get(m.testStepFinished.testCaseStartedId) ?? "?";
    (stati[n] ??= []).push(m.testStepFinished.testStepResult.status);
  }
  return {
    codice: r.status,
    iniziati: messaggi.filter((m) => m.testCaseStarted).map((m) => nomePerStart.get(m.testCaseStarted!.id) ?? "?"),
    stati,
    finiti: messaggi.filter((m) => m.testCaseFinished).map((m) => nomePerStart.get(m.testCaseFinished!.testCaseStartedId) ?? "?"),
    messaggi: messaggi.length,
    stderr: r.stderr,
  };
}

async function main(): Promise<void> {
  console.log("\n--- fail-fast e --parallel con il formatter message (browser vero, nascosto) ---\n");

  try {
    const { browser } = await avviaBrowser({ headless: true });
    await browser.close();
  } catch (err) {
    console.log(`NON VERIFICATO: nessun browser disponibile (${(err as Error).message.split("\n")[0]})`);
    console.log("\nNon verificato: ne' fail-fast ne' --parallel. Nessun controllo e' fallito.");
    return;
  }

  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  fs.writeFileSync(
    path.join(TMP, "passi.js"),
    [
      `const { Given } = require("@cucumber/cucumber");`,
      `Given("the lane waits {int} ms", async function (ms) { await new Promise((r) => setTimeout(r, ms)); });`,
      `Given("the lane fails", async function () { throw new Error("rosso voluto"); });`,
      "",
    ].join("\n")
  );
  const p1 = path.join(TMP, "p1.feature");
  const p2 = path.join(TMP, "p2.feature");
  fs.writeFileSync(
    p1,
    [
      "Feature: P1",
      "  Scenario: p1 uno",
      "    Given the lane waits 200 ms",
      "",
      "  Scenario: p1 due rosso",
      "    Given the lane fails",
      "",
      "  Scenario: p1 tre",
      "    Given the lane waits 200 ms",
      "",
    ].join("\n")
  );
  fs.writeFileSync(
    p2,
    ["Feature: P2", "  Scenario: p2 uno", "    Given the lane waits 200 ms", "", "  Scenario: p2 due", "    Given the lane waits 200 ms", ""].join("\n")
  );
  const tutti = ["p1 uno", "p1 due rosso", "p1 tre", "p2 uno", "p2 due"];
  const ordina = (v: string[]): string[] => [...v].sort();

  try {
    // Di riferimento: senza opzioni un rosso non ferma gli altri.
    const continua = esegui("continua", [p1, p2]);
    eq("senza fail-fast: tutti e cinque partono, in ordine", continua.iniziati, tutti);
    eq("senza fail-fast: gli scenari dopo il rosso passano", continua.stati["p2 due"]?.every((s) => s === "PASSED"), true);
    eq("senza fail-fast: l'esito del processo e' un fallimento", continua.codice, 1);

    console.log("\n--- fail-fast ---\n");
    const ff = esegui("failfast", [p1, p2], ["--fail-fast"]);
    eq("fail-fast: i cinque scenari compaiono lo stesso nel flusso", ff.iniziati, tutti);
    eq("fail-fast: quello prima del rosso e' passato", ff.stati["p1 uno"]?.every((s) => s === "PASSED"), true);
    eq("fail-fast: il rosso e' FAILED", ff.stati["p1 due rosso"]?.includes("FAILED"), true);
    for (const n of ["p1 tre", "p2 uno", "p2 due"]) {
      eq(`fail-fast: "${n}" e' SALTATO in ogni suo passo, non sparito e non passato`, ff.stati[n]?.every((s) => s === "SKIPPED"), true);
    }
    eq("fail-fast: l'esito del processo e' un fallimento", ff.codice, 1);

    console.log("\n--- --parallel 2 con il formatter message ---\n");
    const par = esegui("parallelo", [p1, p2], ["--parallel", "2"]);
    eq("parallelo: ogni scenario parte una volta sola", ordina(par.iniziati), ordina(tutti));
    eq("parallelo: ogni scenario finisce una volta sola", ordina(par.finiti), ordina(tutti));
    eq("parallelo: gli stessi passi di quando e' in serie, scenario per scenario", par.stati, continua.stati);
    eq("parallelo: lo stesso numero di messaggi della serie", par.messaggi, continua.messaggi);
    eq("parallelo: il rosso e' ancora uno solo", Object.values(par.stati).flat().filter((s) => s === "FAILED").length, 1);
    eq("parallelo: l'esito del processo e' un fallimento", par.codice, 1);
    if (par.stderr.trim()) console.log(`       (stderr non vuoto: ${par.stderr.trim().split("\n")[0]})`);

    console.log("\n--- ordine reale, non solo dry-run ---\n");
    const ordine = esegui("ordine", [p2, p1]);
    eq("p2 prima di p1, come dato (browser vero)", ordine.iniziati, ["p2 uno", "p2 due", "p1 uno", "p1 due rosso", "p1 tre"]);
  } finally {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
}

main()
  .catch((err) => fail("il controllo", (err as Error).message))
  .finally(() => {
    console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
    process.exit(failures === 0 ? 0 : 1);
  });
