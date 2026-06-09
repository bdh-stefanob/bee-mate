---
phase: 02-catalog-pipeline-upgrade
reviewed: 2026-06-09T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/extract-steps.ts
  - scripts/render-markdown.ts
  - src/steps/app-a/orders/orders.steps.ts
  - vscode-extension/src/catalog/types.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-09
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files reviewed: two build-pipeline scripts (`extract-steps.ts`, `render-markdown.ts`), one step-stub file (`orders.steps.ts`), and the VS Code extension type definitions (`types.ts`).

The main structural concerns are: missing error handling around I/O in both scripts (unhandled exceptions instead of friendly messages), a misleading test failure mode for `@wanted` step stubs, and a schema drift risk between the extension type file and the canonical emitter.

No security vulnerabilities, hardcoded credentials, or injection risks found.

---

## Warnings

### WR-01: `render-markdown.ts` — unhandled crash if `step-catalog.json` is missing or malformed

**File:** `scripts/render-markdown.ts:35`
**Issue:** `fs.readFileSync("step-catalog.json")` and the inline `JSON.parse(...)` are both unguarded. If the catalog file does not exist (e.g., `extract-steps.ts` was never run, or the file was deleted) or contains partial/malformed JSON (incomplete write, disk error), the process throws an uncaught Node.js exception with a raw stack trace rather than a developer-friendly message. A CI operator seeing this for the first time will not know how to recover.

**Fix:**
```typescript
let catalog: { generatedAt: string; totalSteps: number; steps: CatalogStep[] };
try {
  catalog = JSON.parse(fs.readFileSync("step-catalog.json", "utf-8"));
} catch (err) {
  console.error(
    "Errore: step-catalog.json non trovato o non valido.\n" +
    "Esegui prima: npm run catalog\n",
    err
  );
  process.exit(1);
}
```

---

### WR-02: `extract-steps.ts` — unhandled crash on `readFileSync` for NDJSON input

**File:** `scripts/extract-steps.ts:122-125`
**Issue:** `fs.existsSync(inputPath)` guards against a missing file (line 54), but a race condition or permission issue between the `existsSync` check and the `readFileSync` call (line 123) will throw an uncaught exception. More practically, this is also the only read call in the script without a catch block, which is inconsistent with the defensive approach used for source files (lines 68-71 wrap with try/catch).

**Fix:**
```typescript
let rawLines: string[];
try {
  rawLines = fs.readFileSync(inputPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim().length > 0);
} catch (err) {
  console.error(`Errore nella lettura di ${inputPath}:`, err);
  process.exit(1);
}
const lines = rawLines;
```

---

### WR-03: `orders.steps.ts` — `@wanted` stub throws Error instead of signalling pending

**File:** `src/steps/app-a/orders/orders.steps.ts:18`
**Issue:** `throw new Error('NOT IMPLEMENTED')` causes Cucumber to mark the scenario as **failed** (red), not pending (yellow). In an `async` step function, throwing an error is indistinguishable from a genuine test failure. Any feature file that exercises this step without `--dry-run` will produce a misleading "failed" result rather than a "pending/not yet implemented" signal. This makes CI output harder to triage during active development when wanted stubs coexist with real tests.

**Fix:** Use `return 'pending'` (after removing `async`, since no awaits are needed) or throw Cucumber's pending signal:
```typescript
// Option A — simplest, no async needed for a stub
When(
  "I search for the product {string}",
  function (this: CustomWorld, _product: string) {
    return 'pending';
  }
);

// Option B — keep async, use Cucumber pending marker
import { When, Status } from "@cucumber/cucumber";
When(
  "I search for the product {string}",
  async function (this: CustomWorld, _product: string) {
    return Status.PENDING;
  }
);
```
Apply the same fix to all future `@wanted` stubs for consistency.

---

### WR-04: `vscode-extension/src/catalog/types.ts` — `StepDoc` is a partial mirror; schema drift risk

**File:** `vscode-extension/src/catalog/types.ts:9-14`
**Issue:** The `StepDoc` interface in the extension omits `page`, `wanted`, `deprecated`, `replacedBy`, `requester`, and `assignee` fields that exist in the canonical `StepDoc` in `scripts/extract-steps.ts`. The file itself documents this risk ("Se cambia lo schema dello script, aggiornare qui"), but omitting even `page` is immediately inconsistent: `page` is already promoted to `CatalogStep.page` by the emitter, so the extension reads it from the right place — but a developer reading only the extension's `StepDoc` will not know the doc object in the raw JSON also carries `page`. As the catalog matures, every new `@tag` added to the emitter risks silent data loss in the extension unless the types are kept in sync manually.

**Fix (short term):** Add the missing fields to the extension's `StepDoc`:
```typescript
export interface StepDoc {
  intent?: string;
  params: Record<string, string>;
  pre?: string;
  post?: string;
  page?: string;          // add
  wanted?: boolean;       // add
  deprecated?: boolean;   // add
}
```
**Fix (long term):** Extract a shared `catalog-types` package (already noted in the file as future work) so both the scripts and the extension import from a single source of truth, eliminating manual sync.

---

## Info

### IN-01: Hardcoded relative output paths in both scripts

**File:** `scripts/extract-steps.ts:197` and `scripts/render-markdown.ts:90`
**Issue:** Both scripts write to `"step-catalog.json"` and `"STEP_CATALOG.md"` as hardcoded relative paths. If the script is invoked from a directory other than the project root (e.g., via a monorepo toolchain or a custom CI working directory), the output is silently written to the wrong location. There is no guard or log message indicating where the file was written.

**Fix:** Resolve paths relative to the script's own location, or at minimum log the resolved absolute path:
```typescript
import * as path from "path";
const OUTPUT_PATH = path.resolve(process.cwd(), "step-catalog.json");
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2));
console.log(`Catalogo scritto in: ${OUTPUT_PATH}`);
```

---

### IN-02: `extract-steps.ts` — single-line JSDoc (`/** @intent foo */`) silently produces empty doc

**File:** `scripts/extract-steps.ts:87`
**Issue:** `extractDoc` requires the closing `*/` to appear on its own line (line 87 checks `lines[i].trim().startsWith("*/")` after scanning upward). A single-line JSDoc comment such as `/** @intent Navigates to home page */` placed immediately above a step definition will be silently ignored — the step will be reported as undocumented even though a comment is present. No error is raised; the developer only sees a warning in the undocumented list.

**Fix:** Add a branch that handles single-line JSDoc:
```typescript
// Before the existing multi-line check:
const singleLine = lines[i].trim().match(/^\/\*\*\s+(.+)\s+\*\/$/);
if (singleLine) {
  // parse tags from singleLine[1] directly
}
```
Or update the contributor docs (`CONTRIBUTING.md`) to explicitly require multi-line JSDoc format for step annotations.

---

_Reviewed: 2026-06-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
