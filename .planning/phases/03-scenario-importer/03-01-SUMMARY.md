---
phase: 03-scenario-importer
plan: 01
subsystem: testing
tags: [typescript, cucumber, gherkin, bdd, cli, step-catalog]

# Dependency graph
requires:
  - phase: 02-catalog-pipeline-upgrade
    provides: step-catalog.json con schema v2 (expression, status, app, area, domain)
provides:
  - CLI import-scenarios.ts per importare scenari .txt/.feature nel repo
  - Normalizzazione automatica placeholder Cucumber Expression ({string}, {int}, {float})
  - Deduplicazione step contro step-catalog.json (match esatto)
  - Generazione file .feature in src/features/<area>/
  - Generazione skeleton @wanted in src/steps/<app>/imported/
  - Fixture di test in test-fixtures/sample-import.txt
affects:
  - 03-scenario-importer (piani successivi se previsti)
  - demo manager 13/06/2026

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CLI TypeScript con process.argv (stessa struttura di extract-steps.ts)"
    - "Regex-based Gherkin parser senza dipendenze esterne"
    - "Deduplicazione determinististica tramite Set di expression normalize"
    - "Append-safe: file skeleton esistenti vengono estesi, non sovrascritti"
    - "Idempotenza: re-run produce stesso risultato (skip .feature esistente)"

key-files:
  created:
    - scripts/import-scenarios.ts
    - test-fixtures/sample-import.txt
    - src/features/checkout/checkout-happy-path.feature
    - src/steps/app-a/imported/checkout.steps.ts
  modified:
    - step-catalog.json (rigenerato da npm run catalog con 7 nuovi step @wanted)
    - STEP_CATALOG.md (rigenerato)

key-decisions:
  - "Regex custom per il parsing Gherkin invece di @cucumber/gherkin — nessuna dipendenza aggiuntiva, conforme al vincolo del piano"
  - "Path skeleton calcolato come src/steps/<app>/imported/<area>.steps.ts — struttura ortogonale ai 4 layer"
  - "Idempotenza by design: file .feature non sovrascritti, skeleton in append, skip step già nel catalog"
  - "Validazione path --input (T-03-01): rifiutati path con '..' che escono dalla root"

patterns-established:
  - "Import CLI: --input obbligatorio, --app e --area opzionali con default sensati"
  - "Normalizzazione placeholder: float > string > int (ordine importante per evitare conflitti)"
  - "Keyword resolution per And/But/*: eredita l'ultimo keyword Given/When/Then del contesto"

requirements-completed: [IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06]

# Metrics
duration: 15min
completed: 2026-06-10
---

# Phase 03 Plan 01: Scenario Importer Summary

**CLI TypeScript `import-scenarios.ts` che importa scenari Gherkin da .txt/.feature, deduplica contro step-catalog.json, genera .feature e skeleton @wanted, e rigenera il catalog automaticamente**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-10T07:10:00Z
- **Completed:** 2026-06-10T07:29:02Z
- **Tasks:** 2
- **Files modified:** 6 (1 creato script + 1 fixture + 2 generati + 2 rigenati catalog)

## Accomplishments

- Script CLI completo con parser Gherkin regex-based, senza dipendenze esterne
- Normalizzazione placeholder automatica: stringhe tra virgolette → {string}, interi → {int}, float → {float}
- Deduplicazione step contro step-catalog.json: "I am logged in as a {string} user" correttamente skippato nel test e2e
- 7 step nuovi importati come @wanted con skeleton `throw new Error('NOT IMPLEMENTED')`
- Fixture di prova `test-fixtures/sample-import.txt` con 2 scenari misti (step nuovi + step già nel catalog)
- Validazione sicurezza path traversal (T-03-01) e skip file esistenti (T-03-03)
- `npm run test:dry` passa senza errori: 7 scenari, 28 step, 0 undefined

## Task Commits

1. **Task 1: Implementa CLI import-scenarios.ts** - `a322334` (feat)
2. **Task 2: Fixture e output end-to-end** - `54d8ee1` (test)

## Files Created/Modified

- `scripts/import-scenarios.ts` - CLI completo: parser, normalizzazione, dedup, produzione .feature e .steps.ts, npm run catalog
- `test-fixtures/sample-import.txt` - Fixture con 2 scenari (stub generici, nessun dato aziendale reale)
- `src/features/checkout/checkout-happy-path.feature` - Feature generata dal fixture con tag @checkout
- `src/steps/app-a/imported/checkout.steps.ts` - 7 step skeleton @wanted
- `step-catalog.json` - Rigenerato con 8 step status:wanted (era 1)
- `STEP_CATALOG.md` - Rigenerato

## Decisions Made

- **Regex custom vs @cucumber/gherkin:** Scelto parser regex custom — nessuna dipendenza aggiuntiva, rispetta il vincolo esplicito del piano, sufficiente per il subset Gherkin richiesto (Feature, Scenario, Scenario Outline, step keyword, Examples).
- **Keyword resolution per And/But/\*:** Step con keyword contestuale (And/But/*) ereditano l'ultimo keyword esplicito (Given/When/Then) per determinare il tipo Cucumber corretto nello skeleton.
- **Idempotenza:** File .feature esistenti non vengono sovrascritti (warning + skip); skeleton in append-only con deduplicazione in-file; re-run sicuro.
- **Ordine normalizzazione placeholder:** Float prima di int per evitare che `3.14` venga normalizzato prima come `3` e `.14`.

## Deviations from Plan

None - piano eseguito esattamente come scritto.

## Issues Encountered

Nessuno. La compilazione TypeScript è passata senza errori al primo tentativo.
Il test e2e ha confermato tutti i criteri di accettazione:
- 7 step nuovi, 1 step skippato (catalog), catalog rigenerato a 18 step totali.

## User Setup Required

None - nessuna configurazione esterna richiesta.

## Known Stubs

- `src/steps/app-a/imported/checkout.steps.ts` — 7 step con `throw new Error('NOT IMPLEMENTED')`: questi sono intenzionali per design (step @wanted non ancora implementati, pronti per la demo del 13/06/2026).

## Next Phase Readiness

- Lo script è pronto per la demo del 13/06/2026: il team QA Boots può usare `npx ts-node scripts/import-scenarios.ts --input <file>` per importare scenari da Notepad.
- I 7 step @wanted nel catalog sono visibili nel STEP_CATALOG.md con status "wanted".
- Il repo non ha blockers. Le implementazioni Playwright degli step @wanted sono fuori scope di questa fase.

---
*Phase: 03-scenario-importer*
*Completed: 2026-06-10*
