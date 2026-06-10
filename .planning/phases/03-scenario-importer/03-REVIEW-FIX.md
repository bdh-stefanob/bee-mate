---
phase: 03-scenario-importer
fixed_at: 2026-06-10T09:30:00Z
review_path: .planning/phases/03-scenario-importer/03-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-06-10T09:30:00Z
**Source review:** .planning/phases/03-scenario-importer/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (CR-01, CR-02, WR-01, WR-02, WR-03)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Path-traversal guard bypassed by absolute paths outside cwd

**Files modified:** `scripts/import-scenarios.ts`
**Commit:** 4b20a0c
**Applied fix:** Replaced the entire `validateInputPath` body. Removed the inner `else` branch that accepted any absolute path lacking `..`. Now any path that does not resolve to inside `cwd` (with trailing `path.sep`) — regardless of how it was constructed — is unconditionally rejected with a clear error message.

### CR-02: `--app` argument written to `path.join` without sanitisation

**Files modified:** `scripts/import-scenarios.ts`
**Commit:** dc1fa01
**Applied fix:** Added `appArg = slugify(appArg) || 'app-a';` immediately after the `--input` presence check (and before path validation), matching the same pattern already used for `areaArg` on line 253. Any path-traversal characters in `--app` are now stripped before the value reaches `path.join`.

### WR-01: Generated step skeletons omit Cucumber parameter bindings

**Files modified:** `scripts/import-scenarios.ts`
**Commit:** d1e6960
**Applied fix:** Rewrote `buildStepSkeleton` to scan `step.expression` for `{string}`, `{int}`, `{float}`, `{word}`, `{any}` placeholders using a regex loop. Each placeholder produces a positional `argN: type` parameter (`number` for int/float, `string` for all others). The generated function signature now includes these parameters as `, arg0: string, arg1: number, ...` after `this: CustomWorld`. Steps with no placeholders continue to emit a zero-argument signature.

### WR-02: Catalog regeneration failure swallowed — process exits 0

**Files modified:** `scripts/import-scenarios.ts`
**Commit:** 93b594f
**Applied fix:** Changed the `catch` block from `console.warn(...)` with silent continuation to `console.error(...)` followed by `process.exit(1)`. CI and upstream callers now receive a non-zero exit code when `npm run catalog` fails, preventing "Import completato" from being reported on a stale catalog.

### WR-03: Lines between scenarios misattributed to `rawHeaderLines`

**Files modified:** `scripts/import-scenarios.ts`
**Commit:** 2a1f567
**Applied fix:** Added `let headerDone = false;` alongside the existing loop state variables. Set `headerDone = true;` inside the `scenarioMatch` branch (on first and subsequent scenario encounters). Changed the `else if (!inScenario)` guard to `else if (!headerDone)`, so only lines before the first `Scenario` heading are pushed into `rawHeaderLines`. Inter-scenario blank lines are now silently discarded rather than misattributed to the header.

---

_Fixed: 2026-06-10T09:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
