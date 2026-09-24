# Anti-entropia BDD multi-team — documento di avanzamento

> **Documento vivo.** Traccia stato, decisioni prese, domande aperte e prossimi passi
> dell'iniziativa "ridurre l'entropia dei casi di test BDD scritti da tester di aree
> diverse senza un sistema unico".
>
> **Nota sul repo:** questo repository e' pubblico/personale. Tutti i documenti qui
> dentro sono **genericizzati**: nessun nome di azienda, prodotto, ambiente, URL,
> progetto Jira o persona reale. L'output dei tool (`reports/`) e' gitignorato e non
> va mai spostato altrove.

> **Come si prosegue.** Il piano operativo, con i criteri di chiusura di ogni task, e'
> la spec Kiro [`.kiro/specs/demo-anti-entropia/`](../../.kiro/specs/demo-anti-entropia/tasks.md).
> Come far lavorare l'assistente sul progetto: [09-lavorare-con-kiro.md](09-lavorare-con-kiro.md).
> Questo documento resta la fonte delle decisioni e del loro perche'.

## Indice

| Doc | Contenuto | Stato |
|---|---|---|
| [../PANORAMICA.md](../PANORAMICA.md) | **Il progetto per intero**: problema, metodo, processo, componenti, stato, cosa manca. Da qui si costruiscono slide e documenti | ✅ 2026-09-24 |
| [01-analisi-criticita.md](01-analisi-criticita.md) | Analisi da senior tester: criticita', rischi, cosa manca | ✅ completo |
| [02-design.md](02-design.md) | Architettura del sistema, i 4 blocchi, i confini | 🟡 Sez. 1-2 costruite, 3-7 da scrivere |
| [../../.amazonq/rules/](../../.amazonq/rules/) | **Sorgente** delle regole per l'assistente: metodo, come si lavora, lezioni gia' pagate, layer, catalogo. `.kiro/steering/` si genera da qui | ✅ completo |
| [07-assistente.md](07-assistente.md) | L'assistente: regole, agenti, automatismi, e come si misura se servono | ✅ completo |
| [08-prova-su-altra-macchina.md](08-prova-su-altra-macchina.md) | Portare la catena sulla macchina aziendale: ambienti, credenziali, browser | ✅ completo |
| [09-lavorare-con-kiro.md](09-lavorare-con-kiro.md) | Come far proseguire il lavoro a Kiro, e cosa controllare dopo | ✅ completo |
| [10-prove-sul-campo.md](10-prove-sul-campo.md) | **Cosa resta da provare sul campo**, in ordine, con cosa riportare e cosa cambia se va male | 🟡 in corso |
| [../../.kiro/specs/demo-anti-entropia/](../../.kiro/specs/demo-anti-entropia/tasks.md) | **Il piano**: requisiti (EARS), design, task con criteri di chiusura | 🟡 in corso |
| [05-referenze.md](05-referenze.md) | Bibliografia verificata: 20 fonti aperte, 5 dichiarate incerte | ✅ completo |
| [../../scripts/CONFLUENCE-API-NOTES.md](../../scripts/CONFLUENCE-API-NOTES.md) | Ricerca sulle API Confluence + 7 assunzioni da confermare al primo run | ✅ completo |
| [06-rituale.md](06-rituale.md) | **Il processo**: consolidamento mensile del linguaggio, 15 minuti, con i comandi per eseguirlo | ✅ completo |
| [03-piano-demo.md](03-piano-demo.md) | **Sceneggiatura della demo.** Decide lo scope, non lo riassume: cio' che non e' in scena non si costruisce | ✅ completo |
| [04-presentazione.md](04-presentazione.md) | **I materiali**: tre pubblici, scaletta delle slide, struttura del documento Word, scheda per i tester | 🟡 impianto scritto, materiali da produrre |
| [../GUIDA-CRUSCOTTO.md](../GUIDA-CRUSCOTTO.md) | Guida del cruscotto per il tester: Controllo, Registra, Esecuzione | ✅ |
| [../superpowers/specs/](../superpowers/specs/2026-09-22-cruscotto-tester-design.md) | Specifica del **cruscotto** per il tester, e il suo piano | ✅ MVP costruito |

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
| ~~F14~~ | ~~L'azienda usa Amazon Q Developer, non Kiro~~ **CORRETTO il 2026-09-09**: il motore e' **Kiro**, sia come IDE sia come fornitore del modello a pagamento (Claude Sonnet). La guida Kiro nello spazio wiki non era un residuo: era l'annuncio | Ribalta il bersaglio principale, non l'impianto: la sorgente delle regole resta una e le due versioni si generano. Anche Kiro ha una **CLI headless** (`kiro-cli chat --no-interactive`), quindi il confronto resta scriptabile — Kiro stesso lo negava, e si sbagliava |
| F19 | Kiro carica ogni file di steering secondo il suo front-matter, e **una regola condizionale non e' in contesto quando non lo e'** | La regola piu' importante — "cerca prima nel catalogo" — serve proprio quando NON c'e' ancora un `.feature` aperto. Legata a `fileMatch` sarebbe muta nel momento in cui conta |
| F20 | Kiro sceglie il modello da solo quando e' su **Auto** | Un confronto "con regole / senza regole" fatto con due modelli diversi misura i modelli, non le regole — e dai risultati non si vede. Il modello va fissato prima di misurare |
| F16 | Le etichette che scrive un tester italiano e un catalogo scritto in inglese **non si incontrano mai** per somiglianza lessicale. Li aggancia il **componente** (`role`+`name`), che di lingua non ne ha | Ribalta il peso dei segnali: nella rosa dei candidati l'ancoraggio vale 0,55 contro 0,30 del lessico. E promuove `components` (D13) da campo utile a **campo indispensabile** |
| F17 | La generazione deterministica produce **un test che gira**, senza che nessun modello tocchi niente: le frasi sono le etichette del tester | Toglie l'unico rischio serio della demo. Se l'assistente delude, resta un test verde scritto con le parole di chi il test l'ha eseguito |
| F18 | I giudici deterministici c'erano gia' tutti e non costano niente: `tsc` per il codice, il dry-run per la glue, il validatore per le frasi, `conformity()` per lo stile | "L'AI non valida se stessa" (D6) smette di essere un principio e diventa una riga di comando |
| F15 | L'app desktop del catalogo **esiste gia'** ed e' impacchettata come eseguibile: catalogo cercabile, editor Gherkin con autocomplete vincolato, step sconosciuti evidenziati, proposta `@wanted`, commit su GitHub | Il paletto 3 e' gia' risolto: un tester manuale scarica un .exe e scrive scenari conformi senza toccare il repo. Non e' da costruire |
| F21 | Prima prova di Kiro sulla macchina aziendale (P3, 2026-09-11): si orienta sulla spec, sa dove si modificano le regole, con l'agente di sola lettura non scrive. **Ma ha suggerito un'opzione con i trattini dopo `npm run x --`**, la forma che la lezione vietava — e che una trentina di esempi del repository usavano | Una regola smentita dagli esempi perde: l'assistente segue quello che vede fare, non quello che c'e' scritto di fare. Gli esempi ora li controlla `check:args` (D32) |
| F22 | Con un catalogo che per il login ha solo passi granulari (un campo, un click alla volta), Kiro li ha riusati in fila: formulazione esatta, scenario imperativo. L'ha detto, e ha proposto lo step d'intento come alternativa | "Riusa" e "dichiarativo" erano due regole scritte, senza dire quale vince. Ora e' scritto in `bdd-authoring.md`: tre o piu' passi di interfaccia sempre insieme contano come "nulla corrisponde" |
| F23 | `kiro-cli agent list` vede entrambi gli agenti dalla cartella `.kiro/agents` del workspace. **Ma l'agente "di sola lettura" ha eseguito una shell e creato un file** (2026-09-16). Due cause, scoperte una dopo l'altra: i nomi degli strumenti erano tradotti (`read`, `shell`) e l'engine, non riconoscendoli, concedeva i suoi default; e anche con i nomi giusti, `"tools": ["fs_read"]` **non toglie `execute_cmd`** | Un limite dichiarato e non applicato e' peggio di nessun limite, perche' ci si conta sopra. E con un nome che non conosce l'engine **non nega: concede** |
| F25 | **L'evento "salvataggio di un file" non esiste.** I trigger sono `agentSpawn`, `userPromptSubmit`, `preToolUse`, `postToolUse`, `stop`, e gli hook si dichiarano **dentro al file dell'agente**, non in una cartella a parte: il nostro `.kiro/hooks/valida-scenari.json` non lo leggeva nessuno (documentazione interrogata con `kiro-cli chat --agent kiro_help`) | Sembrava un pezzo di metodo funzionante ed era configurazione morta — lo stesso guasto di F23, in un altro punto. Il trigger che esiste e' anche piu' pertinente: `postToolUse` su `fs_write`, cioe' **quando l'assistente scrive**. Il rischio non e' che una persona salvi un file, e' che un modello ne scriva uno che non passa i giudici |
| F24 | Cio' che ferma davvero l'agente e' l'**approvazione**: `execute_cmd` non sta in `allowedTools`, quindi serve un si' umano, e in modalita' non interattiva il comando viene rifiutato ("no user to approve"). Con `--trust-all-tools` lo stesso agente crea il file. `fs_write` risulta non operativo ("tool not found"), il che e' un guasto, non una difesa | Ribalta D29: un agente **non impedisce, toglie la fiducia**. La garanzia da dire in presentazione e' "non scrive senza che una persona dica di si'", e vale finche' nessuno lancia con `--trust-all-tools` o, nell'IDE, in Autopilot. Detta cosi' regge; detta come prima, no |
| F26 | **P2, quarto giro (2026-09-22): 5 passi su 11 verdi**, accesso compreso, fatto dal test stesso. Si ferma su un'azione dentro una lista: il pulsante esiste in 100 copie, una per riga, e nessun filtro le distingue | La catena funziona su un'applicazione vera fino al primo contenitore ripetuto. Il limite e' preciso e ha un rimedio progettato (task 14): e' il prossimo lavoro che sblocca l'atto 5 |

## Decisioni prese

| # | Decisione | Motivo |
|---|---|---|
| D1 | La spina dorsale e' **P1 (linguaggio/governance)**, non l'automazione ne' l'AI | E' l'unico dei tre a soddisfare tutti e 4 i paletti senza approvazioni esterne |
| D2 | **Un componente UI ≠ uno step.** Componente → metodo POM (1:1). Intento business → step (1:N) | Generare uno step per elemento produce Gherkin imperativo: peggiora l'entropia invece di ridurla |
| D3 | Il catalogo nasce dai **cluster dei test case esistenti**, non da un design a tavolino | Risolve il bootstrap "catalogo vuoto" e fa riconoscere ai colleghi le proprie frasi |
| D4 | **Fase 1 read-only** su Confluence | Confermato dall'utente. Azzera meta' delle obiezioni di security prima che vengano sollevate |
| D5 | Il sistema e' **AI-agnostic**; il tool AI aziendale e' implementazione di riferimento, non requisito | Un "no" del procurement non deve uccidere l'iniziativa |
| D6 | L'AI non valida mai se stessa: produce, il **validatore deterministico** giudica | La garanzia anti-entropia non puo' essere probabilistica (cfr. `ROADMAP.md` §2) |
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
| D20 | La coda dichiara **di che giudizio** ha bisogno ogni gruppo (LINGUAGGIO / TECNICO) | Le colonne della matrice non le giudica la stessa persona: il dato e' automatico, la lingua e' del QA, la fattibilita' dell'SDET |
| D21 | Chi decide risponde in un modo solo: **si scrive solo per dissentire**, il bianco vale approvato. Le sei diramazioni (eleggi · scrivi · parametrizza · scomponi · spezza · rinvia) sono la tassonomia dello **strumento**, non il vocabolario delle persone | Il costo non e' decidere, e' registrare: leggere venti proposte e obiettarne due si fa in cinque minuti, compilare venti righe con una sintassi no — e la seconda volta la riunione si salta. Le alternative compaiono solo a chi dissente, e solo quelle sensate per quel gruppo |
| D22 | I **componenti** decidono due delle diramazioni: componenti disgiunti = intenzioni diverse (separare); componenti che sono l'**unione** di 2+ voci esistenti = composizione, non nuovo step | Sono confronti fra insiemi, non inferenze semantiche. La seconda **fa decrescere il catalogo** invece di farlo crescere; la prima e' un secondo parere indipendente sul clustering lessicale — uno guarda le parole, l'altro cosa viene toccato sullo schermo |
| D19 | Il refactor di massa **non avra' mai una modalita' automatica**: anteprima e diff obbligatori | E' l'operazione piu' pericolosa del sistema: se va storta una volta, brucia la fiducia nell'iniziativa in modo definitivo |
| D23 | Della generazione, **solo due cose** hanno bisogno di un modello: la frase Gherkin e quale metodo chiamare. Scheletro, un metodo per componente, `assertLoaded()` e la glue sono **deterministici** | Deterministico batte corretto-quasi-sempre. E restringe l'AI a scegliere fra opzioni elencate: un modello che sceglie fra cinque candidati sbaglia in modi che un compilatore prende, uno che compone da zero sbaglia in modi che si scoprono in produzione |
| D24 | La forma del codice generato vive in **`templates/`**, come file veri | Chi non e' d'accordo su come si scrive una Page Object cambia il modello, non il generatore. Una convenzione sepolta nel codice non viene discussa: viene subita e poi aggirata |
| D25 | **Un solo** passo di verifica, parametrizzato (`Then la pagina mostra {string}`), non uno per elemento | Uno per elemento sarebbe uno step nuovo a ogni registrazione: esattamente l'entropia da togliere. Generico di proposito, l'assistente lo specializza dove l'intento lo merita |
| D26 | Fra Page Object **generate** niente return-value chaining: la transizione avviene nella glue | Due pagine che si raggiungono a vicenda si importerebbero a vicenda, e con CommonJS uno dei due `require` torna vuoto. Il sintomo — costruttore `undefined` a runtime — non assomiglia alla causa. Deviazione consapevole dalla convenzione del POC |
| D27 | L'esecuzione **senza regole** si misura in un progetto separato (`npm run arena`), mai in questo repository | Amazon Q carica `.amazonq/rules/` da solo: misurare qui significherebbe misurare "con regole" due volte e chiamarne una "senza". Nessuno in sala se ne accorgerebbe |
| D28 | Inclusione delle regole: **il metodo sempre attivo, la meccanica no**. `product.md`, `bdd-authoring.md` e `step-catalog.md` sono `always`; i file tecnici restano condizionali | 165 righe sempre in contesto costano poco e coprono tutto cio' che serve per decidere COSA scrivere. Il risparmio di contesto non vale il rischio che la regola anti-entropia sia assente proprio quando serve |
| D29 | Gli **agenti** si generano come le regole: sorgente `.amazonq/cli-agents/`, copia `.kiro/agents/`. La mappa degli strumenti e' esplicita e **fallisce** su un nome sconosciuto | Un agente conta piu' di una regola: una regola orienta, un agente **toglie la fiducia**. **CORRETTA il 2026-09-16**: diceva "impedisce", ed era falso (F23, F24). `"tools": ["fs_read"]` non toglie la shell; quello che cambia e' che gli strumenti non auto-approvati richiedono un si' umano. Gli strumenti non si traducono (i nomi validi stanno in `scripts/lib/kiro-tools.ts`), si dichiara il minimo, e `check:kiro-tools` verifica i file generati invece delle intenzioni — ma la garanzia si enuncia cosi': **non scrive senza che una persona dica di si'**, e cade con `--trust-all-tools` |
| D30 | Gli **hook** di Kiro tolgono l'ultimo anello umano dal controllo deterministico: salvi un `.feature` → parte il validatore; salvi una step definition → si rigenera il catalogo | D6 dice che il giudizio non passa dall'assistente. Restava pero' che qualcuno si ricordasse di lanciarlo — e "mi ricordo" e' la parte che cede per prima. **CORRETTA il 2026-09-16**: l'evento del salvataggio non esiste (F25). L'automatismo e' dichiarato dentro l'agente che scrive, scatta su `postToolUse`/`fs_write` e lancia `scripts/hook-post-write.ts`, che sceglie il giudice dal tipo di file e ne propaga l'esito. Verificato simulando l'evento. `.kiro/hooks/` resta da verificare nell'IDE, o da cancellare |
| D31 | Il lavoro prosegue con **Kiro** sulla macchina aziendale. Il passaggio non e' un riassunto: e' **nei file** — una spec (`.kiro/specs/demo-anti-entropia/`) con requisiti, design e task verificabili, e due steering nuovi: `metodo-di-lavoro` (sempre) e `lezioni` (sul codice) | Una conoscenza che vive solo in una conversazione si perde con la conversazione. Nei file la legge qualunque assistente, e chiunque la puo' correggere. Le lezioni portano l'incidente che le ha insegnate: una regola senza il suo perche' viene aggirata alla prima occasione |
| D16 | Le verifiche registrate hanno un **tipo**: mostra un valore (default) · e' comparso · e' sparito · si e' navigato | In produzione non si verifica "questo e' cliccabile", si verifica che **la UI si sia aggiornata**. Il default era sbagliato ed e' stato corretto |
| D32 | Le opzioni degli script si scrivono **in forma nuda** (`label=x`, `confronta`) e si leggono da una sola libreria, `scripts/lib/args.ts`. `check:args` fallisce se uno script torna a definirne una sua, o se un documento suggerisce un'opzione con i trattini dopo `npm run x --` | Quattro esecuzioni sbagliate senza errore, poi un assistente che ha imparato la forma sbagliata dai nostri stessi esempi (F21). Un argomento senza trattini arriva intatto in ogni shell. Le copie della lettura erano tredici, e non erano d'accordo fra loro. **Verificato sulla macchina aziendale il 2026-09-15**: con i trattini npm stampa `> ts-node scripts/benchmark.ts`, cioe' l'opzione e' sparita; in forma nuda stampa `> ts-node scripts/benchmark.ts confronta` e lo script la riceve |
| D33 | Il **cruscotto** accetta solo un **elenco chiuso** di comandi (diagnosi, sessione, registrazione, generazione, test, scansione, installazione del browser, sincronizzazione delle regole), con parametri tipizzati e validati per forma. Gli script si lanciano chiamando Node sul file, **senza shell** | Un'app che esegue cio' che le si chiede e' un terminale travestito. La shell su Windows trasformava un `&` in un parametro in un secondo comando: iniezione riprodotta, poi tolta alla radice (2026-09-22) |
| D34 | Cio' che il cruscotto mostra si legge **dagli artefatti** (la traccia JSON, il manifesto della generazione, i messaggi di Cucumber, l'uscita JSON della diagnosi), mai dall'output a schermo | Regola gia' pagata: un conteggio preso da un riassunto dava 92 invece di 0. L'output testuale dice cosa succede adesso, e non decide niente |
| D35 | **Un comando lungo alla volta**, con un file di stato per esecuzione: chiudendo l'app a meta', al ritorno l'operazione risulta interrotta e la traccia salvata resta. La finestra **ritrova** l'operazione in corso anche se non l'ha vista partire | Due registrazioni insieme si pestano i piedi: il secondo tentativo riceve un no chiaro, non una coda silenziosa. Dimenticare un'operazione in corso significava non poterla piu' ne' vedere ne' fermare |
| D36 | La diagnosi manda **chiavi piu' dati**, non frasi: le parole vivono nei dizionari della finestra (italiano e inglese, `next-intl`, lingua in un cookie) e in quelli del terminale (`BDD_LANG`). `check:i18n` fallisce se una chiave manca in una lingua o non la usa nessuno | Meta' dei testi della finestra arrivavano da uno script che non sa chi guarda lo schermo. Il primo giudice della parita' passava sempre: cercava un file che non esisteva |
| D37 | Un ambiente dichiara le sue credenziali **registrando l'accesso** una volta: la finestra ne ricava il blocco `login`, e ogni campo compilato diventa un segnaposto `${VARIABILE}`. Il valore digitato **non viene mai letto** dal codice che scrive il blocco | Le variabili di un ambiente si deducono dal suo blocco di accesso, che prima si scriveva a mano. Non e' un controllo che si puo' dimenticare: e' la forma del codice. Verificato cercando il nome utente vero nell'uscita |
| D38 | I **componenti** degli step li scrive la generazione, da registrazioni reali; gli step scritti a mano restano senza. La mappa inversa (componente → step e scenari che lo usano) sta nel portale del catalogo, non nel cruscotto | Il campo esisteva e sei file lo leggevano, ma nessuno lo scriveva: la diagnosi contava zero da mesi, ed era onesta. **Deviazione dal task 6**, che chiedeva una proposta in coda con approvazione umana: da confermare |
| D39 | L'**ambiente su cui si lavora** si sceglie una volta, nella barra laterale, e vale per tutta la finestra. Preparare un ambiente (in Controllo) e sceglierlo sono due gesti diversi. "Due su tre configurati" non e' un guasto: manca qualcosa solo se nessun ambiente e' utilizzabile | Due tendine per la stessa scelta prima o poi si contraddicono. Ambiente e `app` del catalogo non sono la stessa cosa: tre ambienti contro sette domini |

## Domande aperte

| # | Domanda | Blocca |
|---|---|---|
| ~~Q1~~ | ~~Il token funziona? Dove sono i casi di test?~~ **RISOLTA**: token classico (quelli con ambito richiedono il gateway `api.atlassian.com`), corpus individuato in due rami, estrazione verificata su pagine reali | — |
| ~~Q2~~ | ~~Che decisione vogliamo dai senior?~~ **RISOLTA per default**: non e' ancora deciso, quindi si prepara sul taglio "adottate il metodo" — l'unico che regge anche se automazione e AI non arrivano. Gli atti 4-5 si aggiungono senza rifare il resto | — |
| Q3 | Quanti tester, su quante app, quanti con IDE/repo? | Dimensionamento e canale di distribuzione del catalogo |
| **DATA** | **Demo entro 2-3 settimane** | Detta il taglio: fuori l'integrazione nell'app e le verifiche tipizzate; dentro presentazione, catena su un solo caso, refactor |
| ~~Q4~~ | ~~Il tool AI aziendale e' gia' disponibile?~~ **RISOLTA**: nello spazio wiki esiste una guida di setup del tool AI con accesso via IAM Identity Center → e' gia' configurato in azienda. Il Blocco 3 non e' piu' condizionale. | — |
| Q5 | Chi possiede il rituale? **Deve essere un senior o un gatekeeper designato** (non chi propone l'iniziativa), e va **chiesto esplicitamente in demo** | E' il punto di rottura singolo del modello converge-later: senza proprietario le code non le guarda nessuno |
| Q6 | L'app sotto test ha una component library / design system condiviso? | Se si', le POM si modellano sui **componenti** invece che sulle pagine: riuso molto maggiore |
| ~~Q7~~ | ~~Demo su ambiente reale o app neutra?~~ **RISOLTA**: si collauda su app pubblica di pratica, poi si ripunta sull'app aziendale prima della demo | — |
| Q9 | Fase 1 era dichiarata **read-only**. Pubblicare catalogo, code e registro su Confluence e' una scrittura: si conferma? | Perimetro ora definito: **un albero di pagine di proprieta' dell'iniziativa**, sotto un'unica pagina madre, e lo strumento **si rifiuta di scrivere** su pagine che non porta il suo marcatore. Non tocca i casi di test di nessuno. Resta un cambio rispetto a quanto dichiarato, e come tale va detto |
| **Q10** | Il remote dell'account aziendale e' **pubblico**, e la sua storia contiene da giugno file con nomi di azienda, prodotto e sistemi interni (esempi della prima demo, catalogo importato, convenzioni). Renderlo privato, ripulire i file, riscrivere la storia? | Niente di tecnico. E' un'esposizione in corso finche' non si decide, e la decisione e' di chi ha titolo in azienda, non dell'assistente. **2026-09-24:** il remote personale su GitHub risulta privato, e resta tale per scelta del proprietario; quello aziendale va verificato a parte |
| **Q11** | Da quale macchina si committa, e verso quale remote? Sulla macchina aziendale nascono le misure e il codice generato; il codice dello strumento vive qui | Dove lavora Kiro. Regola gia' ferma: il generato resta sulla macchina o va nel repository aziendale, e da li' esce solo `npm run referto` |
| ~~Q8~~ | ~~Il corpus e' bilingue?~~ **PROBABILMENTE NO**: entrambi i campioni sono interamente in inglese. Da confermare sull'intero corpus, ma il limite del clustering lessicale sulle lingue miste non dovrebbe toccarci | — |

## Stato della costruzione

Il metodo si chiama **Specification by Demonstration** (D9): il tester esegue il test a
mano, la sessione viene registrata, e da li' si derivano scenario e automazione.

> Aggiornato al 2026-09-24. Quadro completo in [`../PANORAMICA.md`](../PANORAMICA.md).

```
tester esegue a mano  →  traccia semantica          ✅  provata sul campo (P1)
scout                 →  dizionario componenti      ✅
regole .md            →  Kiro (+ Amazon Q)          ✅  generate da una sorgente
traccia + dizionario + catalogo  →  scenario        ✅  `npm run generate`
scenario  →  step + Page Object                     ✅  deterministico, compila
step + Page Object  →  test verde                   🟡  5 passi su 11 sul caso reale (F26)
misura con regole / senza regole                    ✅  costruita · confronto P8 da fare
tutto questo senza terminale                        ✅  cruscotto: Controllo, Registra, Esecuzione
ciclo del catalogo: coda, Gold, pubblicazione       ✅  pubblicazione ferma su Q9
ciclo del catalogo: applicare e riscrivere          ⬜  catalog-apply, catalog-refactor
```

| Atto della demo | Stato | Cosa manca |
|---|---|---|
| 1. Il problema — i numeri | 🟢 ~90% | Solo metterli in slide: i dati ci sono (F11, F13) |
| 2. Il rimedio — catalogo | 🟡 ~60% | La macchina c'e' (portale, editor vincolato, validatore, alias). Manca il **contenuto**: 127 voci su 137 sono `@wanted` |
| 3. Come resta vivo | 🟡 ~70% | Coda, report per area e Gold ci sono. **Mancano l'applicazione delle decisioni e il refactor**: il rituale sceglie ma non riscrive |
| 4. Registrazione | 🟢 ~95% | Dal cruscotto, con il riepilogo di cosa ha capito. Manca il video di riserva |
| 5. Test verde | 🟡 ~75% | Dal cruscotto, passi in tempo reale. Si ferma sulle liste (task 14) |

**Circa l'80%.** Cio' che resta e' descritto in ordine in `ROADMAP.md` §4.

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
| `npm run confluence:discover` | Elenca gli space accessibili. Con la chiave (`npm run confluence:discover KEY`) stampa l'albero: rami di primo livello con id e numero di pagine. **Da lanciare per primo.** |
| `npm run confluence:probe <ID>` | Scarica una pagina e mostra percorso, testo estratto e punteggio Gherkin. Serve a verificare che l'estrazione funzioni su contenuto reale. |
| `npm run confluence:fetch <ID>` | Scarica tutto il sottoalbero, estrae il testo, marca i candidati e scrive `reports/confluence-export/<ts>.json` con il riepilogo **aggregato per ramo**. |
| `npm run analyze:corpus in=<export>` | **Secondo stadio**: normalizza, clusterizza, calcola le metriche di entropia e propone i candidati step. Scrive `-full.json` (frasi reali, resta sulla macchina) e `-summary.md` (soli aggregati, condivisibile dopo rilettura). |
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
