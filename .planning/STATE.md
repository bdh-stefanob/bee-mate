---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-06-09T20:01:58.488Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 4
  completed_plans: 1
  percent: 25
---

# Project State — bdd-automation-scaffold

*Last updated: 2026-06-09*

---

## Project Reference

**Core Value:** I QA riusano step esistenti — zero rumore inventato — grazie a tre meccanismi deterministici: autocomplete vincolato sull'extension, validazione pre-commit, gate CI.

**Current Focus:** Phase 02 — Catalog Pipeline Upgrade

---

## Current Position

Phase: 02 (Catalog Pipeline Upgrade) — EXECUTING
Plan: 1 of 3
| Field | Value |
|-------|-------|
| Current Phase | 1 — Multi-App Scaffold |
| Current Plan | Not started |
| Status | Not started |
| Phase Goal | Lo scaffold supporta struttura multi-app e tutti i test continuano a passare |

**Progress:**

```
Phase 1 [          ] 0%
Phase 2 [          ] 0%
Phase 3 [          ] 0%
Phase 4 [          ] 0%
Phase 5 [          ] 0%
Phase 6 [          ] 0%
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 6 |
| Phases complete | 0 |
| Requirements mapped | 14/14 |
| Requirements delivered | 0/14 |

---

## Accumulated Context

### Key Decisions (at roadmap creation)

- INFRA-01 first: il refactor multi-app è propedeutico a tutti i path-based requirement successivi
- INFRA-02 + INFRA-03 + EXT-01 in un'unica phase: il catalog schema e i tipi dell'extension devono essere allineati prima di costruire i provider
- CI in Phase 3 separata: logicamente dopo che il catalog schema è stabile (Phase 2), ma prima dei feature estensivi
- EXT-03 (DiagnosticCollection) in Phase 4 prima di EXT-07 (CodeAction) in Phase 5: la CodeAction si appoggia sul DiagnosticProvider
- QUAL-01 + QUAL-02 ultimi: i test E2E e il packaging hanno senso solo dopo che i feature sono completi

### Known Issues (inherited from existing codebase)

- Credenziali hardcoded in auth.actions.ts — da risolvere durante il refactor multi-app (Phase 1)
- cucumberExprToRegex duplicata in 4 punti — cleanup opportunistico
- CI non aggiunge step-catalog.json al commit automatico — risolto in Phase 3
- baseURL non passato al browser context — noto, non bloccante per v1

### Todos

- [ ] Phase 1: verificare import statements dopo il refactor di path
- [ ] Phase 2: aggiungere step @wanted demo al dominio app-a/auth per validare il rendering
- [ ] Phase 3: configurare git identity nel CI job per il commit automatico

### Blockers

None

---

## Session Continuity

**To resume:** Leggi `.planning/ROADMAP.md` per la struttura delle phase, poi usa `/gsd-plan-phase 1` per iniziare.

**Commands:**

```bash
npm test             # 5 scenari / 18 step / 0 undefined
npm run test:dry     # dry-run senza eseguire
npm run catalog      # rigenera STEP_CATALOG.md + step-catalog.json
```

**Repo status at init:**

- scaffold: tsc OK, 5 scenari, 18 step, 0 undefined
- extension: CompletionProvider funzionante; mancano diagnostic, tree view, hover, PR opener
- docs-site: build OK, deploy non attivato
- CI: test run OK; catalog auto-commit non funzionante
