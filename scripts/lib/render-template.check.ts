/**
 * render-template.check.ts
 * ------------------------
 * Controlli sui modelli e sul renderer.
 *
 * PERCHE' NON BASTA CONTROLLARE IL RENDERER
 * La parte fragile non e' la sostituzione: sono i **modelli**. Restano fermi per
 * settimane mentre il codice attorno cambia — si rinomina il World, si sposta
 * `BasePage`, cambia la firma di un hook — e nessuno se ne accorge, perche' un
 * `.tmpl` non lo compila nessuno. Il giorno della prova il generatore produce
 * codice che non compila, e sembra colpa del generatore.
 *
 * Quindi qui i modelli vengono **resi con un ingresso realistico e poi compilati
 * davvero**, con lo stesso `tsc` che compila il resto. E' lo stesso principio
 * del controllo di andata e ritorno su `markdown-storage`: non verifico che il
 * codice faccia quello che credo, verifico che il risultato regga il giudice
 * che conta.
 *
 * Uso:  npm run check:templates
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { render, renderString, loadTemplate, placeholdersOf } from "./render-template";

const ROOT = path.join(__dirname, "..", "..");
// Sotto reports/, che e' gitignorato: sono file usa e getta.
const TMP = path.join(ROOT, "reports", ".template-check");

let failures = 0;

function ok(what: string): void {
  console.log(`OK   ${what}`);
}

function fail(what: string, detail: string): void {
  failures++;
  console.log(`FAIL ${what}\n       ${detail.split("\n").join("\n       ")}`);
}

function expectThrow(what: string, fn: () => unknown, mustMention: string): void {
  try {
    fn();
    fail(what, "non ha lanciato niente, e invece doveva");
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes(mustMention)) ok(what);
    else fail(what, `ha lanciato, ma il messaggio non nomina "${mustMention}":\n${msg}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Il renderer
// ---------------------------------------------------------------------------

console.log("\n--- renderer ---\n");

{
  const out = renderString("ciao {{NOME}}, sei {{RUOLO}}", { NOME: "Anna", RUOLO: "tester" });
  if (out === "ciao Anna, sei tester") ok("sostituzione in linea");
  else fail("sostituzione in linea", `ottenuto: ${JSON.stringify(out)}`);
}

expectThrow(
  "un segnaposto rimasto ferma tutto",
  () => renderString("ciao {{NOME}} da {{DOVE}}", { NOME: "Anna" }),
  "{{DOVE}}"
);

expectThrow(
  "una variabile inutilizzata ferma tutto (prende i refusi)",
  () => renderString("ciao {{NOME}}", { NOME: "Anna", NONE: "x" }),
  "NONE"
);

{
  // Il rientro lo decide il modello, non chi passa il valore.
  const out = renderString("class X {\n    {{CORPO}}\n}", { CORPO: "const a = 1;\nconst b = 2;" });
  const expected = "class X {\n    const a = 1;\n    const b = 2;\n}";
  if (out === expected) ok("blocco su piu' righe rientrato come il segnaposto");
  else fail("rientro del blocco", `ottenuto:\n${out}`);
}

{
  // Un blocco vuoto non deve lasciare una riga bianca a testimoniare la propria assenza.
  const out = renderString("a\n  {{VUOTO}}\nb", { VUOTO: "" });
  if (out === "a\nb") ok("blocco vuoto: sparisce anche la riga");
  else fail("blocco vuoto", `ottenuto: ${JSON.stringify(out)}`);
}

{
  // Un valore che contiene a sua volta un segnaposto passa letterale: non viene
  // ri-sostituito, e non fa fallire il rendering. Conta perche' i valori arrivano
  // da nomi letti su pagine vere, e un dato non deve poter pilotare il modello.
  const out = renderString("{{A}}", { A: "{{B}} letterale" });
  if (out === "{{B}} letterale") ok("un valore con segnaposto dentro resta letterale");
  else fail("valore con segnaposto dentro", `ottenuto: ${JSON.stringify(out)}`);
}

// ---------------------------------------------------------------------------
// 2. I modelli, resi con un ingresso realistico
// ---------------------------------------------------------------------------

console.log("\n--- modelli ---\n");

// L'ingresso viene da una registrazione vera su un sito pubblico di prova:
// login, poi aggiunta di un prodotto al carrello.
const GENERATED_AT = "2026-09-08T00:00:00.000Z";

const pageObject = render("page-object.ts.tmpl", {
  OUT_PATH: "src/pages/generated/login.page.ts",
  SOURCE_RECORDING: "reports/recordings/esempio.json",
  SOURCE_DICTIONARY: "reports/scout/esempio.json",
  GENERATED_AT,
  BASE_PAGE_IMPORT: "../../src/support/base.page",
  EXTRA_IMPORTS: "",
  CLASS_NAME: "LoginPage",
  PATH: "/",
  LOCATORS: [
    "private readonly usernameField: Locator = this.page.getByRole('textbox', { name: 'Username' });",
    "private readonly passwordField: Locator = this.page.getByRole('textbox', { name: 'Password' });",
    "private readonly loginButton: Locator = this.page.getByRole('button', { name: 'Login' });",
  ].join("\n"),
  ASSERT_LOADED_BODY: "await this.expectVisible(this.loginButton);",
  METHODS: [
    "async fillUsername(value: string): Promise<void> {",
    "  await this.usernameField.fill(value);",
    "}",
    "",
    "async clickLogin(): Promise<void> {",
    "  await this.loginButton.click();",
    "}",
  ].join("\n"),
});

const steps = render("steps.ts.tmpl", {
  OUT_PATH: "src/steps/generated/login.steps.ts",
  SOURCE_RECORDING: "reports/recordings/esempio.json",
  GENERATED_AT,
  WORLD_IMPORT: "../../src/support/world",
  PAGE_IMPORTS: 'import { LoginPage } from "./login.page";',
  PAGE_DECLARATIONS: "let loginPage: LoginPage;",
  STEP_DEFINITIONS: [
    "/**",
    " * @intent  Autentica l'utente con credenziali valide.",
    " * @page    LoginPage",
    " */",
    'Given("l\'utente accede al catalogo", async function (this: CustomWorld) {',
    "  loginPage = new LoginPage(this.page);",
    "  await loginPage.navigate();",
    '  await loginPage.fillUsername("standard_user");',
    "  await loginPage.clickLogin();",
    "});",
  ].join("\n"),
});

const feature = render("feature.feature.tmpl", {
  OUT_PATH: "src/features/generated/acquisto.feature",
  SOURCE_RECORDING: "reports/recordings/esempio.json",
  RECORDED_AT: GENERATED_AT,
  DURATION: "72",
  INTENT_COUNT: "2",
  TAGS: "@generato @demo",
  FEATURE_TITLE: "Acquisto di un prodotto",
  FEATURE_DESCRIPTION: "Derivata da una sessione manuale eseguita da un tester.",
  SCENARIO_TITLE: "Un utente registrato aggiunge un prodotto al carrello",
  SCENARIO_STEPS: [
    "Given l'utente accede al catalogo",
    "When l'utente aggiunge un prodotto al carrello",
    "Then il carrello contiene 1 articolo",
  ].join("\n"),
});

// Ogni modello deve dichiarare il marcatore, altrimenti il file generato non
// sarebbe piu' rigenerabile e la seconda esecuzione lo salterebbe in silenzio.
for (const [name, text] of [
  ["page-object.ts.tmpl", pageObject],
  ["steps.ts.tmpl", steps],
  ["feature.feature.tmpl", feature],
] as const) {
  if (text.includes("generato-da: bdd-generate")) ok(`${name}: porta il marcatore`);
  else fail(`${name}: marcatore`, "il file reso non e' riconoscibile come generato");
}

// Il Gherkin: struttura minima, e ogni riga di passo deve iniziare con una
// parola chiave. Non e' un parser, e' il controllo che prende gli errori veri.
{
  const lines = feature.split("\n").map((l) => l.trim()).filter(Boolean);
  const hasFeature = lines.some((l) => l.startsWith("Feature:"));
  const hasScenario = lines.some((l) => l.startsWith("Scenario:"));
  const scenarioAt = lines.findIndex((l) => l.startsWith("Scenario:"));
  const stepLines = scenarioAt >= 0 ? lines.slice(scenarioAt + 1) : [];
  const badStep = stepLines.find((l) => !/^(Given|When|Then|And|But)\s/.test(l));

  if (hasFeature && hasScenario && stepLines.length > 0 && !badStep) ok("feature.feature.tmpl: Gherkin ben formato");
  else fail("feature.feature.tmpl", badStep ? `riga di passo senza parola chiave: ${badStep}` : "manca Feature o Scenario");
}

// ---------------------------------------------------------------------------
// 3. Il giudice che conta: i due file TypeScript compilano?
// ---------------------------------------------------------------------------

console.log("\n--- compilazione ---\n");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, "login.page.ts"), pageObject);
fs.writeFileSync(path.join(TMP, "login.steps.ts"), steps);

// Il compilatore si chiama direttamente con node, non via `npx`: su Windows
// `npx` e' uno script di shell, e un fallimento nello spawn arriverebbe qui
// travestito da errore di compilazione.
const TSC = path.join(ROOT, "node_modules", "typescript", "bin", "tsc");

try {
  execFileSync(
    process.execPath,
    [
      TSC, "--noEmit", "--strict", "--target", "ES2022", "--module", "CommonJS",
      "--moduleResolution", "node", "--esModuleInterop", "--skipLibCheck",
      path.join(TMP, "login.page.ts"),
      path.join(TMP, "login.steps.ts"),
    ],
    { cwd: ROOT, stdio: "pipe" }
  );
  ok("il codice reso dai modelli compila");
  fs.rmSync(TMP, { recursive: true, force: true });
} catch (err) {
  const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
  const report = `${e.stdout?.toString() ?? ""}${e.stderr?.toString() ?? ""}`.trim();
  fail(
    "il codice reso dai modelli NON compila",
    `${report || e.message || "(nessun output dal compilatore)"}\n` +
      `I file sono rimasti in ${path.relative(ROOT, TMP)} per poterli guardare.`
  );
}

// ---------------------------------------------------------------------------

console.log(
  failures === 0
    ? `\nTutti i controlli OK. I modelli reggono ${placeholdersOf(loadTemplate("page-object.ts.tmpl")).length} segnaposto sulla Page Object.`
    : `\n${failures} controlli FALLITI`
);
process.exit(failures === 0 ? 0 : 1);
