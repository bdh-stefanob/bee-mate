/**
 * benchmark.ts
 * ------------
 * Misura il risultato di una generazione, e confronta piu' esecuzioni.
 *
 * IL CONFRONTO CHE INTERESSA
 *
 *   npm run generate -- --no-rules            genera, e scrive i due compiti
 *   npm run benchmark -- --label deterministico
 *
 *   ...dai brief.md all'assistente, lascia che modifichi i file...
 *   npm run benchmark -- --label con-regole
 *
 *   ...ripeti con brief-naive.md in una cartella pulita...
 *   npm run benchmark -- --label senza-regole --features X --steps Y --pages Z
 *
 *   npm run benchmark -- --confronta          la tabella di tutte le esecuzioni
 *
 * Ogni esecuzione salva il suo verdetto sotto reports/benchmark/. Il confronto
 * si fa sui file salvati, non a memoria: rifarlo fra un mese deve dare la stessa
 * tabella, e chiunque deve poterlo rifare.
 *
 * PERCHE' IL PARAGONE E' ONESTO
 * Il compito senza regole non e' un fantoccio: e' la stessa registrazione,
 * completa, e la richiesta e' quella che chiunque scriverebbe. Se le regole non
 * servissero, questa tabella lo direbbe — ed e' il motivo per cui vale la pena
 * costruirla prima di sapere il risultato.
 *
 * Flag:
 *   --label NOME     nome dell'esecuzione (obbligatorio, salvo --confronta)
 *   --features DIR   default src/features/generated
 *   --steps DIR      default src/steps/generated
 *   --pages DIR      default src/pages/generated
 *   --catalog FILE   default step-catalog.json
 *   --scout DIR      default reports/scout
 *   --confronta      stampa la tabella di tutte le esecuzioni salvate
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { scoreGherkin, scoreSteps, scorePages, toTable, type RunResult } from "./lib/benchmark";
import type { CatalogStep, Component, ScoutResult } from "./lib/generation-contract";

const OUT = path.join("reports", "benchmark");

function argValue(args: string[], flag: string): string | undefined {
  const eq = args.find((a) => a.startsWith(flag + "="));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

function readAll(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, encoding: "utf-8" })
    .filter((f) => f.endsWith(ext))
    .map((f) => fs.readFileSync(path.join(dir, f), "utf-8"));
}

function loadCatalog(file: string): CatalogStep[] {
  if (!fs.existsSync(file)) return [];
  return (JSON.parse(fs.readFileSync(file, "utf-8")) as { steps?: CatalogStep[] }).steps ?? [];
}

function loadComponents(dir: string): Component[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => (JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as ScoutResult).components);
}

/** Il compilatore. Non e' un parere: o compila o no. */
function compiles(): { ok: boolean; errors: string } {
  try {
    execFileSync(
      process.execPath,
      [path.join("node_modules", "typescript", "bin", "tsc"), "--noEmit", "-p", "tsconfig.json"],
      { stdio: "pipe" }
    );
    return { ok: true, errors: "" };
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer };
    return { ok: false, errors: `${e.stdout?.toString() ?? ""}${e.stderr?.toString() ?? ""}`.trim() };
  }
}

/**
 * Quanti passi Gherkin non hanno una step definition.
 *
 * Il dry-run di Cucumber non esegue niente: verifica solo che ogni frase trovi
 * la sua glue. E' il secondo giudice, e come il primo non discute.
 *
 * SI LEGGE IL FLUSSO DI MESSAGGI, NON IL RIASSUNTO A SCHERMO. La prima versione
 * di questa funzione cercava "N undefined" nell'output con un'espressione
 * regolare, e ha dato **92 invece di 0**: il riassunto contava anche gli scenari
 * di tutto il resto del repository, che il dry-run carica comunque. Il numero
 * era sbagliato, ma aveva l'aria di un numero — ed e' esattamente il modo in cui
 * una misura fa danno, perche' nessuno in sala puo' accorgersene.
 *
 * Il flusso di messaggi permette di risalire da ogni passo al file da cui viene,
 * e quindi di contare solo i propri.
 */
function undefinedSteps(featureDir: string): number {
  const tmp = path.join(OUT, ".dry-run.ndjson");
  try {
    execFileSync(
      process.execPath,
      [
        path.join("node_modules", "@cucumber", "cucumber", "bin", "cucumber.js"),
        "--dry-run", featureDir, "--format", `message:${tmp}`,
      ],
      { stdio: "pipe" }
    );
  } catch {
    // Un dry-run che esce male ha comunque prodotto i messaggi fino a dove e'
    // arrivato: si conta quello che c'e'.
  }
  if (!fs.existsSync(tmp)) return -1;

  const wanted = featureDir.replace(/\\/g, "/");
  const pickleUri = new Map<string, string>();
  const caseToPickle = new Map<string, string>();
  const stepToCase = new Map<string, string>();
  const startedToCase = new Map<string, string>();
  let undef = 0;

  interface Msg {
    pickle?: { id: string; uri: string };
    testCase?: { id: string; pickleId: string; testSteps: Array<{ id: string }> };
    testCaseStarted?: { id: string; testCaseId: string };
    testStepFinished?: { testCaseStartedId: string; testStepId: string; testStepResult: { status: string } };
  }

  for (const line of fs.readFileSync(tmp, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    let m: Msg;
    try { m = JSON.parse(line) as Msg; } catch { continue; }

    if (m.pickle) pickleUri.set(m.pickle.id, m.pickle.uri.replace(/\\/g, "/"));
    if (m.testCase) {
      caseToPickle.set(m.testCase.id, m.testCase.pickleId);
      for (const s of m.testCase.testSteps) stepToCase.set(s.id, m.testCase.id);
    }
    if (m.testCaseStarted) startedToCase.set(m.testCaseStarted.id, m.testCaseStarted.testCaseId);
    if (m.testStepFinished && m.testStepFinished.testStepResult.status === "UNDEFINED") {
      const caseId = stepToCase.get(m.testStepFinished.testStepId);
      const uri = caseId ? pickleUri.get(caseToPickle.get(caseId) ?? "") : undefined;
      if (uri && uri.startsWith(wanted)) undef++;
    }
  }

  fs.rmSync(tmp, { force: true });
  return undef;
}

function main(): void {
  const args = process.argv.slice(2);
  fs.mkdirSync(OUT, { recursive: true });

  if (args.includes("--confronta")) {
    const runs = fs
      .readdirSync(OUT)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), "utf-8")) as RunResult);

    if (runs.length === 0) {
      console.log(`\nNessuna esecuzione salvata in ${OUT}.\n`);
      return;
    }

    const table = toTable(runs);
    const md =
      `# Confronto fra esecuzioni\n\n` +
      `Generato il ${new Date().toISOString().slice(0, 10)}. Ogni numero e' calcolato da uno\n` +
      `strumento, non giudicato da una persona: si rifa' e viene uguale.\n\n` +
      `${table}\n\n` +
      `## Come si legge\n\n` +
      `- **Compila** e **passi senza glue** sono soglie, non punteggi: sotto, il resto non conta.\n` +
      `- **Step nuovi introdotti** e' l'entropia aggiunta. E' il numero che questo progetto\n` +
      `  esiste per abbassare, e va letto insieme al riuso.\n` +
      `- **Selettori negli step** misura direttamente se le regole sono state seguite: e' la\n` +
      `  cosa piu' naturale da scrivere per chi non le ha lette.\n`;

    fs.writeFileSync(path.join(OUT, "confronto.md"), md, "utf-8");
    console.log(`\n${table}\n`);
    console.log(`  Scritto in ${path.join(OUT, "confronto.md")}\n`);
    return;
  }

  const label = argValue(args, "--label");
  if (!label) {
    console.error(
      "ERRORE: serve --label.\n\n" +
        "  npm run benchmark -- --label con-regole\n" +
        "  npm run benchmark -- --confronta\n"
    );
    process.exit(1);
  }

  const featureDir = argValue(args, "--features") ?? path.join("src", "features", "generated");
  const stepsDir = argValue(args, "--steps") ?? path.join("src", "steps", "generated");
  const pagesDir = argValue(args, "--pages") ?? path.join("src", "pages", "generated");
  const catalog = loadCatalog(argValue(args, "--catalog") ?? "step-catalog.json");
  const components = loadComponents(argValue(args, "--scout") ?? path.join("reports", "scout"));

  const featureText = readAll(featureDir, ".feature").join("\n");
  const stepsText = readAll(stepsDir, ".ts").join("\n");
  const pageTexts = readAll(pagesDir, ".ts");

  if (!featureText.trim()) {
    console.error(`ERRORE: nessuno scenario in ${featureDir}. Non c'e' niente da misurare.`);
    process.exit(1);
  }

  console.log(`\nMISURA — ${label}\n`);
  const compile = compiles();
  const result: RunResult = {
    label,
    compiles: compile.ok,
    compileErrors: compile.errors.slice(0, 4000),
    undefinedSteps: undefinedSteps(featureDir),
    gherkin: scoreGherkin(featureText, catalog),
    steps: scoreSteps(stepsText),
    pages: scorePages(pageTexts, components),
  };

  const file = path.join(OUT, `${label.replace(/[^a-z0-9-]/gi, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2), "utf-8");

  console.log(toTable([result]));
  console.log("");

  if (!result.compiles) {
    console.log(`  NON COMPILA — le prime righe:\n`);
    for (const line of compile.errors.split("\n").slice(0, 5)) console.log(`    ${line}`);
    console.log("");
  }
  if (result.steps.selectorsInSteps.length > 0) {
    console.log(`  SELETTORI DENTRO ALLE STEP DEFINITION (violazione di layer):\n`);
    for (const v of result.steps.selectorsInSteps.slice(0, 5)) console.log(`    ${v}`);
    console.log("");
  }
  if (result.pages.unknown.length > 0) {
    console.log(`  LOCATOR CHE IN NESSUN DIZIONARIO ESISTONO:\n`);
    for (const u of result.pages.unknown.slice(0, 8)) console.log(`    ${u}`);
    console.log(`\n    Puo' essere una pagina non inventariata, o un selettore inventato.`);
    console.log(`    La differenza si vede rilanciando lo scout.\n`);
  }
  if (result.gherkin.worstOffenders.length > 0) {
    console.log(`  FRASI CHE LA CONFORMITA' PENALIZZA:\n`);
    for (const o of result.gherkin.worstOffenders) {
      console.log(`    ${o.score.toFixed(2)}  ${o.text}`);
      console.log(`          ${o.reasons.join("; ")}`);
    }
    console.log("");
  }

  console.log(`  Salvato in ${file}`);
  console.log(`  Confronto con le altre esecuzioni:  npm run benchmark -- --confronta\n`);
}

main();
