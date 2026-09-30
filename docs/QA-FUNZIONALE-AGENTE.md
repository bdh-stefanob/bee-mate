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

- **Se ti danno un indirizzo gia' attivo** (di solito http://localhost:3000),
  controlla che risponda (`GET /api/controllo` deve dare 200) e **usalo**: non
  avviare un secondo server, finirebbe su un'altra porta e i due si confonderebbero.
  In quel caso la finestra scrive nella cartella del server, non in una copia:
  a fine collaudo elenca **tutto cio' che hai creato** (ambienti, scenari salvati
  sotto `src/`, registrazioni) e rimuovi solo quello, lasciando `git status`
  com'era. Lo scenario `shop/order/...` e i file `src/*/shop/` esistevano gia': non
  toccarli.

Verifiche di base da riportare: versione di Node, sistema operativo, browser
usato, porta, `git rev-parse --short HEAD`.

## 2. Baseline automatica (prima di guardare lo schermo)

Lancia e riporta l'esito di ognuno, con le ultime righe:

| # | Comando | Atteso |
|---|---|---|
| B1 | `npx tsc --noEmit` (radice) | nessun errore |
| B2 | `npm run check:all` (radice) | "Tutti i controlli passano" (nessun `FAIL`) |
| B3 | `npm run rules:check` (radice) | "Regole allineate" |
| B4 | `npm run test:dry` (radice) | scenari e step validi, nessuno "undefined" **e nessuno "ambiguous"**: l'uscita e' 0 anche con step ambigui, quindi leggi il riepilogo, non il codice di uscita |
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

### 6b. Correzioni del 30/9: verificale come regressioni

Tutte provate su un solo scenario; se una non regge, e' una **regressione**.

| ID | Caso | Atteso |
|---|---|---|
| X1 | in Esegui scegli **un solo scenario** e lancia | parte **solo** quello. Prima partivano tutti gli scenari con glue (anche di un'altra applicazione, rossi contro l'ambiente scelto). Conta i file nel flusso dei messaggi |
| X2 | registra un passo che **attraversa 3 pagine** (carrello, dati, riepilogo), genera | `npx tsc --noEmit` passa; nello step ogni Page Object e' creata prima di essere usata (prima: TS2454, e un solo file cosi' rompeva la compilazione di **tutti** gli scenari) |
| X3 | verifica su un elemento che ha un **nome accessibile diverso dal testo visibile** (il carrello: si legge "1", si chiama "Cart, 1 items") | la verifica lo trova. Prima cercava solo il testo e cadeva dopo 10 s |
| X4 | premi **Verifica a meta' di un passo lungo** e poi continua | nello step la verifica sta **fra** i gesti, nel punto in cui l'hai fatta; nel `.feature` compare come commento sotto il passo, non come `Then` in fondo |
| X5 | pagina dei prodotti con il solito pulsante ripetuto ("Add to cart" x6) | `assertLoaded()` si ancora sul primo elemento toccato, **non** su una verifica che compare dopo il clic |
| X7 | genera e lancia uno scenario che contiene il login, **senza** `APP_PASSWORD` in `.env` | il test prende la password dal blocco `login` dell'ambiente (`this.passwordAmbiente()`); niente nome fisso da aggiungere a mano. Se l'ambiente non dichiara una password, l'errore **nomina l'ambiente** e dice di registrare l'accesso dal Controllo |
| X6 | ultimo passo lasciato aperto | la frase in feature e' inglese ("the tester did not close this step"), non italiana |

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

### 9b. Giudizio di stile e di UX (oltre alle verifiche sopra)

Le tabelle sopra rispondono "rispetta il requisito?". Qui si risponde "e' fatto
bene?". Per **ogni schermata** dai un voto da 1 a 5 a ciascun punto, **con una
prova** (screenshot con nome file o testo citato). Un voto senza prova non conta.

| Punto | Cosa guardare |
|---|---|
| Gerarchia visiva | cosa si nota per primo, e' la cosa giusta? c'e' un'azione principale chiara? |
| Coerenza | stessi componenti, colori, parole e posizioni fra tutte le schermate, portale incluso |
| Spaziatura e allineamento | ritmo verticale, margini, testi che si sovrappongono o si troncano |
| Tipografia | dimensioni, pesi, leggibilita' su 1280 e su 390 px |
| Densita' | troppo vuoto o troppo pieno? righe lunghe? |
| Feedback | ogni azione risponde subito (caricamento, esito, errore)? lo stato e' sempre visibile? |
| Prevenzione degli errori | conferme prima di azioni distruttive, valori di default sensati, campi guidati |
| Linguaggio | frasi che un tester capisce senza aiuto; niente gergo; stessa parola per la stessa cosa |
| Recuperabilita' | dopo un errore si sa cosa fare; si puo' annullare o ripetere |
| Prime impressioni | **il test dei 60 secondi**: aprendo l'app per la prima volta, sai cosa fare e in che ordine? Prova a completare registra → genera → esegui **senza leggere la guida** e riporta dove ti sei fermato |

Poi, in tre righe ciascuno: **le tre cose fatte meglio** e **le tre da migliorare
per prime**, di tutta l'app.

### 9c. Colori, contrasti, dimensioni: si misurano, non si stimano a occhio

Per ogni schermata, in **tema chiaro e scuro**, a 1280 px e a 390 px. Le soglie
sono WCAG 2.2 livello AA piu' quelle piu' severe della spec del cruscotto.

| Misura | Soglia | Come |
|---|---|---|
| Contrasto del testo normale | **almeno 4,5:1** | per ogni elemento di testo visibile, leggi `getComputedStyle` (colore e sfondo **effettivo**, risalendo gli antenati fino a un colore non trasparente) e calcola il rapporto con la formula WCAG (luminanza relativa). Riporta **ogni coppia sotto soglia**, con selettore, colori, rapporto |
| Testo grande (da 24 px, o 18,66 px in grassetto) | almeno 3:1 | stesso metodo |
| Elementi di interfaccia: bordi dei campi, icone, contorno di focus, stati | almeno 3:1 contro lo sfondo vicino | stesso metodo, per ogni controllo |
| Il colore non e' mai l'unico segnale | sempre icona **e** parola | metti la pagina in scala di grigi (`filter: grayscale(1)`) e verifica che esiti, errori e stato attivo si capiscano ancora |
| Stati (hover, focus, disabilitato, attivo) | distinguibili e con il contrasto di sopra | portali tutti e cinque su ogni tipo di controllo; il disabilitato deve restare **leggibile** |
| Dimensione del testo | corpo almeno 16 px; niente sotto 12 px | elenca ogni testo sotto soglia con selettore e misura |
| Interlinea e larghezza delle righe | interlinea almeno 1,5 nel corpo; righe non oltre ~80 caratteri | misura su un paragrafo lungo |
| Aree cliccabili | **almeno 40x40 px** (WCAG 2.2 ne chiede 24; la spec ne chiede 40) | misura con `getBoundingClientRect` per ogni controllo interattivo, anche su 390 px |
| Ingrandimento | a 200% e a 400% nessuna perdita di contenuto ne' scroll orizzontale (a 320 px di larghezza) | zoom del browser |
| Spaziatura del testo | leggibile con interlinea 1,5, spazio fra paragrafi 2x, fra lettere 0,12 em | inietta gli stili e guarda se si tronca o si sovrappone |
| Movimento | nessuna animazione essenziale; rispetta `prefers-reduced-motion` | attivalo e guarda |
| Scala e ritmo | poche dimensioni di carattere e di spaziatura, coerenti | elenca le dimensioni distinte trovate: molte varianti quasi uguali sono un difetto di sistema |
| Coerenza dei token | i colori usati sono quelli della palette dichiarata (`#1A56DB` blu, `#067647` verde, `#B42318` rosso, `#101828` / `#475467` testi) | elenca i colori **non** in palette |

Riporta i numeri in una tabella (schermata, tema, selettore, misura, soglia, esito).
Un contrasto "sembra buono" non vale: serve il rapporto calcolato.

### 9d. Riferimenti nel secondo cervello (sola lettura)

Se puoi accedere al vault Obsidian di Stefano, usalo **solo in lettura** per
ancorare i giudizi di stile a buone pratiche, e **cita la nota** accanto al
giudizio. Radice: `C:/Users/sbert/Desktop/StefanoBertaccini/Obsian_Stefano`.

- **Non leggere mai** cartelle `_riservato/` ne' note con `riservato: true`; non
  modificare, non cancellare, non creare file nel vault.
- Usabilita' e principi:
  `40_Università/Corsi/2_anno/2_Sem/Human Computer Interaction/Interface Design principles/`
  → `Shneiderman's Golden Rules & Nielsen's Heuristics/` (le dieci euristiche di
  Nielsen, una nota ciascuna, e le otto regole di Shneiderman), la cartella
  `Foundational Design Principles - Norman's Framework/` (affordance, feedback,
  vincoli, modello mentale) e `Interaction Design Patterns & MobileResponsive
  Consideration/` (design responsive e mobile).
- Accessibilita' e colore:
  `40_Università/Corsi/2_anno/2_Sem/Human Computer Interaction/Accessibility Foundations/`
  → `Designing for Disabilities/` (criteri WCAG, principi POUR, livelli di
  conformita', tastiera e motoria, accessibilita' visiva). **Nota:** la nota
  "Color & Contrast" del vault e' vuota (il testo non era disponibile): per i
  numeri del contrasto valgono le soglie di §9c.
- Un esempio di audit gia' fatto, per formato e livello di dettaglio:
  `20_Lavoro/Like-Digital/Bhave/_docs/behatrix-ui/docs/audit-contrast.md` (tabella
  coppia di colori, rapporto, soglia, esito, per tema) e
  `.../behatrix-ui/docs/UI-IMPROVEMENTS-v0.2.md`. Non sono di questo progetto:
  servono come modello del report, non come requisiti.

Per ogni difetto di UX riportato indica **quale euristica viola** (es. "visibilita'
dello stato del sistema", "prevenzione degli errori", "coerenza e standard") e, se
hai letto la nota, quale.

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

**Corretti:** F0, F1, F2, F3, F4, F5, F6, F7, F10, F11 e i casi X1-X6 di §6b
(verificali: se non reggono, e' una **regressione**, e va in cima).

**Ancora aperti (attesi):** F8 (comandi `npm` in schermata), F9 (due lingue),
F12-F20 (rifiniture), task 14 (riga dentro una lista), task 16 (barra recorder
in due lingue), catalogo non aggiornato dopo la generazione, Esegui non sceglie
un'intera applicazione, T3 (piu' domini), T4 (segmenti numerici), lockfile di
`web-ui`.

**Emersi dal collaudo del 30/9 e ancora aperti:**
- un ambiente il cui login usa una `${VARIABILE}` non definita in `.env`: il
  **Controllo dice comunque "Tutto a posto"**, mentre il login fallira' (mente al
  tester, P1). Il messaggio di errore del test, invece, ora nomina l'ambiente;
- una Verifica presa su un contenitore grande (`main`) produce un testo incollato
  e troncato che non si trova mai;
- la verifica a meta' di un passo torna **in fondo** se l'ultimo passo non e'
  chiuso, o se la registrazione e' stata fatta prima di questa correzione;
- il primo clic su "Registra una sessione" a volte non parte (non riprodotto);
- Catalogo: la data in italiano e' nel formato americano ("9/25/2026,
  12:19:15 PM"); i due interruttori di Esegui non hanno un nome accessibile; il
  campo "Applicazione" ha come nome il segnaposto "es. shop".

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
6. **Cosa funziona bene**, non solo cosa non va: un elenco di almeno cinque
   punti, ognuno con la prova. Serve a chi decide cosa non toccare.
7. **Scheda per schermata** (§9b): una tabella schermata x punto con i voti da 1
   a 5, e sotto le **tre cose migliori** e le **tre da migliorare per prime**.
8. **Le tue prove visive**: elenco degli screenshot con nome file, per schermata,
   larghezza e tema.
9. Una riga finale: la catena registra → genera → esegui e' **verde, si', o no**,
   e dove si ferma.

**Onesta':** se un caso non e' eseguibile, scrivilo. Un esito "ok" senza
prova vale piu' o meno quanto un "non verificato", e verra' trattato cosi'.
