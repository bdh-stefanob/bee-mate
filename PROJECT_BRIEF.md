# Project Brief — BDD Automation Framework (multi-app)

> Documento di visione e contesto. Per le regole architetturali leggi
> `CONTRIBUTING.md`. Per la collaborazione QA manuale ↔ SDET leggi `WORKFLOW.md`.
> Per la mappa applicativi/aree leggi `DOMAINS.md`. Per il backlog leggi
> `ROADMAP.md`. Per le istruzioni all'agente AI leggi `CLAUDE.md`.

---

## 1. Cosa stiamo costruendo

Un **framework di test automation BDD industrializzato** per coprire la UI di
**N applicativi web** (oggi 2 placeholder, in futuro potranno diventare 3+).
Lo scopo non e' un singolo progetto di test: e' uno **standard riutilizzabile**
che permette a un team misto di QA (manuali + SDET) di lavorare sulla stessa
suite senza generare rumore (step duplicati, divergenti, non riusati).

Stack: **Playwright + Cucumber.js + TypeScript**, architettura a **4 layer**,
catalog di step **generato dal codice** (non scritto a mano).

---

## 2. Ruoli del team

| Ruolo | Identita' | Responsabilita' |
|---|---|---|
| **Automation Lead (Steve)** | Persona | Gatekeeper degli step, architetto, decisore su cosa entra nel catalog, owner del repo |
| **QA manuale** | Persona | Scrive `.feature` in Gherkin riusando step esistenti; segnala step mancanti (status `wanted`); valida i test end-to-end |
| **SDET** | Persona | Implementa step `wanted` → `implemented`; mantiene actions/pages; refactora quando il catalog cresce |
| **AI partner** (Claude Code via GSD) | Agente | Senior QA architect + senior dev. Propone, non decide. Rispetta i vincoli di `CLAUDE.md`. Lavora con AskUserQuestion sui bivi |

Il QA manuale e l'SDET sono **due ruoli distinti che collaborano sulla stessa
piattaforma**. Il workflow di handoff e' formalizzato in `WORKFLOW.md`.

---

## 3. Vincoli non negoziabili

1. **Architettura a 4 layer**: `features/` → `steps/` (glue sottile) → `actions/`
   (intenzioni business) → `pages/` (selettori). Mai selettori dentro gli step.
2. **Anti-rumore**: uno step canonico per intento business. Riusare gli step
   esistenti dal catalog prima di proporne di nuovi. La calibrazione e'
   **deterministica** (lookup sul catalog), non probabilistica (LLM suggestion).
3. **Catalog generato dal codice**: `STEP_CATALOG.md` e `step-catalog.json`
   sono prodotti da `npm run catalog`. Non si scrivono a mano.
4. **Multi-app pulito**: ogni applicativo ha le sue `pages/<app>/`, le sue
   `actions/<app>/`, i suoi `features/<app>/`. Step condivisi vivono in
   `steps/common/`. Naming: `app-a`, `app-b` come placeholder finche' il
   team non li rinomina (vedi `DOMAINS.md`).
5. **Nessun dato/nome/flusso aziendale reale nel repo**: questo e' un repo
   personale + pubblico-pronto. I nomi reali entrano solo quando il framework
   viene migrato in un repo Git aziendale interno.
6. **Nessuna credenziale nel codice o nei commit**: token in `.env` (gitignored).
7. **Onesta' sui limiti**: l'AI non deve assecondare richieste impossibili o
   convenire passivamente. Quando una direzione e' sbagliata o ambigua, deve
   dirlo e proporre l'alternativa vera.

---

## 4. Stato attuale (al 2026-06-09)

**Cosa funziona oggi:**
- Scaffold Playwright + Cucumber.js + TypeScript verificato (5 scenari, 18
  step, 0 undefined, 10 step nel catalog, tsc OK)
- Dominio demo generico: `auth` + `orders` (placeholder, sara' rimappato a
  `app-a`/`app-b` quando si parte col vero contenuto)
- `STEP_CATALOG.md` autogenerato da `npm run catalog`
- Repo Git inizializzato e pubblicato sul GitHub personale di Steve (privato,
  ponte temporaneo fino al Git aziendale)
- Scaffold dell'estensione VS Code in `vscode-extension/` con CompletionItem
  Provider funzionante (autocomplete deterministico dal catalog)

**Decisioni architetturali gia' prese:**

| Tema | Decisione | Razionale |
|---|---|---|
| Canale authoring per QA non-tecnici | **Estensione VS Code** | Sicurezza: nessuna credenziale gestita dall'app, push via `git` di sistema. Vedi ROADMAP §5.6 |
| Aggiornamento del catalog ai client | **Modello A** (catalog committato + git pull) | Zero infra. Evolvibile a Modello B (remote) quando entra in azienda |
| Status degli step | Tracciato nel catalog: `implemented` / `wanted` / `deprecated` | Single source of truth. Vedi WORKFLOW.md |
| Multi-app naming nel repo | Placeholder `app-a`, `app-b` con TODO rinominazione | Repo personale resta IP-clean |
| Step site separato (sito statico web) | **Sospeso** | Per QA misti con accesso al repo, l'estensione VS Code e' sufficiente. Il sito si rivaluta se IT aziendale bloccherà VS Code |

---

## 5. Visione a 6 mesi

- 2-3 applicativi web coperti da scenari E2E in BDD, con CI verde su ogni PR
- Catalog di step >50 voci, tutti documentati con `@intent`, raggruppati per
  `<app>/<area>`
- Estensione VS Code installata su tutti i QA del team (manuali + SDET),
  con autocomplete, validazione live, tree view, request-step quickfix
- Workflow `wanted → implemented` rodato: QA manuale puo' aprire una request
  in 30 secondi, l'SDET la prende in carico nello sprint successivo
- Onboarding di un nuovo QA <2 ore (leggi PROJECT_BRIEF + DOMAINS + CONTRIBUTING,
  apri l'extension, scrivi il primo .feature con autocomplete)
- Quando arrivera' il Git aziendale: migrazione del framework + step harvest
  da .feature legacy se ne esistono (ROADMAP §5.7)

---

## 6. Cosa NON e' questo progetto

- Non e' un test runner: usa Playwright/Cucumber esistenti
- Non e' un'app: e' un **framework** + **standard** + **toolchain**
- Non e' un Cucumber Studio: niente UI hosted per scrivere `.feature`, l'IDE
  resta VS Code (con la nostra estensione che riempie i gap)
- Non sostituisce il sistema ALM aziendale (Jira/Xray/Confluence): si integra
  con esso quando l'organizzazione lo metterà a disposizione

---

## 7. Modalita' operativa con AI

L'AI partner (Claude Code o sessione GSD) opera con queste regole:

- **Onesta' sui limiti tecnici**: se qualcosa non e' fattibile lo dice, non
  promette miracoli
- **Decisioni con `AskUserQuestion`** sui bivi architetturali, non sceglie
  unilateralmente
- **Doc-first**: cambi strutturali → aggiornare `ROADMAP.md`, `CONTRIBUTING.md`,
  `DOMAINS.md` PRIMA di scrivere codice
- **Catalog as SoT**: mai inventare step. Prima `npm run catalog`, poi proporre
  step esistenti. Step nuovi → flag esplicito + conferma Steve
- **Italiano** nelle risposte, conciso e diretto
- **Conventional Commits** per i messaggi git (`feat:`, `fix:`, `chore:`,
  `docs:`, `test:`, `refactor:`)
- Risposte concise, niente ripetizioni, evita formattazione decorativa
- Quando finisce un blocco di lavoro: presenta i file via Cowork (se in Cowork)
  o link diretti (se in Claude Code)

---

## 8. Glossario rapido

- **Step canonico**: l'espressione Gherkin riconosciuta dal catalog (es.
  `I am logged in as a {string} user`). Una intenzione di business, una sola
  espressione.
- **Step wanted**: stub registrato in codice con `@wanted` e body che fa
  `throw 'NOT IMPLEMENTED'`. Visibile nel catalog con `status: 'wanted'`.
- **Page Object**: classe in `pages/<app>/<page>.page.ts` che incapsula i
  selettori di una pagina UI specifica.
- **Action**: funzione in `actions/<app>/<area>.actions.ts` che rappresenta
  un'intenzione di business (es. `ensureRegisteredUser`).
- **Domain**: identifica dove vive uno step. Formato: `<app>` per step generali
  di un app, `<app>/<area>` per step di una specifica area, `common` per step
  cross-app.
- **Area**: sezione UI all'interno di un'app (es. `auth`, `booking`,
  `dashboard`). Mappa 1:1 con una macro-zona dell'applicativo.
