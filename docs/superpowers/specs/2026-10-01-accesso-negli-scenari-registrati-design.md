# L'accesso negli scenari registrati — design

> Specifica approvata il 2026-10-01 (D1, D2, D3 confermate come proposte).

## Il problema

Una registrazione fatta su un ambiente con la **sessione salvata** comincia gia'
dentro l'applicazione: `scripts/record.ts` apre il browser con
`storageState`, e il primo passo del tester avviene su una pagina che si vede
solo da autenticati.

Il generatore non lo sa. Nel primo step emette `navigate()` verso quella pagina
(`scripts/lib/generate-emit.ts`, `emitSteps`) e nessun accesso. Lo scenario che
ne esce:

- gira finche' sulla macchina c'e' una sessione ancora valida;
- cade al primo passo con un browser pulito (`BDD_NO_SESSION=1`), con una
  sessione scaduta, o su un'altra macchina — l'applicazione rimanda alla pagina
  di accesso e `assertLoaded()` aspetta dieci secondi un elemento che non c'e'.

Il sintomo ("elemento non trovato" sulla prima pagina) non assomiglia alla
causa (manca l'accesso), e lo scenario salvato nel repository **sembra** un
test completo senza esserlo.

## Cosa deve essere vero alla fine

1. Uno scenario registrato a partire da una sessione salvata comincia con un
   passo di accesso esplicito, leggibile nel `.feature`.
2. Quel passo funziona in tutti e due i modi di partire: con la sessione valida
   non rifa' il login; senza, lo esegue.
3. L'accesso e' eseguito da una Page Object, costruita da cio' che «Registra
   l'accesso» ha gia' catturato. Nessun selettore negli step.
4. Lo stesso scenario e' verde sia con la sessione sia con `BDD_NO_SESSION=1`,
   sul negozio di prova.
5. Dove l'accesso non si puo' automatizzare (MFA, nessun accesso registrato) il
   passo lo dice con un messaggio che nomina la causa e il rimedio.

## Fuori da questo lavoro

- Gli scenari gia' salvati non vengono riscritti.
- Una registrazione che **contiene** il login (fatta senza sessione) resta
  com'e': i suoi passi di accesso sono quelli del tester.
- Nessun cambiamento a come la sessione si salva o scade.

## Il disegno

### 1. La registrazione dice da dove e' partita

`Recording` (in `scripts/lib/generation-contract.ts`) guadagna due campi
facoltativi, scritti da `record.ts`:

```ts
/** Il browser e' stato aperto con una sessione salvata: si e' partiti gia' dentro. */
startedWithSession?: boolean;
/** Il nome dell'ambiente, se la registrazione e' partita da un ambiente nominato. */
target?: string;
```

Assenti nelle registrazioni vecchie: valgono `false` / nessun ambiente, e la
generazione si comporta come oggi.

### 2. Il passo di accesso, uno solo per tutti

Uno step canonico nuovo, definito **una volta** in
`src/steps/common/accesso.steps.ts`, come gia' `the page shows {string}`:

```gherkin
Given the user is logged in
```

E' dichiarativo (dice lo stato, non i clic) e non porta parametri: l'ambiente
e' quello su cui si sta eseguendo. Sta in `common` perche' due scenari salvati
che definissero la stessa frase farebbero rifiutare a Cucumber di partire — e'
la stessa ragione per cui `verifica.steps.ts` esiste.

Lo step e' glue sottile: chiama `this.assicuraAccesso()` sul World e basta.

**Questo e' uno step nuovo nel catalogo.** Per le regole del progetto va
approvato prima di essere implementato: approvare questa specifica vale come
quell'approvazione. Entra nel catalogo con `npm run catalog`, non a mano.

### 3. Cosa fa `assicuraAccesso()`

Vive in `src/support/accesso.ts`, chiamata dal World. In ordine:

1. apre l'indirizzo dell'ambiente (`baseURL`);
2. guarda dove si trova, aspettando al massimo 5 secondi il primo fra:
   - l'indirizzo contiene `readyWhen` → **gia' dentro**, fine;
   - il primo campo dell'accesso registrato e' visibile → **serve il login**;
   - nessuno dei due → **gia' dentro** (sessione valida, pagina iniziale senza
     `readyWhen`), fine;
3. se serve il login, lo esegue con la Page Object (punto 4) e poi, se c'e'
   `readyWhen`, aspetta che l'indirizzo lo contenga.

Gli errori, ciascuno con il suo messaggio:

| Situazione | Messaggio |
|---|---|
| Serve il login ma l'ambiente non ha un accesso registrato | la sessione manca o e' scaduta, e l'accesso di questo ambiente e' manuale: rifare «Accedi adesso» dal Controllo |
| Una credenziale dell'accesso non e' in `.env` | quale variabile manca, e che si compila nella riga dell'ambiente |
| Dopo il login `readyWhen` non arriva | dove si e' finiti (indirizzo), e che puo' esserci un passo in piu' (MFA) da fare a mano con «Accedi adesso» |
| Si esegue con un indirizzo diretto (`BASE_URL`, nessun ambiente) | il passo di accesso richiede un ambiente nominato |

A differenza di `scripts/session.ts`, qui un passo del login che non riesce
**e' un errore**: in una sessione manuale il tester finisce a mano, in un test
non c'e' nessuno a finire.

### 4. La Page Object dell'accesso

`src/pages/common/accesso.page.ts`, classe `AccessoPage extends BasePage`,
scritta una volta. I suoi locator vengono dal blocco `login` dell'ambiente —
cioe' da cio' che «Registra l'accesso» ha derivato dalla registrazione
(`web-ui/src/lib/derivazione-login.ts`):

- `chiudiAvvisi()` — i `dismiss`, tollerati se assenti (`dismissIfPresent`);
- `accedi()` — i passi in ordine: compila, compila, premi; i valori vengono
  dalle `${VARIABILE}` risolte da `.env`, mai dal codice;
- `assertLoaded()` — il primo campo dell'accesso e' visibile;
- `campoIniziale()` — il locator che il punto 3 usa per capire se serve il login.

La costruzione del locator da `{ role, name, selector }` oggi vive dentro
`scripts/session.ts` (`locate`). Si sposta in `scripts/lib/targets.ts`, cosi'
sessione manuale e test usano la stessa regola.

**Perche' una Page Object guidata dai dati e non una generata per applicazione.**
L'alternativa era generare `src/pages/<app>/accesso.page.ts` con i locator
scritti dentro, e versionarla. Pro: viaggia con il repository, su un'altra
macchina bastano le credenziali. Contro, e sono quelli che decidono:

- lo step e' uno solo e sta in `common`: non puo' importare la Page Object di
  un'applicazione, quindi servirebbe o uno step per applicazione
  (`the user is logged in to shop`) o un registro che la trova a runtime;
- registrare di nuovo l'accesso dovrebbe rigenerare un file versionato che
  qualcuno puo' aver gia' toccato a mano;
- i selettori dell'accesso stanno oggi in `bdd-targets.json`, fuori da git, e
  ne avremmo due copie.

Il prezzo della scelta fatta: l'accesso registrato resta **per macchina**, come
la sessione. Su una macchina nuova si fa «Registra l'accesso» una volta. E' il
punto su cui serve una decisione esplicita (vedi sotto, D1).

### 5. Cosa cambia nella generazione

Quando `recording.startedWithSession` e' vero:

- `emitFeature` mette `Given the user is logged in` come primo passo; il primo
  passo del tester, che oggi e' `Given`, diventa `And`;
- `emitSteps` non cambia: il primo step del tester continua a fare
  `navigate()` verso la sua pagina, che ora arriva dopo l'accesso;
- il file degli step generato **non** definisce il passo di accesso (e' in
  `common`), quindi il salvataggio dal cruscotto (`salva-glue.ts`) non cambia.

Quando e' falso o assente: nessuna differenza rispetto a oggi.

Se la registrazione e' partita con una sessione ma l'ambiente **non ha un
accesso registrato**, il passo viene emesso lo stesso (lo scenario resta
onesto su cosa presuppone) e la generazione lo segnala fra le cose «da
guardare»: finche' l'accesso non viene registrato, lo scenario gira solo con
una sessione valida.

## Verifica

Controlli deterministici (`npm run check:generate`, piu' uno nuovo per
l'accesso):

- registrazione con `startedWithSession: true` → la feature comincia con
  `Given the user is logged in`, e il primo passo del tester e' `And`;
- registrazione senza il campo → feature identica a oggi;
- il file degli step generato non contiene la frase dell'accesso;
- `assicuraAccesso` con una pagina finta: gia' dentro per `readyWhen`, gia'
  dentro per attesa scaduta, login eseguito, e i quattro errori della tabella.

Prova sull'applicazione vera, ambiente `demo` (saucedemo):

1. «Registra l'accesso», poi «Accedi adesso» (sessione salvata);
2. registrare "aggiungi al carrello" partendo dalla sessione, generare;
3. eseguire lo scenario **con** la sessione → verde;
4. eseguirlo con `BDD_NO_SESSION=1` → verde;
5. togliere una credenziale da `.env` ed eseguire senza sessione → rosso, con
   il messaggio che nomina la variabile.

`npx tsc --noEmit`, `npm run test:dry` e `npm run catalog` verdi.

## Decisioni da confermare

- **D1 — Page Object guidata dai dati (proposta) o generata per applicazione.**
  La proposta tiene l'accesso per macchina. Se deve viaggiare con il
  repository, si passa alla generata, con uno step per applicazione.
- **D2 — La frase.** `the user is logged in`. Alternative: `the user is signed
  in`, o con il ruolo (`the user is logged in as {string}`) se un giorno un
  ambiente avra' piu' di un utente — oggi ne ha uno.
- **D3 — Sessione valida ma la pagina iniziale mostra comunque il modulo di
  accesso** (saucedemo fa cosi'): il passo rifa' il login. E' piu' lento di
  qualche secondo ma sempre corretto; l'alternativa (fidarsi della sessione
  senza guardare) e' quella che oggi fallisce quando la sessione scade.
