# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**Jira (Atlassian Cloud):**
- Purpose: Sync Gherkin scenarios as comments on Jira issues tagged with `@ticket:KEY`
- Implementation: `scripts/jira-sync.ts` — calls Jira REST API v3 (`/rest/api/3/issue/{KEY}/comment`)
- Auth: HTTP Basic via base64-encoded `JIRA_EMAIL:JIRA_TOKEN`
- Payload format: Atlassian Document Format (ADF) `codeBlock` with Gherkin text
- Transport: Node.js native `fetch` (no SDK dependency)
- Auth env vars: `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`
- Dry-run available: `npm run jira:sync:dry`

## Data Storage

**Databases:**
- None — no database connection detected

**File Storage:**
- Local filesystem only
  - `step-catalog.json` — generated artifact at repo root; consumed by docs-site and VS Code extension
  - `STEP_CATALOG.md` — markdown version auto-committed by CI bot on main
  - `cucumber-messages.ndjson` — intermediate file produced by `npm run catalog` dry-run, consumed by `scripts/extract-steps.ts`
  - `reports/cucumber-report.html` — HTML test report generated after each test run

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None for the test automation itself (no login flows in the scaffold)
- Jira auth: Basic authentication via Personal Access Token (see Jira section above)
- VS Code extension: no auth; reads `step-catalog.json` from the local workspace

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Test Failure Evidence:**
- On scenario failure: Playwright captures a screenshot (`image/png`) and attaches it to the Cucumber report — implemented in `src/support/hooks.ts`
- On scenario failure: Playwright trace saved (`trace: retain-on-failure`) per `playwright.config.ts`
- HTML report uploaded as GitHub Actions artifact `cucumber-report` on every CI run (including failures)

**Logs:**
- `console.log` / `console.error` only; no structured logging framework

## CI/CD & Deployment

**Hosting:**
- Docs site: GitHub Pages (static, auto-deployed from `docs-site/dist/`)
- Test automation: runs in GitHub Actions only — no server deployment

**CI Pipeline: `.github/workflows/ci.yml`**
- Triggers: push to `main`, all pull requests
- Jobs:
  - `test`: checkout → Node 20 → `npm ci` → install Chromium → `npm test` → upload HTML report artifact
  - `catalog`: (main branch only) checkout → Node 20 → `npm ci` → `npm run catalog` → git commit updated `STEP_CATALOG.md` with `[skip ci]` tag

**Docs Deploy Pipeline: `.github/workflows/deploy-docs.yml`**
- Triggers: push to `main` when `docs-site/**`, `src/steps/**`, or `scripts/**` change; manual `workflow_dispatch`
- Jobs:
  - `build`: install root deps → regenerate `step-catalog.json` → install docs deps → `astro build` → upload Pages artifact
    - Env vars injected: `SITE_URL` = `https://{owner}.github.io`, `SITE_BASE` = `/{repo-name}`
  - `deploy`: deploy Pages artifact to GitHub Pages environment
- Permissions required: `pages: write`, `id-token: write`
- Concurrency group: `pages` (cancel-in-progress: false)

**Git Hooks:**
- `pre-commit`: runs `npx ts-node scripts/validate-steps.ts` — blocks commit if step validation fails
- Managed by Husky ^9.0.0 (`prepare` script in `package.json`)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- Jira REST API v3 POST to `{JIRA_URL}/rest/api/3/issue/{KEY}/comment` (triggered manually via `npm run jira:sync`)

## VS Code Extension

**Extension ID:** `stepCatalog` (workspace configuration key)
- Reads `step-catalog.json` from workspace root (path configurable via `stepCatalog.catalogPath` setting)
- Provides: Gherkin completion, hover docs, step diagnostics, sidebar tree view, tag completion
- No external API calls — purely local file reads via `vscode-extension/src/catalog/fsLoader.ts`
- Language: registered for `{ language: "gherkin", scheme: "file" }`

## Environment Configuration

**Required env vars (for Jira sync only):**
- `JIRA_URL` — base URL of Atlassian instance, e.g. `https://company.atlassian.net`
- `JIRA_EMAIL` — Atlassian account email
- `JIRA_TOKEN` — Personal Access Token from `id.atlassian.com/manage-profile/security/api-tokens`

**Optional env vars:**
- `BASE_URL` — overrides Playwright `baseURL` (default: `http://localhost:3000`), read in `playwright.config.ts`
- `SITE_URL` — injected by CI for Astro docs build (default: `https://example.github.io`)
- `SITE_BASE` — injected by CI for Astro docs build (default: `/bdd-automation-scaffold`)

**Secrets location:**
- `.env` file at repo root (gitignored) — loaded manually by `scripts/jira-sync.ts` via `loadEnv()` helper (no dotenv package dependency)
- Template: `.env.example` committed to repo

---

*Integration audit: 2026-06-09*
