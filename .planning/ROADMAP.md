# Roadmap

## Completati in questo sprint (2026-06-11)

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

### Phase 999.10: Filtro `#PageName` nella search bar dello StepBrowser (BACKLOG)

**Goal:** Quando l'utente scrive `#login` nella barra di ricerca del pannello step, filtrare gli step associati alla pagina `#LOGIN` (derivati dai commenti di pagina nei feature file importati). Complementa il filtro per keyword G/W/T già esistente.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.11: Auto-salvataggio enum estratti in step-enums.json all'import (BACKLOG)

**Goal:** Quando il parser esteso estrae `"label" [val1,val2]` da uno step importato, salvare automaticamente i valori in `step-enums.json` tramite `PUT /api/enums` invece di mostrarli solo in UI. Il team QA non dovrà aprire il modal del catalogo per ogni step importato.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
