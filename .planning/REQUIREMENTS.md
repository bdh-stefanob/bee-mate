# Requirements: bdd-automation-scaffold

**Defined:** 2026-06-09
**Core Value:** I QA riusano step esistenti — zero rumore inventato — grazie a tre meccanismi deterministici: autocomplete vincolato sull'extension, validazione pre-commit, gate CI.

## v1 Requirements

### Infrastructure — Multi-App & Catalog Pipeline

- [ ] **INFRA-01**: Lo scaffold supporta struttura multi-app src/<layer>/<app>/<area>/ con i placeholder app-a/app-b funzionanti (5 scenari/18 step passano sui nuovi path)
- [ ] **INFRA-02**: extract-steps.ts deriva app e area dal path del file step (steps/<app>/<area>/), produce catalog con campi app, area, domain come <app>/<area>
- [ ] **INFRA-03**: extract-steps.ts riconosce JSDoc tags @wanted, @deprecated, @replacedBy, @requester, @assignee e produce catalog con campo status (implemented|wanted|deprecated)
- [ ] **INFRA-04**: Il CI rigira npm run catalog su push a main e committa step-catalog.json + STEP_CATALOG.md automaticamente (con [skip ci] per evitare loop)
- [ ] **INFRA-05**: Il gate CI validate:steps blocca le PR che introducono step non nel catalog (copre chi bypassa il pre-commit locale)

### VS Code Extension — Core Features

- [ ] **EXT-01**: Il tipo CatalogStep nell'extension include status, replacedBy, requester, assignee, app, area (retrocompatibile con catalog senza questi campi)
- [ ] **EXT-02**: CompletionProvider mostra step @wanted con label "WANTED" e step @deprecated ordinati per ultimi con @replacedBy evidenziato
- [ ] **EXT-03**: DiagnosticCollection fornisce squiggle live su ogni step del .feature aperto che non corrisponde ad alcuno step del catalog
- [ ] **EXT-04**: TreeDataProvider mostra sidebar "Step Catalog" con step raggruppati per dominio, con distinzione visiva implemented/wanted/deprecated
- [ ] **EXT-05**: HoverProvider mostra @intent + file:line del codice sorgente on hover sullo step nel .feature

### VS Code Extension — Workflow Features

- [ ] **EXT-06**: Il comando "Open PR with current .feature" apre una PR via gh CLI senza richiedere accesso al terminale manuale
- [ ] **EXT-07**: CodeAction "Request step implementation" su step non nel catalog genera stub @wanted in src/steps/<app>/<area>/<area>.steps.ts e apre PR con label step-wanted

### Extension Quality

- [ ] **QUAL-01**: L'extension ha almeno un test E2E con @vscode/test-electron che copre CompletionProvider e DiagnosticProvider (smoke test)
- [ ] **QUAL-02**: Il CI produce un artifact .vsix tramite vsce package scaricabile da ogni release/run

## v2 Requirements

### Catalog Site (5.1 — backlog)

- **SITE-01**: Astro Starlight catalog site deployato su GitHub Pages con search full-text sul catalog
- **SITE-02**: Decisione "pubblico vs auth-gated" presa prima del deploy

### Developer Tooling (backlog)

- **TOOL-01**: Script generate-snippets.ts produce .vscode/cucumber-steps.code-snippets dal catalog per i QA tecnici senza extension
- **TOOL-02**: Script harvest-from-features.ts analizza .feature legacy, identifica step ricorrenti e near-duplicati, propone candidati al catalog (5.7)
- **TOOL-03**: Claude Code skill feature-author genera .feature bozza riusando step dal catalog (5.3)

### Reporting (backlog)

- **RPRT-01**: multiple-cucumber-html-reporter configurato con URL fisso su GitHub Pages dopo ogni CI run (5.5)

### Jira Integration (improvement)

- **JIRA-01**: jira-sync.ts usa Bearer token invece di Basic Auth (migrazione deprecation Atlassian)
- **JIRA-02**: jira-sync.ts usa @cucumber/gherkin per il parsing dei .feature (rimpiazza regex custom)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Webapp authoring hosted | GitHub Pages è pubblico su piano free; VS Code extension copre il bisogno senza gestire credenziali |
| Dashboard custom dei run | multiple-cucumber-html-reporter già disponibile, nessuna custom UI da costruire |
| AI generativa libera per QA (Copilot/LLM suggestions) | Rompe la calibrazione deterministica; solo lookup su catalog |
| Xray / Cucumber Studio integration | A pagamento; da valutare prima di committarsi a ulteriori settimane di dev |
| Implementazione automatica body step definition | La logica Playwright non è inferibile dal testo Gherkin; solo scheletri |
| Remote catalog endpoint HTTP (Model B) | Implementato aggiungendo RemoteLoader solo quando il team aziendale lo richiede esplicitamente |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 2 | Pending |
| INFRA-03 | Phase 2 | Pending |
| EXT-01 | Phase 2 | Pending |
| INFRA-04 | Phase 3 | Pending |
| INFRA-05 | Phase 3 | Pending |
| EXT-02 | Phase 4 | Pending |
| EXT-03 | Phase 4 | Pending |
| EXT-04 | Phase 4 | Pending |
| EXT-05 | Phase 4 | Pending |
| EXT-06 | Phase 5 | Pending |
| EXT-07 | Phase 5 | Pending |
| QUAL-01 | Phase 6 | Pending |
| QUAL-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-06-09*
*Last updated: 2026-06-09 — traceability filled after roadmap creation*
