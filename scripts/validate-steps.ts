/**
 * validate-steps.ts
 * -----------------
 * Pre-commit hook validator.
 *
 * Reads every staged .feature file, extracts step text, and checks each step
 * against the expressions in step-catalog.json.
 *
 * Exit codes:
 *   0  All steps matched (or only warnings).
 *   1  One or more steps have no match (commit blocked).
 *
 * Override: set env var SKIP_STEP_VALIDATION=1 to let the commit through
 * regardless (Steve's escape hatch, equivalent to --no-verify).
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ---------------------------------------------------------------------------
// Types (mirrors step-catalog.json shape)
// ---------------------------------------------------------------------------

interface CatalogStep {
  expression: string;
  parameters: string[];
  domain: string;
  sourceRef: string;
  doc: { intent?: string; params: Record<string, string> };
  /**
   * Formulazioni note della stessa intenzione, raccolte dal corpus esistente.
   *
   * Sono il pezzo che fa la differenza fra uno strumento adottato e uno
   * aggirato. Senza, chi scrive una variante si sente dire "step non a
   * catalogo, chiedi al gatekeeper" — inutile e frustrante, perche' l'aveva
   * scritto proprio perche' non sapeva che esistesse. Con gli alias il
   * validatore sa esattamente cosa intendeva e glielo mette davanti.
   */
  aliases?: string[];
}

interface StepCatalog {
  steps: CatalogStep[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Cucumber expression to a RegExp. */
function cucumberExprToRegex(expr: string): RegExp {
  const parts = expr.split(/(\{[^}]+\})/);
  const pattern = parts
    .map((part) => {
      if (part.startsWith("{") && part.endsWith("}")) {
        switch (part.slice(1, -1)) {
          case "string":
            return '"[^"]*"|\'[^\']*\'';
          case "int":
            return "-?\\d+";
          case "float":
            return "-?\\d*\\.?\\d+";
          case "word":
            return "\\S+";
          default:
            return ".+";
        }
      }
      // Escape regex special chars in the literal portion.
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
  return new RegExp(`^${pattern}$`, "i");
}

/** Normalised Levenshtein similarity in [0, 1]. */
function similarity(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0 && n === 0) return 1;
  if (m === 0 || n === 0) return 0;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

/** Strip Cucumber param tokens so fuzzy comparison works on literal text. */
function normExpr(expr: string): string {
  return expr.replace(/\{[^}]+\}/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Extract step text (without Given/When/Then/And/But keyword) from file content. */
const STEP_LINE_RE = /^\s*(Given|When|Then|And|But)\s+(.+)/i;

interface StepLocation {
  text: string;
  line: number;
}

function extractSteps(content: string): StepLocation[] {
  const results: StepLocation[] = [];
  content.split("\n").forEach((raw, idx) => {
    const m = raw.match(STEP_LINE_RE);
    if (m) results.push({ text: m[2].trim(), line: idx + 1 });
  });
  return results;
}

/** Get .feature files that are staged for commit. */
function getStagedFeatureFiles(): string[] {
  try {
    const out = execSync("git diff --cached --name-only --diff-filter=ACM", {
      encoding: "utf-8",
    });
    return out
      .trim()
      .split("\n")
      .filter((f) => f.endsWith(".feature") && fs.existsSync(f));
  } catch {
    return [];
  }
}

/** Load step-catalog.json, regenerating it if absent. */
function loadCatalog(): StepCatalog | null {
  const catalogPath = path.resolve(__dirname, "..", "step-catalog.json");
  if (!fs.existsSync(catalogPath)) {
    console.warn(
      "\n⚠️  step-catalog.json not found. Regenerating (this takes a few seconds)...\n"
    );
    try {
      execSync("npm run catalog", { stdio: "inherit" });
    } catch {
      console.error("❌  Could not regenerate step-catalog.json. Skipping step validation.");
      return null;
    }
  }
  try {
    return JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as StepCatalog;
  } catch {
    console.error("❌  Failed to parse step-catalog.json. Skipping step validation.");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  if (process.env.SKIP_STEP_VALIDATION === "1") {
    console.log("ℹ️  SKIP_STEP_VALIDATION=1 — step validation skipped.");
    process.exit(0);
  }

  // Percorsi espliciti se ne arrivano, altrimenti i file in staging.
  //
  // Serve alla generazione: uno scenario appena prodotto va validato PRIMA di
  // essere proposto a chi lo ha chiesto, e in quel momento non e' in staging —
  // non e' nemmeno detto che finisca mai in un commit. Serve anche per provare
  // il validatore su un file a mano, senza dover fare git add.
  const explicit = process.argv.slice(2).filter((a) => a.endsWith(".feature"));
  const featureFiles = explicit.length > 0 ? explicit : getStagedFeatureFiles();
  if (featureFiles.length === 0) {
    // Nothing to validate.
    process.exit(0);
  }

  const catalog = loadCatalog();
  if (!catalog) {
    // Graceful degradation: let the commit through with a warning.
    process.exit(0);
  }

  // Pre-compile all catalog regexes once.
  const compiled = catalog.steps.map((s) => ({
    expression: s.expression,
    regex: cucumberExprToRegex(s.expression),
    norm: normExpr(s.expression),
    sourceRef: s.sourceRef,
  }));

  /**
   * Le varianti note, ognuna con la forma canonica che la sostituisce.
   *
   * Cercate DOPO le espressioni canoniche: una frase che e' gia' conforme non
   * deve passare da qui.
   */
  const aliases = catalog.steps.flatMap((s) =>
    (s.aliases ?? []).map((a) => ({
      alias: a,
      regex: cucumberExprToRegex(a),
      canonical: s.expression,
    }))
  );

  /**
   * In fase di avvio il catalogo e' giovane e quasi tutto e' una variante: se
   * ogni variante bloccasse un commit, la gente aggirerebbe il controllo e
   * saremmo punto e a capo. `STEP_VALIDATION_MODE=warn` degrada i blocchi ad
   * avvisi finche' il catalogo non e' maturo.
   */
  const lenient = process.env["STEP_VALIDATION_MODE"] === "warn";

  let hasErrors = false;
  const WARN_THRESHOLD = 0.8;

  for (const file of featureFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const steps = extractSteps(content);

    if (steps.length === 0) continue;

    let fileHasIssues = false;

    for (const { text, line } of steps) {
      // 1. Try exact (regex) match.
      const exactMatch = compiled.find((c) => c.regex.test(text));
      if (exactMatch) continue;

      // 2. Variante nota: sappiamo esattamente cosa intendeva chi ha scritto.
      //    Non e' un "non conforme" generico — e' una correzione con la riga
      //    gia' pronta da incollare, che si applica in cinque secondi.
      const knownVariant = aliases.find((a) => a.regex.test(text));
      if (knownVariant) {
        if (!fileHasIssues) {
          console.error(`\n❌  ${file}`);
          fileHasIssues = true;
        }
        console.error(
          `   ${lenient ? "⚠️ " : "🔁"}  Line ${line}: variante nota di uno step esistente\n` +
          `       Hai scritto: "${text}"\n` +
          `       Usa invece:  "${knownVariant.canonical}"\n` +
          `       → Stessa intenzione, gia' a catalogo. Sostituisci e prosegui.`
        );
        if (!lenient) hasErrors = true;
        continue;
      }

      // 3. No exact match — fuzzy search for closest.
      const normText = normExpr(text);
      const best = compiled.reduce(
        (acc, c) => {
          const score = similarity(normText, c.norm);
          return score > acc.score ? { score, expression: c.expression, ref: c.sourceRef } : acc;
        },
        { score: 0, expression: "", ref: "" }
      );

      if (!fileHasIssues) {
        console.error(`\n❌  ${file}`);
        fileHasIssues = true;
      }

      if (best.score >= WARN_THRESHOLD) {
        // Close enough to warn, not block.
        console.warn(
          `   ⚠️  Line ${line}: step not in catalog (${Math.round(best.score * 100)}% similar to an existing step)\n` +
          `       Found:    "${text}"\n` +
          `       Closest:  "${best.expression}"  [${best.ref}]\n` +
          `       → Did you mean the existing step? Reuse it to keep deterministic coverage.`
        );
        // Warnings alone do not block.
      } else {
        // Far from anything — hard error.
        console.error(
          `   🚫  Line ${line}: step not in catalog and no close match found\n` +
          `       Step: "${text}"\n` +
          `       → Ask Steve to add this step to the catalog before committing.`
        );
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    console.error(
      "\n┌──────────────────────────────────────────────────────────────┐\n" +
      "│  Commit BLOCKED: one or more steps are not in step-catalog.  │\n" +
      "│  Fix: reuse an existing step or ask Steve to add a new one.   │\n" +
      "│  Bypass (Steve only): SKIP_STEP_VALIDATION=1 git commit ...   │\n" +
      "└──────────────────────────────────────────────────────────────┘\n"
    );
    process.exit(1);
  }

  if (featureFiles.length > 0) {
    console.log(
      `✅  Step validation passed (${featureFiles.length} feature file(s) checked).`
    );
  }
  process.exit(0);
}

main();
