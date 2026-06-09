# Roadmap — BDD Automation Scaffold

> Documento di lavoro per l'agente (Claude Code) e per chi entra sul progetto.
> Definisce **cosa costruire dopo lo scaffold**, in che **ordine**, e — soprattutto
> — **cosa NON costruire**. Leggere prima di proporre architetture o feature.

---

## 1. Stato attuale

Lo scaffold contiene:
- Framework E2E mono-linguaggio: **Playwright + Cucumber.js + TypeScript**
- Architettura a 4 layer: `features/` → `steps/` → `actions/` → `pages/`
- Dominio demo **generico** (auth + orders) — placeholder, non flussi reali
- `STEP_CATALOG.md` generato da `step-catalog.json` (rigenerato da `npm run catalog`)
- Convenzioni in `CONTRIBUTING.md` (step canonici, `@intent`, anti-rumore)
- **Catalog schema v2** (Fase 2 completa): campi `app`, `area`, `status`, `replacedBy`,
  `requester`, `assignee`; tag lifecycle `@wanted`/`@deprecated`; badge `🔧`/`⛔` nel MD;
  tipi VS Code extension allineati.

**Stato verifiche:** scaffold funzionante (tsc OK, 5 scenari / 18 step / 0 undefined,
catalog 11 step — 10 implemented + 1 wanted demo).

---

## 2. Contesto team & vincoli reali

- **Team QA misto:** alcuni tecnici (a loro agio con VS Code/Git), altri no.
- **Accesso al repo non garantito per tutti i QA.** Almeno una parte del team
  scriverà test case **senza poter clonare il repo aziendale**.
- **Steve è il gatekeeper** degli step nuovi: i QA riusano step esistenti, Steve
  approva eventuali nuove voci nel catalog.
- **Niente dati/flussi/nomi aziendali reali in questo repo** (è pubblico/personale,
  ponte temporaneo fino all'accesso al Git aziendale).

---

## 3. Principio fondamentale: calibrazione deterministica

> Il riuso degli step NON deve dipendere dalla "buona volonta" o dalla memoria
> dei QA, ne' da suggerimenti LLM probabilistici (Copilot/Claude).

La calibrazione su quanto esiste gia' poggia su **tre meccanismi deterministici**:

1. **Autocomplete vincolato** — gli editor (VS Code o webapp) suggeriscono SOLO
   step presenti in `step-catalog.json`. Lookup, non generazione.
2. **Validazione strutturale** — ogni step di un `.feature` viene matchato contro
   le regex del catalog. Match → OK. No match → step nuovo, richiede approvazione.
3. **Gate CI/PR** — la pipeline blocca i PR con step nuovi non firmati dal gatekeeper.

Gli LLM (Copilot, Claude) sono **strumenti di velocita**, non di garanzia.
La garanzia anti-rumore vive nei tre meccanismi sopra, indipendenti dall'IDE.

---

## 4. Architettura target (ibrida)

Il team misto richiede **due interfacce parallele** sullo stesso catalog:

```
                    step-catalog.json  (single source of truth)
                            |
        +-------------------+--------------------+
        |                                        |
   QA tecnici / Steve                    QA non tecnici / no-repo
   --------------------                 ---------------------------
   VS Code +                            Semi-app web (statica + Functions)
   - Cucumber Full Support              - Catalog cercabile (Strada 1)
   - Custom snippets dal catalog        - Editor Gherkin con autocomplete
   - Copilot per velocita                 deterministico (Strada 6)
   - Pre-commit hook validatore         - Export: download .feature o PR via API
        |                                        |
        +-------------------+--------------------+
                            |
                   Repo Git (.feature in src/features/)
                            |
                   CI gate (validate steps vs catalog)
                            |
                   Esecuzione (Playwright + Cucumber)
```

---

## 5. Roadmap — milestone in ordine di priorità

### M1 — Manager Demo  [SCADENZA: venerdì 13 giugno 2026]

Obiettivo: dimostrare alla manager il valore dell'approccio BDD-catalog rispetto
a Notepad. Non serve essere production-ready — serve essere convincente.

#### 5.0a Import scenari plain text  [Fase 3, ~0.5 giorni]

**Cosa:** script `scripts/import-scenarios.ts` che:
1. Legge un file `.txt` / `.feature` con scenari Given/When/Then già scritti
2. Produce i `.feature` file nella struttura `src/features/<area>/`
3. Estrae gli step unici e li aggiunge al catalog come `@wanted` (non implementati)

**Input atteso:** file plain text con scenari Boots (arrivano 10/06/2026).

**Output:** baseline di `.feature` reali + step catalog popolato di `@wanted`.

**Da NON fare:** generare step definition TypeScript automaticamente.

---

#### 5.0b Web authoring app (catalog + editor)  [Fase 4, ~1.5 giorni]

**Cosa:** mini-app web locale (Express + HTML/JS vanilla o Vite) con:

- **Catalog panel** (sinistra): step cercabili per testo/tag/domain/status,
  badge `🔧 wanted` e `⛔ deprecated`, sezione "Favoriti" (localStorage)
- **Authoring panel** (destra): editor Gherkin con autocomplete deterministico
  (suggerisce solo step dal catalog), evidenzia in arancio step non nel catalog
- **Linting inline**: capitalizzazione Given/When/Then, step near-duplicate già
  presenti (`fastest-levenshtein`), placeholder `{string}`/`{int}` malformati
- **Save flow**: mostra preview degli step nuovi → conferma → scrive il `.feature`
  in `src/features/` + esegue `git commit` locale via `child_process`
- **Flow browser**: tab che mostra i business flow per area/dominio come punto
  di partenza per nuovi scenari

**Stack:** server Node locale (`npm run app`) + UI leggera senza framework pesante.
Niente database — tutto legge da `step-catalog.json` e dai `.feature` esistenti.

**Dipendenza:** Fase 3 (catalog popolato con step Boots).

---

#### 5.0c UI/UX audit  [post-build, ~0.5 giorni]

Dopo la build della web app, spawn di `gsd-ui-auditor` per revisione su 6 dimensioni
(layout, accessibilità, coerenza visiva, leggibilità, feedback utente, mobile/responsive).

---

### 5.1 Step Catalog → sito statico cercabile  [PRIORITA 1, 1-2 giorni]

**Cosa:** trasformare `step-catalog.json` in un mini-sito pubblico con search,
filtri per tag/dominio, link al codice, esempi `@intent`.

**Stack consigliato:** **Astro Starlight** (search built-in con Pagefind, MD/MDX,
GitHub Pages-ready). Alternativa: Docusaurus se serve qualcosa di piu opinionato.

**Where it lives:** sottodir `docs-site/` nel repo. Build su push via GitHub Actions
→ deploy su `gh-pages`.

**Output:** URL pubblico (o privato auth-gated) dove un QA cerca "login" e trova:
- testo dello step
- parametri
- `@intent` documentation
- file:line di implementazione

**Dipendenza:** nessuna, parte subito.

---

### 5.2 Pre-commit hook: validate steps vs catalog  [PRIORITA 1, 0.5 giorni]

**Cosa:** Husky + script TS che, al `git commit`, parsa i `.feature` modificati e:
- matcha ogni step contro `step-catalog.json` (regex compilate)
- se trova match esatto → OK
- se trova match >80% similarita → warning con suggerimento step esistente
- se nessun match → blocca commit (o consente con `--no-verify` per Steve)

**Stack:** Husky + ts-node + libreria fuzzy match (es. `fastest-levenshtein`).

**Output:** rumore prevenuto a monte, non a valle.

**Dipendenza:** nessuna.

---

### 5.3 Skill Claude Code custom: `feature-author`  [PRIORITA 2, 1 giorno]

**Cosa:** skill di Claude Code che da user story / descrizione genera un draft
`.feature` riusando SOLO step del catalog.

**Logica:**
1. Legge `step-catalog.json`
2. Analizza la descrizione utente
3. Mappa intenti business → step esistenti
4. Se mancano step per coprire l'intento → flagga "serve nuovo step: [proposta]"
   (Steve decide se aggiungerlo)

**Trigger:** "scrivi uno scenario per X", "feature per [descrizione]", "draft del .feature".

**Build:** usare la skill installata `skill-creator` per scaffoldare la skill.
Path target: `.claude/skills/feature-author/SKILL.md`.

**Nota:** complementare alla skill gia installata `anthropic-skills:regression-scenario`
(ticket Jira chiuso → scenario di regressione). Quella copre il caso retrospettivo,
`feature-author` copre il caso prospettico.

---

### 5.4 VS Code setup raccomandato  [PRIORITA 2, 0.5 giorni]

**Cosa:** documentare in `CONTRIBUTING.md` lo stack VS Code per i QA tecnici.

**Estensioni:**
- `Cucumber (Gherkin) Full Support` (CucumberOpen.cucumber-official)
- `Playwright Test for VSCode` (ms-playwright.playwright)
- GitHub Copilot (gia autorizzato)
- Amazon Q (gia autorizzato per Steve)

**Setup:** snippets generati automaticamente dal catalog (script che produce
`.vscode/cucumber-steps.code-snippets`). I QA tecnici hanno autocomplete locale.

**Settings:** rispetto template `.vscode/` versionato (no preferenze personali).

---

### 5.5 Reporter HTML pubblicato  [PRIORITA 3, 0.5 giorni]

**Cosa:** sostituire o affiancare il reporter cucumber-html con
`multiple-cucumber-html-reporter` (piu ricco: screenshot, log, metadata env).
Pubblicare su GitHub Pages dopo ogni run CI.

**Output:** URL dove il team vede l'ultimo run con drill-down sui fallimenti.
Niente dashboard custom da scrivere.

---

### 5.6 Estensione VS Code (PRIMARIA per il caso aziendale)  [PRIORITA 1-2, 3-5 giorni]

**Decisione architetturale (08-06-2026):** la "semi-app webapp" del piano
originario e' stata sostituita da un'**estensione VS Code** come canale
primario di authoring per i QA. Motivi:
- Una webapp hosted con dati aziendali su GitHub Pages **non e' sicura**
  (Pages e' pubblico anche se il repo e' privato sul piano gratuito).
- Una local app delega l'auth a `git` di sistema → **zero credenziali
  gestite dall'app**, niente token nel codice.
- VS Code estensione vive a fianco del framework, riusa lo stesso linguaggio
  e lo stesso catalog senza duplicazione.

**Stato attuale:** scaffold completo in `vscode-extension/` (manifest,
CatalogLoader astratto + FsLoader, CompletionItemProvider funzionante,
comandi Reload e Find). Manca: diagnostic provider (validazione live),
tree view, hover provider, PR opener.

**Modello di aggiornamento del catalog: A (committato).**
- `step-catalog.json` versionato (rimosso dal .gitignore)
- I QA fanno `git pull` per ricevere il catalog aggiornato
- L'extension lo legge dal workspace, ricarica al `npm run catalog` via watcher
- Refactor a "Modello B" (remote loader: file share / npm package privato /
  endpoint HTTP) quando si entra in azienda con QA senza repo: si aggiunge
  un `RemoteLoader implements CatalogLoader` senza toccare il resto.

**Roadmap interna all'extension:**

1. ✅ Scaffold + manifest + tsconfig
2. ✅ CatalogLoader (interface + FsLoader con file watcher)
3. ✅ CompletionItemProvider per .feature (suggerimenti deterministici, snippet con placeholder)
4. ✅ Comandi `stepCatalog.reload` e `stepCatalog.find`
5. ⏳ DiagnosticCollection: match live degli step contro il catalog (warning/error squiggle)
6. ⏳ TreeDataProvider sidebar: "Step Catalog" raggruppato per dominio
7. ⏳ HoverProvider: @intent + file:line on hover
8. ⏳ Command "Open PR with current .feature" via `gh` CLI o git terminal
9. ⏳ Test E2E con @vscode/test-electron
10. ⏳ Package `.vsix` + documentazione installazione

**Requisiti trasversali sull'extension (da preservare sempre):**

- **Funziona con catalog vuoto.** `step-catalog.json` assente, esistente-ma-vuoto,
  o non ancora generato sono tutti stati legittimi (primo avvio, progetto nuovo).
  L'extension non spamma errori: il FsLoader normalizza tutti questi casi in un
  catalog vuoto valido, i provider non offrono suggerimenti, il comando `find`
  guida l'utente verso le due strade per popolarlo (`npm run catalog` da codice,
  o harvest da .feature esistenti — vedi 5.7).
- **Funziona con catalog pieno cresciuto via harvest.** Vedi 5.7: l'extension
  non distingue tra step "scritti da Steve" e step "harvested da legacy" — il
  catalog e' una struttura unica.

**Quando ha senso una webapp parallela (Strada B residuale):** solo se l'azienda
**proibisce** ai QA non tecnici di installare VS Code, e contemporaneamente
fornisce un hosting interno (intranet SSO). In quel caso si riusa lo stesso
CatalogLoader/parser dell'extension condividendoli come package npm interno.

---

### 5.7 Harvest da .feature esistenti  [PRIORITA 2, 2-3 giorni]

**Cosa:** uno script + un comando dell'extension che estrae step ricorrenti da
una collezione di `.feature` **gia esistenti** (legacy di altri team, file
salvati da Confluence, vecchi progetti senza framework) e li propone come
candidati da promuovere nel catalog.

**Use case tipico:**
- Erediti 80 `.feature` scritti senza convenzioni
- Vuoi sapere quali step ricorrono >N volte (= candidati a step canonico riusabile)
- Vuoi vedere duplicati near-match (es. "I am logged in" vs "I am logged into the system")
- Vuoi scaffoldare le step definition TypeScript per i candidati approvati,
  che Steve poi implementa a mano (l'implementazione non e' autogenerabile)

**Architettura:**

```
scripts/harvest-from-features.ts             # tool CLI standalone
  input:  --dir <path> con i .feature legacy
  parse:  @cucumber/gherkin (parser ufficiale)
  output: harvest-report.json
          {
            candidates: [
              { textNormalized, occurrences, originalForms[], proposedRegex },
              ...
            ],
            duplicatesNearMatch: [
              { canonical, similar: [...] }
            ]
          }

vscode-extension/                            # comando UI
  command: "Step Catalog: Harvest from existing .feature files"
  flow:
    1. quickpick directory
    2. esegue lo script in background (vscode.tasks.executeTask)
    3. legge harvest-report.json
    4. mostra una webview / quickpick multi-select per approvare candidati
    5. per ogni candidato approvato genera scheletro:
       src/steps/harvested/<domain>.steps.ts con TODO body
    6. apre il file per implementazione manuale
    7. al successivo `npm run catalog`, gli step entrano nel catalog
```

**Logica di normalizzazione candidati:**
- Strip keyword Gherkin (Given/When/Then/And/But/\*)
- Trim whitespace, lowercase per il match
- Riconoscimento valori variabili → `{string}`, `{int}` automatici
  (es. `I see 5 items` e `I see 12 items` → `I see {int} items`)
- Fuzzy match (Levenshtein) >80% sulla forma normalizzata → grouped come "near duplicate"

**Output esempio:**

```
Trovati 47 step unici in 80 .feature analizzati.

Top 10 per frequenza (candidati canonici):
  12x  "I am logged in as {string}"
  11x  "I see the dashboard"
   9x  "I click on {string}"
   ...

Near-duplicates rilevati (richiedono consolidamento):
  - "I am logged in as {string}" (12x)  <==  "I login as {string}" (3x)
  - "I see the dashboard" (11x)         <==  "the dashboard is shown" (4x)
```

**Da NON fare:**
- Generare automaticamente il **body** della step definition (la logica
  Playwright non e' inferibile dal testo Gherkin). Generiamo solo lo scheletro;
  Steve scrive l'implementazione.
- Importare ciecamente tutto. L'harvest e' un **suggerimento**, non un'azione:
  l'utente seleziona quali candidati promuovere.

**Dipendenza:** `@cucumber/gherkin` (gia indirettamente presente via cucumber-js)
+ `fastest-levenshtein` per il fuzzy match.

---

### 5.8 Integrazione Jira plain (senza Xray)  [PRIORITA 3, 1 giorno]

**Contesto:** Xray è a pagamento — fuori scope. Si usa Jira standard via REST API.

**Tag convention adottata** (già implementata nel Feature Editor):

| Tag | Significato |
|-----|-------------|
| `@ticket:BOOT-123` | Collega lo scenario alla Jira story / bug di riferimento |
| `@regression`      | Include nella suite di regressione |
| `@smoke`           | Smoke test (ogni build) |
| `@sanity`          | Sanity post-deploy |
| `@wip`             | In lavorazione — escluso dal CI gate |

**Testo libero scenario** (Gherkin valido, già nel template + Scenario):
```gherkin
@ticket:BOOT-1234
Scenario: Checkout fails with expired card
  Jira: https://company.atlassian.net/browse/BOOT-1234
  Note: verifica il messaggio di errore lato UI e lato API

  Given I am a logged in user
  ...
```

**Script da costruire:** `scripts/jira-sync.ts`
- Legge tutti i `.feature` nel repo
- Estrae scenari con `@ticket:BOOT-XXX`
- Usa Jira REST API (`POST /rest/api/3/issue/{key}/comment`) per aggiornare
  la issue con il contenuto dello scenario come commento o attachment
- Configurazione: `JIRA_URL`, `JIRA_TOKEN` in `.env` (mai nel codice)
- Direzione iniziale: **push** (`.feature` → Jira); pull (Jira → `.feature`) già
  coperto dalla skill `anthropic-skills:regression-scenario`

**Dipendenze:** nessuna libreria extra — `fetch` nativo Node 18+ è sufficiente.

**Da NON fare:**
- Gestire autenticazione Basic nel codice — solo token Bearer via `.env`
- Modificare le Jira issues (solo commenti / allegati, read-only sul ticket principale)

---

## 6. Cosa NON fare

- ❌ **Dashboard custom dei run**: usa `multiple-cucumber-html-reporter`.
- ❌ **AI generativa libera per i QA nell'editor**: rompe la calibrazione
  deterministica. Autocomplete = solo step dal catalog (lookup, non generazione).
  AI generativa solo lato Steve (Claude Code) per draft e generation da ticket.
- ❌ **Selettori dentro gli step**: rispetta i 4 layer (vedi `CONTRIBUTING.md`).
- ❌ **Step duplicati "per velocita"**: usa il pre-commit hook (5.2) per impedirlo.
- ❌ **Scrivere a mano `STEP_CATALOG.md`**: si genera da `npm run catalog`.
- ❌ **Nomi/flussi/dati aziendali reali in questo repo**: e' pubblico/personale.
- ❌ **Generare il body delle step definition automaticamente**: solo lo scheletro
  TypeScript; l'implementazione Playwright è manuale (non inferibile dal testo).
- ❌ **Backend con database** per la web app del demo: tutto da `step-catalog.json`
  e `.feature` su filesystem — niente persistenza esterna per M1.

---

## 7. Quick start per Claude Code (agente)

Quando apri una sessione su questo repo:

1. Leggi `CONTRIBUTING.md` per le regole architetturali (4 layer, step canonici, `@intent`).
2. Leggi questo `ROADMAP.md` per capire il backlog e l'ordine.
3. Se l'utente chiede "aggiungi feature X / .feature": prima `npm run catalog`,
   poi proponi solo step esistenti dal catalog. Step nuovi solo se Steve approva.
4. Se l'utente chiede "costruisci la UI / authoring portal": **non saltare al
   punto 5.6**. Verifica che 5.1 (catalog site) e 5.2 (validator) siano fatti prima.
5. Se l'utente vuole modificare l'architettura: chiedi conferma esplicita,
   non rompere il principio dei 4 layer.

**Comandi quotidiani:**
```bash
npm test              # esegue gli scenari
npm run test:dry      # dry-run (valida step senza eseguire)
npm run catalog       # rigenera STEP_CATALOG.md + step-catalog.json
```

**Convenzione commit:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

---

## 8. Open questions (Steve)

- [x] **Web app per demo manager**: confermata — scadenza venerdì 13/06/2026.
- [x] **Formato step Boots**: scenari plain text con Given/When/Then già scritti
      (non step definition isolate). Arrivano il 10/06/2026.
- [x] **Jira integration**: nice-to-have prioritario — token API già disponibili.
      Testare il prima possibile per vedere l'output su una pagina Jira.
- [ ] **Formato esatto file step Boots**: `.txt`, `.feature`, Word, email?
      Determina l'importer da costruire in Fase 3.
- [ ] **Dove gira la web app durante la demo**: localhost (Steve condivide schermo)
      o serve hosting temporaneo accessibile dalla manager?
- [ ] **Catalog pubblico vs auth-gated**: decidere quando si passa al repo aziendale.
- [ ] **PR apertura per QA non-repo**: OAuth GitHub diretto o Steve fa batch review?
