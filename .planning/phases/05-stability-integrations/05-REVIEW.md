---
phase: 05-stability-integrations
reviewed: 2026-06-10T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - web-ui/src/app/api/github/push/route.ts
  - web-ui/src/app/api/jira/sync/route.ts
  - web-ui/src/app/editor/page.tsx
  - web-ui/src/app/features/page.tsx
  - web-ui/src/app/layout.tsx
  - web-ui/src/app/page.tsx
  - web-ui/src/app/settings/page.tsx
  - web-ui/src/components/ErrorBoundary.tsx
  - web-ui/src/components/ImportDropzone.tsx
  - web-ui/src/components/NavSettingsLink.tsx
  - web-ui/src/components/StepBrowser.tsx
  - web-ui/src/components/StepCatalog.tsx
  - web-ui/src/hooks/useSettings.ts
  - web-ui/src/lib/i18n.ts
  - web-ui/src/providers/Providers.tsx
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-06-10
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase introduces the GitHub push API route, the Jira sync API route, settings persistence via `localStorage`, and associated UI components. The overall architecture is clean and follows the project conventions. Two critical security issues were found: an SSRF vulnerability in the Jira route and unvalidated header injection into the GitHub API URL. Four warnings cover a crash-on-mount in the editor, an incomplete token scrub, a subtle `localStorage` parsing edge case, and a silently-swallowed fetch error. Three info-level items round out the review.

---

## Critical Issues

### CR-01: SSRF via unvalidated `x-jira-url` header

**File:** `web-ui/src/app/api/jira/sync/route.ts:85,112`
**Issue:** The `jiraUrl` value received from the `x-jira-url` request header is used verbatim to construct outbound HTTP requests (`commentUrl`) without any scheme or hostname validation. An attacker (or a misconfigured client) can supply `http://localhost:8080/`, `http://169.254.169.254/latest/meta-data/`, or any internal address, causing the Next.js server process to make arbitrary HTTP requests to internal network resources (Server-Side Request Forgery).

The token from `x-jira-token` is then sent to that arbitrary destination, leaking credentials.

**Fix:**
```typescript
// At the top of POST(), after reading headers:
const ALLOWED_SCHEMES = ['https:', 'http:'];

let parsedUrl: URL;
try {
  parsedUrl = new URL(jiraUrl);
} catch {
  return NextResponse.json(
    { ok: false, error: 'Invalid x-jira-url: must be a valid URL' },
    { status: 400 }
  );
}

// Reject non-https or localhost/private addresses in production
if (!ALLOWED_SCHEMES.includes(parsedUrl.protocol)) {
  return NextResponse.json(
    { ok: false, error: 'Invalid x-jira-url: only https:// is allowed' },
    { status: 400 }
  );
}

// Block RFC-1918 / loopback to prevent SSRF to internal services
const hostname = parsedUrl.hostname.toLowerCase();
const BLOCKED = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
if (
  BLOCKED.includes(hostname) ||
  hostname.startsWith('192.168.') ||
  hostname.startsWith('10.') ||
  hostname.startsWith('172.')
) {
  return NextResponse.json(
    { ok: false, error: 'Invalid x-jira-url: private addresses not allowed' },
    { status: 400 }
  );
}
```

---

### CR-02: Unvalidated `x-github-owner` / `x-github-repo` headers allow URL injection into GitHub API path

**File:** `web-ui/src/app/api/github/push/route.ts:66`
**Issue:** `githubOwner` and `githubRepo` are read from headers and concatenated directly into the GitHub REST API URL without validation:

```typescript
const apiBase = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;
```

An attacker supplying `x-github-owner: foo/evil` or embedding `?ref=` in `githubRepo` can alter the resulting URL path or query string, potentially redirecting the authenticated request to a different GitHub resource. For example, `githubOwner = "foo"` and `githubRepo = "bar/contents/etc/passwd?ref=main&x="` would produce a crafted URL. This is a path injection into the API base URL.

**Fix:**
```typescript
// Validate owner and repo: GitHub allows only alphanumerics, hyphens, dots, underscores
const GITHUB_NAME_RE = /^[a-zA-Z0-9_.\-]+$/;

if (!GITHUB_NAME_RE.test(githubOwner) || !GITHUB_NAME_RE.test(githubRepo)) {
  return NextResponse.json(
    { ok: false, error: 'Invalid x-github-owner or x-github-repo: only alphanumerics, hyphens, dots, underscores allowed' },
    { status: 400 }
  );
}
```
Add this block after the existing header null-check at line 34.

---

## Warnings

### WR-01: `String.replace` scrubs token only on first occurrence

**File:** `web-ui/src/app/api/github/push/route.ts:117`
**Issue:** `String.prototype.replace(string, replacement)` — when the first argument is a plain string (not a `RegExp`) — replaces only the **first** occurrence. If the token appears more than once in the error message (e.g., reflected by GitHub in a `422` body), subsequent occurrences leak the raw PAT to the client.

```typescript
// Current (replaces first occurrence only):
const safeMessage = message.replace(githubToken, '[TOKEN]');
```

**Fix:**
```typescript
// Replace ALL occurrences using a global RegExp with the token escaped:
const escapedToken = githubToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const safeMessage = message.replace(new RegExp(escapedToken, 'g'), '[TOKEN]');
```

---

### WR-02: Unhandled `URIError` crash when `?step=` contains a malformed percent-encoded sequence

**File:** `web-ui/src/app/editor/page.tsx:39`
**Issue:** `decodeURIComponent(stepParam)` throws a `URIError` if `stepParam` contains an invalid percent-encoding (e.g., `?step=%GG`). This is called unconditionally during render, before any error boundary can protect the component state, causing the page to crash with an unhandled exception on mount. The `ErrorBoundary` wraps the tree but the throw happens during the synchronous render of the `'use client'` component, so the boundary will catch it — however the entire editor page is replaced with the fallback, which is a poor UX for a URL parameter edge case.

**Fix:**
```typescript
function safeDecodeURI(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // return raw string if malformed
  }
}

// In EditorPage:
const initialContent = stepParam
  ? `  Given ${safeDecodeURI(stepParam)}`
  : '';
```

---

### WR-03: `JSON.parse` in `readStorage` may silently return a non-object and corrupt settings

**File:** `web-ui/src/hooks/useSettings.ts:29`
**Issue:** If `localStorage` contains a valid-JSON non-object value (e.g., the string `"null"`, `"true"`, or `"[1,2,3]"`), `JSON.parse(raw)` returns `null`, `true`, or an array. Spreading these with `{ ...DEFAULTS, ...null }` is harmless, but `{ ...DEFAULTS, ...[] }` or `{ ...DEFAULTS, ...'string' }` can produce unexpected results. More importantly, the `as AppSettings` cast suppresses the TypeScript error, so the type system gives no protection.

**Fix:**
```typescript
function readStorage(): AppSettings {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    // Guard: only merge if parsed value is a plain object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULTS };
    }
    return { ...DEFAULTS, ...parsed } as AppSettings;
  } catch {
    return { ...DEFAULTS };
  }
}
```

---

### WR-04: Fetch error silently discarded in `FeaturesPage` — users see empty list with no feedback

**File:** `web-ui/src/app/features/page.tsx:24-25`
**Issue:** The `.catch()` handler only calls `setLoading(false)` and swallows the error. When `/api/features` fails (network error, 500), the user sees an empty feature list indistinguishable from a repo with no feature files, with no error message shown.

```typescript
.catch(() => setLoading(false)); // error message discarded
```

**Fix:**
```typescript
const [error, setError] = useState<string | null>(null);

// In useEffect:
.catch((err: unknown) => {
  setError(err instanceof Error ? err.message : 'Failed to load features');
  setLoading(false);
});

// In render, after the loading guard:
if (error) {
  return (
    <p className="text-sm text-destructive">{error}</p>
  );
}
```

---

## Info

### IN-01: Unnecessary `settings` dependency in `handleBlur` causes stale recreation

**File:** `web-ui/src/app/settings/page.tsx:16-19`
**Issue:** `handleBlur` is memoized with `useCallback` and has `[settings, update]` as its dependency array. However, `settings` is not read anywhere inside the callback body — only the `key` and `value` parameters (passed at call time) and `update` are used. This causes `handleBlur` to be recreated on every settings state change (i.e., after every field blur), which is unnecessary and can cause subtle re-render cascades if child components receive it as a prop.

**Fix:**
```typescript
const handleBlur = useCallback((key: keyof typeof settings, value: string) => {
  update({ [key]: value });
  setSavedKey(key);
  setTimeout(() => setSavedKey(k => k === key ? null : k), 2000);
}, [update]); // remove `settings` from deps — it is not read inside
```

---

### IN-02: Language selection not persisted across page refreshes

**File:** `web-ui/src/providers/Providers.tsx:27`
**Issue:** `const [lang, setLang] = useState<Lang>('en')` always initializes to English. Switching language is lost on refresh. For a tool used by the QA team in daily work, this creates friction.

**Fix:** Read initial language from `localStorage` and persist changes:
```typescript
function readLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('bdd-lang');
  return stored === 'it' ? 'it' : 'en';
}

// In Providers:
const [lang, setLang] = useState<Lang>(readLang);

const handleSetLang = useCallback((l: Lang) => {
  setLang(l);
  localStorage.setItem('bdd-lang', l);
}, []);

// Pass handleSetLang instead of setLang to LanguageContext.Provider
```

---

### IN-03: `step.requires!` non-null assertion inside `StepBrowser` render — brittle guard

**File:** `web-ui/src/components/StepBrowser.tsx:253`
**Issue:** The non-null assertion `step.requires!` is used inside the tooltip list render. The enclosing `hasDeps` guard (`(step.requires?.length ?? 0) > 0`) ensures `requires` is a non-empty array at that point, making the `!` technically safe. However, it is fragile — any future refactor that changes the `hasDeps` condition could silently introduce a runtime error. Using optional chaining is both safer and communicates intent.

**Fix:**
```typescript
{step.requires?.map(req => (
  <li key={req} className="font-mono">{req}</li>
))}
```

---

_Reviewed: 2026-06-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
