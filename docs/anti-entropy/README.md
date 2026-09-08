# Anti-entropia BDD multi-team — documento di avanzamento

> **Documento vivo.** Traccia stato, decisioni prese, domande aperte e prossimi passi
> dell'iniziativa "ridurre l'entropia dei casi di test BDD scritti da tester di aree
> diverse senza un sistema unico".
>
> **Nota sul repo:** questo repository e' pubblico/personale. Tutti i documenti qui
> dentro sono **genericizzati**: nessun nome di azienda, prodotto, ambiente, URL,
> progetto Jira o persona reale. L'output dei tool (`reports/`) e' gitignorato e non
> va mai spostato altrove.

## Indice

| Doc | Contenuto | Stato |
|---|---|---|
| [01-analisi-criticita.md](01-analisi-criticita.md) | Analisi da senior tester: criticita', rischi, cosa manca | ✅ completo |
| [02-design.md](02-design.md) | Architettura del sistema, i 4 blocchi, i confini | 🟡 Sez. 1-2 costruite, 3-7 da scrivere |
| [../../.amazonq/rules/](../../.amazonq/rules/) | Le regole che l'assistente AI carica da solo: come si scrive uno scenario, i layer, il catalogo | ✅ completo |
| [05-referenze.md](05-referenze.md) | Bibliografia verificata: 20 fonti aperte, 5 dichiarate incerte | ✅ completo |
| [../../scripts/CONFLUENCE-API-NOTES.md](../../scripts/CONFLUENCE-API-NOTES.md) | Ricerca sulle API Confluence + 7 assunzioni da confermare al primo run | ✅ completo |
| [06-rituale.md](06-rituale.md) | **Il processo**: consolidamento mensile del linguaggio, 15 minuti, con i comandi per eseguirlo | ✅ completo |
| `03-piano-demo.md` | Sceneggiatura della demo, atti, fallback | ⬜ da scrivere |
| `04-presentazione.md` | Impianto teorico + riferimenti + slide | ⬜ da scrivere |

## Il problema in una riga

Tester di aree diverse scrivono casi di test in un formato simil-Gherkin dentro Confluence,
senza vocabolario condiviso ne' punto di verita' unico: lo stesso comportamento viene
descritto in N modi diversi, e il costo di riuso supera il costo di riscrivere.

## Vincoli non negoziabili (i "paletti")

1. **Zero costi** — nessuna licenza, nessun server, nessun acquisto.
2. **Facile da usare** se e' uno strumento.
3. **Intuitivo e alla portata dei tester manuali**, ready to run.
4. **Provabile da subito** in termini di riduzione di entropia (quindi: misurabile).

## Fatti accertati

| # | Fatto | Impatto |
|---|---|---|
| F1 | I casi di test BDD sono **solo scritti, non automatizzati** | Il catalogo step non puo' essere generato dal codice: diventa **contract-first** |
| F2 | Vivono **su Confluence** (NON Jira), in formato **simil-Gherkin, senza datatable** | Superficie di scrittura = Confluence → il sistema dev'essere **read-first**, non gate-first |
| F2b | **Confermato sul campo**: il Gherkin sta **dentro celle di tabella**, colonne tipo `Feature / Test Case Scenario / Test Cases`, passi Given/When/And/Then. Su due rami campionati: 58% e 50% di pagine con passi riconosciuti | L'estrattore li legge correttamente (verificato su pagine da 26k e 12k caratteri). La struttura a tabella e' la forma reale, non un'eccezione |
| F3 | Nessuna datatable in uso | Scenari non parametrizzati → duplicazione per variante di dato |
| F3b | **Nessun plugin** di test management (niente Xray/Zephyr) | Nessun campo strutturato, nessun issuetype: testo libero in pagine wiki → entropia più alta del previsto |
| F3c | Confluence ha un **albero vero** (space → pagina → figlie) | La "master folder" è indirizzabile con `ancestor = <pageId>`; il percorso diventa una **dimensione di misura** (entropia per area/team) |
| F4 | Esiste un token API Atlassian personale, **mai testato** | Prerequisito della Fase 1; su Cloud lo stesso token vale per Jira e Confluence |
| F5 | Esiste un POC separato Playwright+Cucumber con script `scout` e `generate-pom` | Riusabile come **moltiplicatore**, non come sorgente degli step |
| F6 | Buona parte del "centro di verita'" esiste gia' in questo scaffold | Schema catalog v2, generatore Markdown, web-ui, estensione VS Code |
| F7 | **Esiste gia' una convenzione parziale**: molti domini hanno pagine `<dominio>`, `<dominio> - Business`, `<dominio> - Flow Design`, `<dominio> - Testing Coverage`, ma applicata in modo disuguale | Cambia la tesi della proposta: non si porta ordine nel caos, si **completa e si rende verificabile una struttura che il team ha gia' iniziato**. Molto piu' facile da far accettare |
| F8 | Nel primo run reale la ricerca v1 ha visto 797 pagine, l'albero v2 826 | La CQL non attraversa le Folder: **misurato, non ipotizzato**. Senza il confronto fra le due strade l'export sarebbe stato incompleto senza errori |
| F9 | I casi di test veri stanno in **due rami scollegati**, senza antenato comune tranne la radice dello spazio: uno sotto l'area QA, uno sotto l'area mobile | **Conferma fisica del problema**: aree diverse, alberi diversi, nessun punto di verita' condiviso. E' la slide piu' diretta della presentazione |
| F10 | Il ramo di documentazione per dominio (`- Testing Coverage` ecc.) **non contiene casi di test**: 0 pagine su 21 con Given+When+Then | La documentazione di dominio e i casi di test vivono separati. Il corpus da misurare e' il secondo, non il primo — e la distinzione non era ovvia dai nomi delle cartelle |
| F11 | **La baseline e' stata misurata.** Ramo QA: 569 occorrenze di passo, 409 varianti distinte, **reuse ratio 0,719**. Ramo mobile: 279 occorrenze, 238 varianti, **0,853** | 1,0 = zero riuso. Su quello mobile **85 passi su 100 sono scritti da zero**: non e' un team che riusa male un vocabolario, e' un team che non ne ha uno |
| F12 | Il clustering assorbe solo il **14%** della varieta' (0,719 → 0,620). Su 353 intenzioni distinte, **246 compaiono una volta sola** | Cambia la diagnosi, in meglio: il problema non e' la parafrasi ma l'assenza di vocabolario. Non stiamo ripulendo duplicati, stiamo creando un linguaggio dove non esiste — tesi piu' difficile da contestare |
| F13 | **107 step canonici coprirebbero il 57%** di quanto scritto oggi nel ramo QA (323 occorrenze su 569); 32 step coprirebbero il 37% del ramo mobile | E' il numero da slide. L'aritmetica e' rifacibile in riunione: 353 cluster, 107 con >=2 occorrenze, 246 singoletti |
| F14 | L'azienda usa **Amazon Q Developer**, non Kiro — ma nello spazio wiki esiste anche una guida di setup di Kiro | Le regole vivono in `.amazonq/rules/`; la versione Kiro si genera da quella. Amazon Q ha una **CLI con `--no-interactive`**: l'assistente e' pilotabile da script, cosa che Kiro non permette |
| F15 | L'app desktop del catalogo **esiste gia'** ed e' impacchettata come eseguibile: catalogo cercabile, editor Gherkin con autocomplete vincolato, step sconosciuti evidenziati, proposta `@wanted`, commit su GitHub | Il paletto 3 e' gia' risolto: un tester manuale scarica un .exe e scrive scenari conformi senza toccare il repo. Non e' da costruire |

## Decisioni prese

| # | Decisione | Motivo |
|---|---|---|
| D1 | La spina dorsale e' **P1 (linguaggio/governance)**, non l'automazione ne' l'AI | E' l'unico dei tre a soddisfare tutti e 4 i paletti senza approvazioni esterne |
| D2 | **Un componente UI ≠ uno step.** Componente → metodo POM (1:1). Intento business → step (1:N) | Generare uno step per elemento produce Gherkin imperativo: peggiora l'entropia invece di ridurla |
| D3 | Il catalogo nasce dai **cluster dei test case esistenti**, non da un design a tavolino | Risolve il bootstrap "catalogo vuoto" e fa riconoscere ai colleghi le proprie frasi |
| D4 | **Fase 1 read-only** su Confluence | Confermato dall'utente. Azzera meta' delle obiezioni di security prima che vengano sollevate |
| D5 | Il sistema e' **AI-agnostic**; il tool AI aziendale e' implementazione di riferimento, non requisito | Un "no" del procurement non deve uccidere l'iniziativa |
| D6 | L'AI non valida mai se stessa: produce, il **validatore deterministico** giudica | La garanzia anti-entropia non puo' essere probabilistica (cfr. `ROADMAP.md` §3) |
| D7 | Approccio scelto: **B — Osservatorio + Oracolo** | A resta dentro come nucleo autoconsistente: se l'AI o l'ambiente saltano in demo, la presentazione regge lo stesso |
| D8 | Il **centro di verita' si pubblica in Confluence** | I tester sono gia' li'. Risolve Q3 (canale per chi non ha il repo) a costo zero e senza nuovi strumenti da imparare |
| D9 | **Specification by Demonstration**: l'esecuzione manuale di un esperto di business **e'** l'atto di specifica. Si registra, e da li' si derivano scenario e automazione | Inverte il BDD classico. Il nome si aggancia deliberatamente a *Specification by Example* di Adzic: ci si presenta come evoluzione di una pratica riconosciuta invece che come inventori di una sigla |
| D10 | Non e' record-and-playback: la traccia esce nel **vocabolario del dizionario dello scout** (`role` + `name`), non come selettori | La meccanica la da' la registrazione, il linguaggio il catalogo, l'assistente fa solo il ponte. Il collegamento traccia→componente→step **non va inferito: coincide** |
| D11 | Il tester dichiara **confini di intento** e **verifiche** durante la registrazione | Sono le due cose che dai gesti non si deducono. Senza la prima si spezza a ogni click (Gherkin imperativo); senza la seconda escono scenari con solo Given e When: cose che sembrano test senza esserlo |
| D12 | Le regole per l'assistente stanno in **`.amazonq/rules/`** (sorgente); `.kiro/steering/` si **genera** da quella | Due copie scritte a mano divergerebbero in silenzio — riprodurre qui dentro il problema di entropia che il progetto esiste per risolvere |
| D13 | Le voci di catalogo dichiarano i **componenti di frontend** che toccano, e sono **visibili nel catalogo** | Non e' solo dato per il matching: e' documentazione (dice su cosa agisce lo step), rende il catalogo **verificabile** (se lo scout non trova piu' quei componenti, lo step e' scaduto) e da' una **metrica di completezza** |
| D14 | Il catalogo non e' un artefatto da curare una volta: e' un **ciclo periodico** che rilegge, riclusterizza, confronta e propone | Un catalogo curato una volta invecchia dal giorno dopo. Cosi' la misura prima/dopo diventa continua, e il controllo diventa trasversale fra aree |
| D15 | Il ciclo **propone**, l'umano approva. L'attribuzione delle varianti nuove e' **per area, mai per persona** | Un report che nomina le persone trasforma uno strumento di supporto in uno di valutazione, e da quel momento non lo vuole piu' nessuno in casa |
| D17 | Le varianti **non si bloccano** in scrittura: si registrano col loro collegamento (dove sono scritte, quale componente toccano) e si fanno convergere a valle, eleggendo la forma **Gold** con una matrice a punteggio in chiaro | Scioglie il collo di bottiglia del gatekeeper, il bootstrap del catalogo vuoto e la resistenza all'adozione. Prezzo: **l'entropia cresce prima di calare**, quindi la misura diventa il meccanismo di controllo, non un accessorio |
| D18 | La convergenza ha un **rituale mensile di 15 minuti, 2-3 persone**, agganciato a una riunione esistente, con la decisione quasi tutta spostata in asincrono nei 3 giorni precedenti (vedi `06-rituale.md`) | Senza un momento in calendario "a tempo debito" diventa mai. Quindici minuti si fanno anche nelle settimane storte; un'ora si salta e muore in tre mesi |
| D19 | Il refactor di massa **non avra' mai una modalita' automatica**: anteprima e diff obbligatori | E' l'operazione piu' pericolosa del sistema: se va storta una volta, brucia la fiducia nell'iniziativa in modo definitivo |
| D16 | Le verifiche registrate hanno un **tipo**: mostra un valore (default) · e' comparso · e' sparito · si e' navigato | In produzione non si verifica "questo e' cliccabile", si verifica che **la UI si sia aggiornata**. Il default era sbagliato ed e' stato corretto |

## Domande aperte

| # | Domanda | Blocca |
|---|---|---|
| ~~Q1~~ | ~~Il token funziona? Dove sono i casi di test?~~ **RISOLTA**: token classico (quelli con ambito richiedono il gateway `api.atlassian.com`), corpus individuato in due rami, estrazione verificata su pagine reali | — |
| Q2 | Che decisione vogliamo che prendano i senior a fine demo? | Taglio della presentazione |
| Q3 | Quanti tester, su quante app, quanti con IDE/repo? | Dimensionamento e canale di distribuzione del catalogo |
| ~~Q4~~ | ~~Il tool AI aziendale e' gia' disponibile?~~ **RISOLTA**: nello spazio wiki esiste una guida di setup del tool AI con accesso via IAM Identity Center → e' gia' configurato in azienda. Il Blocco 3 non e' piu' condizionale. | — |
| Q5 | Esiste un gatekeeper designato e accetta un SLA sulle approvazioni? | Sostenibilita' del processo |
| Q6 | L'app sotto test ha una component library / design system condiviso? | Se si', le POM si modellano sui **componenti** invece che sulle pagine: riuso molto maggiore |
| ~~Q7~~ | ~~Demo su ambiente reale o app neutra?~~ **RISOLTA**: si collauda su app pubblica di pratica, poi si ripunta sull'app aziendale prima della demo | — |
| Q9 | Fase 1 era dichiarata **read-only**. Pubblicare catalogo, code e registro su Confluence e' una scrittura: si conferma? | Perimetro ora definito: **un albero di pagine di proprieta' dell'iniziativa**, sotto un'unica pagina madre, e lo strumento **si rifiuta di scrivere** su pagine che non porta il suo marcatore. Non tocca i casi di test di nessuno. Resta un cambio rispetto a quanto dichiarato, e come tale va detto |
| ~~Q8~~ | ~~Il corpus e' bilingue?~~ **PROBABILMENTE NO**: entrambi i campioni sono interamente in inglese. Da confermare sull'intero corpus, ma il limite del clustering lessicale sulle lingue miste non dovrebbe toccarci | — |

## Stato della costruzione

Il metodo si chiama **Specification by Demonstration** (D9): il tester esegue il test a
mano, la sessione viene registrata, e da li' si derivano scenario e automazione.

```
tester esegue a mano  →  traccia semantica          ✅  collaudata su sessione reale
scout                 →  dizionario componenti      ✅
regole .md            →  Amazon Q (+ Kiro generato) ✅
traccia + dizionario + catalogo  →  scenario        ⬜  IL PROSSIMO
scenario  →  step + Page Object  →  test verde      ⬜
integrazione nell'app desktop                       ⬜  tagliabile
```

| Atto della demo | Stato | Cosa manca |
|---|---|---|
| 1. Il problema — i numeri | 🟢 ~90% | Solo metterli in slide: i dati ci sono (F11, F13) |
| 2. Il rimedio — catalogo | 🟡 ~50% | La macchina c'e' (app desktop, editor vincolato, validatore). Manca il **contenuto** |
| 3. L'assistente | 🟡 ~40% | Regole pronte, manca la generazione |
| 4. Registrazione + moltiplicatore | 🟡 ~60% | Recorder e scout pronti, manca **il giunto fra i due e il catalogo** |
| 5. Test verde | 🔴 0% | Non iniziato |

**Circa il 50%.**

### Ordine di lavoro

| # | Pezzo | Giorni | Nota |
|---|---|---|---|
| 1 | **Ciclo del catalogo** (confronto, coda di approvazione, ripubblicazione) | 1½ | Sblocca l'atto 2 e rende il catalogo auto-mantenuto |
| 2 | **Mappa componenti ↔ step** + indice inverso + punteggio | 1 | **Il cuore.** Senza, la generazione ricade su una scelta probabilistica: salta la tesi |
| 3 | Verifiche tipizzate nel recorder (D16) | ½ | |
| 4 | Generazione dello scenario | 1½ | |
| 5 | Step + Page Object, esecuzione | 1½ | |
| 6 | Piano demo + slide | 2 | **Fermi su Q2** |

Il punto 6 e' l'unico bloccato da una risposta che non dipende dallo sviluppo.
Il punto 2 e' quello da non tagliare mai.

### Come funziona il ciclo del catalogo (D14)

```
Confluence → fetch → normalizza → clusterizza
                          ↓
              confronto col catalogo corrente
                          ↓
   combacia con un alias  →  niente da fare
   nuova, cluster noto    →  propone un ALIAS
   nuova, cluster nuovo   →  propone uno step @wanted
                          ↓
        report + pagina catalogo ripubblicata
                          ↓
            coda di approvazione (umana)
```

### Miglioramenti tenuti da parte

- **Rilevazione automatica del cambiamento**: invece di far cliccare l'elemento da
  verificare, il recorder propone cosa e' cambiato dopo l'azione. Piu' naturale, ma
  costa un giorno e introduce rumore da filtrare.
- Taratura delle soglie di clustering leggendo i near-miss sul corpus reale.
- Export dell'intero spazio per il confronto fra aree (`cluster su piu' rami`).

## Strumenti gia' disponibili in questo repo

| Comando | Cosa fa |
|---|---|
| `npm run confluence:discover` | Elenca gli space accessibili. Con `-- --space KEY` stampa l'albero: rami di primo livello con id e numero di pagine. **Da lanciare per primo.** |
| `npm run confluence:probe -- --root <ID>` | Scarica una pagina e mostra percorso, testo estratto e punteggio Gherkin. Serve a verificare che l'estrazione funzioni su contenuto reale. |
| `npm run confluence:fetch -- --root <ID>` | Scarica tutto il sottoalbero, estrae il testo, marca i candidati e scrive `reports/confluence-export/<ts>.json` con il riepilogo **aggregato per ramo**. |
| `npm run analyze:corpus -- --in <export>` | **Secondo stadio**: normalizza, clusterizza, calcola le metriche di entropia e propone i candidati step. Scrive `-full.json` (frasi reali, resta sulla macchina) e `-summary.md` (soli aggregati, condivisibile dopo rilettura). |
| `npm run record -- <url>` | **Registra un test eseguito a mano** e produce la traccia semantica. La barra chiede al tester i confini di intento e le verifiche. |
| `npm run scout -- <url>` | Produce il **dizionario dei componenti**: ruolo, nome accessibile, locator, giudizio di stabilita' e indice di accessibilita'. |
| `npm run rules:sync` | Rigenera `.kiro/steering/` dalla sorgente `.amazonq/rules/`. `rules:check` verifica soltanto (per la CI). |
| `npm run check:all` | Estrattore (9 casi), normalizzatore/clustering (43), giudizio di stabilita' (12). Da rilanciare dopo ogni modifica alle librerie. |
| `npm run jira:probe` / `jira:fetch` | Equivalenti per Jira. Non sono la sorgente dell'Osservatorio: serviranno per la tracciabilita' verso i ticket. |
| `npm run catalog` | Rigenera `STEP_CATALOG.md` + `step-catalog.json`. |
| `npm run validate:steps` | Valida gli step di un `.feature` contro il catalogo. |

Configurazione richiesta in `.env` (mai committato):

```
CONFLUENCE_URL=https://<tenant>.atlassian.net
CONFLUENCE_EMAIL=nome@azienda.com     # lasciare VUOTO su Server/DC (auth Bearer)
CONFLUENCE_TOKEN=<api token o personal access token>
CONFLUENCE_SPACE=QA                   # opzionale dopo il discover
CONFLUENCE_ROOT=                      # opzionale: id della "master folder"
```

Su Cloud lo stesso token vale per entrambi i prodotti: se in `.env` ci sono gia'
`JIRA_URL` / `JIRA_EMAIL` / `JIRA_TOKEN`, il lettore Confluence li usa come fallback
e non serve ripeterli.
