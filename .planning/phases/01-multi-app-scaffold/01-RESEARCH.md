# Phase 1: Multi-App Scaffold - Research

**Researched:** 2026-06-09
**Domain:** File system refactor + TypeScript import paths + Catalog domain derivation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Layout finale `src/<layer>/app-a/<area>/` per tutto il codice esistente. Mapping esatto:
  - `src/features/auth/` → `src/features/app-a/auth/`
  - `src/features/orders/` → `src/features/app-a/orders/`
  - `src/steps/auth/` → `src/steps/app-a/auth/`
  - `src/steps/orders/` → `src/steps/app-a/orders/`
  - `src/actions/auth.actions.ts` → `src/actions/app-a/auth.actions.ts`
  - `src/actions/orders.actions.ts` → `src/actions/app-a/orders.actions.ts`
  - `src/pages/login.page.ts` → `src/pages/app-a/login.page.ts`
  - `src/pages/cart.page.ts` → `src/pages/app-a/cart.page.ts`
- **D-02:** `src/support/` resta invariato (app-agnostico).
- **D-03:** app-b rappresentato da directory vuote con `.gitkeep` in tutti e 4 i layer.
- **D-04:** Fix minimale a `scripts/extract-steps.ts`: aggiorna la regex di domain derivation per gestire path a 3 livelli. Domain Phase 1 = `"app-a"` (solo primo segmento dopo `steps/`). Retrocompatibile con path a 2 livelli (`steps/common/`).
- **D-05:** Mantieni import relativi aggiornati, nessun TypeScript path alias.
- **D-06:** Criteri di successo vincolanti (tutti e quattro devono passare):
  1. `npm test` → 5 scenari / 18 step / 0 undefined
  2. `npm run catalog` → esegue senza errori, produce step-catalog.json con domain `"app-a"`
  3. `tsc --noEmit` → 0 errori
  4. Nessun path legacy rimasto in repository

### Claude's Discretion

- Ordine delle operazioni durante il move (move dirs in una volta o file per file)
- Se usare `git mv` per preservare la storia git dei file
- Struttura interna del commit (uno o più commit atomici)

### Deferred Ideas (OUT OF SCOPE)

- Domain format completo (`app/area`): rimandato a Phase 2 (INFRA-02, INFRA-03)
- TypeScript path aliases (`@app-a/*`): deciso di non aggiungere (D-05)
- app-b con scenario funzionante: fuori scope per ora
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Lo scaffold supporta struttura multi-app `src/<layer>/<app>/<area>/` con i placeholder app-a/app-b funzionanti (5 scenari/18 step passano sui nuovi path) | L'intera phase è questo requirement. Il refactor è un file move + import update + regex fix minimo. Nessuna dipendenza esterna. |
</phase_requirements>

---

## Summary

Phase 1 è un refactor puramente strutturale: spostare file da una gerarchia a 2 livelli (`steps/<area>/`) a una a 3 livelli (`steps/<app>/<area>/`), aggiornare i relativi import TypeScript, e fare un fix minimale alla regex di domain derivation in `extract-steps.ts`.

Il codebase attuale ha 8 file da spostare (2 features, 3 step files, 2 actions, 2 pages) più `src/steps/common/` che resta invariato. I glob di `cucumber.js` (`src/steps/**/*.ts`, `src/features/**/*.feature`) sono già ricorsivi e coprono la struttura nidificata senza modifiche. `tsconfig.json` usa `src/**/*.ts` che è parimenti invariante. Non c'è dipendenza da librerie esterne da aggiungere.

La scoperta critica della ricerca: **la regex di domain derivation in `extract-steps.ts` (`/steps\/([^\/]+)\/`) funziona già correttamente** con i nuovi path — dopo il move `src/steps/app-a/auth/auth.steps.ts` produrrà domain `"app-a"` (primo segmento catturato), e `src/steps/common/common.steps.ts` produrrà `"common"`. Il D-04 descrive una modifica che è di fatto già soddisfatta dalla regex esistente. Il planner deve includere la verifica di questo fatto, non assumere che servano modifiche alla regex.

**Primary recommendation:** Esegui il move con `git mv` per preservare la storia, aggiorna gli import in modo incrementale per file (non in batch), poi esegui `tsc --noEmit` prima di `npm test` per catturare errori di import prima ancora di lanciare i browser.

---

## Project Constraints (from CLAUDE.md)

Direttive vincolanti estratte da CLAUDE.md che il planner deve rispettare:

| Direttiva | Impatto su Phase 1 |
|-----------|--------------------|
| Architettura 4 layer: mai selettori negli step | Non toccare — già rispettato; il move non cambia nulla del comportamento layer |
| `STEP_CATALOG.md` non si scrive a mano; si rigenera con `npm run catalog` | Dopo il move, `npm run catalog` deve girare e produrre output corretto |
| Niente credenziali nel codice | `auth.actions.ts` ha `"test.user@example.com"` e `"valid-password"` hardcodati — note in STATE.md come known issue; non rimuovere durante Phase 1 (fuori scope) |
| Conventional Commits | Commit del move: `refactor:` o `chore:` |
| Niente path alias TypeScript | D-05 già allineato: nessun alias da introdurre |
| `npm test` e `npm run catalog` come comandi di verifica standard | Entrambi fanno parte dei criteri D-06 |

---

## Standard Stack

### Core (invariato — nessuna dipendenza nuova da aggiungere)

| Library | Version | Purpose | Nota Phase 1 |
|---------|---------|---------|--------------|
| `@cucumber/cucumber` | ^10.8.0 | BDD runner | Nessuna modifica — glob già ricorsivi |
| `@playwright/test` | ^1.45.0 | Browser automation | Nessuna modifica |
| `typescript` | ^5.5.0 | Compilatore | `tsc --noEmit` come gate di verifica |
| `ts-node` | ^10.9.2 | Runtime transpiler | Nessuna modifica |

**Nessuna installazione richiesta per questa phase.**

---

## Architecture Patterns

### Struttura directory target (post-move)

```
src/
├── features/
│   ├── app-a/
│   │   ├── auth/
│   │   │   └── login.feature
│   │   └── orders/
│   │       └── place-order.feature
│   └── app-b/
│       └── .gitkeep
├── steps/
│   ├── common/
│   │   └── common.steps.ts          (NON si sposta)
│   ├── app-a/
│   │   ├── auth/
│   │   │   └── auth.steps.ts
│   │   └── orders/
│   │       └── orders.steps.ts
│   └── app-b/
│       └── .gitkeep
├── actions/
│   ├── app-a/
│   │   ├── auth.actions.ts
│   │   └── orders.actions.ts
│   └── app-b/
│       └── .gitkeep
├── pages/
│   ├── app-a/
│   │   ├── login.page.ts
│   │   └── cart.page.ts
│   └── app-b/
│       └── .gitkeep
└── support/                         (NON si tocca)
    ├── world.ts
    └── hooks.ts
```

### Pattern 1: Import relativi dopo il move

**Regola:** conta i livelli di directory tra il file sorgente e il target. Ogni `../` risale di un livello.

| File sorgente | Import target | Path relativo corretto |
|---------------|---------------|------------------------|
| `src/steps/app-a/auth/auth.steps.ts` | `src/support/world` | `../../../support/world` |
| `src/steps/app-a/auth/auth.steps.ts` | `src/actions/app-a/auth.actions` | `../../../actions/app-a/auth.actions` |
| `src/steps/app-a/orders/orders.steps.ts` | `src/support/world` | `../../../support/world` |
| `src/steps/app-a/orders/orders.steps.ts` | `src/actions/app-a/orders.actions` | `../../../actions/app-a/orders.actions` |
| `src/steps/common/common.steps.ts` | `src/support/world` | `../../support/world` (invariato) |
| `src/steps/common/common.steps.ts` | `src/actions/app-a/auth.actions` | `../../actions/app-a/auth.actions` (cambia!) |
| `src/actions/app-a/auth.actions.ts` | `src/pages/app-a/login.page` | `../../pages/app-a/login.page` |
| `src/actions/app-a/orders.actions.ts` | `src/pages/app-a/cart.page` | `../../pages/app-a/cart.page` |

**Nota critica:** `src/steps/common/common.steps.ts` NON si sposta, ma il suo import di `AuthActions` deve aggiornarsi da `../../actions/auth.actions` a `../../actions/app-a/auth.actions`. Questo file è spesso trascurato nei refactor perché non cambia posizione.

### Pattern 2: git mv per preservare la storia

```bash
# Crea prima le directory target
git mv src/features/auth src/features/app-a/auth
git mv src/features/orders src/features/app-a/orders
git mv src/steps/auth src/steps/app-a/auth
git mv src/steps/orders src/steps/app-a/orders
# Per actions e pages: non hanno subdirectory, spostare singoli file
git mv src/actions/auth.actions.ts src/actions/app-a/auth.actions.ts
git mv src/actions/orders.actions.ts src/actions/app-a/orders.actions.ts
git mv src/pages/login.page.ts src/pages/app-a/login.page.ts
git mv src/pages/cart.page.ts src/pages/app-a/cart.page.ts
```

`git mv` registra il rename nel tracking di git, preservando la storia del file (`git log --follow`). Delete+create interrompe la storia.

### Pattern 3: .gitkeep per directory placeholder

```bash
# app-b placeholder directories
New-Item -ItemType Directory -Force src/features/app-b
New-Item -ItemType File src/features/app-b/.gitkeep
# ... ripeti per steps, actions, pages
```

Git non traccia le directory vuote: `.gitkeep` è il convention standard per committare una directory vuota. [ASSUMED — convenzione universale, non ha documentazione ufficiale]

### Anti-Patterns to Avoid

- **Fare il move e aggiornare gli import in un unico git commit senza `tsc --noEmit` intermedio:** i type errors saltano fuori solo al runtime di Cucumber, più difficili da localizzare. Esegui `tsc --noEmit` dopo ogni gruppo di import aggiornati.
- **Dimenticare `src/steps/common/common.steps.ts`:** questo file non cambia posizione ma il suo import verso `AuthActions` deve aggiornare il path target. È il file più probabile da dimenticare.
- **Modificare `cucumber.js` o `tsconfig.json`:** i glob sono già ricorsivi (`**`). Toccarli introduce rischio senza beneficio.
- **Modificare `src/support/`:** è app-agnostico per design (D-02). Non appartiene a nessun `<app>/`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Preservare storia git durante rename | Manuale delete+add | `git mv` | git mv registra il rename nel DAG; `git log --follow` funziona |
| Validare TypeScript dopo move | Lanciare `npm test` per scoprire errori | `tsc --noEmit` | Più veloce (non apre browser), output errori più preciso |
| Verificare che nessun path legacy sia rimasto | Ispezione manuale | `grep -r "src/steps/auth" src/` o ricerca con Grep tool | Automatizzabile, non si sbaglia |

---

## Runtime State Inventory

> Phase 1 è un refactor di file system. La sezione è applicabile.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `step-catalog.json` in root — contiene `sourceRef` con path del tipo `src/steps/auth/auth.steps.ts` | Nessuna migrazione dati: il catalog si rigenera con `npm run catalog` dopo il move. I path legacy nel catalog committato diventano obsoleti ma vengono sovrascritti. |
| Live service config | Nessuno — nessun server, nessun servizio esterno | Nessuna azione |
| OS-registered state | Nessuno — nessun task scheduler, nessun pm2 | Nessuna azione |
| Secrets/env vars | `.env` non nel repo; nessun env var usa path dei file step | Nessuna azione |
| Build artifacts | `dist/` (output `tsc`), `cucumber-messages.ndjson` (temp), `reports/cucumber-report.html` (output test) | `dist/` può essere ignorato (è rigenerato da `tsc`). Non contiene path hardcoded ai file sorgente. |

**Note importanti:**
- `step-catalog.json` è committato come SoT machine-readable. Dopo il move conterrà ancora i vecchi path finché non si rigenera. La rigenerazione via `npm run catalog` è uno dei criteri D-06 — va fatta e committata.
- `STEP_CATALOG.md` è analogamente obsoleto dopo il move: si rigenera in automatico con `npm run catalog`.

---

## Common Pitfalls

### Pitfall 1: common.steps.ts trascurato
**What goes wrong:** Il move dei file sposta `auth.steps.ts` e `orders.steps.ts` in `app-a/`, ma `common.steps.ts` resta nella sua posizione. Il suo import `../../actions/auth.actions` punta ora a un path inesistente.
**Why it happens:** Il file non si sposta, quindi sembra non richiedere attenzione. Ma il suo target di import (`auth.actions.ts`) si è spostato in `app-a/`.
**How to avoid:** Dopo ogni batch di move, eseguire `tsc --noEmit` — rileva subito i path rotti.
**Warning signs:** `tsc: Cannot find module '../../actions/auth.actions'` in `common.steps.ts`.

### Pitfall 2: Ordine di operazioni errato (import prima del move)
**What goes wrong:** Si aggiornano gli import prima di eseguire il `git mv`, causando doppia inconsistenza temporanea: i file hanno import aggiornati ma risiedono ancora nei path vecchi.
**Why it happens:** Approccio di refactoring "prepara prima gli import".
**How to avoid:** Prima `git mv` (tutti i move), poi aggiorna gli import, poi `tsc --noEmit`.
**Warning signs:** TypeScript segnala sia "module not found" (path nuovo non ancora esistente) sia errori nel file di origine.

### Pitfall 3: Dimenticare di aggiornare step-catalog.json
**What goes wrong:** Il commit finale include i file spostati ma `step-catalog.json` contiene ancora path legacy nei `sourceRef`. La VS Code extension (Phase 4) userà quei path per "go to definition" — punterà a file inesistenti.
**Why it happens:** `npm run catalog` non è nell'abituale flusso di verifica pre-commit.
**How to avoid:** Eseguire `npm run catalog` come ultimo step prima del commit finale, verificare che `sourceRef` nei JSON rifletta i nuovi path.
**Warning signs:** `sourceRef` nel catalog ha ancora `src/steps/auth/auth.steps.ts`.

### Pitfall 4: La regex di domain derivation NON richiede modifica (D-04 mal interpretato)
**What goes wrong:** Il planner crea un task separato per modificare la regex in `extract-steps.ts`, quando in realtà la regex attuale (`/steps\/([^\/]+)\/`) produce già il risultato corretto con i nuovi path.
**Why it happens:** D-04 descrive la regex "ipotetica attuale" come se producesse `"auth"`, ma la regex attuale sul path `src/steps/app-a/auth/auth.steps.ts` cattura già `"app-a"` (primo segmento dopo `steps/`).
**How to avoid:** Il task deve essere "verificare che la regex funzioni" + aggiornare il commento di documentazione in `extract-steps.ts` se necessario, non una modifica funzionale.
**Warning signs:** Modificare la regex quando i test del catalog già passano = regressione inutile.

---

## Code Examples

### Import aggiornato in auth.steps.ts (dopo il move)
```typescript
// src/steps/app-a/auth/auth.steps.ts
// Path: 3 livelli sopra per raggiungere src/, poi scende in support/ e actions/app-a/
import { CustomWorld } from "../../../support/world";
import { AuthActions } from "../../../actions/app-a/auth.actions";
```
[VERIFIED: analisi diretta del codebase — calcolo manuale dei livelli di directory]

### Import aggiornato in common.steps.ts (NON si sposta, ma import cambia)
```typescript
// src/steps/common/common.steps.ts
// Posizione invariata: 2 livelli sopra per src/, poi actions/app-a/
import { CustomWorld } from "../../support/world";           // invariato
import { AuthActions } from "../../actions/app-a/auth.actions"; // aggiornato!
```
[VERIFIED: analisi diretta del codebase]

### Import aggiornato in auth.actions.ts (dopo il move)
```typescript
// src/actions/app-a/auth.actions.ts
// 2 livelli sopra per src/, poi pages/app-a/
import { LoginPage } from "../../pages/app-a/login.page";
```
[VERIFIED: analisi diretta del codebase]

### Import aggiornato in orders.actions.ts (dopo il move)
```typescript
// src/actions/app-a/orders.actions.ts
import { CartPage } from "../../pages/app-a/cart.page";
```
[VERIFIED: analisi diretta del codebase]

### Verifica regex domain derivation (nessuna modifica necessaria)
```typescript
// scripts/extract-steps.ts — riga 128 attuale
const domainMatch = uri.match(/steps\/([^/]+)\//);
const domain = domainMatch ? domainMatch[1] : "common";
// Con uri = "src/steps/app-a/auth/auth.steps.ts"  → domain = "app-a"  ✓
// Con uri = "src/steps/common/common.steps.ts"     → domain = "common" ✓
```
[VERIFIED: esecuzione diretta node -e con i path reali]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact su Phase 1 |
|--------------|------------------|--------------|-------------------|
| `src/<layer>/<area>/` (mono-app) | `src/<layer>/<app>/<area>/` (multi-app) | Phase 1 (questo) | È il cambio che stiamo implementando |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `.gitkeep` è il convention standard per committare directory vuote | Architecture Patterns | Basso — alternativa accettata è `.keep`; entrambi funzionano |
| A2 | `git mv` su una directory con subdirectory sposta ricorsivamente tutto il contenuto | Architecture Patterns, Don't Hand-Roll | Medio — se non funzionasse ricorsivamente, necessaria una sequenza per singoli file. Verificare con `git mv src/features/auth src/features/app-a/auth` prima di fare il batch. |

---

## Open Questions (RESOLVED)

1. **`src/steps/common/` va spostato in `src/steps/app-a/common/` o resta in `src/steps/common/`?**
   - What we know: DOMAINS.md §3 mostra `steps/common/` alla radice (non sotto `app-a/`). CONTEXT.md D-01 non include `common.steps.ts` nel mapping da aggiornare. CONTRIBUTING.md dice che `common/` è per step "davvero trasversali a più app".
   - What's unclear: Il mapping D-01 non menziona `common.steps.ts` — questo implica che resta in `steps/common/` (non `steps/app-a/common/`).
   - Recommendation: Lascia `src/steps/common/common.steps.ts` nella posizione attuale. Aggiorna solo il suo import interno verso il nuovo path di `auth.actions.ts`. Questo è allineato con D-02 (solo `support/` dichiarato invariato, ma `common/` segue la stessa logica cross-app).
   - **RESOLVED:** `src/steps/common/common.steps.ts` resta in `src/steps/common/` (non si sposta). Solo il suo import verso `auth.actions.ts` viene aggiornato da `../../actions/auth.actions` a `../../actions/app-a/auth.actions`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `tsc --noEmit`, `npm test`, `npm run catalog` | Da verificare in esecuzione | 24.12.0 (sviluppatore) | — |
| `git` | `git mv` | Da verificare | Presente (repo git attivo) | Move manuale + `git add` + `git rm` |
| `npx tsc` | Verifica compile-time | Installato come devDep | ^5.5.0 | — |

**Note:** Nessuna dipendenza esterna aggiuntiva richiesta per questa phase. L'unica dipendenza degna di nota è `git mv` — se non disponibile (raro), il fallback è move manuale con `git rm` + `git add`, che però non preserva la storia.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `@cucumber/cucumber` ^10.8.0 |
| Config file | `cucumber.js` (root) |
| Quick run command | `npx tsc --noEmit` (compile gate, < 5 sec) |
| Full suite command | `npm test` (5 scenari, lancia browser headless) |
| Catalog command | `npm run catalog` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Note |
|--------|----------|-----------|-------------------|------|
| INFRA-01 sc1 | Directory organizzate come `src/<layer>/app-a/<area>/` | structural | `dir src/features/app-a` + `dir src/steps/app-a` | Verifica file system |
| INFRA-01 sc2 | `npm test` passa 5 scenari / 18 step / 0 undefined | integration | `npm test` | Gate principale |
| INFRA-01 sc3 | `npm run catalog` produce domain `"app-a"` | integration | `npm run catalog` + ispezione JSON | Verifica output catalog |
| INFRA-01 sc4 | Nessun path legacy nel repository | structural | `grep -r "src/steps/auth" src/` (deve dare 0 risultati) | Verifica negativa |
| D-06 | `tsc --noEmit` → 0 errori | compile | `npx tsc --noEmit` | Gate TypeScript |

### Sampling Rate
- **Dopo ogni batch di move:** `npx tsc --noEmit`
- **Dopo aggiornamento import:** `npx tsc --noEmit`
- **Gate finale:** `npm test` + `npm run catalog` (entrambi devono essere verdi)

### Wave 0 Gaps

Nessuno — il test framework esistente copre tutti i criteri. Non servono nuovi file di test: questa phase è un refactor strutturale verificabile con gli strumenti già presenti (`tsc`, `npm test`, `npm run catalog`).

---

## Security Domain

Phase 1 è un refactor file-system puro. Nessuna modifica a logica di autenticazione, endpoint, credenziali, o configurazione di sicurezza. ASVS non applicabile a questa phase.

**Known issue ereditato (fuori scope Phase 1):** `src/actions/auth.actions.ts` contiene credenziali hardcoded (`"test.user@example.com"`, `"valid-password"`). Documentato in STATE.md come known issue. Non rimuovere durante Phase 1.

---

## Sources

### Primary (HIGH confidence)
- Analisi diretta del codebase: `scripts/extract-steps.ts` (riga 128), `cucumber.js`, `tsconfig.json`, tutti i file `src/`
- Esecuzione diretta Node.js per verifica regex domain derivation
- `CONTEXT.md` Phase 1 — decisioni bloccate D-01..D-06
- `CONTRIBUTING.md` — regole architetturali 4 layer
- `DOMAINS.md` §3 — struttura filesystem multi-app target

### Secondary (MEDIUM confidence)
- `STATE.md` — known issues ereditati

### Tertiary (LOW confidence)
- Nessuno

---

## Metadata

**Confidence breakdown:**
- Mapping file/directory: HIGH — inventario completo del codebase, tutti i file verificati
- Import path calculations: HIGH — calcolo matematico verificato con script Node.js
- Regex domain derivation: HIGH — eseguita e testata direttamente
- Comportamento `git mv` ricorsivo: MEDIUM — assunto standard, non testato in questa sessione
- Convenzione `.gitkeep`: MEDIUM — assunta universale, non ha spec ufficiale

**Research date:** 2026-06-09
**Valid until:** Stabile — nessuna dipendenza esterna, la validità è legata solo al codebase che non cambierà fino all'esecuzione di questa phase.
