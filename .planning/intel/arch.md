---
updated_at: "2026-06-11T00:00:00.000Z"
---

## Architecture Overview

Dual-project monorepo. The root project is a Cucumber.js + Playwright BDD automation scaffold using a strict 4-layer architecture. The `web-ui/` sub-project is a Next.js 15 authoring portal that reads the scaffold's generated artifacts (`step-catalog.json`, `step-enums.json`, `src/features/`) and provides a browser/editor/import UI. Electron packaging wraps the web-ui as a local desktop app — no server required for the QA team.

## Key Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| Feature files | `src/features/**/*.feature` | Gherkin scenarios organized as `{app}/{flow}/name.feature` |
| Step glue layer | `src/steps/**/*.steps.ts` | Cucumber step definitions — thin, call Actions only, no selectors |
| Actions layer | `src/actions/*.actions.ts` | Business-level operations — orchestrate Page Objects |
| Pages layer | `src/pages/*.page.ts` | Selectors and raw UI interactions — single source of selector truth |
| World | `src/support/world.ts` | Cucumber World with Playwright `page` instance |
| Catalog generator | `scripts/extract-steps.ts` | Parses cucumber-messages.ndjson, writes `step-catalog.json` |
| Markdown renderer | `scripts/render-markdown.ts` | Reads `step-catalog.json`, writes `STEP_CATALOG.md` |
| Scenario importer | `scripts/import-scenarios.ts` | Converts plain-text QA format to .feature files |
| step-enums.json | `step-enums.json` | Hand-curated paramEnum values per step expression + step dependency graph |
| API: catalog | `web-ui/src/app/api/catalog/route.ts` | GET — merges step-catalog.json + step-enums.json |
| API: features | `web-ui/src/app/api/features/route.ts` | GET list + POST write .feature files |
| API: enums | `web-ui/src/app/api/enums/route.ts` | PUT upsert paramEnums in step-enums.json |
| API: import | `web-ui/src/app/api/import/route.ts` | POST — runs import-scenarios.ts via execSync |
| API: github/push | `web-ui/src/app/api/github/push/route.ts` | POST — writes .feature to GitHub via REST API |
| API: jira/sync | `web-ui/src/app/api/jira/sync/route.ts` | POST — posts @ticket scenario text as Jira comments |
| StepCatalog page | `web-ui/src/app/page.tsx` | Catalog home — table with search/filter/click-to-detail |
| StepDetailModal | `web-ui/src/components/StepDetailModal.tsx` | Modal for step detail view + inline paramEnum editing |
| Editor page | `web-ui/src/app/editor/page.tsx` | Gherkin editor — CodeMirror 6, localStorage draft, Save (Ctrl+S), GitHub commit |
| Features page | `web-ui/src/app/features/page.tsx` | Feature tree: App → Flow → Features, collapsible nodes, Edit button |
| StepBrowser | `web-ui/src/components/StepBrowser.tsx` | Step panel in editor — keyword pills (G/W/T), area pills, search, click-to-insert |
| ScenarioOutline | `web-ui/src/components/ScenarioOutline.tsx` | Numbered scenario list in editor right column, collapse + scroll-to-line |
| ImportDropzone | `web-ui/src/components/ImportDropzone.tsx` | Drag-drop import — auto-detects extended QA format vs standard |
| import-extended | `web-ui/src/lib/import-extended.ts` | Parser for extended QA format: `"label" [val1,val2]` inline params, `#PageName` comments, @app @flusso tags |
| repo.ts | `web-ui/src/lib/repo.ts` | REPO_ROOT resolution (BDD_WORKSPACE env or cwd+..), safeFeaturePath guard |
| features.ts | `web-ui/src/lib/features.ts` | walkFeatures + parseFeatureSummary: extracts app/flow from directory structure |
| Electron main | `web-ui/electron/main.js` | Electron main process — sets BDD_WORKSPACE to user-selected directory |

## Data Flows

### Catalog generation (offline, run by dev)
`npm run catalog` (root) →
`cucumber-js --dry-run --format message:cucumber-messages.ndjson` →
`scripts/extract-steps.ts cucumber-messages.ndjson` → writes `step-catalog.json` →
`scripts/render-markdown.ts` → writes `STEP_CATALOG.md`

### Catalog read (web-ui at request time)
`GET /api/catalog` →
reads `step-catalog.json` (from REPO_ROOT) + `step-enums.json` →
merges paramEnums and requires arrays per step expression →
returns enriched `CatalogStep[]`

### Feature file save (web-ui editor)
Editor content + @tag1 @tag2 → derives filePath as `{app}/{flow}/{slug}.feature` →
`POST /api/features { content, filePath }` →
`safeFeaturePath()` path traversal guard →
`fs.writeFileSync` to `src/features/{app}/{flow}/{slug}.feature`

### Extended format import (client-side, no round trip)
Drop `.txt` on ImportDropzone →
`isExtendedFormat()` detects `"label" [val1,val2]` or `#PageName` markers →
`parseExtendedFormat()` converts to Gherkin + extracts `ExtractedStepEnum[]` →
editor content updated + UI shows extracted enum summary
(enum values NOT automatically saved to step-enums.json — see backlog 999.11)

### Standard format import (server round trip)
Drop `.txt` → `POST /api/import (FormData)` →
writes to `os.tmpdir()` (T-04-06: no user input in path) →
`execSync` `import-scenarios.ts --input <tmpPath>` (30s timeout) →
parses stdout for feature path + counts →
`safeFeaturePath()` validates returned path →
returns `{ featureContent, featurePath, newCount, skipCount }`

### Enum editing (web-ui StepDetailModal)
StepCatalog click → StepDetailModal open →
user edits/adds enum values inline →
`PUT /api/enums { expression, paramEnums }` →
upserts entry in `step-enums.json`

### Feature tree (Features page)
`GET /api/features` → `listFeatures()` → `walkFeatures()` + `parseFeatureSummary()` →
returns `FeatureSummary[]` with `app` = parts[0], `flow` = parts[1] (for 3+ path segments) →
`buildTree()` groups into `TreeNode[]` →
collapsible tree: App nodes → Flow nodes → Feature rows →
"Edit" button: `GET /api/download?file=...` → `localStorage.setItem('gsd-editor-draft', content)` → navigate to `/editor`

## Conventions

### 4-Layer rule
Steps call Actions; Actions call Pages. Selectors appear only in `src/pages/*.page.ts`. This is enforced by code review (CONTRIBUTING.md), not by tooling.

### Step status
Steps are `implemented` by default. Adding `@wanted` to the JSDoc above a step definition marks it as `status: 'wanted'` in the catalog. `@deprecated` marks as deprecated.

### Step documentation
JSDoc tags `@intent`, `@param`, `@pre`, `@post`, `@page` above each step definition are parsed by `extract-steps.ts` into the `doc` field of `CatalogStep`. `documented: true` if `@intent` is present.

### Catalog is never hand-edited
`step-catalog.json` is generated by `npm run catalog`. `STEP_CATALOG.md` is generated from it. `step-enums.json` is the only catalog-adjacent file written by humans (or by the web-ui PUT /api/enums endpoint).

### Feature file path convention
New feature files are saved under `src/features/{app}/{flow}/{slug}.feature` where app and flow are derived from the first two `@tag` values on the feature. Features without two tags land flat under `src/features/`.

### REPO_ROOT resolution
In development: `cwd() + '..'` (from web-ui/ up to repo root).
In Electron production: `process.env.BDD_WORKSPACE` (set by electron/main.js to user-selected directory).

### Security guards
- T-04-01: `safeFeaturePath()` — path traversal block for all feature file reads/writes
- T-04-06: `import` route — tmpPath uses `Date.now()`, never user input
- T-05-03-01..04: GitHub push route — filePath whitelist regex, token in header only, token scrubbed from errors
- T-05-jira-01: Jira sync route — SSRF guard blocks RFC-1918 + loopback addresses

## Backlog (current)

| ID | Title | Status |
|----|-------|--------|
| 999.2 | Questionnaire canonical BDD refactor | BACKLOG — replace 28-step happy-path with intent-level declarative steps + QuestionnaireProfiles fixtures |
| 999.3 | Electron standalone app + CI auto-build | BACKLOG — electron-builder packages, GitHub Actions releases, electron-updater for auto-updates |
| 999.10 | #PageName filter in StepBrowser search bar | BACKLOG — filter steps by page association when user types `#login` in search |
| 999.11 | Auto-save extracted enums to step-enums.json on import | BACKLOG — PUT /api/enums automatically after parseExtendedFormat() instead of showing only in UI |
