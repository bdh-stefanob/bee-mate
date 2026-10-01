# Prompt: performance, rendering e casi limite del cruscotto

> **Come si usa.** Si passa l'intero file a un agente che sa pilotare un browser
> (Playwright MCP, o Playwright da script) e lanciare comandi. L'agente **misura e
> riporta**: non corregge nulla. Il risultato e' una tabella di numeri con le prove
> e una lista di difetti ordinata per impatto.
>
> E' il gemello di `docs/QA-FUNZIONALE-AGENTE.md`: quello risponde "funziona?",
> questo risponde "e' veloce, si ridisegna il giusto, regge i casi estremi?".

---

## 0. Ruolo e regole

Sei un **ingegnere delle performance front-end**. Misuri l'applicazione desktop
"BDD Catalog" (Next.js + React dentro Electron): il cruscotto in
`web-ui/src/app/(cruscotto)/` — Controllo, Registra, Esecuzione, Catalogo — e,
finche' esiste, il vecchio portale in `web-ui/src/app/(portale)/`.

**Non negoziabile:**

1. **Non correggere nulla.** Nessuna modifica a codice, messaggi, test,
   configurazione. Un difetto si riporta, con il file e la riga **se li hai letti**.
2. **Lavora su una copia.** `git worktree add` in una cartella temporanea, dal
   ramo **`esempi`** se esiste (ha due scenari salvati; il ramo `per-bdh` non ne
   ha nessuno), altrimenti dal ramo corrente. L'app scrive `.env`,
   `bdd-targets.json` e `reports/` nella sua radice: mai sull'installazione di
   una persona. I dati finti di §5 si creano **solo** nella copia. Alla fine
   cancelli la copia.
3. **Nessun dato reale.** Niente indirizzi, credenziali o pagine aziendali.
   Ambiente di prova: la voce `demo` di `bdd-targets.example.json` (sito
   pubblico di pratica).
4. **Non lanciare** `confluence:*`, `jira:*`, `git push`, `git commit`.
5. **Un numero senza metodo non vale.** Per ogni misura: come l'hai presa, quante
   volte (almeno **5**, riporta mediana e peggiore), su quale build, su quale
   macchina. Scarta il primo giro e dillo.
6. **Distingui** *difetto nuovo*, *gia' noto* (§9) e *non misurabile*. Dove una
   cosa non si puo' misurare, scrivilo: non stimare a occhio.

## 1. Due build, e conta quella di produzione

Lo sviluppo (`npm run dev`) compila le rotte alla prima richiesta e monta ogni
componente due volte (StrictMode): **i suoi tempi non sono quelli del prodotto**.

| Build | Come | A cosa serve |
|---|---|---|
| **Produzione** | in `web-ui`: `npm run build`, poi `npm run start` (porta 3000; se occupata usa un'altra e dillo) | **tutte le misure di tempo** e i Web Vitals |
| Sviluppo | in `web-ui`: `npm run dev` | solo per: avvisi di React in console, errori di idratazione, conteggio dei ridisegni col Profiler |

Riporta: sistema operativo, CPU, RAM, versione di Node, browser e versione,
`git rev-parse --short HEAD`, dimensione della finestra. Ripeti le misure di tempo
principali anche con **CPU rallentata 4x** (emulazione del browser): i portatili
aziendali non sono la tua macchina.

## 2. Tempi di caricamento (build di produzione)

Per ogni pagina: `/controllo`, `/registra`, `/esecuzione`, `/catalogo`, e
`/portale`, `/editor`, `/features`, `/components`, `/tags`, `/settings`.

| Misura | Soglia | Come |
|---|---|---|
| TTFB del documento | < 200 ms | Navigation Timing |
| First Contentful Paint | < 1,0 s | PerformanceObserver `paint` |
| Largest Contentful Paint | < 2,5 s (buono), obiettivo < 1,5 s per un'app locale | PerformanceObserver `largest-contentful-paint` |
| Cumulative Layout Shift | < 0,1 | PerformanceObserver `layout-shift`; **elenca quale elemento si sposta** |
| Total Blocking Time / long task | nessun task > 200 ms | PerformanceObserver `longtask` |
| Tempo al **contenuto utile** | vedi sotto | il momento in cui il tester puo' agire, non il primo pixel |
| Peso del JavaScript per rotta | riporta | tabella di `next build` ("First Load JS") + cosa pesa di piu' |

**Contenuto utile, per pagina** (misuralo con un `waitFor` sull'elemento):

- Controllo: (a) sezione Ambienti visibile; (b) riga di stato della macchina
  visibile. Riferimento misurato l'1/10 **in sviluppo**: (a) ~0,55 s, (b) ~2,4 s.
- Registra: pulsante "Registra una sessione" cliccabile.
- Esecuzione: tendina degli scenari popolata.
- Catalogo: prima riga di step visibile; poi le coppie da sistemare.

Aggiungi il **tempo di navigazione fra pagine** dalla barra laterale (clic →
contenuto utile), in tutte le direzioni: e' quello che il tester sente di piu'.

## 3. Le rotte API

Con `curl -w` o dal browser, 10 chiamate ciascuna, mediana e peggiore:
`/api/controllo`, `/api/configurazione`, `/api/scenari`, `/api/catalogo`,
`/api/catalogo/stato`, `/api/catalogo/riconciliazione`, `/api/esegui` (GET),
`/api/traccia/ultima`, `/api/passi`, `/api/features`, `/api/catalog`.

| Verifica | Atteso |
|---|---|
| Tempo di ogni rotta di sola lettura | < 300 ms, tranne `/api/controllo` (lancia uno script: riferimento ~1,1 s) |
| **Nessuna rotta blocca le altre** | lancia `/api/controllo` e, 100 ms dopo, `/api/configurazione`: la seconda non deve aspettare la prima. Ripeti con ogni rotta lenta che trovi. Cerca `execFileSync` / `spawnSync` / `readFileSync` di file grossi nelle rotte e segnala ogni chiamata sincrona su un percorso caldo |
| Richieste duplicate all'apertura | per ogni pagina elenca tutte le richieste con inizio e fine: la stessa rotta chiamata due volte e' un difetto (riferimento: all'1/10 `/api/configurazione` partiva 2 volte sul Controllo) |
| Richieste in serie che potrebbero stare in parallelo | disegna la cascata e segnala le attese inutili |
| Polling e flussi | per ogni `setInterval`, `EventSource` e polling: intervallo, quando parte, **quando si ferma**. Un flusso che resta aperto dopo aver lasciato la pagina e' un difetto |

## 4. Rendering (React)

In sviluppo, con il Profiler di React (o contando i `commit` con
`PerformanceObserver`/un contatore iniettato):

| Verifica | Atteso |
|---|---|
| Ridisegni all'apertura | per ogni pagina, quanti commit prima di essere ferma, e quali componenti si ridisegnano piu' di 2 volte |
| Ridisegni a riposo | pagina ferma per 30 s: **zero** commit. Se qualcosa batte (un intervallo, un contesto che cambia), dillo |
| Ridisegni per un'azione | digitare un carattere in un campo, cambiare ambiente dalla barra laterale, cambiare lingua, aprire/chiudere un riquadro: quanti componenti si ridisegnano. Un tasto che ridisegna tutta la pagina e' un difetto |
| Durante un'esecuzione | con i passi che arrivano dal flusso: ogni riga nuova ridisegna solo se stessa o tutta la lista? Misura con 5, 50 e 300 passi |
| Liste lunghe | Catalogo con 500 step, elenco scenari con 300 voci: tempo di resa, scorrimento fluido (fotogrammi persi), c'e' una finestra virtuale o si rende tutto? |
| Idratazione | nessun avviso "hydration" / "did not match" in console; nessun lampo di contenuto non tradotto o di tema sbagliato al primo paint |
| Stabilita' del layout | niente salti quando arriva un dato: scheletro e contenuto hanno la stessa altezza? |
| Store condiviso | `web-ui/src/lib/risorsa.ts` + `hooks/useRisorsa.ts`: due componenti che leggono la stessa risorsa fanno **una** richiesta? una ricarica ridisegna solo chi la usa? |
| Memoria | naviga 50 volte fra le quattro pagine, poi forza il GC: l'heap torna vicino all'inizio? Conta i nodi DOM e i listener staccati |

## 5. Casi limite (dati finti, solo nella copia)

Crea i dati con uno script tuo, nella copia, e descrivilo nel rapporto.

| Caso | Come | Cosa guardare |
|---|---|---|
| **Vuoto** | nessun ambiente, nessuno scenario, catalogo con 1 voce, `reports/` assente | ogni pagina dice cosa fare; nessun errore in console; nessun riquadro vuoto senza spiegazione |
| **Tanti scenari** | 300 `.feature` in 10 app × 6 flussi | apertura di Esecuzione e Catalogo, tendina utilizzabile, ricerca |
| **Catalogo grande** | 500 e 2000 voci in `step-catalog.json` | resa, ricerca, calcolo delle coppie (`/api/catalogo/riconciliazione`: e' quadratico? misura 100/500/2000) |
| **Scenario lungo** | 1 scenario con 300 passi, e un passo con testo di 2000 caratteri | lettura, esecuzione, il totale resta visibile? |
| **Tanti ambienti** | 50 ambienti in `bdd-targets.json` | Controllo e selettore laterale |
| **Storico pieno** | 2000 file in `reports/cruscotto/` e 200 registrazioni | tempi delle rotte che leggono la cartella; qualcosa li rilegge tutti a ogni richiesta? |
| **Testi estremi** | nomi con spazi, accenti, emoji, RTL, 300 caratteri, `<script>`, virgolette | niente layout rotto, niente HTML interpretato, troncamento con il testo completo raggiungibile |
| **File rotti** | `bdd-targets.json` e `step-catalog.json` non validi, `.env` illeggibile, un `.feature` vuoto, un `.ndjson` troncato a meta' riga | messaggio comprensibile, mai pagina bianca; le altre pagine restano usabili |
| **Rete lenta e assente** | intercetta le rotte: ritardo 3 s, risposta 500, connessione chiusa, risposta mai arrivata | scheletro, errore con "Riprova", nessun caricamento infinito senza uscita |
| **Gesti ripetuti** | doppio clic su ogni pulsante che avvia qualcosa, Invio tenuto premuto, due schede aperte sulla stessa pagina | nessuna doppia esecuzione; il secondo tentativo riceve un no chiaro |
| **A meta'** | ricarica durante una registrazione/esecuzione; chiudi e riapri; riavvia il server con un'operazione in corso | la pagina ritrova l'operazione o dice che e' stata interrotta; nessuno stato "in corso" eterno |
| **Finestra** | 390, 820, 1024, 1280, 1920 px; zoom 200% e 400%; tema scuro; lingua cambiata a meta' | niente scroll orizzontale, niente testo tagliato, niente lampo di tema |
| **Lunga permanenza** | Controllo e Esecuzione aperti 15 minuti | richieste in background, memoria, CPU a riposo (deve essere ~0%) |

## 6. Costo delle operazioni lunghe

Senza browser guidato da una persona, sul sito di pratica:

| Operazione | Misura |
|---|---|
| Avvio di una registrazione: clic → browser aperto con la barra | tempo, e cosa vede il tester nel frattempo |
| Generazione dopo una registrazione | tempo totale; quanto e' avvio di ts-node e quanto lavoro vero |
| Salvataggio di uno scenario | tempo, e il catalogo che si rigenera dopo |
| Esecuzione di uno scenario | tempo fino al primo passo a schermo; ritardo fra passo eseguito e passo mostrato |
| Rigenerazione del catalogo (`npm run catalog`) | tempo con 10, 100, 300 scenari |
| Ogni script lanciato dalla finestra | quanto del suo tempo e' avvio (ts-node con controllo dei tipi) e quanto lavoro: l'elenco dei comandi sta in `web-ui/src/lib/esecuzione.ts` |

## 7. Electron (se riesci a lanciarlo)

In `web-ui`: `npm run electron:dev`. Tempo da avvio a finestra utile; memoria del
processo a riposo e dopo 10 minuti d'uso; cosa succede chiudendo la finestra con
un'operazione in corso. Se non riesci a lanciarlo, scrivi perche' e passa oltre.

## 8. Cosa consegnare

1. **Scheda dei numeri**: una tabella pagina × misura (mediana / peggiore), con
   la soglia e l'esito, per build di produzione; una seconda con CPU 4x.
2. **Cascata delle richieste** per ogni pagina (inizio, fine, durata), con le
   duplicate e le attese inutili evidenziate.
3. **I dieci interventi che rendono di piu'**, ordinati per (tempo guadagnato dal
   tester) / (costo stimato): per ognuno la misura di partenza, il guadagno
   atteso e **come lo verificheresti dopo**.
4. **Difetti**, per gravita': P1 blocca o perde lavoro · P2 lento o confuso ·
   P3 rifinitura. Per ognuno: passi per riprodurlo, atteso, ottenuto, prova,
   file e riga **se letti**.
5. **Curve di crescita**: tempo in funzione di N per scenari, voci di catalogo,
   passi, file in `reports/`. Dove la curva e' piu' che lineare, dillo.
6. **Cosa non hai potuto misurare** e cosa serve per farlo.
7. **Cosa e' gia' veloce**: almeno cinque punti, con il numero. Serve a non
   toccare cio' che funziona.

Ogni affermazione porta il suo numero e il suo metodo. "Sembra lento" non e' un
risultato.

## 9. Cosa e' gia' noto (non riportare come nuovo)

- **Corretto l'1/10** (se non regge e' una **regressione**, in cima): la diagnosi
  del Controllo non blocca piu' il server (`execFile` asincrono); gira con ts-node
  in sola traduzione; Ambienti e credenziali non aspettano la diagnosi; il
  selettore laterale non richiede due volte l'elenco; ambienti e diagnosi stanno
  in uno store condiviso.
- **Costi fissi noti della diagnosi**: ~0,33 s di avvio di ts-node e ~0,37 s per
  caricare Playwright (serve a sapere se il browser c'e').
- **Aperti**: `reports/cruscotto/` cresce senza limite (F20); "Componenti
  ancorati" non si aggiorna dopo una generazione (F19); il calcolo delle coppie
  del Catalogo e' sospettato quadratico e non e' mai stato misurato; la data del
  Catalogo ignora la lingua; il vecchio portale e' in dismissione (misuralo, ma i
  suoi difetti vanno in una sezione a parte).
