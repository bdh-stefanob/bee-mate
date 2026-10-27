# Ambienti, app, utenze: piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un ambiente (`qa`, `staging`) contiene più app con i loro indirizzi e
le loro utenze. Scenari, utility e Page Object vanno sull'app giusta
dell'ambiente scelto, senza indirizzi di QA nel codice.

**Architecture:** la nuova sorgente `config/ambienti.json` (versionata) più
`config/credenziali.json` (fuori da git) si legge in `scripts/lib/ambienti.ts`.
`loadTargets`/`resolveTarget` di `targets.ts` diventano una **vista** su quel
modello: un `Target` per ambiente, con la sua app principale come oggi, più la
mappa `apps`. Così sessione, registrazione, diagnosi e cruscotto continuano a
funzionare con il nome dell'ambiente senza riscriverli. Se `config/ambienti.json`
manca, si legge `bdd-targets.json` come oggi.

**Tech Stack:** TypeScript, Playwright, Cucumber, Next.js (web-ui), controlli
`ts-node scripts/lib/*.check.ts`, vitest nel cruscotto.

**Spec:** `docs/superpowers/specs/2026-10-27-ambienti-app-utenze-design.md`

## Global Constraints

- `config/ambienti.json` è versionato, in chiaro, **senza `${…}`**.
- `config/credenziali.json` è in `.gitignore` e non viene mai stampato né mostrato.
- Ambienti: `qa` e `staging`. App: `brochure`, `clinic`, `pims`.
- Indirizzi di staging: `https://staging-brochure.lemonaidhealth.co.uk`,
  `https://staging-clinic.lemonaidhealth.co.uk`, `https://staging.lemonaidpims.co.uk`.
- Utenze di staging: diverse da QA, le aggiunge Stefano. Il file ha i posti vuoti.
- Mai un tentativo di login con una password di ripiego. Un indirizzo assoluto
  sconosciuto è un errore, mai "si va dove c'è scritto".
- La variabile d'ambiente del lancio resta `BDD_TARGET`. `BDD_AMBIENTE` è un alias.
- Commit Conventional, senza Co-Authored-By.

## Review Focus

1. **Uno step vecchio con `vaiA("https://qa-brochure…/")` lanciato su `staging`**
   deve andare su `staging-brochure`, non su QA. Test nel Task 2.
2. **Un ambiente che non ha l'app richiesta** (staging senza pims) deve dare
   errore con il nome di app e ambiente, prima di navigare. Test nel Task 2.
3. **Il pull senza `config/ambienti.json`**: tutto deve girare come oggi da
   `bdd-targets.json`. Test nel Task 1.
4. **Email con maiuscole diverse** fra scenario e configurazione: è la stessa
   utenza. Test nel Task 1.
5. **Un host di QA dentro una Page Object salvata senza `app`**: `navigate()` resta
   relativo, come oggi, e non si rompe. Test nel Task 2.

---

### Task 1: Modello e lettura (`scripts/lib/ambienti.ts`), vista `Target`

**Files:**
- Create: `scripts/lib/ambienti.ts`, `scripts/lib/ambienti.check.ts`
- Modify: `scripts/lib/targets.ts` (`Target`, `loadTargets`, `requiredVars`), `package.json` (`check:ambienti` in `check:all`), `.gitignore` (`config/credenziali.json`)

**Interfaces:**
- Produces:
  - `interface App { url: string; velo?: string; login?: LoginRecipe; utenze?: string[]; utenzaPredefinita?: string }`
  - `interface Ambiente { nome: string; principale: string; collaudo?: true; produzione?: true; pubblico?: true; app: Record<string, App> }`
  - `caricaAmbienti(dir = "config", legacy = "bdd-targets.json"): Ambiente[]`
  - `appDiHost(host: string, ambienti: Ambiente[]): string | undefined`, cioè il nome dell'app che ha quell'host in **qualunque** ambiente
  - `indirizzoApp(amb: Ambiente, app: string, percorso?: string): string`, che lancia `Error("l'ambiente \"staging\" non ha l'app \"pims\"")`
  - `credenziale(env: string, app: string, email: string, file = "config/credenziali.json"): string | undefined`, con email confrontata senza maiuscole
- `Target` acquista `ambiente?: string` e `apps?: Record<string, App>`. `loadTargets()` restituisce un `Target` per ambiente: `url`, `login`, `velo`, `readyWhen`, `utenze` presi dall'app `principale` (la prima con `login`, altrimenti la prima). `utenze` è la mappa email → password letta da `credenziali.json`, che si riusa senza modifiche nel `passwordDellUtenza` del 21/10.
- Fallback: senza `config/ambienti.json` si legge `bdd-targets.json` come oggi, e ogni bersaglio diventa un ambiente con una sola app che porta il suo nome.

- [ ] **Step 1: Write the failing checks** in `ambienti.check.ts`:
  - legacy: un `bdd-targets.json` con `clinic` e `qa-brochure` dà due ambienti, ciascuno con l'app omonima;
  - nuovo: `qa` con tre app, principale `clinic`;
  - `appDiHost("staging-brochure.lemonaidhealth.co.uk")` restituisce `"brochure"`;
  - `appDiHost("altro.invalid")` restituisce `undefined`;
  - `indirizzoApp(staging, "brochure", "/")` restituisce `"https://staging-brochure.lemonaidhealth.co.uk/"`;
  - `indirizzoApp(staging, "pims")` senza pims lancia un errore che nomina "pims" e "staging";
  - `credenziale("qa","clinic","Stefano.Bertaccini+QA2@…")` trova la voce scritta in minuscolo;
  - `loadTargets()` sul nuovo formato ha un target `qa` con `url` di clinic e `apps.brochure.url`.
- [ ] **Step 2:** `npx ts-node scripts/lib/ambienti.check.ts` deve FALLIRE (modulo assente).
- [ ] **Step 3:** implementa `ambienti.ts` e la vista in `targets.ts`.
- [ ] **Step 4:** `npm run check:ambienti && npm run check:targets` devono essere OK.
- [ ] **Step 5:** commit `feat(ambienti): modello ENV -> APPS -> UTENZE con lettura compatibile`.

### Task 2: Esecuzione — indirizzi dall'ambiente

**Files:**
- Modify: `src/support/world.ts` (`vaiA`, `indirizzo`, `password`), `src/support/base.page.ts` (`app`, `navigate`), `src/pages/clinic/accesso-clinic.page.ts` (via `BROCHURE`/`CLINIC`), `src/pages/clinic/servizio-weight-loss.page.ts`
- Test: `scripts/lib/ambienti.check.ts` (la funzione pura di risoluzione)

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `risolviIndirizzo(amb: Ambiente, tutti: Ambiente[], destinazione: string | { app: string; percorso: string }): string` in `ambienti.ts`. Un URL assoluto passa da `appDiHost` e diventa la stessa app nell'ambiente `amb`, con percorso e query intatti. Un host sconosciuto lancia `Error("l'indirizzo … non appartiene a nessuna app")`.
  - `World.indirizzo(app: string, percorso = "/"): string`
  - `World.vaiA(destinazione: string, percorso?: string)`: con due argomenti è app + percorso, con uno è un URL assoluto (forma vecchia).
  - `World.password(app: string, email: string): string`. `passwordAmbiente(email?)` resta e diventa un alias su `password("clinic"…)` per gli step già salvati.
  - `BasePage.app?: string`: se c'è, `navigate()` va a `indirizzoApp(...)`, altrimenti resta relativo come oggi.
  - `AccessoClinicPage` prende gli indirizzi da `ambienteCorrenteDiProcesso()`, esportata da `ambienti.ts`, che legge `BDD_TARGET`/`BDD_AMBIENTE`.

- [ ] **Step 1: Failing checks**:
  - `risolviIndirizzo(staging, tutti, "https://qa-brochure.lemonaidhealth.co.uk/x?y=1")` deve dare `"https://staging-brochure.lemonaidhealth.co.uk/x?y=1"`;
  - `risolviIndirizzo(staging, tutti, { app: "brochure", percorso: "/" })` deve dare l'indirizzo di staging;
  - un host sconosciuto deve lanciare un errore;
  - con un ambiente legacy di un'app sola, un URL del suo stesso host deve restituire lo stesso URL.
- [ ] **Step 2:** i controlli devono FALLIRE.
- [ ] **Step 3:** implementa. In `accesso-clinic.page.ts` sostituisci le costanti con funzioni `brochure()`/`clinic()` che chiamano `ambienteCorrenteDiProcesso()` e `indirizzoApp`.
- [ ] **Step 4:** `npx tsc --noEmit`, `npm run check:all` e `npm run test:dry` devono essere OK. Poi, **su QA con la configurazione di oggi**, Jet Lag e ordine successivo devono essere verdi (`npm run test:bersaglio clinic <feature>`).
- [ ] **Step 5:** commit `feat(esecuzione): indirizzi e password dall'ambiente, niente QA nel codice`.

### Task 3: Generatore — app per host, niente URL assoluti

**Files:**
- Modify: `scripts/lib/generate-emit.ts` (`vaiA`, `readonly app` nella Page Object), `templates/page-object.ts.tmpl` (segnaposto `{{APP_LINE}}`), `src/support/utility.ts` (riconoscimento: app invece della regex `qa-(clinic|brochure)`), `scripts/lib/generate-core.ts` (avviso dei due domini solo se un host non è un'app)
- Test: `scripts/lib/generate-core.check.ts`, `scripts/lib/utility.check.ts`

**Interfaces:**
- Consumes: `appDiHost`, `caricaAmbienti` (Task 1).
- Produces: una Page Object generata ha `readonly app = "<app>";` quando l'host è noto. Un clic verso un'altra pagina genera `await this.vaiA("<app>", "<percorso>");`.

- [ ] **Step 1: Failing checks**:
  - una registrazione su `qa-brochure` e `qa-clinic` deve dare Page Object con `readonly app = "brochure"` e `"clinic"`;
  - il clic sul logo deve dare `this.vaiA("brochure", "/")` e **nessun** `https://` nella glue;
  - la utility di accesso deve essere riconosciuta anche su `staging-clinic`;
  - con due host tutti e due noti, nessun avviso "2 domini".
- [ ] **Step 2:** i controlli devono FALLIRE.
- [ ] **Step 3:** implementa.
- [ ] **Step 4:** `npm run check:generate && npm run check:utility && npm run check:templates` devono essere OK.
- [ ] **Step 5:** commit `feat(generazione): pagine legate alla loro app, nessun indirizzo assoluto`.

### Task 4: Migrazione — `npm run ambienti:migra` e scenari salvati

**Files:**
- Create: `scripts/ambienti-migra.ts`, `config/ambienti.json` (scritto dalla migrazione, poi rivisto a mano per `staging`)
- Modify: `package.json` (`ambienti:migra`), Hair loss steps (`vaiA("brochure", "/")`), le Page Object salvate sotto `src/pages/clinic/` e `src/pages/qa-brochure/` (`readonly app`)
- Test: `scripts/lib/ambienti.check.ts` (funzione pura `migra(legacy, env): { ambienti, credenziali }`)

**Interfaces:**
- Produces: `migra(targets: Record<string, unknown>, env: NodeJS.ProcessEnv): { ambienti: Record<string, unknown>; credenziali: Record<string, unknown> }`. Unisce `clinic` e `qa-brochure` in `qa`. Converte la ricetta come in §4.1 della spec. Per `staging` scrive gli indirizzi e le utenze **vuote**: `"utenze": []`, credenziali `{}`, più un `"_istruzioni"` che dice dove aggiungerle.
- Lo script stampa l'anteprima, scrive solo con `scrivi`, e non tocca `bdd-targets.json`.

- [ ] **Step 1: Failing check**: `migra` su un `bdd-targets.json` con `clinic` (login con `${CLINIC_USER}`/`${CLINIC_PASS}`, `utenze`, `velo`) e `qa-brochure` deve dare `qa.app.clinic` con `utenze` in chiaro e `qa.app.brochure.url`; le credenziali devono contenere i valori risolti da `env`, e nessuna stringa `${` nel risultato.
- [ ] **Step 2:** il controllo deve FALLIRE.
- [ ] **Step 3:** implementa e lancia `npm run ambienti:migra scrivi` sulla macchina. Poi aggiungi a mano `pims` di QA e l'ambiente `staging` completo, con le utenze vuote.
- [ ] **Step 4:** su QA, **dalla nuova configurazione**, Jet Lag, Hair loss e ordine successivo devono essere verdi. Poi `npx tsc --noEmit` e `npm run check:all`.
- [ ] **Step 5:** commit `feat(ambienti): migrazione e configurazione qa/staging` (`config/ambienti.json` sì, `credenziali.json` no).

### Task 5: Cruscotto — ambiente scelto, app, utenze

**Files:**
- Modify: `web-ui/src/lib/configurazione.ts` (lettura e scrittura su `config/ambienti.json` e `config/credenziali.json` quando esistono), `web-ui/src/app/api/configurazione/**`, `scripts/diagnosi.ts` (pronto = URL di ogni app più password di ogni utenza elencata), la sezione Ambienti del Controllo
- Test: `web-ui/__tests__/lib/configurazione*.test.ts`, `scripts/lib/diagnosi.check.ts`

**Interfaces:**
- Consumes: Task 1.
- Il selettore della barra laterale elenca già gli ambienti, perché `loadTargets` è una vista (Task 1): qui non si tocca.
- Il Controllo mostra, per ogni ambiente, le app con l'URL e le utenze con "password presente/mancante". Permette di aggiungere un'utenza (email più password) e di modificare l'URL di un'app.

- [ ] **Step 1: Failing tests**:
  - la diagnosi di `staging` senza password per un'utenza elencata deve essere "manca la password di <email> su staging/clinic", senza valori;
  - aggiungere un'utenza deve scrivere l'email in `ambienti.json` e la password in `credenziali.json`, e la risposta della rotta non deve contenere la password.
- [ ] **Step 2:** i test devono FALLIRE.
- [ ] **Step 3:** implementa.
- [ ] **Step 4:** `cd web-ui && npx vitest run && npm run build`, `npm run check:all`, più una prova nel browser: Controllo, ambiente `staging`, aggiunta di un'utenza.
- [ ] **Step 5:** commit `feat(cruscotto): ambienti con app e utenze`.

---

**Rinviati rispetto alla spec, per velocità** (decisione del 27/10):
- la sessione resta una per ambiente (`reports/sessions/<env>.json`), non una per
  ambiente e utenza (§4.2);
- la registrazione parte dall'app principale dell'ambiente; la scelta di app e
  utenza al momento di registrare (§4.4) viene dopo.

Fuori da questo piano: tutto ciò che la spec mette in §7. Prove su staging ed
export (Fase 3) dopo il Task 4.
