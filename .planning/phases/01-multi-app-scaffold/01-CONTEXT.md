# Phase 1: Multi-App Scaffold - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Ristrutturare il layout `src/` da mono-app (`src/<layer>/<area>/`) a multi-app
(`src/<layer>/<app>/<area>/`) con placeholder app-a (contenuto attuale migrato)
e app-b (directory vuote). Tutti i test continuano a passare sui nuovi path.
`npm run catalog` funziona senza errori dopo il move.

Nessuna nuova funzionalità. Nessuna modifica a `src/support/`. Nessuna modifica
ai glob di `cucumber.js` o a `tsconfig.json` (già compatibili con la nuova struttura).

</domain>

<decisions>
## Implementation Decisions

### Struttura directory target

- **D-01:** Layout finale: `src/<layer>/app-a/<area>/` per tutto il codice esistente.
  Mapping esatto:
  - `src/features/auth/` → `src/features/app-a/auth/`
  - `src/features/orders/` → `src/features/app-a/orders/`
  - `src/steps/auth/` → `src/steps/app-a/auth/`
  - `src/steps/orders/` → `src/steps/app-a/orders/`
  - `src/actions/auth.actions.ts` → `src/actions/app-a/auth.actions.ts`
  - `src/actions/orders.actions.ts` → `src/actions/app-a/orders.actions.ts`
  - `src/pages/login.page.ts` → `src/pages/app-a/login.page.ts`
  - `src/pages/cart.page.ts` → `src/pages/app-a/cart.page.ts`
- **D-02:** `src/support/` resta invariato (app-agnostico).

### app-b placeholder

- **D-03:** app-b è rappresentato da directory vuote con `.gitkeep`:
  - `src/features/app-b/.gitkeep`
  - `src/steps/app-b/.gitkeep`
  - `src/actions/app-b/.gitkeep`
  - `src/pages/app-b/.gitkeep`
  Nessun codice, nessun test. Documenta la struttura attesa, zero rumore.

### Catalog bridge (extract-steps.ts)

- **D-04:** Fix minimale a `scripts/extract-steps.ts`: aggiorna la regex di domain
  derivation per gestire path a 3 livelli (`steps/<app>/<area>/`). Il domain dopo
  il fix diventa `"app-a"` (solo il primo segmento dopo `steps/`). La derivazione
  `app+area` completa arriverà in Phase 2.
  - Regex attuale (ipotetica): `steps/([^/]+)/` → produce `"auth"`
  - Regex Phase 1: `steps/([^/]+)(?:/[^/]+)?/` → produce `"app-a"` (primo segmento)
  - Non rompere: se il path ha solo 2 segmenti (es. legacy), usa il primo come domain.

### Import path strategy

- **D-05:** Mantieni import relativi aggiornati, nessun TypeScript path alias.
  Gli import diventano più profondi (3 livelli), aggiornati manualmente durante il move.
  Esempio: `../../actions/auth.actions` → `../../../actions/app-a/auth.actions`

### Verifica post-move

- **D-06:** Criteri di successo vincolanti (tutti e quattro devono passare):
  1. `npm test` → 5 scenari / 18 step / 0 undefined
  2. `npm run catalog` → esegue senza errori, produce step-catalog.json con domain `"app-a"`
  3. `tsc --noEmit` → 0 errori
  4. Nessun path legacy (`src/features/auth/`, `src/steps/auth/`, ecc.) rimasto in repository

### Claude's Discretion

- Ordine delle operazioni durante il move (move dirs in una volta o file per file)
- Se usare `git mv` per preservare la storia git dei file
- Struttura interna del commit (uno o più commit atomici)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architettura e convenzioni
- `CONTRIBUTING.md` — Regole architetturali 4 layer, step canonici, @intent, anti-rumore
- `ROADMAP.md` §9.1 — Specifica esatta del refactor multi-app con mapping di path
- `.planning/REQUIREMENTS.md` — INFRA-01 (requirement di questa fase)

### Configurazione corrente
- `cucumber.js` — Glob paths attuali (non cambiano dopo il move)
- `tsconfig.json` — Include paths attuali (non cambiano)
- `scripts/extract-steps.ts` — Script da aggiornare minimalmente per D-04

### Codebase esistente (file da spostare)
- `src/steps/auth/auth.steps.ts` — Import relativi da aggiornare
- `src/steps/orders/orders.steps.ts` — Import relativi da aggiornare
- `src/actions/auth.actions.ts` — Da spostare in app-a/
- `src/actions/orders.actions.ts` — Da spostare in app-a/
- `src/pages/login.page.ts` — Da spostare in app-a/
- `src/pages/cart.page.ts` — Da spostare in app-a/

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/support/world.ts` — CustomWorld: resta invariato, non si sposta
- `src/support/hooks.ts` — Before/After hooks: restano invariati
- `cucumber.js` — Glob `src/steps/**/*.ts` e `src/features/**/*.feature`: già compatibili con la nuova struttura nested, nessuna modifica

### Established Patterns
- Import relativi: tutti gli step usano `../../actions/` e `../../support/world`. Dopo il move diventano `../../../actions/app-a/` e `../../../support/world`.
- JSDoc `@page`, `@intent`, `@pre`, `@post`: da preservare invariati nei file spostati.

### Integration Points
- `scripts/extract-steps.ts` è l'unico punto di integrazione che richiede una modifica (D-04): la regex di domain derivation deve gestire path a 3 livelli senza rompere path a 2 livelli.

</code_context>

<specifics>
## Specific Ideas

- Git history preservation: valutare `git mv` invece di delete+create per mantenere la storia dei file spostati.
- Il fix di extract-steps.ts deve essere retrocompatibile: path a 2 livelli (es. `steps/common/`) devono continuare a funzionare.

</specifics>

<deferred>
## Deferred Ideas

- Domain format completo (`app/area`): rimandato a Phase 2 (INFRA-02, INFRA-03)
- TypeScript path aliases (@app-a/*): deciso di non aggiungere (D-05)
- app-b con scenario funzionante: fuori scope per ora

</deferred>

---

*Phase: 01-multi-app-scaffold*
*Context gathered: 2026-06-09*
