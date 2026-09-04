# 05 — Referenze verificate

> Bibliografia dell'iniziativa anti-entropia. **Ogni voce di questo documento e' stata
> verificata aprendo la fonte**: titolo, autori, anno e URL sono stati letti alla fonte,
> non ricostruiti a memoria. Le voci che non e' stato possibile confermare stanno in
> fondo, nella sezione "NON VERIFICATE", e **non vanno usate in slide**.
>
> Data delle verifiche: **4 settembre 2026**.
>
> Convenzione: dove esiste un DOI, e' stato controllato su Crossref
> (`api.crossref.org/works/<doi>`); dove esiste un preprint arXiv, i metadati provengono
> dai tag `citation_*` della pagina `abs` di arXiv. Gli URL delle documentazioni
> ufficiali sono stati risolti seguendo i redirect (HTTP 200 sull'URL finale indicato).

---

## Indice dei temi

| | Tema | Voci verificate |
|---|---|---|
| a | BDD dichiarativo e anti-pattern | 4 |
| b | Vocabolario condiviso e living documentation | 3 |
| c | Test smells e duplicazione — evidenza | 6 |
| d | Pattern di implementazione | 2 |
| e | Accessibilita' e locator | 2 |
| f | Strumenti AI e regole persistenti | 3 |

**Totale: 20 fonti verificate, 5 voci dichiarate non verificate.**

---

## a) BDD dichiarativo e anti-pattern

### a1. Cucumber — "Writing better Gherkin"

- **Titolo esatto**: *Writing better Gherkin*
- **Autore**: documentazione ufficiale Cucumber (Cucumber Ltd. / SmartBear)
- **URL aperto**: <https://cucumber.io/docs/bdd/better-gherkin/> — HTTP 200
- **Cosa dice di pertinente**: enuncia due principi. Primo, *descrivere il comportamento
  e non l'implementazione*: al posto di `I visit "/login"` + `I enter "Bob" in the user
  name field` si scrive `When "Bob" logs in`. Secondo, *adottare uno stile dichiarativo*:
  esprimere l'idea a un livello piu' alto rispetto alla singola interazione UI, perche'
  cosi' lo scenario regge ai cambi di implementazione. Il criterio operativo dato dalla
  pagina e' esattamente quello che serve a noi: se un cambio di implementazione ti
  costringe a riscrivere lo scenario, lo scenario e' scritto al livello sbagliato.

### a2. Cucumber — "Anti-patterns"

- **Titolo esatto**: *Anti-patterns*
- **Autore**: documentazione ufficiale Cucumber
- **URL aperto**: <https://cucumber.io/docs/guides/anti-patterns/> — HTTP 200
- **Cosa dice di pertinente**: nomina e definisce due anti-pattern che descrivono
  letteralmente le due patologie che stiamo misurando.
  1. **Feature-coupled step definitions** — step scritti su misura di una feature, non
     riutilizzabili altrove, con conseguente duplicazione. La raccomandazione e': *"Use
     domain-related names (rather than feature- or scenario-related names) for your step
     & step definition files."*
  2. **Conjunction steps** — step che impastano piu' azioni diverse: *"Don't use steps
     that combine a bunch of different things. This makes steps too specialised, and hard
     to reuse."*
- **Nota**: questa pagina e' la fonte che permette di dire "non e' una nostra opinione,
  e' un anti-pattern con un nome nella documentazione ufficiale dello strumento".

### a3. Cucumber — "Step organization"

- **Titolo esatto**: *Step organization*
- **URL aperto**: <https://cucumber.io/docs/gherkin/step-organization/> — HTTP 200
- **Cosa dice di pertinente**: raccomanda di organizzare le step definition **per concetto
  di dominio** ("one file for each major domain object"), non per feature, e di evitare
  step quasi-identici parametrizzandoli (`I go to the {string} page` invece di N step
  distinti). E' il ponte diretto fra l'anti-pattern a2 e la struttura a 4 layer di questo
  repo.

### a4. Knight, Andy — "BDD 101: Writing Good Gherkin"

- **Titolo esatto**: *BDD 101: Writing Good Gherkin*
- **Autore**: Andy Knight (Automation Panda)
- **Data**: 30 gennaio 2017
- **URL aperto**: <https://automationpanda.com/2017/01/30/bdd-101-writing-good-gherkin/>
- **Cosa dice di pertinente**: formula la "Cardinal Rule of BDD" — *"One Scenario, One
  Behavior!"* — e insiste sul formato **soggetto-predicato** costante per ogni step come
  condizione del riuso. E' fonte pratitioner, non accademica: utile come conferma
  indipendente e come formulazione memorizzabile, **non** come prova.

> **Come si usa in presentazione**: e' la base della slide "non stiamo inventando una
> regola interna". Il passaggio da imperativo a dichiarativo si mostra con l'esempio
> letterale di Cucumber (`I visit "/login"` → `When "Bob" logs in`), e i due anti-pattern
> ufficiali (feature-coupled, conjunction) si usano come **etichette dei difetti che il
> validatore rileva**: dare al difetto il suo nome ufficiale sposta la discussione da
> "preferenza stilistica" a "conformita' a una pratica documentata".

---

## b) Vocabolario condiviso e living documentation

### b1. Evans, Eric — *Domain-Driven Design: Tackling Complexity in the Heart of Software*

- **Editore / anno**: Addison-Wesley Professional, 2003 (1ª ed., 20 agosto 2003)
- **ISBN**: 978-0-321-12521-7 (ISBN-10: 0321125215)
- **URL aperti**: <https://www.dddcommunity.org/book/evans_2003/> — HTTP 200;
  pagine di esempio ufficiali Pearson:
  <https://ptgmedia.pearsoncmg.com/images/9780321125217/samplepages/0321125215.pdf>
- **Cosa dice di pertinente**: e' la fonte del concetto di **Ubiquitous Language** — un
  unico linguaggio condiviso fra esperti di dominio e team tecnico, usato in modo
  consistente nel parlato, nei documenti e nel codice. E' il nome accademico di quello
  che noi chiamiamo "dizionario unico / catalogo".
- **Verifica gratuita disponibile**: Evans ha pubblicato il *Domain-Driven Design
  Reference* (definizioni sintetiche dei pattern, incluso Ubiquitous Language) su
  <https://www.domainlanguage.com/ddd/reference/> — HTTP 200. Utile se in riunione
  qualcuno chiede la definizione esatta.

### b2. Adzic, Gojko — *Specification by Example: How Successful Teams Deliver the Right Software*

- **Editore / anno**: Manning Publications, giugno 2011
- **ISBN**: 978-1-61729-008-4
- **URL aperti**: <https://www.manning.com/books/specification-by-example> (pagina
  editore); <https://gojko.net/books/specification-by-example/> (pagina autore)
- **Cosa dice di pertinente**: il libro e' costruito su oltre 50 casi studio industriali e
  formalizza il pattern della **living documentation**: le specifiche scritte come esempi
  in linguaggio ad alto livello diventano documentazione affidabile perche' vengono
  eseguite. E' l'argomento per cui il catalogo non e' "documentazione in piu'" ma
  documentazione **che si mantiene da sola**.
- **Cautela**: la pagina Manning parla di "living, reliable documentation" e di
  definizione condivisa delle aspettative, ma **non** usa l'espressione "ubiquitous
  language". Per quella si cita Evans (b1), non Adzic.

### b3. Wynne, Matt & Hellesøy, Aslak (con Steve Tooke) — *The Cucumber Book, Second Edition*

- **Titolo esatto**: *The Cucumber Book, Second Edition: Behaviour-Driven Development for
  Testers and Developers*
- **Editore / anno**: The Pragmatic Bookshelf (Pragmatic Programmers), febbraio 2017
- **ISBN**: 978-1-68050-238-1
- **URL aperto**: <https://pragprog.com/titles/hwcuc2/the-cucumber-book-second-edition/>
- **Cosa dice di pertinente**: e' il testo di riferimento per la scrittura di Gherkin
  espressivo e per la manutenzione delle suite.
- **⚠ Correzione da recepire prima delle slide**: nell'indice pubblicato dall'editore
  **non esiste un capitolo intitolato "Declarative vs Imperative"**. I capitoli sono:
  *Why Cucumber?*, *First Taste*, *Gherkin Basics*, *Step Definitions: From the Outside*,
  ***Expressive Scenarios***, ***When Cucumbers Go Bad***, *Step Definitions: On the
  Inside*, *Support Code*, *Dealing with Message Queues and Asynchronous Components*,
  *Databases*, *The Cucumber Command-Line Interface*, *Testing a REST Web Service*,
  *Adding Tests to a Legacy Application*, *Bootstrapping Rails*, *Using Capybara to Test
  Ajax Web Applications*, *Testing Command-Line Applications with Aruba*.
  I capitoli pertinenti sono **"Expressive Scenarios"** e **"When Cucumbers Go Bad"**.
  In slide si cita il libro per il tema, **non** un capitolo con quel nome: e' il tipo di
  dettaglio su cui un senior che ha il libro sullo scaffale ti smonta in dieci secondi.
  (Nota: `CLAUDE.md` di questo repo cita "cap. Declarative vs Imperative" — va corretto,
  ma la modifica e' fuori dallo scope di questo documento.)

> **Come si usa in presentazione**: sposta il registro. "Vogliamo un dizionario condiviso"
> e' una richiesta; "stiamo applicando l'Ubiquitous Language di Evans (2003) alla
> superficie di specifica, e la Specification by Example di Adzic (2011) per renderla
> documentazione viva" e' un'architettura. Due nomi, due date, zero fronzoli.

---

## c) Test smells e duplicazione — evidenza

Questo era il buco segnalato in `01-analisi-criticita.md` §7. La letteratura **esiste**,
e' identificabile e in buona parte accessibile gratuitamente. Va distinta in due strati:
peer-reviewed (c1-c4) e preprint recenti non ancora peer-reviewed (c5-c6).

### c1. Binamungu, Embury & Konstantinou (2018) — *Maintaining behaviour driven development specifications: Challenges and opportunities*

- **Venue**: 2018 IEEE 25th International Conference on Software Analysis, Evolution and
  Reengineering (SANER), pp. **175-184**
- **DOI**: `10.1109/SANER.2018.8330207` — metadati confermati su Crossref (titolo,
  autori, pagine, marzo 2018)
- **PDF open access**:
  <https://pure.manchester.ac.uk/ws/files/181992545/SANER2018BinamunguKonstantinouEmbury.pdf>
  — HTTP 200
- **Cosa dice di pertinente**: e' la survey di riferimento sui **costi di manutenzione**
  delle suite BDD quando il numero di esempi cresce, e sulla difficolta' pratica di
  *trovare* gli esempi/step esistenti — il meccanismo che genera duplicazione.
- **Cautela**: la cifra "75 praticanti da 26 paesi" compare nell'abstract riportato da
  fonti secondarie; **non e' stata confermata leggendo il PDF** (vedi NON VERIFICATE nv4).
  Il paper e' citabile; quel numero specifico no, finche' non lo si legge.

### c2. Binamungu, Embury & Konstantinou (2018) — *Detecting duplicate examples in behaviour driven development specifications*

- **Venue**: 2018 IEEE Workshop on Validation, Analysis and Evolution of Software Tests
  (VST), pp. **6-10**
- **DOI**: `10.1109/VST.2018.8327149` — metadati confermati su Crossref
- **URL aperti**: <https://ieeexplore.ieee.org/document/8327149/>;
  proceedings: <https://www.conference-publishing.com/toc/SANERWS18VST>;
  PDF: <https://nkons.github.io/papers/detecting.pdf> — HTTP 200
- **Cosa dice di pertinente**: e' **il paper esattamente sul nostro problema**. Premessa:
  quando le suite di esempi crescono la duplicazione si insinua ed e' difficile da
  rilevare a mano, e *gli strumenti di duplicate detection per il codice non funzionano
  sugli esempi BDD*. Approccio proposto: rilevamento basato su **tracing dinamico** —
  registrare la traccia di esecuzione di ogni scenario e confrontarle per equivalenza,
  valutato su tre sistemi open source.
- **Perche' conta per noi**: il metodo di questo paper **richiede test eseguibili**. Nel
  nostro contesto (F1: casi di test scritti e non automatizzati) quel metodo non e'
  applicabile — ed e' proprio la ragione per cui serve un rilevatore **statico e testuale**.
  Citare c2 e dire "noi siamo nel caso in cui questo approccio non e' disponibile" e' una
  dimostrazione di lettura, non una debolezza.

### c3. Binamungu, Embury & Konstantinou (2020) — *Characterising the Quality of Behaviour Driven Development Specifications*

- **Venue**: Agile Processes in Software Engineering and Extreme Programming (XP 2020),
  Lecture Notes in Business Information Processing, pp. **87-102**
- **DOI**: `10.1007/978-3-030-49392-9_6` — metadati confermati su Crossref
- **Full text open access**: <https://pmc.ncbi.nlm.nih.gov/articles/PMC7251619/> — HTTP 200
- **Cosa dice di pertinente**: e' **la voce piu' preziosa dell'intera bibliografia per
  questa iniziativa**. Constata che, nonostante l'abbondante discussione fra praticanti,
  *non esiste una definizione formale di cosa renda buona una suite BDD*, e ne propone
  una in quattro principi, sottoposti a survey di praticanti:
  1. **Conservation of Steps** — minimizzare le formulazioni ridondanti; *gli step
     formano un vocabolario*, e la duplicazione aumenta il carico di comprensione.
  2. **Conservation of Domain Vocabulary** — massimizzare il valore di ogni termine di
     dominio minimizzando i sinonimi.
  3. **Elimination of Technical Vocabulary** — niente gergo implementativo che oscuri
     l'intento di business.
  4. **Conservation of Proper Abstraction** — non mescolare step ad alto e basso livello,
     perche' produce duplicazione di step e di glue code.
  Il full text riporta almeno il **75% di consenso dei praticanti su ciascun principio**,
  con l'avvertenza ricorrente che *la leggibilita' prevale*: i praticanti accettano di
  violare un principio se la chiarezza migliora.
- **Perche' conta**: i quattro principi sono, uno per uno, le regole del nostro validatore.
  Il principio 2 e' il glossario/Ubiquitous Language chiesto in `01` §6.1; il principio 4
  e' la regola "un componente ≠ uno step" della decisione D2.

### c4. Binamungu & Maro (2023) — *Behaviour driven development: A systematic mapping study*

- **Venue**: Journal of Systems and Software, vol. **203**, art. **111749**, settembre 2023
- **DOI**: `10.1016/j.jss.2023.111749` — metadati confermati su Crossref (autori: Leonard
  Peter Binamungu, Salome Maro)
- **Preprint open access**: <https://arxiv.org/abs/2305.05567> — metadati confermati sui
  tag `citation_*` di arXiv
- **Cosa dice di pertinente**: mappatura sistematica di 166 lavori (2006-2021). Fra i gap
  identificati: scarsita' di ricerca con insight dall'industria e **"acuta carenza di
  metriche per misurare i vari aspetti delle specifiche BDD e dei processi che le
  producono"**.
- **Perche' conta**: e' la citazione che giustifica il KPI set di `01` §3.1. Non stiamo
  reinventando metriche esistenti — la letteratura dice esplicitamente che mancano.

### c5. Mughal, Fatima & Bilal (2026) — *Deja Vu at Scale* (preprint)

- **Titolo esatto**: *Deja Vu at Scale: Paraphrase-Robust Detection of Duplicate Gherkin
  Steps in Behaviour-Driven Software Testing with Sentence-Transformer Embeddings and a
  1.1M-Step Open Benchmark*
- **Autori**: Ali Hassaan Mughal, Noor Fatima, Muhammad Bilal
- **arXiv**: `2604.20462`, prima versione 22 aprile 2026 (revisioni successive)
- **URL aperti**: <https://arxiv.org/abs/2604.20462> (metadati e abstract letti dai tag
  `citation_*` e dal blocco abstract); versione SSRN correlata: DOI `10.2139/ssrn.6711811`
  (confermato su Crossref)
- **Numeri dall'abstract** (letti alla fonte): corpus di **347 repository GitHub pubblici,
  23.667 file `.feature`, 1.113.616 step**; **tasso di duplicati esatti pesato per step
  dell'80,2%**, mediana per repository **58,6%**; il cluster piu' grande ha **20.737
  occorrenze su 2.245 file**; il modello di risparmio stima che sul repository mediano il
  **62,5% delle righe di step sia eliminabile**. Calibrazione su 1.020 coppie etichettate
  a mano (Fleiss κ = 0,84). Rilascio del tool, corpus e benchmark sotto Apache-2.0.
- **⚠ Stato editoriale**: **preprint**. Il commento su arXiv dichiara "Submitted to
  Information and Software Technology (Elsevier)" — quindi **non ancora peer-reviewed**.
  In slide va detto: "preprint 2026, non ancora referato".

### c6. Mughal, Fatima & Bilal (2026) — *Given, When, Then, Again* (preprint)

- **Titolo esatto**: *Given, When, Then, Again: Mining Subscenario Refactoring Candidates
  in Behaviour-Driven Test Suites with ML Classifiers and LLM-Judge Baselines*
- **arXiv**: `2605.14568`, prima versione 14 maggio 2026
- **URL aperto**: <https://arxiv.org/abs/2605.14568>
- **Numeri dall'abstract** (letti alla fonte): corpus di 339 repository; 5.382.249
  "slice" candidate che collassano in **692.020 pattern ricorrenti**; classificatore
  XGBoost F1 = 0,891, superiore sia alla baseline a regole (0,836) sia al miglior giudice
  LLM (0,728). Prevalenza: **75,0%** degli scenari contiene un candidato Background
  intra-file, **59,5%** un candidato di scenario riusabile intra-repo, **11,7%** un
  candidato di step condiviso cross-organizzazione.
- **Perche' conta**: e' evidenza quantitativa diretta per due nostre tesi. Primo: la
  duplicazione BDD e' endemica e misurabile, non un problema del nostro team. Secondo —
  e questo e' il dato piu' utile in assoluto — **un classificatore deterministico batte
  il giudice LLM (0,891 vs 0,728)**. E' la citazione che sostiene D6: l'AI produce, il
  validatore deterministico giudica.
- **⚠ Stato editoriale**: **preprint**, non peer-reviewed.

### c7. Viggiato, Paas, Buzon & Bezemer (2023) — *Identifying Similar Test Cases That Are Specified in Natural Language*

- **Venue**: IEEE Transactions on Software Engineering, vol. **49**, pp. **1027-1043**,
  marzo 2023
- **DOI**: `10.1109/TSE.2022.3170272` — metadati confermati su Crossref
- **Preprint open access**: <https://arxiv.org/abs/2110.07733> — autori e data confermati
  sui tag `citation_*`
- **Cosa dice di pertinente**: e' il paper su **casi di test scritti in linguaggio
  naturale** — non Gherkin eseguibile: esattamente il nostro F1. Combina text embedding,
  metriche di similarita' e clustering per raggruppare *step simili* e da li' identificare
  *test case simili*. Riportati F-score intorno a **0,87 sugli step simili** e **0,83 sui
  test case simili**, su caso industriale.
- **Perche' conta**: e' la **validazione metodologica della nostra Fase 1**. La pipeline
  che vogliamo costruire (normalizzazione → embedding → clustering → cluster di frasi
  equivalenti) e' pubblicata su una rivista di prima fascia, con numeri di riferimento.
  Se un senior chiede "come fai a sapere che il clustering funziona su testo scritto a
  mano da tester diversi", questa e' la risposta.

### c8. gherkin-lint — catalogo di regole esistente

- **Repository**: <https://github.com/gherkin-lint/gherkin-lint> — via API GitHub:
  **non archiviato**, licenza ISC, ~203 stelle, ultimo push **19 agosto 2024**
- **Cosa offre**: ~30 regole configurabili su file `.feature`, fra cui
  `no-dupe-feature-names`, `no-dupe-scenario-names` (configurabile per cercare duplicati
  nel singolo file o su tutti i file), `no-duplicate-tags`, `name-length`,
  `max-scenarios-per-file`, `scenario-size`, `no-restricted-patterns`,
  `keywords-in-logical-order`.
- **Perche' conta**: dimostra che il **lint deterministico su Gherkin e' pratica esistente
  e non un'invenzione nostra**, e delimita onestamente il confine: gherkin-lint rileva
  duplicati **esatti di nome**, non equivalenza semantica. La nostra parte a valore
  aggiunto (near-duplicate, coverage catalogo) e' precisamente quello che questi linter
  non fanno.
- **Nota di realismo**: ultimo push agosto 2024. Nella slide "build vs buy" e' onesto
  presentarlo come "esistente ma poco mantenuto".

> **Come si usa in presentazione**: e' la slide che trasforma la proposta da opinione a
> pratica documentata, e va costruita a strati crescenti di forza.
> 1. *Il problema e' noto e costa*: Binamungu et al. SANER 2018 (c1).
> 2. *Ha un nome e una definizione di qualita'*: i quattro principi di XP 2020 (c3) —
>    Conservation of Steps, Conservation of Domain Vocabulary. Questa e' la slide
>    centrale: i nostri principi hanno una fonte peer-reviewed.
> 3. *Le metriche mancano nella letteratura*: JSS 2023 (c4) → giustifica i nostri KPI.
> 4. *La scala del fenomeno*: 80,2% di step duplicati su 1,1M step (c5, preprint).
> 5. *Il metodo che useremo e' validato*: TSE 2023 su testo in linguaggio naturale (c7).
> 6. *Il deterministico batte l'LLM*: 0,891 vs 0,728 (c6, preprint) → sostiene D6.
>
> Regola d'oro per questa slide: **marcare c5 e c6 come preprint 2026 non referati**.
> Dichiararlo prima che lo chiedano vale piu' del dato stesso.

---

## d) Pattern di implementazione

### d1. Serenity/JS — *Screenplay Pattern* (handbook)

- **Titolo esatto**: *Screenplay Pattern*
- **URL aperto**: <https://serenity-js.org/handbook/design/screenplay-pattern/> — HTTP 200
- **Cosa dice di pertinente**: definisce il pattern come *"an innovative, user-centred
  approach to writing high-quality automated acceptance tests"*, con il principio
  fondante: *"Automated acceptance tests should use your domain language to clearly
  express what activities the actors interacting with your system need to perform in
  order to accomplish their goals."* I cinque elementi sono **Actors, Abilities,
  Interactions, Tasks, Questions**: le *Interactions* sono le attivita' a basso livello su
  una data interfaccia, i *Tasks* modellano sequenze di attivita' come passi di workflow
  di business.
- **Mappatura sull'architettura di questo repo**: `steps/` → glue; `actions/` → Tasks;
  `pages/` → Interactions/Abilities. La corrispondenza e' diretta e va mostrata cosi'.
- **Precisazione terminologica utile**: la coppia esatta e' *Task* (intento business) vs
  *Interaction* (interazione atomica). Nel repo li chiamiamo `actions/` e `pages/`.

### d2. Cucumber — "Step organization" (gia' citata come a3)

Vale anche come pattern di implementazione: organizzazione per concetto di dominio e
parametrizzazione degli step al posto della moltiplicazione.

> **Come si usa in presentazione**: una sola slide con la tabella a tre righe
> step / task / interaction accanto ai tre layer del repo. Serve a rispondere in
> anticipo alla domanda "e a livello di codice come si evita la duplicazione?": la
> risposta e' che l'anti-entropia non e' solo una convenzione di scrittura, ha un pattern
> di implementazione con un nome e un handbook.

---

## e) Accessibilita' e locator

### e1. Playwright — *Locators*

- **URL aperto**: <https://playwright.dev/docs/locators> — HTTP 200
- **Citazione esatta**: *"We recommend prioritizing role locators to locate elements, as
  it is the closest way to how users and assistive technology perceive the page."*
- **Limite dichiarato dalla stessa pagina**, da riportare per onesta': *"Note that role
  locators do not replace accessibility audits and conformance tests, but rather give
  early feedback about the ARIA guidelines."*
- **Perche' conta**: e' la fonte ufficiale del "rovescio positivo" di `01` §4.2. Il
  legame locator ↔ accessibilita' non e' una nostra estrapolazione: e' la motivazione
  scritta nella raccomandazione stessa.

### e2. Playwright — *Best Practices*

- **URL aperto**: <https://playwright.dev/docs/best-practices> — HTTP 200
- **Citazioni esatte**: *"Automated tests should verify that the application code works
  for the end users, and avoid relying on implementation details such as things which
  users will not typically use, see, or even know about."* e *"The end user will see or
  interact with what is rendered on the page, so your test should typically only
  see/interact with the same rendered output."*
- **Cosa dice di pertinente**: la pagina contrappone esplicitamente
  `page.getByRole('button', { name: 'submit' })` (raccomandato) a
  `page.locator('button.buttonIcon.episode-actions-later')` (sconsigliato), con la
  motivazione *"Your DOM can easily change so having your tests depend on your DOM
  structure can lead to failing tests."*
- **Perche' conta**: e' lo stesso principio dichiarativo di (a) applicato un layer piu'
  in basso. Buon Gherkin sta al comportamento come buon locator sta a cio' che l'utente
  percepisce. Una regola sola, due layer.

> **Come si usa in presentazione**: e' la slide che cambia interlocutore. Fino a qui la
> proposta parla ai tester; qui parla agli sviluppatori e al compliance. La formulazione
> e': "se lo scout non trova un `role` + `name` stabile su un componente, quel componente
> ha probabilmente un problema di accessibilita'" — con la citazione Playwright a
> supporto, **e il suo limite dichiarato subito dopo**: role locator ≠ audit di
> conformita'. Rivendicare meno di quanto la fonte dice e' cio' che rende credibile tutto
> il resto.

---

## f) Strumenti AI e regole persistenti

Verifica richiesta perche' `01` §7 marcava questo punto come "da confermare sulla
documentazione corrente del vendor". **Il meccanismo esiste in entrambi i prodotti AWS,
con due nomi diversi e due convenzioni di cartella diverse.**

### f1. Kiro (AWS) — *Steering*

- **Titolo esatto della pagina**: *Steering*
- **URL aperto**: <https://kiro.dev/docs/steering/> — HTTP 200. Kiro e' prodotto AWS: la
  pagina indice della documentazione e' <https://aws.amazon.com/documentation-overview/kiro/>
  (title HTML: "Kiro Documentation") — HTTP 200.
- **Meccanismo confermato**:
  - File **Markdown** in **`.kiro/steering/`** nella root del workspace (scope di
    progetto), oppure in **`~/.kiro/steering/`** (scope globale, tutti i workspace). In
    caso di conflitto **vince il workspace**.
  - Tre file di base generati di default: **`product.md`** (scopo e obiettivi del
    prodotto), **`tech.md`** (stack e vincoli tecnici), **`structure.md`** (organizzazione
    dei file e convenzioni).
  - **Quattro modalita' di inclusione**, dichiarate in front-matter YAML in testa al file:
    `inclusion: always` (default, caricato in ogni interazione); `inclusion: fileMatch`
    con `fileMatchPattern` (caricato solo lavorando su file che matchano il pattern);
    `inclusion: manual` (richiamato in chat con `#nome-file`); `inclusion: auto` con
    `name` e `description` (Kiro decide in base alla description).
  - Vincolo esplicito nella documentazione: *"The inclusion configuration must be the
    first content in the file - no blank lines or content before it."*
- **Perche' conta per noi**: `inclusion: fileMatch` con pattern `**/*.feature` e' la
  realizzazione tecnica esatta della "libreria .md" prevista dal Blocco 3: le regole di
  scrittura Gherkin si caricano **solo** quando si tocca un file `.feature`.

### f2. Amazon Q Developer — *Project rules* (IDE)

- **Titolo esatto della pagina**: *Creating project rules for use with Amazon Q Developer
  chat*
- **URL aperto**:
  <https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/context-project-rules.html> —
  HTTP 200
- **Meccanismo confermato, citazione esatta**: *"Project rules are defined in Markdown
  files in the project's `{{project-root}}/.amazonq/rules` folder."* Le regole vengono
  usate automaticamente come contesto in ogni chat dentro il progetto; nel pannello Q
  esiste un pulsante **Rules** per attivarle/disattivarle per sessione.

### f3. Amazon Q Developer — *Project rules* (piattaforme terze: GitHub / GitLab)

- **Titolo esatto della pagina**: *Creating project rules for Amazon Q Developer in
  third-party platforms*
- **URL aperto**:
  <https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/third-party-context-project-rules.html>
  — HTTP 200
- **Meccanismo confermato**: stessa convenzione — file Markdown in
  `{{project-root}}/.amazonq/rules` — applicata a repository GitLab o GitHub, con le
  regole committate e revisionate come qualunque altro file.
- **Perche' conta**: e' la prova che il file di regole vive **nel repository**, quindi e'
  versionato, revisionabile in PR e sottoposto a code review. E' l'argomento di governance
  che serve: le regole dell'AI seguono lo stesso processo di approvazione del codice.

> ⚠ **Rilievo importante sullo stato della documentazione AWS.** Le pagine relative alla
> **CLI** di Amazon Q Developer risultano oggi **rimosse**: gli URL
> `command-line-project-rules.html`, `command-line-context.html`,
> `command-line-context-profiles.html`, `command-line-custom-agents-configuration.html`,
> `rules-prerequisites.html` e `rules-validation.html` compaiono ancora nei motori di
> ricerca ma **redirigono tutti alla home della guida**
> (`https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/`) — verificato seguendo i
> redirect. **Conclusione operativa**: e' verificato e citabile il meccanismo
> `.amazonq/rules` per **IDE e piattaforme terze**; **non** e' verificabile allo stato
> attuale la forma corrente delle regole per la **CLI**, che sembra essere confluita nel
> concetto di *custom agents* (il formato e' documentato nel repo GitHub
> <https://github.com/aws/amazon-q-developer-cli/blob/main/docs/agent-format.md>, HTTP
> 200, ma e' documentazione di repository, non docs.aws.amazon.com). Se in presentazione
> serve parlare della CLI, va detto cosi'.

> **Come si usa in presentazione**: e' la slide che disinnesca l'obiezione "e se il tool
> AI cambia?". Il messaggio: **il meccanismo e' commodity**. Due prodotti AWS diversi
> implementano la stessa idea — regole persistenti in file Markdown versionati nel repo —
> con due nomi (`steering`, `rules`) e due cartelle (`.kiro/steering/`, `.amazonq/rules/`).
> Il nostro asset e' il **contenuto** delle regole, cioe' il catalogo e le convenzioni;
> il file di steering e' solo il formato di consegna, e cambiarlo costa un `cp`. Questo
> e' esattamente D5 (architettura AI-agnostic) reso concreto. Aggiungere il rilievo sulla
> documentazione CLI rimossa rafforza l'argomento invece di indebolirlo: le convenzioni
> dei vendor cambiano in mesi, il nostro catalogo no.

---

## NON VERIFICATE — non usare in slide

### nv1. Esperienze industriali pubblicate di consolidamento di suite BDD

- **Cosa cercavo**: experience report aziendali o talk di conferenza su riduzione della
  duplicazione degli step in una suite BDD reale, con numeri prima/dopo.
- **Cosa ho trovato**: solo contenuti pratitioner senza provenienza verificabile — post
  su Medium (`Cucumber JS Step Definitions: Best Practices`, `Cucumber Step Definitions
  Best Practices`), un post su collectiveidea.com del 2011, aggregatori. Nessuno cita
  un'azienda identificabile con numeri riproducibili. Una cifra circolante ("circa 1.200
  step definition in una suite") **non ha fonte attribuibile** e non va citata.
- **Sostituto solido**: i case study di Adzic (b2, oltre 50 progetti) e i dati su corpus
  pubblico di c5/c6. Se serve un "prima/dopo" reale, **il nostro** baseline misurato in
  Fase 1 e' piu' forte di qualunque aneddoto altrui.

### nv2. Forma corrente delle regole per Amazon Q Developer **CLI**

- **Cosa cercavo**: pagina ufficiale AWS sul meccanismo di rules/context per la CLI.
- **Cosa ho trovato**: tutti gli URL candidati redirigono alla home della guida (vedi
  rilievo in §f). Il formato *custom agents* e' documentato solo nel repository GitHub
  del prodotto. **Non citare la CLI in slide** senza una nuova verifica il giorno prima.

### nv3. Il capitolo "Declarative vs Imperative" di *The Cucumber Book*

- **Cosa cercavo**: conferma del capitolo citato in `CLAUDE.md`.
- **Cosa ho trovato**: nell'indice ufficiale dell'editore quel capitolo **non esiste**. I
  capitoli pertinenti sono *Expressive Scenarios* e *When Cucumbers Go Bad* (vedi b3).
  **Non citare per capitolo.** Se serve una citazione puntuale per il concetto
  dichiarativo, usare la pagina Cucumber (a1), che e' pubblica e verificabile in diretta.

### nv4. "75 praticanti da 26 paesi" (survey SANER 2018)

- **Cosa cercavo**: conferma della numerosita' del campione di c1.
- **Cosa ho trovato**: la cifra compare in riassunti di fonti secondarie ma l'estrazione
  del testo dal PDF open access non e' riuscita. Il PDF e' raggiungibile (HTTP 200): **si
  verifica in cinque minuti aprendolo a mano**. Finche' non e' fatto, citare il paper ma
  **non il numero**.

### nv5. "Duplicazione e inconsistenza di parafrasi fra le prime tre criticita'" (Oliveira & Marczak)

- **Cosa cercavo**: verifica diretta di questa affermazione nei lavori di Oliveira,
  Marczak et al. sulla qualita' degli scenari BDD.
- **Cosa ho trovato**: i due lavori **esistono e i metadati sono confermati su Crossref** —
  *On the Empirical Evaluation of BDD Scenarios Quality: Preliminary Findings of an
  Empirical Study* (2017 IEEE 25th REW, pp. 299-302, DOI `10.1109/REW.2017.62`) e
  *How to Evaluate BDD Scenarios' Quality?* (Oliveira, Marczak, Moralles; XXXIII Brazilian
  Symposium on Software Engineering, 2019, pp. 481-490, DOI `10.1145/3350768.3351301`).
  **Ma il testo completo e' a pagamento e non e' stato letto**: la specifica affermazione
  sul "top three" proviene dalla sezione related work di un preprint (c5), non dalla
  fonte primaria. I due paper sono citabili per **esistenza e tema**; l'affermazione sul
  ranking delle criticita' no.

---

## Nota di metodo

Tre cose che questa bibliografia insegna sulla proposta stessa, e che vale la pena dire
in riunione se qualcuno chiede "quanto e' solido tutto questo":

1. **Il problema e' documentato, la soluzione no.** La letteratura descrive bene la
   duplicazione BDD (c1-c3) e dichiara esplicitamente che mancano metriche (c4). Lo
   spazio in cui ci muoviamo e' reale.
2. **Il metodo che proponiamo e' pubblicato, applicato altrove.** Il clustering di test
   case in linguaggio naturale e' su TSE (c7). Non stiamo prototipando una tecnica: la
   stiamo applicando a un corpus nuovo.
3. **Il deterministico batte l'LLM sul giudizio.** 0,891 vs 0,728 (c6). E' il dato che
   sostiene D6 meglio di qualunque argomento retorico — con l'avvertenza che e' un
   preprint.
