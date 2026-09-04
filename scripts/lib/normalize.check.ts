/**
 * normalize.check.ts
 * ------------------
 * Controlli sulla normalizzazione e sul clustering.
 *
 * Perche' esistono: come `atlassian.check.ts`, questo codice non fallisce mai
 * rumorosamente. Se il clustering sbaglia, produce NUMERI, e i numeri finiscono
 * in una presentazione. Un cluster mancato si vede leggendo il report; un
 * cluster SBAGLIATO — due intenzioni diverse fuse perche' si somigliano nelle
 * parole — gonfia il conteggio dei near-duplicate, fa sembrare l'entropia
 * peggiore di quella che e', e distrugge la credibilita' dei numeri il giorno
 * in cui qualcuno in sala legge le frasi. I falsi accoppiamenti sono il rischio
 * principale: meta' di questo file serve a cercarli.
 *
 * Il corpus sintetico riproduce il problema vero: la stessa intenzione scritta
 * da autori diversi, in inglese e in italiano, con e senza virgolette, con e
 * senza parametri, con markup di lista e keyword copiate a meta'.
 * Dominio: e-commerce generico. Nessun dato reale, nessun flusso aziendale.
 *
 * Uso:  npx ts-node scripts/lib/normalize.check.ts
 */

import {
  fingerprint,
  maskParams,
  normalizeStepLine,
  normalizeSteps,
  tokenize,
  type StepBucket,
} from "./normalize";
import {
  clusterSteps,
  tokenSetRatio,
  weightedJaccard,
  DEFAULT_CLUSTER_CONFIG,
  type ClusterInput,
} from "./cluster";

let failures = 0;
let checks = 0;

function ok(name: string): void {
  checks++;
  console.log(`OK   ${name}`);
}

function fail(name: string, detail: string): void {
  checks++;
  failures++;
  console.log(`FAIL ${name}`);
  console.log(`       ${detail}`);
}

function expect(name: string, condition: boolean, detail: string): void {
  if (condition) ok(name);
  else fail(name, detail);
}

// ===========================================================================
// 1. Normalizzazione della singola riga
// ===========================================================================

console.log("\n── 1. Normalizzazione ─────────────────────────────────────────\n");

interface LineCase {
  name: string;
  line: string;
  /** null = la riga non e' un passo. */
  body?: string | null;
  keyword?: string;
  params?: string[];
  values?: string[];
}

const LINE_CASES: LineCase[] = [
  {
    name: "bullet + numerazione + grassetto sulla keyword",
    line: "  1. **Given** the user is logged in",
    body: "the user is logged in",
    keyword: "Given",
    params: [],
  },
  {
    name: "parametri misti: intero, data, letterale fra virgolette",
    line: 'Given the user has 3 items in the cart on 12/05/2024 for "VIP"',
    body: "the user has {int} items in the cart on {date} for {string}",
    keyword: "Given",
    params: ["{int}", "{date}", "{string}"],
    values: ["3", "12/05/2024", "VIP"],
  },
  {
    name: "apici singoli come letterale",
    line: "Given the user flagged the 'Remember this device' option",
    body: "the user flagged the {string} option",
    params: ["{string}"],
    values: ["Remember this device"],
  },
  {
    name: "apostrofo italiano NON e' un letterale fra apici",
    line: "Dato che l'utente ha aperto l'ordine",
    body: "l'utente ha aperto l'ordine",
    keyword: "Dato che",
    params: [],
  },
  {
    name: "decimale con virgola → {float}",
    line: "Then the total is 12,50 euro",
    body: "the total is {float} euro",
    params: ["{float}"],
  },
  {
    name: "cifra dentro un identificatore: non e' un parametro",
    line: "When the user selects SMS2 as channel",
    body: "the user selects SMS2 as channel",
    params: [],
  },
  {
    name: "segnaposto di Scenario Outline trattati come parametri",
    line: "When the user inserts the <Mobile number> and <postcode>",
    body: "the user inserts the {string} and {string}",
    params: ["{string}", "{string}"],
    values: ["Mobile number", "postcode"],
  },
  {
    name: "una disequazione non e' un segnaposto",
    line: "Then the price is <10 and >5 euro",
    body: "the price is <{int} and >{int} euro",
    params: ["{int}", "{int}"],
  },
  {
    name: "cella di tabella: l'esito atteso dopo ' | ' viene tagliato",
    line: "Given I am logged in | home | ok",
    body: "I am logged in",
  },
  {
    name: "riga di struttura: non e' un passo",
    line: "Scenario: Login riuscito",
    body: null,
  },
  {
    name: "keyword nuda senza corpo: non e' un passo",
    line: "Then",
    body: null,
  },
  {
    name: "prosa inglese che inizia per 'Data': non e' un Given italiano",
    line: "Data is displayed correctly in the table",
    body: null,
  },
  {
    name: "punteggiatura terminale e maiuscole non creano varianti",
    line: "GIVEN The User Is Logged In.",
    body: "The User Is Logged In",
  },
];

for (const c of LINE_CASES) {
  const step = normalizeStepLine(c.line);
  const problems: string[] = [];

  if (c.body === null) {
    if (step !== null) problems.push(`atteso non-passo, ottenuto ${JSON.stringify(step.body)}`);
  } else if (step === null) {
    problems.push("atteso un passo, ottenuto null");
  } else {
    if (c.body !== undefined && step.body !== c.body) {
      problems.push(`body atteso ${JSON.stringify(c.body)}, ottenuto ${JSON.stringify(step.body)}`);
    }
    if (c.keyword !== undefined && step.keywordRaw.toLowerCase() !== c.keyword.toLowerCase()) {
      problems.push(`keyword attesa ${c.keyword}, ottenuta ${step.keywordRaw}`);
    }
    if (c.params !== undefined) {
      const got = step.params.map((p) => p.token);
      if (got.join(",") !== c.params.join(",")) {
        problems.push(`parametri attesi [${c.params}], ottenuti [${got}]`);
      }
    }
    if (c.values !== undefined) {
      const got = step.params.map((p) => p.value);
      if (got.join("|") !== c.values.join("|")) {
        problems.push(`valori attesi [${c.values}], ottenuti [${got}]`);
      }
    }
  }

  if (problems.length === 0) ok(c.name);
  else fail(c.name, problems.join("; "));
}

// Impronte che DEVONO coincidere: sono la stessa frase scritta da tastiere e
// abitudini diverse, non tre modi diversi di dire la cosa.
const SAME_FINGERPRINT: Array<[string, string[]]> = [
  [
    "accenti, apostrofi tipografici e troncamenti italiani",
    [
      "Dato che l'utente è autenticato",
      "Dato che l'utente e' autenticato",
      "Dato che l’utente è autenticato.",
      "* **Dato** che l'utente è autenticato",
    ],
  ],
  [
    "'Given that' e 'Given' sono lo stesso passo",
    ["Given the user is logged in", "Given that the user is logged in", "given the user is logged in"],
  ],
];

for (const [name, lines] of SAME_FINGERPRINT) {
  const fps = new Set(lines.map((l) => normalizeStepLine(l)?.fingerprint ?? "(null)"));
  expect(
    `impronta unica — ${name}`,
    fps.size === 1,
    `attesa 1 impronta, ottenute ${fps.size}: ${[...fps].map((f) => JSON.stringify(f)).join(", ")}`
  );
}

// Ereditarieta' di And/But: senza, premesse e verifiche finiscono mescolate.
{
  const text = [
    "Scenario: Ordine",
    "Given the user is logged in",
    "And the cart contains 2 items",
    "When the user confirms the order",
    "And the user accepts the terms",
    "Then the order is confirmed",
    "But no email is sent",
  ].join("\n");
  const got = normalizeSteps(text).map((n) => n.step.bucket).join(",");
  const want: StepBucket[] = ["Given", "Given", "When", "When", "Then", "Then"];
  expect(
    "And/But ereditano la keyword del passo precedente",
    got === want.join(","),
    `attesi [${want}], ottenuti [${got}]`
  );
}

{
  const text = ["Scenario: A", "Given x is ready", "Scenario: B", "And y is ready"].join("\n");
  const got = normalizeSteps(text).map((n) => n.step.bucket);
  expect(
    "una riga di struttura chiude la sequenza: nessuna eredita' fra scenari",
    got[1] === "Unknown",
    `atteso Unknown per il secondo passo, ottenuto ${got[1]}`
  );
}

// ===========================================================================
// 2. Corpus sintetico — la stessa intenzione scritta da autori diversi
// ===========================================================================

console.log("\n── 2. Clustering su corpus sintetico ──────────────────────────\n");

interface Page {
  id: string;
  title: string;
  branch: string;
  lines: string[];
}

/**
 * Sei "pagine" scritte da autori diversi. Le famiglie di intenzione sono
 * quattro (login EN, login IT, aggiunta al carrello EN, aggiunta al carrello
 * IT) piu' un gruppo di trappole: frasi lessicalmente vicine e semanticamente
 * opposte, che e' la forma in cui i falsi accoppiamenti si presentano davvero.
 */
const CORPUS: Page[] = [
  {
    id: "p1",
    title: "Checkout — flusso base",
    branch: "Checkout",
    lines: [
      "Scenario: Acquisto di un prodotto",
      "Given the user is logged in",
      "When the user adds a product to the cart",
      "Then the order is confirmed",
    ],
  },
  {
    id: "p2",
    title: "Checkout — varianti",
    branch: "Checkout",
    lines: [
      "Scenario: Acquisto con profilo",
      "1. **Given** the user is logged in",
      "2. And the user is logged in to the shop",
      "3. When the user adds the product to the cart",
      "4. And the user adds 2 products to the cart",
      "5. Then the order is confirmed",
      "6. And the order is confirmed by email",
    ],
  },
  {
    id: "p3",
    title: "Account — accesso",
    branch: "Account",
    lines: [
      "Scenario: Accesso con profilo",
      'Given the user is logged in as "standard"',
      "Given that the user is logged in",
      "when the user adds a product to cart",
      'When the user adds the product "Blue T-Shirt" to the cart',
      "Then the order is confirmed",
    ],
  },
  {
    id: "p4",
    title: "Carrello — versione italiana",
    branch: "Carrello",
    lines: [
      "Scenario: Aggiunta al carrello",
      "Dato che l'utente è autenticato",
      "Quando l'utente aggiunge un prodotto al carrello",
      "Allora l'ordine è confermato",
    ],
  },
  {
    id: "p5",
    title: "Carrello — varianti italiane",
    branch: "Carrello",
    lines: [
      "Scenario: Aggiunta al carrello con profilo",
      "- Dato che l'utente e' autenticato",
      "- Dato che l’utente è autenticato.",
      '- Dato che l\'utente è autenticato come "standard"',
      "- Dato che l'utente è già autenticato",
      "- Quando l'utente aggiunge il prodotto al carrello",
      "- Quando l'utente aggiunge 2 prodotti al carrello",
      "- Quando l'utente aggiunge il prodotto \"Maglietta Blu\" al carrello",
      "- Allora l'ordine è confermato",
    ],
  },
  {
    id: "p6",
    title: "Casi limite — coppie insidiose",
    branch: "Account",
    lines: [
      "Scenario: Uscita e liste",
      "Given the user is logged out",
      "When the user opens the login page",
      "When the user opens the logout page",
      "When the user removes a product from the cart",
      'When the user adds "Blue T-Shirt" to the cart',
      "Then the order is not confirmed",
      "Then the cart contains 2 items",
      "Then the wishlist contains 2 items",
      "Then the user sees the order history",
      'When the user selects "IT" as country',
      "Given the user has a valid payment method",
      "Given the user has an invalid payment method",
    ],
  },
  {
    id: "p7",
    title: "Ricerca",
    branch: "Catalogo",
    lines: [
      "Scenario: Ricerca prodotti",
      'When the user searches for "shoes"',
      "Then the results page shows 12 products",
      "Then the results page is empty",
      "Given the catalogue contains 500 products",
      "Quando l'utente cerca un prodotto nel catalogo",
      "Allora il catalogo mostra 12 prodotti",
      "When the user selects a service",
      "When the user selected a service",
      "When the user added a product to the cart",
      "When the user removed a product from the cart",
    ],
  },
];

const inputs: ClusterInput[] = [];
/** Indice riga-grezza → chiave di cluster, per scrivere le asserzioni in chiaro. */
const keyOfLine = new Map<string, string>();

for (const page of CORPUS) {
  for (const n of normalizeSteps(page.lines.join("\n"))) {
    inputs.push({
      step: n.step,
      source: { docId: page.id, docTitle: page.title, branch: page.branch, line: n.line },
    });
    keyOfLine.set(n.step.raw.trim(), `${n.step.bucket} ${n.step.fingerprint}`);
  }
}

const result = clusterSteps(inputs);

const clusterOfKey = new Map<string, string>();
for (const c of result.clusters) {
  for (const v of [c.canonical, ...c.aliases]) {
    clusterOfKey.set(`${c.bucket} ${v.fingerprint}`, c.id);
  }
}

function clusterOf(line: string): string | undefined {
  const key = keyOfLine.get(line.trim());
  return key ? clusterOfKey.get(key) : undefined;
}

console.log(
  `  corpus: ${inputs.length} occorrenze, ${new Set(inputs.map((i) => `${i.step.bucket} ${i.step.fingerprint}`)).size} varianti distinte, ` +
    `${result.clusters.length} cluster, IDF ${result.idfApplied ? "attivo" : "non attivo"}\n`
);

// ── 2a. Devono finire nello STESSO cluster ────────────────────────────────

const SAME_CLUSTER: Array<{ name: string; lines: string[] }> = [
  {
    name: "EN — 'utente autenticato' scritto in 6 modi",
    lines: [
      "Given the user is logged in",
      "1. **Given** the user is logged in",
      "Given that the user is logged in",
      '  Given the user is logged in as "standard"',
      "2. And the user is logged in to the shop",
    ],
  },
  {
    name: "IT — 'utente autenticato' scritto in 5 modi",
    lines: [
      "Dato che l'utente è autenticato",
      "- Dato che l'utente e' autenticato",
      "- Dato che l’utente è autenticato.",
      '- Dato che l\'utente è autenticato come "standard"',
      "- Dato che l'utente è già autenticato",
    ],
  },
  {
    name: "EN — 'aggiunta al carrello' con e senza parametri",
    lines: [
      "When the user adds a product to the cart",
      "3. When the user adds the product to the cart",
      "4. And the user adds 2 products to the cart",
      "when the user adds a product to cart",
      'When the user adds the product "Blue T-Shirt" to the cart',
    ],
  },
  {
    name: "IT — 'aggiunta al carrello' con e senza parametri",
    lines: [
      "Quando l'utente aggiunge un prodotto al carrello",
      "- Quando l'utente aggiunge il prodotto al carrello",
      "- Quando l'utente aggiunge 2 prodotti al carrello",
      "- Quando l'utente aggiunge il prodotto \"Maglietta Blu\" al carrello",
    ],
  },
  {
    name: "EN — stesso passo al presente e al passato",
    lines: ["When the user selects a service", "When the user selected a service"],
  },
  {
    name: "EN — 'ordine confermato' con precisazione",
    lines: ["Then the order is confirmed", "6. And the order is confirmed by email"],
  },
];

for (const group of SAME_CLUSTER) {
  const ids = group.lines.map((l) => `${clusterOf(l) ?? "(assente)"}`);
  const distinct = new Set(ids);
  expect(
    `stesso cluster — ${group.name}`,
    distinct.size === 1 && !distinct.has("(assente)"),
    group.lines.map((l, i) => `${ids[i]} ← ${l.trim()}`).join("\n       ")
  );
}

// ── 2b. NON devono finire nello stesso cluster ────────────────────────────
//
// Sono i falsi accoppiamenti realistici: una parola di differenza, significato
// opposto. Se uno solo di questi passa, tutte le metriche di near-duplicate
// vanno buttate.

const DIFFERENT_CLUSTER: Array<{ name: string; a: string; b: string }> = [
  {
    name: "antonimo direzionale — logged in / logged out",
    a: "Given the user is logged in",
    b: "Given the user is logged out",
  },
  {
    name: "negazione — ordine confermato / non confermato",
    a: "Then the order is confirmed",
    b: "Then the order is not confirmed",
  },
  {
    name: "sostantivo di dominio — carrello / lista desideri",
    a: "Then the cart contains 2 items",
    b: "Then the wishlist contains 2 items",
  },
  {
    name: "antonimo di azione — aggiunge / rimuove",
    a: "When the user adds a product to the cart",
    b: "When the user removes a product from the cart",
  },
  {
    name: "antonimo flesso — added / removed (stem diversi, stessa opposizione)",
    a: "When the user added a product to the cart",
    b: "When the user removed a product from the cart",
  },
  {
    name: "antonimo di pagina — login page / logout page",
    a: "When the user opens the login page",
    b: "When the user opens the logout page",
  },
  {
    name: "prefisso di negazione — valid / invalid",
    a: "Given the user has a valid payment method",
    b: "Given the user has an invalid payment method",
  },
  {
    name: "lingue diverse — limite noto del metodo lessicale",
    a: "Given the user is logged in",
    b: "Dato che l'utente è autenticato",
  },
  {
    name: "keyword diversa — premessa e verifica restano separate",
    a: "Given the catalogue contains 500 products",
    b: "Then the results page shows 12 products",
  },
];

for (const pair of DIFFERENT_CLUSTER) {
  const ca = clusterOf(pair.a);
  const cb = clusterOf(pair.b);
  const sa = normalizeStepLine(pair.a);
  const sb = normalizeStepLine(pair.b);
  const detail =
    sa && sb
      ? `${ca} vs ${cb} — jaccard(non pesato) ${weightedJaccard(sa.tokens, sb.tokens, () => 1).toFixed(2)}, ` +
        `tokenSet ${tokenSetRatio(sa.tokens, sb.tokens).toFixed(2)}`
      : `${ca} vs ${cb}`;
  expect(
    `cluster distinti — ${pair.name}`,
    ca !== undefined && cb !== undefined && ca !== cb,
    detail
  );
}

// ── 2c. Near-miss: cio' che il metodo NON sa decidere da solo ─────────────
//
// "adds {string} to the cart" senza il sostantivo "product" e' la stessa
// intenzione, ma lessicalmente il nucleo condiviso e' troppo povero per fondere
// senza rischiare. Il comportamento corretto non e' fondere: e' finire nella
// lista dei near-miss, dove un umano decide in due secondi.

{
  const orphan = 'When the user adds "Blue T-Shirt" to the cart';
  const family = "When the user adds a product to the cart";
  const orphanFp = normalizeStepLine(orphan)?.fingerprint ?? "";
  const listed = result.nearMisses.some((nm) => nm.a === orphanFp || nm.b === orphanFp);

  expect(
    "near-miss — variante senza il sostantivo chiave non viene fusa d'ufficio",
    clusterOf(orphan) !== undefined && clusterOf(orphan) !== clusterOf(family),
    `orphan in ${clusterOf(orphan)}, famiglia in ${clusterOf(family)}`
  );
  expect(
    "near-miss — ma finisce nella lista da far leggere a un umano",
    listed,
    `impronta ${JSON.stringify(orphanFp)} assente dai ${result.nearMisses.length} near-miss registrati`
  );
}

// Diagnostica sempre stampata: sono le coppie su cui il metodo si e' fermato a
// un passo dalla fusione. Se qui compaiono coppie ovviamente equivalenti, la
// soglia `combinedMin` e' troppo alta; se compaiono coppie ovviamente diverse
// con punteggi alti, e' troppo bassa. E' la manopola di taratura, in chiaro.
console.log("\n  near-miss registrati (punteggio, coppia):");
if (result.nearMisses.length === 0) {
  console.log("    (nessuno)");
} else {
  for (const nm of result.nearMisses.slice(0, 8)) {
    console.log(
      `    ${nm.combined.toFixed(3)}  [${nm.bucket}] ${nm.a}  ~  ${nm.b}` +
        `   (j=${nm.jaccard.toFixed(2)} ts=${nm.tokenSet.toFixed(2)})`
    );
  }
}
console.log("");

// ── 2d. Proprieta' strutturali del risultato ──────────────────────────────

{
  const total = inputs.length;
  const inClusters = result.clusters.reduce((s, c) => s + c.size, 0);
  expect(
    "nessuna occorrenza persa per strada",
    inClusters === total,
    `${inClusters} occorrenze nei cluster su ${total} in ingresso`
  );
}

{
  const dup = result.clusters.filter((c) => c.distinctVariants > 1);
  expect(
    "i cluster near-duplicate vengono riconosciuti",
    dup.length >= 4,
    `attesi almeno 4 cluster con piu' di una variante, trovati ${dup.length}`
  );
}

{
  // La forma canonica deve essere la variante piu' frequente, non la prima vista.
  const bad = result.clusters.filter((c) =>
    c.aliases.some((a) => a.count > c.canonical.count)
  );
  expect(
    "la forma canonica e' la variante piu' frequente del cluster",
    bad.length === 0,
    bad.map((c) => `${c.id}: canonica ${c.canonical.count} < alias ${c.aliases[0]?.count}`).join("; ")
  );
}

{
  // I valori dei parametri sopravvivono: sono i paramEnums candidati del catalogo.
  const withEnum = result.clusters.find((c) =>
    c.paramEnums.some((p) => p.values.some((v) => v.value === "standard"))
  );
  expect(
    "i valori dei parametri restano disponibili come paramEnums candidati",
    withEnum !== undefined,
    "nessun cluster conserva il valore 'standard' estratto da un {string}"
  );
}

{
  // Un cluster presente su piu' rami e' il candidato di catalogo piu' prezioso:
  // dimostra che due aree stanno gia' dicendo la stessa cosa in modi diversi.
  const crossBranch = result.clusters.filter((c) => Object.keys(c.branches).length > 1);
  expect(
    "i cluster trasversali fra rami vengono individuati",
    crossBranch.length >= 1,
    `nessun cluster copre piu' di un ramo (rami distinti: ${new Set(inputs.map((i) => i.source.branch)).size})`
  );
}

// Determinismo: due esecuzioni sullo stesso input devono dare lo stesso esito.
{
  const again = clusterSteps(inputs);
  const a = JSON.stringify(result.clusters.map((c) => [c.id, c.canonical.fingerprint, c.size]));
  const b = JSON.stringify(again.clusters.map((c) => [c.id, c.canonical.fingerprint, c.size]));
  expect("clustering deterministico su input identico", a === b, "due run hanno prodotto cluster diversi");
}

// L'ordine di lettura delle pagine non deve cambiare le conclusioni.
{
  const shuffled = [...inputs].reverse();
  const other = clusterSteps(shuffled);
  const sig = (r: typeof result): string =>
    JSON.stringify(
      r.clusters
        .map((c) => `${c.bucket}|${c.canonical.fingerprint}|${c.size}`)
        .sort()
    );
  expect(
    "l'ordine delle pagine in ingresso non cambia i cluster",
    sig(result) === sig(other),
    "invertendo l'ordine degli input i cluster cambiano"
  );
}

// Coerenza interna del normalizzatore: mascherare e poi rimascherare non deve
// spostare nulla (i token {string} non vengono riletti come parametri).
{
  const twice = maskParams(maskParams('Given the user picks "A" and 3 items').masked);
  expect(
    "il mascheramento e' idempotente",
    twice.params.length === 0 && twice.masked === "Given the user picks {string} and {int} items",
    `ottenuto ${JSON.stringify(twice.masked)} con ${twice.params.length} parametri`
  );
}

{
  const t = tokenize(fingerprint("the user is NOT logged in"));
  expect(
    "le parole che ribaltano il senso non sono stop-word",
    t.includes("not") && t.includes("in"),
    `token ottenuti: [${t}]`
  );
}

// ===========================================================================

console.log(
  failures === 0
    ? `\n${checks}/${checks} controlli OK`
    : `\n${failures}/${checks} controlli FALLITI`
);
process.exit(failures === 0 ? 0 : 1);
