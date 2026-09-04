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
| [02-design.md](02-design.md) | Architettura del sistema, i 4 blocchi, i confini | 🟡 Sez. 1 in review, Sez. 2 costruita |
| [05-referenze.md](05-referenze.md) | Bibliografia verificata: 20 fonti aperte, 5 dichiarate incerte | ✅ completo |
| [../../scripts/CONFLUENCE-API-NOTES.md](../../scripts/CONFLUENCE-API-NOTES.md) | Ricerca sulle API Confluence + 7 assunzioni da confermare al primo run | ✅ completo |
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
| F3 | Nessuna datatable in uso | Scenari non parametrizzati → duplicazione per variante di dato |
| F3b | **Nessun plugin** di test management (niente Xray/Zephyr) | Nessun campo strutturato, nessun issuetype: testo libero in pagine wiki → entropia più alta del previsto |
| F3c | Confluence ha un **albero vero** (space → pagina → figlie) | La "master folder" è indirizzabile con `ancestor = <pageId>`; il percorso diventa una **dimensione di misura** (entropia per area/team) |
| F4 | Esiste un token API Atlassian personale, **mai testato** | Prerequisito della Fase 1; su Cloud lo stesso token vale per Jira e Confluence |
| F5 | Esiste un POC separato Playwright+Cucumber con script `scout` e `generate-pom` | Riusabile come **moltiplicatore**, non come sorgente degli step |
| F6 | Buona parte del "centro di verita'" esiste gia' in questo scaffold | Schema catalog v2, generatore Markdown, web-ui, estensione VS Code |

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

## Domande aperte

| # | Domanda | Blocca |
|---|---|---|
| Q1 | Il token funziona? Quale space e quale ramo contengono i casi di test? Il testo si estrae bene? | Fase 1 → **risolvibile subito con `confluence:discover` → `confluence:probe`** |
| Q2 | Che decisione vogliamo che prendano i senior a fine demo? | Taglio della presentazione |
| Q3 | Quanti tester, su quante app, quanti con IDE/repo? | Dimensionamento e canale di distribuzione del catalogo |
| Q4 | Il tool AI aziendale e' gia' disponibile a tutti o va richiesto? | Blocco 3 |
| Q5 | Esiste un gatekeeper designato e accetta un SLA sulle approvazioni? | Sostenibilita' del processo |
| Q6 | L'app sotto test ha una component library / design system condiviso? | Se si', le POM si modellano sui **componenti** invece che sulle pagine: riuso molto maggiore |
| Q7 | La demo gira su ambiente QA reale o su app neutra? | Rischio dati + rischio scenico |
| Q8 | Il corpus reale e' bilingue (IT + EN)? | Il clustering e' lessicale: non unisce lingue diverse. Se il mix e' significativo serve una tabella di corrispondenza in fase di curation |

## Prossimi passi

1. **`npm run confluence:discover`** dal PC aziendale → quali space vedo. *(strumento pronto)*
2. **`npm run confluence:discover -- --space <KEY>`** → l'albero, per individuare la "master folder". *(pronto)*
3. **`npm run confluence:probe -- --root <ID>`** → verifica che il testo si estragga bene. *(pronto)*
4. `npm run confluence:fetch -- --root <ID>` → primo export e primo conteggio grezzo. *(pronto)*
5. ~~Normalizzatore + clustering~~ *(costruito — soglie da tarare sui dati veri)*
6. Taratura delle soglie di clustering leggendo la lista dei near-miss sul corpus reale.
7. Sessione col gatekeeper: dai cluster alle voci canoniche + alias.
8. Sezioni 3-7 del design.
9. Piano demo e presentazione — **bloccati su Q2**.

## Strumenti gia' disponibili in questo repo

| Comando | Cosa fa |
|---|---|
| `npm run confluence:discover` | Elenca gli space accessibili. Con `-- --space KEY` stampa l'albero: rami di primo livello con id e numero di pagine. **Da lanciare per primo.** |
| `npm run confluence:probe -- --root <ID>` | Scarica una pagina e mostra percorso, testo estratto e punteggio Gherkin. Serve a verificare che l'estrazione funzioni su contenuto reale. |
| `npm run confluence:fetch -- --root <ID>` | Scarica tutto il sottoalbero, estrae il testo, marca i candidati e scrive `reports/confluence-export/<ts>.json` con il riepilogo **aggregato per ramo**. |
| `npm run analyze:corpus -- --in <export>` | **Secondo stadio**: normalizza, clusterizza, calcola le metriche di entropia e propone i candidati step. Scrive `-full.json` (frasi reali, resta sulla macchina) e `-summary.md` (soli aggregati, condivisibile dopo rilettura). |
| `npm run check:all` | Verifica estrattore (8 casi) e normalizzatore/clustering (43 controlli). Da rilanciare dopo ogni modifica alle librerie. |
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
