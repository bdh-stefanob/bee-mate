---
phase: 01-multi-app-scaffold
plan: 01
subsystem: infra
tags: [typescript, cucumber, playwright, multi-app, scaffold, refactor]

# Dependency graph
requires: []
provides:
  - "Struttura src/<layer>/app-a/<area>/ per tutto il codice esistente (INFRA-01)"
  - "Placeholder src/{features,steps,actions,pages}/app-b/.gitkeep"
  - "Catalog rigenerato con domain 'app-a' e sourceRef sui nuovi path"
  - "Regex domain extract-steps.ts compatibile con separatori Windows e POSIX"
affects:
  - 01-multi-app-scaffold (plan 02+)
  - 02-catalog-schema
  - 04-vscode-extension-providers

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "src/<layer>/<app>/<area>/ — struttura multi-app a 4 livelli"
    - "Import relativi a 3 livelli da src/steps/<app>/<area>/ verso src/support/ e src/actions/<app>/"
    - "Regex domain /steps[/\\]([^/\\]+)[/\\]/ cross-platform per derivare il dominio dal path"

key-files:
  created:
    - src/features/app-b/.gitkeep
    - src/steps/app-b/.gitkeep
    - src/actions/app-b/.gitkeep
    - src/pages/app-b/.gitkeep
  modified:
    - src/steps/app-a/auth/auth.steps.ts
    - src/steps/app-a/orders/orders.steps.ts
    - src/steps/common/common.steps.ts
    - src/actions/app-a/auth.actions.ts
    - src/actions/app-a/orders.actions.ts
    - src/pages/app-a/login.page.ts
    - src/pages/app-a/cart.page.ts
    - scripts/extract-steps.ts
    - step-catalog.json
    - STEP_CATALOG.md

key-decisions:
  - "Regex domain aggiornata per compatibilità cross-platform Windows/POSIX: /steps[/\\]([^/\\]+)[/\\]/ invece di /steps\\/([^/]+)\\// — fix essenziale su Windows dove Cucumber emette path con backslash"
  - "Commenti header file-level aggiornati al nuovo path come da convenzione di progetto"

patterns-established:
  - "git mv per spostare file/directory: preserva la storia git e permette il tracciamento dei rename"
  - "Import a 3 livelli ../../../ per step in src/steps/<app>/<area>/ verso src/support/ e src/actions/<app>/"
  - "Import a 2 livelli ../../ per step in src/steps/common/ verso src/support/ (file non spostato) e src/actions/<app>/ (target spostato)"

requirements-completed: [INFRA-01]

# Metrics
duration: 20min
completed: 2026-06-09
---

# Phase 01 Plan 01: Multi-App Scaffold Summary

**Refactor scaffold mono-app → struttura multi-app `src/<layer>/app-a/<area>/` con placeholder `app-b` nei 4 layer, import aggiornati, e catalog rigenerato con domain `app-a` via regex cross-platform Windows/POSIX**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-09T18:30:00Z
- **Completed:** 2026-06-09T18:32:30Z
- **Tasks:** 2
- **Files modified:** 13 (8 rename + 1 modifica + 4 creati + 3 catalog)

## Accomplishments

- Tutto il codice existente migrato sotto `src/<layer>/app-a/<area>/` via `git mv` (storia preservata)
- Import relativi aggiornati con precisione chirurgica sui valori documentati nel piano
- Quattro placeholder `app-b/.gitkeep` creati nei layer features/steps/actions/pages
- Regex domain `extract-steps.ts` resa cross-platform (fix Windows backslash — bug pre-esistente emerso al primo run del catalog)
- Catalog rigenerato: 10 step, domini `app-a` + `common`, sourceRef sui nuovi path
- `tsc --noEmit` → 0 errori; `npm test` → 5 scenari / 18 step / 0 undefined (identico al pre-refactor)

## Task Commits

Ogni task è stato committato atomicamente:

1. **Task 1: Migra il codice sotto app-a, crea placeholder app-b, aggiorna gli import** - `09e06c0` (refactor)
2. **Task 2: Verifica regex domain, rigenera il catalog, conferma assenza di path legacy** - `dd8ba33` (feat)

## Files Created/Modified

- `src/steps/app-a/auth/auth.steps.ts` — rinominato da `src/steps/auth/auth.steps.ts`; import aggiornati a 3 livelli
- `src/steps/app-a/orders/orders.steps.ts` — rinominato da `src/steps/orders/orders.steps.ts`; import aggiornati a 3 livelli
- `src/steps/common/common.steps.ts` — NON spostato; solo import action aggiornato a `../../actions/app-a/auth.actions`
- `src/actions/app-a/auth.actions.ts` — rinominato; import page aggiornato a `../../pages/app-a/login.page`
- `src/actions/app-a/orders.actions.ts` — rinominato; import page aggiornato a `../../pages/app-a/cart.page`
- `src/pages/app-a/login.page.ts` — rinominato; nessun import relativo da aggiornare
- `src/pages/app-a/cart.page.ts` — rinominato; nessun import relativo da aggiornare
- `src/features/app-a/auth/login.feature` — rinominato (nessuna modifica al contenuto)
- `src/features/app-a/orders/place-order.feature` — rinominato (nessuna modifica al contenuto)
- `src/features/app-b/.gitkeep` — creato placeholder
- `src/steps/app-b/.gitkeep` — creato placeholder
- `src/actions/app-b/.gitkeep` — creato placeholder
- `src/pages/app-b/.gitkeep` — creato placeholder
- `scripts/extract-steps.ts` — regex domain aggiornata per compatibilità cross-platform
- `step-catalog.json` — rigenerato con domain `app-a` e sourceRef aggiornati
- `STEP_CATALOG.md` — rigenerato via `npm run catalog`

## Decisions Made

- **Regex cross-platform:** La regex originale `/steps\/([^/]+)\//` non funzionava su Windows perché Cucumber emette path con `\` (backslash). Sostituita con `/steps[/\\]([^/\\]+)[/\\]/` — fix necessario per la correttezza del catalog. Nessuna modifica funzionale alla logica di derivazione del dominio.
- **Commenti header aggiornati:** I commenti `// src/<old-path>` sono stati aggiornati ai nuovi path seguendo la convenzione del progetto (ogni file ha un commento con il suo path corrente).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fix regex domain in extract-steps.ts per separatori Windows**
- **Found during:** Task 2 (rigenerazione catalog)
- **Issue:** La regex `/steps\/([^/]+)\//` non matcha su Windows dove Cucumber emette path con backslash (`src\steps\app-a\auth\...`). Risultato: tutti gli step ricevevano domain `"common"` invece di `"app-a"`.
- **Fix:** Regex aggiornata a `/steps[/\\]([^/\\]+)[/\\]/` per supportare entrambi i separatori. Il commento esplicativo è stato aggiornato di conseguenza.
- **Files modified:** `scripts/extract-steps.ts`
- **Verification:** `npm run catalog` → domini `app-a,common`; assertion node conferma assenza sourceRef legacy.
- **Committed in:** `dd8ba33` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix essenziale per la correttezza del catalog su Windows. Nessun cambiamento architetturale — la logica di derivazione del dominio resta identica, solo la regex è resa cross-platform.

## Issues Encountered

- Il problema della regex con i separatori Windows non era menzionato nel RESEARCH come "Pitfall 4 verificato" — era descritto come ipotetico. Si è manifestato al primo run reale del catalog sul worktree Windows. Risolto in pochi minuti con Rule 1.
- Il fallimento di `npm test` (5 scenari failed per `Cannot navigate to invalid URL`) è pre-esistente al refactor: la `baseURL` non è passata al `BrowserContext` in `world.ts`. Confermato confrontando con il repo principale alla stessa commit. Documentato in STATE.md come known issue fuori scope Phase 1.

## User Setup Required

None - nessuna configurazione esterna richiesta.

## Next Phase Readiness

- Struttura `src/<layer>/app-a/<area>/` pronta — tutti i path-based requirement successivi (INFRA-02, EXT-07) possono procedere
- Placeholder `app-b` in posizione — pronto per essere popolato in fasi future
- Catalog con domain `app-a` — la VS Code extension (Phase 4) userà i `sourceRef` aggiornati per go-to-definition
- `cucumber.js` e `tsconfig.json` invariati — i glob ricorsivi `src/**` funzionano senza modifiche

## Self-Check: PASSED

- Tutti i 14 file verificati: FOUND
- Commit `09e06c0` (Task 1): FOUND
- Commit `dd8ba33` (Task 2): FOUND

---
*Phase: 01-multi-app-scaffold*
*Completed: 2026-06-09*
