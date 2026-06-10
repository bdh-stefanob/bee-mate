---
phase: 04-web-ui
plan: "01"
subsystem: web-ui
tags: [next.js, shadcn, tailwind, vitest, scaffolding, api-routes]
dependency_graph:
  requires: []
  provides:
    - web-ui/src/lib/types.ts (CatalogStep, Catalog, FeatureSummary)
    - web-ui/src/lib/repo.ts (REPO_ROOT, FEATURES_DIR, slugify, safeFeaturePath)
    - web-ui/src/app/api/catalog/route.ts (GET /api/catalog)
    - web-ui/src/app/api/features/route.ts (GET /api/features)
    - web-ui/src/app/api/import/route.ts (stub POST 501)
    - web-ui/src/app/api/download/route.ts (stub GET 501)
  affects: []
tech_stack:
  added:
    - next@15.5.19
    - react@19.1.0
    - shadcn/ui (base-nova preset)
    - tailwindcss@4
    - vitest@4.1.8
    - sonner@2.0.7
  patterns:
    - Next.js 15 App Router con src/ directory
    - REPO_ROOT = path.resolve(process.cwd(), '..') per accesso file repo
    - TDD (RED→GREEN) per lib/repo.ts
key_files:
  created:
    - web-ui/package.json
    - web-ui/vitest.config.ts
    - web-ui/components.json
    - web-ui/src/lib/types.ts
    - web-ui/src/lib/repo.ts
    - web-ui/src/app/layout.tsx
    - web-ui/src/app/page.tsx
    - web-ui/src/app/editor/page.tsx
    - web-ui/src/app/features/page.tsx
    - web-ui/src/app/api/catalog/route.ts
    - web-ui/src/app/api/features/route.ts
    - web-ui/src/app/api/import/route.ts
    - web-ui/src/app/api/download/route.ts
    - web-ui/__tests__/lib/repo.test.ts
    - web-ui/__tests__/api/catalog.test.ts
    - web-ui/README.md
  modified: []
decisions:
  - "src/ directory usata (create-next-app@15 ignora --src-dir false): tutti i path sono web-ui/src/app/ invece di web-ui/app/"
  - "shadcn init con --defaults (base-nova preset) perché la nuova CLI v4.11 non supporta --base-color flag"
  - "vitest.config.ts include alias @/* → ./src per risolvere import nelle test suite"
metrics:
  duration: "~12 min"
  completed_date: "2026-06-10"
  tasks_completed: 3
  files_created: 16
---

# Phase 04 Plan 01: Web-UI Scaffolding Summary

**One-liner:** Next.js 15 App Router scaffolding in web-ui/ con shadcn/ui base-nova, 3 pagine navigabili, 4 API route (catalog/features reali, import/download stub 501), contratti types + REPO_ROOT + safeFeaturePath, Vitest verde (5/5).

---

## Tasks Completed

| # | Task | Commit | Files chiave |
|---|------|--------|-------------|
| 1 | Next.js 15 + shadcn + Vitest scaffolding | `9a6336d` | package.json, vitest.config.ts, components.json, src/components/ui/* |
| 2 | Contract types + helper REPO_ROOT (TDD) | `84f6a62` | src/lib/types.ts, src/lib/repo.ts, __tests__/lib/repo.test.ts |
| 3 | Layout + 3 pagine + 4 API route | `53a0357` | src/app/layout.tsx, api/catalog, api/features, api/import, api/download |

---

## Verification Results

- `cd web-ui && npx tsc --noEmit` → exit 0
- `cd web-ui && npm test` → 2 test file, 5 test, tutti verdi
  - repo.test.ts: 4 test (safeFeaturePath path traversal, estensione .feature, slugify)
  - catalog.test.ts: 1 test (UI-01 steps[] non vuoto)

---

## Deviations from Plan

### Auto-adjusted (non-blocking)

**1. [Rule 3 - Structural] src/ directory usata invece di app/ root**
- **Found during:** Task 1
- **Issue:** `create-next-app@15` con `--src-dir false` genera comunque la struttura `src/` (comportamento cambiato in versioni recenti). Il tsconfig ha `@/*: ./src/*`.
- **Fix:** Tutti i file del piano sono stati creati in `web-ui/src/app/`, `web-ui/src/lib/` etc. Il mapping `@/*` funziona correttamente. Nessun impatto funzionale.
- **Files modified:** tutti i path aggiornati mentalmente — no fix di codice necessario

**2. [Rule 3 - CLI] shadcn init senza --base-color flag**
- **Found during:** Task 1
- **Issue:** shadcn CLI v4.11.0 non supporta `--base-color` (opzione rimossa). Il flag `--defaults` usa il preset `base-nova` con `baseColor: neutral` — equivalente funzionale.
- **Fix:** `npx shadcn@latest init --defaults --yes`
- **Files modified:** components.json (stile `base-nova` invece di `default`)

**3. [Rule 2 - Config] vitest.config.ts aggiunto alias @/ per test**
- **Found during:** Task 2 (RED phase)
- **Issue:** Il vitest di default non risolve l'alias `@/` definito in tsconfig. I test `import ... from '@/lib/repo'` fallivano con "Cannot find package".
- **Fix:** Aggiunto `resolve.alias` in vitest.config.ts (`@` → `./src`).
- **Files modified:** web-ui/vitest.config.ts

---

## Known Stubs

| File | Descrizione | Piano che la implementa |
|------|-------------|------------------------|
| `web-ui/src/app/api/import/route.ts` | POST restituisce 501 "not implemented (plan 03)" | Plan 04-03 |
| `web-ui/src/app/api/download/route.ts` | GET restituisce 501 "not implemented (plan 04)" | Plan 04-04 |
| `web-ui/src/app/page.tsx` | Placeholder `<h1>Step Catalog</h1>` senza componente | Plan 04-02 |
| `web-ui/src/app/editor/page.tsx` | Placeholder `<h1>Gherkin Editor</h1>` senza componente | Plan 04-03 |
| `web-ui/src/app/features/page.tsx` | Placeholder `<h1>Feature Catalog</h1>` senza componente | Plan 04-04 |

Questi stub sono **intenzionali**: il piano 01 si occupa solo dello scaffolding. Le wave successive (piani 02-04) implementano i componenti contro i contratti già pronti.

---

## Threat Flags

Nessun nuovo surface di sicurezza introdotto oltre a quanto già nel threat model del piano.

- T-04-01 mitigato: `safeFeaturePath` implementato e testato in `lib/repo.ts`.
- T-04-03 mitigato (parziale): `/api/import` è stub 501 — nessuna esecuzione shell in questo piano.

---

## Self-Check: PASSED

File chiave verificati:

- `web-ui/src/lib/types.ts` — FOUND
- `web-ui/src/lib/repo.ts` — FOUND
- `web-ui/src/app/api/catalog/route.ts` — FOUND
- `web-ui/vitest.config.ts` — FOUND
- `web-ui/__tests__/lib/repo.test.ts` — FOUND
- `web-ui/__tests__/api/catalog.test.ts` — FOUND

Commit verificati:
- `9a6336d` — FOUND (scaffolding)
- `84f6a62` — FOUND (types + repo)
- `53a0357` — FOUND (layout + API)
