/**
 * extract-steps.ts
 * -----------------
 * MOTORE del catalogo. Estrae tutti gli step definition dal codice usando
 * il formatter "message" di Cucumber.js in dry-run (NON esegue i test),
 * e arricchisce ogni step con la documentazione accessoria letta dal
 * commento strutturato (@intent/@param/@pre/@post) sopra la definizione.
 *
 * Produce step-catalog.json: la fonte di verità STRUTTURATA, derivata dal
 * codice. Nessuno la scrive a mano.
 *
 * Uso:
 *   npx cucumber-js --dry-run --format message:cucumber-messages.ndjson
 *   npx ts-node scripts/extract-steps.ts cucumber-messages.ndjson
 *
 * Exit code:
 *   0 sempre (gli step non documentati sono un WARNING, non un errore:
 *   non vogliamo far fallire la build per un commento mancante).
 */

import * as fs from "fs";

interface StepDoc {
  intent?: string;
  params: Record<string, string>;
  pre?: string;
  post?: string;
  page?: string; // Page Object this step operates on (e.g. LoginPage, CartPage)
  wanted?: boolean;
  deprecated?: boolean;
  replacedBy?: string;
  requester?: string;
  assignee?: string;
}

interface CatalogStep {
  expression: string;
  parameters: string[];
  app: string;
  area: string;
  domain: string;
  status: 'implemented' | 'wanted' | 'deprecated';
  replacedBy?: string;
  requester?: string;
  assignee?: string;
  page?: string; // promoted from doc for easy filtering
  sourceRef: string;
  doc: StepDoc;
  documented: boolean; // true se ha almeno @intent
}

const inputPath = process.argv[2] || "cucumber-messages.ndjson";

if (!fs.existsSync(inputPath)) {
  console.error(`File non trovato: ${inputPath}`);
  console.error(
    "Genera prima: npx cucumber-js --dry-run --format message:" + inputPath
  );
  process.exit(1);
}

// Cache dei file sorgente già letti.
const fileCache = new Map<string, string[]>();
function readSourceLines(uri: string): string[] {
  if (fileCache.has(uri)) return fileCache.get(uri)!;
  let lines: string[] = [];
  try {
    lines = fs.readFileSync(uri, "utf-8").split("\n");
  } catch {
    lines = []; // file non leggibile: doc vuota, nessun crash
  }
  fileCache.set(uri, lines);
  return lines;
}

/**
 * Risale dalla riga dello step verso l'alto; se trova un blocco JSDoc-like
 * (chiuso da "* /"), ne estrae i tag.
 */
function extractDoc(uri: string, stepLine: number): StepDoc {
  const doc: StepDoc = { params: {} };
  const lines = readSourceLines(uri);
  if (lines.length === 0) return doc;

  let i = stepLine - 2; // riga sopra lo step (0-based)
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i < 0 || !lines[i].trim().startsWith("*/")) return doc;

  const block: string[] = [];
  while (i >= 0) {
    block.unshift(lines[i]);
    if (lines[i].trim().startsWith("/**")) break;
    i--;
  }

  const clean = block
    .map((l) => l.replace(/^\s*\/?\*+\/?/, "").trim())
    .filter((l) => l.length > 0);

  for (const line of clean) {
    const m = line.match(/^@(\w+)(?:\s+(.*))?$/);
    if (!m) continue;
    const tag = m[1];
    const rest = (m[2] ?? "").trim();
    if (tag === "intent") doc.intent = rest;
    else if (tag === "pre") doc.pre = rest;
    else if (tag === "post") doc.post = rest;
    else if (tag === "page") doc.page = rest;
    else if (tag === "wanted") doc.wanted = true;
    else if (tag === "deprecated") doc.deprecated = true;
    else if (tag === "replacedBy") doc.replacedBy = rest;
    else if (tag === "requester") doc.requester = rest;
    else if (tag === "assignee") doc.assignee = rest;
    else if (tag === "param") {
      const pm = rest.match(/^(\S+)\s+(.*)$/);
      if (pm) doc.params[pm[1]] = pm[2];
    }
  }
  return doc;
}

const lines = fs
  .readFileSync(inputPath, "utf-8")
  .split("\n")
  .filter((l) => l.trim().length > 0);

const steps: CatalogStep[] = [];

for (const line of lines) {
  let msg: any;
  try {
    msg = JSON.parse(line);
  } catch {
    continue;
  }
  if (!msg.stepDefinition) continue;

  const sd = msg.stepDefinition;
  const expression: string = sd.pattern?.source ?? "(espressione ignota)";
  const uri: string = sd.sourceReference?.uri ?? "?";
  const lineNo: number = sd.sourceReference?.location?.line ?? 0;
  const sourceRef = `${uri}:${lineNo || "?"}`;

  // Deriva app, area e domain dal path del file step.
  // Supporta path POSIX e Windows (sia "/" che "\").
  // Struttura attesa: steps/<app>/<area>/...
  // Edge case steps/<app>/... (1 livello, es. common): area = app, domain = app.
  const appMatch = uri.match(/steps[/\\]([^/\\]+)[/\\]/);
  const areaMatch = uri.match(/steps[/\\][^/\\]+[/\\]([^/\\]+)[/\\]/);
  const app = appMatch ? appMatch[1] : "common";
  const area = areaMatch ? areaMatch[1] : app;
  const domain = areaMatch ? `${app}/${area}` : app;

  const parameters = [...expression.matchAll(/{[^}]+}/g)].map((m) => m[0]);

  const doc = lineNo ? extractDoc(uri, lineNo) : { params: {} };
  const documented = Boolean(doc.intent);

  const status: 'implemented' | 'wanted' | 'deprecated' =
    doc.wanted ? 'wanted' :
    doc.deprecated ? 'deprecated' :
    'implemented';

  steps.push({
    expression,
    parameters,
    app,
    area,
    domain,
    status,
    ...(doc.replacedBy ? { replacedBy: doc.replacedBy } : {}),
    ...(doc.requester ? { requester: doc.requester } : {}),
    ...(doc.assignee ? { assignee: doc.assignee } : {}),
    page: doc.page,
    sourceRef,
    doc,
    documented,
  });
}

steps.sort((a, b) =>
  a.domain === b.domain
    ? a.expression.localeCompare(b.expression)
    : a.domain.localeCompare(b.domain)
);

const undocumented = steps.filter((s) => !s.documented);

const catalog = {
  generatedAt: new Date().toISOString(),
  totalSteps: steps.length,
  documentedSteps: steps.length - undocumented.length,
  undocumentedSteps: undocumented.length,
  steps,
};

fs.writeFileSync("step-catalog.json", JSON.stringify(catalog, null, 2));
console.log(
  `Catalogo estratto: ${steps.length} step ` +
    `(${catalog.documentedSteps} documentati, ${undocumented.length} senza @intent).`
);

if (undocumented.length > 0) {
  console.warn("\n⚠️  Step senza @intent (documentazione consigliata):");
  for (const s of undocumented) {
    console.warn(`   - ${s.expression}   [${s.sourceRef}]`);
  }
  console.warn(
    "\nNon è un errore: la build continua. Aggiungi un commento @intent " +
      "sopra questi step quando puoi.\n"
  );
}
