---
phase: 02-catalog-pipeline-upgrade
plan: "02"
subsystem: catalog-pipeline
tags: [render-markdown, step-catalog, badge, lifecycle, wanted, deprecated]
dependency_graph:
  requires: [02-01]
  provides: [INFRA-03-rendering]
  affects: [STEP_CATALOG.md, scripts/render-markdown.ts]
tech_stack:
  added: []
  patterns: [conditional-badge-emoji, status-breakdown-header, lifecycle-rows]
key_files:
  created:
    - src/steps/app-a/orders/orders.steps.ts
  modified:
    - scripts/render-markdown.ts
    - STEP_CATALOG.md
    - step-catalog.json
    - src/steps/orders/orders.steps.ts
decisions:
  - "Status badge silenzioso per implemented (default) — nessun badge = implemented, coerente con il principio di rumore minimo"
  - "Righe Requester/Assignee solo se almeno uno dei due campi è presente — evita righe vuote"
  - "Sostituito da prima dei Parameters — priorità informazione lifecycle sul dettaglio tecnico"
metrics:
  duration: "5m 2s"
  completed_date: "2026-06-09"
  tasks_total: 1
  tasks_completed: 1
  files_changed: 5
---

# Phase 02 Plan 02: Catalog Markdown Rendering con Badge Lifecycle — Summary

**One-liner:** Renderer Markdown esteso con badge 🔧/⛔ per wanted/deprecated, breakdown header per status, e righe condizionali Requester/Assignee e "Sostituito da".

---

## What Was Built

`scripts/render-markdown.ts` aggiornato in 3 punti per rendere visibile lo `status` di ogni step nel `STEP_CATALOG.md`:

1. **Interfaccia `CatalogStep` locale estesa** — aggiunto `status?`, `replacedBy?`, `requester?`, `assignee?`, `app?`, `area?` per retrocompatibilità con catalog senza status.

2. **Header breakdown per status (D-07)** — sostituito `(N documented, N undocumented)` con `(N implemented, N wanted, N deprecated)`. Il filtro `!s.status || s.status === 'implemented'` gestisce catalog vecchi.

3. **Loop step con badge e righe lifecycle (D-04, D-05, D-06)**:
   - Badge `🔧 ` davanti all'expression per gli step `wanted`
   - Badge `⛔ ` per i `deprecated`
   - Riga `_Requester: X — Assignee: Y_` dopo `@intent` per gli step `wanted`
   - Riga `**Sostituito da:** \`expr\`` per i `deprecated`

**Risultato `STEP_CATALOG.md` rigenerato:**
- 11 step totali (10 implemented, 1 wanted, 0 deprecated)
- Sezione `## Domain: \`app-a/orders\`` visibile
- Badge 🔧 sullo step `I search for the product {string}`
- Riga `Requester: DEMO-001 — Assignee: steve` visibile

---

## Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | PASS |
| `npm run catalog` exit 0 | PASS |
| STEP_CATALOG.md contiene `🔧` | PASS |
| breakdown header `(N implemented, N wanted, N deprecated)` | PASS |
| STEP_CATALOG.md contiene `Requester: DEMO-001` | PASS |
| STEP_CATALOG.md contiene `Domain: \`app-a/orders\`` | PASS |
| `render-markdown.ts` contiene `const statusBadge =` | PASS |
| `render-markdown.ts` contiene `**Sostituito da:**` | PASS |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Spostato step @wanted nel path multi-app corretto**

- **Found during:** Task 1, verifica acceptance criteria `Domain: \`app-a/orders\``
- **Issue:** Il merge del Plan 01 aveva collocato lo step `I search for the product {string}` con tag `@wanted` in `src/steps/orders/orders.steps.ts` invece di `src/steps/app-a/orders/orders.steps.ts`. La logica di derivazione del domain in `extract-steps.ts` usa il path del file: path a 2 livelli (`steps/orders/`) produce `domain: "orders"`, path a 3 livelli (`steps/app-a/orders/`) produce `domain: "app-a/orders"`. Il domain errato rendeva impossibile soddisfare il criterio `## Domain: \`app-a/orders\``.
- **Fix:** Rimosso lo step da `src/steps/orders/orders.steps.ts`, creato `src/steps/app-a/orders/orders.steps.ts` con lo step wanted nel path multi-app corretto.
- **Files modified:** `src/steps/orders/orders.steps.ts`, `src/steps/app-a/orders/orders.steps.ts` (nuovo)
- **Commit:** f6a86fa

---

## Known Stubs

Nessuno stub che blocchi il goal del piano. Lo step `I search for the product {string}` è intenzionalmente uno stub `@wanted` (throw Error) — è l'elemento demo del lifecycle workflow, non un bug.

---

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | f6a86fa | feat(02-02): aggiungi badge status, breakdown header e righe lifecycle in render-markdown.ts |

---

## Self-Check

Verifica file creati/modificati e commit.
