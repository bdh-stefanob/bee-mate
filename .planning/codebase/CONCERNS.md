# Codebase Concerns

**Analysis Date:** 2026-06-09

---

## Tech Debt

### `ensureRegisteredUser` è uno stub non implementato

- Issue: Il metodo non fa nulla — `void role` è un placeholder esplicito.
- Files: `src/actions/auth.actions.ts:17`
- Impact: Ogni scenario che parte da "I am a registered user" o "I am logged in as a {string} user" non crea realmente l'utente in un ambiente reale. Su un'app che richiede un utente esistente, tutti i test di login fallirebbero.
- Fix approach: Connettere a un API client di test-data seeding o a una fixture factory. Il README lo documenta come requisito esplicito prima di andare in produzione.

### `loginWithValidCredentials` usa credenziali hardcoded

- Issue: Email e password sono literal strings nel codice sorgente.
- Files: `src/actions/auth.actions.ts:22-24`
- Impact: In produzione, i test userebbero credenziali che probabilmente non esistono sull'ambiente target. Nessun meccanismo per variare le credenziali per ruolo.
- Fix approach: Leggere le credenziali da variabili d'ambiente (`process.env.TEST_USER_EMAIL`, ecc.) o da una fixture factory parametrizzata per ruolo.

### `src/fixtures/` dichiarato nell'architettura ma non esiste

- Issue: `README.md` dichiara `src/fixtures/` come layer per "test data builders", ma la directory non esiste nel repo.
- Files: `src/` (directory mancante)
- Impact: I futuri autori che seguono la struttura del README si aspetteranno quel layer. L'architettura è incompleta rispetto alla documentazione.
- Fix approach: Creare la directory con un file di esempio o rimuoverla dalla documentazione di architettura.

### `src/api/` dichiarata nell'architettura ma non esiste

- Issue: `README.md` dichiara `src/api/` come layer per "API clients (BE, future)", ma non esiste alcun file in quella path.
- Files: `src/` (directory mancante)
- Impact: Come sopra — gap tra architettura documentata e implementazione reale.
- Fix approach: Creare stub o aggiornare il README per indicarlo esplicitamente come "future layer".

### `cucumberExprToRegex` duplicata in quattro posti

- Issue: La stessa funzione è replicata identica in `scripts/validate-steps.ts`, `vscode-extension/src/providers/diagnosticProvider.ts`, `vscode-extension/src/providers/hoverProvider.ts`, e `docs-site/src/components/FeatureEditor.tsx`.
- Files: Tutti e quattro i file sopra
- Impact: Un bug nella logica di parsing (es. gestione di `{bigdecimal}` o regex speciali) va fixato in quattro posti separati. Bug già divergenti possibili: l'extension e la webapp usano versioni leggermente diverse.
- Fix approach: Estrarre in un package condiviso. Nel breve termine, isolare in `scripts/catalog-utils.ts` e importare da lì nei script. Per l'extension, creare `vscode-extension/src/catalog/expressionUtils.ts`.

### Il CI commit del catalog non aggiunge `step-catalog.json`

- Issue: Il job `catalog` in `.github/workflows/ci.yml` esegue `git add STEP_CATALOG.md` ma non aggiunge `step-catalog.json` allo staging prima del commit automatico.
- Files: `.github/workflows/ci.yml:40-41`
- Impact: Il catalog machine-readable (`step-catalog.json`) può divergere dal catalog markdown su main se qualcuno fa `npm run catalog` localmente e committa solo il markdown. L'extension VS Code legge `step-catalog.json`, non il markdown — quindi l'extension potrebbe essere out-of-sync dopo il CI.
- Fix approach: Aggiungere `git add step-catalog.json` nel passo CI oppure unificare in `git add STEP_CATALOG.md step-catalog.json`.

---

## Roadmap Gap — Funzionalità Pianificate Non Ancora Costruite

### 5.2 Pre-commit hook: fuzzy match implementato ma Husky non configurato per tutti

- Issue: `scripts/validate-steps.ts` esiste ed è funzionante. `.husky/pre-commit` esiste e lo invoca. Tuttavia non c'è un CI gate separato che blocca le PR con step non in catalog (il CI esegue solo `npm test`, non `validate:steps`).
- Files: `.github/workflows/ci.yml`, `.husky/pre-commit`
- Impact: Il gate funziona solo su chi ha clonato il repo e installato husky (`npm install` → `prepare`). Chi fa PR senza avere il hook attivo (o con `--no-verify`) bypassa silenziosamente la validazione.
- Fix approach: Aggiungere un job CI dedicato che esegue `npm run validate:steps` su tutti i `.feature` (non solo quelli staged), per coprire il caso PR da fork o da chi ha bypassato il pre-commit.

### 5.3 Skill Claude Code `feature-author` non costruita

- Issue: Pianificata in ROADMAP 5.3 come `.claude/skills/feature-author/SKILL.md`. Non esiste nel repo.
- Files: `.claude/skills/` (non esiste)
- Impact: L'agente deve ricordarsi manualmente di riusare step dal catalog. Senza la skill, il rischio di "step noise" da Claude Code stesso è reale.
- Fix approach: Creare la skill seguendo il pattern documentato in ROADMAP 5.3.

### 5.4 VS Code snippets dal catalog non generati

- Issue: ROADMAP 5.4 prevede uno script che produce `.vscode/cucumber-steps.code-snippets` dai dati del catalog. Lo script non esiste. `.vscode/` contiene solo `launch.json` e `tasks.json` dell'extension.
- Files: `.vscode/` (file mancante)
- Impact: I QA tecnici non hanno autocomplete locale sul testo degli step in VS Code senza l'extension installata.
- Fix approach: Script `scripts/generate-snippets.ts` che legge `step-catalog.json` e scrive `.vscode/cucumber-steps.code-snippets`.

### 5.5 Reporter HTML avanzato non configurato

- Issue: Il CI carica il report HTML di base (`reports/cucumber-report.html`) come artifact, ma non lo pubblica su GitHub Pages. `multiple-cucumber-html-reporter` non è installato.
- Files: `.github/workflows/ci.yml`, `package.json`
- Impact: Il team non ha un URL fisso dove vedere l'ultimo run. Deve scaricare l'artifact manualmente da ogni workflow run.
- Fix approach: Aggiungere `multiple-cucumber-html-reporter` e un job di deploy su `gh-pages`.

### 5.7 Harvest da `.feature` esistenti non costruito

- Issue: `scripts/harvest-from-features.ts` non esiste. Pianificato in ROADMAP 5.7.
- Files: `scripts/` (file mancante)
- Impact: Il team non ha strumenti per analizzare feature legacy e identificare step candidati.
- Fix approach: Implementare seguendo la specifica in ROADMAP 5.7.

### VS Code Extension: PR opener non implementato

- Issue: ROADMAP 5.6, punto 8: "Command 'Open PR with current .feature' via `gh` CLI o git terminal". Non esiste in `vscode-extension/src/extension.ts`.
- Files: `vscode-extension/src/extension.ts`
- Impact: Il flusso di lavoro per i QA non tecnici (scrivi scenario → apri PR) richiede ancora accesso manuale al terminale.
- Fix approach: Aggiungere comando che usa `vscode.window.createTerminal` + `gh pr create`.

### VS Code Extension: test E2E non implementati

- Issue: ROADMAP 5.6, punto 9: "@vscode/test-electron". Non ci sono test nell'extension.
- Files: `vscode-extension/` (directory `test/` mancante)
- Impact: L'extension non ha copertura automatizzata. Regressioni su completion, hover, diagnostics non vengono rilevate.
- Fix approach: Setup `@vscode/test-electron` con almeno un test smoke per CompletionProvider e DiagnosticProvider.

### VS Code Extension: `.vsix` non pacchettizzato né documentato

- Issue: ROADMAP 5.6, punto 10. `vsce` è listato come comando (`npm run package`) ma non c'è una pipeline CI che produce il `.vsix` né documentazione su come installarlo.
- Files: `vscode-extension/package.json`, `.github/workflows/ci.yml`
- Impact: Nessun QA può installare l'extension senza clonare il repo e compilarla a mano.
- Fix approach: Aggiungere un job CI che esegue `vsce package` e carica il `.vsix` come release artifact.

---

## Fragilità Architetturali

### Playwright config non letta da Cucumber World

- Issue: `playwright.config.ts` definisce `baseURL`, `headless`, `trace`, ecc. tramite `defineConfig`. Tuttavia `src/support/world.ts` lancia il browser direttamente con `chromium.launch()` senza passare le opzioni da config. Le impostazioni in `playwright.config.ts` si applicano solo se si usa il test runner nativo di Playwright (`npx playwright test`), non quando Cucumber gestisce il lifecycle.
- Files: `src/support/world.ts:19`, `playwright.config.ts`
- Impact: `BASE_URL`, `trace`, `screenshot` in `playwright.config.ts` sono ignorati durante `npm test`. Il `baseURL` hardcoded `http://localhost:3000` in config non raggiunge le Page Objects tramite `page.goto("/login")` — funziona solo se il browser context è creato con `browser.newContext({ baseURL })`.
- Fix approach: In `world.ts`, leggere `process.env.BASE_URL` e passarlo a `browser.newContext({ baseURL: process.env.BASE_URL || 'http://localhost:3000' })`. Valutare se mantenere `playwright.config.ts` o documentare che è un placeholder non attivo.

### Browser aperto senza `baseURL` nel context

- Issue: Correlato al punto precedente. `this.context = await this.browser.newContext()` non passa `baseURL`. Tutti i `page.goto("/login")` dipendono da un'app in ascolto sul default Playwright port o su un URL che i test non conoscono.
- Files: `src/support/world.ts:20`
- Impact: I test falliscono su qualsiasi ambiente reale dove l'app non è su `localhost:3000` o dove non si vuole usare il routing relativo.
- Fix approach: `await this.browser.newContext({ baseURL: process.env.BASE_URL ?? 'http://localhost:3000' })`.

### Selector costruito dinamicamente in `CartPage` è fragile

- Issue: `addButton` è una freccia che produce `[data-testid="add-${product}"]`. Il `product` viene dal Gherkin testuale — se un QA scrive "Wireless Mouse" il selector diventa `[data-testid="add-Wireless Mouse"]` con spazio, che probabilmente non esiste nell'HTML reale.
- Files: `src/pages/cart.page.ts:9`
- Impact: I test fallirebbero su qualsiasi app che normalizza i data-testid (es. kebab-case o senza spazi).
- Fix approach: Normalizzare il product name (`product.toLowerCase().replace(/\s+/g, '-')`) oppure documentare la convenzione nell'azione caller.

### Docs-site pubblica `step-catalog.json` come endpoint API aperto

- Issue: `docs-site/src/pages/api/steps.json.ts` espone l'intero catalog come JSON statico pubblico. Poiché il repo è pubblico/personale, non è un problema oggi. Ma se il repo diventa privato aziendale con flussi reali, il deploy su GitHub Pages esporrebbe il catalog a chiunque abbia l'URL.
- Files: `docs-site/src/pages/api/steps.json.ts`
- Impact: Esposizione di nomi di step e flussi business se il catalog contiene nomi aziendali reali.
- Fix approach: L'open question in ROADMAP 8 lo identifica già. Prima di aggiungere flussi reali: decidere se il sito catalog è pubblico o auth-gated.

---

## Considerazioni di Sicurezza

### Jira Basic Auth via `Buffer.from(email:token).toString('base64')`

- Issue: `scripts/jira-sync.ts` costruisce l'header `Authorization: Basic <base64(email:token)>`. L'autenticazione Basic con credenziali Atlassian è deprecata in favore di Bearer token.
- Files: `scripts/jira-sync.ts:183-187`
- Impact: Atlassian potrebbe disabilitare Basic Auth in futuro. Inoltre, se `JIRA_EMAIL` o `JIRA_TOKEN` contengono caratteri speciali, la codifica potrebbe produrre headers malformati.
- Mitigation attuale: Le credenziali vengono da `.env` (gitignored), non dal codice.
- Fix approach: Usare `Authorization: Bearer ${JIRA_TOKEN}` con Personal Access Token, che Atlassian supporta direttamente senza email. Rimuovere `JIRA_EMAIL` dal `.env.example`.

### `SKIP_STEP_VALIDATION=1` non è loggato

- Issue: Il pre-commit bypass (`SKIP_STEP_VALIDATION=1`) non produce una traccia audit nel commit stesso. Nessuno sa, guardando la git history, se un commit ha bypassato la validazione.
- Files: `scripts/validate-steps.ts:151-154`
- Impact: Steve potrebbe non accorgersi di commit con step non catalogati bypassati silenziosamente.
- Fix approach: Aggiungere un trailer al commit message (es. `Step-validation: skipped`) oppure scrivere in un log file che viene mostrato nel PR.

### Monaco editor caricato da CDN

- Issue: `docs-site/src/components/FeatureEditor.tsx:20` carica Monaco da `cdn.jsdelivr.net`. Non è pinned a un hash di integrità.
- Files: `docs-site/src/components/FeatureEditor.tsx:19-21`
- Impact: Se jsDelivr è irraggiungibile o compromessa, l'editor non si carica. Senza SRI hash, un attacco supply-chain è teoricamente possibile.
- Fix approach: Per un portfolio personale è accettabile. Per uso aziendale: bundlare Monaco localmente o aggiungere `integrity` SRI.

---

## Gap di Copertura Test

### Nessun unit test per le funzioni critiche degli script

- Issue: `scripts/validate-steps.ts`, `scripts/extract-steps.ts` e `scripts/jira-sync.ts` non hanno test. La logica di `cucumberExprToRegex`, `similarity` (Levenshtein), e il parser `.feature` in `jira-sync.ts` è critica e priva di copertura.
- Files: `scripts/` (nessun `*.test.ts`)
- Impact: Un refactor o un aggiornamento della regex breaking change non verrebbe rilevato. Il parser `.feature` in jira-sync.ts è custom e non usa `@cucumber/gherkin` — bug sottili nel parsing di edge case (Scenario Outline, Background, feature multiriga) sarebbero invisibili.
- Priority: High

### Nessun test per i provider dell'extension VS Code

- Issue: `vscode-extension/src/providers/` non ha test. I provider critici (completionProvider, diagnosticProvider) non sono coperti.
- Files: `vscode-extension/src/providers/` (nessun test)
- Impact: Regressioni nel completion o nella diagnostica non vengono rilevate automaticamente.
- Priority: High (per 5.6 production readiness)

### Nessun test per il Gherkin linter in FeatureEditor

- Issue: `computeLintWarnings` in `docs-site/src/components/FeatureEditor.tsx` è una funzione pura ma non ha test unitari.
- Files: `docs-site/src/components/FeatureEditor.tsx:35-123`
- Impact: I casi edge (scenari senza step, ordine Given/When/Then con And/But, @ticket format) potrebbero produrre falsi positivi/negativi non rilevati.
- Priority: Medium

### I test E2E del main scaffold non hanno un'app reale contro cui girare

- Issue: `npm test` esegue scenari Playwright contro `http://localhost:3000` che tipicamente non esiste. Il CI fa `npm test` che fallisce su qualsiasi app non in esecuzione — ma il CI attuale non avvia nessuna app.
- Files: `.github/workflows/ci.yml:18`, `playwright.config.ts:5`
- Impact: Il CI è verde solo per il dry-run implicito o fallisce silenziosamente se l'app non è avviata. I test reali non vengono mai eseguiti in CI.
- Priority: Medium — il CI dovrebbe almeno avviare un'app mock o documentare esplicitamente che i test richiedono un ambiente separato.

---

## Limiti di Scaling

### `step-catalog.json` cresce linearmente con ogni nuovo step

- Issue: L'extension carica l'intero catalog in memoria e lo ricarica ad ogni `onDidChange`. Il `FsLoader` non ha paginazione né lazy loading.
- Files: `vscode-extension/src/catalog/fsLoader.ts`
- Impact: Con centinaia di step (scenario realistico per un team aziendale con 50+ feature files), il tempo di caricamento e la memoria aumentano. Non critico oggi con 10 step.
- Scaling path: Aggiungere un indice per dominio al caricamento, caricare solo il dominio rilevante al contesto del file aperto.

### Parser `.feature` in `jira-sync.ts` non usa `@cucumber/gherkin`

- Issue: Il parser è scritto a mano con regex. Edge case noti non gestiti: `Background:`, `Rule:`, feature con multipli `Examples:`, step con docstring o data table multiriga.
- Files: `scripts/jira-sync.ts:67-117`
- Impact: Con `.feature` files complessi (Scenario Outline con Examples table, docstrings), il payload inviato a Jira potrebbe essere troncato o malformato.
- Fix approach: Sostituire con il parser ufficiale `@cucumber/gherkin` (già indirettamente disponibile via `@cucumber/cucumber`).

---

## Open Questions da ROADMAP non risolte

Le seguenti decisioni architetturali sono ancora aperte (ROADMAP sezione 8):

- **Visibilità catalog site**: Il sito Starlight (`docs-site/`) è configurato per GitHub Pages deploy ma non è ancora deployato. La decisione "pubblico vs auth-gated" blocca il deploy.
- **Flusso PR per QA non-repo**: Non è deciso se i QA non-repo useranno OAuth GitHub per aprire PR autonomamente o se Steve le aprirà in batch. Questo impatta direttamente l'implementazione del comando "Open PR" nell'extension (ROADMAP 5.6 punto 8).
- **Cucumber Studio / Xray valutazione**: Non è stata fatta la valutazione di mercato raccomandata prima di committarsi a ulteriori 1-2 settimane sull'extension.

---

*Concerns audit: 2026-06-09*
