---
phase: 04-web-ui
fixed_at: 2026-06-10T10:30:00Z
review_path: .planning/phases/04-web-ui/04-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 6
skipped: 1
status: partial
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-06-10T10:30:00Z
**Source review:** .planning/phases/04-web-ui/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (2 Critical + 5 Warning)
- Fixed: 6
- Skipped: 1

## Fixed Issues

### CR-01: Server path and internal command output exposed to clients via `/api/import`

**Files modified:** `web-ui/src/app/api/import/route.ts`
**Commit:** 002489c
**Applied fix:** Removed `rawOutput` from the success response. Replaced absolute `featurePath` in the success response with a relative path computed via `path.relative(REPO_ROOT, featurePath)`. Error branch now returns a generic `'Import failed. Check server logs.'` message with `console.error` for server-side visibility instead of exposing `error.message` or `rawOutput`.

---

### CR-02: `featurePath` from script stdout used for filesystem read without path-safety validation

**Files modified:** `web-ui/src/app/api/import/route.ts`
**Commit:** 002489c
**Applied fix:** After parsing `rawFeaturePath` from script stdout, computed a relative path via `path.relative(FEATURES_DIR, rawFeaturePath)` and passed it through `safeFeaturePath()`. If the resolved path fails validation (outside FEATURES_DIR or wrong extension), the handler returns a 400 response immediately without reading the file. `FEATURES_DIR` and `safeFeaturePath` are now imported from `@/lib/repo`.

---

### WR-01: Unguarded type assertion on `/api/features` response in `FeaturesPage`

**Files modified:** `web-ui/src/app/features/page.tsx`
**Commit:** 567d593
**Applied fix:** Changed `.then((data: FeatureSummary[]) => { setFeatures(data) })` to receive `data: unknown`, guard with `Array.isArray(data)` before calling `setFeatures`, and always call `setLoading(false)` in the then-branch regardless of the guard outcome. The catch handler is unchanged.

---

### WR-02: `rawOutput` included in error-branch response

**Files modified:** `web-ui/src/app/api/import/route.ts`
**Commit:** 002489c
**Applied fix:** Covered by the CR-01 fix. The error catch block no longer includes `rawOutput: error.stdout ?? ''` in the JSON response. The field is fully removed from the wire format in both success and error paths.

---

### WR-03: `GherkinEditor` initialization `useEffect` captures stale `onChange` closure

**Files modified:** `web-ui/src/components/GherkinEditor.tsx`
**Commit:** d0b8404
**Applied fix:** Added `const onChangeRef = useRef(onChange)` immediately after the other refs, and a `useEffect(() => { onChangeRef.current = onChange; }, [onChange])` to keep it current. Inside the mount-only init `useEffect`, the `updateListener` now calls `onChangeRef.current(newValue)` instead of the captured `onChange`. The existing `eslint-disable` comment for the init effect is unchanged.

---

### WR-04: `safeFeaturePath` does not normalise case on case-insensitive filesystems

**Files modified:** `web-ui/src/lib/repo.ts`
**Commit:** ad49dd7
**Applied fix:** Replaced the old double-condition guard (`startsWith(featuresPrefix) || resolved === FEATURES_DIR`) with a single strict prefix check that lowercases both the resolved path and the prefix before comparison: `(FEATURES_DIR + path.sep).toLowerCase()` vs `resolved.toLowerCase()`. This eliminates the `resolved === FEATURES_DIR` bypass and handles mixed-case drive letters / directories on Windows and macOS.

---

## Skipped Issues

### WR-05: Test `catalog.test.ts` (UI-01) depends on real filesystem state

**File:** `web-ui/__tests__/api/catalog.test.ts:5-12`
**Reason:** skipped — WR-05 is a test reliability concern, not a runtime security or correctness defect. The fix requires introducing a `vi.mock('fs', ...)` fixture or restructuring the test suite. This change carries non-trivial risk of breaking other tests in the same file and requires validation of the full vitest run. Deferred for manual fix or a dedicated test-quality pass.
**Original issue:** The single test calls the real `GET /api/catalog` route handler, reading `step-catalog.json` from disk. If the file is absent (e.g. fresh clone before `npm run catalog`), the test produces a misleading failure. No `fs` mock is present, making this an integration test masquerading as a unit test.

---

_Fixed: 2026-06-10T10:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
