# Codebase Structure

**Analysis Date:** 2026-06-09

## Directory Layout

```
bdd-automation-scaffold/
├── src/                        # Core automation framework (4-layer BDD)
│   ├── features/               # Layer 1: Gherkin scenarios (.feature files)
│   │   ├── auth/               # Auth domain
│   │   └── orders/             # Orders domain
│   ├── steps/                  # Layer 2: Thin glue — Cucumber step definitions
│   │   ├── auth/               # Auth-domain steps
│   │   ├── common/             # Cross-domain reusable steps
│   │   └── orders/             # Orders-domain steps
│   ├── actions/                # Layer 3: Business intent — no selectors
│   ├── pages/                  # Layer 4: Page Objects — selectors only
│   └── support/                # Cucumber world + hooks
├── scripts/                    # CLI tools: catalog generation, validation, Jira sync
├── vscode-extension/           # VS Code extension (authoring tooling)
│   ├── src/
│   │   ├── catalog/            # CatalogLoader interface + FsLoader
│   │   └── providers/          # VS Code language feature providers
│   └── out/                    # Compiled extension output (committed)
├── docs-site/                  # Astro Starlight catalog website (Roadmap 5.1)
├── reports/                    # Generated test output (gitignored)
├── step-catalog.json           # Generated catalog — single source of truth
├── STEP_CATALOG.md             # Generated human-readable catalog (never edit by hand)
├── cucumber.js                 # Cucumber runner configuration
├── playwright.config.ts        # Playwright configuration
├── tsconfig.json               # TypeScript config for src/ and scripts/
├── cucumber-messages.ndjson    # Intermediate dry-run output (overwritten by catalog)
├── CONTRIBUTING.md             # Architectural rules (4 layers, @intent, anti-noise)
├── ROADMAP.md                  # Backlog and "what NOT to build"
└── .husky/pre-commit           # Pre-commit hook → scripts/validate-steps.ts
```

---

## Directory Purposes

**`src/features/`**
- Purpose: Gherkin `.feature` files, one subdirectory per business domain
- Contains: `.feature` files with `Feature:`, `Scenario:`, `Scenario Outline:` blocks
- Key files: `src/features/auth/login.feature`, `src/features/orders/place-order.feature`
- Rule: steps used here must exist in `step-catalog.json`; no ad-hoc phrasing

**`src/steps/`**
- Purpose: Cucumber step definitions — thin mapping of Gherkin phrases to action calls
- Contains: `.steps.ts` files; one file per domain; structured JSDoc above every step
- Key files: `src/steps/auth/auth.steps.ts`, `src/steps/orders/orders.steps.ts`, `src/steps/common/common.steps.ts`
- Rule: no selectors, no business logic; each step instantiates one Action class and calls one method

**`src/actions/`**
- Purpose: Business-intent layer — reusable sequences of page operations
- Contains: `*.actions.ts` files; one class per domain
- Key files: `src/actions/auth.actions.ts`, `src/actions/orders.actions.ts`
- Rule: receives `Page` from constructor; calls Page Objects; never touches selectors directly

**`src/pages/`**
- Purpose: Page Object layer — the only place selectors and Playwright mechanics live
- Contains: `*.page.ts` files; one class per page or major UI component
- Key files: `src/pages/login.page.ts`, `src/pages/cart.page.ts`
- Rule: all selectors are private string fields; only `data-testid` attribute selectors

**`src/support/`**
- Purpose: Cucumber runtime infrastructure — World definition and lifecycle hooks
- Contains: `world.ts` (CustomWorld with Playwright browser lifecycle), `hooks.ts` (Before/After)
- Key files: `src/support/world.ts`, `src/support/hooks.ts`

**`scripts/`**
- Purpose: Build-time and gate tools (not part of test execution itself)
- Contains: TypeScript CLI scripts run via `ts-node`
- Key files:
  - `scripts/extract-steps.ts` — parses NDJSON dry-run output, extracts JSDoc, writes `step-catalog.json`
  - `scripts/render-markdown.ts` — reads `step-catalog.json`, writes `STEP_CATALOG.md`
  - `scripts/validate-steps.ts` — pre-commit hook; matches staged `.feature` steps against catalog
  - `scripts/watch-catalog.ts` — file watcher that re-runs `npm run catalog` on step file changes
  - `scripts/jira-sync.ts` — pushes `@ticket:BOOT-XXX`-tagged scenarios to Jira via REST

**`vscode-extension/`**
- Purpose: VS Code extension providing deterministic step authoring support
- Contains: Full TypeScript extension project with its own `package.json` and `tsconfig.json`
- Key subdirectories:
  - `vscode-extension/src/catalog/` — `types.ts` (interfaces), `fsLoader.ts` (FsLoader), `index.ts` (barrel)
  - `vscode-extension/src/providers/` — VS Code language feature providers
  - `vscode-extension/out/` — compiled JS (committed; extension runs from here)
- Key files:
  - `vscode-extension/src/extension.ts` — activate/deactivate entry point
  - `vscode-extension/src/catalog/types.ts` — `CatalogLoader` interface, `CatalogStep`, `Catalog` types
  - `vscode-extension/src/catalog/fsLoader.ts` — `FsLoader`: reads and watches `step-catalog.json`
  - `vscode-extension/src/providers/completionProvider.ts` — `StepCompletionProvider` + `buildSnippet`
  - `vscode-extension/src/providers/diagnosticProvider.ts` — `StepDiagnosticProvider` (live squiggles)
  - `vscode-extension/src/providers/hoverProvider.ts` — `StepHoverProvider` (`@intent` on hover)
  - `vscode-extension/src/providers/treeProvider.ts` — `StepCatalogTreeProvider` (sidebar tree)
  - `vscode-extension/src/providers/tagCompletionProvider.ts` — `TagCompletionProvider` (`@tag` completions)

**`docs-site/`**
- Purpose: Astro Starlight static site — searchable catalog website (Roadmap 5.1)
- Status: scaffolded; deployed to GitHub Pages on push

---

## Key File Locations

**Entry Points:**
- `cucumber.js` — Cucumber runner config: glob paths for features, steps, support; formatter config
- `src/support/world.ts` — CustomWorld class (Playwright browser wiring)
- `src/support/hooks.ts` — Before/After lifecycle hooks

**Configuration:**
- `tsconfig.json` — TypeScript config for `src/` and `scripts/`
- `vscode-extension/tsconfig.json` — Separate tsconfig for the extension
- `playwright.config.ts` — Playwright config (baseURL, browser, etc.)
- `cucumber.js` — Cucumber runner settings

**Core Logic:**
- `step-catalog.json` — Generated; the single source of truth for valid step expressions
- `scripts/extract-steps.ts` — Catalog generation engine
- `scripts/validate-steps.ts` — Pre-commit step gate (also used for CI validation)
- `vscode-extension/src/catalog/fsLoader.ts` — Catalog loader with file watcher for extension

**Testing:**
- `src/features/**/*.feature` — Gherkin test scenarios
- `reports/cucumber-report.html` — Generated HTML report (gitignored)

---

## Naming Conventions

**Files:**
- Features: `<topic>.feature` in `src/features/<domain>/` (e.g., `login.feature`, `place-order.feature`)
- Steps: `<domain>.steps.ts` in `src/steps/<domain>/` (e.g., `auth.steps.ts`, `orders.steps.ts`)
- Actions: `<domain>.actions.ts` in `src/actions/` (e.g., `auth.actions.ts`, `orders.actions.ts`)
- Pages: `<page>.page.ts` in `src/pages/` (e.g., `login.page.ts`, `cart.page.ts`)
- Scripts: `<verb>-<noun>.ts` in `scripts/` (e.g., `extract-steps.ts`, `validate-steps.ts`)

**Directories:**
- Domain subdirectories under `steps/` and `features/` use lowercase kebab-case
- `common/` under `steps/` is the conventional name for cross-domain shared steps

**Classes:**
- Action classes: `<Domain>Actions` (e.g., `AuthActions`, `OrderActions`)
- Page classes: `<Page>Page` (e.g., `LoginPage`, `CartPage`)
- World: `CustomWorld`

**Step Domains:**
- Domain is auto-derived from the subdirectory name under `src/steps/`
- Steps in `src/steps/auth/` get domain `"auth"`, `src/steps/common/` → `"common"`, etc.

---

## Where to Add New Code

**New Feature / Business Domain:**
1. Create `src/features/<domain>/<topic>.feature` — Gherkin scenarios using existing catalog steps
2. If new steps are needed (Steve-approved): create `src/steps/<domain>/<domain>.steps.ts`
3. Create `src/actions/<domain>.actions.ts` — business intent methods
4. Create `src/pages/<page>.page.ts` for each new page/component
5. Run `npm run catalog` to regenerate `step-catalog.json`

**New Step (Steve-approved):**
1. Add step definition to the appropriate `src/steps/<domain>/<domain>.steps.ts`
2. Add structured JSDoc comment with `@intent` (mandatory), `@param`, `@pre`, `@post` as applicable
3. Run `npm run catalog` to publish the new step to the catalog

**New Page Object:**
- Implementation: `src/pages/<page>.page.ts`
- Pattern: private selector fields (`data-testid`), public async methods returning typed results

**New Action:**
- Implementation: `src/actions/<domain>.actions.ts` (add method to existing class or create new file)
- Pattern: receives `Page` in constructor, instantiates Page Objects, no selectors

**New Script (build tool / gate):**
- Implementation: `scripts/<verb>-<noun>.ts`
- Register in `package.json` scripts block; uses `ts-node` for execution

**New VS Code Provider:**
- Implementation: `vscode-extension/src/providers/<name>Provider.ts`
- Register in `vscode-extension/src/extension.ts` `activate()` function

---

## Special Directories

**`reports/`**
- Purpose: Cucumber HTML report and any screenshots from failed scenarios
- Generated: Yes (`npm test` writes `reports/cucumber-report.html`)
- Committed: No (gitignored)

**`vscode-extension/out/`**
- Purpose: Compiled JavaScript output for the VS Code extension
- Generated: Yes (TypeScript compiler)
- Committed: Yes (extension requires compiled output to run without user build step)

**`.husky/`**
- Purpose: Git hooks managed by Husky
- Contains: `pre-commit` script that invokes `scripts/validate-steps.ts`
- Committed: Yes

**`.planning/`**
- Purpose: Planning documents generated by GSD mapping agents
- Contains: `codebase/` subdirectory with ARCHITECTURE.md, STRUCTURE.md, etc.
- Committed: Yes (project planning artefacts)

---

*Structure analysis: 2026-06-09*
