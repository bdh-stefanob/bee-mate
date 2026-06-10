---
phase: 04-web-ui
reviewed: 2026-06-10T10:00:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - web-ui/__tests__/api/catalog.test.ts
  - web-ui/__tests__/api/download.test.ts
  - web-ui/__tests__/lib/autocomplete.test.ts
  - web-ui/__tests__/lib/catalog.test.ts
  - web-ui/__tests__/lib/features.test.ts
  - web-ui/__tests__/lib/repo.test.ts
  - web-ui/src/app/api/catalog/route.ts
  - web-ui/src/app/api/download/route.ts
  - web-ui/src/app/api/features/route.ts
  - web-ui/src/app/api/import/route.ts
  - web-ui/src/app/editor/page.tsx
  - web-ui/src/app/features/page.tsx
  - web-ui/src/app/globals.css
  - web-ui/src/app/layout.tsx
  - web-ui/src/app/page.tsx
  - web-ui/src/components/FeaturePreview.tsx
  - web-ui/src/components/GherkinEditor.tsx
  - web-ui/src/components/GherkinToolbar.tsx
  - web-ui/src/components/ImportDropzone.tsx
  - web-ui/src/components/LanguageToggle.tsx
  - web-ui/src/components/StepBrowser.tsx
  - web-ui/src/components/StepCatalog.tsx
  - web-ui/src/components/ThemeToggle.tsx
  - web-ui/src/lib/autocomplete.ts
  - web-ui/src/lib/catalog.ts
  - web-ui/src/lib/features.ts
  - web-ui/src/lib/gherkin-cm.ts
  - web-ui/src/lib/i18n.ts
  - web-ui/src/lib/repo.ts
  - web-ui/src/lib/types.ts
  - web-ui/src/providers/Providers.tsx
  - web-ui/src/lib/utils.ts
findings:
  critical: 2
  warning: 5
  info: 5
  total: 12
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-06-10T10:00:00Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

Reviewed the complete web-ui Next.js 15 application: 4 API routes, 10 React components, 8 lib modules, and 6 test files.

**Overall verdict:** The architecture is sound and the path-traversal guard (`safeFeaturePath`) is correctly implemented. The primary critical findings are in `api/import/route.ts`: the `rawOutput` from `execSync` is exposed verbatim to the client (server-path disclosure) and the `featurePath` returned by the script is read and re-exposed without any path-safety validation. Three warnings concern React patterns (missing error boundary on `FeaturesPage`, unguarded `fetch` response-type assertion, missing `data` validation) and a test reliability issue in `catalog.test.ts`. Info items cover dead code (unused `initialValue` prop), a naming duplicate, a magic number, and a minor test labelling inconsistency.

---

## Critical Issues

### CR-01: Server path and internal command output exposed to clients via `/api/import`

**File:** `web-ui/src/app/api/import/route.ts:79-86` (success path) and `:92-99` (error path)

**Issue:** The response JSON includes `rawOutput` (the full stdout of `execSync`) in both the success and error branches. On a typical run this contains the absolute filesystem path of the generated `.feature` file (e.g. `C:\Users\...\src\features\auth\...feature`) and details about the internal Node/ts-node invocation. On error the `error.message` from the thrown `ExecSyncError` may include the full shell command line. This is an information-disclosure vulnerability: clients learn the server's filesystem layout and tool stack.

Additionally, `featurePath` on line 66 is the raw value parsed from `rawOutput` (the match of `/Feature file:\s+(.+)/`). This absolute server path is returned directly to the client on line 83 and then rendered in `ImportDropzone.tsx:155` in a `<span>` element. While this does not enable server-side reads by the client, it leaks the full absolute path.

**Fix:**
```typescript
// Return only the minimal fields the UI actually needs.
// Never send rawOutput or absolute server paths to the client.
return NextResponse.json({
  ok: true,
  featureContent,
  // Send only the relative path from REPO_ROOT, not the absolute path.
  featurePath: featurePath
    ? path.relative(REPO_ROOT, featurePath).replace(/\\/g, '/')
    : null,
  newCount,
  skipCount,
  // rawOutput: REMOVED — never send internal command output to clients
});

// Error branch: strip internal detail
return NextResponse.json(
  { ok: false, error: 'Import failed. Check server logs.' },
  { status: 500 }
);
```

---

### CR-02: `featurePath` from script stdout used for filesystem read without path-safety validation

**File:** `web-ui/src/app/api/import/route.ts:66-73`

**Issue:** `featurePath` is parsed from the stdout of the child process (`rawOutput.match(/Feature file:\s+(.+)/)`). If the script's output is tampered with, malformed, or the script itself is compromised, `featurePath` could resolve to any path on the server filesystem. The code then calls `fs.readFileSync(featurePath, 'utf-8')` on line 73 with no path-safety check — there is no call to `safeFeaturePath` or any equivalent guard. This bypasses the path-traversal protection that exists for the download route.

**Fix:**
```typescript
// After parsing featurePath from script output, validate it
// using the same guard used by the download route.
import { safeFeaturePath } from '@/lib/repo';

const rawFeaturePath = featurePathMatch ? featurePathMatch[1].trim() : null;
// Re-express as relative to FEATURES_DIR before validating
const relPath = rawFeaturePath
  ? path.relative(FEATURES_DIR, rawFeaturePath).replace(/\\/g, '/')
  : null;
const featurePath = relPath ? safeFeaturePath(relPath) : null;

let featureContent = '';
if (featurePath && fs.existsSync(featurePath)) {
  featureContent = fs.readFileSync(featurePath, 'utf-8');
}
```

---

## Warnings

### WR-01: Unguarded type assertion on `/api/features` response in `FeaturesPage`

**File:** `web-ui/src/app/features/page.tsx:22`

**Issue:** The fetch result is cast directly as `FeatureSummary[]` with no runtime check:
```typescript
.then((data: FeatureSummary[]) => {
  setFeatures(data);
```
If the API returns `{ error: string }` (the 500 path in `features/route.ts`), `setFeatures` receives an object, and the subsequent `.map()` call in the JSX will throw, crashing the component silently because there is no error boundary. The `catch` only handles network errors.

**Fix:**
```typescript
.then((res) => res.json())
.then((data: unknown) => {
  if (Array.isArray(data)) {
    setFeatures(data as FeatureSummary[]);
  } else {
    setLoading(false);
    // optionally surface: setError('Failed to load features')
  }
  setLoading(false);
})
.catch(() => setLoading(false));
```

---

### WR-02: `rawOutput` from import response rendered in `ImportDropzone` on error

**File:** `web-ui/src/components/ImportDropzone.tsx:56-59` (error state display) combined with `web-ui/src/app/api/import/route.ts:96`

**Issue:** The error branch of `POST /api/import` returns `rawOutput: error.stdout ?? ''`. Although `ImportDropzone` does not currently render `rawOutput` in the error state, the field is present in the JSON response and accessible to any consumer. This compounds CR-01: any future developer adding a "show details" feature could accidentally expose internal output. The field should be removed at the source (see CR-01 fix). This is a warning because no rendered disclosure happens today, but the data is present in the wire format.

**Fix:** Remove `rawOutput` from both the success and error response payloads (see CR-01 fix above).

---

### WR-03: `GherkinEditor` initialization `useEffect` captures stale `onChange` closure

**File:** `web-ui/src/components/GherkinEditor.tsx:105-169`

**Issue:** The CodeMirror initialization `useEffect` (line 105) has an intentional `// eslint-disable-next-line react-hooks/exhaustive-deps` to run only once on mount. Inside it, the `updateListener` closure captures the `onChange` prop at mount time (line 115). If the parent passes a new `onChange` function on re-render (e.g. after state changes in `EditorPage`), the editor will continue calling the stale version. In `EditorPage` `onChange` is `setContent` (a stable setter from `useState`) so this does not bite today, but the pattern is fragile — a future refactor passing an unstable callback will introduce a silent bug.

**Fix:** Use a ref to hold the latest `onChange` so the closure always calls the current version:
```typescript
const onChangeRef = useRef(onChange);
useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

// Inside the init useEffect:
const updateListener = EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    const newValue = update.state.doc.toString();
    lastValueRef.current = newValue;
    onChangeRef.current(newValue);  // always calls the latest onChange
  }
});
```

---

### WR-04: `safeFeaturePath` does not guard against the `FEATURES_DIR` itself as a valid path

**File:** `web-ui/src/lib/repo.ts:39`

**Issue:** The guard condition is:
```typescript
if (!resolved.startsWith(featuresPrefix) && resolved !== FEATURES_DIR) {
```
The second clause (`resolved !== FEATURES_DIR`) means that passing an empty string or a value that resolves to exactly `FEATURES_DIR` itself returns a non-null value. That resolved path does not end in `.feature`, so the subsequent extension guard catches it and returns null correctly. However the intent comment says "il path risolto deve essere dentro FEATURES_DIR" — a directory is not inside itself, it is itself. The double condition is therefore subtly misleading and could allow a future bypass if the extension check is ever relaxed. More importantly, on case-insensitive filesystems (Windows/macOS) `startsWith` with a mixed-case `FEATURES_DIR` could fail if `process.cwd()` resolves to a different casing.

**Fix:**
```typescript
// Ensure the resolved path is strictly inside FEATURES_DIR (not equal to it)
// and use a normalised comparison to handle case-insensitive filesystems.
const normalised = resolved.toLowerCase();
const prefix = (FEATURES_DIR + path.sep).toLowerCase();
if (!normalised.startsWith(prefix)) {
  return null;
}
if (!resolved.endsWith('.feature')) {
  return null;
}
return resolved;
```

---

### WR-05: Test `catalog.test.ts` (UI-01) depends on real filesystem state

**File:** `web-ui/__tests__/api/catalog.test.ts:5-12`

**Issue:** The single test calls the real `GET /api/catalog` route handler, which reads `step-catalog.json` from `REPO_ROOT`. The test passes only if the file exists, is valid JSON, and contains at least one step. If the file is absent (e.g. on a fresh clone before `npm run catalog`) or empty, the test produces a misleading failure. There is no mock for the filesystem read, so the test is an integration test masquerading as a unit test, and it will fail in CI environments where the catalog has not been generated.

**Fix:** Mock the `fs` module and provide a minimal fixture:
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  readFileSync: vi.fn(() =>
    JSON.stringify({ totalSteps: 1, steps: [{ expression: 'I test', area: 'test', status: 'implemented' }] })
  ),
}));
```
Or document clearly that this is an integration test and gate it behind a separate test script.

---

## Info

### IN-01: Unused `initialValue` prop in `GherkinEditor`

**File:** `web-ui/src/components/GherkinEditor.tsx:36` (prop declaration) and `:55` (destructuring)

**Issue:** `initialValue` is declared in `GherkinEditorProps` and destructured in the function signature, but it is only used on line 59 and 108 as a fallback when `value` is undefined (`value ?? initialValue ?? ''`). Since `value` is a required-by-practice prop (no `?` in the interface), `initialValue` is effectively dead. The JSDoc says "Legacy: initialValue for backward compatibility", which is acceptable, but the prop is never actually passed from any call site (`editor/page.tsx` only passes `value`). This creates an undocumented divergence between the interface surface and actual usage.

**Fix:** Either remove `initialValue` from the interface (preferred, keeps API tight) or mark it clearly as `@deprecated` in JSDoc and add a runtime warning.

---

### IN-02: Duplicate catalog fetch in `EditorPage` and `StepBrowser`

**File:** `web-ui/src/app/editor/page.tsx:41-49` and `web-ui/src/components/StepBrowser.tsx:55-62`

**Issue:** `EditorPage` fetches `/api/catalog` to populate `stepExpressions` for the autocomplete, and `StepBrowser` (which is rendered inside `EditorPage`) also fetches `/api/catalog` independently. On each `/editor` page load, the same JSON endpoint is hit twice sequentially. No deduplication or shared context exists.

**Fix:** Either pass the catalog data from `EditorPage` down to `StepBrowser` as a prop, or use a simple module-level cache / React context. This is a maintenance concern today (two requests on load) and could silently diverge if filtering or versioning is added to the route.

---

### IN-03: Magic number `8` for autocomplete limit duplicated across two modules

**File:** `web-ui/src/lib/autocomplete.ts:43` and `web-ui/src/components/GherkinEditor.tsx:81`

**Issue:** The limit of 8 autocomplete suggestions is hardcoded in both `getSuggestions` (`.slice(0, 8)`) and in `gherkinComplete` (`.slice(0, 8)`). If the limit needs to change, it must be updated in two places.

**Fix:**
```typescript
// In autocomplete.ts, export the constant:
export const AUTOCOMPLETE_MAX = 8;

// Both call sites then reference AUTOCOMPLETE_MAX.
```

---

### IN-04: `StepBrowser` list item key uses `step.expression` which is not guaranteed unique

**File:** `web-ui/src/components/StepBrowser.tsx:152`

**Issue:** `key={step.expression}` is used for the list items. The `CatalogStep` type has no uniqueness guarantee on `expression` (two steps in different apps could share the same phrase). `StepCatalog.tsx` uses the safer `key={\`${step.sourceRef}-${idx}\`}` pattern. If duplicate expressions appear in the catalog, React will emit a duplicate-key warning and the list may render incorrectly.

**Fix:**
```typescript
key={`${step.sourceRef}-${i}`}
```

---

### IN-05: Test label numbering inconsistency in `catalog.test.ts`

**File:** `web-ui/__tests__/lib/catalog.test.ts:89`

**Issue:** The test at line 89 is labelled `'Test 4b: query vuota non filtra'` but the previous test at line 78 is already labelled `'Test 4: nessun filtro ritorna tutti gli step'`. Both cover slightly different aspects of the same filter-empty behaviour but share a number (`4` / `4b`). The convention in the other test files uses sequential numbering. This is cosmetic but causes confusion when test IDs are referenced in a failure report.

**Fix:** Rename to `'Test 6: query vuota non filtra'` (continuing the sequence after uniqueStatuses Test 6b).

---

_Reviewed: 2026-06-10T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
