/**
 * copione-registratore.check.ts
 * -------------------------------
 * Il copione di esempio (`scripts/fixtures/copione-demo.json`), guidato nel
 * browser VERO contro l'ambiente pubblico di pratica (`demo`,
 * `bdd-targets.example.json`): registra, genera, esegue, e verifica le
 * cinque difese una per una. E' il "test di regressione del recorder" della
 * spec (sezione 5(a), punto 4 di N10).
 *
 * COSA AGGIUNGE RISPETTO A check:app-finta
 * `check:app-finta` prova lo stesso cablaggio (`lib/registrazione.ts`) con un
 * percorso scritto in TypeScript (`app-finta.check.ts`), contro un'app finta
 * locale. Questo prova che lo STESSO meccanismo, guidato da un percorso che
 * arriva come DATO (un copione JSON validato da `copione-schema.ts`), produce
 * la stessa traccia — e lo fa contro un bersaglio raggiungibile in rete, non
 * simulato. Misura il FORMATO del copione e il parametro `copione=` di
 * record.ts, non di nuovo il recorder: i due controlli non si ripetono a
 * vicenda. Se un giorno smettessero di dire cose diverse, andrebbe tolto uno
 * dei due — non prima.
 *
 * RICHIEDE RETE
 * Contro https://www.saucedemo.com, un sito pubblico di pratica (lo stesso
 * dell'ambiente "demo"). Se la rete non risponde, il controllo lo dice e si
 * salta — non e' un fallimento del recorder.
 *
 * Uso:  npm run check:copione-registratore
 */

import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import { spawnSync } from "child_process";
import type { Browser } from "@playwright/test";
import { avviaBrowser } from "./browser";
import { eseguiCopione } from "./copione";
import { validaCopione, risolviValori, type Copione } from "./copione-schema";
import { loadTargets, type Target } from "./targets";
import { verificaAmbienteDiCollaudo, richiedeConfermaUmana, verificaFuoriDaSrc, verificaSalvabile, AmbienteNonAmmesso } from "./copione-difese";
import { scriviDizionari } from "./inventory";
import type { Recording, ScoutResult } from "./generation-contract";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};

const RADICE = path.resolve(__dirname, "..", "..");
const SLUG = "copione-demo";
const LAVORO = path.join("reports", "check-copione-registratore");
const EXAMPLE_TARGETS = "bdd-targets.example.json";

function rispondeSu(url: string, entroMs: number): Promise<boolean> {
  return new Promise((risolvi) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, (res) => {
      res.resume();
      risolvi((res.statusCode ?? 0) < 500);
    });
    req.setTimeout(entroMs, () => {
      req.destroy();
      risolvi(false);
    });
    req.on("error", () => risolvi(false));
  });
}

function tsNode(script: string, args: string[]): { status: number | null; out: string } {
  const esito = spawnSync(
    process.execPath,
    [path.join("node_modules", "ts-node", "dist", "bin.js"), script, ...args],
    { encoding: "utf-8", cwd: RADICE }
  );
  return { status: esito.status, out: `${esito.stdout ?? ""}${esito.stderr ?? ""}` };
}

interface Manifesto {
  files: Array<{ path: string }>;
  origine?: string;
  gaps: Array<{ kind: string; where: string; detail: string }>;
}

async function main(): Promise<void> {
  console.log("\n--- il copione di esempio, guidato contro il sito pubblico di pratica ---\n");

  if (!(await rispondeSu("https://www.saucedemo.com/", 5000))) {
    console.log(
      "\nSALTATO: https://www.saucedemo.com non risponde entro 5s.\n" +
        "  E' il sito pubblico dell'ambiente 'demo' (bdd-targets.example.json): senza\n" +
        "  rete questo controllo non ha niente da provare — non e' un fallimento.\n"
    );
    return;
  }
  ok("il sito pubblico di pratica risponde");

  // ── 0. Le difese che si valutano PRIMA di aprire un browser ───────────────
  process.env["DEMO_USER"] = "standard_user";
  process.env["DEMO_PASS"] = "secret_sauce";

  const grezzo = JSON.parse(fs.readFileSync(path.join("scripts", "fixtures", `${SLUG}.json`), "utf-8"));
  let copione: Copione;
  try {
    copione = validaCopione(grezzo);
    ok("il copione di esempio e' valido");
  } catch (err) {
    fail("il copione di esempio e' valido", (err as Error).message);
    return;
  }

  const targets = loadTargets(EXAMPLE_TARGETS);
  const target: Target | undefined = targets.find((t) => t.name === copione.ambiente);
  if (!target) {
    fail("l'ambiente del copione esiste nell'esempio", `"${copione.ambiente}" non e' in ${EXAMPLE_TARGETS}`);
    return;
  }

  try {
    verificaAmbienteDiCollaudo(target);
    ok(`l'ambiente "${target.name}" e' dichiarato di collaudo (demo, pubblico)`);
  } catch (err) {
    fail(`l'ambiente "${target.name}" e' dichiarato di collaudo`, (err as Error).message);
    return;
  }

  if (richiedeConfermaUmana(target) === false) {
    ok("difesa 5: l'ambiente pubblico non richiede conferma umana (puo' girare senza presidio)");
  } else {
    fail("difesa 5: l'ambiente pubblico non richiede conferma umana", "richiedeConfermaUmana ha risposto true per 'demo'");
  }

  // Un ambiente SENZA collaudo:true va rifiutato subito, prima di aprire un
  // browser: lo stesso copione, contro un bersaglio non dichiarato.
  try {
    verificaAmbienteDiCollaudo({ ...target, name: "non-dichiarato", collaudo: undefined });
    fail("un ambiente non dichiarato di collaudo e' rifiutato", "non ha lanciato niente");
  } catch (err) {
    if (err instanceof AmbienteNonAmmesso) ok("un ambiente non dichiarato di collaudo e' rifiutato (difesa 2)");
    else fail("un ambiente non dichiarato di collaudo e' rifiutato", (err as Error).message);
  }
  // E uno di produzione, anche se marcato anche di collaudo.
  try {
    verificaAmbienteDiCollaudo({ ...target, produzione: true });
    fail("un ambiente di produzione e' rifiutato anche se collaudo:true", "non ha lanciato niente");
  } catch (err) {
    if (err instanceof AmbienteNonAmmesso) ok("un ambiente di produzione e' rifiutato, anche insieme a collaudo:true (difesa 2)");
    else fail("un ambiente di produzione e' rifiutato", (err as Error).message);
  }

  const risolto = risolviValori(copione);

  // ── 1. REGISTRA, guidando il browser vero col copione ─────────────────────
  const { browser } = await avviaBrowser({ headless: true });
  let recording: Recording;
  let dizionari: Map<string, ScoutResult>;
  try {
    ({ recording, dizionari } = await registraEVerifica(browser, risolto, target.url));
  } finally {
    await browser.close().catch(() => { /* gia' chiuso */ });
  }

  // ── 2. GENERA, fuori da src/ (difesa 4) ────────────────────────────────────
  const dirLavoro = path.join(RADICE, LAVORO);
  fs.rmSync(dirLavoro, { recursive: true, force: true });
  fs.mkdirSync(dirLavoro, { recursive: true });
  const fileRegistrazione = path.join(dirLavoro, "registrazione.json");
  const dirScout = path.join(dirLavoro, "scout");
  fs.writeFileSync(fileRegistrazione, JSON.stringify(recording, null, 2), "utf-8");
  scriviDizionari(dizionari.values(), dirScout);

  const outRoot = path.join(LAVORO, "generato");
  const manifestoPath = path.join(dirLavoro, "manifesto.json");
  const generazione = tsNode(path.join("scripts", "generate.ts"), [
    path.relative(RADICE, fileRegistrazione),
    `name=${SLUG}`,
    `scout=${path.relative(RADICE, dirScout)}`,
    `manifest=${path.relative(RADICE, manifestoPath)}`,
    `out=${outRoot}`,
    "no-catalog",
  ]);
  if (generazione.status !== 0 || !fs.existsSync(manifestoPath)) {
    fail("la generazione riesce fuori da src/ (difesa 4)", generazione.out.split("\n").slice(-15).join("\n       "));
    return;
  }
  ok("la generazione riesce con un'uscita fuori da src/ (difesa 4)");
  const manifesto = JSON.parse(fs.readFileSync(manifestoPath, "utf-8")) as Manifesto;

  if (manifesto.origine === "copione") {
    ok("il manifesto porta origine: 'copione' (difesa 1, letta dalla rotta di salvataggio)");
  } else {
    fail("il manifesto porta origine: 'copione'", `origine nel manifesto: ${JSON.stringify(manifesto.origine)}`);
  }

  // Difesa 3: la stessa funzione che la rotta /api/scenari/salva chiama prima
  // di spostare qualunque file. Non si rifà' qui una chiamata HTTP al
  // cruscotto (fuori scopo per questo controllo): si verifica che la
  // decisione — "questa origine non si salva" — sia quella giusta.
  try {
    verificaSalvabile(manifesto.origine as "persona" | "copione" | undefined);
    fail("difesa 3: il salvataggio rifiuta un'origine copione", "non ha lanciato niente");
  } catch {
    ok("difesa 3: il salvataggio rifiuta un'origine copione (stessa funzione usata da /api/scenari/salva)");
  }

  // Un out dentro src/, con la STESSA registrazione: deve essere rifiutato.
  const generazioneSrc = tsNode(path.join("scripts", "generate.ts"), [
    path.relative(RADICE, fileRegistrazione),
    `name=${SLUG}-rifiutato`,
    `scout=${path.relative(RADICE, dirScout)}`,
    "out=src",
    "no-catalog",
    "dry",
  ]);
  if (generazioneSrc.status !== 0 && /fuori da src/.test(generazioneSrc.out)) {
    ok("difesa 4: generare dentro src/ da una registrazione 'copione' e' rifiutato");
  } else {
    fail(
      "difesa 4: generare dentro src/ da una registrazione 'copione' e' rifiutato",
      `uscita: ${generazioneSrc.status}\n       ${generazioneSrc.out.split("\n").slice(-8).join("\n       ")}`
    );
  }

  const feature = manifesto.files.map((f) => f.path.replace(/\\/g, "/")).find((p) => p.endsWith(".feature"));
  if (!feature) {
    fail("il manifesto nomina il .feature generato", JSON.stringify(manifesto.files));
    return;
  }
  const testoFeature = fs.readFileSync(path.join(RADICE, feature), "utf-8");
  if (/# origine: copione \(impronta: [0-9a-f]+\)/.test(testoFeature)) {
    ok("il .feature generato porta la riga di provenienza, con l'impronta del copione");
  } else {
    fail("il .feature generato porta la riga di provenienza", testoFeature.split("\n").slice(0, 10).join("\n       "));
  }
  if (/durante questo passo si verifica: "Products"/.test(testoFeature)) {
    ok("la verifica a meta' passo resta un commento nel punto giusto, non un Then eseguibile");
  } else {
    fail("la verifica a meta' passo resta un commento", testoFeature);
  }
  for (const atteso of ['the page shows "Remove"', 'the page shows "Login"', 'the page shows "Username"']) {
    if (testoFeature.includes(atteso)) ok(`il .feature contiene "${atteso}"`);
    else fail(`il .feature contiene "${atteso}"`, testoFeature);
  }

  // ── 3. ESEGUI, davvero, contro il sito pubblico ────────────────────────────
  //
  // outRoot e' fuori da src/: la glue generata non e' nel require di default di
  // cucumber.js (src/steps/**, src/support/**). Si aggiungono i --require di
  // quell'albero (generate.ts vi ha gia' scritto un ponte verso il vero
  // support/ condiviso — vedi scriviPonteSupport).
  const uscita = esegui(target.url, feature, outRoot, path.join(dirLavoro, "esecuzione.txt"));
  if (uscita.status === 0) {
    ok("lo scenario generato dal copione gira VERDE sul sito di pratica");
  } else {
    fail("lo scenario generato dal copione gira verde sul sito di pratica", righeUtili(uscita.uscita).join("\n       "));
  }

  console.log(`\n  file conservati in ${LAVORO} (fuori da src, fuori da git)\n`);
}

async function registraEVerifica(
  browser: Browser,
  copione: Copione,
  startUrl: string
): Promise<{ recording: Recording; dizionari: Map<string, ScoutResult> }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const esito = await eseguiCopione(context, copione, { startUrl, attesaGestoMs: 400, attesaInventarioMs: 300 });
  await context.close();

  if (esito.nonRiuscite.length === 0) {
    ok("tutte le azioni del copione sono state compiute sulla pagina vera");
  } else {
    fail("tutte le azioni del copione sono state compiute", esito.nonRiuscite.join("\n       "));
  }

  if (esito.recording.origine === "copione" && typeof esito.recording.copioneImpronta === "string") {
    ok("difesa 1: la traccia porta origine 'copione' e l'impronta del copione");
  } else {
    fail("difesa 1: la traccia porta origine 'copione' e l'impronta", JSON.stringify({ origine: esito.recording.origine, impronta: esito.recording.copioneImpronta }));
  }

  const primo = esito.recording.intents[0];
  const secondo = esito.recording.intents[1];
  if (primo && primo.assertions.some((a) => a.name === "Products" && a.afterStep !== undefined && a.afterStep < primo.steps.length)) {
    ok("la verifica a meta' passo mantiene la sua posizione (afterStep < passi dell'intento)");
  } else {
    fail("la verifica a meta' passo mantiene la sua posizione", JSON.stringify(primo?.assertions));
  }
  if (secondo && secondo.assertions.length === 2 && secondo.assertions.every((a) => a.afterStep === secondo.steps.length)) {
    ok("la verifica dopo l'ultimo 'Fine intento' (verificaFinale) si attacca al passo precedente, non a un intento senza nome");
  } else {
    fail("verificaFinale si attacca al passo precedente", JSON.stringify(secondo));
  }
  if (esito.recording.summary.unlabelled === 0) {
    ok("nessun gruppo di gesti resta senza nome (il copione chiude sempre ogni intento)");
  } else {
    fail("nessun gruppo di gesti resta senza nome", JSON.stringify(esito.recording.summary));
  }

  return { recording: esito.recording, dizionari: esito.dizionari };
}

function esegui(baseUrl: string, feature: string, outRoot: string, dove: string): { status: number | null; uscita: string } {
  const esito = spawnSync(
    process.execPath,
    [
      path.join("node_modules", "@cucumber", "cucumber", "bin", "cucumber.js"),
      "--require", `${outRoot}/steps/**/*.ts`,
      "--require", `${outRoot}/pages/**/*.ts`,
      "--require", `${outRoot}/support/**/*.ts`,
    ],
    {
      encoding: "utf-8",
      cwd: RADICE,
      env: {
        ...process.env,
        BASE_URL: baseUrl,
        // Nessun ambiente nominato (bdd-targets.json potrebbe non esistere su
        // questa macchina): APP_PASSWORD e' il ripiego gia' previsto in
        // world.ts per un indirizzo diretto. "demo" e' un sito pubblico di
        // pratica, con credenziali innocue in chiaro apposta (vedi
        // bdd-targets.example.json).
        APP_PASSWORD: "secret_sauce",
        BDD_PATHS: feature,
        BDD_TAGS: "",
        TS_NODE_TRANSPILE_ONLY: "1",
        BDD_HTML: path.join(LAVORO, "cucumber.html"),
      },
    }
  );
  const uscita = `${esito.stdout ?? ""}${esito.stderr ?? ""}`;
  fs.writeFileSync(dove, uscita, "utf-8");
  return { status: esito.status, uscita };
}

/** Le righe utili di un'uscita di Cucumber: vedi la stessa funzione in app-finta.check.ts. */
function righeUtili(uscita: string): string[] {
  const righe = uscita
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((r) => r.trimEnd())
    .filter((r) => r.trim());
  const primo = righe.findIndex((r) => /^Failures:/.test(r));
  const utili = primo >= 0 ? righe.slice(primo + 1) : righe;
  const fine = utili.findIndex((r) => /^\d+ scenario/.test(r));
  return (fine > 0 ? utili.slice(0, fine) : utili).slice(0, 20);
}

main()
  .then(() => {
    console.log(failures === 0 ? "\nTutti i controlli OK.\n" : `\n${failures} controlli FALLITI\n`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error(`\nIl controllo non e' riuscito a girare: ${(err as Error).message}\n`);
    process.exit(1);
  });
