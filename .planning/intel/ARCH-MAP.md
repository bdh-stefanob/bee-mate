# Architecture Map

**Analysis Date:** 2026-06-10

---

## Component Overview (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BDD Automation Scaffold                              │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                   TEST SCAFFOLD  (src/)                              │  │
│  │                                                                      │  │
│  │  src/features/**/*.feature                                           │  │
│  │      ↓  (Cucumber parses, matches step text to regex)                │  │
│  │  src/steps/**/*.steps.ts       [LAYER 1 — thin glue]                │  │
│  │      ↓  (calls business methods, no selectors)                       │  │
│  │  src/actions/*.actions.ts      [LAYER 2 — business intentions]       │  │
│  │      ↓  (instantiates Page Objects, calls UI methods)                │  │
│  │  src/pages/*.page.ts           [LAYER 3 — UI mechanics + selectors]  │  │
│  │      ↓  (Playwright Page API)                                        │  │
│  │  Browser (Playwright Chromium/Firefox/WebKit)                        │  │
│  │                                                                      │  │
│  │  src/support/world.ts          [CustomWorld — shared test context]   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│            ▲                              ▲                                 │
│            │  npm run catalog             │  step-catalog.json              │
│            │  (cucumber dry-run           │  (filesystem read)              │
│            │   + extract-steps.ts)        │                                 │
│            │                              │                                 │
│  ┌─────────┴────────────────┐   ┌────────┴────────────────────────────┐   │
│  │   CATALOG PIPELINE       │   │   WEB-UI  (web-ui/)                 │   │
│  │   (scripts/)             │   │                                     │   │
│  │                          │   │  Next.js 15  App Router             │   │
│  │  extract-steps.ts        │   │  /            → StepCatalog page    │   │
│  │    reads: cucumber msgs  │   │  /editor      → GherkinEditor page  │   │
│  │    writes: step-catalog  │   │  /features    → FeatureFiles page   │   │
│  │            .json         │   │                                     │   │
│  │                          │   │  API Routes (Next.js Route Handlers)│   │
│  │  render-markdown.ts      │   │  GET /api/catalog   → reads JSON    │   │
│  │    writes: STEP_CATALOG  │   │  GET /api/features  → reads .feature│   │
│  │            .md           │   │  POST /api/import   → runs script   │   │
│  │                          │   │  GET /api/download  → file download │   │
│  │  validate-steps.ts       │   │                                     │   │
│  │  import-scenarios.ts     │   │  GherkinEditor                      │   │
│  │  watch-catalog.ts        │   │    CodeMirror 6 (syntax + lint +    │   │
│  │  jira-sync.ts            │   │    autocomplete from catalog)       │   │
│  └──────────────────────────┘   └─────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │             step-catalog.json  ← SINGLE SOURCE OF TRUTH             │  │
│  │             step-enums.json    ← enum values (hand-managed)         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │             VS CODE EXTENSION  (vscode-extension/)                  │  │
│  │             CompletionItemProvider + DiagnosticProvider             │  │
│  │             reads step-catalog.json via FsLoader                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The 4-Layer Pattern

Each layer communicates only with the layer directly below it. Selectors never
appear above the page layer.

### Layer 1 — Features (`src/features/`)
- Format: Gherkin `.feature` files
- Purpose: expresses business behaviour in natural language
- Convention: must reuse step phrases from `step-catalog.json`; new phrases require
  gatekeeper approval
- Example: `src/features/auth/login.feature`, `src/features/orders/place-order.feature`

### Layer 2 — Steps (`src/steps/`)
- Format: TypeScript, `*.steps.ts`
- Purpose: thin glue — maps Gherkin phrase text to exactly one action call
- Convention: each step carries a JSDoc `@intent` comment (feeds catalog generator)
- Structure: `src/steps/<app>/<area>/<name>.steps.ts`
- Example: `src/steps/auth/auth.steps.ts`, `src/steps/orders/orders.steps.ts`
- Registered on `CustomWorld` via `this: CustomWorld`

### Layer 3 — Actions (`src/actions/`)
- Format: TypeScript classes, `*.actions.ts`
- Purpose: business intentions — reusable, no selectors; instantiates Page Objects
- Example: `src/actions/auth.actions.ts`, `src/actions/orders.actions.ts`
- Pattern: `new AuthActions(this.page).methodName()`

### Layer 4 — Pages (`src/pages/`)
- Format: TypeScript classes, `*.page.ts`
- Purpose: the only layer that knows CSS/test-id selectors and Playwright API calls
- Selectors declared as private readonly class properties using `[data-testid]` strings
- Example: `src/pages/login.page.ts`, `src/pages/cart.page.ts`
- Pattern: `async methodName(): Promise<void> { await this.page.fill(...) }`

### Support (`src/support/`)
- `world.ts`: Cucumber `CustomWorld` — holds the `Page` instance, passed down through step `this`

---

## step-catalog.json as Single Source of Truth

`step-catalog.json` is generated, never hand-edited. It is the authoritative
registry connecting all three system components.

**Generation flow:**
```
npm run catalog
  1. cucumber-js --dry-run --format message:cucumber-messages.ndjson
     → Cucumber introspects all loaded step definitions, writes NDJSON
  2. scripts/extract-steps.ts cucumber-messages.ndjson
     → Parses NDJSON, reads JSDoc comments from source files,
       derives app/area/domain from file path structure,
       writes step-catalog.json
  3. scripts/render-markdown.ts
     → Reads step-catalog.json, writes STEP_CATALOG.md
```

**Schema of each step entry in `step-catalog.json`:**
```json
{
  "expression": "I am logged in as a {string} user",
  "parameters": ["{string}"],
  "app": "common",
  "area": "common",
  "domain": "common",
  "status": "implemented",       // "implemented" | "wanted" | "deprecated"
  "page": "LoginPage",
  "requester": "...",
  "assignee": "...",
  "sourceRef": "src/steps/common/common.steps.ts:16",
  "doc": { "intent": "...", "params": {}, "pre": "...", "post": "..." },
  "documented": true
}
```

**`step-enums.json`** is hand-managed alongside the catalog. It provides:
- `paramEnums`: named enum values for `{string}` parameters (used by web-ui autocomplete)
- `dependencies`: prerequisite step expressions (e.g. checkout requires basket)

---

## Data Flow: Web-UI ↔ Test Scaffold

The web-ui runs as a local Next.js dev server (`npm run dev` inside `web-ui/`).
It accesses the repo filesystem directly via Node.js `fs` — there is no database.

```
Browser (QA analyst)
    │
    │  fetch('/api/catalog')
    ▼
web-ui/src/app/api/catalog/route.ts
    │  reads: REPO_ROOT/step-catalog.json   (generated by npm run catalog)
    │  reads: REPO_ROOT/step-enums.json     (hand-managed)
    │  merges paramEnums + dependencies into each step object
    ▼
JSON response → StepCatalog component (table + filter + search)
             → GherkinEditor component (stepExpressions for autocomplete)
             → StepBrowser component (sidebar, click-to-insert)

    │
    │  fetch('/api/features')
    ▼
web-ui/src/app/api/features/route.ts
    │  walks: REPO_ROOT/src/features/**/*.feature
    │  parses: Feature name, area (from path), scenario count
    ▼
JSON response → FeaturesPage (card list + FeaturePreview)

    │
    │  POST /api/import  (FormData with .txt file)
    ▼
web-ui/src/app/api/import/route.ts
    │  writes: os.tmpdir()/import-{Date.now()}.txt
    │  execSync: npx ts-node scripts/import-scenarios.ts --input <tmpPath>
    │    → writes: src/features/<area>/<slug>.feature
    │    → writes: src/steps/<app>/imported/<area>.steps.ts (wanted skeletons)
    │    → runs: npm run catalog (regenerates step-catalog.json)
    │  reads: generated .feature content
    │  returns: { featureContent, featurePath, newCount, skipCount }
    ▼
ImportDropzone component → sets editor content to imported feature
```

**Path anchors** (`web-ui/src/lib/repo.ts`):
- `REPO_ROOT = path.resolve(process.cwd(), '..')` — one level above `web-ui/`
- `FEATURES_DIR = REPO_ROOT/src/features`
- `safeFeaturePath()` guards against path traversal; validates `.feature` extension

---

## API Surface (web-ui Route Handlers)

| Method | Path | Input | Output |
|--------|------|-------|--------|
| GET | `/api/catalog` | — | `{ totalSteps, steps: CatalogStep[] }` — catalog enriched with enums/deps |
| GET | `/api/features` | — | `FeatureSummary[]` — list of feature files |
| POST | `/api/import` | `FormData { file: File }` | `{ ok, featureContent, featurePath, newCount, skipCount }` |
| GET | `/api/download` | query params | file download response |

---

## Web-UI Page Structure

Three routes under `web-ui/src/app/`:

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Catalog browser — searchable/filterable table of all steps |
| `/editor` | `app/editor/page.tsx` | Gherkin editor — CodeMirror + step browser + import dropzone |
| `/features` | `app/features/page.tsx` | Feature files browser — list + preview panel |

**Layout** (`web-ui/src/app/layout.tsx`): wraps all pages in `<Providers>`, renders
nav bar with Catalog / Editor / Features links, LanguageToggle, ThemeToggle.

**Providers** (`web-ui/src/providers/Providers.tsx`): composes three context providers:
1. `NextThemesProvider` — light/dark mode (`attribute="class"`, `enableSystem`)
2. `LanguageContext` — in-memory locale state (`en` | `it`), exposes `useLanguage()`
3. `TooltipProvider` (Base UI / shadcn) — delay 400ms

---

## VS Code Extension (`vscode-extension/`)

Independent sub-project. Reads `step-catalog.json` from the workspace root.

Key files:
- `vscode-extension/src/extension.ts` — activation, command registration
- `vscode-extension/src/catalog/index.ts` — `CatalogLoader` interface
- `vscode-extension/src/catalog/fsLoader.ts` — `FsLoader implements CatalogLoader`, file watcher
- `vscode-extension/src/providers/diagnosticProvider.ts` — live step validation
- `vscode-extension/src/providers/hoverProvider.ts` — `@intent` on hover
- `vscode-extension/src/providers/tagCompletionProvider.ts` — autocomplete for `.feature`

---

## Scripts (`scripts/`)

| Script | Trigger | Purpose |
|--------|---------|---------|
| `scripts/extract-steps.ts` | `npm run catalog` (step 2) | Parses cucumber NDJSON, writes `step-catalog.json` |
| `scripts/render-markdown.ts` | `npm run catalog` (step 3) | Reads `step-catalog.json`, writes `STEP_CATALOG.md` |
| `scripts/validate-steps.ts` | `npm run validate:steps` / pre-commit | Matches `.feature` steps against catalog; blocks on unknown steps |
| `scripts/import-scenarios.ts` | `POST /api/import` + CLI | Parses plain `.txt`/`.feature` input, writes `.feature` + `@wanted` step skeletons, runs catalog |
| `scripts/watch-catalog.ts` | `npm run catalog:watch` | File watcher; regenerates catalog on step file changes |
| `scripts/jira-sync.ts` | `npm run jira:sync` | Pushes `@ticket:BOOT-xxx` scenarios to Jira REST API as comments |

---

## Error Handling Strategy

**Test scaffold:** unhandled async errors bubble up through Cucumber as test failures;
assertions use Node `assert.strict`.

**Web-UI API routes:** all route handlers wrap logic in `try/catch`; return
`{ error: message }` with appropriate HTTP status codes (400, 500). Internal error
details and raw script output are never forwarded to the client (security pattern
noted in import route as `CR-01`).

**Import script security mitigations:**
- `T-04-06`: temporary file name built from `Date.now()`, no user input in shell command
- `T-04-07`: `execSync` timeout 30 s
- `WR-04`: path traversal guard in `safeFeaturePath()` with case-normalisation for Windows

---

*Architecture analysis: 2026-06-10*
