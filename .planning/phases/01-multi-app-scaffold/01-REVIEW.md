---
phase: 01-multi-app-scaffold
reviewed: 2026-06-09T18:45:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - scripts/extract-steps.ts
  - src/actions/app-a/auth.actions.ts
  - src/actions/app-a/orders.actions.ts
  - src/pages/app-a/cart.page.ts
  - src/pages/app-a/login.page.ts
  - src/steps/app-a/auth/auth.steps.ts
  - src/steps/app-a/orders/orders.steps.ts
  - src/steps/common/common.steps.ts
  - STEP_CATALOG.md
  - step-catalog.json
  - src/actions/app-b/.gitkeep
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-06-09T18:45:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Reviewed the multi-app scaffold implementation: the 4-layer architecture (features → steps → actions → pages) is correctly structured and consistently applied. Layer boundaries are respected throughout — no selectors leak into steps or actions, no business logic appears in pages. The catalog generation pipeline (`extract-steps.ts`) is solid and handles edge cases gracefully. All 10 steps carry `@intent` annotations and are fully documented in the catalog.

Four warnings and three info items were found. None are security vulnerabilities. The most actionable warning is a hardcoded credential in `auth.actions.ts` and the `any` type in `extract-steps.ts` that could silently swallow malformed catalog messages. The remaining issues are minor but worth addressing before the scaffold is used as a reference pattern for the wider team.

---

## Warnings

### WR-01: Hardcoded test credentials in action layer

**File:** `src/actions/app-a/auth.actions.ts:24`
**Issue:** `loginWithValidCredentials()` hardcodes `"test.user@example.com"` and `"valid-password"` directly in the action class. Even in a scaffold, this is a bad pattern to propagate: any team that copies this file verbatim will end up with credentials committed to their repo. The `auth.actions.ts` file is explicitly designed as the reference implementation — it should model the correct pattern.
**Fix:** Accept credentials as parameters (or pull from environment variables), documenting the pattern in a comment:
```typescript
async loginWithValidCredentials(
  email: string = process.env.TEST_USER_EMAIL ?? "test.user@example.com",
  password: string = process.env.TEST_USER_PASSWORD ?? "changeme"
): Promise<void> {
  const login = new LoginPage(this.page);
  await login.goto();
  await login.submitCredentials(email, password);
}
```

---

### WR-02: `any` type on parsed NDJSON message suppresses type errors

**File:** `scripts/extract-steps.ts:114`
**Issue:** `let msg: any` allows the subsequent property accesses (`msg.stepDefinition`, `msg.stepDefinition.pattern?.source`, etc.) to compile without type checks. If the Cucumber message format changes in a major version upgrade, or if the NDJSON contains unexpected payload shapes, the script will silently produce `undefined` values rather than surfacing a clear error. This is particularly risky because `extract-steps.ts` writes the authoritative `step-catalog.json`.
**Fix:** Define a minimal interface for the expected message shape and use it:
```typescript
interface CucumberMessage {
  stepDefinition?: {
    pattern?: { source?: string };
    sourceReference?: {
      uri?: string;
      location?: { line?: number };
    };
  };
}

let msg: CucumberMessage;
try {
  msg = JSON.parse(line) as CucumberMessage;
} catch {
  continue;
}
if (!msg.stepDefinition) continue;
```

---

### WR-03: `common.steps.ts` is hard-coded to `app-a` actions

**File:** `src/steps/common/common.steps.ts:8`
**Issue:** The `common` domain is documented as "truly universal steps, cross-app". However, `common.steps.ts` directly imports `AuthActions` from `../../actions/app-a/auth.actions`. This means the `I am logged in as a {string} user` step only works for app-a. If the scaffold is extended with app-b (the next planned phase) and app-b uses a different auth mechanism, either this step cannot be reused or it introduces an implicit app-a dependency into a supposedly app-agnostic layer.
**Fix:** Two options depending on the intended design:
1. **Short term (honest rename):** Move the step into `src/steps/app-a/auth/auth.steps.ts` — it is an app-a step, not a common one. The `common/` directory should remain empty or contain only truly generic steps (e.g., navigation to a URL).
2. **Long term (multi-app common):** Inject the `World` app context and resolve the correct `Actions` class at runtime, using an app discriminator from `CustomWorld`.

---

### WR-04: `readOrderStatus()` silently returns empty string on missing element

**File:** `src/pages/app-a/cart.page.ts:30`
**Issue:** `(await this.page.textContent(this.status)) ?? ""` returns `""` when the `[data-testid="order-status"]` element is absent from the DOM. The `??` fallback is correct for a null/undefined result, but `page.textContent()` returns `null` when the element is not found — not an exception. The caller `OrderActions.orderStatus()` returns that empty string, and `orders.steps.ts:67` compares it against the expected status with `assert.equal`. A missing element and an empty-string status are indistinguishable, producing a confusing assertion failure message rather than a "element not found" failure.
**Fix:** Use `page.locator().textContent()` which throws if the element is missing, or add an explicit wait before reading:
```typescript
async readOrderStatus(): Promise<string> {
  await this.page.waitForSelector(this.status);
  return (await this.page.textContent(this.status)) ?? "";
}
```

---

## Info

### IN-01: `void role` suppresses the unused-variable warning but obscures intent

**File:** `src/actions/app-a/auth.actions.ts:18`
**Issue:** `void role;` is a TypeScript idiom to suppress "variable declared but never read" linting warnings. It is correct as a placeholder, but it is not immediately obvious to a new team member that this is intentional scaffolding rather than incomplete code. The `// TODO` comment above partially addresses this.
**Fix:** No code change required. Consider adding a brief inline comment to explain the idiom: `void role; // intentional: wire to fixture factory (see TODO above)`. This is minor but the scaffold is a reference, so clarity matters.

---

### IN-02: Domain extraction regex captures only the first path segment after `steps/`

**File:** `scripts/extract-steps.ts:133`
**Issue:** The regex `uri.match(/steps[/\\]([^/\\]+)[/\\]/)` captures the first directory segment after `steps/`. For the current path structure `src/steps/app-a/auth/auth.steps.ts`, this correctly produces `"app-a"`. However, the comment in the code says it is "retrocompatibile con path a 2 livelli" — implying paths like `src/steps/auth/auth.steps.ts` would produce `"auth"` as the domain, which is a different naming convention. If both structures coexist during a migration, the catalog will list mixed domain names (`app-a` vs `auth`) with no warning.
**Fix:** Document the supported path structure explicitly in the function comment, or add a validation step that warns if the extracted domain does not match the expected `app-*` or `common` pattern:
```typescript
const domain = domainMatch ? domainMatch[1] : "common";
if (domain !== "common" && !/^app-[a-z]/.test(domain)) {
  console.warn(`Unexpected domain segment "${domain}" in: ${uri}`);
}
```

---

### IN-03: `extract-steps.ts` always overwrites `step-catalog.json` even when output is unchanged

**File:** `scripts/extract-steps.ts:160`
**Issue:** `fs.writeFileSync("step-catalog.json", ...)` always writes the file unconditionally, including a new `generatedAt` timestamp. This means every `npm run catalog` run produces a dirty git working tree even when no steps changed, because `generatedAt` changes every time. This makes it harder to use `git diff` to see whether the catalog changed meaningfully, and adds noise to commit history.
**Fix:** Compare the new catalog content (excluding `generatedAt`) against the existing file before writing, or use a stable `generatedAt` (e.g., source file mtime). A simpler workaround is to omit `generatedAt` from diff comparisons by sorting the field last and documenting that it is always expected to change. This is a quality-of-life issue, not a correctness issue.

---

_Reviewed: 2026-06-09T18:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
