/**
 * benchmark.check.ts
 * ------------------
 * Controlli sulle misure.
 *
 * PERCHE' CONTANO PIU' DEGLI ALTRI CONTROLLI DI QUESTO REPOSITORY
 * Perche' questi numeri finiranno su una slide, e da li' in una decisione. Una
 * misura sbagliata non si rompe: da' un risultato, lo da' con sicurezza, e
 * nessuno in sala ha modo di accorgersene. Il rischio non e' il difetto — e'
 * l'autorevolezza di un numero che non ha guadagnato.
 *
 * I casi sotto sono scritti per **fallire nella direzione scomoda**: se il
 * rilevatore di selettori negli step non prende una violazione, il risultato
 * senza regole sembra migliore di quello che e'.
 *
 * Uso:  npm run check:benchmark
 */

import { scoreGherkin, scoreSteps, scorePages, parseRoleLocator } from "./benchmark";
import type { CatalogStep, Component } from "./generation-contract";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

// ---------------------------------------------------------------------------
// Gherkin
// ---------------------------------------------------------------------------

console.log("\n--- Gherkin ---\n");

const CATALOG: CatalogStep[] = [
  { expression: "the customer signs in", keyword: "Given" },
  { expression: "the customer cancels an order", keyword: "When" },
  { expression: "the page shows {string}", keyword: "Then", aliases: ["la pagina mostra {string}"] },
];

{
  const feature = [
    "Feature: prova",
    "  Scenario: uno",
    "    Given the customer signs in",
    "    When the customer cancels an order",
    '    Then the page shows "Annullato"',
  ].join("\n");
  const s = scoreGherkin(feature, CATALOG);
  eq("tre passi, tutti dal catalogo", [s.total, s.reused, s.introduced.length], [3, 3, 0]);
  eq("riuso pieno", s.reuseRatio, 1);
}

{
  // Il parametro concreto non deve far sembrare nuovo uno step che nuovo non e':
  // il confronto avviene sull'impronta mascherata, come nel resto del progetto.
  const feature = 'Feature: p\n  Scenario: s\n    Then the page shows "tutt\'altro testo"';
  eq("il valore del parametro non conta", scoreGherkin(feature, CATALOG).reused, 1);
}

{
  // L'alias in italiano deve valere quanto l'espressione: e' il caso vero, dato
  // che le etichette del tester sono in italiano.
  const feature = 'Feature: p\n  Scenario: s\n    Then la pagina mostra "Annullato"';
  eq("un alias vale quanto l'espressione", scoreGherkin(feature, CATALOG).reused, 1);
}

{
  const feature = [
    "Feature: p",
    "  Scenario: s",
    "    Given l'utente accede",
    "    When l'utente accede",
    "    Then the customer signs in",
  ].join("\n");
  const s = scoreGherkin(feature, CATALOG);
  eq("una formulazione nuova ripetuta e' UN solo step nuovo", s.introduced.length, 1);
  eq("e il riuso conta le occorrenze, non le formulazioni", s.reused, 1);
}

{
  // La conformita' deve penalizzare la meccanica UI: e' il difetto che il
  // confronto senza regole dovrebbe far emergere.
  const meccanico = 'Feature: p\n  Scenario: s\n    When the user clicks the "Login" button';
  const dichiarativo = "Feature: p\n  Scenario: s\n    When the customer signs in";
  const a = scoreGherkin(meccanico, CATALOG).conformityMean;
  const b = scoreGherkin(dichiarativo, CATALOG).conformityMean;
  if (a < b) ok(`la meccanica UI viene penalizzata (${a.toFixed(2)} contro ${b.toFixed(2)})`);
  else fail("conformita'", `il passo meccanico ha preso ${a.toFixed(2)}, quello dichiarativo ${b.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// Step definition
// ---------------------------------------------------------------------------

console.log("\n--- step definition ---\n");

{
  const pulito = [
    'Given("the customer signs in", async function (this: CustomWorld) {',
    "  loginPage = new LoginPage(this.page);",
    "  await loginPage.clickEntra();",
    "});",
  ].join("\n");
  const s = scoreSteps(pulito);
  eq("nessuna violazione su glue pulita", s.selectorsInSteps.length, 0);
  eq("una definizione contata", s.definitions, 1);
  eq("il World e' tipizzato", s.worldTyped, 1);
}

{
  // Ogni riga qui e' un modo diverso in cui un selettore finisce nel layer
  // sbagliato. Tutti visti davvero in codice generato senza regole.
  const sporco = [
    'When("a", async function (this: CustomWorld) {',
    '  await this.page.locator("#login-button").click();',
    '  await this.page.getByRole("button", { name: "Entra" }).click();',
    '  await this.page.fill("[data-testid=email]", "x");',
    "});",
  ].join("\n");
  const s = scoreSteps(sporco);
  if (s.selectorsInSteps.length >= 3) ok(`tre violazioni di layer prese (${s.selectorsInSteps.length})`);
  else fail("selettori negli step", `ne ha prese solo ${s.selectorsInSteps.length} su 3`);
}

{
  // Un commento che nomina un selettore non e' una violazione: segnalarlo
  // renderebbe la misura rumorosa, e una misura rumorosa viene ignorata.
  const commento = '// prima usavamo this.page.locator("#x")\nGiven("a", async function (this: CustomWorld) {});';
  eq("un selettore dentro a un commento non conta", scoreSteps(commento).selectorsInSteps.length, 0);
}

{
  const arrow = 'When("a", async () => {\n  await doThing();\n});';
  eq("l'arrow function viene contata: perde `this`", scoreSteps(arrow).arrowFunctions, 1);
}

// ---------------------------------------------------------------------------
// Page Object
// ---------------------------------------------------------------------------

console.log("\n--- Page Object ---\n");

{
  const parsed = parseRoleLocator("getByRole('button', { name: 'Entra' })");
  eq("ruolo e nome estratti dal locator", parsed, { role: "button", name: "Entra" });
}

{
  const known: Component[] = [
    { role: "button", name: "Entra", kind: "action", locator: "", method: "clickEntra", occurrences: 1, stability: "stable", notes: [] },
  ];
  const pages = [
    "private readonly a = this.page.getByRole('button', { name: 'Entra' });",
    "private readonly b = this.page.getByRole('button', { name: 'Accedi ora' });",
  ];
  const s = scorePages(pages, known);
  eq("due locator letti", s.locators, 2);
  eq("quello che nel dizionario non c'e' viene isolato", s.unknown, ['button "Accedi ora"']);
}

console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
