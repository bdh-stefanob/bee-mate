# Architecture

**Analysis Date:** 2026-06-09

## Pattern Overview

**Overall:** 4-Layer BDD Test Automation Architecture

The scaffold enforces a strict unidirectional dependency chain across four layers. Each layer knows only about the layer immediately below it. No layer may skip a level or reach upward. The rule is enforced by convention (CONTRIBUTING.md) and partially by the pre-commit hook.

**Key Characteristics:**
- Gherkin vocabulary decoupled from UI mechanics — selectors exist only in Page Objects
- Step catalog is generated from code (never written by hand), becoming the single source of truth
- Test isolation is per-scenario: `CustomWorld` is constructed fresh for each scenario
- Deterministic step reuse enforced by three mechanisms: autocomplete in VS Code extension, pre-commit validation, and CI gate

---

## Layers

**Layer 1 — Features (`src/features/`)**
- Purpose: Express business behaviour in Gherkin (Given/When/Then). Readable by non-technical stakeholders.
- Location: `src/features/`
- Contains: `.feature` files, organised in domain subdirectories
- Depends on: nothing (plain text)
- Used by: Cucumber.js runner, VS Code extension (`.feature` files are linted against catalog)
- Key design: steps are canonical phrases from `step-catalog.json` — no ad-hoc phrasing allowed

**Layer 2 — Steps (`src/steps/`)**
- Purpose: Thin glue that maps Gherkin phrases to action-layer method calls. Zero business logic, zero selectors.
- Location: `src/steps/`
- Contains: Cucumber step definitions (TypeScript), one file per domain subdirectory
- Depends on: `actions/` layer only
- Used by: Cucumber.js runner (auto-loaded via `cucumber.js` require glob)
- Key design: each step definition carries a structured JSDoc comment (`@intent`, `@param`, `@pre`, `@post`) that the catalog generator reads. Steps without `@intent` are flagged as undocumented (warning, not build failure).

**Layer 3 — Actions (`src/actions/`)**
- Purpose: Reusable business intentions. No Gherkin coupling. No selectors.
- Location: `src/actions/`
- Contains: Action classes that receive a Playwright `Page` object and expose domain methods
- Depends on: `pages/` layer only
- Used by: step definitions in `steps/`
- Key design: if the UI changes, actions stay unchanged; only the page object below is touched

**Layer 4 — Pages (`src/pages/`)**
- Purpose: The only layer where selectors and UI mechanics live. Acts as a Playwright adapter.
- Location: `src/pages/`
- Contains: Page Object classes using `data-testid` selectors, wrapping Playwright `Page` API
- Depends on: Playwright `Page` (external framework)
- Used by: action classes in `actions/`
- Key design: selector strings are private fields; `data-testid` convention used throughout

---

## Data Flow

**Scenario Execution Flow:**

1. Cucumber.js loads `.feature` files from `src/features/**/*.feature`
2. Cucumber.js loads step definitions from `src/steps/**/*.ts` (via `ts-node/register`)
3. `Before` hook in `src/support/hooks.ts` calls `CustomWorld.init()` — spins up a Chromium browser, context, and page
4. Each Gherkin step phrase is matched against compiled step expressions
5. Matched step handler instantiates an Action class, passing `this.page` from `CustomWorld`
6. Action class instantiates a Page Object, passing the same `Page` reference
7. Page Object uses Playwright API with `data-testid` selectors to interact with the browser
8. `After` hook tears down browser; on failure, attaches screenshot to Cucumber report

**State Management:**
- Per-scenario state lives in `CustomWorld` (`src/support/world.ts`)
- `CustomWorld` extends Cucumber's `World` class, giving each scenario a fresh `Browser`, `BrowserContext`, and `Page`
- No global mutable state between scenarios
- `CustomWorld` is accessed via `this` context in all step handlers (typed as `CustomWorld`)

**Catalog Generation Flow:**

1. `npm run catalog` runs `cucumber-js --dry-run --format message:cucumber-messages.ndjson`
2. `scripts/extract-steps.ts` parses the NDJSON output, reads JSDoc comments from source files
3. Produces `step-catalog.json` (structured data) and `STEP_CATALOG.md` (human-readable)
4. `catalog:watch` script (`scripts/watch-catalog.ts`) watches `src/steps/` and re-runs on any `.ts` save
5. VS Code extension's `FsLoader` (`vscode-extension/src/catalog/fsLoader.ts`) watches `step-catalog.json` and fires `onDidChange` to all providers

---

## Key Abstractions

**CustomWorld:**
- Purpose: Per-scenario execution context — Playwright browser lifecycle tied to Cucumber scenario lifecycle
- Location: `src/support/world.ts`
- Pattern: Extends `World`, registered via `setWorldConstructor`. `init()` and `destroy()` called by hooks, not test code.

**Action Classes (`AuthActions`, `OrderActions`):**
- Purpose: Translate business intent into sequences of page interactions — no Gherkin coupling, no selectors
- Examples: `src/actions/auth.actions.ts`, `src/actions/orders.actions.ts`
- Pattern: Constructor receives `Page`; all methods are `async`, return `void` or a typed result

**Page Objects (`LoginPage`, `CartPage`):**
- Purpose: Encapsulate all selector knowledge and Playwright mechanics for a single page/component
- Examples: `src/pages/login.page.ts`, `src/pages/cart.page.ts`
- Pattern: Private selector fields (strings or functions returning strings), public async methods only

**CatalogLoader Interface:**
- Purpose: Abstraction for the source of `step-catalog.json` — today filesystem, extensible to HTTP/npm/UNC
- Location: `vscode-extension/src/catalog/types.ts`
- Pattern: `CatalogLoader` interface with `load()`, `reload()`, `onDidChange()`. `FsLoader` (`vscode-extension/src/catalog/fsLoader.ts`) is the current implementation. `RemoteLoader` is planned for Roadmap 5.6 enterprise rollout.

**Step Catalog JSON Schema:**
- `step-catalog.json` is the single source of truth for all valid step expressions
- Schema: `{ generatedAt, totalSteps, documentedSteps, undocumentedSteps, steps: CatalogStep[] }`
- `CatalogStep`: `{ expression, parameters, domain, page?, sourceRef, doc: StepDoc, documented }`
- `StepDoc`: `{ intent?, params, pre?, post? }`

---

## Entry Points

**Test Execution:**
- Location: `cucumber.js` (root config) + `src/support/world.ts` + `src/support/hooks.ts`
- Triggers: `npm test` or `npm run test:dry`
- Responsibilities: configure paths, load step definitions and support files, invoke Playwright

**Catalog Pipeline:**
- Location: `scripts/extract-steps.ts` + `scripts/render-markdown.ts`
- Triggers: `npm run catalog`
- Responsibilities: dry-run Cucumber to get step metadata, enrich with JSDoc, write `step-catalog.json` and `STEP_CATALOG.md`

**Pre-commit Hook:**
- Location: `.husky/pre-commit` → `scripts/validate-steps.ts`
- Triggers: `git commit`
- Responsibilities: parse staged `.feature` files, match each step against catalog regexes, block commit on unrecognised steps (fuzzy-warn on near-matches >80% similarity), bypass via `SKIP_STEP_VALIDATION=1`

**VS Code Extension:**
- Location: `vscode-extension/src/extension.ts`
- Triggers: VS Code activation on `.feature` files
- Responsibilities: load catalog, register CompletionItemProvider, DiagnosticProvider, HoverProvider, TreeDataProvider, TagCompletionProvider, and two commands (`stepCatalog.reload`, `stepCatalog.find`)

---

## Error Handling

**Strategy:** Graceful degradation — missing or broken catalog never crashes tools; it degrades to "no suggestions"

**Patterns:**
- `FsLoader.reload()`: file absent → returns empty catalog (not null, not error); JSON corrupt → shows VS Code warning message, returns empty catalog
- `validate-steps.ts`: catalog absent → auto-regenerates via `npm run catalog`; regeneration fails → graceful skip (warns, does not block commit)
- `scripts/extract-steps.ts`: unreadable source files → empty doc, no crash; undocumented steps → warning to stdout, exit 0
- Playwright assertions in steps: use Node.js `strict assert` (`assert.equal`) — throws on failure, Cucumber catches and marks scenario FAILED

---

## Cross-Cutting Concerns

**Logging:** `console.log`/`console.warn`/`console.error` in scripts; VS Code `showInformationMessage`/`showWarningMessage` in extension; Playwright screenshots attached to Cucumber report on failure

**Validation:** Three enforcement layers — (1) VS Code extension `DiagnosticProvider` squiggles in editor, (2) `validate-steps.ts` pre-commit hook, (3) CI gate (`npm run validate:steps`) planned

**Selector Strategy:** Only `data-testid` attributes — no CSS classes, no XPath, no text selectors. All selectors are private fields in Page Objects.

**Step Documentation:** `@intent` JSDoc tag is mandatory by convention. Catalog generator emits a warning (not error) for undocumented steps. The `documented` boolean in `step-catalog.json` drives sort order in VS Code completions (documented steps surface first).

**Domain Derivation:** Step domain is inferred automatically from the subdirectory path: `src/steps/auth/` → domain `"auth"`, `src/steps/common/` → domain `"common"`. Used for grouping in the sidebar tree and filtering in the catalog.

**Jira Integration:** `scripts/jira-sync.ts` pushes scenarios tagged `@ticket:BOOT-XXX` as Jira comments via REST API. Credentials in `.env` only (`JIRA_URL`, `JIRA_TOKEN`). Supports `--dry-run`.

---

*Architecture analysis: 2026-06-09*
