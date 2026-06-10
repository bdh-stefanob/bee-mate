/**
 * import-scenarios.ts
 * --------------------
 * CLI che importa scenari BDD da un file .txt o .feature nel repo,
 * producendo:
 *   1. Un file .feature valido in src/features/<area>/
 *   2. Skeleton step @wanted per i nuovi step in src/steps/<app>/imported/
 *   3. Rigenerazione automatica del catalog via npm run catalog
 *
 * Uso:
 *   npx ts-node scripts/import-scenarios.ts \
 *     --input <file.txt|file.feature> \
 *     [--app <app>] \
 *     [--area <area>]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Interfacce interne
// ---------------------------------------------------------------------------

interface ParsedStep {
  raw: string;         // riga originale
  keyword: string;     // Given | When | Then | And | But | *
  expression: string;  // dopo normalizzazione placeholder
}

interface ParsedScenario {
  type: 'Scenario' | 'Scenario Outline';
  name: string;
  steps: ParsedStep[];
  rawLines: string[];  // tutte le righe originali dello scenario (incluse Examples/tabelle)
}

interface ParsedFeature {
  name: string;
  rawHeaderLines: string[];  // righe prima del primo Scenario
  scenarios: ParsedScenario[];
}

interface CatalogStep {
  expression: string;
  status: string;
}

interface Catalog {
  steps: CatalogStep[];
}

// ---------------------------------------------------------------------------
// Helper: slugify
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Helper: normalizeStep
// Restituisce { expression, keyword } data una riga step grezza.
// ---------------------------------------------------------------------------

function normalizeStep(rawStep: string): { expression: string; keyword: string } {
  const keywordRe = /^(Given|When|Then|And|But|\*)\s+/;
  const m = rawStep.match(keywordRe);
  const keyword = m ? m[1] : 'When';
  let text = m ? rawStep.slice(m[0].length) : rawStep;

  // Normalizza placeholder — l'ordine è importante: float prima di int
  text = text.replace(/\b\d+\.\d+\b/g, '{float}');
  text = text.replace(/"[^"]*"/g, '{string}');
  text = text.replace(/'[^']*'/g, '{string}');
  text = text.replace(/\b\d+\b/g, '{int}');

  return { expression: text.trim(), keyword };
}

// ---------------------------------------------------------------------------
// Helper: parseScenarios
// Analizza il contenuto del file e restituisce la struttura ParsedFeature.
// ---------------------------------------------------------------------------

function parseScenarios(content: string): ParsedFeature {
  const lines = content.split(/\r?\n/);

  let featureName = '';
  const rawHeaderLines: string[] = [];
  const scenarios: ParsedScenario[] = [];

  let currentScenario: ParsedScenario | null = null;
  let inScenario = false;
  let headerDone = false;  // set to true after first Scenario is encountered
  let lastMainKeyword = 'When'; // fallback per And/But/*

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Feature
    const featureMatch = trimmed.match(/^Feature:\s*(.*)/i);
    if (featureMatch) {
      featureName = featureMatch[1].trim();
      rawHeaderLines.push(line);
      continue;
    }

    // Scenario / Scenario Outline
    const scenarioMatch = trimmed.match(/^(Scenario Outline|Scenario):\s*(.*)/);
    if (scenarioMatch) {
      if (currentScenario) {
        scenarios.push(currentScenario);
      }
      const type = scenarioMatch[1] as 'Scenario' | 'Scenario Outline';
      currentScenario = {
        type,
        name: scenarioMatch[2].trim(),
        steps: [],
        rawLines: [line],
      };
      inScenario = true;
      headerDone = true;
      lastMainKeyword = 'When';
      continue;
    }

    if (inScenario && currentScenario) {
      // Aggiungi la riga al raw buffer dello scenario
      currentScenario.rawLines.push(line);

      // Step Gherkin (Given/When/Then/And/But/*)
      const stepMatch = trimmed.match(/^(Given|When|Then|And|But|\*)\s+(.*)/);
      if (stepMatch) {
        const kw = stepMatch[1];
        const rawText = `${kw} ${stepMatch[2]}`;

        // Risolvi keyword effettivo per And/But/*
        let resolvedKeyword = kw;
        if (kw === 'And' || kw === 'But' || kw === '*') {
          resolvedKeyword = lastMainKeyword;
        } else {
          lastMainKeyword = kw;
        }

        const { expression } = normalizeStep(rawText);
        currentScenario.steps.push({
          raw: rawText,
          keyword: resolvedKeyword,
          expression,
        });
        continue;
      }

      // Righe Examples/tabella — già incluse in rawLines, nessuna azione extra
    } else if (!headerDone) {
      rawHeaderLines.push(line);
    }
  }

  if (currentScenario) {
    scenarios.push(currentScenario);
  }

  return { name: featureName, rawHeaderLines, scenarios };
}

// ---------------------------------------------------------------------------
// Helper: validazione path (T-03-01)
// Rifiuta path che attraversano fuori dalla cwd con ..
// ---------------------------------------------------------------------------

function validateInputPath(inputPath: string): string {
  const resolved = path.resolve(inputPath);
  const cwd = process.cwd() + path.sep;
  const tmpDir = os.tmpdir() + path.sep;
  // Allow both project root (CLI use) and os.tmpdir() (API-generated temp files)
  if (!resolved.startsWith(cwd) && resolved !== process.cwd() && !resolved.startsWith(tmpDir)) {
    throw new Error(
      `Path non sicuro: "${inputPath}" non è dentro la root del progetto (${process.cwd()}).`
    );
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
  // --- 1. Parsing CLI args ---
  const args = process.argv.slice(2);
  let inputArg = '';
  let appArg = 'app-a';
  let areaArg = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputArg = args[++i];
    } else if (args[i] === '--app' && args[i + 1]) {
      appArg = args[++i];
    } else if (args[i] === '--area' && args[i + 1]) {
      areaArg = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Uso: npx ts-node scripts/import-scenarios.ts --input <file> [--app <app>] [--area <area>]

  --input   (obbligatorio) File .txt o .feature da importare
  --app     (opzionale, default: app-a) App per il path degli step skeleton
  --area    (opzionale) Area; se omessa, deriva dal nome Feature o dal nome file
      `);
      process.exit(0);
    }
  }

  if (!inputArg) {
    console.error('Errore: --input <file> è obbligatorio.');
    console.error('Usa --help per la documentazione.');
    process.exit(1);
  }

  // Sanitize --app with slugify (same pattern as areaArg) to prevent path traversal
  appArg = slugify(appArg) || 'app-a';

  // --- Validazione path (T-03-01) ---
  let resolvedInput: string;
  try {
    resolvedInput = validateInputPath(inputArg);
  } catch (e: any) {
    console.error(`Errore di sicurezza: ${e.message}`);
    process.exit(1);
  }

  if (!fs.existsSync(resolvedInput)) {
    console.error(`File non trovato: ${resolvedInput}`);
    process.exit(1);
  }

  // --- 2. Lettura e parsing ---
  const content = fs.readFileSync(resolvedInput, 'utf-8');
  const feature = parseScenarios(content);

  // Nome Feature: dall'header, o basename del file input
  const inputBasename = path.basename(resolvedInput, path.extname(resolvedInput));
  if (!feature.name) {
    feature.name = inputBasename;
  }

  // --- Determina area ---
  const area = areaArg
    ? slugify(areaArg)
    : slugify(feature.name) || slugify(inputBasename);

  const featureSlug = slugify(feature.name) || area;

  // --- 3. Raccolta step e normalizzazione già fatta in parseScenarios ---
  // Raccogliamo tutti gli step unici
  const allSteps: ParsedStep[] = [];
  const seenExpressions = new Set<string>();
  for (const scenario of feature.scenarios) {
    for (const step of scenario.steps) {
      if (!seenExpressions.has(step.expression)) {
        seenExpressions.add(step.expression);
        allSteps.push(step);
      }
    }
  }

  // --- 4. Deduplicazione contro il catalog ---
  let catalog: Catalog = { steps: [] };
  const catalogPath = path.join(process.cwd(), 'step-catalog.json');
  if (fs.existsSync(catalogPath)) {
    try {
      catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as Catalog;
    } catch {
      console.warn('Warning: impossibile leggere step-catalog.json — procedo senza deduplicazione.');
    }
  }

  const catalogExpressions = new Set(catalog.steps.map((s) => s.expression));

  const newSteps: ParsedStep[] = [];
  const skippedSteps: ParsedStep[] = [];

  for (const step of allSteps) {
    if (catalogExpressions.has(step.expression)) {
      skippedSteps.push(step);
    } else {
      newSteps.push(step);
    }
  }

  // --- 5. Produzione file .feature ---
  const featureDir = path.join(process.cwd(), 'src', 'features', area);
  const featurePath = path.join(featureDir, `${featureSlug}.feature`);

  fs.mkdirSync(featureDir, { recursive: true });

  if (fs.existsSync(featurePath)) {
    console.warn(`Warning: file .feature già esistente, non sovrascritto: ${featurePath}`);
  } else {
    const featureContent = buildFeatureContent(feature, area);
    fs.writeFileSync(featurePath, featureContent, 'utf-8');
  }

  // --- 6. Produzione skeleton step @wanted ---
  const stepsDir = path.join(process.cwd(), 'src', 'steps', appArg, 'imported');
  const stepsPath = path.join(stepsDir, `${area}.steps.ts`);

  fs.mkdirSync(stepsDir, { recursive: true });

  if (newSteps.length > 0) {
    if (!fs.existsSync(stepsPath)) {
      // File nuovo: scrivi header + tutti gli step
      const header = buildStepsHeader(appArg, area, resolvedInput);
      const stepsContent = newSteps.map((s) => buildStepSkeleton(s)).join('\n');
      fs.writeFileSync(stepsPath, header + stepsContent + '\n', 'utf-8');
    } else {
      // File esistente: append solo degli step non già presenti
      const existing = fs.readFileSync(stepsPath, 'utf-8');
      const toAppend = newSteps.filter(
        (s) => !existing.includes(`"${s.expression}"`)
      );
      if (toAppend.length > 0) {
        const appendContent = toAppend.map((s) => buildStepSkeleton(s)).join('\n');
        fs.appendFileSync(stepsPath, appendContent + '\n', 'utf-8');
      }
    }
  }

  // --- 7. Rigenera catalog ---
  try {
    execSync('npm run catalog', { stdio: 'inherit' });
  } catch (e) {
    console.error('Errore: npm run catalog ha fallito — il catalog potrebbe essere inconsistente.');
    console.error('Verifica manualmente con: npm run catalog');
    process.exit(1);
  }

  // --- 8. Riepilogo ---
  const actualNewCount = newSteps.length;
  const actualSkipCount = skippedSteps.length;

  console.log('\nImport completato.');
  console.log(`  Feature file:    ${featurePath}`);
  if (actualNewCount > 0) {
    console.log(`  Skeleton steps:  ${stepsPath}  (${actualNewCount} step nuovi)`);
  } else {
    console.log(`  Skeleton steps:  nessun nuovo step da aggiungere`);
  }
  console.log(`  Step skippati:   ${actualSkipCount} già nel catalog`);
  console.log(`  Catalog:         rigenerato (npm run catalog)`);
}

// ---------------------------------------------------------------------------
// Helper: costruisce il contenuto del file .feature
// ---------------------------------------------------------------------------

function buildFeatureContent(feature: ParsedFeature, area: string): string {
  const lines: string[] = [];
  lines.push(`@${area}`);
  lines.push(`Feature: ${feature.name}`);
  lines.push('');

  for (const scenario of feature.scenarios) {
    lines.push(`  ${scenario.type}: ${scenario.name}`);

    let inExamples = false;
    for (const rawLine of scenario.rawLines) {
      const trimmed = rawLine.trim();

      // Skip la riga "Scenario:..." — già aggiunta sopra
      if (trimmed.match(/^(Scenario Outline|Scenario):/)) continue;

      if (trimmed.match(/^Examples:/i)) {
        inExamples = true;
        lines.push(`    Examples:`);
        continue;
      }

      if (inExamples && trimmed.startsWith('|')) {
        lines.push(`      ${trimmed}`);
        continue;
      }

      // Step Gherkin
      const stepMatch = trimmed.match(/^(Given|When|Then|And|But|\*)\s+(.*)/);
      if (stepMatch) {
        lines.push(`    ${stepMatch[1]} ${stepMatch[2]}`);
        continue;
      }

      // Righe vuote all'interno degli scenari
      if (trimmed === '') {
        lines.push('');
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helper: costruisce l'header del file .steps.ts
// ---------------------------------------------------------------------------

function buildStepsHeader(app: string, area: string, inputPath: string): string {
  const now = new Date().toISOString();
  return `// src/steps/${app}/imported/${area}.steps.ts
// Step skeleton importati da: ${inputPath}
// Generati il: ${now}
// ATTENZIONE: implementazioni da completare manualmente.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
`;
}

// ---------------------------------------------------------------------------
// Helper: costruisce il blocco skeleton per un singolo step
// ---------------------------------------------------------------------------

function buildStepSkeleton(step: ParsedStep): string {
  const kw = step.keyword;

  // Derive parameter list from expression placeholders, in order
  const paramTypes: string[] = [];
  const placeholderRe = /\{(string|int|float|word|any)\}/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = placeholderRe.exec(step.expression)) !== null) {
    const tsType = m[1] === 'int' || m[1] === 'float' ? 'number' : 'string';
    paramTypes.push(`arg${idx++}: ${tsType}`);
  }
  const paramList = paramTypes.length ? `, ${paramTypes.join(', ')}` : '';

  return `
/**
 * @intent    <da completare>
 * @wanted
 * @requester TBD
 */
${kw}(
  "${step.expression}",
  async function (this: CustomWorld${paramList}) {
    throw new Error('NOT IMPLEMENTED');
  }
);
`;
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

main();
