---
phase: 02-catalog-pipeline-upgrade
plan: "01"
subsystem: catalog-pipeline
tags: [infra, catalog, schema, lifecycle, typescript]
dependency_graph:
  requires: []
  provides: [step-catalog-schema-v2, lifecycle-tags-parser, app-area-domain-derivation]
  affects: [step-catalog.json, STEP_CATALOG.md, scripts/extract-steps.ts]
tech_stack:
  added: []
  patterns:
    - "Tag parser con regex opzionale: /^@(\\w+)(?:\\s+(.*))?$/ per tag bare e tag con valore"
    - "Derivazione app/area/domain a 2 segmenti da path del file step"
    - "Status lifecycle calcolato con priorità: wanted > deprecated > implemented"
key_files:
  created: []
  modified:
    - scripts/extract-steps.ts
    - src/steps/app-a/orders/orders.steps.ts
    - step-catalog.json
    - STEP_CATALOG.md
decisions:
  - "Status top-level su CatalogStep (non annidato in doc) — coerente con D-03 CONTEXT"
  - "Tag bare @wanted/@deprecated gestiti con gruppo opzionale (?:...) nella regex"
  - "Edge case steps/common/: area fallback = app, domain = 'common' (1 livello)"
metrics:
  duration_minutes: 25
  completed_date: "2026-06-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 02 Plan 01: Catalog Schema Extension — app/area/domain + lifecycle tags

**One-liner:** Esteso extract-steps.ts con derivazione app/area/domain a 2 segmenti e parser tag lifecycle (@wanted/@deprecated/@replacedBy/@requester/@assignee), producendo step-catalog.json con schema v2.

## Objective

Estendere `scripts/extract-steps.ts` per:
1. Derivare `app` e `area` dal path del file step (`INFRA-02`)
2. Riconoscere i tag JSDoc lifecycle producendo il campo `status` top-level (`INFRA-03`)
3. Aggiungere uno step demo `@wanted` in `app-a/orders` per popolare il catalog con almeno uno step non-implemented

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Estendere extract-steps.ts con app/area/domain e tag lifecycle | 2757103 | scripts/extract-steps.ts, step-catalog.json, STEP_CATALOG.md |
| 2 | Aggiungere step demo @wanted in app-a/orders | 1b757de | src/steps/app-a/orders/orders.steps.ts, step-catalog.json, STEP_CATALOG.md |

## Changes Made

### scripts/extract-steps.ts

**Punto 1 — Interfaccia `StepDoc`:** aggiunti 5 campi lifecycle interni (`wanted?`, `deprecated?`, `replacedBy?`, `requester?`, `assignee?`).

**Punto 2 — Interfaccia `CatalogStep`:** aggiunti campi top-level `app`, `area`, `status` (required), `replacedBy?`, `requester?`, `assignee?`.

**Punto 3 — Parser tag `extractDoc()`:** regex aggiornata da `/^@(\w+)\s+(.*)$/` a `/^@(\w+)(?:\s+(.*))?$/` per gestire tag bare (`@wanted`, `@deprecated` senza argomento). Aggiunti 5 case nel loop.

**Punto 4 — Derivazione domain:** sostituita derivazione a 1 segmento con logica a 2 segmenti:
- `appMatch`: primo segmento dopo `steps/`
- `areaMatch`: secondo segmento dopo `steps/<app>/`
- Fallback 1-livello (`steps/common/`): `area = app`, `domain = app`

**Punto 5 — Push step:** aggiunto calcolo `status` con priorità `wanted > deprecated > implemented`, spread condizionale per campi opzionali.

### src/steps/app-a/orders/orders.steps.ts

Aggiunto in coda lo step demo `@wanted`:
```
"I search for the product {string}"
@wanted @requester DEMO-001 @assignee steve
throw new Error('NOT IMPLEMENTED')
```

Nessuna feature lo invoca — il run completo non fallisce.

## Verification Results

- `npx tsc --noEmit -p tsconfig.json` — verde (0 errori)
- `npm run catalog` — verde, 11 step (10 implemented + 1 wanted)
- `npm run test:dry` — verde, 5 scenari, 18 step, 0 undefined
- INFRA-02: `s.app==='app-a'`, `s.area==='orders'`, `s.domain==='app-a/orders'` — verificato
- INFRA-03: step wanted con `requester==='DEMO-001'`, `assignee==='steve'` — verificato
- Step wanted non referenziato in nessuna `.feature` — verificato

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] File untracked dalla struttura pre-multi-app bloccavano il dry-run**
- **Found during:** Task 1 — prima esecuzione di `npm run catalog`
- **Issue:** Il `git reset --soft` aveva lasciato nella working directory i file untracked dell'albero di commit `e96ce33` (struttura mono-app: `src/steps/auth/`, `src/steps/orders/`, ecc.). Questi duplicavano i file multi-app creando "Multiple step definitions match" per tutti gli step.
- **Fix:** Rimossi con `rm -rf` i directory/file untracked (`src/steps/auth/`, `src/steps/orders/`, `src/features/auth/`, `src/features/orders/`, `src/actions/auth.actions.ts`, `src/actions/orders.actions.ts`, `src/pages/cart.page.ts`, `src/pages/login.page.ts`)
- **Files modified:** nessun file tracciato — solo rimozione di untracked
- **Commit:** parte di 2757103 (il catalog ora gira pulito)

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| src/steps/app-a/orders/orders.steps.ts | `throw new Error('NOT IMPLEMENTED')` per "I search for the product {string}" | Intenzionale: step @wanted demo; l'action non esiste ancora. Risolto quando Plan 02-0x implementa la funzionalità. |

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| scripts/extract-steps.ts esiste | FOUND |
| src/steps/app-a/orders/orders.steps.ts esiste | FOUND |
| step-catalog.json esiste | FOUND |
| commit 2757103 esiste | FOUND |
| commit 1b757de esiste | FOUND |
