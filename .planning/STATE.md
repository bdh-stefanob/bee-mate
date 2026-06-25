---
gsd_state_version: 1.0
milestone: v0.2.0
milestone_name: milestone
status: unknown
stopped_at: Completed 999.13-05-PLAN.md (phase 999.13 complete)
last_updated: "2026-06-25T14:47:40.118Z"
progress:
  total_phases: 13
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# Project State — bdd-automation-scaffold

*Last updated: 2026-06-25*

---

## Project Reference

**Core Value:** I QA riusano step esistenti — zero rumore inventato — grazie a tre meccanismi deterministici: autocomplete vincolato sull'extension, validazione pre-commit, gate CI.

**Current Focus:** Phase 999.13 — Feature file import + sezione Tags/Hashtag (COMPLETA — 5/5 piani, verifica visiva end-to-end approvata)

---

## Current Position

Phase: 999.13 (feature-file-import-nell-editor-sezione-tags-hashtag) — COMPLETE
Plan: 5 of 5

| Field | Value |
|-------|-------|
| Current Phase | 999.13 — feature-file-import-nell-editor-sezione-tags-hashtag |
| Current Plan | 5/5 (tutti i piani completati, verifica visiva end-to-end approvata) |
| Status | PHASE COMPLETE |
| Phase Goal | Upload .feature in editor, dialog proposta step con page marker, pagina /tags, fix import tag-aware, import alberato App/Flow |

**Progress:**

[██████████] 100% — 5/5 piani completati (fase 999.13 chiusa)

```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 5 |
| Phases complete | 5 |
| Plans total | 13 |
| Plans complete | 13 |
| Requirements mapped | 14/14 |
| Phase 999.13 P04 | 12 min | 2 tasks | 1 files |
| Phase 999.13 P05 | 40 min | 3 tasks | 3 files |

### Execution Log

| Phase/Plan | Duration | Tasks | Files |
|------------|----------|-------|-------|
| Phase 05 P01 | — | 2 tasks | — |
| Phase 05 P02 | — | 2 tasks | — |
| Phase 05 P03 | 12 min | 2 tasks | 3 files |
| Phase 05 P04 | 15 min | 2 tasks | 3 files |
| Phase 05 P05 | 20 min | 3 tasks (incl. checkpoint) | 5 files |
| Phase 999.13 P01 | 12 min | 2 tasks | 2 files |
| Phase 999.13 P02 | 8 min | 1 task | 1 file |
| Phase 999.13 P03 | 15 min | 2/3 tasks (checkpoint pending) | 5 files |

---

## Accumulated Context

### Key Decisions

- INFRA-01 first: il refactor multi-app è propedeutico a tutti i path-based requirement successivi
- INFRA-02 + INFRA-03 + EXT-01 in un'unica phase: il catalog schema e i tipi dell'extension devono essere allineati prima di costruire i provider
- CI in Phase 3 separata: logicamente dopo che il catalog schema è stabile (Phase 2), ma prima dei feature estensivi
- EXT-03 (DiagnosticCollection) in Phase 4 prima di EXT-07 (CodeAction) in Phase 5: la CodeAction si appoggia sul DiagnosticProvider
- QUAL-01 + QUAL-02 ultimi: i test E2E e il packaging hanno senso solo dopo che i feature sono completi
- Checkpoint 05-05 Task 3 approvato (verified-pending): verifica visiva desktop confermata dall'utente il 2026-06-10, approfondimento programmato dall'utente in seguito
- 999.13-01: .feature verbatim load in nuovo tab via onLoadFeature prop e openContentInNewTab
- 999.13-02: justLoadedTabId flag + useEffect dopo unknownSteps useMemo apre pannello proposta con step e page marker pre-selezionati dopo upload .feature
- 999.13-03: extractPageMarkers replica PAGE_MARKER_RE di _content.tsx (transitiva); GET /api/tags senza parametri client per sicurezza T-999.13-01; relpath POSIX nella risposta
- 999.13-04: buildFeatureContent cerca tag originale in rawHeaderLines invece di forzare @area; derivazione area usa feature.name → headerTags → 'imported' (rimosso slugify(inputBasename))
- 999.13-05: FeatureImportDialog import alberato — app/flow auto-derivati da tag line + fallback primo page marker; anti-overwrite client-side con confronto coda path normalizzata; slugify replicato localmente (nessuna util condivisa in web-ui/src/lib); verifica visiva end-to-end fase 999.13 approvata dall'utente (tag originale + # #PAGINA preservati, nessun @import<timestamp>)

### Known Issues (inherited from existing codebase)

- Credenziali hardcoded in auth.actions.ts — da risolvere durante il refactor multi-app (Phase 1)
- cucumberExprToRegex duplicata in 4 punti — cleanup opportunistico
- CI non aggiunge step-catalog.json al commit automatico — risolto in Phase 3
- baseURL non passato al browser context — noto, non bloccante per v1

### Todos

- [ ] Phase 1: verificare import statements dopo il refactor di path
- [ ] Phase 2: aggiungere step @wanted demo al dominio app-a/auth per validare il rendering
- [ ] Phase 3: configurare git identity nel CI job per il commit automatico
- [ ] Verifica visiva layout desktop 1280px (checkpoint 05-05 Task 3 — pending dall'utente)

### Blockers

None

---

## Session Continuity

**Stopped at:** Completed 999.13-05-PLAN.md (phase 999.13 complete)

**Commands:**

```bash
npm test             # 5 scenari / 18 step / 0 undefined
npm run test:dry     # dry-run senza eseguire
npm run catalog      # rigenera STEP_CATALOG.md + step-catalog.json
cd web-ui && npm run dev   # avvia web-ui per verifica visiva

```

**Repo status (Phase 05 complete):**

- scaffold: tsc OK, 5 scenari, 18 step, 0 undefined
- web-ui: Next.js app con catalog, editor, features, settings, GitHub push API, Jira sync API
- extension: CompletionProvider funzionante; mancano diagnostic, tree view, hover, PR opener
- docs-site: build OK, deploy non attivato
- CI: test run OK; catalog auto-commit non funzionante
