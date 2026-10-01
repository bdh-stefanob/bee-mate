# Esecuzione avanzata — design

> Bozza del 2026-10-01, **con le decisioni del proprietario del 2026-10-01**
> (§11: dieci domande decise, tre fuori dalla raccomandazione iniziale: utenze
> nell'ambiente subito, demo su un'applicazione aziendale, finestre affiancate in
> automatico). Sotto-progetto 4 di 5. Dice cosa significano quattro capacita' (lanci multipli, scenari in
> serie, lanci in parallelo, parallelo con utenze diverse), quale scegliere, in
> che ordine consegnarle e come provarle. Le stime in giorni sono **stime**, non
> misure: nessuna e' stata provata su una macchina.

## Stato di partenza (verificato nel codice il 2026-10-01)

| Fatto | Dove |
|---|---|
| Un solo lucchetto: `registrazione`, `sessione`, `scansione` e `test` sono nell'elenco `LUNGHI`, e `avvia()` rifiuta se una qualunque e' in corso. Nessuna coda | `web-ui/src/lib/registro.ts` |
| `operazioneInCorso()` restituisce una sola operazione (il primo risultato, "l'unico possibile") | `registro.ts` |
| Lo stato sta in `globalThis.__bddRegistro`: memoria del processo server | `registro.ts` |
| ~~L'id era `<nome>-<tempo in base 36>`: due lanci nello stesso millisecondo collidevano~~ **Corretto (S0, 1/10/2026)**: `<nome>-<tempo>-<n>`, con un contatore nello stato condiviso | `registro.ts` |
| ~~`Parametri.scenario` e' **una** stringa~~ **Fatto (S0)**: `Parametri.scenari: string[]` (1-100 voci, validate), e `scenario` resta identico finche' la schermata lo usa | `web-ui/src/lib/esecuzione.ts` |
| Lo script sa gia' ricevere **piu'** percorsi (`args.slice(1)` filtrato) e li passa a Cucumber in `BDD_PATHS`, separati da `;` | `scripts/test-bersaglio.ts` |
| Un processo Cucumber per run, lanciato con `execFileSync`. ~~Non verificato~~ **Verificato (S0, 1/10/2026, Windows 11, Node 24, browser nascosto): se la finestra uccide `test-bersaglio`, muoiono anche Cucumber e tutti i browser, entro mezzo secondo. Nessun orfano** (§3, Interrompi) | `registro.ts`, `test-bersaglio.ts` |
| Nessuna impostazione `parallel` (resta cosi': `paralleli=N` e' la fetta S4). ~~Il report HTML scriveva su un file fisso~~ **Fatto (S0)**: `BDD_HTML`, e `test-bersaglio` lo mette accanto ai messaggi | `cucumber.js`, `scripts/lib/lancio-test.ts` |
| `AMBIENTE = ambiente()` e' una costante di modulo, risolta una volta per processo da `BDD_TARGET`. Ogni scenario apre browser, contesto e pagina propri e li chiude in `After`. Nessun `BeforeAll`/`AfterAll` nel repository | `src/support/world.ts`, `hooks.ts` |
| Un ambiente = un file di sessione = una ricetta di login. Nessun concetto di piu' utenti per ambiente | `scripts/lib/targets.ts` |
| Gli esiti si leggono dal flusso di messaggi `.ndjson`, ma `leggiPassiTest` li restituisce **piatti**: nessun raggruppamento per scenario | `web-ui/src/lib/artefatti.ts` |
| La schermata ha un solo flusso SSE e un solo polling dei passi, e ricorda **un** id in `sessionStorage` | `esecuzione/page.tsx`, `riaggancio-client.ts` |
| L'ambiente e' uno per tutta la finestra (barra laterale) | `AmbienteContext.tsx` |

Una cosa che questa bozza **non** ha potuto leggere: la spec della pagina
"Scenari" (`2026-10-01-pagina-scenari-design.md`) non esiste ancora nel
repository, quindi il contratto verso di lei (§5) e' una **richiesta**, non un
fatto.

**Le ipotesi su Cucumber 10.9 sono state provate il 1/10/2026 (fetta S0)**, ognuna
con un controllo che gira in `npm run check:all`: l'**ordine** dei percorsi e' quello
dato; **due righe dello stesso file** girano una volta ciascuna (nell'ordine del
file); un **file intero piu' una sua riga** esegue solo la riga (l'opposto di cio'
che la prima bozza supponeva: il lanciatore ora tiene l'intero); il **fail-fast**
lascia gli scenari restanti `SKIPPED` nel flusso; **`--parallel` con il formatter
`message`** da' ogni scenario una volta sola. L'esito, con i dettagli, e' nei punti
dove ognuna e' usata (§1, §2, §3). Provate con un browser nascosto e senza rete:
non su una macchina aziendale.

## Il vocabolario di questa spec

- **Corsia**: un processo di test, su **un** ambiente, con una lista di
  scenari. E' l'unita' che il registro lancia, ferma e legge.
- **Lancio**: una o piu' corsie partite insieme dalla stessa pressione di
  "Lancia".

Tutto il resto (piu' scenari, piu' ambienti, piu' worker) si dice con queste due
parole. Una corsia e' esattamente cio' che oggi si chiama "un'esecuzione di
`test`": non nasce un secondo concetto di esecuzione.

## 1. Lanci multipli

### Cosa significa per il tester

"Ho tre scenari del carrello e due del pagamento: li voglio provare insieme e
vedere subito se e' tutto verde." Oggi sceglie uno scenario, un file, oppure
"tutti i registrati": niente in mezzo. Vuole anche, senza saperne il nome,
"tutto il flusso del carrello" o "tutta l'applicazione" (voce ancora aperta in
`ROADMAP.md` §4, item 3).

### Approcci

| | Come | Pro | Contro |
|---|---|---|---|
| **A. Lista esplicita** | `scenari` e' una lista di percorsi validati; la UI ha caselle da spuntare, e "un flusso" o "un'applicazione" sono scorciatoie che spuntano tutte le caselle del gruppo | Un solo concetto lato server. Il gruppo vive solo nella UI: nessuna superficie nuova da proteggere. Il server vede sempre cio' che verra' eseguito | Con molti file la lista e' lunga (si limita, vedi sotto) |
| **B. Gruppo lato server** | Un parametro `gruppo` (`src/features/<app>/<flusso>`), il server (o Cucumber) espande la cartella | Una riga sola | Un secondo tipo di valore da validare. Cosa entra nel gruppo lo decide il disco al momento del lancio, non il tester che ha guardato la schermata: un file aggiunto un secondo prima parte senza che nessuno l'abbia visto |
| **C. Per tag** (`@app`, `@flow`) | Espressione di tag in `BDD_TAGS` | Gia' supportata da Cucumber | Non e' verificato che i tag emessi dalla generazione abbiano una forma utilizzabile come filtro; il tester non sa cosa sia un tag; il risultato dipende da cio' che e' scritto nei file |

**Raccomandazione: A.** E' il solo approccio in cui "cio' che il tester ha
spuntato" e "cio' che il server esegue" sono la stessa lista. Cresce senza
toccare l'elenco chiuso.

### Cosa cambia nel codice

- `web-ui/src/lib/esecuzione.ts`: `Parametri.scenario?: string` diventa
  `scenari?: string[]`. Validazione: ogni voce con la regex di oggi (quindi mai
  `;`, mai `..`), da 1 a **100** voci (stima: 100 percorsi da ~60 caratteri sono
  ~6 KB, sotto il limite di riga di Windows), nessun duplicato (un errore che nomina la voce). Se un file
  compare intero **e** con una riga, resta solo l'intero: **provato su Cucumber
  10.9** che dati `a.feature` e `a.feature:3` esegue SOLO la riga 3, senza errore,
  quindi il lanciatore tiene l'intero e scarta le righe di quel file. Due righe
  dello stesso file restano due voci (vedi "Verifiche" sotto). **Fatto in S0.**
  Il vecchio `scenario` si tiene finche' la schermata lo usa (i due insieme sono un
  errore) e si toglie quando la schermata passa alla lista.
- `scripts/test-bersaglio.ts`: gia' accetta piu' percorsi posizionali; nessuna
  opzione nuova per questa capacita'.
- `web-ui/src/lib/artefatti.ts`: nuova `leggiScenariTest(percorso)`, che
  raggruppa per scenario (vedi sotto). `leggiPassiTest` resta, per i
  chiamanti che vogliono la lista piatta, e diventa la sua appiattitura.
- `esecuzione/page.tsx` e `PassoTest.tsx`: scelta multipla e risultato per
  scenario.
- `/api/scenari` e `lib/scenari.ts` non cambiano: l'elenco dei file e degli
  scenari con la loro riga c'e' gia'.

### Come si mostra il risultato di N scenari

Letto dal `.ndjson`, mai dalla prosa. Per ogni scenario (`pickle` + `testCase` +
`testCaseStarted` + `testCaseFinished`, legati dagli id che Cucumber mette):

```ts
interface ScenarioEseguito {
  file: string;            // pickle.uri
  nome: string;            // pickle.name
  esito: 'passato' | 'fallito' | 'saltato' | 'in corso';
  passi: Passo[];          // gli stessi di oggi
}
```

La schermata mostra, nell'ordine:

1. **Il totale in una riga** in cima: "5 scenari: 3 passati, 1 fallito, 1 saltato".
   Icona e parola, mai solo il colore.
2. **"Vai al primo fallito"**: sposta il fuoco sul primo scenario rosso.
3. **Uno scenario per volta, ripiegabile**: i passati stanno chiusi, i falliti
   aperti, con la schermata catturata e la frase "pagina attesa / indirizzo
   reale" che c'e' gia'.

Una cosa va corretta prima di tutto il resto: con piu' scenari (e a maggior
ragione in parallelo) i messaggi di scenari diversi si **mescolano** nel file.
Il lettore di oggi appiattisce; quello nuovo raggruppa per `testCaseStartedId`,
che e' gia' la chiave con cui oggi si assegna la schermata al passo fallito.

### Se uno fallisce: continua o si ferma?

E' una scelta del tester, con un'impostazione di fabbrica sensata.

- **Fabbrica: continua.** Gli scenari sono indipendenti (vedi §2): un rosso non
  dice nulla sugli altri, e vedere tutto in una volta e' il motivo per cui si
  lancia una lista.
- **Interruttore "Fermati al primo fallito"**, spento. Utile quando la lista e'
  lunga e il primo rosso la rende inutile (l'applicazione e' giu').
- Dietro l'interruttore, `--fail-fast` di Cucumber. Come tutte le opzioni, in
  forma nuda: `npm run test:bersaglio demo src/features/a.feature src/features/b.feature fermati`.
  Cio' che resta non eseguito esce come **saltato** nel flusso di messaggi, ed
  e' cosi' che la schermata lo mostra.

### Rischi

- **Una lista lunga con un'applicazione ferma** produce N rossi uguali. Non si
  silenzia (vedi `lezioni.md`: un avviso che sbaglia insegna a ignorare gli
  avvisi), ma il totale dice "5 falliti su 5", che si legge come un'unica
  notizia.
- **Due righe dello stesso file** (`x.feature:3` e `x.feature:9`): **provato** (S0,
  `percorsi-cucumber.check.ts`): Cucumber ne esegue una ciascuna, non le fonde e
  non le duplica; la stessa riga due volte gira una volta sola. Il lanciatore
  **non** le fonde in `x.feature:3:9`. Una cosa da sapere: l'ordine **dentro** un
  file e' quello del file, non quello della lista (`x:9, x:3` esegue prima la 3).
- **Un file intero piu' una sua riga**: provato, esegue solo la riga (vedi sopra).

### Come si verifica

Casi di §9: validazione della lista, ordine degli argomenti, raggruppamento di
messaggi mescolati, "saltato" dopo un fail-fast.

## 2. Scenari "collegati" in serie

### Tre cose diverse con lo stesso nome

| | Significa | Esempio |
|---|---|---|
| **(a) Suite ordinata** | Gli stessi scenari, in un ordine deciso, **indipendenti** fra loro | "Prima il carrello, poi il pagamento, poi lo storico" |
| **(b) Dipendenza** | B parte dallo **stato lasciato** da A: dati creati, utente gia' dentro | A crea un ordine, B lo modifica |
| **(c) Precondizione riusabile** | Un passo comune in testa a ogni scenario che ne ha bisogno | `Given the user is logged in` |

### Perche' (b) va contro l'isolamento, e quando e' legittimo

BDD e Cucumber raccomandano scenari che si reggono da soli, e questo progetto lo
fa gia' per costruzione: il World e' nuovo a ogni scenario, e il browser e'
aperto e chiuso dentro lo scenario (`world.ts`, `hooks.ts`). Lo stato **non
passa**. Una dipendenza fra scenari andrebbe contro questo, e costa:

- B non si puo' piu' lanciare da solo: serve A, e il tester che vuole "provare
  B" non lo sa;
- se A fallisce, B fallisce per un motivo che non e' B: due rossi, una causa, e
  la schermata dice una cosa falsa su B;
- niente piu' parallelo, niente piu' ordine libero, niente "lancia solo questo";
- i dati lasciati da A restano nell'applicazione e sporcano il lancio dopo.

Quando e' legittimo: quando lo stato sta **nell'applicazione** e non si puo'
ricreare in modo economico. Il caso vero e' quello a **due attori**: l'utente A
crea una richiesta, l'utente B la approva. Li' non si tratta di collegare due
scenari: e' **uno scenario** con due attori, e va scritto cosi' (due contesti di
browser nello stesso World, uno per utenza). E' fuori da questo lavoro (§10) e
si dichiara come tale.

### Cio' che al tester serve davvero

- **(c)** e' risolto: il passo di accesso comune della spec
  `2026-10-01-accesso-negli-scenari-registrati-design.md` (costruito). Per gli
  altri passi di apertura comuni a piu' scenari di uno stesso file, esiste
  `Background:` di Gherkin, senza costruire niente.
- **(a)** e' una **lista con un nome**, e basta: la suite.
- **(b)** si chiede in modo diverso. Alla domanda "voglio che B parta dopo A" la
  risposta e' una di due: o la precondizione e' un passo (c), o i due scenari
  sono in realta' uno solo con piu' verifiche. La schermata non offre "B dopo
  A": offre la suite, e dice con una frase che gli scenari di una suite non si
  passano niente.

### Dove vive una suite

| | Pro | Contro |
|---|---|---|
| **File versionato `src/suites/<nome>.json`** | L'ordine e' esplicito. Non si tocca nessun `.feature` (un file senza il marcatore di generazione si considera "mio" e non si riscrive). Viaggia con il repository come gli scenari. Il contenuto e' solo percorsi di scenari salvati, la stessa natura di cio' che e' gia' versionato | Un file in piu'. Un percorso puo' diventare orfano se uno scenario viene rinominato: va dichiarato, non nascosto |
| **Tag `@suite:nome`** nel `.feature` | Vive con lo scenario. Cucumber lo filtra da solo | **Non ha ordine.** Per aggiungere uno scenario a una suite si riscrive un file. Un tag e' gergo |
| **File locale in `reports/`** | Niente di versionato | Non viaggia, non si condivide con i colleghi: la suite serve proprio a quello |

**Raccomandazione: il file in `src/suites/`**, scritto **dalla finestra**
(rotta tipizzata e validata, come per gli ambienti), mai a mano dal tester:

```json
{ "nome": "carrello-completo",
  "scenari": ["src/features/shop/carrello/aggiungi.feature",
              "src/features/shop/carrello/rimuovi.feature"] }
```

Il nome segue `BERSAGLIO_VALIDO` (stessa regola degli ambienti). Che sia
versionato e' **deciso** (Q2 = a, 1/10/2026).

### Come resta dentro l'elenco chiuso

Una suite **non e' un comando**. Quando il tester ne sceglie una, la finestra la
espande nella lista `scenari` e lancia il comando `test` di sempre. Il server non
legge mai un nome di suite da una richiesta di esecuzione: riceve solo percorsi
gia' validati. La lettura e la scrittura dei file di suite sono due rotte
proprie (`/api/suite`), con la loro validazione, fuori da `/api/esegui`.

### Ordine e parallelo non vanno insieme

Con piu' percorsi, Cucumber li esegue in ordine definito: e' cio' che rende
utile una suite ordinata. In parallelo (§3) l'ordine non c'e'. Quindi una suite
ordinata gira con **un** worker, e la schermata disabilita "in parallelo" con la
frase che dice perche'. Che Cucumber rispetti l'ordine dei percorsi dati
e' **provato** (S0, 1/10/2026, Cucumber 10.9, sia in dry-run sia con un browser
vero): z, a, b parte come z, a, b e b, z, a come b, z, a, non in ordine
alfabetico (`percorsi-cucumber.check.ts`, `cucumber-parallelo.check.ts`). Il
limite: l'ordine e' quello **dei file**; dentro un file e' quello del file.

### Cosa cambia nel codice

`src/suites/` (dati), `web-ui/src/lib/suite.ts` (lettura, scrittura, validazione:
percorsi dentro `src/features/`, nessun duplicato, i file devono esistere e si
dice quali mancano), `web-ui/src/app/api/suite/route.ts`, la scelta nella
schermata. Nessuna modifica a `esecuzione.ts` oltre a quella di §1.

### Rischi

Percorsi orfani dopo un rinomina (si segnalano alla lettura, con il nome dello
scenario mancante); suite enormi (stesso tetto di 100 voci).

## 3. Lanci in parallelo

### Cosa significa per il tester

"Voglio finire prima" (stessi scenari, piu' veloci) oppure "voglio provare due
cose diverse nello stesso momento" (corsie diverse). Sono due bisogni, e le due
strade li servono in modo diverso.

### Due strade

| | (i) `--parallel N` dentro una corsia | (ii) piu' corsie contemporanee |
|---|---|---|
| Cosa | Un solo processo Cucumber con N worker | N processi, uno per corsia, anche su ambienti diversi |
| Ambiente e sessione | Gli stessi: stessa utenza | Uno per corsia |
| Un solo flusso di messaggi | Si | No: un `.ndjson` per corsia |
| Serve il registro nuovo | No: e' ancora una corsia | Si |
| Serve per la demo con utenze diverse | **No** | **Si** |
| Rischio principale | Due worker sullo stesso account si pestano i dati | Un limite di risorse della macchina, e piu' connessioni dalla finestra |

**Raccomandazione: costruire (ii) per prima** (e' quella che la demo richiede e
quella che toglie piu' vincoli), e (i) dopo come opzione esplicita, spenta di
fabbrica. Sono indipendenti: una corsia puo' avere N worker, e un lancio puo'
avere piu' corsie.

### Cosa cambia: strada (ii), piu' corsie

**Il lucchetto di `registro.ts`**, da "uno solo" a due regole:

```ts
const PERSONA: NomeComando[] = ['registrazione', 'sessione', 'scansione'];
const MAX_TEST_CONTEMPORANEI = 3; // costante nel codice: stima, da misurare
```

- Un'operazione **guidata da una persona** (`PERSONA`): al piu' una, e solo se
  non c'e' nessuna altra operazione lunga in corso, **test compresi**. Il
  messaggio di oggi ("c'e' gia' in corso un'operazione che occupa il browser")
  resta.
- Un **test**: rifiutato se c'e' un'operazione di `PERSONA` in corso (si
  conserva la regola di oggi: una registrazione e un test non si contendono lo
  schermo e la sessione), e rifiutato oltre `MAX_TEST_CONTEMPORANEI` con un
  messaggio che dice il numero ("ci sono gia' tre test in corso: e' il massimo
  su questa macchina").
- Due corsie sullo **stesso** ambiente: consentite, con un avviso nella
  schermata (Q4 = b, deciso). E' la strada (i) a mano, e il rischio e' quello
  dichiarato sotto.

**Gli altri punti del registro:**

- `operazioneInCorso()` resta (compatibilita': Registra e la schermata
  Esecuzione leggono `operazione`) e restituisce prima una operazione di
  `PERSONA`, altrimenti la prima corsia di test. Si aggiunge
  `operazioniInCorso(): OperazioneLunga[]` e `GET /api/esegui` restituisce
  anche `operazioni`. Gli id e il nome si espongono, mai le righe (regola gia'
  scritta nella rotta).
- **Id unici**: `test-<tempo>-<n>` con un contatore di processo. Oggi due lanci
  nello stesso millisecondo collidono, e il file `<id>.ndjson` e' di entrambi.
- **Il record su disco** `reports/cruscotto/<id>.json` guadagna `bersaglio`,
  `scenari` (cio' che e' stato chiesto) e `lancio` (l'id che raggruppa le
  corsie partite insieme). Mai valori di credenziali: solo nomi di ambiente e
  percorsi. Serve alla pagina Scenari (§5).
- **Interrompi**: oggi `ferma(id)` fa `figlio.kill()`. Il timore era che su
  Windows `kill()` lasciasse orfani Cucumber e i suoi browser. **Verificato in S0
  (1/10/2026): non succede.** Riprodotto con il lanciatore vero (`spawn` senza
  shell, come `registro.ts`) su `test-bersaglio` contro l'ambiente `demo` con il
  browser nascosto: quando compare il browser, l'albero e' il processo, Cucumber e
  quattro processi `chrome-headless-shell`; dopo `kill()` nessuno e' vivo, a 0,8 s
  e per i 14 secondi seguenti. Il motivo e' di Node, non nostro: su Windows libuv
  mette ogni figlio in un *job* del padre con "termina tutto alla chiusura del
  job", e i discendenti ci restano. Controprova: un figlio avviato `detached`
  sopravvive, quindi il metodo sa vedere un orfano. **Non serve `taskkill`.** Il
  caso `web-ui/__tests__/lib/interrompi.test.ts` tiene d'occhio la proprieta'
  (padre che aspetta un figlio con `execFileSync`, terminato, il figlio muore) e,
  se mai cadesse, la correzione resta quella prevista: `taskkill /T /F /PID` con
  `execFile` e argomenti in lista, senza shell, sul solo pid avviato dal registro.
  **Non verificato**: il browser *visibile* (`vedi`, non provato per non aprire
  finestre sul desktop) e la macchina aziendale (antivirus, un Node dentro un altro
  job). Per la prova generale: dopo "Interrompi tutto", niente `node.exe` ne'
  `chrome` rimasti in Gestione attivita'.
  "Interrompi tutto" chiama `ferma` su ogni corsia del lancio.
- **Riaggancio lato client**: `sessionStorage` ricorda una **lista** di id
  (le corsie del lancio) invece di uno. All'apertura la schermata legge
  `operazioni` e riaggancia tutte le corsie di test.
- **Il report HTML a nome fisso**: due processi contemporanei si
  sovrascriverebbero `reports/cucumber-report.html`. La finestra non lo legge
  (legge il `.ndjson`), ma lo scrive comunque. Si rende configurabile:
  `cucumber.js` legge `BDD_HTML` (assente: il file di oggi, quindi chi lancia a
  mano non nota niente), e `test-bersaglio.ts`, quando riceve `messaggi=`, mette
  `BDD_HTML` accanto al `.ndjson` (`reports/cruscotto/<id>.html`). **Fatto in S0**
  (`scripts/lib/lancio-test.ts`, controllato in `percorsi-cucumber.check.ts`):
  con `BDD_HTML` il report esce dove si e' chiesto e quello di sempre non si
  tocca; senza, resta il nome di oggi. Il formatter `html` di `cucumber.js` si
  somma a `--format message:...` (provato: escono entrambi).

**Connessioni della finestra.** Un browser su HTTP/1.1 tiene al piu' sei
connessioni per origine, e un flusso SSE ne tiene una per tutta la sua durata.
Con la schermata di oggi, per corsia: un flusso SSE piu' un polling. A due
corsie sono quattro connessioni: ci si sta. A quattro o piu' no: la pagina si
blocca senza dire perche'. Quindi:

- **Fino a due corsie** (demo): si riusa tale e quale il meccanismo di oggi, una
  copia per corsia.
- **Da tre in su** (fetta S5): si sostituiscono i flussi con **un solo
  polling** di `GET /api/lanci/<id>`, una richiesta al secondo, che restituisce
  per ogni corsia stato, scenari e passi (letti dagli `.ndjson`, con una cache
  sulla dimensione e la data del file: i file contengono le schermate in
  base64, e rileggerli interi N volte al secondo non e' gratis).

### Cosa cambia: strada (i), `--parallel N`

- `cucumber.js`: `parallel: Number(process.env["BDD_PARALLEL"] ?? 1)`.
- `scripts/test-bersaglio.ts`: opzione nuda `paralleli=2` che mette
  `BDD_PARALLEL`. Mai `--parallel`: vedi `metodo-di-lavoro.md`.
- `esecuzione.ts`: `Parametri.paralleli?: number`, intero da 1 a 4, altrimenti
  errore (lo stesso stile di `rallentaDi`). Si accoda alla riga solo se maggiore
  di 1.
- Gli step e le Page Object generate tengono le istanze in variabili `let` di
  modulo (`templates/steps.ts.tmpl`): sicuro con i worker di Cucumber (processi
  separati), **non** con piu' scenari nello stesso processo. Questa strada non
  introduce concorrenza dentro un processo, ma il giorno in cui qualcuno
  proponesse "piu' scenari in un processo con `Promise.all`" la risposta e' no,
  e questo e' il motivo (e la riga "Page Object tenute dal World" in
  `ROADMAP.md` §4 item 3 e' la strada per cambiarla).
- La schermata non cambia struttura: una corsia, con un selettore
  "Quanti alla volta" (1 di fabbrica). Il lettore raggruppato di §1 e'
  **indispensabile** qui, perche' i messaggi dei worker si mescolano.
- **Che il formatter `message` funzioni con `--parallel`** e' **provato** (S0,
  1/10/2026, `cucumber-parallelo.check.ts`, browser vero nascosto, Cucumber 10.9):
  con `--parallel 2` e cinque scenari ogni scenario parte e finisce una volta
  sola, con gli stessi passi e lo stesso numero di messaggi della serie. I
  messaggi di scenari diversi **si mescolano** (un rosso finisce prima di uno
  partito prima), quindi il lettore raggruppato per `testCaseStartedId` resta
  indispensabile. Un'avvertenza: con scenari di pochi decimi di secondo il
  parallelo e' piu' *lento* della serie (5,1 s contro 4,0 s, il costo di avviare i
  worker): il guadagno e' per scenari lunghi, e va misurato su quelli veri.
- **Fail-fast** e' **provato** (stesso controllo): dopo il primo rosso gli
  scenari che restano compaiono comunque nel flusso, con ogni passo `SKIPPED`
  (non spariscono, non passano), e il processo esce con un errore. E' la forma
  che la schermata mostrera' come "saltato".

### Risorse della macchina

Ogni scenario apre un browser **intero** (`avviaBrowser` in `init()`), non un
contesto su un browser condiviso. Con N corsie, o N worker, ci sono N browser
vivi contemporaneamente. Ordine di grandezza **stimato** (non misurato):
qualche centinaio di megabyte per un Chromium e almeno un core per ciascuno.
Sul portatile aziendale non si sa cosa succede a tre: il tetto
`MAX_TEST_CONTEMPORANEI` e' una costante da regolare dopo una misura, e la
misura e' un passo della prova manuale finale (§9).

### "Guarda il browser" con N finestre

> **Decisione del proprietario, 1/10/2026 (Q7 = b):** con "Guarda il browser" le
> finestre si affiancano in **automatico**. Non e' la raccomandazione della prima
> bozza (a mano, per non cambiare il viewport): si progetta cosi', e si
> dichiarano i limiti.

Senza far niente le finestre si aprono sovrapposte, e il tester non sa quale sia
di quale corsia. Il rimedio e' dire al browser **dove** stare e **quanto** essere
grande, al lancio.

**Come.**

- La finestra (la schermata nel browser del tester) conosce lo schermo:
  `window.screen.availWidth` e `availHeight` (l'area utile, senza la barra delle
  applicazioni). Li manda come due interi tipizzati, `schermo` (larghezza e
  altezza), validati dal server: interi da 640 a 7680 e da 480 a 4320. Il server
  non puo' saperlo da solo senza interrogare il sistema operativo.
- Il server calcola, dal numero di corsie `N` del lancio e dall'indice `i`, una
  griglia con `ceil(sqrt(N))` colonne: la corsia `i` riceve `x`, `y`, larghezza e
  altezza della sua cella. Con due corsie, due colonne a tutta altezza.
- Il risultato arriva a `test-bersaglio.ts` in forma nuda, come opzione
  `finestra=x,y,larghezza,altezza` (quattro interi validati, mai una stringa
  libera), che lo mette in `BDD_FINESTRA`. Mai trattini via npm.
- `world.ts` lo legge **solo se** `HEADED=1` e lo passa a `avviaBrowser` come
  argomenti del browser `--window-position=x,y` e `--window-size=l,a`. Con
  `HEADED` assente (browser nascosto) `BDD_FINESTRA` non ha nessun effetto.

**Cio' che cambia per il test, e va detto.**

- **Il viewport.** Oggi il contesto non dichiara un viewport, quindi vale il
  predefinito di Playwright (1280x720). Perche' la dimensione della finestra
  valga, il contesto deve usare `viewport: null` (la pagina prende la misura
  reale della finestra). Un'applicazione con layout reattivo puo' allora
  mostrare un'altra disposizione, **e uno scenario verde nascosto puo' diventare
  rosso affiancato**, o viceversa. E' il motivo per cui la regola e' *solo* con
  "Guarda il browser" e la frase accanto all'interruttore lo dice. L'esito di un
  lancio nascosto resta quello di sempre, ed e' quello che fa fede.
- **`--start-maximized`.** Oggi lo usano la registrazione (`record.ts`) e la
  sessione (`session.ts`), con `viewport: null`: li' la finestra deve riempire
  lo schermo, e **non si toccano**. I test non lo usano. Se i due fossero mai
  combinati, la finestra massimizzata vincerebbe sulla posizione: per questo
  `finestra` non si applica mai a `registrazione`, `sessione` e `scansione`, e
  un caso di test lo controlla.
- **Troppo strette.** Con piu' di due corsie su uno schermo di 1920 px le celle
  sono sotto gli 800 px e molte applicazioni passano al layout per telefono.
  Sotto un limite (Q13, proposta 800 px di larghezza) le finestre **non si
  affiancano**: si sovrappongono con uno scarto di 40 px per corsia, e il
  viewport resta quello di sempre. Meglio una finestra che copre l'altra che un
  test che vede un'altra applicazione.

**Limiti, dichiarati e non provati** (le misure vere si fanno sullo schermo
della demo):

- **Scala di Windows** (125 %, 150 %): `--window-size` e' in pixel logici del
  browser, `screen.availWidth` in pixel CSS; i due coincidono di norma, ma una
  scala diversa fra monitor puo' farli divergere di qualche punto.
- **Piu' monitor**: `window.screen` e' il monitor su cui sta la schermata del
  tester, non necessariamente quello su cui l'utente guarda i test.
- **Il contorno della finestra** (bordi, barra del titolo e delle schede del
  browser, circa 85 px in altezza) si sottrae al viewport: la pagina vede meno di
  `altezza`. Lo scarto non e' compensato.
- **Un solo motore**: vale per Chromium, il solo che il progetto lancia.
- Non e' **posizionamento a prova di sistema operativo**: se il browser ignora la
  posizione (capita con alcune impostazioni di Windows), le finestre si
  sovrappongono, e `rallenta` e il nome nel pannello restano il rimedio.

Il resto dei gradi di prima resta: la **pausa fra le azioni** (`rallenta=`, c'e'
gia') serve comunque, perche' due finestre veloci non si seguono, e il titolo del
pannello dice quale ambiente e utenza e'.

### Come si mostra a schermo

La stessa schermata Esecuzione, non una nuova (vedi §8). Per ogni corsia un
**pannello** con: ambiente, stato, "2 di 5 scenari", pulsante Interrompi. Sotto
i 1100 px di larghezza i pannelli stanno impilati; sopra, affiancati fino a tre.
In cima al lancio, il totale (§1) e "Vai al primo fallito". Non e' una dashboard
di run: niente storico, niente grafici, niente pianificazione; lo storico
appartiene alla pagina Scenari.

### Rischi

| Rischio | Cosa succede | Come si tiene a bada |
|---|---|---|
| Due worker o due corsie sullo stesso account | Si cancellano i dati a vicenda (un carrello che due scenari svuotano), rossi che non c'entrano con l'applicazione | Avviso scritto nella schermata quando l'ambiente e' lo stesso; fabbrica a 1 worker; per la demo, utenze diverse (§4) |
| Sessione condivisa | La sessione salvata si **legge** soltanto durante un test: piu' lettori non si disturbano. Ma un'applicazione che ammette una sola sessione attiva per utente puo' disconnettere la prima | Utenze diverse per corsia; il passo di accesso comune rifa' il login se la sessione e' caduta |
| Flakiness | Piu' browser rallentano la macchina e gli scenari scadono (timeout di 60 secondi, `BDD_TIMEOUT`) | Tetto basso, misura prima di alzarlo; un rosso da timeout dice "scaduto", non "elemento non trovato" (gia' cosi') |
| Processi orfani dopo Interrompi | Browser vivi senza finestra | Verificato nella prima fetta, vedi sopra |
| Un lancio parte a meta' | Tre corsie richieste, la terza rifiutata dal tetto | Il server valida **tutto** prima di avviare la prima: o parte tutto, o niente, con il messaggio che dice perche' |

## 4. Parallelo con utenze diverse (il caso della demo)

> **Decisione del proprietario, 1/10/2026 (Q5 = b):** il modello "piu' utenti
> dentro un ambiente" si costruisce **subito**. Non e' la raccomandazione della
> prima bozza (che era "un ambiente per utenza, il modello solo se serve"): la
> sezione e' riscritta di conseguenza. L'approccio "un ambiente per utenza" resta
> utilizzabile oggi, senza codice, ed e' il **piano B** della demo (§4.7).

### 4.1 Il vincolo, e cosa cambia

Oggi un ambiente = una sessione = un utente (`Target` in `targets.ts`: un campo
`session`, un blocco `login`). Un secondo utente e' un secondo ambiente nel file
`bdd-targets.json`. Dopo questo lavoro un ambiente ha **un elenco di utenze**, e
una corsia ne sceglie una. Tre approcci erano sul tavolo:

| | A. Un ambiente per utenza | **B. Utenze nell'ambiente (scelto)** | C. Tag `@utente:nome` |
|---|---|---|---|
| Forma | `demo-utente-a`, `demo-utente-b` | `utenti: { a: { sessione, login }, b: {...} }` e `BDD_UTENTE` | Lo scenario dichiara chi e' |
| Cosa vede il tester | L'elenco ambienti si allunga e si sporca | Un ambiente con un selettore di utenza | Niente |
| Costo (stima) | ~0 di codice | 4,5-5,5 giorni (§4.8) | Costo di B piu' un hook |

C non e' un'alternativa ma uno strato sopra B, e resta **fuori**: la scelta
dell'utenza appartiene al **lancio**, non allo scenario (lo stesso scenario
"aggiungi al carrello" e' buono per l'utenza A e per la B, ed e' quello che la
demo vuole mostrare). L'eccezione, lo scenario *per un ruolo*, ha il suo
strumento (§4.6).

### 4.2 La forma in `bdd-targets.json`

```json
"demo": {
  "url": "https://...",
  "readyWhen": "/inventario",
  "utenti": {
    "a": { "sessione": "reports/sessions/demo.a.json",
           "login": { "steps": [ { "fill": {"role":"textbox","name":"Utente"}, "value": "${DEMO_A_USER}" },
                                 { "fill": {"role":"textbox","name":"Password"}, "value": "${DEMO_A_PASS}" },
                                 { "click": {"role":"button","name":"Accedi"} } ] } },
    "b": { "sessione": "reports/sessions/demo.b.json",
           "login": { "steps": [ ... "${DEMO_B_USER}" ... "${DEMO_B_PASS}" ... ] } }
  },
  "utenteDiFabbrica": "a"
}
```

- Il nome di un'utenza segue `BERSAGLIO_VALIDO` (stessa regola degli ambienti,
  una regola sola). Il nome e' il suo identificativo ovunque: parametro,
  variabile, nome del file di sessione, pannello di corsia.
- `utenteDiFabbrica` e' facoltativo: se manca, la **prima** utenza dichiarata.
  Serve a chi lancia a mano senza dire niente.
- **`utenti` e i campi di un utente solo (`session`, `login`) sono alternativi.**
  Un ambiente che li ha entrambi e' un errore con un messaggio che dice di
  sceglierne uno: due fonti per la stessa cosa divergono in silenzio.
- La sessione di un'utenza ha di fabbrica il nome
  `reports/sessions/<ambiente>.<utenza>.json`; per un ambiente a un utente solo
  resta `reports/sessions/<ambiente>.json`, come oggi.
- `resolveTarget(nome, utente?)` restituisce un `Target` **appiattito**: `session`
  e `login` sono quelli dell'utenza scelta, in piu' `utente` (il nome). Tutto cio'
  che sta a valle (`hasSession`, `sessionAgeHours`, `loginCredentials`, la Page
  Object dell'accesso) legge gli stessi campi di oggi e **non cambia**.

### 4.3 Compatibilita' con gli ambienti a un solo utente

Devono continuare a funzionare **identici**, senza toccare il file:

- un ambiente senza `utenti` si comporta come oggi: `resolveTarget('demo')` da'
  lo stesso `Target` di prima (caso di test: un file di esempio degli ambienti di
  oggi, risolto prima e dopo, e il risultato e' uguale);
- `utente` assente o vuoto = l'utenza di fabbrica; per un ambiente senza `utenti`
  e' l'unica utenza implicita e **non ha nome**;
- `utente=x` su un ambiente senza `utenti` e' un errore chiaro ("l'ambiente
  non ha utenze"), non un'utenza ignorata;
- `BDD_UTENTE` assente = come oggi.

### 4.4 Come una corsia sceglie l'utenza

- **Parametro tipizzato** `Parametri.utente?: string`, validato con
  `BERSAGLIO_VALIDO`, valido per i comandi che usano una sessione: `test`,
  `sessione`, `registrazione`, `scansione`. Nell'elenco chiuso non nasce nessun
  nome nuovo.
- **Opzione nuda** `utente=b` (mai trattini, mai via npm): `npm run test:bersaglio
  demo generati utente=b`. Un caso di test controlla che nessun argomento
  cominci con un trattino.
- **Variabile `BDD_UTENTE`**: `test-bersaglio.ts` la imposta nell'ambiente di
  Cucumber insieme a `BDD_TARGET`; `ambiente()` in `world.ts` la passa a
  `resolveTarget`. E' la stessa strada di `BDD_TARGET`: una variabile per
  processo, quindi **una corsia = un ambiente = un'utenza**.
- **Il nome non esiste nell'ambiente**: `test-bersaglio.ts` lo controlla **prima**
  di lanciare Cucumber e dice quali utenze ci sono (come fa oggi per i bersagli).
  Lo stesso controllo lo fa il server prima di avviare una corsia, cosi' un
  lancio "tutto o niente" (§3) non parte a meta'.
- **La corsia e' una coppia (ambiente, utenza)**. Il record su disco guadagna il
  campo `utente` accanto a `bersaglio`, e il pannello di corsia mostra
  "ambiente / utenza". Mai una credenziale, mai un percorso di file.
- Due corsie con la **stessa** coppia: e' il caso Q4 (consentito con avviso). Due
  corsie con lo stesso ambiente e utenze **diverse** non hanno l'avviso sui dati
  dello stesso account, ma conservano quello sulle risorse.

### 4.5 Credenziali, sessioni, MFA

- **Dove stanno**: solo in `.env`, riferite come `${VARIABILE}` nel blocco `login`
  di **ciascuna** utenza (`bdd-targets.json`, gitignorato). Convenzione dei nomi:
  `<AMBIENTE>_<UTENZA>_USER` e `<AMBIENTE>_<UTENZA>_PASS`. Questo lavoro non
  introduce un solo valore nei file versionati, ne' una password nella finestra
  oltre ai campi mascherati del Controllo che esistono gia'.
- **Come si registra l'accesso di ogni utenza, dal Controllo**: la riga di un
  ambiente con piu' utenze si apre in una riga per utenza, ognuna con i suoi
  "Registra l'accesso" (la ricetta) e "Accedi adesso" (la sessione) e la **sua**
  eta' della sessione. I due pulsanti portano `utente` nel parametro e scrivono
  nel blocco di quell'utenza. Un pulsante **"Aggiungi utenza"** (sostituisce il
  "Duplica ambiente" della prima bozza, che non serve piu') crea un'utenza vuota
  nell'ambiente e dice quali variabili di `.env` le servono.
- **MFA e SSO**: l'accesso automatico non blocca mai e finisce a mano
  (`targets.ts`). Con la sessione valida non c'e' MFA da fare, e per questo la
  sessione di **ciascuna** utenza si rinnova **prima** della demo. Se la sessione
  e' scaduta e l'accesso richiede la MFA, il passo di accesso comune lo dice con il
  messaggio della spec dell'accesso, e la corsia diventa rossa: non e' un guasto
  del parallelo. Un SSO che ammette una sola sessione attiva per utente e' il
  motivo per cui le utenze **devono** essere diverse.
- **Un'applicazione aziendale e' proprio il caso in cui la MFA o l'SSO bloccano il
  login automatico**: vedi i rischi in §4.7. Per quelle utenze la sessione si
  fa a mano (Accedi adesso) e il blocco `login` puo' mancare del tutto.

### 4.6 Il legame con il passo di accesso (decisione D2)

La spec `2026-10-01-accesso-negli-scenari-registrati-design.md` lasciava aperta
D2: la frase `the user is logged in`, o con il ruolo `the user is logged in as
{string}` "se un giorno un ambiente avra' piu' di un utente". Quel giorno e'
questo. Proposta di questa bozza (da confermare, e si costruisce **con** le
utenze, non prima):

- **`the user is logged in`** resta, ed e' quella che la generazione scrive:
  esegue l'accesso con l'utenza che la **corsia** ha scelto (`BDD_UTENTE`, o
  quella di fabbrica). Gli scenari registrati finora e quelli futuri non
  nominano nessuna persona: lo stesso scenario gira con l'utenza A e con la B.
- **`the user is logged in as {string}`** si aggiunge per lo scenario *per un
  ruolo* (l'amministratore vede il pannello): il nome e' quello di un'utenza
  dell'ambiente, e **vince** su `BDD_UTENTE` per quello scenario. Se l'ambiente di
  lancio non ha quell'utenza, lo scenario diventa rosso con un messaggio che dice
  quali ci sono: non cade su un'altra in silenzio.
- La Page Object dell'accesso non cambia struttura: riceve il `Target` gia'
  appiattito. Il passo con `as` costruisce quello giusto con
  `resolveTarget(ambiente, nome)` dentro il World.
- `STEP_CATALOG.md` si rigenera con `npm run catalog`; il passo nuovo non si
  scrive a mano. Per la regola del progetto, il passo nuovo nasce `@wanted` e
  l'implementazione aspetta l'approvazione del team: **il proprietario ha gia'
  deciso il modello, la frase la approva il team.**

### 4.7 Il caso della demo: un'applicazione aziendale

> **Decisione del proprietario, 1/10/2026 (Q6 = b):** la demo in parallelo gira su
> un'**applicazione aziendale**, non sul sito pubblico di pratica. Non e' la
> raccomandazione della prima bozza ("mai un'applicazione aziendale su un palco:
> dati e MFA"): i rischi che la raccomandazione evitava restano tutti, e adesso
> vanno gestiti uno per uno.

**Obiettivo**: mostrare "due scenari che girano insieme con due utenze diverse"
sull'applicazione vera, sulla macchina aziendale.

**I rischi, e cosa si fa per ciascuno**

| Rischio | Cosa succede | Come si tiene a bada |
|---|---|---|
| **MFA o SSO** che il login automatico non passa | La corsia parte, trova la pagina di accesso o il codice da inserire, e diventa rossa davanti al pubblico | **Sessioni salvate per ogni utenza prima della demo**, fatte a mano con "Accedi adesso". Il passo di accesso comune non deve mai dover rifare il login in sala |
| **Scadenza delle sessioni** | Una sessione valida ieri non lo e' piu' oggi (durata decisa dall'applicazione, non da noi) | La sessione si rinnova **la mattina stessa**, si legge l'eta' dal Controllo, e **in apertura si lancia ogni corsia da sola** prima del pubblico. La durata vera si scopre con la prova generale: non si suppone |
| **Dati reali che due utenti possono pestarsi** | Due utenze che toccano lo stesso record, un ordine modificato da due parti, rossi che non c'entrano con i nostri scenari. Peggio: si modifica un dato vero | Scenari **di sola lettura** o su dati di prova dichiarati; due utenze che non condividono nulla (da verificare, prima, con chi gestisce l'applicazione); nessuno scenario che cancelli o invii. La scelta degli scenari della demo la approva chi conosce l'applicazione |
| **Dati reali su uno schermo proiettato** | Dati personali o importi sul palco, nelle schermate catturate dei passi falliti e nel video | Utenze e dati di prova **senza dati personali**, scelti prima; i passi falliti mostrano la schermata catturata: provare anche un rosso nella prova generale per vedere cosa finisce a schermo. Il video di riserva, se contiene dati reali, resta sulla macchina aziendale |
| **Rete aziendale** | Proxy, VPN, un firewall che tarda, un limite di richieste per utente o per indirizzo, un antivirus che rallenta due browser che partono insieme. Timeout (`BDD_TIMEOUT` 60 s) dove sul sito pubblico non c'erano | Prova generale **sulla stessa macchina, sulla stessa rete, alla stessa ora** della demo. Se serve, `rallenta` e un tetto basso di corsie |
| **Piu' sessioni dello stesso utente non ammesse** | La seconda disconnette la prima | E' il motivo per cui le utenze devono essere due persone diverse per l'applicazione. Si verifica nella prova generale, non si assume |
| **Un nome aziendale finisce nel repository** | Un indirizzo, un'utenza o un nome di prodotto in un commit | Tutto in `bdd-targets.json` e `.env` (gitignorati). Documenti ed esempi dicono "l'applicazione clinica", mai un nome |

**Prova generale obbligatoria sulla macchina aziendale**, non sul portatile di
sviluppo, il giorno prima e **ripetuta la mattina**: la "Prova manuale finale" di
§9, con questi passi in piu': misurare la durata vera delle sessioni, provare un
rosso per vedere cosa compare a schermo, provare a lanciare con la rete nelle
condizioni di sala (Wi-Fi o cavo, VPN), e registrare il video di riserva.
Nessuna demo si tiene se la prova generale non e' passata **su quella macchina**.

**Cosa si costruisce** (fette S0, S3, SU, S8 di §6):

1. **Registro**: `PERSONA` contro `test`, fino a due test contemporanei, id
   unici, `operazioniInCorso()`. Casi di test scritti prima.
2. **Report per corsia**: `BDD_HTML`.
3. **Contratto `scenari: string[]`** nel validatore.
4. **Utenze nell'ambiente** (§4.2-4.6): `utente`, `BDD_UTENTE`, il Controllo per
   utenza, il passo `as {string}`.
5. **Finestre affiancate** (§3, "Guarda il browser").
6. **Schermata**: la riga "scenario + ambiente + utenza" si puo' ripetere (al
   massimo due), un solo pulsante "Lancia", due pannelli affiancati,
   "Interrompi" per corsia e "Interrompi tutto".
7. **Preparazione**: le due utenze dell'applicazione aziendale, le sessioni, due
   scenari salvati (con il passo di accesso comune), la prova generale.

**Cosa NON si costruisce**: tag (C), `paralleli=N`, suite, scelta multipla,
endpoint aggregato, uno scenario con due attori.

**Piano B se sul palco qualcosa si rompe**, in ordine di rinuncia:

1. **Una sessione e' scaduta** (il Controllo mostra l'eta' di ciascuna): "Accedi
   adesso" sull'utenza, due minuti, si rilancia. In apertura si e' gia'
   lanciata ogni corsia da sola.
2. **Le due finestre si sovrappongono o la macchina rallenta**: si lancia **senza**
   "Guarda il browser": restano i due pannelli di risultato, la cosa importante.
3. **Il parallelo si pianta**: prima corsia, poi la seconda, con lo stesso schermo,
   dicendolo ("qui girano insieme, adesso li facciamo uno dopo l'altro"). Funziona
   oggi, senza niente di nuovo.
4. **Le utenze nell'ambiente non sono pronte in tempo**: due **ambienti**
   (`app-a`, `app-b`, approccio A) con la stessa applicazione. Si fa oggi dal
   Controllo, senza codice. Non e' un ripiego da nascondere: e' il motivo per cui
   il modello B si puo' consegnare in fette senza mettere a rischio la data.
5. **L'applicazione aziendale non risponde o la rete cede**: la **stessa demo sul
   sito pubblico di pratica** (`demo`, con due utenze di prova **senza** difetti
   voluti, altrimenti uno scenario "fallisce" sul palco non per colpa nostra). Si
   prepara in anticipo e si prova una volta: e' lo stesso codice con un altro
   ambiente.
6. **Nulla funziona**: il video della prova generale, registrato in anticipo
   (`PRESENTATION.md` prevede gia' un video di riserva per l'atto del Registra).

Come si distingue a schermo chi e' dentro: un segno dell'applicazione (un nome
mostrato, un riquadro "utente" nell'intestazione). Si trova nella prova generale;
se non c'e', si dice, non si finge.

### 4.8 La stima, rifatta (e' una stima)

La prima bozza dava **4 giorni** (3-5) per la demo, con il modello a utenze
escluso. Con B e con un'applicazione aziendale la stima cambia. **Sono stime,
non misure: nessuna fetta e' stata provata.**

| Voce | Giorni (stima) |
|---|---|
| S0 fondamenta (id unici, `scenari`, `BDD_HTML`, verifiche Cucumber, Interrompi) | 1 |
| S3 due corsie (registro, schermata a due pannelli, riaggancio) | 2,5 |
| **SU utenze nell'ambiente**: `targets.ts` (forma, risoluzione, compatibilita'), `session.ts`/`record.ts`/`test-bersaglio.ts`/`world.ts` e `utente`: 2 · passo di accesso `as {string}` e catalogo: 0,5 · Controllo per utenza e "Aggiungi utenza" nelle due lingue: 1,5-2 · generazione e controlli: 0,5-1 | 4,5-5,5 (centro 5) |
| S8 finestre affiancate (§3) | 1 |
| Preparazione: utenze, sessioni, scenari, prova generale **sulla macchina aziendale** con la durata vera delle sessioni, video | 1,5 |
| **Totale per la demo** | **circa 11 (da 9,5 a 12,5)** |

Sono quasi **tre volte** la stima di prima, per due motivi: il modello B (da zero
a circa cinque giorni) e la prova generale vera. Il rischio che sposta la stima
verso l'alto e' il Controllo (la seconda utenza chiede piu' tentativi del
previsto) e l'applicazione aziendale (MFA, durata delle sessioni, rete), che si
scoprono solo provandola. **La demo e' a meta' ottobre: dal 1/10 sono circa dieci
giorni lavorativi, quindi il percorso completo e' al limite.** Per questo il
piano B n. 4 (due ambienti) non e' un dettaglio: se SU non e' fusa in tempo, la
demo si fa con la stessa schermata e due ambienti, e SU arriva dopo. L'ordine
delle fette (§6) mette SU **dopo** S3 proprio perche' S3 da sola gia' consente la
demo con due ambienti.

## 5. Piu' corsie e pagina Scenari: cosa serve da lei

Un altro lavoro progetta la pagina Scenari (elenco con l'esito dell'ultima
esecuzione per scenario). **Non la riprogetto**. Questo e' il contratto che
chiedo, e mi fermo qui:

1. **Selezione multipla -> lancio**: la pagina produce una lista di scenari
   nella forma `src/features/<file>.feature[:riga]` e apre
   `/esecuzione?scenari=<lista>`. La query non e' fidata: la valida il server,
   come oggi.
2. **Esito per scenario**: lo leggo io da `leggiScenariTest` (§1), che la pagina
   puo' usare identico. L'identita' di uno scenario e' `file` + `nome`; la
   riga cambia quando il file si modifica e non e' una chiave.
3. **Piu' esiti per lo stesso scenario**: uno scenario puo' essere stato
   eseguito su due ambienti. Il record su disco porta `bersaglio` e `fine`;
   decidere se "ultimo esito" e' uno per scenario o uno per scenario e ambiente
   e' una scelta **sua**.
4. **Scenari in corso**: `operazioniInCorso()` piu' un `.ndjson` parziale danno
   `in corso` per gli scenari partiti e non ancora finiti.
5. **Record fantasma**: dopo un riavvio del server un `<id>.json` con stato
   `in corso` non ha piu' un processo dietro. Chi elenca le esecuzioni dal disco
   deve mostrarlo come **interrotto**, non come ancora vivo.
6. **La pulizia di `reports/cruscotto/`** (con N corsie i file crescono in
   fretta) e' sua o di un lavoro a parte: la segnalo come domanda aperta (Q10).

## 6. Ordine di consegna

Fette piccole, ognuna utile da sola e verificabile. L'ordine **non** e' quello
di costo crescente delle capacita': e' quello che porta alla demo per prima. Le
giornate sono **stime**, rifatte il 1/10/2026 dopo le decisioni del proprietario
(§11): le utenze nell'ambiente non sono piu' "solo se deciso" (era S7), sono la
fetta **SU**, e prima della demo.

| Fetta | Cosa | Perche' sta li' | Stima | Dipende da |
|---|---|---|---|---|
| **S0** Fondamenta | Id unici; `BDD_HTML`; `scenari: string[]` validato (la UI ne manda uno); verifica delle ipotesi su Cucumber (§9); verifica e, se serve, correzione dell'Interrompi che lascia orfani | Senza queste, qualunque cosa dopo e' costruita su un difetto | 1 | spec dell'accesso (costruita) |
| **S3** Due corsie | Registro con `PERSONA` e fino a due test; `operazioniInCorso()`; schermata a due pannelli; riaggancio con lista | **E' il cuore della demo**, e da sola consente la demo con due ambienti (piano B) | 2,5 | S0 |
| **SU** Utenze nell'ambiente | `utenti` in `targets.ts` e compatibilita'; `utente`/`BDD_UTENTE` in `session.ts`, `record.ts`, `scout.ts`, `test-bersaglio.ts`, `world.ts`; `Parametri.utente`; il passo `the user is logged in as {string}` (D2) e il catalogo; il Controllo per utenza e "Aggiungi utenza"; generazione | Q5 = b: il modello vero, subito. Va **dopo** S3 perche' la demo non si ferma se SU slitta | 4,5-5,5 | S0; D2 della spec dell'accesso |
| **S8** Finestre affiancate | `finestra=` e `schermo=`, `world.ts` (posizione, dimensione, viewport), calcolo dal numero di corsie (§3) | Q7 = b: la demo con "Guarda il browser" | 1 | S3 |
| **Demo** Preparazione | Le due utenze **dell'applicazione aziendale**, sessioni, scenari, prova generale sulla macchina aziendale, video di riserva | Non e' codice, ma e' tempo, e la prova generale non si salta (§4.7) | 1,5 | S3 (con due ambienti) oppure SU (con le utenze) |
| **S1** Lanci multipli | Scelta multipla, gruppi come scorciatoia, `leggiScenariTest`, totale, "Vai al primo fallito", interruttore "Fermati al primo fallito" (`fermati`) | E' la capacita' piu' economica e la piu' usata | 2 | S0; **pagina Scenari** per "Esegui i selezionati", ma si consegna anche senza |
| **S2** Suite | `src/suites/` versionato (Q2 = a), `/api/suite`, scelta nella schermata, disabilita il parallelo | Poco codice, vale molto per chi ripete le stesse prove | 1 | S1 |
| **S4** Parallelo in corsia | `paralleli=N` (1-4), selettore "Quanti alla volta", avviso sull'account | Solo dopo S1, perche' serve il lettore raggruppato | 1,5 | S1 |
| **S5** Piu' di due corsie | Tetto portato a 3 **dopo la misura** (Q3), endpoint `GET /api/lanci/<id>` a polling unico, cache di lettura dei file, lancio "tutto o niente", misura di CPU e RAM | Va misurata prima di alzare il tetto | 1,5 | S3, S1 |

**Stato di S0 (1/10/2026): fatta.** Id unici, `scenari: string[]`, `BDD_HTML`, le
cinque ipotesi su Cucumber provate, Interrompi verificato (nessun orfano, quindi
nessuna correzione). **Non toccato di proposito**: il lucchetto del registro
(`LUNGHI`, una operazione alla volta) resta com'e', perche' ogni modifica alla sua
struttura (`PERSONA`, il tetto, `operazioniInCorso()`) e' parte di S3 e cambia cio'
che l'utente vede o puo' fare.

La vecchia S6 "Duplica ambiente" **decade**: con le utenze nell'ambiente il suo
lavoro lo fa "Aggiungi utenza" dentro SU.

**Percorso per la demo**: S0 + S3 + SU + S8 + Demo, circa **11 giorni (9,5-12,5,
stima)**, contro i 4 della prima bozza (§4.8). **Capacita' complete**: circa
**17 giorni** (stima: somma di S0-S8 piu' la preparazione), in nove fette ognuna
fusa da sola. La demo e' a meta' ottobre: il percorso e' al limite, e il piano B
con due ambienti (§4.7) e' cio' che tiene la data.

Ogni fetta chiude con il giro del progetto: `npx tsc --noEmit`,
`npm run check:all`, `npm run rules:check`, `npm run test:dry` nella radice;
`npx tsc --noEmit`, `npx vitest run` e `npm run build` in `web-ui`.

## 7. Sicurezza e vincoli del progetto

- **Nuovi parametri tipizzati** (dopo le decisioni del 1/10): `utente` (un nome
  che passa `BERSAGLIO_VALIDO` **e** esiste nell'ambiente), `schermo` (due interi
  nei limiti di §3) e, calcolato dal server, `finestra` (quattro interi). Mai una
  stringa libera. Opzioni nude: `utente=b`, `finestra=0,0,960,1040`.
- **Le credenziali delle utenze** stanno solo in `.env`, riferite come `${VAR}`;
  il record su disco e il pannello portano il **nome** dell'utenza, mai un valore.

- **L'elenco dei comandi resta chiuso.** Non nasce nessun nome nuovo in
  `NomeComando`: tutto passa dal comando `test`. Una suite, un gruppo, una
  corsia non sono comandi.
- **Parametri tipizzati e validati, mai una stringa da eseguire.** `scenari`:
  lista di percorsi con la regex di oggi, da 1 a 100, senza duplicati.
  `paralleli`: intero da 1 a 4. `fermati`: booleano. Le corsie sono al massimo
  il tetto del server, ognuna con un `bersaglio` che passa `BERSAGLIO_VALIDO` e
  **esiste**. Tutto si controlla prima di avviare la prima corsia.
- **Opzioni in forma nuda**, sempre: `npm run test:bersaglio demo src/features/a.feature
  src/features/b.feature paralleli=2 fermati`. E' cio' che la finestra costruisce
  per se': il tester non vede mai un comando. Un caso di test controlla che
  nessun argomento cominci con un trattino, per ogni combinazione.
- **Nessuna shell.** Il lanciatore resta `spawn` senza `shell`. Se il registro
  deve terminare un albero di processi su Windows, lo fa con una chiamata
  diretta con argomenti in lista e un pid che ha avviato lui.
- **I risultati si leggono dagli artefatti**: i `.ndjson`, per corsia. Mai dalla
  prosa di Cucumber (la lezione del "92 invece di 0").
- **Nessun valore segreto** nei record, nei messaggi, nelle schermate: i
  record portano nomi di ambiente e percorsi di scenario. Le credenziali restano
  in `.env`, riferite come `${VAR}`.
- **Le righe grezze dei processi** non si esporranno da nessuna rotta nuova:
  quella di sola lettura restituisce id, nome, avvio.
- **La guardia di origine** (`daAltraOrigine`) resta su ogni rotta che cambia
  qualcosa, `/api/suite` compresa.
- **Nessuna dashboard di run personalizzata** (`ROADMAP.md` §5): i pannelli di
  corsia sono la schermata Esecuzione che c'e', senza storico, grafici o
  pianificazione.
- **Nessun dato dell'applicazione fuori dalla macchina**: i `.ndjson` e gli
  HTML stanno in `reports/`, gitignorato. Le suite in `src/suites/` contengono
  solo percorsi di scenari salvati (Q2 = a, deciso).

## 8. Perche' non una schermata nuova

Si e' considerato una pagina "Lanci" separata, con elenco di run, storico e
pannelli. Si scarta: e' la dashboard di run che `ROADMAP.md` §5 esclude, duplica
cio' che la pagina Scenari mostrera' come "ultimo esito", e obbliga il tester a
scegliere fra due posti dove lanciare. Una schermata sola, che cresce.

## 9. Come si verifica

### Casi da scrivere **prima**, in questo ordine

Vitest, in `web-ui/__tests__/**/*.test.ts`, ambiente node. Ognuno deve fallire
nella direzione scomoda prima del codice.

`lib/esecuzione.test.ts`:
- `scenari` vuoto, con 101 voci, con un duplicato, con una voce `src/features/a.feature;x`
  o con `..`, con spazi o `&`: tutti rifiutati;
- un file intero e una sua riga: resta l'intero;
- gli argomenti di un lancio con due scenari sono due argomenti separati, in
  ordine, e nessuno comincia con `-`;
- `paralleli`: 2 passa e diventa `paralleli=2`; 0, 5, 2.5, `'2'` e `'2;x'`
  rifiutati; assente o 1: nessun argomento;
- `fermati` produce la parola nuda, e solo se vero;
- l'elenco chiuso rifiuta ancora un comando non previsto (il caso di oggi).

`lib/registro.test.ts` (i casi di oggi sul "un test alla volta", se ce ne sono,
si riscrivono: non si cancellano):
- due registrazioni insieme: la seconda e' rifiutata, con il messaggio di oggi;
- due test insieme sono ammessi; il terzo (oltre il tetto) e' rifiutato con il
  numero nel messaggio;
- un test mentre c'e' una registrazione e una registrazione mentre c'e' un test:
  entrambi rifiutati;
- due lanci nello stesso millisecondo (orologio finto) hanno id diversi;
- `ferma` su una corsia non tocca l'altra;
- `operazioniInCorso()` le elenca tutte; `operazioneInCorso()` restituisce
  prima una operazione di `PERSONA`;
- un lancio con tre corsie e il tetto a due non ne avvia **nessuna**.

`lib/artefatti.test.ts`, con fixture `.ndjson`:
- due scenari con i messaggi **mescolati** (come in parallelo): ognuno ha i suoi
  passi, e la schermata catturata va allo scenario giusto;
- il primo scenario fallito si trova;
- dopo un fail-fast, gli scenari non eseguiti escono `saltato`;
- uno scenario iniziato e non finito esce `in corso`;
- file assente: elenco vuoto, non un errore.

`lib/suite.test.ts` (S2): un percorso fuori da `src/features/`, un duplicato, un
nome non valido, un file mancante (segnalato per nome, senza cadere).

Utenze (fetta SU), `lib/esecuzione.test.ts`, `scripts/lib/targets.check.ts`,
`scripts/lib/accesso.check.ts`:
- un file di ambienti **a un utente solo** (la forma di oggi) risolto dal codice
  nuovo da' lo stesso `Target` di prima;
- un ambiente con `utenti`: `resolveTarget(nome, 'b')` restituisce sessione e
  login di `b`; senza nome, l'utenza di fabbrica (o la prima);
- `utenti` insieme a `session` o `login` dell'ambiente: errore che dice di
  sceglierne uno; `utente` inesistente: errore che elenca quelle che ci sono;
  `utente` su un ambiente senza `utenti`: errore;
- `utente=b` in forma nuda, nessun argomento con i trattini, `x && del *`
  rifiutato;
- il passo `as {string}` con un'utenza inesistente: rosso con l'elenco, mai
  un'altra utenza in silenzio;
- due `Target` di utenze diverse non condividono il file di sessione.

Finestre (fetta S8), `lib/esecuzione.test.ts`: `finestra` = quattro interi,
mai un trattino, rifiutata fuori dai limiti; non si applica a `registrazione`,
`sessione`, `scansione`; il calcolo della griglia per 1, 2, 3 e 4 corsie, e il
ripiego "sovrapposte con scarto" sotto il limite di larghezza.

`api/esegui.test.ts`: un lancio con corsie oltre il tetto e' rifiutato prima di
avviare qualunque processo; un `bersaglio` con `x && del *` resta rifiutato.

### Controlli in `scripts/lib/*.check.ts`, agganciati a `npm run check:all`

- **`percorsi-cucumber.check.ts`** (estesa in S0, dry-run, senza browser, **fatto**):
  1. l'**ordine** di `BDD_PATHS` con piu' file e' l'ordine di esecuzione (letto da
     `testCaseStarted` nel flusso): confermato;
  2. due righe dello stesso file: una esecuzione ciascuna, nell'ordine del file:
     confermato (la forma fusa non serve); un file intero piu' una sua riga: solo
     la riga;
  3. `BDD_HTML` cambia il percorso del report e senza di lui resta quello di
     oggi: confermato; e cio' che `test-bersaglio` passa a Cucumber (funzioni
     pure di `lancio-test.ts`).
- **`cucumber-parallelo.check.ts`** (nuovo in S0, **fatto**, browser vero nascosto,
  nessuna rete; senza browser dice "NON VERIFICATO"): fail-fast (gli scenari
  restanti sono `SKIPPED`), `--parallel 2` con il formatter `message` (ogni
  scenario una volta sola, stessi passi della serie), ordine con un browser vero.
- **`corsie.check.ts`** (nuovo, con un browser vero contro un'applicazione
  finta, sul modello di `accesso.check.ts`): due contesti con due file di
  sessione diversi aperti insieme; ognuno mostra **la propria** utenza. Prova
  che l'isolamento di sessione regge al livello del browser.
- **`suite.check.ts`** (S2): lettura e validazione di una suite d'esempio.

### Prova manuale finale

Sulla **macchina della demo, sulla sua rete**, con l'applicazione aziendale
(Q6 = b; il sito pubblico di pratica e' il piano B, §4.7). Con le utenze
nell'ambiente (§4):

1. Dal Controllo: le due utenze dell'ambiente, accesso registrato e sessione
   fatta per entrambe. Annotare la **durata vera** della sessione di ciascuna.
2. Registrare e salvare due scenari diversi, con il passo di accesso comune.
3. Lanciare ogni corsia **da sola**: verde.
4. Lanciare **insieme**, con "Guarda il browser" e `rallenta` a 500: due
   finestre, ognuna con la sua utenza (il segno scelto in §4), due pannelli che
   si riempiono, totale in cima.
5. Premere "Interrompi tutto" a meta': **nessun browser, nessun processo Node
   resta** (Gestione attivita').
6. Uscire dalla schermata e tornare a lancio in corso: le due corsie si
   riagganciano.
7. Far scadere una delle due sessioni: la sua corsia diventa rossa con il
   messaggio dell'accesso, l'altra resta verde.
8. **Misura**: memoria e processore con due corsie, poi con tre (S5), per
   decidere il tetto.
9. Ripetere dal passo 3 con un secondo utente umano guardando lo schermo, senza
   dare spiegazioni (e' la prova P4 applicata a questa schermata).
10. Con "Guarda il browser": le finestre si affiancano da sole (§3)? Lo schermo
    della demo, la scala di Windows e il secondo monitor, se c'e'. Lo **stesso**
    scenario affiancato e nascosto da' lo stesso esito?
11. Provare **un rosso apposta** e guardare cosa compare a schermo: nessun dato
    personale nelle schermate catturate.
12. Ripetere il giro **la mattina della demo**, con le sessioni rinnovate.

## 10. Fuori da questo lavoro

- **Uno scenario con due attori** (A crea, B approva): serve un World con due
  contesti di browser, ed e' il caso in cui la dipendenza fra utenti e'
  legittima. Merita una sua spec.
- **Pagina "Scenari"** e il suo indice degli esiti: altro lavoro (§5).
- **Storico delle esecuzioni, grafici, pianificazione, esecuzione notturna.**
- **Esecuzione su altre macchine o in cloud.**
- **Piu' scenari in un solo processo con concorrenza** (richiede Page Object
  tenute dal World, `ROADMAP.md` §4 item 3).
- **Dati di partenza creati con una chiamata diretta all'applicazione** (al posto
  di scenari dipendenti): utile, ma e' un'altra famiglia di passi.
- **Pulizia automatica dei record in `reports/cruscotto/`** (Q10).
- **Credenziali nel gestore del sistema** (gia' dichiarato nella spec del
  cruscotto).

## 11. Decisioni e domande


### Decise (proprietario, 1/10/2026)

Dieci domande, tutte decise. Tre (Q5, Q6, Q7) **non** seguono la raccomandazione
della prima bozza: il testo di questa spec e' stato allineato (§3, §4, §6, §9).

| # | Domanda | Decisione | Segue la raccomandazione? | Dove si vede |
|---|---|---|---|---|
| Q1 | Se uno scenario fallisce in una lista | **(c)** sceglie il tester, con un interruttore; di fabbrica continua | si' | §1 |
| Q2 | Dove vivono le suite | **(a)** `src/suites/`, versionate | si' | §2 |
| Q3 | Quanti test contemporanei al massimo | **2** per la demo, **3 dopo una misura** (costante nel codice) | si' | §3, S5 |
| Q4 | Due corsie sullo stesso ambiente | **(b)** consentite, con un avviso | si' | §3, §4.4 |
| Q5 | Utenze: A o B | **(b)** il modello "piu' utenti dentro un ambiente" **subito** | **no**: la raccomandazione era (a) | §4, fetta SU |
| Q6 | Su quale applicazione gira la demo | **(b)** un'**applicazione aziendale** | **no**: la raccomandazione era (a), il sito pubblico | §4.7 |
| Q7 | Finestre affiancate in "Guarda il browser" | **(b)** posizione **automatica** | **no**: la raccomandazione era (a), a mano | §3, fetta S8 |
| Q8 | `paralleli=N` dentro una corsia | **(b)** si', spento di fabbrica, con l'avviso sull'account | si' | §3, S4 |
| Q9 | Un test e una registrazione insieme | **(a)** vietato, come oggi | si' | §3 |
| Q10 | Chi pulisce `reports/cruscotto/` | **(a)** la pagina Scenari | si' | §5 |

**Cosa e' cambiato per le tre che deviano dalla raccomandazione:**

- **Q5**: il lavoro sale da "un ambiente per utenza, a costo zero" a circa cinque
  giorni di modello. Ne e' conseguenza il piano B della demo (due ambienti, che
  funzionano oggi) e la fine di "Duplica ambiente".
- **Q6**: la demo porta i rischi che la raccomandazione evitava (MFA e SSO, sessioni
  che scadono, dati reali, rete aziendale), e una prova generale **obbligatoria**
  sulla macchina aziendale. La stima passa da 4 a circa 11 giorni, insieme a Q5.
- **Q7**: il viewport del test **cambia** quando le finestre si affiancano. E' un
  compromesso dichiarato, con i suoi limiti, in §3.

### Aperte, nate da queste decisioni

| # | Domanda | Per chi | Proposta |
|---|---|---|---|
| Q11 | La frase del passo con il ruolo: `the user is logged in as {string}` (§4.6) | il team (regola dei passi nuovi: `@wanted`, approvazione prima di implementare) | si' alla frase; senza il nome resta l'utenza della corsia |
| Q12 | Quali due utenze e quali due scenari della demo, sull'applicazione aziendale: di sola lettura, senza dati personali, con utenze che non condividono dati | chi conosce l'applicazione | da decidere **prima** di SU, perche' decide cosa si registra |
| Q13 | Il limite di larghezza sotto cui le finestre non si affiancano ma si sovrappongono con scarto (§3) | il proprietario, dopo averlo visto su uno schermo vero | 800 px, da regolare in prova generale |
