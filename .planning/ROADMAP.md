# Roadmap

## Completati in questo sprint (2026-06-25)

### Phase 999.1: Step Detail Editor modal nel catalogo ✅ DONE

**Goal:** Click su uno step nel catalogo apre un modale per visualizzare e modificare i valori dei parametri (paramEnums). `PUT /api/enums` salva le modifiche in `step-enums.json`.

### Phase 999.4: Filtro per keyword nel pannello step dell'editor ✅ DONE

**Goal:** Pill G/W/T nel pannello step dell'editor. Si combina con ricerca testuale e filtro area.

### Phase 999.5: Preserva stato editor quando si naviga al catalogo ✅ DONE

**Goal:** Stato editor persistito in `localStorage` (`gsd-editor-draft`). URL `?step=` ha precedenza.

### Phase 999.6: Numerazione scenari e collasso scenari nell'editor ✅ DONE

**Goal:** Pannello `ScenarioOutline` nel right column — scenari numerati, collassabili, click per scrollare nel CodeMirror.

### Phase 999.7: Autocomplete step inline durante la digitazione nell'editor ✅ DONE

**Goal:** Fix `GHERKIN_PREFIX_RE` per righe indentate + `activateOnTyping: true` in CodeMirror.

### Phase 999.8: Salvataggio esplicito del feature file dall'editor ✅ DONE

**Goal:** Pulsante Save + Ctrl+S. `POST /api/features` scrive su `src/features/{app}/{flow}/{slug}.feature` derivando il path dai tag `@app @flusso`.

### Phase 999.9: Import formato esteso QA team ✅ DONE

**Goal:** Parser per `"label" [val1,val2]` inline, `#PageName` come commento di pagina, `@app @flusso` come tag strutturali. Auto-detect del formato. Enum estratti mostrati in UI.

### Feature tree App → Flow → Features ✅ DONE (non era in backlog)

**Goal:** `FeatureSummary` con campi `app/flow` da struttura directory. Features page con tree collassabile. Pulsante Edit carica il file nell'editor via localStorage.

---

## Backlog

### Phase 999.2: Questionnaire canonical BDD refactor (BACKLOG)

**Goal:** Sostituire il happy-path scenario da 28 step con intent-level step dichiarativi: `Given the user has no pre-existing conditions that contraindicate treatment` + `When the user completes the medical history questionnaire`. I dati delle risposte (QuestionnaireProfiles) vivono nei fixture, il flusso di navigazione in QuestionnaireActions.completeQuestionnaire(profile). DataTable e step ripetitivi eliminati dal Gherkin.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.3: Electron standalone app + CI auto-build (BACKLOG)

**Goal:** Impacchettare la web-ui come app desktop standalone (Windows `.exe` + Mac `.app`) tramite `electron-builder`. GitHub Actions builda e pubblica una nuova GitHub Release ad ogni push su `main`. `electron-updater` controlla gli aggiornamenti all'avvio e li installa in automatico — il team non installa mai manualmente una nuova versione. Nessun server esterno, nessun Node.js richiesto sul client. I file del catalogo (step-catalog.json, feature files) vivono sul filesystem locale.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.10: Filtro `#PageName` nella search bar dello StepBrowser ✅ SUPERATA da 999.15-01 (2026-06-26)

**Goal:** Filtrare gli step del pannello per pagina `#PAGINA`. **Implementato in 999.15-01** come chip filtro pagina (anziché prefisso `#` nella ricerca testuale) sotto la search bar, usando `CatalogStep.page`. Niente più lavoro residuo.
**Requirements:** TBD (coperto da STEP-FILTER-01)
**Plans:** 0 plans — superata

### Phase 999.12: Collaborative QA workflow ✅ DONE (2026-06-25)

**Goal:** Colleghi QA contribuiscono al catalogo dall'app senza toccare `main`. Branch `catalog` dedicato per le proposte, per-user commit identity nelle Settings, step unknown sottolineati in arancione nell'editor con click-to-propose, badge "Proposed" nel catalogo. Release `v0.2.0`.

---

### Phase 999.13: Feature file import nell'editor + sezione Tags/Hashtag ✅ DONE (2026-06-25)

**Goal:** Tre miglioramenti collegati per il workflow del team QA:
1. **Upload .feature nell'editor** — drag-and-drop o file picker direttamente nel tab dell'editor, senza passare dalla pagina Features. Il contenuto viene caricato in un nuovo tab preservando tutti i commenti (`# #PAGINA`, `# note libere`).
2. **Import step con hashtag da file caricato** — quando si carica un `.feature`, gli step vengono estratti con il loro `# #PAGINA` marker e proposti come `status: 'proposed'` al catalogo (flusso opzionale, con dialog di conferma).
3. **Sezione Tags/Hashtag** — nuova pagina `/tags` che aggrega tutti i marker `# #PAGINA` trovati nei feature file presenti in `src/features/`, con count step per pagina e link diretto all'editor.
4. **Fix preservazione import server** — `scripts/import-scenarios.ts` (`buildFeatureContent`) ricostruiva la feature scartando i tag originali (`@app @flow` → sostituiti da `@import<timestamp>`) e tutte le righe `# #PAGINA`. Il fix preserva tag, titolo e page marker; niente più directory/tag `import-<timestamp>`.
5. **Import alberato dal bottone Features** — il bottone "Carica .feature" della pagina Features riusa l'import tag-aware e chiede App+Flow (auto-suggeriti dai tag/marker, editabili, autocomplete sui valori esistenti) salvando in `src/features/{app}/{flow}/{nome}.feature`, verbatim e senza sovrascrivere file esistenti.
**Requirements:** UPLOAD-01, UPLOAD-02, IMPORT-STEP-01, TAGS-01, TAGS-02, IMPORT-FIX-01, UPLOAD-03
**Plans:** 5/5 plans complete

Plans:
- [x] 999.13-01-PLAN.md — Upload .feature nell'editor: nuovo tab, commenti preservati (Wave 1)
- [x] 999.13-02-PLAN.md — Dialog proposta step con # #PAGINA dopo upload (Wave 2)
- [x] 999.13-03-PLAN.md — Pagina /tags: aggregazione page marker + link editor (Wave 3)
- [x] 999.13-04-PLAN.md — Fix import server: preserva tag/titolo/# #PAGINA (Wave 4)
- [x] 999.13-05-PLAN.md — Bottone Features: import tag-aware + dialog alberatura App/Flow (Wave 5, checkpoint finale)

---

### Phase 999.14: UX editor Gherkin + lista step in /tags ✅ DONE (2026-06-25)

**Goal:** Tre miglioramenti UX su editor e pagina Tags:
1. **Lista step per pagina in /tags** — oltre al count, mostrare l'elenco espandibile degli step di ciascuna pagina (`# #PAGINA`), riusando l'estrazione esistente.
2. **Colonne editor sticky + pannello Steps collassabile** — le colonne sinistra (Explorer) e destra (Steps) restano fisse durante lo scroll dell'editor; il pannello Steps è riducibile/collassabile con la ricerca come stato di default che poi espande i risultati.
3. **Rimozione "Preview .feature"** — eliminare la sezione preview in basso a destra (inutile), recuperando spazio per gli step.
**Requirements:** TAGS-03, EDITOR-UX-01, EDITOR-UX-02
**Plans:** 2/2 plans complete

Plans:
- [x] 999.14-01-PLAN.md — /tags: lista step espandibile per pagina (TAGS-03)
- [x] 999.14-02-PLAN.md — Editor: colonne sticky + Steps collassabile + rimozione Preview (EDITOR-UX-01/02)

---

### Phase 999.15: Strumenti step nell'editor — filtro pagina + snippet intent ✅ DONE (2026-06-26)

**Goal:** Aggiungere strumenti sotto la search bar del pannello Steps dell'editor, per velocizzare i QA:
1. **Filtro per pagina `#PAGINA`** — chip (come i filtri area/keyword) per filtrare gli step del catalogo per schermata, usando il campo `page` già presente su `CatalogStep`. Coerente con la pagina `/tags`.
2. **Snippet intent dichiarativi** — libreria di blocchi multi-step inseribili come singolo intent (es. "the user completes SMS verification"), in linea con lo standard BDD dichiarativo. Sorgente: file statico nel repo editabile dal team.
**Requirements:** STEP-FILTER-01, SNIPPET-01
**Plans:** 2/2 plans complete

Plans:
- [x] 999.15-01-PLAN.md — Filtro pagina #PAGINA nello StepBrowser (STEP-FILTER-01)
- [x] 999.15-02-PLAN.md — Snippet intent dichiarativi sotto la search bar (SNIPPET-01)

---

### Phase 999.16: Editor — toolbar sticky + linter live con parser Gherkin ✅ DONE (2026-06-26)

**Goal:** Due miglioramenti all'editor Gherkin:
1. **Toolbar sticky** — la barra Structure/Steps/Undo/Format resta in alto mentre si scorre l'editor (oggi scorre via).
2. **Linter live potenziato** — il linter esiste già (`gherkinLinter` con regole manuali) ma manca il gutter ed è basato su regex. Integrare il `Parser` sincrono di `@cucumber/gherkin` (browser-safe) per segnalare attivamente veri errori di compilazione del feature, aggiungere `lintGutter()` per le icone d'errore, mantenendo le regole esistenti come complemento. Fallback alle regole manuali se il parser non si bundla nel client.
**Requirements:** EDITOR-UX-03, LINT-01
**Plans:** 2/2 plans complete

Plans:
- [x] 999.16-01-PLAN.md — Toolbar sticky nell'editor (EDITOR-UX-03)
- [x] 999.16-02-PLAN.md — Linter live con parser @cucumber/gherkin + lintGutter (LINT-01, checkpoint finale)

---

### Phase 999.17: Tag-driven placement + movimentazione feature (BACKLOG)

**Goal:** Rendere i tag `@app @flow` la fonte di verità per la collocazione del feature nell'albero, e permettere di definirli/spostarli dall'app. Decisioni utente: **tag = fonte di verità**; movimentazione via **dialog "Sposta" + drag&drop**.
1. **Dialog di placement riusabile** — generalizza `FeatureImportDialog` (App/Flow + autocomplete + anteprima path + anti-overwrite) e aggiunge un helper che scrive/aggiorna la riga `@app @flow` nel contenuto del feature (i tag restano la fonte di verità).
2. **Definisci tag al Save / al "+"** — al Save con placement ambiguo (tag insufficienti) e alla creazione di un nuovo tab, il QA può definire App/Flow; i tag vengono scritti nel contenuto. Niente modale ad ogni Ctrl+S.
3. **Movimentazione (dialog)** — nuovo `POST /api/features/move` (`fs.rename` + `safeFeaturePath` sui due lati, no overwrite silenzioso); bottone "Sposta" sull'albero che riusa il dialog; **aggiorna i tag nel contenuto** (altrimenti il prossimo Save annulla lo spostamento); aggiorna i tab aperti col nuovo path; pulizia cartelle vuote.
4. **Movimentazione (drag&drop)** — trascinamento del feature su un nodo app/flow diverso nell'albero, riusando l'endpoint move + aggiornamento tag. Checkpoint visivo finale.
**Requirements:** TAG-PLACE-01, MOVE-01
**Plans:** 4/4 plans complete

Plans:
- [x] 999.17-01-PLAN.md — Dialog placement riusabile + helper tag-in-content (TAG-PLACE-01)
- [x] 999.17-02-PLAN.md — Definisci tag al Save (ambiguo) + al "+" (TAG-PLACE-01)
- [x] 999.17-03-PLAN.md — Endpoint /api/features/move + bottone "Sposta" + sync tag/tab (MOVE-01)
- [x] 999.17-04-PLAN.md — Drag&drop nell'albero (MOVE-01, checkpoint finale)

---

### Phase 999.11: Auto-salvataggio enum estratti in step-enums.json all'import (BACKLOG)

**Goal:** Quando il parser esteso estrae `"label" [val1,val2]` da uno step importato, salvare automaticamente i valori in `step-enums.json` tramite `PUT /api/enums` invece di mostrarli solo in UI. Il team QA non dovrà aprire il modal del catalogo per ogni step importato.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

