# GSD Roadmap — bdd-automation-scaffold

**Milestone:** v1 — Multi-app scaffold + VS Code extension industrializzata
**Granularity:** standard
**Coverage:** 14/14 v1 requirements mapped
**Created:** 2026-06-09

---

## Phases

- [ ] **Phase 1: Multi-App Scaffold** — Ristruttura il repo da mono-app a multi-app con placeholder app-a/app-b; tutti i test continuano a passare sui nuovi path
- [ ] **Phase 2: Catalog Pipeline Upgrade** — Estende extract-steps.ts con app/area/status e allinea i tipi dell'extension al nuovo schema
- [ ] **Phase 3: CI Automation** — Rigenera e committa il catalog in CI; blocca le PR con step non censiti
- [ ] **Phase 4: Extension Diagnostics & Catalog UX** — CompletionProvider arricchito, squiggle live, sidebar Step Catalog, hover @intent
- [ ] **Phase 5: Extension Workflow** — Comandi PR opener e CodeAction "Request step implementation"
- [ ] **Phase 6: Extension Quality** — Test E2E smoke e VSIX packaging in CI

---

## Phase Details

### Phase 1: Multi-App Scaffold
**Goal**: Lo scaffold supporta struttura multi-app e tutti i test continuano a passare
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01
**Success Criteria** (what must be TRUE):
  1. Le directory src/ sono organizzate come src/<layer>/app-a/<area>/ con placeholder app-a e app-b presenti
  2. `npm test` passa 5 scenari / 18 step / 0 undefined sui nuovi path
  3. `npm run catalog` rigenera step-catalog.json senza errori e il domain riflette i nuovi path
  4. `cucumber.js` e tsconfig.json puntano ai nuovi glob path (nessun path legacy hardcoded)
**Plans**: TBD

### Phase 2: Catalog Pipeline Upgrade
**Goal**: Il catalog contiene app, area, status per ogni step; l'extension li conosce
**Depends on**: Phase 1
**Requirements**: INFRA-02, INFRA-03, EXT-01
**Success Criteria** (what must be TRUE):
  1. Ogni entry in step-catalog.json ha i campi app, area, domain (come <app>/<area>) e status (implemented/wanted/deprecated)
  2. `npm run catalog` riconosce i JSDoc tag @wanted, @deprecated, @replacedBy, @requester, @assignee e li serializza correttamente
  3. Il tipo CatalogStep nell'extension include tutti i nuovi campi ed è retrocompatibile (catalog vecchio senza quei campi non causa errori runtime)
  4. STEP_CATALOG.md rende visibili lo status e il domain aggiornato (incluso almeno uno step @wanted demo)
**Plans**: TBD

### Phase 3: CI Automation
**Goal**: Il catalog si mantiene aggiornato automaticamente in CI e le PR con step inventati vengono bloccate
**Depends on**: Phase 2
**Requirements**: INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Un push a main che modifica file in src/steps/ trigghera il job CI che committa step-catalog.json + STEP_CATALOG.md aggiornati con messaggio [skip ci]
  2. Una PR che introduce uno step non presente nel catalog viene bloccata dal gate CI validate:steps
  3. Una PR con soli step esistenti nel catalog supera il gate senza errori
  4. Il loop CI (il commit automatico non trigghera un secondo run) non si verifica
**Plans**: TBD

### Phase 4: Extension Diagnostics & Catalog UX
**Goal**: L'extension fornisce feedback live sullo stato degli step e navigazione visiva del catalog
**Depends on**: Phase 2
**Requirements**: EXT-02, EXT-03, EXT-04, EXT-05
**Success Criteria** (what must be TRUE):
  1. Aprendo un .feature, ogni step non nel catalog mostra un squiggle (warning/error) in tempo reale senza salvare
  2. La sidebar "Step Catalog" mostra tutti gli step raggruppati per dominio con icone/label distinte per implemented, wanted, deprecated
  3. Hovering su uno step in un .feature mostra il testo @intent e il file:line della step definition
  4. CompletionProvider presenta step @wanted con label "WANTED" e step @deprecated in coda con @replacedBy evidenziato
**Plans**: TBD
**UI hint**: yes

### Phase 5: Extension Workflow
**Goal**: L'extension permette di aprire PR e richiedere nuovi step senza uscire da VS Code
**Depends on**: Phase 4
**Requirements**: EXT-06, EXT-07
**Success Criteria** (what must be TRUE):
  1. Il comando "Open PR with current .feature" apre una PR via gh CLI con il file .feature attivo come branch, senza richiedere accesso manuale al terminale
  2. Il CodeAction "Request step implementation" su uno step con squiggle genera uno stub @wanted nel file steps corretto e apre una PR con label step-wanted
  3. Entrambi i comandi comunicano errori comprensibili all'utente se gh CLI non è installato o non autenticato
**Plans**: TBD

### Phase 6: Extension Quality
**Goal**: L'extension ha copertura E2E smoke e può essere distribuita come VSIX da ogni run CI
**Depends on**: Phase 5
**Requirements**: QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. Il test E2E con @vscode/test-electron esegue smoke su CompletionProvider (almeno un suggerimento restituito) e DiagnosticProvider (almeno uno squiggle su step non nel catalog)
  2. Il CI produce un artifact .vsix scaricabile da ogni run/release tramite vsce package
  3. I test E2E passano in CI senza richiedere display fisico (headless o xvfb configurato)
**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Multi-App Scaffold | 0/? | Not started | - |
| 2. Catalog Pipeline Upgrade | 0/? | Not started | - |
| 3. CI Automation | 0/? | Not started | - |
| 4. Extension Diagnostics & Catalog UX | 0/? | Not started | - |
| 5. Extension Workflow | 0/? | Not started | - |
| 6. Extension Quality | 0/? | Not started | - |

---

## Coverage Map

| Requirement | Phase |
|-------------|-------|
| INFRA-01 | Phase 1 |
| INFRA-02 | Phase 2 |
| INFRA-03 | Phase 2 |
| EXT-01 | Phase 2 |
| INFRA-04 | Phase 3 |
| INFRA-05 | Phase 3 |
| EXT-02 | Phase 4 |
| EXT-03 | Phase 4 |
| EXT-04 | Phase 4 |
| EXT-05 | Phase 4 |
| EXT-06 | Phase 5 |
| EXT-07 | Phase 5 |
| QUAL-01 | Phase 6 |
| QUAL-02 | Phase 6 |

**Mapped: 14/14**

---

*Created: 2026-06-09*
