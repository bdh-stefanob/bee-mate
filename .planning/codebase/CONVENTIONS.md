# Coding Conventions

**Analysis Date:** 2026-06-09

## Naming Patterns

**Files:**
- Step definitions: `<domain>.steps.ts` — e.g. `auth.steps.ts`, `orders.steps.ts`
- Action classes: `<domain>.actions.ts` — e.g. `auth.actions.ts`, `orders.actions.ts`
- Page Objects: `<component>.page.ts` — e.g. `login.page.ts`, `cart.page.ts`
- Script utilities: `<verb>-<noun>.ts` — e.g. `extract-steps.ts`, `render-markdown.ts`, `validate-steps.ts`
- Feature files: `<domain-action>.feature` — e.g. `login.feature`, `place-order.feature`

**Classes:**
- PascalCase throughout: `AuthActions`, `OrderActions`, `LoginPage`, `CartPage`, `CustomWorld`
- Step action classes: named `<Domain>Actions`
- Page Object classes: named `<Component>Page`
- World class: `CustomWorld` (extends Cucumber's `World`)

**Methods and Functions:**
- camelCase async methods: `ensureRegisteredUser()`, `loginWithValidCredentials()`, `isOnDashboard()`
- Boolean query methods prefixed with `is` or `has`: `isOrderConfirmed()`, `isDashboardVisible()`
- Void side-effect methods use verb phrases: `addToCart()`, `placeOrder()`, `addProduct()`

**Interfaces:**
- PascalCase: `CartItem`, `StepDoc`, `CatalogStep`, `StepCatalog`, `StepLocation`
- Exported when consumed by multiple files: `CartItem` in `orders.actions.ts`

**Variables and Parameters:**
- camelCase: `featureFiles`, `catalogPath`, `domainMatch`
- Parameters are descriptive single words where possible: `role`, `product`, `status`

## TypeScript Usage

**Compiler Settings** (`tsconfig.json`):
- Target: `ES2022`
- Module: `CommonJS` (required for ts-node + Cucumber.js CommonJS loader)
- `strict: true` — all strict checks enforced
- `esModuleInterop: true`
- `skipLibCheck: true`
- `resolveJsonModule: true` (used to import `step-catalog.json`)
- `types: ["node"]`
- Scope: `src/**/*.ts` and `scripts/**/*.ts`

**Type Annotations:**
- All method return types explicitly annotated: `Promise<void>`, `Promise<boolean>`, `Promise<string>`
- Constructor parameters typed with `private readonly` where applicable
- `this: CustomWorld` typed explicitly in Cucumber step callbacks (required pattern)
- Non-null assertion (`!`) used minimally and only when provably safe

**Private Fields:**
- Page Object selectors declared as `private readonly` string fields
- Dynamic selectors declared as `private readonly` arrow functions returning strings:
  ```typescript
  private readonly addButton = (product: string) => `[data-testid="add-${product}"]`;
  ```

**Null Handling:**
- Optional chaining (`?.`) used for safe teardown in hooks: `this.page?.close()`
- Nullish coalescing (`??`) used for fallback values: `?? ""`
- `void` used to explicitly discard unused Promise results

## Code Style

**Formatting:**
- No project-level Prettier or ESLint config detected — formatting is convention-based
- Indentation: 2 spaces (observed in all TypeScript files)
- Semicolons: present
- Trailing commas: present in multiline structures
- Single quotes for strings in TypeScript; double quotes in JSON

**Comments:**
- File-level comment on every `.ts` file: layer identity and responsibility statement
  ```typescript
  // src/steps/auth/auth.steps.ts
  // Thin glue: maps Gherkin phrases to action-layer calls. No business logic,
  // no selectors here.
  ```
- Inline `// Selectors live here, isolated from everything above.` in Page Objects
- `// TODO:` used for intentional placeholders (e.g. seed user via API/fixture)

**JSDoc on Step Definitions:**
Every step definition carries a structured JSDoc comment. `@intent` is **mandatory**; others are included when they add information:
```typescript
/**
 * @intent  <One sentence. Verb first, present tense, active voice. ~15 words max.>
 * @param   <name> <What it is and accepted values.>
 * @pre     <What must be true before.>
 * @post    <What is true after.>
 * @page    <PageObject this step operates on, e.g. LoginPage, CartPage>
 */
```
The catalog generator (`scripts/extract-steps.ts`) reads `@intent` and publishes it. Steps without `@intent` appear flagged as undocumented — a warning, not a build failure.

## Import Organization

**Order (observed):**
1. Cucumber framework imports: `@cucumber/cucumber`
2. Playwright imports: `@playwright/test`
3. Node stdlib: `fs`, `path`, `child_process`
4. Local support layer: `../../support/world`
5. Local action layer: `../../actions/auth.actions`
6. Local page layer: `../pages/login.page`

**Path Style:**
- Relative paths only (`../../support/world`) — no path aliases configured
- No barrel (`index.ts`) files; each module imported directly by path

**Module System:**
- TypeScript source uses ES module `import`/`export` syntax
- `cucumber.js` config uses CommonJS `module.exports` (required by Cucumber.js loader)

## Architectural Layer Rules (Non-Negotiable)

The four-layer constraint defines what belongs where:

| Layer | Location | Allowed to import | NEVER imports |
|-------|----------|-------------------|---------------|
| Feature | `src/features/**/*.feature` | — | — |
| Steps (glue) | `src/steps/**/*.ts` | `actions/`, `support/` | `pages/`, selectors |
| Actions | `src/actions/**/*.ts` | `pages/`, `api/` | `steps/`, selectors |
| Pages/API | `src/pages/**/*.ts` | Playwright `Page` | `steps/`, `actions/` |

**Absolute rule:** selectors (`[data-testid="..."]`) exist only in `src/pages/`. Any step or action containing a CSS/XPath selector is a layer violation.

## Gherkin Conventions

**Step Authoring:**
- Intent over mechanics: `When I place the order`, never `When I click "#checkout"`
- Parameterize instead of duplicating: `{string}` parameters over near-identical steps
- Declarative setup: `Given I am logged in as a "standard" user` (one line, reusable)
- One term per concept: do not drift between synonyms across features

**Selectors in Feature Files:**
- `data-testid` attributes used exclusively for test selectors in Page Objects
- Pattern: `[data-testid="<element-name>"]`

**Feature Tags:**
- Domain tags on Feature: `@auth`, `@orders`
- Jira link tags on Scenario: `@ticket:BOOT-123`
- Suite tags: `@regression`, `@smoke`, `@sanity`, `@wip`

**Step Catalog Rule:**
- Before writing a new step, search `STEP_CATALOG.md` for an existing step
- Reuse exact wording — a near-duplicate is worse than no step
- New steps require explicit gatekeeper (Steve) approval
- Step catalog is never edited by hand; always regenerated via `npm run catalog`

## Commit Conventions

**Format:** Conventional Commits
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance (tooling, deps, config)
- `docs:` — documentation only
- `test:` — test additions or changes

**Pre-commit Gate:**
- Husky hook runs `scripts/validate-steps.ts` on every commit
- Validates all staged `.feature` files against `step-catalog.json`
- Commit is blocked if any step has no catalog match and no close fuzzy match (>80% similarity)
- Override available via `SKIP_STEP_VALIDATION=1` (Steve's escape hatch)

## Error Handling

**In Action and Page layers:**
- Async methods return typed Promises; errors propagate naturally to Cucumber's test runner
- Explicit `assert.equal(value, expected, message)` using Node's `assert` with strict mode

**In Scripts:**
- `try/catch` around file reads and exec calls with graceful degradation (warn + continue)
- Exit codes documented in file-level JSDoc: `0` = pass/warning, `1` = hard error

**In Hooks:**
- Failure screenshot on `Status.FAILED` before teardown:
  ```typescript
  if (scenario.result?.status === Status.FAILED && this.page) {
    const image = await this.page.screenshot();
    this.attach(image, "image/png");
  }
  ```

---

*Convention analysis: 2026-06-09*
