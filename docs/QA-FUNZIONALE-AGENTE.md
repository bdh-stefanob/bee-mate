# Prompt: collaudo funzionale del cruscotto (UI, UX, funzioni, requisiti)

> **Come si usa.** Si passa l'intero file a un agente che sa pilotare un browser
> (Playwright MCP, o Playwright da script) e lanciare comandi. L'agente **non
> corregge**: collauda e riporta. Il risultato e' una tabella di esiti con le
> prove, da cui si decide cosa sistemare.
>
> Requisiti verificati: `.kiro/specs/demo-anti-entropia/requirements.md`
> (V1-V5, R1-R9), `docs/superpowers/specs/2026-09-22-cruscotto-tester-design.md`,
> `docs/TESTER-DASHBOARD-GUIDE.md`, `ROADMAP.md` §5 (cosa non fare) e la lista
> `docs/reviews/2026-09-25-dashboard-walkthrough.md` (F1-F20).

---

## 0. Ruolo e regole d'ingaggio

Sei un **tester QA indipendente**. Collaudi l'applicazione desktop "BDD Catalog"
(cruscotto per tester manuali + portale del catalogo) e la catena che c'e' sotto
(registra → genera → esegui). Riporti **fatti con prove**, non impressioni.

**Non negoziabile:**

1. **Non correggere nulla.** Nessuna modifica a codice, messaggi, test o
   configurazione del repository. Se trovi un difetto, lo riporti.
2. **Lavora su una copia.** Prima di tutto: `git worktree add` in una cartella
   temporanea (o copia del repository senza `reports/`, `.env`, `bdd-targets.json`).
   L'app scrive `.env`, `bdd-targets.json`, `reports/` nella radice: non farlo
   sull'installazione di una persona. Alla fine cancella solo la tua copia.
3. **Nessun dato reale.** Niente indirizzi, credenziali o pagine aziendali.
   Ambiente di prova: il sito pubblico di pratica dell'esempio
   (`bdd-targets.example.json`, voce `demo`, `https://www.saucedemo.com`, utente
   `standard_user`, password `secret_sauce`: innocue e in chiaro apposta).
   Se non e' raggiungibile, dillo e segna "non verificabile", non inventare.
4. **Non lanciare** `confluence:*`, `jira:*`, `git push`, `git commit`, ne'
   comandi che scrivono fuori dalla tua copia.
5. **Riporta l'output testuale**, non un riassunto. Ogni esito ha una prova:
   testo letto a schermo, screenshot con nome file, riga di output, contenuto
   di un file. Un esito senza prova vale "non verificato".
6. **Distingui** *difetto nuovo*, *difetto gia' noto* (elenco in §11) e *non
   verificabile*. Non riaprire come nuovo cio' che e' gia' in lista.

## 1. Preparazione

```
cd <tua-copia>
npm ci
cd web-ui && npm ci
```

- Se `npm ci` fallisce in `web-ui` e' un difetto gia' noto (lockfile): riportalo
  con l'errore e prosegui con `npm install` **solo** nella tua copia, dicendolo.
- `npx playwright install chromium` se manca un browser.
- Avvia la finestra come server web: in `web-ui`, `npm run dev`
  (http://localhost:3000). Se la 3000 e' occupata usa un'altra porta e dillo.
  Il collaudo grafico si fa sul browser, non su Electron.
- Copia `bdd-targets.example.json` in `bdd-targets.json` **solo** quando un caso
  lo chiede (la partenza pulita e' un caso).

Verifiche di base da riportare: versione di Node, sistema operativo, browser
usato, porta, `git rev-parse --short HEAD`.

## 2. Baseline automatica (prima di guardare lo schermo)

Lancia e riporta l'esito di ognuno, con le ultime righe:

| # | Comando | Atteso |
|---|---|---|
| B1 | `npx tsc --noEmit` (radice) | nessun errore |
| B2 | `npm run check:all` (radice) | "Tutti i controlli passano" (nessun `FAIL`) |
| B3 | `npm run rules:check` (radice) | "Regole allineate" |
| B4 | `npm run test:dry` (radice) | scenari e step validi, nessuno "undefined" |
| B5 | in `web-ui`: `npm test` | tutti verdi |
| B6 | `npm run check:i18n` (radice) | passa |
| B7 | in `web-ui`: `npm run build` | build riuscita |

Nota nota gia': i due casi di `web-ui` che dipendono dalla macchina dell'autore
(una registrazione locale gitignorata, un percorso Windows su Linux) possono
fallire su una copia pulita.

## 3. Requisiti trasversali (V1-V5)

| ID | Verifica | Come |
|---|---|---|
| V1 zero costi | nessuna dipendenza a pagamento ne' servizio esterno obbligatorio | leggi `package.json` (radice e `web-ui`) e le chiamate di rete dell'app: solo i siti di prova e, se configurati, Atlassian/GitHub |
| V2 facile | ogni errore dice come si risolve | provoca errori (§8) e guarda se il messaggio contiene il rimedio |
| V3 alla portata dei tester | un tester non vede terminali ne' comandi | cerca `npm `, `npx `, `ts-node`, percorsi come `C:\` o `/src/` in **tutte** le schermate dei due gruppi, in entrambe le lingue, e nei file `web-ui/messages/*.json` (una ricerca testuale). Ogni occorrenza visibile a un tester e' un difetto (gia' noto: F8) |
| V4 numeri rifacibili | i conteggi mostrati corrispondono ai dati | confronta 3 numeri della UI (passi, verifiche, voci di catalogo) con i file che li producono |
| V5 nessun dato aziendale | nessun dato reale nei file versionati | `git ls-files` non contiene `reports/`, `.env`, `bdd-targets.json`, `reports/sessions`; ricerca nel versionato di domini reali e credenziali: attesi solo segnaposto (`xxx`, `${VAR}`) |

## 4. Cruscotto: Controllo (`/controllo`)

Parti con `bdd-targets.json`, `.env` e `reports/` **assenti** (installazione nuova),
poi ripeti con un ambiente configurato.

| ID | Caso | Atteso |
|---|---|---|
| C1 | prima apertura, browser presente, nessun ambiente | riga in cima chiara; la voce "Ambienti" manca ed e' l'unico blocco vero |
| C2 | installazione nuova con browser **e** un ambiente | la riga in cima **non e' rossa**: dizionari e registrazioni vuoti compaiono come "Per iniziare · n di m" (F11, corretto il 30/9) |
| C3 | ogni voce | ha icona **e** parola (mai solo colore) e, se manca qualcosa, il pulsante che la risolve |
| C4 | aggiunta di un ambiente (nome + indirizzo) | compare subito nel selettore laterale **senza ricaricare**; Registra ed Esegui lo vedono (F3) |
| C5 | ambiente aggiunto senza accesso registrato | non dice "Tutto a posto": dice che l'accesso non e' registrato (F4) |
| C6 | modifica indirizzo, eliminazione | conferma con elenco delle conseguenze; annullando non cambia nulla. Nota: oggi usa `window.confirm` (F13) |
| C7 | registrare l'accesso (pulsante), chiudendo il browser | l'accesso si conclude alla chiusura, si crea il blocco di login con segnaposto `${VAR}` al posto dei valori |
| C8 | credenziali | il campo e' mascherato; **il valore non riappare mai** dopo il salvataggio, ne' nelle risposte delle rotte, ne' nei file di stato, ne' nell'output |
| C9 | ambiente con variabile mancante | dice **quale variabile** manca (solo il nome, mai il valore) |
| C10 | sezione "avanzate" | Assistente, Agenti, Catalogo stanno li', richiudibili, e non decidono "pronto" |
| C11 | errore del caricamento (fermando il server API) | messaggio di errore con "Riprova" |

## 5. Cruscotto: Registra (`/registra`) - R2, R3, R5

| ID | Caso | Atteso |
|---|---|---|
| G1 | senza ambiente | stato vuoto con via d'uscita (oggi manca: F14) |
| G2 | avvio registrazione su `demo` | si apre il browser, la barra del recorder compare (R2.7: la finestra dice se la barra si e' montata) |
| G3 | lingua della barra | la barra parla la stessa lingua della finestra (oggi no: task 16) |
| G4 | esegui un flusso reale: accesso, aggiungi al carrello, checkout, con **3+ passi** e **2+ Verifica** su titolo/messaggio (elementi non interattivi, R2.2) | ogni gesto e' registrato come ruolo + nome accessibile; nessun selettore CSS nella traccia |
| G5 | Verifica su un punto senza elementi | resta in modalita' verifica (R2.3) |
| G6 | campo password | il valore **non** e' nella traccia (`<password>`, R2.6): controlla il JSON in `reports/recordings/` |
| G7 | chiusura del browser senza aver fatto nulla | il riepilogo dice "niente registrato" e offre **Registra di nuovo**, mai Genera (F5) |
| G8 | riepilogo dopo una registrazione vera | passi con i loro nomi, numero di verifiche, buchi tradotti; letto dalla **traccia**, non dall'output. Conta a mano e confronta col JSON |
| G9 | dal riepilogo | esiste "Registra di nuovo" (F6) |
| G10 | registrazione che fallisce (`BDD_BROWSER=nonexistent` come variabile d'ambiente, oppure indirizzo irraggiungibile) | la finestra dice **perche'** e cosa fare, con azione "Vai al Controllo" (F2) |
| G11 | "Genera il test" | produce feature + Page Object + step; poi `npx tsc --noEmit` passa **senza modelli** (R3.1); le frasi sono le etichette del tester (R3.2) |
| G12 | componente non nel dizionario | il locator e' sintetizzato e dichiarato come buco (R3.3), non nascosto |
| G13 | percorso su piu' domini, o piu' indirizzi sulla stessa Page Object | dichiarato come buco (R3.4). Attenzione: il codice per il doppio dominio (decisione T3) **non esiste**: verifica che il sistema lo dica, non che lo gestisca |
| G14 | file generato modificato a mano (marcatore tolto) e rigenerazione | il file **non** viene sovrascritto (R3.5) |
| G15 | nessun selettore negli step generati | cerca `locator(`, `getBy`, `$(` in `src/steps/**`: solo nelle Page Object (R3.6) |
| G16 | salvataggio: applicazione, flusso, nome | il file va in `src/features/<app>/<flow>/`, glue in `src/steps/<app>/<flow>/`, Page Object in `src/pages/<app>/`; tag `@app @flow @generato` |
| G17 | secondo scenario nella stessa app | la Page Object condivisa **cresce** con i metodi mancanti e **non perde** metodi esistenti (R5.2-5.4); una frase gia' definita da un altro scenario **ferma** il salvataggio elencando le frasi, senza scrivere nulla |
| G18 | dopo il salvataggio | le Page Object restano anche in `src/pages/generated/`? (F20: chiedi se voluto) |
| G19 | operazione lunga in corso, poi cambio schermata e ritorno | la finestra **ritrova** l'operazione in corso (D35) |
| G20 | due operazioni lunghe insieme | la seconda riceve un **no chiaro**, non una coda silenziosa |
| G21 | chiudere l'app a meta' registrazione, riaprire | l'operazione risulta **interrotta** e la traccia gia' salvata resta |

## 6. Cruscotto: Esegui (`/esecuzione`) - R8

| ID | Caso | Atteso |
|---|---|---|
| E1 | scelta di cosa lanciare | tutti gli scenari registrati (anche gia' spostati), un file, un singolo scenario; dopo il salvataggio quello nuovo e' **preselezionato** |
| E2 | lancio con sessione salvata | parte gia' autenticato; passi verticali che diventano verdi mentre girano; totale e tempo (R8.1) |
| E3 | "Parti senza sessione" su uno scenario che contiene l'accesso | funziona; **senza** l'interruttore, lo stesso scenario fallisce cercando un pulsante che non c'e' (spiegato nel messaggio?) |
| E4 | "Guarda il browser" | il browser e' visibile |
| E5 | verifica che fallisce (testo inesistente) | riga rossa, **frase in chiaro** con pagina attesa e indirizzo reale, schermata catturata, dettaglio tecnico **ripiegato**; niente sequenze di escape ANSI, niente percorsi assoluti della macchina (F1, corretto) |
| E6 | pulsante Stop durante l'esecuzione | ferma, la schermata torna alla scelta, l'operazione risulta interrotta (F7, corretto) |
| E7 | parole | la schermata dice "Ambiente", mai "Target"/"Bersaglio", in entrambe le lingue (F10, corretto il 30/9) |
| E8 | risultato | passi e verifiche si distinguono? il totale e' visibile senza scorrere su uno scenario lungo? (oggi no: F18) |
| E9 | senza assistente (Kiro) | lo scenario deterministico gira comunque (R8.2) |
| E10 | da riga di comando: `npm run test:bersaglio demo` | funziona in PowerShell e in bash (senza variabili di ambiente scritte a mano) |

## 7. Catalogo, portale e catena dei dati

| ID | Caso | Atteso |
|---|---|---|
| P1 | `/catalogo` (cruscotto) e `/portale` | mostrano i conteggi coerenti con `step-catalog.json` (10 voci: 1 implementata, 9 `@wanted` a inizio 30/9) |
| P2 | il catalogo **non mente su se stesso** | stato e conteggi coincidono con il file dopo un salvataggio e dopo "aggiorna" |
| P3 | doppione di frase | si risolve dalla finestra, a cascata e con ritorno (annullabile) |
| P4 | a quale applicazione appartiene uno step | visibile, con cosa fa |
| P5 | `/editor` | l'autocompletamento propone **solo** step del catalogo; uno step sconosciuto e' sottolineato; una variante nota suggerisce la riga da usare (non "non conforme") |
| P6 | `/features`, `/components`, `/tags` | elencano per applicazione e flusso; "Componenti ancorati" si aggiorna dopo aver generato (oggi no: F19) |
| P7 | `npm run validate:steps` su un `.feature` con: step identico, step simile, step nuovo | ok / suggerisce la riga esistente / blocca |
| P8 | `npm run catalog` | rigenera `STEP_CATALOG.md` e `step-catalog.json`; **nessuna** modifica a mano di `STEP_CATALOG.md` e' richiesta o accettata |
| P9 | `/settings` | integrazioni e identita' di commit; nessun token riappare in chiaro |

## 8. Sicurezza e robustezza (cio' che un tester non farebbe)

| ID | Caso | Atteso |
|---|---|---|
| S1 | `POST /api/esegui` con un nome di comando **non** in elenco | rifiutato (elenco chiuso) |
| S2 | parametri con caratteri di shell (`;`, `&&`, `$(...)`, backtick) come nome ambiente | trattati come dato, mai eseguiti |
| S3 | percorsi con `..` o assoluti su `scenari/salva`, `features`, `download` | rifiutati, nessuna scrittura fuori dalla radice |
| S4 | nome ambiente/scenario con spazi, accenti, `/`, nome molto lungo | gestito o rifiutato con messaggio, mai file in posizioni impreviste |
| S5 | risposte delle rotte e file sotto `reports/cruscotto/` | nessun valore di credenziale (cerca in chiaro la password di prova) |
| S6 | `.env` e `bdd-targets.json` scritti dalla finestra | restano gitignorati (`git status` non li mostra) |
| S7 | JSON malformato o mancante (`bdd-targets.json` corrotto) | messaggio comprensibile, non crash bianco |
| S8 | refresh a meta' operazione, doppio clic sui pulsanti | nessuna doppia esecuzione |

## 9. UI e UX

Per ogni schermata (`/controllo`, `/registra`, `/esecuzione`, `/catalogo`,
`/portale`, `/editor`, `/features`, `/components`, `/tags`, `/settings`):

| ID | Verifica | Criterio |
|---|---|---|
| U1 | larghezze | 1280x720, 1024, 900, 820, 390: nessuno scroll orizzontale; sotto 900 la barra laterale diventa barra in alto; una colonna sotto 900, due sopra |
| U2 | tema | chiaro e scuro: testo leggibile, nessun elemento invisibile |
| U3 | lingua | cambia in inglese/italiano: **ogni** stringa visibile cambia, incluso portale (gia' noto: F9), avvisi del generatore, barra del recorder |
| U4 | contrasto | testi almeno 4,5:1 (misurato, non a occhio) |
| U5 | aree cliccabili | almeno 40 px |
| U6 | focus | contorno di focus sempre visibile; percorso con la sola tastiera completo, ordine logico, nessuna trappola |
| U7 | colore come unico segnale | mai: sempre icona + parola |
| U8 | schermo intero e zoom 200% | il layout regge |
| U9 | lettore di schermo | ruoli e nomi accessibili dei controlli; stati annunciati (`role=status`, `role=alert`) |
| U10 | console e rete | nessun errore in console, nessuna risposta 4xx/5xx non attesa |
| U11 | stati vuoti, di caricamento, di errore | esistono e dicono cosa fare |
| U12 | coerenza | stesse parole per la stessa cosa ("Ambiente"); il portale ha lo stesso aspetto del cruscotto (oggi no: F19) |
| U13 | messaggi | nessun gergo da sviluppatore ("Playwright", "locator", "13 eventi ricevuti") visibile a un tester (gia' noto: F12) |

## 10. Requisiti della catena (R1, R4, R6, R7, R9) da riga di comando

Non servono fonti reali: usa le fixture (`test-fixtures/generate/`).

| ID | Verifica | Atteso |
|---|---|---|
| R1 | `npm run analyze:corpus` su un export finto di poche pagine | reuse ratio per area, quota coperta da N step canonici, **nessuna frase reale** nell'output |
| R4 | `brief.md` di una generazione | per ogni passo i candidati in **due classi** (stessi componenti / formulazione simile), mai sommate; uno step con componenti disgiunti non e' proposto |
| R6 | `npm run benchmark` su una generazione | sette misure (compila, passi senza glue, step nuovi, riuso, conformita', selettori negli step, locator fuori dizionario) |
| R7 | `npm run referto` | solo numeri ed etichette del sorgente, mai stringhe lette dai dati; `reports/` non versionato |
| R9 | scout di una pagina | indice di accessibilita', componenti senza nome/ambigui/instabili col **motivo giusto**; un nome che e' un URL o un numero di telefono non e' instabile per un motivo sbagliato |
| Q  | `npm run diagnosi` con `--json` e senza | due uscite coerenti, chiavi e non frasi nel JSON, nessun valore di credenziale |

## 11. Cosa e' gia' noto (non riportare come nuovo)

**Corretti:** F0, F1, F2, F3, F4, F5, F6, F7, F10, F11 (verificali: se non
reggono, e' una **regressione**, e va in cima).

**Ancora aperti (attesi):** F8 (comandi `npm` in schermata), F9 (due lingue),
F12-F20 (rifiniture), task 14 (riga dentro una lista), task 16 (barra recorder
in due lingue), catalogo non aggiornato dopo la generazione, Esegui non sceglie
un'intera applicazione, T3 (piu' domini), T4 (segmenti numerici), lockfile di
`web-ui`.

**Fuori perimetro, non e' un difetto:** Kiro da riga di comando non
presidiato, pubblicazione su Confluence (Q9), pacchetto `.vsix`, materiale di
presentazione.

## 12. Cosa consegnare

1. **Tabella degli esiti**, una riga per ID (B, V, C, G, E, P, S, U, R, Q):
   `ID | esito (ok / difetto nuovo / gia' noto / regressione / non verificabile) |
   gravita' (P1 rotto o mente al tester, P2 funziona ma non si capisce, P3
   rifinitura) | cosa hai fatto | cosa hai visto | prova`.
2. **Elenco dei difetti nuovi**, in ordine di gravita', ognuno con: passi per
   riprodurlo, atteso, ottenuto, prova, e il file/riga sospetto **se lo hai
   letto** (altrimenti "non indagato").
3. **Regressioni** (un fix noto che non regge) separate e in cima.
4. **Matrice requisito → esito**: V1-V5, R1-R9, spec del cruscotto, F1-F20.
   Per ognuno: verificato / parziale / non verificabile, e perche'.
5. **Cosa non hai potuto provare** e cosa serve per provarlo (es. app con
   accesso aziendale, MFA, macchina Windows).
6. Una riga finale: la catena registra → genera → esegui e' **verde, si', o no**,
   e dove si ferma.

**Onesta':** se un caso non e' eseguibile, scrivilo. Un esito "ok" senza
prova vale piu' o meno quanto un "non verificato", e verra' trattato cosi'.
