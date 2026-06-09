# bdd-automation-scaffold

## What This Is

Framework di test automation BDD industrializzato per standardizzare l'authoring
di scenari Gherkin in un team QA misto (tecnici e non). Non è un singolo progetto
di test: è uno standard riutilizzabile su N applicativi web, composto da scaffold
TypeScript a 4 layer (features → steps → actions → pages), catalogo step generato
dal codice, e un'estensione VS Code come canale primario di authoring.

## Core Value

I QA riusano step esistenti — zero rumore inventato — grazie a tre meccanismi
deterministici: autocomplete vincolato sull'extension, validazione pre-commit, gate CI.

## Requirements

### Validated

- ✓ Scaffold a 4 layer (features/steps/actions/pages) con architettura mono-app demo — existing
- ✓ 5 scenari / 18 step / 0 undefined su dominio demo auth+orders — existing
- ✓ Catalogo step: pipeline extract-steps.ts → step-catalog.json + STEP_CATALOG.md — existing
- ✓ Pre-commit hook validate-steps.ts con fuzzy match Levenshtein (bypass SKIP_STEP_VALIDATION=1) — existing
- ✓ CI GitHub Actions: test run + rigenera catalog su push — existing
- ✓ VS Code extension scaffold: CompletionItemProvider + CatalogLoader/FsLoader + watcher + comandi Reload/Find — existing
- ✓ Docs-site Astro Starlight con FeatureEditor Monaco + catalog cercabile (build OK, deploy non attivato) — existing
- ✓ Script jira-sync.ts: push scenari @ticket:BOOT-XXX come commenti Jira via REST API — existing
- ✓ Step lifecycle convention (implemented/wanted/deprecated) documentata in WORKFLOW.md — existing
- ✓ Refactor scaffold mono-app → struttura multi-app src/<layer>/<app>/<area>/ — Validated in Phase 1: Multi-App Scaffold

### Active
- [ ] Estendere extract-steps.ts: domain derivato da app+area, catalog schema con status/app/area/lifecycle tags
- [ ] Aggiornare tipi VS Code extension: CatalogStep con status/replacedBy/requester/assignee
- [ ] CI: job auto-regen catalog su push (commit step-catalog.json + STEP_CATALOG.md, [skip ci])
- [ ] VS Code extension DiagnosticCollection: squiggle live su step non nel catalog
- [ ] VS Code extension TreeDataProvider: sidebar "Step Catalog" raggruppato per dominio
- [ ] VS Code extension HoverProvider: @intent + file:line on hover
- [ ] VS Code extension PR opener: comando "Open PR with current .feature" via gh CLI
- [ ] CodeAction "Request step implementation": genera stub @wanted + apre PR con label step-wanted
- [ ] CI gate validate:steps su PR (copre chi bypassa il pre-commit locale)
- [ ] VS Code extension E2E tests: @vscode/test-electron (almeno smoke su Completion + Diagnostic)
- [ ] VSIX packaging: vsce package in CI + artifact nella release

### Out of Scope

- Webapp authoring hosted — rimpiazzata dall'estensione VS Code; una webapp pubblica su GitHub Pages espone il catalog
- Dashboard custom dei run — usa multiple-cucumber-html-reporter (già disponibile)
- AI generativa libera per QA — rompe la calibrazione deterministica; solo Steve usa Claude Code per draft
- Nomi/flussi/dati aziendali reali in questo repo — repo personale e potenzialmente pubblico
- Xray / Cucumber Studio integration — a pagamento; da valutare prima di committarsi

## Context

**Team:** Steve (Automation Lead, gatekeeper step), QA manuali (authoring .feature),
SDET (implementano step, mantengono layers). AI (Claude Code) come propositore, non decisore.

**Repo status:** Git personale privato come ponte temporaneo fino all'accesso al repo aziendale Boots.
Tutti i nomi di app/flussi sono placeholder (app-a, app-b) da rinominare nel repo aziendale.

**Stato codebase al 2026-06-09 (dopo Phase 1):**
- Scaffold multi-app: src/<layer>/app-a/<area>/ con placeholder app-b; tsc OK, 0 undefined step, catalog con domain app-a
- BaseURL wired in world.ts: process.env.BASE_URL ?? "http://localhost:3000" (fix applicato in Phase 1)
- Extension: CompletionProvider funzionante; mancano diagnostic, tree view, hover, PR opener
- Docs-site: build OK, deploy GitHub Pages non attivato (decisione visibilità aperta)
- Problemi noti: credenziali hardcoded in auth.actions.ts, cucumberExprToRegex duplicata in 4 posti,
  CI non aggiunge step-catalog.json al commit automatico

**Calibrazione anti-rumore:** i suggerimenti dell'extension sono lookup su step-catalog.json,
non generazione LLM. Il catalog è SoT machine-readable committato nel repo (Model A, pull-based).

## Constraints

- **Architettura:** 4 layer rispettati sempre — mai selettori negli step, mai logica business nelle pages
- **Naming:** app-a/app-b placeholder — nomi reali vivono nel repo aziendale, non qui
- **Catalog:** generato solo via `npm run catalog` — STEP_CATALOG.md non si scrive a mano
- **Credenziali:** token/password solo in .env (gitignored) — mai nel codice o nei commit
- **Sicurezza repo:** niente dati/flussi aziendali reali — il repo è personale/potenzialmente pubblico
- **Commit style:** Conventional Commits (feat/fix/chore/docs/test)
- **Decisioni:** doc-first — cambi strutturali aggiornano ROADMAP/CONTRIBUTING/DOMAINS prima del codice

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| VS Code extension come canale primario (vs webapp hosted) | GitHub Pages è pubblico anche con repo privato su piano free; l'extension vive a fianco del framework, zero credenziali gestite | — Pending (in implementazione) |
| CatalogLoader abstraction (interface + FsLoader) | Permette di aggiungere RemoteLoader per QA senza repo senza toccare i provider | ✓ Good |
| step-catalog.json committato nel repo (Model A) | QA fanno git pull per ricevere aggiornamenti; nessun endpoint HTTP da gestire | ✓ Good |
| Multi-app con placeholder app-a/app-b | Niente nomi aziendali nel repo personale; rinomina avviene nel repo aziendale | — Pending |
| Bypass pre-commit con SKIP_STEP_VALIDATION=1 senza audit trail | Necessario per Steve in casi d'urgenza, ma invisibile nella git history | ⚠️ Revisit |
| Docs-site pubblica step-catalog.json come endpoint aperto | Accettabile oggi (repo personale, catalog placeholder); da riesaminare con flussi reali | ⚠️ Revisit |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-09 — Phase 1 complete (INFRA-01 delivered)*
