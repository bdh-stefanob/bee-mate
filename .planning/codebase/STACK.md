# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript 5.5.x — all source code in `src/`, `scripts/`, `vscode-extension/src/`
- TypeScript 5.9.x — docs-site (`docs-site/` uses a separate tsconfig)

**Secondary:**
- JavaScript (CommonJS) — `cucumber.js` config file at root
- Gherkin — test scenario files in `src/features/**/*.feature`

## Runtime

**Environment:**
- Node.js 20 (pinned in CI via `actions/setup-node@v4 node-version: 20`)
- Node.js 24.12.0 detected locally (developer machine)
- No `.nvmrc` present — Node version enforced only in CI

**Package Manager:**
- npm (root project) — lockfile `package-lock.json` lockfileVersion 3
- npm (docs-site) — separate `docs-site/package-lock.json`
- Lockfile: present (root + docs-site)

## Frameworks

**Core (test automation):**
- `@cucumber/cucumber` ^10.8.0 — BDD test runner; owns scenario lifecycle, step definitions, hooks
- `@playwright/test` ^1.45.0 — browser automation engine used inside Page Objects and the Cucumber World; only Chromium is installed in CI

**Docs site:**
- `astro` ^5.1.0 — static site builder for the step catalog portal (`docs-site/`)
- `@astrojs/starlight` ^0.30.0 — documentation theme with sidebar + search (Pagefind)
- `@astrojs/react` ^3.6.0 — React integration in Astro
- `react` ^18.3.0 / `react-dom` ^18.3.0 — UI components in docs-site

**Docs-site editor UI:**
- `@monaco-editor/react` ^4.6.0 — Monaco code editor embedded in the browser-based Feature Editor page

**Build/Dev:**
- `ts-node` ^10.9.2 — runs TypeScript scripts directly (catalog generation, Jira sync, watch mode)
- `husky` ^9.0.0 — Git hooks manager; runs pre-commit step validation

## Key Dependencies

**Critical (test execution):**
- `@cucumber/cucumber` ^10.8.0 — without this, `npm test` does not run
- `@playwright/test` ^1.45.0 — provides `chromium`, `Browser`, `BrowserContext`, `Page` used in `src/support/world.ts`

**Infrastructure (tooling):**
- `typescript` ^5.5.0 (root) — TypeScript compiler
- `typescript` ^5.9.3 (docs-site devDep) — separate compiler for Astro project
- `ts-node` ^10.9.2 — transpiles scripts at runtime via `ts-node/register` (required by `cucumber.js`)
- `@types/node` ^20.14.0 — Node.js type definitions

**Docs-site type checking:**
- `@astrojs/check` ^0.9.9 — Astro-aware TypeScript checking
- `@types/react` ^18.3.0 / `@types/react-dom` ^18.3.0

## Configuration

**TypeScript (root):**
- `tsconfig.json` — target ES2022, module CommonJS, strict mode, includes `src/**/*.ts` and `scripts/**/*.ts`, output to `dist/`

**TypeScript (docs-site):**
- `docs-site/src/content.config.ts` — Astro content collections config

**TypeScript (vscode-extension):**
- `vscode-extension/tsconfig.json` — separate compiler config for the VS Code extension

**Playwright:**
- `playwright.config.ts` — sets `baseURL` (default `http://localhost:3000`), `headless: true`, `trace: retain-on-failure`, `screenshot: only-on-failure`, `timeout: 30_000ms`. Chromium is the only installed browser in CI.

**Cucumber:**
- `cucumber.js` — CommonJS config: loads `ts-node/register`, step files from `src/steps/**/*.ts`, support from `src/support/**/*.ts`, features from `src/features/**/*.feature`. Formatters: `progress-bar`, `html:reports/cucumber-report.html`, `summary`.

**Astro:**
- `docs-site/astro.config.mjs` — integrates Starlight + React, configures sidebar with Home / Feature Editor / New Step / Step Catalog sections, enables Pagefind search

**Git hooks:**
- `.husky/pre-commit` — runs `npx ts-node scripts/validate-steps.ts` before every commit

**Build:**
- No bundler for the root automation project (ts-node transpiles at runtime)
- Astro handles bundling for docs-site (`npm run build` inside `docs-site/`)

## Platform Requirements

**Development:**
- Node.js 20+ (CI standard)
- npm ci for reproducible installs
- Chromium browser (installed via `npx playwright install --with-deps chromium`)
- `.env` file required for Jira sync (see INTEGRATIONS.md)

**Production:**
- Root project: no server deployment — runs as local/CI test suite
- Docs site: deployed as static files to GitHub Pages via `docs-site/dist/`
- VS Code extension: packaged as `.vsix` from `vscode-extension/` (no CI publish step detected)

---

*Stack analysis: 2026-06-09*
