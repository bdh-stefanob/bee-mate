/**
 * generate-core.check.ts
 * ----------------------
 * Controlli sulla generazione. Due livelli, perche' sbagliano in modi diversi.
 *
 * 1. LE FUNZIONI PURE — identita' delle pagine, aggancio al dizionario, rosa dei
 *    candidati. Qui gli errori sono silenziosi: una Page Object di troppo, un
 *    componente attribuito alla pagina sbagliata, un candidato mancante. Niente
 *    si rompe, e il risultato e' semplicemente peggiore senza che si veda.
 *
 * 2. LA CATENA INTERA — si genera da una registrazione finta e **si compila**.
 *    E' il livello che prende le cose che sfuggono al ragionamento: un badge di
 *    carrello che si chiama "1" produce `1Button`, che non e' un identificatore
 *    TypeScript valido. Nessuno ci arriva pensandoci; il compilatore ci arriva
 *    sempre.
 *
 * La registrazione finta e' fatta apposta per essere ostile: un intento che
 * cambia pagina, un URL con un identificativo dentro, un componente che nel
 * dizionario NON c'e', una verifica ancorata a un numero, e un catalogo in
 * inglese contro etichette in italiano.
 *
 * Uso:  npm run check:generate
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  looksLikeId, pageIdentity, uniqueNames, indexDictionaries, resolveRecording, rankCandidates,
} from "./generate-core";
import type {
  CatalogStep, Gap, Intent, Recording, ResolvedStep, ScoutResult,
} from "./generation-contract";

const ROOT = path.join(__dirname, "..", "..");
const FIXTURES = path.join(ROOT, "test-fixtures", "generate");
const TMP = path.join(ROOT, "reports", ".generate-check");

let failures = 0;

function ok(what: string): void {
  console.log(`OK   ${what}`);
}
function fail(what: string, detail: string): void {
  failures++;
  console.log(`FAIL ${what}\n       ${detail.split("\n").join("\n       ")}`);
}
function eq(what: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) ok(what);
  else fail(what, `ottenuto ${JSON.stringify(actual)}, atteso ${JSON.stringify(expected)}`);
}
function truthy(what: string, value: unknown, detail = ""): void {
  if (value) ok(what);
  else fail(what, detail || "atteso qualcosa di vero");
}

// ---------------------------------------------------------------------------
// 1. Identita' delle pagine
// ---------------------------------------------------------------------------

console.log("\n--- identita' delle pagine ---\n");

for (const [segment, expected, why] of [
  ["4821", true, "solo cifre: e' un identificativo"],
  ["550e8400-e29b-41d4-a716-446655440000", true, "uuid"],
  ["a3f9c2b81d4e", true, "esadecimale lungo"],
  ["ordini", false, "parola"],
  ["order-detail", false, "parola composta"],
  ["v2", false, "versione: fa parte del percorso"],
] as const) {
  const got = looksLikeId(segment);
  if (got === expected) ok(`"${segment}" -> ${got ? "id" : "percorso"} (${why})`);
  else fail(`"${segment}"`, `ottenuto ${got}, atteso ${expected} — ${why}`);
}

{
  const id = pageIdentity("https://esempio.invalid/ordini/4821?token=abc#giu");
  eq("l'identificativo nel percorso non fa pagina a se'", id.pattern, "/ordini/:id");
  eq("il percorso vero resta intero, serve a navigare", id.path, "/ordini/4821");
  eq("il nome di classe viene dal segmento parlante", id.className, "OrdiniPage");
}
{
  const id = pageIdentity("https://esempio.invalid/");
  eq("la radice si chiama Home", id.className, "HomePage");
}
{
  const id = pageIdentity("https://esempio.invalid/inventory.html");
  eq("l'estensione non entra nel nome", id.className, "InventoryPage");
}
{
  const id = pageIdentity("non-un-url");
  eq("un URL illeggibile non fa cadere niente", id.className, "HomePage");
}

{
  // Due pagine diverse che finiscono uguale: senza disambiguazione la seconda
  // sovrascriverebbe la prima in silenzio.
  const ids = uniqueNames([
    pageIdentity("https://esempio.invalid/admin/settings"),
    pageIdentity("https://esempio.invalid/account/settings"),
    pageIdentity("https://esempio.invalid/carrello"),
  ]);
  eq("collisione disambiguata", [ids[0]!.className, ids[1]!.className], ["AdminSettingsPage", "AccountSettingsPage"]);
  eq("chi non collide non viene rinominato", ids[2]!.className, "CarrelloPage");
}

{
  // L'incidente del 2026-09-16, sulla prima registrazione vera: l'elenco e il
  // dettaglio della stessa risorsa. Stesso segmento parlante, nessun segmento
  // prima da usare come prefisso, stesso host: la disambiguazione produceva di
  // nuovo due nomi uguali. La seconda Page Object ha sovrascritto la prima, e il
  // test e' arrivato con 8 metodi mancanti e 4 dichiarazioni doppie.
  const ids = uniqueNames([
    pageIdentity("https://esempio.invalid/visite"),
    pageIdentity("https://esempio.invalid/visite/9712"),
  ]);
  eq("elenco e dettaglio hanno due nomi", [ids[0]!.className, ids[1]!.className], ["VisitePage", "VisiteDetailPage"]);
  eq("e due file", [ids[0]!.slug, ids[1]!.slug], ["visite", "visite-detail"]);
}

{
  const ids = uniqueNames([
    pageIdentity("https://esempio.invalid/negozio/ordini/1"),
    pageIdentity("https://esempio.invalid/archivio/ordini/2"),
  ]);
  eq(
    "due dettagli in rami diversi",
    [ids[0]!.className, ids[1]!.className],
    ["NegozioOrdiniDetailPage", "ArchivioOrdiniDetailPage"]
  );
}

{
  // L'ultima rete: due host diversi che nessuna regola sa separare per nome.
  // Meglio un numero in coda che una sovrascrittura silenziosa.
  const ids = uniqueNames([
    pageIdentity("https://a-b.invalid/x"),
    pageIdentity("https://a.b.invalid/x"),
  ]);
  const nomi = ids.map((i) => i.className);
  eq("mai due nomi di classe uguali, neanche all'ultima rete", new Set(nomi).size, nomi.length);
  eq("e mai due file uguali", new Set(ids.map((i) => i.slug)).size, ids.length);
}

// ---------------------------------------------------------------------------
// 2. Aggancio e rosa dei candidati
// ---------------------------------------------------------------------------

console.log("\n--- aggancio al dizionario ---\n");

const recording = JSON.parse(fs.readFileSync(path.join(FIXTURES, "recording.json"), "utf-8")) as Recording;
const dicts = fs
  .readdirSync(path.join(FIXTURES, "scout"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(FIXTURES, "scout", f), "utf-8")) as ScoutResult);
const catalog = (JSON.parse(fs.readFileSync(path.join(FIXTURES, "catalog.json"), "utf-8")) as { steps: CatalogStep[] }).steps;

const resolved = resolveRecording(recording, indexDictionaries(dicts), { catalog });

eq("due pagine, non una e non tre", resolved.pages.length, 2);
eq(
  "i nomi delle pagine",
  resolved.pages.map((p) => p.className).sort(),
  ["AccessoPage", "OrdiniPage"]
);

{
  const first = resolved.intents[0]!;
  truthy(
    "l'intento che ha cambiato pagina lo dichiara",
    first.navigatesTo && first.navigatesTo.includes("/ordini/:id"),
    `navigatesTo = ${first.navigatesTo}`
  );
  eq("i gesti restano attribuiti alla pagina su cui sono avvenuti", first.page, "esempio.invalid/accesso");
}

{
  const cancel = resolved.intents[1]!.steps[0]!;
  truthy("il componente assente dal dizionario viene sintetizzato, non perso", cancel.synthesised);
  eq("e il locator e' quello che userebbe lo scout", cancel.component.locator, "getByRole('button', { name: 'Annulla ordine' })");
}

const kinds = (g: readonly Gap[]): string[] => [...new Set(g.map((x) => x.kind))].sort();
eq(
  "i buchi dichiarati sono quelli veri",
  kinds(resolved.gaps),
  ["asserzione-non-verificabile", "componente-non-nel-dizionario"]
);

console.log("\n--- rosa dei candidati ---\n");

{
  // IL CASO CHE CONTA. L'etichetta e' in italiano, il catalogo in inglese:
  // nessuna somiglianza lessicale li fara' mai incontrare. Li fa incontrare
  // l'ancoraggio ai componenti, che di lingua non ne ha.
  const first = resolved.intents[0]!.candidates;
  eq(
    "italiano contro inglese: li aggancia il componente, non la parola",
    first[0]?.expression,
    "the customer signs in"
  );

  const second = resolved.intents[1]!.candidates;
  eq("stesso meccanismo sul secondo intento", second[0]?.expression, "the customer cancels an order");

  const all = [...first, ...second].map((c) => c.expression);
  truthy(
    "uno step senza niente in comune resta fuori dalla rosa",
    !all.includes("the warehouse dispatches the parcel"),
    `la rosa conteneva: ${all.join(" | ")}`
  );
}

{
  // IL CASO CHE DIVENTERA' NORMALE: etichetta ed espressione nella stessa
  // lingua, e uno step di catalogo che NON dichiara componenti — che oggi e' la
  // stragrande maggioranza.
  //
  // Prima della normalizzazione uno step del genere prendeva 0 sull'ancoraggio,
  // cioe' veniva punito per un campo non compilato, e per superare la soglia gli
  // serviva il 67% di somiglianza lessicale. Lo strumento restava muto proprio
  // nel caso piu' comune.
  const intent: Intent = {
    label: "the customer cancels the order",
    steps: [{ action: "click", role: "button", name: "Cancel order" }],
    assertions: [],
    notes: [],
  };
  const soloTesto: CatalogStep[] = [
    { expression: "the customer cancels an order", keyword: "When" },
    { expression: "the warehouse dispatches the parcel", keyword: "When" },
  ];
  const rosa = rankCandidates(intent, [], soloTesto, 5);
  eq(
    "stessa lingua, step non ancorato: entra lo stesso nella rosa",
    rosa[0]?.step.expression,
    "the customer cancels an order"
  );
  truthy(
    "e quello che non c'entra resta comunque fuori",
    !rosa.some((c) => c.step.expression.includes("warehouse")),
    `la rosa conteneva: ${rosa.map((c) => c.step.expression).join(" | ")}`
  );
}

{
  // L'ancoraggio deve restare piu' forte del lessico: quando i due segnali
  // indicano candidati diversi, vince il componente. E' identita' contro stima.
  const intent: Intent = {
    label: "the user signs in",
    steps: [{ action: "click", role: "button", name: "Entra" }],
    assertions: [],
    notes: [],
  };
  const misto: CatalogStep[] = [
    { expression: "the user signs in to the newsletter", keyword: "When" },
    { expression: "il cliente accede", keyword: "Given", components: [{ role: "button", name: "Entra" }] },
  ];
  const resolvedSteps: ResolvedStep[] = [
    {
      step: { action: "click", role: "button", name: "Entra" },
      component: {
        role: "button", name: "Entra", kind: "action",
        locator: "getByRole('button', { name: 'Entra' })", method: "clickEntra",
        occurrences: 1, stability: "stable", notes: [],
      },
      synthesised: false,
      fromPage: "esempio.invalid/accesso",
    },
  ];
  const rosa = rankCandidates(intent, resolvedSteps, misto, 5);
  eq(
    "quando i due segnali litigano, vince il componente",
    rosa[0]?.step.expression,
    "il cliente accede"
  );
}

// ---------------------------------------------------------------------------
// 3. La catena intera: si genera davvero, e si compila
// ---------------------------------------------------------------------------

console.log("\n--- generazione e compilazione ---\n");

interface Manifest {
  files: Array<{ path: string }>;
}

function runGenerate(extra: string[]): Manifest {
  execFileSync(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "ts-node", "dist", "bin.js"),
      path.join(ROOT, "scripts", "generate.ts"),
      path.join(FIXTURES, "recording.json"),
      "--scout", path.join(FIXTURES, "scout"),
      "--catalog", path.join(FIXTURES, "catalog.json"),
      "--name", "zz-controllo",
      "--manifest", path.join(TMP, "manifest.json"),
      ...extra,
    ],
    { cwd: ROOT, stdio: "pipe" }
  );
  return JSON.parse(fs.readFileSync(path.join(TMP, "manifest.json"), "utf-8")) as Manifest;
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

// Prima a vuoto, per sapere quali file toccheremmo e salvarli. Il controllo
// scrive dentro a src/ — non c'e' altro modo di compilare con gli import veri —
// e non deve lasciare traccia, nemmeno se fallisce a meta'.
const planned = runGenerate(["--dry"]);
const before = new Map<string, string | null>();
for (const f of planned.files) {
  const abs = path.join(ROOT, f.path);
  before.set(abs, fs.existsSync(abs) ? fs.readFileSync(abs, "utf-8") : null);
}

const restore = (): void => {
  for (const [abs, content] of before) {
    if (content === null) fs.rmSync(abs, { force: true });
    else fs.writeFileSync(abs, content, "utf-8");
  }
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "reports", "generate", "zz-controllo"), { recursive: true, force: true });
};

try {
  const made = runGenerate([]);
  eq("tre file generati: due pagine e la glue, piu' la feature", made.files.length, 4);

  const page = fs.readFileSync(path.join(ROOT, "src", "pages", "generated", "ordini.page.ts"), "utf-8");
  truthy("la Page Object espone il componente sintetizzato", page.includes("clickAnnullaOrdine"));

  const steps = fs.readFileSync(path.join(ROOT, "src", "steps", "generated", "zz-controllo.steps.ts"), "utf-8");
  truthy(
    "la transizione fra pagine e' esplicita nella glue",
    /ordiniPage = new OrdiniPage\(this\.page\);/.test(steps),
    "manca la costruzione della pagina di arrivo"
  );
  truthy(
    "la password non finisce mai nel codice",
    !steps.includes("<password>") && steps.includes('process.env["APP_PASSWORD"]'),
    "il valore segreto e' stato scritto nel file"
  );
  truthy(
    "le frasi sono quelle del tester, non quelle del catalogo",
    steps.includes("il cliente accede all'area ordini"),
    "il generatore ha scelto la frase al posto di chi deve sceglierla"
  );

  execFileSync(
    process.execPath,
    [path.join(ROOT, "node_modules", "typescript", "bin", "tsc"), "--noEmit", "-p", "tsconfig.json"],
    { cwd: ROOT, stdio: "pipe" }
  );
  ok("il codice generato compila");
} catch (err) {
  const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
  const report = `${e.stdout?.toString() ?? ""}${e.stderr?.toString() ?? ""}`.trim();
  fail("la catena intera", report || e.message || "(nessun output)");
} finally {
  restore();
}

console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
