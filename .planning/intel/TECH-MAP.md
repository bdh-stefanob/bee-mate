# Technology Map

**Analysis Date:** 2026-06-10

---

## Project Roots

This repo contains two independent npm projects plus a VS Code extension:

| Root | Purpose | Package |
|------|---------|---------|
| `/` (repo root) | Test scaffold | `bdd-automation-scaffold` v0.1.0 |
| `web-ui/` | Authoring portal | `web-ui` v0.1.0 |
| `vscode-extension/` | VS Code step-catalog extension | separate tsconfig |

---

## Test Scaffold (`/`)

### Runtime & Language
- **Node.js** (no `.nvmrc` pinned; targets CommonJS/ES2022)
- **TypeScript** ^5.5.0 — `tsconfig.json`: `target: ES2022`, `module: CommonJS`,
  `moduleResolution: node`, `strict: true`
- **ts-node** ^10.9.2 — used to run scripts directly (`ts-node/register` in
  cucumber config, `npx ts-node scripts/*.ts`)

### Test Framework
- **@cucumber/cucumber** ^10.8.0 — BDD test runner; owns the test lifecycle
- **@playwright/test** ^1.45.0 — browser automation library (Playwright is a
  dependency, not the runner; Cucumber drives execution)
- Config: `cucumber.js` at repo root (CommonJS format)
  - `requireModule: ["ts-node/register"]`
  - `require: ["src/steps/**/*.ts", "src/support/**/*.ts"]`
  - `paths: ["src/features/**/*.feature"]`
  - Formatters: `progress-bar`, `html:reports/cucumber-report.html`, `summary`

### Pre-commit
- **Husky** ^9.0.0 — git hooks; `npm run prepare` installs hooks
- Hook runs `scripts/validate-steps.ts` to block commits with unregistered steps

### NPM Scripts
```bash
npm test                # cucumber-js (runs all scenarios)
npm run test:dry        # cucumber-js --dry-run (validates step wiring)
npm run catalog         # dry-run → extract-steps.ts → render-markdown.ts
npm run validate:steps  # ts-node scripts/validate-steps.ts
npm run catalog:watch   # ts-node scripts/watch-catalog.ts
npm run jira:sync       # ts-node scripts/jira-sync.ts
npm run jira:sync:dry   # ts-node scripts/jira-sync.ts --dry-run
```

---

## Web-UI (`web-ui/`)

### Runtime & Language
- **Node.js** (any LTS supported by Next.js 15)
- **TypeScript** ^5 — `web-ui/tsconfig.json`:
  - `target: ES2017`, `module: esnext`, `moduleResolution: bundler`
  - `strict: true`, `noEmit: true`, `isolatedModules: true`
  - Path alias: `@/*` → `./src/*`
  - JSX: `preserve` (Next.js handles transform)

### Framework
- **Next.js 15.5.19** — App Router, React Server Components
  - Build: `next build --turbopack` (Turbopack bundler)
  - Dev: `next dev --turbopack`
  - No `output: 'export'` — requires Node.js server for API Route Handlers
  - API routes use Node.js `fs`, `path`, `child_process` (server-only)
- **React 19.1.0 + react-dom 19.1.0**

### App Router Structure
```
web-ui/src/app/
├── layout.tsx            # RootLayout — Providers, nav bar
├── globals.css           # Tailwind v4 @import + CSS custom properties
├── page.tsx              # / — Step Catalog page (client component)
├── editor/
│   └── page.tsx          # /editor — Gherkin Editor page (client component)
├── features/
│   └── page.tsx          # /features — Feature files browser (client component)
└── api/
    ├── catalog/route.ts  # GET — serves step-catalog.json + step-enums.json merged
    ├── features/route.ts # GET — lists .feature files from src/features/
    ├── import/route.ts   # POST — runs import-scenarios.ts via execSync
    └── download/route.ts # GET — file download helper
```

All page components are `'use client'` — they fetch data from the API routes
at runtime rather than using React Server Component data fetching.

### Styling: Tailwind CSS v4 + shadcn/ui

**Tailwind v4** (`tailwindcss` ^4, `@tailwindcss/postcss` ^4):
- CSS-first config — no `tailwind.config.js`; configured entirely via `globals.css`
- Imports: `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`
- Theme defined with `@theme inline { ... }` mapping CSS custom properties
- Dark mode: `@custom-variant dark (&:is(.dark *))` — class strategy (`class` attribute)

**Design tokens** (defined in `web-ui/src/app/globals.css`):
- Color palette: **Boots Teal** (`oklch` values)
  - Primary: `teal-600 #0D9488` (light) / `teal-500` (dark)
  - Accent: `orange-500 #F97316` (light) / `orange-400` (dark)
- Radius: `0.625rem` base
- Font: Geist Sans + Geist Mono (Google Fonts via `next/font`)

**CodeMirror syntax highlight tokens** (defined in `globals.css`):
```css
:root {
  --cm-keyword: #0F766E;  /* Feature/Scenario — teal-700, WCAG AA */
  --cm-step:    #16A34A;  /* Given/When/Then — green-600, WCAG AA */
  --cm-comment: #6B7280;  /* gray-500 */
  --cm-tag:     #C2410C;  /* @tags — orange-700, WCAG AA */
  --cm-table:   #1D4ED8;  /* | table rows | — blue-700, WCAG AA */
}
```

**shadcn/ui** (`shadcn` ^4.11.0):
- Components installed to `web-ui/src/components/ui/`:
  `badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`,
  `separator.tsx`, `sonner.tsx`, `table.tsx`, `tooltip.tsx`, `popover.tsx`
- Utility helpers:
  - `class-variance-authority` ^0.7.1 — CVA for variant props
  - `clsx` ^2.1.1 — conditional class merging
  - `tailwind-merge` ^3.6.0 — Tailwind conflict resolution
  - `tw-animate-css` ^1.4.0 — animation utilities
- `@base-ui/react` ^1.5.0 — low-level accessible primitives (Base UI)

### Theming

Theme toggle via `next-themes` ^0.4.6:
- Provider: `NextThemesProvider attribute="class" defaultTheme="system" enableSystem`
- Toggle component: `web-ui/src/components/ThemeToggle.tsx`
- Dark mode class applied to `<html>` element; CSS custom properties switch in
  `.dark { ... }` block in `globals.css`

### CodeMirror 6

Used to build the Gherkin editor in `web-ui/src/components/GherkinEditor.tsx`.

**Packages used:**
| Package | Version | Role |
|---------|---------|------|
| `@codemirror/state` | ^6.6.0 | EditorState, document model |
| `@codemirror/view` | ^6.43.1 | EditorView, rendering, keymaps, line numbers |
| `@codemirror/commands` | ^6.10.3 | `undo`, `redo`, `defaultKeymap`, `historyKeymap` |
| `@codemirror/autocomplete` | ^6.20.3 | `autocompletion`, `CompletionContext` |
| `@codemirror/language` | ^6.12.3 | `StreamLanguage`, `HighlightStyle`, `syntaxHighlighting` |
| `@codemirror/lint` | ^6.9.7 | `linter`, `Diagnostic` |

**Custom Gherkin language support** (`web-ui/src/lib/gherkin-cm.ts`):
- `gherkinLanguage`: `StreamLanguage.define(gherkinParser)` — custom `StreamParser`
  that tokenises Feature/Scenario/Given etc. into highlight tags
- `gherkinTheme`: `syntaxHighlighting(HighlightStyle.define([...]))` — maps
  tags to CSS custom properties (`--cm-keyword`, `--cm-step`, etc.)
- `gherkinLinter`: `linter(view => Diagnostic[])` — inline error/warning for:
  - Steps outside a Scenario/Background block (error)
  - Empty Scenario blocks with no steps (warning)
  - Document missing `Feature:` declaration (warning)
- `formatGherkin(text)`: pure function normalising Gherkin indentation to
  official Cucumber spec (col 0 / 2 / 4 / 6)

**Autocomplete** (`web-ui/src/lib/autocomplete.ts` + `GherkinEditor.tsx`):
- Source: step expressions from `/api/catalog` fetched on mount
- Trigger: `GHERKIN_PREFIX_RE = /(?:^|\n)(Given|When|Then|And|But)\s+([^\n]*)$/`
- Strategy: prefix match, case-insensitive, max 8 suggestions
- Step expressions held in a `useRef` (avoids re-creating extensions on re-render)

**Editor handle** (`GherkinEditorHandle`): exposes `insertAtCursor`, `getView`,
`undo`, `redo` via `useImperativeHandle` — used by toolbar and step browser.

### i18n Approach

**No i18n library** — custom translation object in `web-ui/src/lib/i18n.ts`.

```typescript
export const translations = { en: { ... }, it: { ... } } as const;
export type Lang = keyof typeof translations;  // "en" | "it"
export type T = (typeof translations)[Lang];
```

- Two locales: English (`en`) and Italian (`it`)
- All UI strings covered: nav, catalog, editor, stepBrowser, features, status badges
- Runtime switching via `LanguageContext` in `web-ui/src/providers/Providers.tsx`
- Toggle component: `web-ui/src/components/LanguageToggle.tsx`
- State is in-memory only (no persistence between sessions)

### Testing (web-ui)
- **Vitest** ^4.1.8 — unit test runner
- Commands: `npm test` (`vitest run`), `npm test:watch` (`vitest`)
- No separate config file detected (uses Vite defaults from Next.js)

### UI-specific Libraries
- **lucide-react** ^1.17.0 — icon set (SVG React components)
- **sonner** ^2.0.7 — toast notifications

---

## VS Code Extension (`vscode-extension/`)

- TypeScript, separate `tsconfig.json`
- No additional npm dependencies beyond `vscode` engine types
- Key abstractions:
  - `CatalogLoader` interface — defines `loadCatalog()` contract
  - `FsLoader` — reads `step-catalog.json` from workspace root, sets up `fs.watch`
  - `CompletionItemProvider` — Cucumber step autocomplete for `.feature` files
  - `DiagnosticProvider` — live step-vs-catalog validation squiggles
  - `HoverProvider` — shows `@intent` and `sourceRef` on hover
  - `TagCompletionProvider` — Gherkin tag (`@`) autocomplete

---

## Catalog Data Files

| File | Location | Managed by | Purpose |
|------|----------|------------|---------|
| `step-catalog.json` | repo root | `npm run catalog` (generated) | Structured step registry — single source of truth |
| `step-enums.json` | repo root | Hand-edited | Enum values for `{string}` params + step dependency graph |
| `STEP_CATALOG.md` | repo root | `npm run catalog` (generated) | Human-readable catalog with badges (`🔧 wanted`, `⛔ deprecated`) |

**step-catalog.json top-level fields:**
```json
{
  "generatedAt": "ISO timestamp",
  "totalSteps": 18,
  "documentedSteps": 18,
  "undocumentedSteps": 0,
  "steps": [ ... ]
}
```

**Lifecycle status values** (from `@wanted` / `@deprecated` JSDoc tags on step defs):
- `"implemented"` — default; step has Playwright implementation
- `"wanted"` — placeholder skeleton; no implementation yet
- `"deprecated"` — superseded; see `replacedBy` field

---

## Environment & Configuration

**Test scaffold** — no `.env` required for demo domain (placeholder auth).
Real projects: add `BASE_URL`, test credentials.

**web-ui** — no `.env` required for local filesystem access.
Jira integration: `JIRA_URL`, `JIRA_TOKEN` in root `.env` (gitignored).

**`REPO_ROOT` resolution** (`web-ui/src/lib/repo.ts`):
- `path.resolve(process.cwd(), '..')` — assumes `npm run dev` is executed from `web-ui/`
- If run from repo root, adjust `REPO_ROOT` accordingly

---

## Build Outputs

| Artifact | Location | Producer |
|----------|----------|---------|
| HTML test report | `reports/cucumber-report.html` | `npm test` |
| Catalog NDJSON (temp) | `cucumber-messages.ndjson` | `npm run catalog` step 1 |
| Step catalog JSON | `step-catalog.json` | `scripts/extract-steps.ts` |
| Step catalog MD | `STEP_CATALOG.md` | `scripts/render-markdown.ts` |
| Next.js build | `web-ui/.next/` | `npm run build` inside `web-ui/` |
| VS Code extension | `vscode-extension/out/` | `vsce package` |

---

*Technology analysis: 2026-06-10*
