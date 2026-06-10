---
phase: 04-web-ui
reviewed: 2026-06-10T10:00:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - web-ui/src/app/api/catalog/route.ts
  - web-ui/src/app/api/features/route.ts
  - web-ui/src/app/api/import/route.ts
  - web-ui/src/app/api/download/route.ts
  - web-ui/src/app/editor/page.tsx
  - web-ui/src/app/features/page.tsx
  - web-ui/src/app/page.tsx
  - web-ui/src/components/GherkinEditor.tsx
  - web-ui/src/components/GherkinToolbar.tsx
  - web-ui/src/components/ImportDropzone.tsx
  - web-ui/src/components/StepBrowser.tsx
  - web-ui/src/components/StepCatalog.tsx
  - web-ui/src/components/StepParamPicker.tsx
  - web-ui/src/components/FeaturePreview.tsx
  - web-ui/src/lib/gherkin-cm.ts
  - web-ui/src/lib/i18n.ts
  - web-ui/src/lib/repo.ts
  - web-ui/src/lib/types.ts
  - web-ui/src/lib/features.ts
  - web-ui/src/lib/catalog.ts
  - web-ui/src/lib/autocomplete.ts
  - web-ui/src/providers/Providers.tsx
  - scripts/import-scenarios.ts
  - src/steps/app-a/orders/orders.steps.ts
  - src/steps/app-a/imported/checkout.steps.ts
findings:
  critical: 3
  warning: 7
  info: 5
  total: 15
status: issues_found
---

# Phase 04: Full Codebase Review Report

**Reviewed:** 2026-06-10T10:00:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

Reviewed the full Web UI (Next.js 15), all supporting lib files, the import script, and test scaffold stubs. The overall security posture is solid — path-traversal guards are correctly implemented in `safeFeaturePath`, the import API does not interpolate user input into the shell command, and secrets are absent from code. Three critical issues were found: a missing file-size upper bound on uploads, a path-injection risk in `import-scenarios.ts` when run via the API, and missing HTTP-response-status checks in several client-side fetches that silently treat API errors as valid data. Seven warnings cover missing null checks, generated step stubs with wrong parameter signatures, unreachable cleanup logic, and a missing error boundary. Five info items cover dead code and minor quality concerns.

---

## Critical Issues

### CR-01: No file-size limit on POST /api/import — potential DoS / disk exhaustion

**File:** `web-ui/src/app/api/import/route.ts:33`

**Issue:** The upload guard only rejects zero-size files (`file.size === 0`). There is no upper-bound check. A client can upload an arbitrarily large file; the server calls `file.arrayBuffer()` (loads the whole thing into RAM) and then writes it to disk with `fs.writeFileSync`. A multi-gigabyte upload will exhaust server memory or disk space before the 30-second `execSync` timeout is reached.

**Fix:**
```typescript
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — adjust as needed

if (!file || file.size === 0) {
  return NextResponse.json({ ok: false, error: 'File mancante o vuoto' }, { status: 400 });
}
if (file.size > MAX_BYTES) {
  return NextResponse.json(
    { ok: false, error: `File troppo grande (max ${MAX_BYTES / 1024 / 1024} MB)` },
    { status: 413 }
  );
}
```

---

### CR-02: `validateInputPath` in import-scenarios.ts rejects the OS temp directory — silent security bypass when called via API

**File:** `scripts/import-scenarios.ts:177-185`

**Issue:** `validateInputPath` checks that the resolved path starts with `process.cwd() + path.sep`. When the API route (`/api/import`) invokes the script via `execSync`, `cwd` is set to `REPO_ROOT`. The temp file is written to `os.tmpdir()` (e.g. `C:\Users\...\AppData\Local\Temp`), which is **not** under `REPO_ROOT`. The validation therefore throws `"Path non sicuro"` and `process.exit(1)` is called, making every API import fail.

At first glance this looks like a runtime bug, but the deeper issue is that the script's path-safety check is misapplied to a path the API itself constructed. The `validateInputPath` guard is designed for direct CLI usage where a user could pass `../../etc/passwd`; it should not reject the API's own temp files, which are already safe by construction.

**Fix — two-part:**

1. In `import-scenarios.ts`, allow the OS temp directory as an additional trusted root:
```typescript
function validateInputPath(inputPath: string): string {
  const resolved = path.resolve(inputPath);
  const cwd = process.cwd() + path.sep;
  const tmp = os.tmpdir() + path.sep;   // add this
  if (
    !resolved.startsWith(cwd) &&
    resolved !== process.cwd() &&
    !resolved.startsWith(tmp)            // add this
  ) {
    throw new Error(
      `Path non sicuro: "${inputPath}" non è dentro la root del progetto o la tmpdir.`
    );
  }
  return resolved;
}
```

2. Add `import * as os from 'os';` at the top of `scripts/import-scenarios.ts`.

---

### CR-03: Client-side fetches do not check HTTP status — API errors treated as valid data

**Files:**
- `web-ui/src/app/editor/page.tsx:45-53`
- `web-ui/src/components/StepBrowser.tsx:68-71`

**Issue:** Both `useEffect` fetch calls call `.then(res => res.json())` without checking `res.ok` first. If the server returns HTTP 500 (e.g., `step-catalog.json` is missing), the response body is `{ error: "..." }` — a JSON object without a `steps` key. The code safely falls through on the `data.steps` check in the editor page, but in `StepBrowser` the `setSteps(data.steps)` on line 70 silently sets steps to `undefined`, which then causes a runtime crash in every `useMemo` that calls `steps.map(...)`.

`StepCatalog.tsx` (lines 44-55) correctly checks `res.ok` and populates an error state — the other two callers should do the same.

**Fix for `editor/page.tsx` (lines 45-53):**
```typescript
useEffect(() => {
  fetch('/api/catalog')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data: { steps?: CatalogStep[] }) => {
      if (data.steps) setStepExpressions(data.steps.map(s => s.expression));
    })
    .catch(() => { /* autocomplete degrades gracefully without catalog */ });
}, []);
```

**Fix for `StepBrowser.tsx` (lines 68-71):**
```typescript
useEffect(() => {
  fetch('/api/catalog')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => { if (data.steps) setSteps(data.steps); })
    .catch(() => {});
}, []);
```

---

## Warnings

### WR-01: Generated step stubs missing parameter bindings — all `@wanted` steps with params will crash at runtime

**File:** `src/steps/app-a/imported/checkout.steps.ts:27-84`

**Issue:** The `buildStepSkeleton` helper in `import-scenarios.ts` correctly generates the TypeScript parameter list (line 439 of the script), but all six stubs in `checkout.steps.ts` that have parameters (`{string}`, `{int}`) were generated without the parameter in the async function signature. For example:

```typescript
// Generated (wrong):
When("I add {string} to the basket", async function (this: CustomWorld) {
```

Cucumber will bind the captured string to the first positional argument, but since the function declares no parameters beyond `this`, the argument is silently dropped. This does not crash at load time but means the parameter value is inaccessible when the step is later implemented. This is a bug in the code generator output.

**Root cause in `buildStepSkeleton` (scripts/import-scenarios.ts:427-454):** The `paramTypes` array is built correctly, but it uses `GHERKIN_PREFIX_RE`-style logic only for `{string|int|float|word|any}`. The step `"I add {string} to the basket"` has `expression = "I add {string} to the basket"` after normalisation, so `{string}` should be matched — verify the generated file reflects the current script. The file comment shows it was generated from a specific worktree path that may have had an earlier version of the script.

**Fix:** Regenerate `checkout.steps.ts` using `npm run catalog` + re-import, or manually correct the signatures:
```typescript
When(
  "I add {string} to the basket",
  async function (this: CustomWorld, item: string) {
    throw new Error('NOT IMPLEMENTED');
  }
);
```

---

### WR-02: `tmpPath` cleanup skipped when `file.arrayBuffer()` throws

**File:** `web-ui/src/app/api/import/route.ts:41-43`

**Issue:** The temp file path is created at line 41 but the file is only written at line 43 (`fs.writeFileSync`). If `await file.arrayBuffer()` throws (e.g., the client disconnects mid-upload), execution jumps out of the outer try/catch at line 22, which only handles `formData` parsing. No cleanup code runs for `tmpPath` because the temp file was never written — this is actually safe. However if the write on line 43 itself throws (disk full), `tmpPath` is never cleaned up because the outer try/catch at line 46 only wraps the `execSync` block onward.

**Fix:** Wrap lines 42-43 in the same try/catch that covers the execSync, or restructure so that `tmpPath` is always cleaned up regardless of where the failure occurs:
```typescript
// Write inside the main try block so the catch clause on line 104 handles it
try {
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);
  // ... rest of try block
} catch (err) {
  try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  // ...
}
```

---

### WR-03: `safeFeaturePath` extension check is case-sensitive — `.Feature` bypasses it

**File:** `web-ui/src/lib/repo.ts:47`

**Issue:** The extension guard uses `resolved.endsWith('.feature')`. The path-traversal check on line 42 correctly normalises to lowercase for comparison, but the extension check at line 47 uses the original `resolved` (mixed-case). On a Windows/macOS case-insensitive filesystem, a file named `foo.Feature` or `foo.FEATURE` would pass the `startsWith` check (because `resolved.toLowerCase()` is used) but fail the `endsWith` check. This means requests for valid `.Feature` files (rare but legal on Windows) return 403 unexpectedly, rather than serving the file.

More importantly, note that `resolved` (original case) is used at line 47 but the traversal check used `resolved.toLowerCase()` — there is an asymmetry. A path like `..\..\foo.feature` will have its lowercase form rejected by the traversal guard, but if someone constructed a path that passes the traversal check with the lowercase form yet ends with `.FEATURE` on the original, the extension check also rejects it. This is defence-in-depth working correctly, but the asymmetry is fragile.

**Fix:**
```typescript
if (!resolved.toLowerCase().endsWith('.feature')) {
  return null;
}
```

---

### WR-04: `REPO_ROOT` depends on `process.cwd()` — breaks under Next.js standalone output or when dev server is not started from `web-ui/`

**File:** `web-ui/src/lib/repo.ts:7`

**Issue:** `REPO_ROOT = path.resolve(process.cwd(), '..')` assumes the dev/build process is always started from `web-ui/`. This is correct for `npm run dev` but fails under:
- `next build` followed by `next start` from the root directory
- Docker containers where `WORKDIR` is the repo root
- CI environments that run `npx next start` from the repo root

When `process.cwd()` is already the repo root, `REPO_ROOT` will resolve one level above the repo, and all subsequent file reads (`step-catalog.json`, feature files) will return 500 errors.

**Fix:** Use `__dirname` (which is always the location of `repo.ts`) as an anchor:
```typescript
import * as url from 'url';
// __dirname equivalent in ESM if needed:
export const REPO_ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..', '..', '..', '..');
// or for CJS context (which Next.js API routes use):
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
```
Or use an environment variable as an explicit override:
```typescript
export const REPO_ROOT = process.env.REPO_ROOT
  ? path.resolve(process.env.REPO_ROOT)
  : path.resolve(process.cwd(), '..');
```

---

### WR-05: `StepParamPicker` — Insert button not disabled when `allFilled` is false but Enter key still triggers insert

**File:** `web-ui/src/components/StepParamPicker.tsx:88-93`

**Issue:** The keyboard handler at line 90 fires `onInsert(insertLine)` when `Enter` is pressed and `allFilled` is true. The Insert button at line 186 is `disabled={!allFilled}`. However, the `onKeyDown` is attached to the container `<div>` (line 109), not to individual inputs. When a `Select` dropdown is open and the user presses `Enter` to confirm a value, the event bubbles to the container and fires `onInsert` immediately if all other fields are already filled — inserting the step before the user intended.

**Fix:** Change the container-level keydown to only respond when the event target is not a Select trigger:
```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
  if (e.key === 'Enter' && allFilled) {
    // Don't fire if the event originated from inside a Select
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'BUTTON' || tag === 'LI') return; // Select trigger/item
    e.preventDefault();
    onInsert(insertLine);
  }
};
```

---

### WR-06: `download/route.ts` — `Content-Disposition` filename not sanitised

**File:** `web-ui/src/app/api/download/route.ts:30`

**Issue:** `filename` is taken directly from `path.basename(resolved)`. While `safeFeaturePath` guarantees the file has a `.feature` extension and is inside `FEATURES_DIR`, `path.basename` can still return a name containing characters that need RFC 5987 encoding in the `Content-Disposition` header (e.g. spaces, non-ASCII). Browsers handle this inconsistently; some will ignore the `filename=` parameter and save as the URL path, others may mangle the name.

**Fix:** Encode the filename per RFC 5987:
```typescript
const encoded = encodeURIComponent(filename).replace(/'/g, '%27');
return new Response(content, {
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
  },
});
```

---

### WR-07: No React Error Boundary anywhere in the component tree

**File:** `web-ui/src/providers/Providers.tsx` / `web-ui/src/app/editor/page.tsx`

**Issue:** The application uses no Error Boundary. If `GherkinEditor`'s CodeMirror initialization throws (e.g., an extension is incompatible with the browser version), or if `StepParamPicker` receives malformed `step.paramEnums` data and a nested `.find()` throws (see `StepBrowser.tsx:277`), the entire page unmounts with a blank white screen and no user feedback.

`StepBrowser.tsx:277` specifically has a non-null assertion on a `.find()` result:
```typescript
`${step.paramEnums!.find(p => p.values.length > 0)!.values.length} known values`
```
If `paramEnums` has entries but none with `values.length > 0`, `.find()` returns `undefined` and the `!` assertion causes a runtime TypeError that would bubble up without an error boundary.

**Fix (two parts):**

1. Add an Error Boundary wrapper in `Providers.tsx` or in each page component.

2. Fix the unsafe assertion in `StepBrowser.tsx:277`:
```typescript
const firstEnum = step.paramEnums?.find(p => p.values.length > 0);
const enumCount = firstEnum ? firstEnum.values.length : 0;
// then use: `${enumCount} known values`
```

---

## Info

### IN-01: `slugify` is duplicated between `repo.ts` and `import-scenarios.ts`

**Files:** `web-ui/src/lib/repo.ts:18-23`, `scripts/import-scenarios.ts:57-62`

**Issue:** Identical `slugify` function exists in both files. The `repo.ts` version even has a comment "Copia esatta della funzione in scripts/import-scenarios.ts". This is a maintenance hazard — a future change to the normalisation logic needs to be applied in two places.

**Fix:** Extract to a shared utility (e.g., `src/shared/slugify.ts`) and import from both. If the monorepo structure makes that difficult for the CLI script, at minimum add a test that asserts both implementations produce identical output for a test vector.

---

### IN-02: `checkout.steps.ts` comment leaks an internal worktree path

**File:** `src/steps/app-a/imported/checkout.steps.ts:2`

**Issue:** The generated file header contains:
```
// Step skeleton importati da: C:\Users\sbert\OneDrive\Documenti\Claude\Projects\...\agent-ae637c55beadcabe4\test-fixtures\sample-import.txt
```
This exposes the full Windows filesystem path including the username and agent worktree UUID. The file is committed to the repository (which CLAUDE.md notes is public/personal).

**Fix:** Modify `buildStepsHeader` in `import-scenarios.ts` to store only the basename of the input file, not the full absolute path:
```typescript
function buildStepsHeader(app: string, area: string, inputPath: string): string {
  const now = new Date().toISOString();
  const inputName = path.basename(inputPath); // only basename
  return `// src/steps/${app}/imported/${area}.steps.ts
// Step skeleton importati da: ${inputName}
// Generati il: ${now}
// ...
`;
}
```

---

### IN-03: `GherkinEditor` suppresses `react-hooks/exhaustive-deps` for init `useEffect`

**File:** `web-ui/src/components/GherkinEditor.tsx:175`

**Issue:** The `// eslint-disable-next-line react-hooks/exhaustive-deps` comment on the init `useEffect` (line 175) suppresses the linter warning that `value` and `initialValue` are used inside the effect but not declared as dependencies. The author's intent is correct (the effect should only run once on mount), but the suppression comment is a maintenance smell. If a future developer adds a dependency and re-enables the lint rule, the closure is correctly neutralised by the `onChangeRef` pattern already in use.

**Fix:** Add a clear comment explaining the intentional omission so future maintainers don't second-guess it, and optionally replace the eslint-disable with `// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: init-once, value sync handled by separate useEffect` (already partially done).

No code change required — this is documentation-level.

---

### IN-04: `import-scenarios.ts` uses `e: any` in catch block

**File:** `scripts/import-scenarios.ts:231`

**Issue:** `catch (e: any)` on line 231 uses the `any` type explicitly, bypassing TypeScript's type narrowing. The project appears to use `err: unknown` elsewhere (API routes). This is a minor inconsistency.

**Fix:**
```typescript
} catch (e: unknown) {
  console.error(`Errore di sicurezza: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
```

---

### IN-05: Dead `blockStart` variable in `gherkin-cm.ts` linter

**File:** `web-ui/src/lib/gherkin-cm.ts:136`

**Issue:** `blockStart` is assigned on line 136 (`let blockStart = 0`) and updated on line 160 (`blockStart = lineNum`) but never read. It appears to be a leftover from an earlier implementation that tracked block line numbers for error reporting.

**Fix:** Remove the variable:
```typescript
// Remove: let blockStart = 0;
// Remove: blockStart = lineNum;
```

---

_Reviewed: 2026-06-10T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
