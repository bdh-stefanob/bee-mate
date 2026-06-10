---
phase: 03-scenario-importer
reviewed: 2026-06-10T09:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/import-scenarios.ts
  - src/steps/app-a/imported/checkout.steps.ts
  - src/features/checkout/checkout-happy-path.feature
  - test-fixtures/sample-import.txt
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-06-10T09:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the `import-scenarios.ts` CLI tool and its generated artefacts (`checkout.steps.ts`, `checkout-happy-path.feature`). The parsing logic, Gherkin reconstruction, and step-catalog deduplication are structurally correct. Two security issues were found: the path-traversal guard contains a logic flaw that allows absolute paths outside the project root, and the `--app` CLI argument is written directly into `path.join` calls without sanitisation. Three correctness warnings are raised: generated step skeletons omit Cucumber parameter bindings (silent runtime data loss), the catalog regeneration error is swallowed with exit code 0, and inter-scenario lines are misattributed in the parser. Two informational items cover the embedded absolute path in generated file headers and double blank lines in skeleton output.

---

## Critical Issues

### CR-01: Path-traversal guard bypassed by absolute paths outside cwd

**File:** `scripts/import-scenarios.ts:175-189`

**Issue:** `validateInputPath` first resolves the input and checks whether it starts with `process.cwd()`. When it does not (any absolute path on a different drive or parent directory), execution falls into the `else` branch. That branch checks whether the *original* `inputPath` string contains `..`. An absolute path such as `/etc/passwd` or `C:\Windows\System32\drivers\etc\hosts` passes both checks — no `..`, resolved path is returned — and the file is read on line 242. The guard therefore provides no protection against absolute paths supplied by the caller.

**Fix:**
```typescript
function validateInputPath(inputPath: string): string {
  const resolved = path.resolve(inputPath);
  const cwd = process.cwd() + path.sep;   // ensure trailing separator
  if (!resolved.startsWith(cwd) && resolved !== process.cwd()) {
    throw new Error(
      `Path non sicuro: "${inputPath}" non è dentro la root del progetto (${process.cwd()}).`
    );
  }
  return resolved;
}
```
Remove the inner `else` branch entirely. Any path that does not resolve to inside `cwd` — regardless of whether it contains `..` — should be rejected.

---

### CR-02: `--app` argument written to `path.join` without sanitisation

**File:** `scripts/import-scenarios.ts:309`

**Issue:** `appArg` is taken from the `--app` CLI argument (line 206) and used directly in `path.join(process.cwd(), 'src', 'steps', appArg, 'imported')`. It is never passed through `slugify()` or validated. A caller passing `--app ../../etc` causes the resolved path to escape the project's `src/steps/` directory. Unlike `areaArg` (which is slugified on line 253), `appArg` has no equivalent guard.

**Fix:**
```typescript
// After parsing --app:
appArg = slugify(appArg || 'app-a') || 'app-a';

// Or, add explicit validation:
if (!/^[a-z0-9-]+$/.test(appArg)) {
  console.error(`Errore: --app contiene caratteri non validi: "${appArg}"`);
  process.exit(1);
}
```
Apply `slugify()` to `appArg` immediately after parsing (same pattern already used for `areaArg`).

---

## Warnings

### WR-01: Generated step skeletons omit Cucumber parameter bindings

**File:** `scripts/import-scenarios.ts:425-440`

**Issue:** `buildStepSkeleton` always generates `async function (this: CustomWorld)` with no parameters, even when `step.expression` contains `{string}`, `{int}`, or `{float}` placeholders. Cucumber injects matched values as positional arguments; the generated function ignores them. When a developer copies the skeleton to implement the step, the parameters are silently unavailable. For example, `When("I add {string} to the basket", ...)` needs `async function(this: CustomWorld, product: string)`. The current output in `checkout.steps.ts` shows six steps with parameters, all with zero-argument signatures (lines 27-97).

**Fix:**
```typescript
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
```

---

### WR-02: Catalog regeneration failure swallowed — process exits 0

**File:** `scripts/import-scenarios.ts:334-338`

**Issue:** If `npm run catalog` fails (e.g., TypeScript compile error after writing the new skeleton file), the `catch` block logs a warning and the process exits normally with code 0. The import summary on lines 344-352 is still printed as "Import completato", making the caller (and CI) believe everything succeeded when in fact the catalog is now stale and inconsistent with the written step file.

**Fix:**
```typescript
try {
  execSync('npm run catalog', { stdio: 'inherit' });
} catch (e) {
  console.error('Errore: npm run catalog ha fallito — il catalog potrebbe essere inconsistente.');
  console.error('Verifica manualmente con: npm run catalog');
  process.exit(1);
}
```
At minimum, use `process.exit(1)` so upstream callers and CI detect the failure. Alternatively, use exit code 2 to distinguish "import ok, catalog failed" from other errors.

---

### WR-03: Lines between scenarios misattributed to `rawHeaderLines`

**File:** `scripts/import-scenarios.ts:158-160`

**Issue:** When `inScenario` is `false` (either before the first `Scenario` block or between two scenario blocks), any line is appended to `rawHeaderLines` (line 159). In a well-formed feature file, blank lines between scenarios fall here and are pushed into the header. `buildFeatureContent` does not use `rawHeaderLines` for body reconstruction, so this is currently harmless. However, if a future caller uses `rawHeaderLines` to reconstruct the full file, the header would contain extraneous inter-scenario lines. The condition should explicitly track whether the header section is complete.

**Fix:**
```typescript
let headerDone = false;  // set to true after first Scenario is encountered

// In the scenario match block:
if (scenarioMatch) {
  headerDone = true;
  // ... existing logic
}

// In the else branch:
} else if (!headerDone) {
  rawHeaderLines.push(line);
}
```

---

## Info

### IN-01: Generated file header embeds absolute local filesystem path

**File:** `scripts/import-scenarios.ts:410-418`; observed in `src/steps/app-a/imported/checkout.steps.ts:2`

**Issue:** `buildStepsHeader` writes the fully-resolved `inputPath` (the absolute OS path, e.g. `C:\Users\sbert\...\sample-import.txt`) into the comment header of every generated `.steps.ts` file. This leaks the local developer's directory structure into committed source files and is not reproducible across machines (Windows vs Linux paths differ).

**Fix:**
```typescript
function buildStepsHeader(app: string, area: string, inputPath: string): string {
  const now = new Date().toISOString();
  // Use path relative to cwd for portability
  const relInput = path.relative(process.cwd(), inputPath).replace(/\\/g, '/');
  return `// src/steps/${app}/imported/${area}.steps.ts
// Step skeleton importati da: ${relInput}
// Generati il: ${now}
// ATTENZIONE: implementazioni da completare manualmente.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
`;
}
```

---

### IN-02: Double blank lines between step skeletons in generated output

**File:** `scripts/import-scenarios.ts:427`; observed in `src/steps/app-a/imported/checkout.steps.ts:20-21`

**Issue:** `buildStepSkeleton` returns a string that starts with `\n` (line 427). Skeletons are joined with another `\n` via `.join('\n')` on line 319, producing two consecutive blank lines between each block. The project convention (existing hand-authored step files) uses a single blank line between step definitions.

**Fix:** Remove the leading `\n` from the template literal in `buildStepSkeleton`:
```typescript
function buildStepSkeleton(step: ParsedStep): string {
  const kw = step.keyword;
  return `/**
 * @intent    <da completare>
 * @wanted
 * @requester TBD
 */
${kw}(
  "${step.expression}",
  async function (this: CustomWorld) {
    throw new Error('NOT IMPLEMENTED');
  }
);
`;
}
```
And change the join separator: `newSteps.map((s) => buildStepSkeleton(s)).join('\n')`.

---

_Reviewed: 2026-06-10T09:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
