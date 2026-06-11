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

### Phase 999.4: Filtro per keyword nel pannello step dell'editor (BACKLOG)

**Goal:** Aggiungere filtri Given / When / Then nel pannello di ricerca step dell'editor. Il team QA compone gli scenari per blocchi di keyword (prima tutti i Given, poi i When, poi i Then): filtrare per keyword riduce il rumore e velocizza la composizione. Il filtro si combina con la ricerca testuale esistente.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.5: Preserva stato editor quando si naviga al catalogo (BACKLOG)

**Goal:** Quando l'utente passa dalla pagina Editor alla pagina Catalogo e ritorna, il contenuto del feature file in lavorazione non deve andare perso. Stato persistito in localStorage (o store globale) e ripristinato al re-mount dell'editor.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.6: Numerazione scenari e collasso scenari nell'editor (BACKLOG)

**Goal:** Mostrare un numero progressivo accanto a ciascuno scenario nell'editor (es. "Scenario 1 of 4") e permettere di collassare/espandere i singoli scenari. Utile per feature file lunghi con molti scenari.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.7: Autocomplete step inline durante la digitazione nell'editor (BACKLOG)

**Goal:** Mentre l'utente digita una riga Gherkin, mostrare suggerimenti inline degli step del catalogo direttamente nel cursore (stile IDE), senza dover aprire il pannello laterale. Complementare al pannello step esistente, non sostitutivo.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.8: Salvataggio esplicito del feature file dall'editor (BACKLOG)

**Goal:** Aggiungere pulsante "Save" (e shortcut Ctrl+S) per salvare il feature file su filesystem. Conferma visiva del percorso di salvataggio. Il team QA non sa dove vanno i file scritti nell'editor e non ha feedback visivo del salvataggio.
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
