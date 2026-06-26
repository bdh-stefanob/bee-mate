---
gsd_state_version: 1.0
milestone: v0.2.0
milestone_name: milestone
status: unknown
stopped_at: Checkpoint 999.17-04 Task 2 — awaiting human-verify
last_updated: "2026-06-26T10:10:44.384Z"
progress:
  total_phases: 17
  completed_phases: 6
  total_plans: 18
  completed_plans: 18
  percent: 100
---

# Project State — bdd-automation-scaffold

*Last updated: 2026-06-26*

---

## Project Reference

**Core Value:** I QA riusano step esistenti — zero rumore inventato — grazie a tre meccanismi deterministici: autocomplete vincolato sull'extension, validazione pre-commit, gate CI.

**Current Focus:** Phase 999.17 — tag-driven-placement-movimentazione-feature

---

## Current Position

Phase: 999.17 (tag-driven-placement-movimentazione-feature) — EXECUTING
Plan: 4 of 4

| Field | Value |
|-------|-------|
| Current Phase | 999.15 — strumenti-step-editor-filtro-pagina-snippet |
| Current Plan | 2/2 completato (fase completa) |
| Status | COMPLETE |
| Phase Goal | Filtro pagina e snippet nel pannello Steps dell'editor |

**Progress:**

[██████████] 100%

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
| Phase 999.14 P02 | 15 min | 3 tasks | 2 files |
| Phase 999.16 P01 | 3 | 1 tasks | 1 files |
| Phase 999.16 P02 | 45 | 2 tasks + pivot server | 5 files |
| Phase 999.17 P01 | 10 min | 2 tasks | 3 files |
| Phase 999.17 P02 | 5 min | 1 tasks | 1 files |
| Phase 999.17 P03 | 10 min | 2 tasks | 2 files |
| Phase 999.17 P04 | 10 min | 1 tasks | 1 files |

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
| Phase 999.14 P01 | 8 min | 2 tasks | 4 files |
| Phase 999.15 P01 | 5 min | 1 task | 2 files |
| Phase 999.15 P02 | 8 min | 3 tasks (incl. checkpoint) | 3 files |

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
- 999.14-01: steps dedup single-file via Set<string> in extractPageMarkers; dedup cross-file via includes() in route.ts + sort alfabetico finale; expandedPages come Set<string> di slug per toggle per-pagina indipendente
- 999.14-02: layout editor — editor sinistro scrolla con la pagina (overflow-y-auto sul wrapper esterno), SOLO colonna destra Steps sticky (`lg:sticky lg:top-1 lg:self-start`, commit 3ae4ad0 su richiesta utente in verifica visiva); StepBrowser compatto via maxHeight 180px↔480px con toggle "Mostra tutti/Riduci"; box Preview .feature rimosso (i18n keys lasciate inutilizzate)
- 999.15-01: chip pagina usa stesso stile teal dei chip area (coerenza visiva); pageCounts mostra conteggio totale per pagina non filtrato; riga chip visibile solo se pages.length > 0; toggle ri-click azzera il filtro
- 999.15-02: snippet intent dichiarativi da file statico TS editabile dal team (web-ui/src/lib/step-snippets.ts, 5 seed); sezione Snippet collassabile default-chiusa tra chip pagina e lista step; click → onInsert(lines.join('\n')+'\n') con onMouseDown+preventDefault per non perdere focus editor; verifica visiva approvata. Fix editor correlati durante checkpoint: scroll a blocco (ef10a2d/ca821d2), id tab univoci (db1431d), import in bottone header (b694aae)
- 999.16-01: GherkinToolbar sticky via wrapper `lg:sticky lg:top-0 z-10 bg-background` nella colonna editor; bg-background opaco sul wrapper esterno (la toolbar interna ha bg-muted/30 semi-trasparente, insufficiente a coprire il contenuto che scorre sotto)
- 999.16-02: @cucumber/gherkin non bundlabile per browser (usa node:module) → PIVOT: parser eseguito LATO SERVER via endpoint Node /api/lint; gherkinLinter reso ASINCRONO ({delay:600} debounce) con fetch a /api/lint + regole manuali come complemento/fallback (try/catch → null su errore, editor mai rotto); next.config serverExternalPackages per i due pacchetti @cucumber; lintGutter aggiunto come extension CodeMirror; build+tsc passano. Rimosso il primo approccio _nodeRequire/new Function client-side (non dava i veri errori nel browser)
- 999.17-01: FeaturePlacementDialog senza fetch — UI pura, onConfirm delega l'azione al chiamante (save/move/altro); getFeatureTags formalizza il pattern regex di _content.tsx con tipo di ritorno esplicito; slugify replicato localmente nel dialog per autonomia client-side; firma FeatureImportDialog invariata — features/page.tsx non modificato

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

**Stopped at:** Checkpoint 999.17-04 Task 2 — awaiting human-verify

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
