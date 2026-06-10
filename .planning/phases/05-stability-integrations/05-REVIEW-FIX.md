---
phase: 05-stability-integrations
fixed_at: 2026-06-10T00:00:00Z
review_path: .planning/phases/05-stability-integrations/05-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-06-10
**Source review:** .planning/phases/05-stability-integrations/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: SSRF via unvalidated `x-jira-url` header

**Files modified:** `web-ui/src/app/api/jira/sync/route.ts`
**Commit:** edeaa2a
**Applied fix:** Added SSRF guard block immediately after the null-header check. Parses `jiraUrl` with `new URL()` (returning 400 on invalid URL), rejects non-http/https schemes, and blocks RFC-1918 / loopback hostnames (`localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `192.168.*`, `10.*`, `172.*`).

---

### CR-02: Unvalidated `x-github-owner` / `x-github-repo` headers allow URL injection

**Files modified:** `web-ui/src/app/api/github/push/route.ts`
**Commit:** a3f1570
**Applied fix:** Added `GITHUB_NAME_RE = /^[a-zA-Z0-9_.\-]+$/` validation block after the existing null-check at line 34. Returns 400 if either header contains characters outside the GitHub-valid set, preventing path and query-string injection into the API base URL.

---

### WR-01: `String.replace` scrubs token only on first occurrence

**Files modified:** `web-ui/src/app/api/github/push/route.ts`
**Commit:** cce7a5d
**Applied fix:** Replaced the plain `message.replace(githubToken, '[TOKEN]')` with a two-step approach: first escapes all RegExp metacharacters in `githubToken` with `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`, then applies `new RegExp(escapedToken, 'g')` to replace all occurrences globally.

---

### WR-02: Unhandled `URIError` crash when `?step=` contains malformed percent-encoding

**Files modified:** `web-ui/src/app/editor/page.tsx`
**Commit:** 7face94
**Applied fix:** Extracted a `safeDecodeURI(s: string): string` helper function (placed before `EditorPage`) that wraps `decodeURIComponent` in a try/catch and returns the raw string on error. Replaced the inline `decodeURIComponent(stepParam)` call with `safeDecodeURI(stepParam)`.

---

### WR-03: `JSON.parse` in `readStorage` may silently return a non-object and corrupt settings

**Files modified:** `web-ui/src/hooks/useSettings.ts`
**Commit:** 615a9a7
**Applied fix:** Split the one-liner `{ ...DEFAULTS, ...JSON.parse(raw) }` into two steps: parse into `parsed`, then guard with `typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)` returning `{ ...DEFAULTS }` for any non-plain-object value before merging.

---

### WR-04: Fetch error silently discarded in `FeaturesPage`

**Files modified:** `web-ui/src/app/features/page.tsx`
**Commit:** 785bc5d
**Applied fix:** Added `const [error, setError] = useState<string | null>(null)` state. Updated `.catch()` to call `setError(err instanceof Error ? err.message : 'Failed to load features')` before `setLoading(false)`. Added `{!loading && error && <p className="text-sm text-destructive">{error}</p>}` render block; also tightened the empty-state guard to `!loading && !error && features.length === 0` so it does not show alongside an error.

---

_Fixed: 2026-06-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
