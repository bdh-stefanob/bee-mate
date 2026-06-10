---
phase: 04-web-ui
plan: "02"
subsystem: web-ui
tags: [next.js, shadcn, tailwind, vitest, catalog-ui, filters, tdd]
dependency_graph:
  requires:
    - web-ui/src/lib/types.ts (CatalogStep, Catalog)
    - /api/catalog (GET)
  provides:
    - web-ui/src/lib/catalog.ts (filterSteps, uniqueAreas, uniqueStatuses)
    - web-ui/src/components/StepCatalog.tsx (tabella filtrabile, badge, double-click)
  affects:
    - web-ui/src/app/page.tsx (ora monta StepCatalog invece del placeholder)
tech_stack:
  added: []
  patterns:
    - TDD RED→GREEN per lib/catalog.ts
    - Client Component con useEffect fetch + useState
    - base-ui Select con onValueChange: string | null
    - encodeURIComponent per URL-safety del parametro step
key_files:
  created:
    - web-ui/src/lib/catalog.ts
    - web-ui/src/components/StepCatalog.tsx
    - web-ui/__tests__/lib/catalog.test.ts
  modified:
    - web-ui/src/app/page.tsx
decisions:
  - "base-ui Select.onValueChange tipato string|null: usato operatore ?? '' per evitare errori TS2345"
  - "Sentinella '__all__' per il valore 'nessun filtro' nei Select base-ui (non supporta valore vuoto nativo)"
  - "encodeURIComponent applicato prima di inserire expression in URL (T-04-05 mitigato)"
metrics:
  duration: "~8 min"
  completed_date: "2026-06-10"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 04 Plan 02: Step Catalog UI Summary

**One-liner:** Pagina Catalog completa con `filterSteps` pura (TDD, 9/9 test), `StepCatalog.tsx` Client Component con tabella shadcn, filtri query/area/status, badge Boots-colored (#FF6B2C/#2ECC71/#9CA3AF) e double-click→editor via `encodeURIComponent`.

---

## Tasks Completed

| # | Task | Commit | Files chiave |
|---|------|--------|-------------|
| 1 (RED) | Test failing per filterSteps/uniqueAreas/uniqueStatuses | `55ac45e` | `__tests__/lib/catalog.test.ts` |
| 1 (GREEN) | filterSteps + uniqueAreas + uniqueStatuses puri | `a8d5328` | `src/lib/catalog.ts` |
| 2 | StepCatalog.tsx + page.tsx aggiornato | `75c3cb6` | `src/components/StepCatalog.tsx`, `src/app/page.tsx` |

---

## Verification Results

- `cd web-ui && npx vitest run` → 3 test file, 13 test, tutti verdi
  - `__tests__/lib/catalog.test.ts`: 8 test (filterSteps 6 behavior + 3 facets — 1 dupplicato come 4b)
  - `__tests__/lib/repo.test.ts`: 4 test (invariati da piano 01)
  - `__tests__/api/catalog.test.ts`: 1 test (invariato da piano 01)
- `cd web-ui && npx tsc --noEmit` → exit 0

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fix tipo `string | null` in `Select.onValueChange`**
- **Found during:** Task 2 (tsc check)
- **Issue:** `@base-ui/react/select` tipizza `onValueChange` come `(value: string | null) => void`. Il piano assumeva il tipo fosse `string`. Risultava `TS2345: Argument of type 'string | null' is not assignable to SetStateAction<string>`.
- **Fix:** Sostituiti i setter con `(v ?? '') === '__all__' ? '' : (v ?? '')` per gestire `null` in modo sicuro.
- **Files modified:** `web-ui/src/components/StepCatalog.tsx`
- **Commit:** `75c3cb6`

**2. [Rule 2 - Missing] Sentinella `__all__` per reset filtro Select**
- **Found during:** Task 2 (implementazione)
- **Issue:** base-ui Select non supporta valore vuoto `''` come opzione nativa (item con `value=""` causa warning). Il piano non specificava come implementare il reset "Tutte le aree/Tutti gli status".
- **Fix:** Aggiunto item con `value="__all__"` e logica in `onValueChange` che mappa `__all__` → `''` (nessun filtro).
- **Files modified:** `web-ui/src/components/StepCatalog.tsx`
- **Commit:** `75c3cb6`

---

## Known Stubs

Nessuno stub nuovo in questo piano. Gli stub esistenti da piano 01 rimangono invariati:

| File | Descrizione | Piano che la implementa |
|------|-------------|------------------------|
| `web-ui/src/app/api/import/route.ts` | POST restituisce 501 | Plan 04-03 |
| `web-ui/src/app/api/download/route.ts` | GET restituisce 501 | Plan 04-04 |
| `web-ui/src/app/editor/page.tsx` | Placeholder senza componente | Plan 04-03 |
| `web-ui/src/app/features/page.tsx` | Placeholder senza componente | Plan 04-04 |

---

## Threat Flags

Nessun nuovo surface di sicurezza.

- T-04-05 mitigato: `encodeURIComponent('Given ' + step.expression)` applicato prima di `router.push` → l'URL è sempre safe, l'editor leggerà il valore come testo plain.

---

## Checkpoint Pending

Il Task 3 (`checkpoint:human-verify`) richiede verifica visiva in browser su `http://localhost:3000`.

**Comandi per la verifica:**
```bash
cd web-ui && npm run dev
```
Poi aprire `http://localhost:3000` e verificare:
1. Tabella con ~18 step (colonne Expression/Area/Status/App)
2. Ricerca testuale su expression (es. "basket" → filtra)
3. Dropdown area (es. "auth") e status (es. "implemented")
4. Badge: wanted = arancio, implemented = verde, deprecated = grigio
5. Double click su riga → naviga a `/editor?step=Given%20...`

---

## Self-Check: PASSED

File chiave verificati:
- `web-ui/src/lib/catalog.ts` — FOUND
- `web-ui/src/components/StepCatalog.tsx` — FOUND
- `web-ui/__tests__/lib/catalog.test.ts` — FOUND
- `web-ui/src/app/page.tsx` — FOUND (StepCatalog montato)

Commit verificati:
- `55ac45e` — FOUND (test RED)
- `a8d5328` — FOUND (catalog.ts GREEN)
- `75c3cb6` — FOUND (StepCatalog.tsx + page.tsx)
