# Roadmap

## Backlog

### Phase 999.1: Step Detail Editor modal nel catalogo (BACKLOG)

**Goal:** Click su uno step nel catalogo apre un modale per visualizzare e modificare intestazione, firme, documentazione e valori dei parametri. Include riconoscimento automatico del tipo parametro (number/string/date) basato sull'analisi delle occorrenze d'uso negli step esistenti nel step-catalog.json.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

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
