<!-- generated-by: gsd-doc-writer -->
# Guida Utente — BDD Automation Portal

_Guida per analisti QA che usano il portale web per scrivere scenari di test Gherkin._
_User Guide for QA analysts using the web portal to write Gherkin test scenarios._

---

## Cos'è questo strumento / What is this tool

Il BDD Automation Portal è un'applicazione web che permette al team QA di scrivere scenari di test **senza installare nulla** e **senza accedere al codice sorgente**.

Lo scopo principale è garantire che ogni scenario riusi step già approvati e catalogati, evitando duplicati e invenzioni di frasi non standard. Gli step disponibili vengono dal **Catalogo**, l'unica fonte di verità del team.

> In sintesi: apri il browser, scrivi il tuo scenario con l'aiuto del catalogo, scarica il file `.feature`.

---

## Avvio dell'applicazione / Starting the app

L'applicazione gira in locale sulla macchina di chi la avvia (di solito il QA lead o il tecnico di turno). Per avviarla:

```bash
# Dalla cartella web-ui del progetto
cd web-ui
npm run dev
```

Poi apri il browser all'indirizzo:

```
http://localhost:3000
```

> **Nota per i QA non tecnici:** non è necessario eseguire questi comandi da soli. Chiedete al responsabile tecnico (Steve) di avviare l'app e di condividere lo schermo o fornire l'indirizzo IP locale.

---

## Navigazione principale / Main navigation

La barra in alto contiene tre sezioni:

| Sezione (IT) | Section (EN) | Funzione |
|---|---|---|
| **Catalogo** | Catalog | Sfoglia tutti gli step disponibili |
| **Editor** | Editor | Scrivi il tuo scenario Gherkin |
| **Feature** | Features | Visualizza i file `.feature` già salvati |

In alto a destra trovate anche:
- Il pulsante lingua (**EN/IT**) per cambiare la lingua dell'interfaccia
- Il pulsante tema (**sole/luna**) per passare da tema chiaro a scuro

---

## Pagina Catalogo / Catalog page

La pagina Catalogo mostra tutti gli step BDD disponibili per il team.

### Cosa vedete nella tabella

Ogni riga rappresenta uno step con:

| Colonna | Significato |
|---|---|
| **Espressione** | Il testo dello step, es. `I am logged in as a "standard" user` |
| **Area** | Il dominio funzionale, es. `auth`, `orders`, `checkout` |
| **App** | L'applicazione di riferimento, es. `app-a`, `common` |
| **Stato** | Il ciclo di vita dello step (vedi sotto) |

### Stati degli step

- **implemented** (verde) — lo step è implementato e pronto all'uso
- **wanted** (arancione) — step richiesto ma non ancora implementato; usatelo nel vostro scenario, sarà implementato in seguito
- **deprecated** (rosso) — step obsoleto, non usarlo; controllate se esiste un sostituto

### Cercare e filtrare

- **Barra di ricerca** — digitate parole chiave per filtrare per testo o area
- **Filtro area** — selezionate un'area dal menu per vedere solo gli step di quel dominio
- **Filtro stato** — filtrate per implemented, wanted, o deprecated

### Aprire uno step nell'editor

**Doppio clic su una riga** apre l'Editor con quello step già inserito come punto di partenza.

---

## Pagina Editor / Editor page

L'Editor è il cuore dell'applicazione. È diviso in due colonne:

- **Colonna sinistra (2/3):** toolbar + area di testo + zona import
- **Colonna destra (1/3):** pannello step (Step Browser) + anteprima

### La toolbar

Sopra all'area di testo ci sono due righe di pulsanti:

**Riga 1 — Structure (teal/verde acqua):**

| Pulsante | Cosa inserisce |
|---|---|
| `Feature:` | Intestazione della feature (colonna 0) |
| `Scenario:` | Nuovo scenario (colonna 2) |
| `Background:` | Contesto comune a tutti i test (colonna 2) |
| `Scenario Outline:` | Scenario parametrico con Examples (colonna 2) |
| `Examples:` | Tabella di esempi per Scenario Outline (colonna 4) |

**Riga 2 — Steps (verde) + utilità:**

| Pulsante | Cosa inserisce |
|---|---|
| `Given` | Riga `    Given ` (colonna 4) |
| `When` | Riga `    When ` (colonna 4) |
| `Then` | Riga `    Then ` (colonna 4) |
| `And` | Riga `    And ` (colonna 4) |
| `But` | Riga `    But ` (colonna 4) |
| `\| table \|` | Template tabella dati (colonna 6) |
| `↩ Undo` | Annulla l'ultima azione (o Ctrl+Z) |
| `↪ Redo` | Ripristina (o Ctrl+Y) |
| `⟳ Format` | **Corregge automaticamente l'indentazione** |

### Indentazione corretta del Gherkin

Il Gherkin ha regole precise di indentazione:

```gherkin
Feature: Checkout con carta di credito
                                        ← Feature: colonna 0

  Scenario: Checkout con carta valida
                                        ← Scenario: 2 spazi
    Given I am logged in as a "standard" user
    When I place the order
    Then the order is confirmed
                                        ← steps: 4 spazi
```

Se l'indentazione è sbagliata, cliccate **⟳ Format** per correggerla automaticamente.

### Syntax highlighting e linting

L'editor colorisce il testo in base al tipo:
- Le keyword Gherkin (`Feature`, `Scenario`, `Given`, `When`, `Then`) sono evidenziate
- Gli step non presenti nel catalogo vengono segnalati visivamente per avvisarvi che non sono ancora approvati

### Anteprima / Preview

Nel pannello destro, sotto il pannello Step, c'è la sezione **Anteprima .feature** (o "Preview .feature" in inglese). Mostra in tempo reale il contenuto del vostro scenario esattamente come verrà salvato nel file `.feature`.

---

## Pannello Step / Step Browser (right panel)

Il pannello Step si trova nella colonna destra dell'Editor. Serve per trovare e inserire step nel vostro scenario senza doverli digitare a mano.

### Filtro per area

In cima al pannello ci sono i **pill/bottoni area** (uno per ogni dominio: `auth`, `orders`, `imported`, ecc.). Cliccate su un'area per vedere solo i suoi step. Cliccate **All / Tutti** per tornare alla vista completa.

### Indicatori sul badge di ogni step

Ogni step nel pannello mostra:

| Indicatore | Significato |
|---|---|
| **G** (teal) | Suggerimento keyword: Given |
| **W** (blu) | Suggerimento keyword: When |
| **T** (viola) | Suggerimento keyword: Then |
| Badge area | Area di appartenenza (es. `auth`) |
| **{P}** | Step con parametri, testo libero |
| **● ~** | Step con parametri, valori predefiniti disponibili |
| Punto colorato a sinistra | Step con prerequisiti (dipendenze) |

> Il sistema suggerisce automaticamente la keyword (G/W/T) in base al testo dello step, ma potete cambiarla nel picker.

### Inserire uno step senza parametri

Cliccate sulla riga: lo step viene inserito direttamente nell'editor alla posizione del cursore, con la keyword suggerita e l'indentazione corretta (4 spazi).

Esempio — cliccando su `I am logged in as a "standard" user` inserisce:
```
    Given I am logged in as a "standard" user
```

### Inserire uno step CON parametri

Se lo step ha parametri (indicati da `{string}` o `{int}` nell'espressione), cliccando si apre il **Picker parametri** (StepParamPicker):

1. Vedete l'espressione con i placeholder evidenziati in colore
2. Scegliete la keyword (Given / When / Then)
3. Per ogni parametro:
   - Se esistono **valori predefiniti**: appare un menu a tendina — scegliete il valore
   - Se il campo è **testo libero**: digitate il valore nella casella di testo
4. L'anteprima in basso mostra la riga esatta che verrà inserita
5. Cliccate **Insert step** (o premete Invio) per inserirla nell'editor

Esempio — step `I add {string} to the basket` con valori predefiniti:
```
Picker aperto:
  Product name: [Aspirin 500mg ▼]   ← dropdown con valori noti
  Preview: "    When I add 'Aspirin 500mg' to the basket"
```

### Tooltip dipendenze

Se uno step ha un punto colorato sul lato sinistro, passateci sopra con il mouse: appare un tooltip che mostra gli step **prerequisiti** da includere prima nel vostro scenario.

Esempio — `I proceed to checkout` richiede che prima abbiate aggiunto un prodotto al carrello:
```
Requires:
  • I add {string} to the basket
```

### Navigazione da tastiera nel pannello Step

- **↑ ↓** per navigare nella lista
- **Invio** per selezionare lo step evidenziato

---

## Import di scenari esistenti / Importing existing scenarios

Se avete già degli scenari scritti in un file di testo, potete importarli nell'Editor.

### Come si fa

Nella parte bassa della colonna sinistra c'è la **zona di import** (bordo tratteggiato):

1. **Trascinate** un file `.txt` sulla zona tratteggiata, oppure
2. **Cliccate** sulla zona per aprire il file picker e selezionate il file

Vengono accettati file `.txt` e `.feature`.

### Cosa succede dopo l'import

- Il contenuto del file viene caricato nell'editor
- Il sistema analizza gli step presenti nel file
- Gli step già nel catalogo vengono riconosciuti automaticamente
- Gli step **nuovi** (non ancora nel catalogo) vengono aggiunti come `wanted`
- Un messaggio di conferma mostra: **N step nuovi**, **M skippati** (già presenti)

Esempio di messaggio di successo:
```
Import completato — 3 step nuovi, 12 skippati
  src/features/checkout/checkout.feature
```

### Cosa non fa l'import

L'import non implementa automaticamente i nuovi step: li marca come `wanted` (da fare). Steve e il team di sviluppo li implementeranno in seguito.

---

## Download del file .feature / Downloading the .feature file

Una volta scritto o importato il vostro scenario, potete scaricarlo come file `.feature`:

1. Cliccate il pulsante **Download .feature** (in alto a destra nella pagina Editor)
2. Il browser scarica automaticamente il file con il nome ricavato dalla prima riga `Feature:` del vostro scenario

Esempio: se avete scritto `Feature: Checkout con carta`, il file si chiamerà `checkout-con-carta.feature`.

---

## Pagina Feature / Features page

La pagina **Feature** (o "Feature Files") mostra tutti i file `.feature` già presenti nel progetto.

### Come funziona

- **Colonna sinistra:** lista di tutti i file `.feature` con nome, area e numero di scenari
- **Colonna destra:** anteprima del contenuto del file selezionato

Cliccate su un file nella lista per vedere il suo contenuto nell'anteprima a destra.

---

## Lingua e tema / Language and theme

### Cambiare lingua

In alto a destra nella navbar c'è il pulsante lingua. Mostra **IT** quando siete in inglese (cliccate per passare all'italiano) e **EN** quando siete in italiano.

Le etichette dell'interfaccia cambiano subito; il contenuto dei vostri scenari non viene toccato.

### Cambiare tema

Il pulsante con l'icona sole/luna (accanto alla lingua) alterna tra tema **chiaro** e tema **scuro**. La preferenza viene ricordata.

---

## Consigli pratici / Practical tips

### Prima di scrivere uno scenario

1. Andate sul **Catalogo** e cercate gli step che vi servono
2. Per ogni azione che volete testare, trovate lo step corrispondente già approvato
3. Se nessuno step copre la vostra necessità, segnalate la richiesta a Steve prima di inventarne uno

### Usare il pulsante Format

Se l'indentazione del vostro scenario sembra sbagliata (spazi mancanti o in eccesso), premete **⟳ Format** nella toolbar: il sistema riallinea automaticamente tutto il testo secondo le regole Gherkin.

### Verificare l'output prima di scaricare

Controllate sempre il pannello **Anteprima** prima di scaricare il file. Quello che vedete nell'anteprima è esattamente ciò che viene salvato nel `.feature`.

### Step con il pallino dipendenza

Se vedete il punto colorato accanto a uno step nel pannello, controllate il tooltip prima di usarlo: potrebbe richiedere che altri step appaiano prima nel vostro scenario. Seguire l'ordine corretto evita che i test falliscano per ragioni non legate alla funzionalità che state verificando.

---

## Glossario rapido / Quick glossary

| Termine | Significato |
|---|---|
| **Step** | Una singola riga Given/When/Then in uno scenario |
| **Catalogo** | L'elenco ufficiale di tutti gli step approvati |
| **Feature** | Un file `.feature` che contiene uno o più scenari |
| **Scenario** | Un caso di test scritto in Gherkin |
| **Wanted** | Step richiesto ma non ancora implementato dal team tecnico |
| **Implemented** | Step pronto all'uso, con l'automazione dietro |
| **Deprecated** | Step non più valido — non usarlo |
| **Picker** | Finestra che appare quando uno step ha parametri da compilare |
| **Gherkin** | Il linguaggio strutturato (Given/When/Then) usato per scrivere gli scenari |
