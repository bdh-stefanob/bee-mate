/**
 * percorsi-cucumber.check.ts
 * ---------------------------
 * Scegliere scenari nella schermata Esegui deve eseguire QUELLI, nell'ordine
 * dato, e ogni esecuzione deve scrivere il proprio report.
 *
 * Il difetto che questo controllo ferma (collaudo del 30/9): la finestra
 * mandava il file scelto, ma Cucumber UNISCE i percorsi di `cucumber.js` a
 * quelli della riga di comando. Risultato: qualunque scelta eseguiva tutti gli
 * scenari con glue, e il rosso di un'altra applicazione finiva nella schermata
 * di chi voleva provare il proprio.
 *
 * Qui stanno anche le ipotesi su Cucumber 10.9 che la spec dell'esecuzione
 * avanzata dichiarava "non provate" (ordine dei percorsi, due righe dello stesso
 * file, un file intero piu' una sua riga, report HTML per esecuzione). Ognuna e'
 * un caso: se una versione futura di Cucumber cambia comportamento, qui si vede.
 * Le altre due (fail-fast e `--parallel` con il formatter `message`) vogliono un
 * browser vero e stanno in `cucumber-parallelo.check.ts`.
 *
 * Non serve un browser: e' un dry-run, che risolve i percorsi e i passi senza
 * eseguirli.
 *
 * Uso:  npx ts-node scripts/lib/percorsi-cucumber.check.ts
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { ambienteDiCucumber, percorsiDaArgomenti, reportHtmlPer } from "./lancio-test";

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

/** Due scenari nello stesso file: le righe 2 e 5 sono le loro intestazioni. */
const dueScenari = (nome: string): string =>
  `Feature: ${nome}\n  Scenario: ${nome} uno\n    Then the page shows "x"\n\n  Scenario: ${nome} due\n    Then the page shows "x"\n`;

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const a = path.join(TMP, "a.feature");
const b = path.join(TMP, "b.feature");
const z = path.join(TMP, "z.feature");
const d = path.join(TMP, "d.feature");
fs.writeFileSync(a, feature("scenario a"));
fs.writeFileSync(b, feature("scenario b"));
fs.writeFileSync(z, feature("scenario z"));
fs.writeFileSync(d, dueScenari("scenario d"));

interface Messaggio {
  pickle?: { id: string; name: string };
  testCase?: { id: string; pickleId: string };
  testCaseStarted?: { testCaseId: string };
}

/**
 * Cucumber in dry-run sui percorsi dati. Restituisce gli scenari **nell'ordine in
 * cui partono** (i `testCaseStarted` del flusso di messaggi), non in quello in cui
 * sono scritti nei file: e' l'ordine che una suite ordinata deve poter contare.
 */
function scenariEseguiti(percorsi: string[], env: Record<string, string> = {}): string[] {
  const out = path.join(TMP, "messaggi.ndjson");
  execFileSync(
    process.execPath,
    [path.join(ROOT, "node_modules", "@cucumber", "cucumber", "bin", "cucumber.js"), "--dry-run", "--format", `message:${out}`],
    { cwd: ROOT, stdio: "pipe", env: { ...process.env, BDD_PATHS: percorsi.join(";"), ...env } }
  );
  const messaggi = fs
    .readFileSync(out, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Messaggio);
  const nomePerPickle = new Map<string, string>();
  for (const m of messaggi) if (m.pickle) nomePerPickle.set(m.pickle.id, m.pickle.name);
  const nomePerCase = new Map<string, string>();
  for (const m of messaggi) if (m.testCase) nomePerCase.set(m.testCase.id, nomePerPickle.get(m.testCase.pickleId) ?? "?");
  return messaggi.filter((m) => m.testCaseStarted).map((m) => nomePerCase.get(m.testCaseStarted!.testCaseId) ?? "?");
}

/** Il report HTML e' un formatter di `cucumber.js`: si guarda dove finisce. */
function conReport(env: Record<string, string>): void {
  execFileSync(
    process.execPath,
    [path.join(ROOT, "node_modules", "@cucumber", "cucumber", "bin", "cucumber.js"), "--dry-run"],
    { cwd: ROOT, stdio: "pipe", env: { ...process.env, BDD_PATHS: a, ...env } }
  );
}

try {
  eq("un percorso scelto: si esegue solo quello", scenariEseguiti([a]), ["scenario a"]);
  eq("due percorsi scelti: solo quei due", scenariEseguiti([a, b]).sort(), ["scenario a", "scenario b"]);

  console.log("\n--- ordine: parte nell'ordine in cui i percorsi sono dati ---\n");
  // Verificato il 1/10/2026 su Cucumber 10.9: non l'ordine alfabetico, non quello
  // del disco. Una suite ordinata (spec §2) conta su questo.
  eq("z, a, b: in quest'ordine, anche se non e' alfabetico", scenariEseguiti([z, a, b]), ["scenario z", "scenario a", "scenario b"]);
  eq("b, z, a: l'ordine dato, non quello di prima", scenariEseguiti([b, z, a]), ["scenario b", "scenario z", "scenario a"]);

  console.log("\n--- due righe dello stesso file ---\n");
  // Una esecuzione ciascuna: Cucumber non le fonde e non le duplica, quindi il
  // lanciatore non deve fonderle in `file:2:5`. Ma l'ordine DENTRO il file e'
  // quello del file, non quello della lista.
  eq("d:2 e d:5: uno scenario ciascuno", scenariEseguiti([`${d}:2`, `${d}:5`]), ["scenario d uno", "scenario d due"]);
  eq("d:5 e d:2: l'ordine e' quello del file, non della lista", scenariEseguiti([`${d}:5`, `${d}:2`]), ["scenario d uno", "scenario d due"]);
  eq("la stessa riga due volte: una esecuzione sola", scenariEseguiti([`${d}:2`, `${d}:2`]), ["scenario d uno"]);

  console.log("\n--- un file intero piu' una sua riga ---\n");
  // Il caso che smentisce l'ipotesi della spec: con il file intero e una riga
  // dello stesso file Cucumber esegue SOLO la riga. Chi voleva l'intero ne
  // otterrebbe uno scenario, senza errore: il lanciatore (`esecuzione.ts`) tiene
  // l'intero e scarta le righe di quel file.
  eq("d intero e d:2: solo la riga, non l'intero", scenariEseguiti([d, `${d}:2`]), ["scenario d uno"]);
  eq("d intero da solo: tutti e due", scenariEseguiti([d]), ["scenario d uno", "scenario d due"]);

  console.log("\n--- il report HTML di ogni esecuzione ---\n");
  // Il difetto: `cucumber.js` scriveva sempre `reports/cucumber-report.html`, e
  // due processi contemporanei se lo sovrascrivevano. BDD_HTML lo sposta.
  const predefinito = path.join(ROOT, "reports", "cucumber-report.html");
  const proprio = path.join(TMP, "mio.html");
  const mtime = (p: string): number => (fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0);

  const prima = mtime(predefinito);
  conReport({ BDD_HTML: proprio });
  ok("BDD_HTML: il comando riesce");
  eq("BDD_HTML: il report esce dove si e' chiesto", fs.existsSync(proprio), true);
  eq("BDD_HTML: il report di tutti gli altri non si tocca", mtime(predefinito), prima);

  // Si porta il file di sempre al 1970: la granularita' dell'orologio del disco
  // non deve poter nascondere una scrittura avvenuta davvero.
  if (fs.existsSync(predefinito)) fs.utimesSync(predefinito, new Date(1000), new Date(1000));
  conReport({});
  eq("senza BDD_HTML: il file di sempre, come prima", mtime(predefinito) > 1000, true);

  console.log("\n--- cio' che `test-bersaglio` passa a Cucumber ---\n");
  const amb = (messaggi?: string): NodeJS.ProcessEnv =>
    ambienteDiCucumber({ base: {}, ambiente: { BDD_TARGET: "demo" }, percorsi: ["x.feature"], messaggi, vedi: false, rallenta: 0, pulito: false });
  eq("con il file dei messaggi, il report ha lo stesso nome con .html", amb("reports/cruscotto/test-a-1.ndjson")["BDD_HTML"], "reports/cruscotto/test-a-1.html");
  eq("due esecuzioni, due report", amb("reports/cruscotto/test-a-1.ndjson")["BDD_HTML"] !== amb("reports/cruscotto/test-a-2.ndjson")["BDD_HTML"], true);
  eq("senza file dei messaggi, BDD_HTML non c'e': il nome di sempre", "BDD_HTML" in amb(), false);
  eq("un percorso senza .ndjson non perde pezzi", reportHtmlPer("reports/x/messaggi"), "reports/x/messaggi.html");
  eq("i percorsi dati arrivano in BDD_PATHS nell'ordine dato", ambienteDiCucumber({ base: {}, ambiente: {}, percorsi: ["b", "a"], vedi: false, rallenta: 0, pulito: false })["BDD_PATHS"], "b;a");
  eq(
    "dagli argomenti: i percorsi in ordine, senza le opzioni nude",
    percorsiDaArgomenti(["demo", "src/features/b.feature", "vedi", "rallenta=500", "src/features/a.feature:3", "src/features/a.feature:9", "pulito", "messaggi=reports/m.ndjson"]),
    ["src/features/b.feature", "src/features/a.feature:3", "src/features/a.feature:9"]
  );
} catch (err) {
  fail("il dry-run", (err as Error).message);
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}

console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
