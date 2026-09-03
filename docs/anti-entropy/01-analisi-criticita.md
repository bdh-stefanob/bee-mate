# 01 — Analisi delle criticita' (prospettiva senior tester)

> Analisi della proposta iniziale, prima di qualunque decisione di design.
> Serve a due cose: evitare di costruire la cosa sbagliata, e arrivare in
> presentazione con le obiezioni gia' anticipate invece che subite.

---

## 1. La proposta iniziale contiene tre progetti diversi, non uno

| | Problema | Costo | Dipende da approvazioni? | Provabile subito? |
|---|---|---|---|---|
| **P1** | Entropia del *linguaggio* BDD tra tester | ~0 | No | **Si'** |
| **P2** | Bootstrap/accelerazione UI automation (codegen → POM) | ~0 tool, alto in manutenzione | **Si'** (automazione UI approvata) | Parzialmente |
| **P3** | AI generativa come oracolo (libreria .md + tool AI aziendale) | licenze + data governance | **Si'** (procurement + security) | No |

Nella formulazione iniziale P2 e P3 facevano da spina dorsale. E' un errore di
posizionamento: **la spina dorsale dev'essere P1**, l'unico dei tre a soddisfare
tutti e quattro i paletti senza dipendere da decisioni altrui.

Se i senior sentono "serve obbligatoriamente il tool AI X", la proposta diventa
ostaggio di una decisione che non e' loro. Se sentono "il metodo funziona anche a
mano, e con l'AI va 10x", la proposta passa.

---

## 2. Criticita' tecnica principale — "un componente = uno step" e' l'anti-pattern che si vuole combattere

La generazione automatica di scenari a partire dagli elementi trovati su una pagina
produce, per ogni elemento:

```gherkin
Scenario: User interacts with Continue
  When the user clicks "Continue"
```

Uno scenario e uno step **per elemento**. Una pagina con 40 elementi × 20 pagine × 3 app
= centinaia di step atomici imperativi. E' esattamente cio' che le convenzioni del
progetto vietano, con l'aggravante di essere **entropia automatizzata**, quindi veloce.

La mappatura corretta e' asimmetrica:

```
componente UI     →  metodo POM      1:1   ← MECCANICO, generabile
intento business  →  step Gherkin    1:N   ← SEMANTICO, curato
```

Lo scout/codegen **non popola il catalogo step**. Popola il layer `pages/` e produce un
*inventario di candidati*. Il passaggio da inventario a step richiede giudizio — ed e'
esattamente il punto in cui l'AI assiste e il gatekeeper approva.

> In presentazione questa correzione e' un punto di forza, non una debolezza: dimostra
> di aver capito **dove la generazione automatica smette di funzionare**. Chi presenta
> "l'AI genera tutto" viene smontato in trenta secondi.

---

## 3. Criticita' strategiche

### 3.1 "Riduzione di entropia" senza metrica non e' dimostrabile

Il paletto 4 richiede numeri. Servono baseline e KPI **prima** della demo:

| KPI | Definizione | A cosa serve |
|---|---|---|
| **Conformita'** | % di test case anche solo interpretabili come Given/When/Then | La slide piu' forte: se e' bassa, giustifica da sola l'iniziativa |
| **Reuse ratio** | step distinti / step totali | Metrica principale di entropia |
| **Coverage catalogo** | % step che matchano una voce del catalogo | Misura l'adozione nel tempo |
| **Near-duplicate** | n. cluster di frasi semanticamente equivalenti | Il "prima" piu' visivo: 14 modi di dire la stessa cosa |
| **Time-to-first-scenario** | tempo di un tester nuovo per produrre uno scenario conforme | Metrica di esperienza, non di codice |

Senza questi numeri l'intera proposta e' un'opinione.

### 3.2 Rendere obbligatorio un tool AI specifico e' un single point of failure

Va venduta come architettura **AI-agnostic**: lo standard e' catalogo + regole +
validatore; il tool AI e' l'implementazione di riferimento, intercambiabile.

### 3.3 L'LLM non puo' essere la garanzia anti-entropia

E' probabilistico. La garanzia vive nei tre meccanismi deterministici gia' definiti in
`ROADMAP.md` §3: autocomplete vincolato, validazione strutturale, gate CI. L'AI e' uno
strumento di **velocita'**, non di garanzia.

---

## 4. Criticita' tecniche

### 4.1 Il testo su Jira non e' Gherkin valido

"Simil-Gherkin senza datatable" significa che un parser Gherkin ufficiale fallisce.
Serve **parsing tollerante**: strip di bullet/numerazione/markup, normalizzazione
(lowercase, collapse whitespace, punteggiatura), estrazione dei letterali fra virgolette
come parametri candidati. Non e' complicato, ma e' il cuore tecnico della Fase 1.

L'assenza di datatable e' gia' un segnale diagnostico: scenari non parametrizzati →
duplicazione per variante di dato (stesso flusso × 5 dati = 5 test case copiaincollati).

### 4.2 Framework UI moderni e stabilita' dei locator

Su applicazioni con markup non semantico (SPA legacy, componenti custom), `getByRole`
non basta: servono attributi applicativi, i modali con `role="alertdialog"` troncano
l'albero di accessibilita', gli iframe di terze parti (es. campi di pagamento) vanno
gestiti a parte. Quindi **"il codegen popola le POM" e' vero al ~60-70%**, e solo su
pagine accessibili. Va detto in slide, non nascosto.

> **Rovescio positivo, da usare:** la qualita' del codegen e' un **proxy di
> accessibilita'**. Se lo scout non trova un `role` + `name` stabile, quel componente ha
> probabilmente un problema a11y. E' l'argomento migliore per coinvolgere gli
> sviluppatori, e in contesti regolamentati (retail/EU) ha peso normativo.

### 4.3 Manutenzione dei POM generati

La rigenerazione sovrascrive. Senza strategia di diff, il moltiplicatore diventa
rilavoro. Proposta: **scout come drift detector** — run periodica, diff contro baseline
committata, report "3 elementi nuovi, 1 sparito, 2 rinominati". Probabilmente piu'
facile da vendere della generazione iniziale, perche' parla di **manutenzione**, che e'
il vero costo dell'automazione UI.

### 4.4 Dati sensibili

Gli output di scraping e di export catturano contenuto reale degli ambienti di QA
(nominativi, identificativi, contenuti di messaggi). Darli in pasto a un tool AI esterno
richiede un passo di sanitizzazione esplicito. **E' la prima domanda che fara' security:
la risposta va preparata prima, non dopo.**

---

## 5. Criticita' organizzative

### 5.1 Il costo vero non e' il tool, e' il gatekeeper

Serve un owner del catalogo e un **SLA sulle approvazioni** degli step `@wanted`. Se
approvare uno step nuovo richiede due settimane, i tester aggirano il processo e si
torna al punto di partenza.

### 5.2 Il bootstrap del catalogo vuoto

Nelle prime settimane il catalogo e' vuoto: *tutto* e' step nuovo. Serve una
**bootstrap mode** permissiva che si stringe nel tempo.

> Risolto da D3: se il catalogo nasce dai cluster dei test case esistenti, al giorno 1
> e' gia' pieno e gia' derivato da come il team scrive davvero.

### 5.3 Contraddizione col paletto 3 (alla portata dei tester manuali)

Gli assistenti AI da IDE vivono nel workspace e leggono i file di progetto. Un tester
manuale senza repo e senza IDE **non li raggiunge**. Va deciso esplicitamente:

- il canale per i non-tecnici e' la web-ui, e l'AI serve solo i tecnici; **oppure**
- serve una superficie conversazionale con la libreria .md come knowledge base; **oppure**
- accesso in sola lettura al repo per tutti.

---

## 6. Cosa manca (da integrare)

1. **Glossario / Ubiquitous Language sopra il catalogo step.** L'entropia nasce nei
   *sostantivi* prima che negli step: quattro parole diverse per la stessa entita'.
   Un file .md e una regola di lint. Costo: mezza giornata. Impatto: alto.
2. **Convenzione di naming e tagging degli scenari** (ID, suite, area) → tracciabilita'
   verso requisiti e verso il test management tool.
3. **Dashboard metriche**, anche solo un .md generato: reuse ratio nel tempo. E' la prova
   continuativa che l'entropia scende.
4. **"Day-1 kit" per tester manuali:** cheat sheet di una pagina + 10 scenari canonici
   d'esempio + link al catalogo. Serve piu' di qualunque tool.
5. **Definizione condivisa di "componente".** Se l'app ha una component library, le POM
   possono rispecchiare i *componenti* invece delle *pagine* → riuso cross-pagina reale.
6. **Non-goals espliciti** (vedi `02-design.md`). Senza, i senior sentono "tool interno
   da manutenere per sempre".

---

## 7. Riferimenti utilizzabili

Solidi e citabili:

- **Declarative vs Imperative** — *The Cucumber Book*, 2ª ed. (Wynne & Hellesøy), e la
  pagina "Anti-patterns" della documentazione Cucumber ufficiale.
- **Specification by Example** (Gojko Adzic) — living documentation, vocabolario condiviso.
- **Ubiquitous Language** (Evans, *Domain-Driven Design*) — il nome accademico del
  "dizionario / unica fonte di verita'". Usarlo alza il registro della proposta.
- **Screenplay Pattern** (Serenity/JS handbook) — i tre livelli step / task / interaction.
- **Playwright**: strategia di locator ARIA-first come raccomandazione ufficiale →
  aggancio diretto all'argomento accessibilita'.

Da verificare prima di metterli in slide:

- Letteratura accademica su *test smells* in Gherkin/BDD e duplicazione degli step.
- Meccanismo dei file di "steering"/rules del tool AI aziendale scelto: e' il modo in cui
  si realizza la libreria di .md, ma la sintassi va confermata sulla documentazione
  corrente del vendor.
