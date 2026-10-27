# Ambienti, app, utenze (ENV → APPS → UTENZE)

*Spec del 2026-10-27. Stato: da approvare. Fase 1 del piano del 27/10.*

## 1. Il problema

Oggi un "ambiente" di `bdd-targets.json` corrisponde a **una sola app**: un URL,
un login, una sessione. Ne seguono quattro difetti, visti tra il 15/10 e il 21/10:

1. **Indirizzi di QA scritti nel codice.** `src/pages/clinic/accesso-clinic.page.ts`
   contiene `BROCHURE`/`CLINIC` di QA, e gli step generati contengono
   `vaiA("https://qa-brochure…/")`. Un lancio "su staging" farebbe l'accesso e il
   ritorno alla brochure **su QA**, in silenzio.
2. **Un flusso su due domini non ha la base giusta.** Le Page Object hanno un
   `path` relativo all'unico URL dell'ambiente: quelle di brochure e quelle di
   clinic non possono essere giuste tutte e due. Il generatore lo segnala ("Il
   percorso attraversa 2 domini diversi").
3. **La stessa applicazione compare con due nomi** (`clinic`, `qa-brochure`), e
   "qa" fa parte del nome invece di essere l'ambiente.
4. **Le credenziali stanno nel file di configurazione come `${VARIABILE}`**, che
   Stefano non vuole. Le utenze sono state aggiunte il 21/10 (`utenze` per
   ambiente), ma l'ambiente resta "una app".

## 2. Decisioni già prese (Stefano)

- Un ambiente (qa, staging, …) contiene **più app** (brochure, clinic, pims),
  ognuna con il suo URL e le sue utenze. Scelto l'ambiente, tutte le app puntano lì.
- La configurazione degli ambienti è **in chiaro e versionata**, **senza** `${…}`.
- Le **credenziali stanno altrove**, fuori da git.
- Login e sessione salvata sono **facoltativi**: un aiuto in più, non un requisito.
- Le utenze devono essere **flessibili per ambiente**: su staging possono essere le
  stesse di QA o altre.
- Il percorso dipende dallo stato dell'utenza (21/10), quindi uno scenario gira
  **con la sua email** e con la password di quella.

## 3. Il modello

### 3.1 `config/ambienti.json`, versionato

```jsonc
{
  "qa": {
    "collaudo": true,                       // come oggi: mai presunto (N10)
    "app": {
      "brochure": { "url": "https://qa-brochure.lemonaidhealth.co.uk" },
      "clinic": {
        "url": "https://qa-clinic.lemonaidhealth.co.uk",
        "velo": ".loading-dialog",
        "login": {                          // facoltativo: la ricetta, SENZA valori
          "dismiss": [{ "role": "button", "name": "Accept All" }],
          "email":    { "role": "textbox", "name": "Email" },
          "password": { "selector": "input[type=password]" },
          "invia":    { "role": "button", "name": "Log In" },
          "pronto":   "/account"
        },
        "utenze": [
          "stefano.bertaccini+qa2@bootsdigitalhealth.co.uk",
          "stefano.bertaccini+22@bootsdigitalhealth.co.uk"
        ],
        "utenzaPredefinita": "stefano.bertaccini+22@bootsdigitalhealth.co.uk"
      },
      "pims": { "url": "https://qa.lemonaidpims.co.uk", "utenze": ["…"] }
    }
  },
  "staging": { "app": { "brochure": { … }, "clinic": { … }, "pims": { … } } }
}
```

- **Il nome dell'app è stabile** fra gli ambienti (`clinic` è `clinic` su qa e su
  staging). È la chiave che lega scenari e Page Object a un indirizzo.
- **Le utenze sono email, non segreti**: stanno qui in chiaro. Compaiono già nei
  `.feature` salvati.
- `collaudo` / `produzione` / `pubblico` restano a livello di ambiente, con le
  regole di N10.

### 3.2 `config/credenziali.json`, fuori da git

```jsonc
{ "qa": { "clinic": { "stefano.bertaccini+qa2@…": "…", "stefano.bertaccini+22@…": "…" } },
  "staging": { "clinic": { … } } }
```

Solo password, indicizzate per **ambiente → app → email**. Lo scrive il
Controllo del cruscotto, oppure lo si scrive a mano. Non è mai letto dal
browser e non viene mai mostrato.

### 3.3 Come si risolve un indirizzo

- **Ambiente scelto:** `BDD_AMBIENTE` (es. `qa`), impostato dal cruscotto o da
  `npm run test:ambiente qa`.
- **Pagina di un'app:** `indirizzo(app, percorso)` = `ambienti[env].app[app].url + percorso`.
- **Indirizzo assoluto già scritto** (step salvati prima di questo lavoro, es.
  `vaiA("https://qa-brochure…/")`): si cerca l'host fra **tutte** le app di
  **tutti** gli ambienti. Se è l'app `brochure` di qa, diventa l'app `brochure`
  dell'ambiente scelto. Se l'host non appartiene a nessuna app, **errore**: mai
  "si va dove c'è scritto".
- **App assente nell'ambiente scelto** (es. staging senza pims): errore prima di
  iniziare lo scenario, con il nome dell'app e dell'ambiente.

### 3.4 Come si risolve una password

`password(env, app, email)` legge `credenziali.json`:

- c'è → la si usa;
- l'email non è fra le `utenze` dell'app → errore **prima** del login ("su staging
  l'app clinic non ha l'utenza …");
- l'email è fra le utenze ma manca la password → errore **prima** del login ("manca
  la password di … su staging/clinic").

Mai un tentativo con una password di ripiego: il sito blocca l'account dopo 6.

## 4. Cosa cambia nel codice

### 4.1 Lettura della configurazione (`scripts/lib/ambienti.ts`, nuovo)

- `caricaAmbienti()`, `ambienteCorrente()`, `indirizzo(app, percorso)`,
  `appDiHost(host)`, `password(env, app, email)`, `utenzaPredefinita(env, app)`.
- **Compatibilità:** se `config/ambienti.json` non c'è e c'è `bdd-targets.json`,
  lo si legge convertendolo in memoria (ogni bersaglio diventa un ambiente con una
  sola app, che si chiama come il bersaglio). Niente si rompe il giorno del pull.
- **Migrazione esplicita:** `npm run ambienti:migra`, proposta dal Controllo,
  scrive `config/ambienti.json` e `config/credenziali.json` da `bdd-targets.json`
  e `.env`. Unisce in un ambiente `qa` i bersagli che oggi sono app di QA
  (`clinic`, `qa-brochure`). Prima mostra cosa farebbe, e scrive solo dopo una
  conferma. `bdd-targets.json` non si cancella.
- **Ricetta di login:** il formato di oggi (`steps` con `fill`/`value`/`click`) si
  converte così. Il `fill` con un valore normale diventa `email`, e quel valore
  diventa l'`utenzaPredefinita`. Il `fill` sulla password diventa `password`, e il
  suo valore va in `credenziali.json`. Il `click` diventa `invia`, e `readyWhen`
  diventa `pronto`. Una ricetta con passi che non rientrano in questo schema resta
  com'è sotto `login.passi`, e il Controllo la segnala.

### 4.2 Esecuzione (`src/support/`)

- `BasePage` dichiara `readonly app: string`. `navigate()` va a
  `indirizzo(this.app, this.path)`, non al `baseURL` del contesto.
- `World.vaiA(app, percorso)`. La forma vecchia `vaiA(urlAssoluto)` passa da
  `appDiHost` (§3.3), così gli step già salvati girano su staging senza modifiche.
- `World.passwordAmbiente(email)` diventa `World.password(app, email)`. La forma
  vecchia resta e risolve con l'app dello scenario (la prima cartella sotto
  `src/features/`).
- `accesso-clinic.page.ts`: spariscono `BROCHURE`/`CLINIC`, sostituite da
  `indirizzo("brochure", "/")` e `indirizzo("clinic", percorso)`.
- **Sessione salvata:** una per ambiente e utenza,
  `reports/sessions/<env>/<email>.json`. Uno storageState copre tutti i domini.
  Resta facoltativa: senza, lo scenario fa il login.

### 4.3 Generatore

- Ogni pagina registrata ottiene la sua app da `appDiHost(host)`, e la Page Object
  generata scrive `readonly app = "brochure"`.
- Un clic che porta altrove si genera come `vaiA("brochure", "/")`, mai con un
  URL assoluto.
- Il riconoscimento delle utility (oggi `qa-(clinic|brochure)` nell'host) usa
  l'app (`clinic`, `brochure`) in qualunque ambiente.
- Un host che non appartiene a nessuna app dichiarata diventa un avviso "DA
  GUARDARE", con la proposta di aggiungerlo all'ambiente.
- L'avviso "il percorso attraversa 2 domini" sparisce quando tutti e due gli host
  sono app dello stesso ambiente.

### 4.4 Cruscotto

- **Selettore nella barra laterale:** si sceglie l'**ambiente** (qa, staging), non
  più l'app.
- **Controllo, sezione Ambienti:** per ogni ambiente le sue app (URL modificabile),
  le loro utenze (email) e, per ognuna, la password presente o mancante, mai il
  valore. Si scrive su `config/ambienti.json` (che è versionato: la modifica
  compare fra i file da salvare in git) e su `config/credenziali.json`.
- **Diagnosi:** "pronto" per un ambiente vuol dire URL di ogni app presente e
  password per ogni utenza usata dagli scenari salvati. Si dicono i nomi, mai i
  valori.
- **Registrazione:** si sceglie ambiente, app di partenza e utenza (predefinita
  dell'app). L'email registrata resta il parametro dello scenario come oggi.

### 4.5 Migrazione degli scenari salvati

Nessuna riscrittura obbligatoria (vedi §3.3 e §4.2), ma per pulizia:

- `vaiA("https://qa-brochure…/")` in Hair loss → `vaiA("brochure", "/")`;
- le Page Object salvate ricevono `readonly app` dalla loro cartella di origine
  (`pages/qa-brochure/` → `brochure`) o dall'host del loro commento di generazione;
- `src/features/qa-brochure/` resta dov'è (spostarlo è S1, dopo la demo).

## 5. Errori, sempre prima di fare danni

| Situazione | Quando si scopre | Messaggio |
|---|---|---|
| ambiente sconosciuto | avvio | elenco degli ambienti disponibili |
| app dello scenario assente nell'ambiente | avvio dello scenario | "staging non ha l'app pims" |
| host assoluto non riconosciuto | `vaiA` / navigazione | "l'indirizzo … non appartiene a nessuna app" |
| utenza non elencata / password mancante | prima del login | §3.4 |
| `config/ambienti.json` illeggibile | avvio | file e riga, niente ripiego silenzioso |

## 6. Prove

- **Controlli puri (`check:ambienti`):** conversione da `bdd-targets.json`;
  `indirizzo`; `appDiHost` su host di qa e di staging; i tre casi di §3.4; app
  assente.
- **Generatore (`check:generate`):** una registrazione su due host produce Page
  Object con `app` diverse e `vaiA("brochure", "/")`, senza URL assoluti.
- **Cruscotto (vitest):** lettura e scrittura di ambienti e credenziali; la diagnosi
  nomina, non mostra.
- **Dal vivo su QA:** Hair loss, ordine successivo, secondo ordine di Weight Loss e
  Jet Lag verdi con `BDD_AMBIENTE=qa`, dopo la migrazione.
- **Staging:** lo stesso giro, quando ci sono gli indirizzi e le utenze.

## 7. Fuori da questa spec

- Scenari clinic → PIMS in serie, con l'ordine passato come parametro (backlog).
- Spostare le Page Object in `pages/<app>/` per app reale (S1).
- Utenze con ruolo (paziente, clinico) invece della sola email.
- Login con SSO o MFA.

## 8. Domande aperte

1. **Indirizzi di staging** (risposta del 27/10): gli stessi di QA con `staging-` al
   posto di `qa-`, cioè `https://staging-brochure.lemonaidhealth.co.uk` e
   `https://staging-clinic.lemonaidhealth.co.uk`. Si scrivono per intero in
   `ambienti.json`, senza ricavarli dal prefisso. **Da confermare** PIMS, che su
   QA è `qa.lemonaidpims.co.uk` (con il punto): su staging si suppone
   `staging.lemonaidpims.co.uk`.
2. **Le utenze di staging** sono le stesse di QA?
3. **Il nome degli ambienti:** `qa` e `staging` vanno bene, o usate altri nomi
   (es. `uat`)?
