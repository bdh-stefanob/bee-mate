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
| [02-design.md](02-design.md) | Architettura del sistema, i 4 blocchi, i confini | 🟡 Sez. 1 in review |
| `03-piano-demo.md` | Sceneggiatura della demo, atti, fallback | ⬜ da scrivere |
| `04-presentazione.md` | Impianto teorico + riferimenti + slide | ⬜ da scrivere |

## Il problema in una riga

Tester di aree diverse scrivono casi di test in un formato simil-Gherkin dentro Jira,
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
| F2 | Vivono **su Jira**, in formato **simil-Gherkin, senza datatable** | Superficie di scrittura = Jira → il sistema dev'essere **read-first**, non gate-first |
| F3 | Nessuna datatable in uso | Scenari non parametrizzati → duplicazione per variante di dato |
| F4 | Esiste un token API Jira personale, **mai testato** | Prerequisito della Fase 1; piano B = export CSV |
| F5 | Esiste un POC separato Playwright+Cucumber con script `scout` e `generate-pom` | Riusabile come **moltiplicatore**, non come sorgente degli step |
| F6 | Buona parte del "centro di verita'" esiste gia' in questo scaffold | Schema catalog v2, generatore Markdown, web-ui, estensione VS Code |

## Decisioni prese

| # | Decisione | Motivo |
|---|---|---|
| D1 | La spina dorsale e' **P1 (linguaggio/governance)**, non l'automazione ne' l'AI | E' l'unico dei tre a soddisfare tutti e 4 i paletti senza approvazioni esterne |
| D2 | **Un componente UI ≠ uno step.** Componente → metodo POM (1:1). Intento business → step (1:N) | Generare uno step per elemento produce Gherkin imperativo: peggiora l'entropia invece di ridurla |
| D3 | Il catalogo nasce dai **cluster dei test case esistenti**, non da un design a tavolino | Risolve il bootstrap "catalogo vuoto" e fa riconoscere ai colleghi le proprie frasi |
| D4 | **Fase 1 read-only** su Jira | Azzera meta' delle obiezioni di security prima che vengano sollevate |
| D5 | Il sistema e' **AI-agnostic**; il tool AI aziendale e' implementazione di riferimento, non requisito | Un "no" del procurement non deve uccidere l'iniziativa |
| D6 | L'AI non valida mai se stessa: produce, il **validatore deterministico** giudica | La garanzia anti-entropia non puo' essere probabilistica (cfr. `ROADMAP.md` §3) |
| D7 | Approccio scelto: **B — Osservatorio + Oracolo** | A resta dentro come nucleo autoconsistente: se l'AI o l'ambiente saltano in demo, la presentazione regge lo stesso |

## Domande aperte

| # | Domanda | Blocca |
|---|---|---|
| Q1 | Il token Jira funziona? Che dialetto REST risponde? In quale campo vivono i test case? | Fase 1 → **risolvibile subito con `npm run jira:probe`** |
| Q2 | Che decisione vogliamo che prendano i senior a fine demo? | Taglio della presentazione |
| Q3 | Quanti tester, su quante app, quanti con IDE/repo? | Dimensionamento e canale di distribuzione del catalogo |
| Q4 | Il tool AI aziendale e' gia' disponibile a tutti o va richiesto? | Blocco 3 |
| Q5 | Esiste un gatekeeper designato e accetta un SLA sulle approvazioni? | Sostenibilita' del processo |
| Q6 | L'app sotto test ha una component library / design system condiviso? | Se si', le POM si modellano sui **componenti** invece che sulle pagine: riuso molto maggiore |
| Q7 | La demo gira su ambiente QA reale o su app neutra? | Rischio dati + rischio scenico |

## Prossimi passi

1. **`npm run jira:probe`** dal PC aziendale → risolve Q1 in 5 minuti. *(strumento pronto)*
2. `npm run jira:fetch` → primo export, primo conteggio grezzo.
3. Normalizzatore + clustering → metriche di baseline + candidati step. *(da costruire)*
4. Sezioni 2-7 del design.
5. Piano demo e presentazione.

## Strumenti gia' disponibili in questo repo

| Comando | Cosa fa |
|---|---|
| `npm run jira:probe` | Verifica credenziali, rileva il dialetto REST, stampa **tutti** i campi non vuoti di una issue segnalando quali contengono Gherkin. Da lanciare per primo. |
| `npm run jira:fetch` | Scarica le issue del JQL configurato, estrae i campi testuali, marca i candidati e scrive `reports/jira-export/<timestamp>.json` con un riepilogo di conformita'. |
| `npm run catalog` | Rigenera `STEP_CATALOG.md` + `step-catalog.json`. |
| `npm run validate:steps` | Valida gli step di un `.feature` contro il catalogo. |

Configurazione richiesta in `.env` (mai committato):

```
JIRA_URL=https://<tenant>.atlassian.net
JIRA_EMAIL=nome@azienda.com          # lasciare VUOTO su Jira Server/DC (auth Bearer)
JIRA_TOKEN=<api token o personal access token>
JIRA_JQL=project = ABC AND issuetype = Test
JIRA_FIELDS=                          # opzionale: restringe ai campi noti dopo il probe
```
