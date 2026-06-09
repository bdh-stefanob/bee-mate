# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Runner:**
- `@cucumber/cucumber` v10.8.0
- Config: `cucumber.js` (project root, CommonJS format)

**Browser Automation:**
- `@playwright/test` v1.45.0
- Driver: `chromium` (launched per-scenario via `CustomWorld`)
- Playwright is used as a browser driver, not as its own test runner — Cucumber owns the lifecycle

**Assertion Library:**
- Node.js built-in `assert` with strict mode: `import { strict as assert } from "assert"`

**TypeScript Execution:**
- `ts-node` v10.9.2 with `ts-node/register` loaded via `requireModule` in `cucumber.js`

**Run Commands:**
```bash
npm test              # Run all scenarios (full browser execution)
npm run test:dry      # Dry-run: validates step matching without executing browser
npm run catalog       # Regenerate step-catalog.json and STEP_CATALOG.md
npm run validate:steps  # Run step validator directly (same script as pre-commit hook)
npm run catalog:watch   # Watch mode: re-runs catalog on file changes
```

## Cucumber.js Configuration

**File:** `cucumber.js` (project root)

```javascript
module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["src/steps/**/*.ts", "src/support/**/*.ts"],
    paths: ["src/features/**/*.feature"],
    format: [
      "progress-bar",
      "html:reports/cucumber-report.html",
      "summary",
    ],
    formatOptions: { snippetInterface: "async-await" },
  },
};
```

Key points:
- All step definitions loaded from `src/steps/**/*.ts`
- Support files (World, hooks) loaded from `src/support/**/*.ts`
- Feature files scanned from `src/features/**/*.feature`
- HTML report written to `reports/cucumber-report.html`
- Snippet interface set to `async-await` (all generated snippets use `async function`)

## Test File Organization

**Location:** Co-located by domain, separate from source code

```
src/
├── features/           # Gherkin scenarios (what the business does)
│   ├── auth/
│   │   └── login.feature
│   └── orders/
│       └── place-order.feature
├── steps/              # Thin glue: Gherkin phrase → action call
│   ├── auth/
│   │   └── auth.steps.ts
│   ├── orders/
│   │   └── orders.steps.ts
│   └── common/
│       └── common.steps.ts
├── actions/            # Business intentions (reusable, no selectors)
│   ├── auth.actions.ts
│   └── orders.actions.ts
├── pages/              # Selectors and UI mechanics only
│   ├── login.page.ts
│   └── cart.page.ts
└── support/
    ├── world.ts        # CustomWorld: per-scenario Playwright context
    └── hooks.ts        # Before/After lifecycle hooks
```

**Domain Mirroring:**
- Feature files, step files, and action files share the same domain directory name
- `src/features/auth/` → `src/steps/auth/` → `src/actions/auth.actions.ts`
- Common/shared steps live in `src/steps/common/common.steps.ts`

**Adding a New Domain:**
1. Create `src/features/<domain>/<domain-action>.feature`
2. Create `src/steps/<domain>/<domain>.steps.ts`
3. Create `src/actions/<domain>.actions.ts`
4. Create `src/pages/<component>.page.ts` for any new UI components
5. Run `npm run catalog` to regenerate the step catalog

## Test Structure

**Scenario Design (Feature files):**
```gherkin
@orders
Feature: Order placement

  Scenario: User places an order for a single product
    Given I am logged in as a "standard" user
    And the cart contains the product "Wireless Mouse"
    When I place the order
    Then the order is confirmed
    And the order status is "pending"

  Scenario: User places an order for multiple products
    Given I am logged in as a "standard" user
    And the cart contains the following products:
      | product        | quantity |
      | Wireless Mouse | 2        |
      | USB-C Cable    | 1        |
    When I place the order
    Then the order is confirmed
```

**Scenario Outline Pattern (for role-based or parameter variations):**
```gherkin
  Scenario Outline: User logs in with different roles
    Given I am a registered user with role "<role>"
    When I log in with valid credentials
    Then I land on my dashboard

    Examples:
      | role    |
      | admin   |
      | standard|
```

**Step Definition Structure:**
```typescript
/**
 * @intent  One-sentence description. Verb first, active voice.
 * @param   paramName  What it is and accepted values.
 * @pre     What must be true before execution.
 * @post    What is true after execution.
 * @page    PageObject this step operates on.
 */
Given(
  "step text with {string} parameter",
  async function (this: CustomWorld, param: string) {
    await new DomainActions(this.page).someAction(param);
  }
);
```

**Assertion Pattern:**
```typescript
const result = await new DomainActions(this.page).checkSomething();
assert.equal(result, expected, "Descriptive failure message");
```

## World and Lifecycle

**CustomWorld** (`src/support/world.ts`):
- One instance per scenario — state never leaks between scenarios
- Holds: `browser: Browser`, `context: BrowserContext`, `page: Page`
- `init()` launches a new Chromium browser + context + page
- `destroy()` closes page, context, and browser in order

**Hooks** (`src/support/hooks.ts`):
```typescript
Before(async function (this: CustomWorld) {
  await this.init();   // Fresh browser for every scenario
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const image = await this.page.screenshot();
    this.attach(image, "image/png");  // Screenshot attached to HTML report on failure
  }
  await this.destroy();  // Always tears down
});
```

## Dry-Run Mode

**Command:** `npm run test:dry` → `cucumber-js --dry-run`

Dry-run validates step matching without executing any browser automation:
- Every step in every `.feature` must match a defined step expression
- Undefined steps cause the dry-run to fail with "Undefined" status
- No Playwright calls are made — `World.init()` is not invoked
- Use dry-run to verify that new `.feature` files compile against existing steps before running

**Current state (from ROADMAP.md):** 5 scenarios, 18 steps, 0 undefined.

## Step Catalog System

The step catalog is the anti-noise mechanism ensuring deterministic step reuse.

**Artifacts:**
- `step-catalog.json` — structured JSON, machine-readable (consumed by validate-steps.ts and VS Code extension)
- `STEP_CATALOG.md` — human-readable Markdown, searchable in browser/editor

**Generation pipeline (`npm run catalog`):**
```
1. cucumber-js --dry-run --format message:cucumber-messages.ndjson
   ↓ produces NDJSON stream of step definitions
2. ts-node scripts/extract-steps.ts cucumber-messages.ndjson
   ↓ parses NDJSON, reads @intent/@param/@pre/@post from source comments
   ↓ produces step-catalog.json
3. ts-node scripts/render-markdown.ts
   ↓ reads step-catalog.json
   ↓ produces STEP_CATALOG.md
```

**step-catalog.json schema:**
```json
{
  "generatedAt": "<ISO timestamp>",
  "totalSteps": 10,
  "documentedSteps": 10,
  "undocumentedSteps": 0,
  "steps": [
    {
      "expression": "I am logged in as a {string} user",
      "parameters": ["{string}"],
      "domain": "common",
      "page": "LoginPage",
      "sourceRef": "src\\steps\\common\\common.steps.ts:16",
      "doc": {
        "intent": "Logs in as a user of the given role in one declarative step.",
        "params": { "role": "The role to log in as: \"admin\" | \"standard\"." },
        "post": "An authenticated session is active for that role.",
        "page": "LoginPage"
      },
      "documented": true
    }
  ]
}
```

**Domain extraction:** derived from the directory path — `steps/auth/` → domain `auth`, `steps/common/` → domain `common`

**Undocumented step handling:** steps without `@intent` receive `"documented": false` and appear with a warning flag in `STEP_CATALOG.md`. This is a warning, never a build failure.

**Rule:** `STEP_CATALOG.md` is never written by hand. Always regenerated via `npm run catalog`.

## Pre-Commit Validation

**Script:** `scripts/validate-steps.ts`
**Hook:** `.husky/pre-commit` runs `npx ts-node scripts/validate-steps.ts`

**Logic:**
1. Reads staged `.feature` files (`git diff --cached --name-only`)
2. Loads `step-catalog.json` (regenerates it via `npm run catalog` if absent)
3. For each step in staged files:
   - **Exact match** (Cucumber expression → compiled regex): pass silently
   - **Fuzzy match ≥ 80% similarity** (Levenshtein): warning with closest suggestion — does NOT block commit
   - **No match, similarity < 80%**: hard error — commit BLOCKED
4. Exit code `0` = pass (or warnings only); `1` = blocked

**Override:** `SKIP_STEP_VALIDATION=1 git commit ...` bypasses all validation (Steve's escape hatch)

**Fuzzy matching:**
- Strips `{string}`, `{int}`, `{float}`, `{word}` tokens before comparison
- Normalizes whitespace and lowercases both strings
- Threshold: 80% normalized Levenshtein similarity for warning vs. hard error

## Data Management

**Test Data Strategy:**
- No fixture files or factory functions exist yet — data is hardcoded in action layer as placeholders
- `AuthActions.ensureRegisteredUser()` contains a `// TODO: seed user via API client or fixture factory` placeholder
- Demo credentials hardcoded in action layer for scaffold purposes: `"test.user@example.com"`, `"valid-password"`
- Real implementations should wire to an API client or fixture factory in `src/actions/`

**DataTable Pattern (for multi-row test data):**
```typescript
Given(
  "the cart contains the following products:",
  async function (this: CustomWorld, table: DataTable) {
    const items = table.hashes().map((row) => ({
      product: row.product,
      quantity: Number(row.quantity),
    }));
    await new OrderActions(this.page).addToCart(items);
  }
);
```
- `table.hashes()` maps header row to object keys — preferred over `table.rows()`
- `Number()` used for numeric coercion from table string values

**Parameterized Steps:**
- `{string}` — quoted string values: `"standard"`, `"Wireless Mouse"`
- Single-param steps preferred over table for simple cases
- Same action method called from both single-product and table-driven steps

## Test Reporting

**Formats configured in `cucumber.js`:**
- `progress-bar` — real-time progress in terminal
- `html:reports/cucumber-report.html` — full HTML report with scenario details
- `summary` — printed to terminal after all tests complete

**Failure Evidence:**
- Screenshot attached to HTML report automatically on scenario failure (via `After` hook)
- Screenshot format: `image/png`, attached via `this.attach(image, "image/png")`

**Report Location:** `reports/cucumber-report.html` (generated at run time, not committed)

## Coverage

**Requirements:** No numeric coverage target enforced

**Current catalog state:** 10 steps, all 100% documented (`undocumentedSteps: 0`)

**Catalog health check:**
```bash
npm run catalog   # Shows documented vs. undocumented count in terminal output
```

**Structural coverage validation:**
- Dry-run (`npm run test:dry`) confirms 0 undefined steps
- Pre-commit hook confirms no new `.feature` steps outside the catalog

---

*Testing analysis: 2026-06-09*
