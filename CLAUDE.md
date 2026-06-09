# Istruzioni per l'agente (Claude Code)

Leggi sempre prima di operare, in quest'ordine:
- `PROJECT_BRIEF.md` — visione, ruoli, vincoli, stato attuale.
- `CONTRIBUTING.md` — regole architetturali (4 layer, step canonici, multi-app, step status).
- `WORKFLOW.md` — collaborazione QA manuale ↔ SDET, ciclo wanted/implemented/deprecated.
- `DOMAINS.md` — mappa apps/aree/pagine + naming convention.
- `ROADMAP.md` — backlog, ordine di lavoro, cosa NON costruire.

## Regole non negoziabili

1. **Architettura 4 layer**: `features/` → `steps/` (glue sottile) → `actions/` (intenzioni business) → `pages/` (selettori). Ogni layer parla solo a quello sotto. **Mai selettori negli step.**
2. **Multi-app pulito**: rispetta `src/<layer>/<app>/<area>/...`. Naming placeholder `app-a`, `app-b` (vedi DOMAINS.md). Step cross-app solo in `common/` se davvero universali.
3. **Calibrazione deterministica**: i nuovi `.feature` devono riusare step da `step-catalog.json`. Step nuovi solo se Steve approva esplicitamente; se la richiesta arriva da QA, usa il flusso `@wanted` (WORKFLOW.md).
4. **Status degli step**: ogni step e' `implemented` (default), `wanted` (stub con throw), o `deprecated` (con `@replacedBy`). Rispetta i tag JSDoc descritti in WORKFLOW.md.
5. **`STEP_CATALOG.md` non si scrive a mano**: si rigenera con `npm run catalog`. `step-catalog.json` e' committato (e' la SoT machine-readable).
6. **Niente dati/flussi/nomi aziendali reali** in questo repo (personale + potenzialmente pubblico).
7. **Niente credenziali nel codice o nei commit**: token in `.env` (gitignored).

## Comandi quotidiani

```bash
npm test            # esegue gli scenari
npm run test:dry    # dry-run, valida step senza eseguire
npm run catalog     # rigenera STEP_CATALOG.md + step-catalog.json
```

## Workflow consigliato per richieste comuni

- **"Aggiungi feature/scenario per X"**: prima `npm run catalog`, poi proponi
  Gherkin riusando step esistenti. Step nuovi → flagga, chiedi conferma a Steve,
  se approvati crea stub `@wanted` (WORKFLOW.md scenario B).
- **"Implementa step wanted X"**: ruolo SDET. Rimuovi `@wanted`, scrivi
  actions/pages necessari, aggiungi `@intent`/`@pre`/`@post`, apri PR.
- **"Costruisci la UI / extension VS Code"**: segui l'ordine in `ROADMAP.md`
  §5.6 (completion → diagnostics → tree view → quickfix → hover → PR opener).
- **"Aggiungi app-c / nuova area"**: aggiorna DOMAINS.md prima, poi crea le
  cartelle, poi i primi feature.
- **"Refactor architetturale"**: chiedi conferma esplicita, non rompere i 4 layer
  ne' la separazione multi-app.

## Stile

- Risposte in **italiano**, dirette e concise (preferenza utente).
- Conventional Commits per i messaggi di commit (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Sii onesto sui limiti: se qualcosa non e' fattibile, dillo e proponi l'alternativa
  vera invece di assecondare.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**bdd-automation-scaffold**

Framework di test automation BDD industrializzato per standardizzare l'authoring
di scenari Gherkin in un team QA misto (tecnici e non). Non è un singolo progetto
di test: è uno standard riutilizzabile su N applicativi web, composto da scaffold
TypeScript a 4 layer (features → steps → actions → pages), catalogo step generato
dal codice, e un'estensione VS Code come canale primario di authoring.

**Core Value:** I QA riusano step esistenti — zero rumore inventato — grazie a tre meccanismi
deterministici: autocomplete vincolato sull'extension, validazione pre-commit, gate CI.

### Constraints

- **Architettura:** 4 layer rispettati sempre — mai selettori negli step, mai logica business nelle pages
- **Naming:** app-a/app-b placeholder — nomi reali vivono nel repo aziendale, non qui
- **Catalog:** generato solo via `npm run catalog` — STEP_CATALOG.md non si scrive a mano
- **Credenziali:** token/password solo in .env (gitignored) — mai nel codice o nei commit
- **Sicurezza repo:** niente dati/flussi aziendali reali — il repo è personale/potenzialmente pubblico
- **Commit style:** Conventional Commits (feat/fix/chore/docs/test)
- **Decisioni:** doc-first — cambi strutturali aggiornano ROADMAP/CONTRIBUTING/DOMAINS prima del codice
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.5.x — all source code in `src/`, `scripts/`, `vscode-extension/src/`
- TypeScript 5.9.x — docs-site (`docs-site/` uses a separate tsconfig)
- JavaScript (CommonJS) — `cucumber.js` config file at root
- Gherkin — test scenario files in `src/features/**/*.feature`
## Runtime
- Node.js 20 (pinned in CI via `actions/setup-node@v4 node-version: 20`)
- Node.js 24.12.0 detected locally (developer machine)
- No `.nvmrc` present — Node version enforced only in CI
- npm (root project) — lockfile `package-lock.json` lockfileVersion 3
- npm (docs-site) — separate `docs-site/package-lock.json`
- Lockfile: present (root + docs-site)
## Frameworks
- `@cucumber/cucumber` ^10.8.0 — BDD test runner; owns scenario lifecycle, step definitions, hooks
- `@playwright/test` ^1.45.0 — browser automation engine used inside Page Objects and the Cucumber World; only Chromium is installed in CI
- `astro` ^5.1.0 — static site builder for the step catalog portal (`docs-site/`)
- `@astrojs/starlight` ^0.30.0 — documentation theme with sidebar + search (Pagefind)
- `@astrojs/react` ^3.6.0 — React integration in Astro
- `react` ^18.3.0 / `react-dom` ^18.3.0 — UI components in docs-site
- `@monaco-editor/react` ^4.6.0 — Monaco code editor embedded in the browser-based Feature Editor page
- `ts-node` ^10.9.2 — runs TypeScript scripts directly (catalog generation, Jira sync, watch mode)
- `husky` ^9.0.0 — Git hooks manager; runs pre-commit step validation
## Key Dependencies
- `@cucumber/cucumber` ^10.8.0 — without this, `npm test` does not run
- `@playwright/test` ^1.45.0 — provides `chromium`, `Browser`, `BrowserContext`, `Page` used in `src/support/world.ts`
- `typescript` ^5.5.0 (root) — TypeScript compiler
- `typescript` ^5.9.3 (docs-site devDep) — separate compiler for Astro project
- `ts-node` ^10.9.2 — transpiles scripts at runtime via `ts-node/register` (required by `cucumber.js`)
- `@types/node` ^20.14.0 — Node.js type definitions
- `@astrojs/check` ^0.9.9 — Astro-aware TypeScript checking
- `@types/react` ^18.3.0 / `@types/react-dom` ^18.3.0
## Configuration
- `tsconfig.json` — target ES2022, module CommonJS, strict mode, includes `src/**/*.ts` and `scripts/**/*.ts`, output to `dist/`
- `docs-site/src/content.config.ts` — Astro content collections config
- `vscode-extension/tsconfig.json` — separate compiler config for the VS Code extension
- `playwright.config.ts` — sets `baseURL` (default `http://localhost:3000`), `headless: true`, `trace: retain-on-failure`, `screenshot: only-on-failure`, `timeout: 30_000ms`. Chromium is the only installed browser in CI.
- `cucumber.js` — CommonJS config: loads `ts-node/register`, step files from `src/steps/**/*.ts`, support from `src/support/**/*.ts`, features from `src/features/**/*.feature`. Formatters: `progress-bar`, `html:reports/cucumber-report.html`, `summary`.
- `docs-site/astro.config.mjs` — integrates Starlight + React, configures sidebar with Home / Feature Editor / New Step / Step Catalog sections, enables Pagefind search
- `.husky/pre-commit` — runs `npx ts-node scripts/validate-steps.ts` before every commit
- No bundler for the root automation project (ts-node transpiles at runtime)
- Astro handles bundling for docs-site (`npm run build` inside `docs-site/`)
## Platform Requirements
- Node.js 20+ (CI standard)
- npm ci for reproducible installs
- Chromium browser (installed via `npx playwright install --with-deps chromium`)
- `.env` file required for Jira sync (see INTEGRATIONS.md)
- Root project: no server deployment — runs as local/CI test suite
- Docs site: deployed as static files to GitHub Pages via `docs-site/dist/`
- VS Code extension: packaged as `.vsix` from `vscode-extension/` (no CI publish step detected)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Step definitions: `<domain>.steps.ts` — e.g. `auth.steps.ts`, `orders.steps.ts`
- Action classes: `<domain>.actions.ts` — e.g. `auth.actions.ts`, `orders.actions.ts`
- Page Objects: `<component>.page.ts` — e.g. `login.page.ts`, `cart.page.ts`
- Script utilities: `<verb>-<noun>.ts` — e.g. `extract-steps.ts`, `render-markdown.ts`, `validate-steps.ts`
- Feature files: `<domain-action>.feature` — e.g. `login.feature`, `place-order.feature`
- PascalCase throughout: `AuthActions`, `OrderActions`, `LoginPage`, `CartPage`, `CustomWorld`
- Step action classes: named `<Domain>Actions`
- Page Object classes: named `<Component>Page`
- World class: `CustomWorld` (extends Cucumber's `World`)
- camelCase async methods: `ensureRegisteredUser()`, `loginWithValidCredentials()`, `isOnDashboard()`
- Boolean query methods prefixed with `is` or `has`: `isOrderConfirmed()`, `isDashboardVisible()`
- Void side-effect methods use verb phrases: `addToCart()`, `placeOrder()`, `addProduct()`
- PascalCase: `CartItem`, `StepDoc`, `CatalogStep`, `StepCatalog`, `StepLocation`
- Exported when consumed by multiple files: `CartItem` in `orders.actions.ts`
- camelCase: `featureFiles`, `catalogPath`, `domainMatch`
- Parameters are descriptive single words where possible: `role`, `product`, `status`
## TypeScript Usage
- Target: `ES2022`
- Module: `CommonJS` (required for ts-node + Cucumber.js CommonJS loader)
- `strict: true` — all strict checks enforced
- `esModuleInterop: true`
- `skipLibCheck: true`
- `resolveJsonModule: true` (used to import `step-catalog.json`)
- `types: ["node"]`
- Scope: `src/**/*.ts` and `scripts/**/*.ts`
- All method return types explicitly annotated: `Promise<void>`, `Promise<boolean>`, `Promise<string>`
- Constructor parameters typed with `private readonly` where applicable
- `this: CustomWorld` typed explicitly in Cucumber step callbacks (required pattern)
- Non-null assertion (`!`) used minimally and only when provably safe
- Page Object selectors declared as `private readonly` string fields
- Dynamic selectors declared as `private readonly` arrow functions returning strings:
- Optional chaining (`?.`) used for safe teardown in hooks: `this.page?.close()`
- Nullish coalescing (`??`) used for fallback values: `?? ""`
- `void` used to explicitly discard unused Promise results
## Code Style
- No project-level Prettier or ESLint config detected — formatting is convention-based
- Indentation: 2 spaces (observed in all TypeScript files)
- Semicolons: present
- Trailing commas: present in multiline structures
- Single quotes for strings in TypeScript; double quotes in JSON
- File-level comment on every `.ts` file: layer identity and responsibility statement
- Inline `// Selectors live here, isolated from everything above.` in Page Objects
- `// TODO:` used for intentional placeholders (e.g. seed user via API/fixture)
## Import Organization
- Relative paths only (`../../support/world`) — no path aliases configured
- No barrel (`index.ts`) files; each module imported directly by path
- TypeScript source uses ES module `import`/`export` syntax
- `cucumber.js` config uses CommonJS `module.exports` (required by Cucumber.js loader)
## Architectural Layer Rules (Non-Negotiable)
| Layer | Location | Allowed to import | NEVER imports |
|-------|----------|-------------------|---------------|
| Feature | `src/features/**/*.feature` | — | — |
| Steps (glue) | `src/steps/**/*.ts` | `actions/`, `support/` | `pages/`, selectors |
| Actions | `src/actions/**/*.ts` | `pages/`, `api/` | `steps/`, selectors |
| Pages/API | `src/pages/**/*.ts` | Playwright `Page` | `steps/`, `actions/` |
## Gherkin Conventions
- Intent over mechanics: `When I place the order`, never `When I click "#checkout"`
- Parameterize instead of duplicating: `{string}` parameters over near-identical steps
- Declarative setup: `Given I am logged in as a "standard" user` (one line, reusable)
- One term per concept: do not drift between synonyms across features
- `data-testid` attributes used exclusively for test selectors in Page Objects
- Pattern: `[data-testid="<element-name>"]`
- Domain tags on Feature: `@auth`, `@orders`
- Jira link tags on Scenario: `@ticket:BOOT-123`
- Suite tags: `@regression`, `@smoke`, `@sanity`, `@wip`
- Before writing a new step, search `STEP_CATALOG.md` for an existing step
- Reuse exact wording — a near-duplicate is worse than no step
- New steps require explicit gatekeeper (Steve) approval
- Step catalog is never edited by hand; always regenerated via `npm run catalog`
## Commit Conventions
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance (tooling, deps, config)
- `docs:` — documentation only
- `test:` — test additions or changes
- Husky hook runs `scripts/validate-steps.ts` on every commit
- Validates all staged `.feature` files against `step-catalog.json`
- Commit is blocked if any step has no catalog match and no close fuzzy match (>80% similarity)
- Override available via `SKIP_STEP_VALIDATION=1` (Steve's escape hatch)
## Error Handling
- Async methods return typed Promises; errors propagate naturally to Cucumber's test runner
- Explicit `assert.equal(value, expected, message)` using Node's `assert` with strict mode
- `try/catch` around file reads and exec calls with graceful degradation (warn + continue)
- Exit codes documented in file-level JSDoc: `0` = pass/warning, `1` = hard error
- Failure screenshot on `Status.FAILED` before teardown:
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Gherkin vocabulary decoupled from UI mechanics — selectors exist only in Page Objects
- Step catalog is generated from code (never written by hand), becoming the single source of truth
- Test isolation is per-scenario: `CustomWorld` is constructed fresh for each scenario
- Deterministic step reuse enforced by three mechanisms: autocomplete in VS Code extension, pre-commit validation, and CI gate
## Layers
- Purpose: Express business behaviour in Gherkin (Given/When/Then). Readable by non-technical stakeholders.
- Location: `src/features/`
- Contains: `.feature` files, organised in domain subdirectories
- Depends on: nothing (plain text)
- Used by: Cucumber.js runner, VS Code extension (`.feature` files are linted against catalog)
- Key design: steps are canonical phrases from `step-catalog.json` — no ad-hoc phrasing allowed
- Purpose: Thin glue that maps Gherkin phrases to action-layer method calls. Zero business logic, zero selectors.
- Location: `src/steps/`
- Contains: Cucumber step definitions (TypeScript), one file per domain subdirectory
- Depends on: `actions/` layer only
- Used by: Cucumber.js runner (auto-loaded via `cucumber.js` require glob)
- Key design: each step definition carries a structured JSDoc comment (`@intent`, `@param`, `@pre`, `@post`) that the catalog generator reads. Steps without `@intent` are flagged as undocumented (warning, not build failure).
- Purpose: Reusable business intentions. No Gherkin coupling. No selectors.
- Location: `src/actions/`
- Contains: Action classes that receive a Playwright `Page` object and expose domain methods
- Depends on: `pages/` layer only
- Used by: step definitions in `steps/`
- Key design: if the UI changes, actions stay unchanged; only the page object below is touched
- Purpose: The only layer where selectors and UI mechanics live. Acts as a Playwright adapter.
- Location: `src/pages/`
- Contains: Page Object classes using `data-testid` selectors, wrapping Playwright `Page` API
- Depends on: Playwright `Page` (external framework)
- Used by: action classes in `actions/`
- Key design: selector strings are private fields; `data-testid` convention used throughout
## Data Flow
- Per-scenario state lives in `CustomWorld` (`src/support/world.ts`)
- `CustomWorld` extends Cucumber's `World` class, giving each scenario a fresh `Browser`, `BrowserContext`, and `Page`
- No global mutable state between scenarios
- `CustomWorld` is accessed via `this` context in all step handlers (typed as `CustomWorld`)
## Key Abstractions
- Purpose: Per-scenario execution context — Playwright browser lifecycle tied to Cucumber scenario lifecycle
- Location: `src/support/world.ts`
- Pattern: Extends `World`, registered via `setWorldConstructor`. `init()` and `destroy()` called by hooks, not test code.
- Purpose: Translate business intent into sequences of page interactions — no Gherkin coupling, no selectors
- Examples: `src/actions/auth.actions.ts`, `src/actions/orders.actions.ts`
- Pattern: Constructor receives `Page`; all methods are `async`, return `void` or a typed result
- Purpose: Encapsulate all selector knowledge and Playwright mechanics for a single page/component
- Examples: `src/pages/login.page.ts`, `src/pages/cart.page.ts`
- Pattern: Private selector fields (strings or functions returning strings), public async methods only
- Purpose: Abstraction for the source of `step-catalog.json` — today filesystem, extensible to HTTP/npm/UNC
- Location: `vscode-extension/src/catalog/types.ts`
- Pattern: `CatalogLoader` interface with `load()`, `reload()`, `onDidChange()`. `FsLoader` (`vscode-extension/src/catalog/fsLoader.ts`) is the current implementation. `RemoteLoader` is planned for Roadmap 5.6 enterprise rollout.
- `step-catalog.json` is the single source of truth for all valid step expressions
- Schema: `{ generatedAt, totalSteps, documentedSteps, undocumentedSteps, steps: CatalogStep[] }`
- `CatalogStep`: `{ expression, parameters, domain, page?, sourceRef, doc: StepDoc, documented }`
- `StepDoc`: `{ intent?, params, pre?, post? }`
## Entry Points
- Location: `cucumber.js` (root config) + `src/support/world.ts` + `src/support/hooks.ts`
- Triggers: `npm test` or `npm run test:dry`
- Responsibilities: configure paths, load step definitions and support files, invoke Playwright
- Location: `scripts/extract-steps.ts` + `scripts/render-markdown.ts`
- Triggers: `npm run catalog`
- Responsibilities: dry-run Cucumber to get step metadata, enrich with JSDoc, write `step-catalog.json` and `STEP_CATALOG.md`
- Location: `.husky/pre-commit` → `scripts/validate-steps.ts`
- Triggers: `git commit`
- Responsibilities: parse staged `.feature` files, match each step against catalog regexes, block commit on unrecognised steps (fuzzy-warn on near-matches >80% similarity), bypass via `SKIP_STEP_VALIDATION=1`
- Location: `vscode-extension/src/extension.ts`
- Triggers: VS Code activation on `.feature` files
- Responsibilities: load catalog, register CompletionItemProvider, DiagnosticProvider, HoverProvider, TreeDataProvider, TagCompletionProvider, and two commands (`stepCatalog.reload`, `stepCatalog.find`)
## Error Handling
- `FsLoader.reload()`: file absent → returns empty catalog (not null, not error); JSON corrupt → shows VS Code warning message, returns empty catalog
- `validate-steps.ts`: catalog absent → auto-regenerates via `npm run catalog`; regeneration fails → graceful skip (warns, does not block commit)
- `scripts/extract-steps.ts`: unreadable source files → empty doc, no crash; undocumented steps → warning to stdout, exit 0
- Playwright assertions in steps: use Node.js `strict assert` (`assert.equal`) — throws on failure, Cucumber catches and marks scenario FAILED
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
