# Esecuzione avanzata — design

> Bozza del 2026-10-01, da approvare. Sotto-progetto 4 di 5. Non costruisce
> niente: dice cosa significano quattro capacita' (lanci multipli, scenari in
> serie, lanci in parallelo, parallelo con utenze diverse), quale scegliere, in
> che ordine consegnarle e come provarle. Le stime in giorni sono **stime**, non
> misure: nessuna e' stata provata su una macchina.

## Stato di partenza (verificato nel codice il 2026-10-01)

| Fatto | Dove |
|---|---|
| Un solo lucchetto: `registrazione`, `sessione`, `scansione` e `test` sono nell'elenco `LUNGHI`, e `avvia()` rifiuta se una qualunque e' in corso. Nessuna coda | `web-ui/src/lib/registro.ts` |
| `operazioneInCorso()` restituisce una sola operazione (il primo risultato, "l'unico possibile") | `registro.ts` |
| Lo stato sta in `globalThis.__bddRegistro`: memoria del processo server | `registro.ts` |
| L'id e' `<nome>-<tempo in base 36>`: due lanci nello stesso millisecondo avrebbero lo stesso id | `registro.ts` |
| `Parametri.scenario` e' **una** stringa, validata da una regex a valore singolo | `web-ui/src/lib/esecuzione.ts` |
| Lo script sa gia' ricevere **piu'** percorsi (`args.slice(1)` filtrato) e li passa a Cucumber in `BDD_PATHS`, separati da `;` | `scripts/test-bersaglio.ts` |
| Un processo Cucumber per run, lanciato con `execFileSync`: se la finestra uccide il processo `test-bersaglio`, **non e' verificato** che muoia anche Cucumber con i suoi browser (su Windows `kill()` non termina l'albero) | `registro.ts`, `test-bersaglio.ts` |
| Nessuna impostazione `parallel`; il report HTML scrive su un file **fisso** `reports/cucumber-report.html` | `cucumber.js` |
| `AMBIENTE = ambiente()` e' una costante di modulo, risolta una volta per processo da `BDD_TARGET`. Ogni scenario apre browser, contesto e pagina propri e li chiude in `After`. Nessun `BeforeAll`/`AfterAll` nel repository | `src/support/world.ts`, `hooks.ts` |
| Un ambiente = un file di sessione = una ricetta di login. Nessun concetto di piu' utenti per ambiente | `scripts/lib/targets.ts` |
| Gli esiti si leggono dal flusso di messaggi `.ndjson`, ma `leggiPassiTest` li restituisce **piatti**: nessun raggruppamento per scenario | `web-ui/src/lib/artefatti.ts` |
| La schermata ha un solo flusso SSE e un solo polling dei passi, e ricorda **un** id in `sessionStorage` | `esecuzione/page.tsx`, `riaggancio-client.ts` |
| L'ambiente e' uno per tutta la finestra (barra laterale) | `AmbienteContext.tsx` |

Due cose che questa bozza **non** ha potuto leggere: la spec della pagina
"Scenari" (`2026-10-01-pagina-scenari-design.md`) non esiste ancora nel
repository, quindi il contratto verso di lei (§5) e' una **richiesta**, non un
fatto; e il comportamento di Cucumber 10.9 su `--parallel`, sull'ordine dei
percorsi e su due righe dello stesso file sono noti dalla documentazione ma
vanno **provati** con i controlli di §9 prima di fidarsene.

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
  ~6 KB, sotto il limite di riga di Windows), nessun duplicato. Se un file
  compare intero **e** con una riga, resta solo l'intero. Quando due righe dello
  stesso file sono scelte, vedi "Da provare" sotto. Il vecchio `scenario` si
  toglie, non si tiene: l'unico chiamante e' la schermata.
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
- **Due righe dello stesso file** (`x.feature:3` e `x.feature:9`): non e'
  verificato se Cucumber le esegue una volta ciascuna o le fonde. Da provare
  (§9). Se serve, il lanciatore le fonde nella forma `x.feature:3:9`, che e' la
  forma di Cucumber, prima di passarle.

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
versionato e' una decisione da prendere (domanda Q2).

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
frase che dice perche'. Che Cucumber rispetti davvero l'ordine dei percorsi dati
non e' verificato: e' il primo caso di §9, scritto prima del codice (due file in
ordine inverso rispetto all'alfabeto; l'ordine di `testCaseStarted` nel flusso
deve seguire la lista).

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
  schermata (domanda Q4). E' la strada (i) a mano, e il rischio e' quello
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
- **Interrompi**: oggi `ferma(id)` fa `figlio.kill()`. Su Windows questo non
  termina i processi figli, e `test-bersaglio` lancia Cucumber con
  `execFileSync`: **e' plausibile**, ma non verificato, che un Interrompi lasci
  Cucumber e i suoi browser in vita. Con una corsia e' un fastidio, con tre e'
  una macchina che si pianta. La prima fetta (§6) lo verifica; se e' vero, il
  registro termina l'albero con una chiamata interna a `taskkill` con
  argomenti in lista, **senza shell** (stesso principio di
  `lanciatoreVero`), e solo sul pid che il registro stesso ha avviato.
  "Interrompi tutto" chiama `ferma` su ogni corsia del lancio.
- **Riaggancio lato client**: `sessionStorage` ricorda una **lista** di id
  (le corsie del lancio) invece di uno. All'apertura la schermata legge
  `operazioni` e riaggancia tutte le corsie di test.
- **Il report HTML a nome fisso**: due processi contemporanei si
  sovrascriverebbero `reports/cucumber-report.html`. La finestra non lo legge
  (legge il `.ndjson`), ma lo scrive comunque. Si rende configurabile:
  `cucumber.js` legge `BDD_HTML` (assente: il file di oggi, quindi chi lancia a
  mano non nota niente), e `test-bersaglio.ts`, quando riceve `messaggi=`, mette
  `BDD_HTML` accanto al `.ndjson` (`reports/cruscotto/<id>.html`). Che il
  formatter di `cucumber.js` si **sommi** a `--format message:...` della riga di
  comando e' gia' il comportamento che il codice sfrutta (i percorsi si sommano
  allo stesso modo, e il `.ndjson` esce insieme all'HTML): il caso di §9 lo
  prova per il nuovo `BDD_HTML`.

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
- **Che il formatter `message` funzioni con `--parallel`** e' noto dalla
  documentazione di Cucumber, non da una prova su questo repository: e' un caso
  di §9.

### Risorse della macchina

Ogni scenario apre un browser **intero** (`avviaBrowser` in `init()`), non un
contesto su un browser condiviso. Con N corsie, o N worker, ci sono N browser
vivi contemporaneamente. Ordine di grandezza **stimato** (non misurato):
qualche centinaio di megabyte per un Chromium e almeno un core per ciascuno.
Sul portatile aziendale non si sa cosa succede a tre: il tetto
`MAX_TEST_CONTEMPORANEI` e' una costante da regolare dopo una misura, e la
misura e' un passo della prova manuale finale (§9).

### "Guarda il browser" con N finestre

Le finestre si aprono sovrapposte e il tester non sa quale sia di quale
corsia. Tre gradi:

1. **Niente di nuovo** (demo): si dispongono a mano (tasto Windows con le
   frecce) e il titolo del pannello nella finestra dice quale ambiente e'.
2. **Pausa fra le azioni** (`rallenta=`, c'e' gia'): serve comunque, perche' due
   finestre veloci non si seguono.
3. **Posizione automatica**, una variabile `BDD_FINESTRA` con posizione e
   dimensione, per affiancarle. Tocca `avviaBrowser` e, per far valere la
   dimensione della finestra, rinuncia al viewport fisso: **cambia il layout
   che il test vede**, quindi solo per "Guarda il browser" e dichiarato nella
   frase. Fuori dalla demo (domanda Q7).

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

### Il vincolo

Un ambiente = una sessione = un utente (`Target` in `targets.ts`: un campo
`session`, un blocco `login`). Oggi un secondo utente e' un secondo ambiente nel
file `bdd-targets.json`.

### Tre approcci

| | A. Un ambiente per utenza | B. Modello "utenze" nell'ambiente | C. Tag `@utente:nome` sullo scenario |
|---|---|---|---|
| Forma | `demo-utente-a`, `demo-utente-b`, ognuno con la sua sessione e il suo login | `utenti: { "utente-a": { sessione, login }, ... }` e una variabile `BDD_UTENTE` | Lo scenario dichiara chi e' |
| Modello nuovo | **Quasi nessuno** | Si, in piu' punti | Richiede B |
| Credenziali | In `.env`, scritte dal Controllo come `${VAR}` nella riga dell'ambiente | Idem, ma una coppia per utente | Idem |
| Registrare l'accesso | Il Controllo lo fa **gia'** per ambiente: "Registra l'accesso" e "Accedi adesso" | Da estendere: quale utente? | Idem B |
| Cosa vede il tester | L'elenco ambienti si allunga e si sporca (`demo`, `demo-utente-a`, `demo-utente-b`) | Un ambiente con un selettore di utente | Niente: lo decide lo scenario |
| Costo (stima) | ~0 di codice, qualche minuto di configurazione | 4-6 giorni | Costo di B piu' un hook |

**Perche' C non e' un'alternativa a B ma uno strato sopra B.** Un tag
`@utente:nome` deve risolversi in qualcosa: o in un ambiente (e allora lo
scenario nomina un ambiente che esiste solo su questa macchina, cioe' si lega a
un posto), o in un'utenza di B. In piu', la scelta dell'utente appartiene al
**lancio**, non allo scenario: lo stesso scenario "aggiungi al carrello" e'
buono per l'utente A e per l'utente B, ed e' proprio quello che la demo vuole
mostrare. L'eccezione e' lo scenario che e' *per un ruolo* ("l'amministratore
vede il pannello"), e per quello e' pronto lo strumento giusto: la decisione D2
della spec dell'accesso (`the user is logged in as {string}`), da prendere
**insieme** a B, non prima.

**Raccomandazione: A adesso, B solo quando serve davvero.** "Serve davvero"
vuol dire: un'applicazione con tre o piu' ruoli da provare, oppure un elenco di
ambienti che i tester non riescono piu' a leggere. Il momento per deciderlo sono
le prove sul campo (P4 in `docs/anti-entropy/10-prove-sul-campo.md`), non una
demo. Per tenere A sopportabile:

- una convenzione di nome (`<ambiente>-<utenza>`), scritta nella guida;
- (fetta S6) un pulsante **Duplica ambiente** nel Controllo: copia indirizzo e
  segnale di pronto, lascia vuoti login e sessione, e il tester registra l'accesso
  della nuova utenza. Mezza giornata, stima.

### Credenziali, sessioni, MFA

- **Dove stanno**: solo in `.env`, riferite come `${VARIABILE}` nel blocco
  `login` dell'ambiente (`bdd-targets.json`, gitignorato). Questo lavoro non
  introduce un solo valore nei file versionati, ne' una password nella finestra
  oltre ai campi mascherati del Controllo che esistono gia'.
- **Come si registra l'accesso di ogni utenza**: dal Controllo, una volta per
  ambiente, con "Registra l'accesso" (la ricetta) e "Accedi adesso" (la
  sessione). Due utenze, due volte.
- **MFA e SSO**: l'automatismo non blocca mai e finisce a mano (`targets.ts`).
  Con la sessione valida non c'e' nessuna MFA da fare, e per questo la
  sessione di **ciascuna** utenza si rinnova prima della demo. Se la sessione e'
  scaduta e l'accesso richiede la MFA, il passo di accesso comune lo dice con il
  messaggio della spec dell'accesso, e la corsia diventa rossa: non e' un guasto
  del lancio parallelo. Un SSO che ammette una sola sessione per utente e'
  il motivo per cui le utenze **devono** essere diverse.
- **Cosa vede il tester**: nel pannello di ogni corsia il nome dell'ambiente
  (che nel caso A e' anche il nome dell'utenza). Mai una credenziale, mai un
  percorso di file.

### La versione minima per una demo

**Obiettivo**: mostrare "due scenari che girano insieme con due utenti
diversi", sul sito pubblico di pratica gia' usato come ambiente `demo` (mai
un'applicazione aziendale su un palco: dati e MFA).

**Cosa si costruisce** (e' la fetta S0 piu' la S3 di §6, ridotta a due corsie):

1. **Registro**: `PERSONA` contro `test`, fino a due test contemporanei, id
   unici, `operazioniInCorso()`. Casi di test scritti prima.
2. **Report per corsia**: `BDD_HTML` (due righe in `cucumber.js` e
   `test-bersaglio.ts`).
3. **Contratto `scenari: string[]`** nel validatore (la UI, per ora, ne manda
   uno per corsia): cosi' la schermata non va riscritta quando arrivano i
   lanci multipli.
4. **Schermata**: la riga "scenario + ambiente" si puo' ripetere (al massimo
   due), un solo pulsante "Lancia", due pannelli affiancati, "Interrompi" per
   corsia e "Interrompi tutto". Il corpo di oggi della pagina diventa un
   componente di corsia, usato una o due volte.
5. **Ambienti**: `demo-utente-a` e `demo-utente-b` creati **dal Controllo**
   (nessun codice), ognuno con login e sessione registrati.
6. **Due scenari salvati**, registrati dalla sessione, con il passo di accesso
   comune.
7. **Prova generale** (§9), con la sessione di ciascuna utenza rinnovata il
   giorno prima.

**Cosa NON si costruisce**: modello a utenze (B), tag (C), `paralleli=N`, suite,
scelta multipla, endpoint aggregato, posizione automatica delle finestre,
Duplica ambiente. Tutto questo e' utile e sta in §6, ma dopo.

**Costo onesto (stima): da 3 a 5 giorni, centro 4**, cioe' le fette di §6: S0
(id unici, report per corsia, contratto `scenari`, verifica dell'Interrompi:
1), S3 (registro con i suoi casi, 1; schermata a due corsie nelle due lingue,
1,5) e la preparazione (ambienti, scenari, prova generale: 0,5). Il rischio che
sposta la stima verso 5 e' l'Interrompi (se Cucumber resta orfano) e il
Controllo che, per la seconda utenza, chiede piu' tentativi del previsto. Il tempo di calendario conta: la demo e' a meta'
ottobre, quindi questa e' la fetta da fare per prima.

**Un dettaglio da non dare per scontato**: sul sito pubblico di pratica le
utenze di prova sono piu' d'una con la stessa password, ma alcune hanno
difetti voluti. Se ne scelgono due **senza** difetti (altrimenti uno degli
scenari "fallisce" sul palco, e non per colpa nostra). Come si distingue a
schermo chi e' dentro: un segno dell'applicazione (un nome mostrato, o un
cookie leggibile dal controllo di §9). Si trova in prova generale; se
l'applicazione non ne ha, si sceglie un'altra applicazione di pratica, non si
finge.

**Piano B se sul palco qualcosa si rompe**, in ordine di rinuncia:

1. **Una delle due sessioni e' scaduta** (si vede dal Controllo, che mostra l'eta'
   della sessione): "Accedi adesso" sull'utenza, due minuti, si rilancia.
   Il giorno stesso, in apertura, si lancia **ogni corsia da sola** prima del
   pubblico.
2. **Le due finestre si sovrappongono o la macchina rallenta**: si lancia **senza**
   "Guarda il browser": restano i due pannelli di risultato, che sono la cosa
   importante.
3. **Il parallelo si pianta**: si lancia la prima corsia, poi la seconda, **con lo
   stesso schermo**, dicendolo ("qui girano insieme, adesso li facciamo uno
   dopo l'altro"). Funziona oggi, senza niente di nuovo.
4. **Nulla funziona**: il video della prova generale, registrato in anticipo
   (`PRESENTATION.md` prevede gia' un video di riserva per l'atto del
   Registra).

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
di costo crescente delle quattro capacita': e' quello che porta alla demo per
prima. Le giornate sono stime.

| Fetta | Cosa | Perche' sta li' | Stima | Dipende da |
|---|---|---|---|---|
| **S0** Fondamenta | Id unici; `BDD_HTML`; `scenari: string[]` validato (la UI ne manda uno); verifica e, se serve, correzione dell'Interrompi che lascia orfani | Senza queste, qualunque cosa dopo e' costruita su un difetto | 1 | spec dell'accesso (costruita) |
| **S3** Due corsie | Registro con `PERSONA` e fino a due test; `operazioniInCorso()`; schermata a due pannelli; riaggancio con lista | **E' il cuore della demo** | 2,5 | S0 |
| **Demo** Preparazione | Ambienti `demo-utente-*`, scenari, prova generale, video di riserva | Non e' codice, ma e' tempo | 0,5 | S3 |
| **S1** Lanci multipli | Scelta multipla, gruppi come scorciatoia, `leggiScenariTest`, totale, "Vai al primo fallito", interruttore "Fermati al primo fallito" (`fermati`) | E' la capacita' piu' economica e la piu' usata | 2 | S0; **pagina Scenari** per il punto "Esegui i selezionati", ma si consegna anche senza |
| **S2** Suite | `src/suites/`, `/api/suite`, scelta nella schermata, disabilita il parallelo | Poco codice, vale molto per chi ripete le stesse prove | 1 | S1 |
| **S4** Parallelo in corsia | `paralleli=N` (1-4), selettore "Quanti alla volta", avviso sull'account | Solo dopo S1, perche' serve il lettore raggruppato | 1,5 | S1 |
| **S5** Piu' di due corsie | Tetto portato a 3, endpoint `GET /api/lanci/<id>` a polling unico, cache di lettura dei file, lancio "tutto o niente", misura di CPU e RAM | Va misurata prima di alzare il tetto | 1,5 | S3, S1 |
| **S6** Duplica ambiente | Pulsante nel Controllo | Toglie lo sporco dell'approccio A | 0,5 | -- |
| **S7** Utenze nell'ambiente (B) | **Solo se deciso** (Q5): `targets.ts`, `session.ts`, `record.ts`, `test-bersaglio.ts`, `world.ts`, accesso, derivazione del login, Controllo, generazione | Il modello vero, quando A non basta | 4-6 | decisione D2 della spec dell'accesso, prove sul campo |

**Percorso per la demo**: S0 + S3 + Demo, circa 4 giorni (3-5). **Capacita'
complete senza B**: circa 10 giorni (stima: somma delle fette S0-S6, preparazione
esclusa), in sette fette ognuna fusa da sola.

Ogni fetta chiude con il giro del progetto: `npx tsc --noEmit`,
`npm run check:all`, `npm run rules:check` nella radice; `npm test` e
`npm run build` in `web-ui`.

## 7. Sicurezza e vincoli del progetto

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
  solo percorsi di scenari salvati (domanda Q2).

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

`api/esegui.test.ts`: un lancio con corsie oltre il tetto e' rifiutato prima di
avviare qualunque processo; un `bersaglio` con `x && del *` resta rifiutato.

### Controlli in `scripts/lib/*.check.ts`, agganciati a `npm run check:all`

- **`percorsi-cucumber.check.ts`** (estensione, dry-run, senza browser):
  1. l'**ordine** di `BDD_PATHS` con due file e' l'ordine di esecuzione (letto da
     `testCaseStarted` nel flusso);
  2. due righe dello stesso file: una esecuzione ciascuna, o la forma fusa;
  3. `BDD_HTML` cambia il percorso del report e senza di lui resta quello di
     oggi, e il `.ndjson` esce lo stesso;
  4. `BDD_PARALLEL=2` con il formatter `message`: il flusso contiene tutti gli
     scenari una volta sola.
- **`corsie.check.ts`** (nuovo, con un browser vero contro un'applicazione
  finta, sul modello di `accesso.check.ts`): due contesti con due file di
  sessione diversi aperti insieme; ognuno mostra **la propria** utenza. Prova
  che l'isolamento di sessione regge al livello del browser.
- **`suite.check.ts`** (S2): lettura e validazione di una suite d'esempio.

### Prova manuale finale

Sulla macchina della demo, con il sito pubblico di pratica:

1. Dal Controllo: `demo-utente-a` e `demo-utente-b`, accesso registrato e
   sessione fatta per entrambi.
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

## 11. Domande aperte per il proprietario

| # | Domanda | Opzioni | Raccomandazione |
|---|---|---|---|
| Q1 | Se uno scenario fallisce in una lista, che si fa | (a) continua sempre; (b) si ferma sempre; (c) scelta del tester con interruttore | **(c)**, interruttore spento: continua |
| Q2 | Dove vivono le suite | (a) `src/suites/` versionato; (b) `reports/` locale; (c) tag nei `.feature` | **(a)**: contengono solo percorsi di scenari gia' versionati, e devono viaggiare |
| Q3 | Quanti test contemporanei al massimo | 2 (demo), 3, 4 | **2 per la demo, 3 dopo la misura di S5**; e' una costante |
| Q4 | Due corsie sullo stesso ambiente insieme | (a) vietato; (b) consentito con avviso; (c) consentito | **(b)**: e' la strada del parallelo veloce, a rischio dichiarato |
| Q5 | Utenze: A o B | (a) A ora, B se serve; (b) B ora | **(a)**; B si decide dopo le prove sul campo, insieme alla D2 dell'accesso (`as {string}`) |
| Q6 | Su quale applicazione gira la demo | (a) sito pubblico di pratica; (b) un'applicazione aziendale | **(a)**: nessuna MFA, nessun dato reale, due utenze di prova |
| Q7 | Finestre affiancate in "Guarda il browser" | (a) a mano; (b) posizione automatica (cambia il viewport) | **(a)** per la demo; (b) solo se i tester la chiedono |
| Q8 | `paralleli=N` dentro una corsia | (a) mai; (b) si', spento di fabbrica, con l'avviso sull'account; (c) si', acceso | **(b)** |
| Q9 | Un test e una registrazione insieme | (a) vietato, come oggi; (b) consentito | **(a)**: si contendono schermo e sessione |
| Q10 | Chi pulisce `reports/cruscotto/` | (a) la pagina Scenari; (b) un lavoro a parte; (c) nessuno | **(a)**, con tetto sul numero di esecuzioni conservate |
