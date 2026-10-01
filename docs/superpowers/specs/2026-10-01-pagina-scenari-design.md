# La pagina "Scenari" — design

> Sotto-progetto 1 di 5 del cruscotto. Bozza del 2026-10-01, da approvare.
> Non cambia le tre schermate esistenti: aggiunge una voce nella barra laterale,
> una pagina di **sola lettura piu' Esegui ed Esporta**, e il modo di ricordare
> **come e' andata l'ultima volta** di ogni scenario. La modifica degli scenari
> e' il sotto-progetto 2 e qui ha solo un punto di aggancio.

## Perche' esiste

Il tester registra un test a mano e il sistema ne ricava uno scenario. Poi lo
scenario sparisce. Oggi si ritrova in due posti, e nessuno dei due risponde a
quello che il tester si chiede la mattina dopo:

- in **Esecuzione**, dentro un menu a tendina fatto per scegliere cosa lanciare,
  non per guardare cosa c'e';
- in fondo al **Catalogo**, che e' lo strumento di chi costruisce il metodo, in
  una sezione che elenca titoli ed Esporta e nient'altro.

Le domande del tester sono tre: *cosa ho gia' registrato?*, *funziona ancora?*,
*cosa dice, in parole mie?*. La prima ha una risposta a meta' (l'elenco). La
seconda **non ha risposta**: l'esito di un'esecuzione non si ricorda per
scenario. `reports/cruscotto/<id>.json` dice solo "fallita" per un'esecuzione
intera, senza dire quale scenario ne facesse parte. La terza ha una risposta
sbagliata: il testo del `.feature` si legge solo nel vecchio portale, in un
`<pre>` senza colori.

La pagina Scenari mette insieme le tre risposte, e vale soprattutto la seconda:
un elenco di scenari senza il loro stato e' un indice, e un tester che deve
aprire Esecuzione e lanciare tutto per scoprire cosa e' rosso non ha guadagnato
niente.

### Cosa deve essere vero alla fine

Ogni criterio si verifica a mano o con un caso scritto prima del codice
(sezione "Come si verifica").

| # | Criterio |
|---|---|
| C1 | La barra laterale ha la voce **Scenari** fra Registra ed Esecuzione, attiva su `/scenari`, in italiano e in inglese. |
| C2 | Con **zero scenari** (e' lo stato di oggi sul ramo `per-bdh`) la pagina non mostra errori, tabelle vuote o contatori a zero: dice cosa fare e ha un pulsante **Registra il primo scenario** che porta a `/registra`. |
| C3 | Con degli scenari, ognuno mostra nell'elenco: stato (icona **e** parola), quando e' stato provato, quanto ci ha messo, e se e' rosso a quale passo si e' fermato. |
| C4 | Un esito verde **non si mostra mai** per uno scenario il cui testo e' cambiato dopo quella prova: si dice "modificato dopo l'ultima prova" e conta fra quelli da eseguire. |
| C5 | In alto, quanti scenari sono verdi, quanti rossi, quanti da eseguire; la somma e' sempre il totale. |
| C6 | `/scenari?file=<...>&scenario=<titolo>` apre dritto quello scenario; se non esiste piu' lo dice, senza aprirne un altro in silenzio. |
| C7 | Il testo dello scenario si legge con i colori del Gherkin, e le verifiche a meta' passo (`# durante questo passo si verifica: "..."`) sono rese come informazione, non come un commento grigio. |
| C8 | **Esegui** porta a Esecuzione con quello scenario gia' scelto; **Esporta** scarica il pacchetto di sempre. |
| C9 | Dopo un'esecuzione conclusa, tornando alla pagina l'esito nuovo c'e' gia', senza ricaricare e senza un attimo di esito vecchio. |
| C10 | Tutto si fa da tastiera (frecce nell'elenco, Invio per aprire). Contrasto >= 4,5:1, aree cliccabili >= 40px, focus sempre visibile, da 390 a 1280+ senza scorrimento orizzontale della pagina. |
| C11 | Il tester non vede mai un comando ne' un percorso di file: nell'elenco c'e' il **titolo** dello scenario. |
| C12 | Gli esiti non escono dalla macchina (stanno sotto `reports/`, gitignorato) e la pagina lo dice. |
| C13 | Dal Catalogo la sezione Scenari e' sparita; `npx tsc --noEmit`, `npm run check:all`, `npm run check:i18n`, e in `web-ui` `npm test` e `npm run build` passano. |

## Vincoli

Quelli del cruscotto (`2026-09-22-cruscotto-tester-design.md`), ripetuti perche'
qui pesano di piu' del solito — la pagina e' fatta di righe che differiscono per
un colore:

- **Mai il colore come unico segnale**: ogni esito ha icona (forma diversa) e
  parola. Verde, rosso e grigio da soli non bastano.
- **Contrasto >= 4,5:1** sui testi, nei due temi; i token (`--verde`, `--rosso`,
  `--ambra`, `--blu`, `--testo-tenue`) sono gia' tarati per il tema scuro.
- **Aree cliccabili >= 40px**, focus visibile, 390-1280+.
- **I risultati si leggono dagli artefatti, mai dalla prosa.** L'esito di uno
  scenario si ricava dai messaggi di Cucumber, non da una riga di output.
- **Niente backend con database** (ROADMAP §5): l'esito e' un file JSON sotto
  `reports/`, come tutto il resto dello stato locale.
- **Niente dipendenze nuove.** Il Gherkin colorato si fa con codice nostro (vedi
  "Il testo Gherkin").
- **Nessun nome o indirizzo aziendale**: gli esempi di questo documento usano
  l'applicazione `shop` e il flusso `order`.

## Il design della pagina

### Struttura

Un titolo, una riga di riepilogo, poi due zone: l'elenco e lo scenario.

```
1280 px (barra laterale 240 + contenuto)
+-----------+---------------------------------------------------------------+
| Controllo | Scenari                                                       |
| Registra  | I test che hai registrato e come sono andati l'ultima volta.  |
|>Scenari   |                                                               |
| Esecuzione| [v 4 superati] [x 1 non superato] [o 2 da eseguire]           |
| Catalogo  | Gli esiti sono quelli delle prove fatte su questo computer.   |
|-----------|                                                               |
| Ambiente  | +--------------------+  +----------------------------------+  |
| Lingua    | | (lente) Cerca uno  |  | Il cliente completa l'ordine     |  |
|           | |        scenario    |  | shop · order                     |  |
|           | | 7 scenari trovati  |  |                                  |  |
|           | |                    |  | [Esegui]  [Esporta]              |  |
|           | | NON ANCORA SALVATI |  |                                  |  |
|           | | o Il cliente cerca |  | +- Com'e' andata l'ultima volta -+|  |
|           | |   Mai eseguito     |  | | (x) Non superato al passo 3 di 6||  |
|           | |                    |  | | "il cliente aggiunge Maglia blu"||  |
|           | | shop · order       |  | | Pagina attesa: /carrello        ||  |
|           | |>x Il cliente comp.|  | | Ieri alle 16:36 · 11 s ·        ||  |
|           | |   Passo 3 di 6 .. |  | | ambiente staging                ||  |
|           | | v Il cliente svuo. |  | +---------------------------------+|  |
|           | |   Superato · oggi  |  |                                  |  |
|           | |                    |  | Cosa fa lo scenario              |  |
|           | | shop · search      |  | +----------------------------+   |  |
|           | | v Il cliente cerca |  | |  1 @shop @order @generato  |   |  |
|           | |   Superato · ieri  |  | |  2 Feature: Il cliente ... |   |  |
|           | | ...                |  | |  4   Scenario: ...         |   |  |
|           | | (scorre da sola)   |  | |  5     Given ...           |   |  |
|           | +--------------------+  | |  6     When ...            |   |  |
|           |  colonna 340px          | |        (occhio) Durante ... |   |  |
|           |                         | +----------------------------+   |  |
|           |                         +----------------------------------+  |
+-----------+---------------------------------------------------------------+

390 px (la barra laterale diventa una barra in alto)
+--------------------------------+
| Controllo Registra Scenari ... |
+--------------------------------+
| Scenari                        |
| I test che hai registrato e... |
| [v 4 superati][x 1 non sup.]   |
| [o 2 da eseguire]              |
| Gli esiti sono quelli delle... |
| [(lente) Cerca uno scenario ]  |
| 7 scenari trovati              |
| +----------------------------+ |
| | shop · order               | |
| | >x Il cliente completa...  | |   elenco: al piu' 40% dell'altezza
| |    Passo 3 di 6 · ieri     | |   dello schermo, scorre da solo
| | v  Il cliente svuota...    | |
| +----------------------------+ |
| Il cliente completa l'ordine   |   scenario: sotto l'elenco, compare
| shop · order                   |   solo dopo aver scelto
| [ Esegui ][ Esporta ]          |
| Com'e' andata l'ultima volta   |
| ...                            |
| Cosa fa lo scenario            |
| ...                            |
+--------------------------------+
```

Le due colonne scattano dal breakpoint **900px** della finestra, lo stesso della
barra laterale (`min-[900px]:`), scritto in una sola costante di classe. Il
numero e' una decisione del proprietario, ma l'aritmetica lo mette in
discussione: a 900px il contenuto e' largo 612px, e con l'elenco a 260px allo
scenario ne restano 336. Domanda aperta O1.

Larghezze, da 900px in su: elenco `minmax(260px, 340px)`, scenario il resto, a
sinistra in `position: sticky` con altezza propria e scorrimento interno, cosi'
l'elenco non si perde quando il testo dello scenario e' lungo. Contenuto con
`max-w-screen-xl`, come il Catalogo.

### Gli stati

Sono tutti sul **dato** letto una volta (`GET /api/scenari`, vedi "I dati"), piu'
sul testo dello scenario scelto.

**1. Caricamento (nessun dato ancora).** Scheletro che ha la forma della pagina:
tre rettangoli al posto dei contatori, sei righe d'elenco, un riquadro a destra.
`role="status"` con un testo solo per chi usa uno screen reader ("Sto leggendo
gli scenari…"). L'animazione e' spenta con `prefers-reduced-motion`. Lo
scheletro si vede **solo la prima volta in assoluto**: tornando sulla pagina i
dati di prima restano a schermo mentre si rileggono (lo store condiviso di
`risorsa.ts` lo garantisce).

**2. Errore (nessun dato, la lettura e' fallita).** Una scheda a tutta
larghezza: icona, "Non riesco a leggere gli scenari", una frase che dice cosa
controllare, pulsante **Riprova** (`carica()` riparte dallo scheletro). Se invece
un *aggiornamento* fallisce quando i dati ci sono, restano a schermo quelli di
prima e non si dice niente: e' il comportamento dello store, ed e' giusto perche'
nessun numero cambia.

**3. Vuoto (la lettura e' riuscita, zero scenari).** E' lo stato di oggi su
`per-bdh`, e per un tester appena arrivato e' **la prima schermata che vede
dopo Controllo**: deve essere la migliore. A tutta larghezza, senza contatori,
senza ricerca, senza due colonne:

```
        (icona: cartella con un segno piu')
        Non c'e' ancora nessuno scenario
   Uno scenario nasce da una registrazione: fai il test una
   volta a mano e qui lo ritrovi, pronto da rieseguire.

              [ Registra il primo scenario ]
```

Il pulsante e' un link a `/registra`, primario (`--blu-fondo`, testo bianco).
Se ci sono casi "solo descritti" (tag `@non-automatizzato`: scritti dal team e
mai automatizzati) si aggiunge una riga sotto: "Altri 3 casi sono solo descritti
e non si possono eseguire." Spiega perche' una cartella piena di `.feature` non
compare. Quel numero viene dalla rotta (`soloDescritti`, vedi "I dati").

**4. Elenco con uno scenario scelto.** E' la figura sopra. Su schermo largo, se
la pagina si apre senza indicazioni, e' scelto **il primo scenario dell'elenco
visibile** (in alto c'e' il gruppo "Non ancora salvati" se esiste: e' quello che
il tester ha appena prodotto). Su schermo stretto non si sceglie niente da soli:
la pagina mostra solo l'elenco.

**5. Scenario mai eseguito.** Nell'elenco: icona cerchio tratteggiato (grigio),
"Mai eseguito". Nel pannello, la scheda dell'esito dice **"Mai eseguito su questo
computer"**, e sotto "Premi Esegui per provarlo." L'espressione "su questo
computer" non e' decorativa: uno scenario versionato arrivato con un `git pull`
e' "mai eseguito" qui anche se un collega l'ha provato cento volte (vedi
"Limiti dichiarati").

**6. Scenario rosso.** Nell'elenco: icona croce (rossa), "Non superato al passo 3
di 6", quando. Nel pannello la scheda dell'esito e' il punto della pagina:

```
(x) Non superato al passo 3 di 6
    Il passo: "il cliente aggiunge Maglia blu al carrello"
    Pagina attesa: Carrello (/carrello)
    Indirizzo raggiunto: /prodotti/maglia-blu
    Ieri, 30 settembre alle 16:36 · 11 s · ambiente staging
```

Le due righe "pagina attesa / indirizzo raggiunto" (o "la pagina e' quella giusta
ma manca <elemento>") sono **la stessa frase** che Esecuzione mostra per un passo
fallito. Non si riscrive: si estrae da `PassoTest.tsx` in un piccolo componente
(`FraseFallimento`) usato da entrambi, cosi' i due posti non possono dire cose
diverse dello stesso errore. Se il passo che non parte e' *non collegato al
codice* (Cucumber lo chiama `UNDEFINED`) la frase e' un'altra: "Questo passo non
e' ancora collegato al codice, quindi non puo' partire." Lo screenshot e il
messaggio tecnico **non** stanno qui: sono nell'esecuzione, non nell'indice
(vedi O7).

**7. Scenario modificato dopo l'ultima prova.** Nell'elenco: icona orologio con
freccia, "Modificato dopo l'ultima prova". Nel pannello: "Lo scenario e' stato
modificato dopo l'ultima prova (superato il 30 settembre). Eseguilo di nuovo per
sapere se regge ancora." Conta fra i **da eseguire**. Succede dopo un
`git pull` che porta una versione diversa, dopo una rigenerazione che
sovrascrive, e dopo una modifica fatta col sotto-progetto 2: nessuno di questi
scrittori deve ricordarsi di avvisare qualcuno (vedi "Come si invalida").

**8. Ricerca o filtro senza risultati.** Il testo dell'elenco diventa "Nessuno
scenario corrisponde a «cart»." con il pulsante **Cancella la ricerca**; con un
filtro per esito attivo e nessuno scenario in quello stato: "Nessuno scenario in
questo stato." con **Mostra tutti**. Lo scenario eventualmente aperto resta
aperto a destra: cercare non chiude niente.

**9. Scenario non trovato.** `?file=` che non esiste piu' (rinominato, spostato,
cancellato): al posto del pannello, "Questo scenario non c'e' piu'" con "E' stato
rinominato, spostato o eliminato. Scegline un altro dall'elenco." e il pulsante
**Torna all'elenco**, che toglie i parametri dall'indirizzo. Non si apre un altro
scenario al suo posto: un link che dice una cosa e ne mostra un'altra e' peggio
di un link rotto.

**10. Esiti illeggibili.** Se il file degli esiti c'e' ma non si legge, gli
scenari si mostrano comunque, tutti "da eseguire", e in cima compare una riga
ambra con icona: "Non riesco a leggere gli esiti salvati su questo computer:
finche' non riesegui gli scenari risultano da eseguire." Senza questa riga
saremmo nel danno peggiore del metodo, un numero sbagliato con l'aria giusta.

### Riepilogo e filtro per esito

Tre contatori in una riga, ognuno **un pulsante a due stati** (`aria-pressed`):
**superati**, **non superati**, **da eseguire**. Ognuno ha icona, numero e
parola. Premendone uno, l'elenco mostra solo quegli scenari (premendolo di
nuovo, tutti). I contatori contano **tutti** gli scenari, anche quelli che la
ricerca nasconde: se cambiassero scrivendo nel campo di ricerca, il tester
leggerebbe "2 rossi" mentre ne ha 5.

"Da eseguire" = mai eseguiti **piu'** modificati dopo l'ultima prova. E' una
scelta da confermare (O2): il proprietario aveva chiesto "quanti mai eseguiti".

Subito sotto, una riga piccola: "Gli esiti sono quelli delle prove fatte su
questo computer." (C12).

Il filtro e' un'aggiunta rispetto a quanto deciso: costa una funzione pura e
trasforma tre numeri in un modo di arrivare ai rossi con un clic, che e' esattamente
la domanda "cosa non funziona?". Se il proprietario non lo vuole, i contatori
tornano semplici testi senza toccare il resto.

### Ricerca

Un campo `type="search"` con etichetta (visibile solo agli screen reader) "Cerca
uno scenario". Filtra a ogni tasto, senza attesa: sono al piu' qualche
centinaio di righe in memoria.

- Ignora maiuscole, minuscole e **accenti** ("funzioni" trova "Funzionalita'").
- Piu' parole = **tutte** devono comparire, in qualunque ordine.
- Cerca nel titolo dello scenario, nel nome della Feature, nell'applicazione e
  nel flusso. Non nel testo dei passi (costerebbe una lettura di ogni file).
- Sotto il campo, `role="status"`: "7 scenari trovati" / "Nessuno scenario
  trovato", cosi' chi non vede sa cosa e' successo scrivendo.
- `Esc` nel campo lo svuota. Un "x" visibile fa lo stesso (40px).
- La ricerca **non** va nell'indirizzo (l'indirizzo e' per condividere uno
  scenario, non una vista) e **non** sopravvive a un cambio di pagina.

### Raggruppamento

Primo gruppo, se esiste: **"Registrati, non ancora salvati"** — gli scenari in
`src/features/generated/`, cioe' quelli che il tester ha generato e non ha
ancora messo al loro posto. Poi un gruppo per ogni coppia applicazione/flusso,
ordinati alfabeticamente, con intestazione `shop · order`. Un `.feature`
direttamente sotto `src/features/` o con la sola cartella dell'applicazione non
sparisce: va in "Senza applicazione" o nel gruppo `shop` senza flusso. Nessun
file deve poter diventare invisibile solo per come e' collocato.

Dentro al gruppo, l'ordine dell'elenco di sempre (per file, per riga). I gruppi
**non** si chiudono: con la ricerca e i filtri bastano, e un gruppo chiudibile
vuol dire una cosa in piu' da gestire con la tastiera.

In fondo all'elenco, se ci sono, la riga "Altri N casi sono solo descritti e non
si possono eseguire."

### Selezione e indirizzo

L'indirizzo e': `/scenari?file=<percorso relativo a src/features>&scenario=<titolo>`.
Esempio: `/scenari?file=shop/order/completa-ordine.feature&scenario=Il%20cliente%20completa%20l%27ordine`.

- `file` e' lo stesso valore che `GET /api/scenari` restituisce in `file[].file`.
- `scenario` e' il **titolo**, non la riga: la riga cambia a ogni modifica, il
  titolo no. Se manca, o il file ha un solo scenario, si apre il primo del file;
  se il titolo non c'e' piu' in un file che esiste, il primo del file.
  Se il file non esiste: stato 9.
- Scegliere uno scenario scrive l'indirizzo con `router.replace` (non `push`):
  dopo cinque scelte il tasto Indietro riporta alla pagina da cui si veniva, non
  allo scenario di prima.
- Sono parametri **non fidati**: servono solo a scegliere dentro l'elenco che il
  server ha gia' dato. Il percorso che arriva al server (per leggere il testo,
  per esportare) passa dalle stesse guardie di sempre (`dentroLaCartellaSuDisco`).
- Per lanciare lo scenario, l'indirizzo si costruisce da `file` e dalla riga che
  l'elenco dichiara in quel momento: `/esecuzione?scenario=src/features/<file>:<riga>`.
  La costruzione e la validazione stanno in un solo posto (vedi `percorso-scenario.ts`).

Questo indirizzo e' anche **il contratto con il resto**: il Catalogo, un
messaggio al collega e il futuro "Modifica" lo usano per puntare a uno scenario.

### Tastiera e accessibilita'

L'elenco e' una **listbox**, perche' le frecce e Invio sono la richiesta e il
ruolo che le promette:

| Elemento | Ruolo / attributi |
|---|---|
| Titolo pagina | `h1` |
| Contatori | gruppo con etichetta; tre `button` con `aria-pressed` |
| Campo di ricerca | `input type="search"`, `label` per screen reader, `aria-controls` verso l'elenco |
| Conteggio risultati | `role="status"` (educato, non interrompe) |
| Elenco | `role="listbox"`, `aria-label` "Elenco degli scenari" |
| Gruppo (applicazione/flusso) | `role="group"` con `aria-labelledby` verso la sua intestazione |
| Scenario | `role="option"`, `aria-selected`, un solo `tabindex="0"` (quello attivo), gli altri `-1` |
| Pannello | `<section aria-labelledby>` con il titolo dello scenario (`h2`, `tabindex="-1"`) |
| Esito di un'icona | l'icona e' `aria-hidden`; la parola e' testo vero, e fa parte del nome accessibile dell'opzione |
| Annuncio al cambio | un `role="status"` fuori schermo: "Aperto: <titolo>" |

Tastiera:

- `Tab` entra nell'elenco **una volta sola** (sull'opzione attiva, che e' la
  scelta, o la prima) e ne esce con il `Tab` successivo, verso Esegui.
- `Freccia giu'` / `Freccia su`: spostano il **fuoco** all'opzione seguente o
  precedente, saltando le intestazioni. Non scelgono: scegliere a ogni freccia
  vorrebbe dire leggere un file a ogni pressione.
- `Home` / `Fine`: prima e ultima. Niente giro continuo: ai capi ci si ferma.
- `Invio` o `Spazio`: sceglie. Il fuoco resta nell'elenco (si puo' continuare a
  scorrere); l'annuncio dice cosa si e' aperto.
- Su schermo stretto, dove il pannello sta sotto, **scegliere sposta il fuoco
  sul titolo del pannello** e lo porta in vista. Su schermo largo no: il
  pannello e' gia' li' accanto.
- `Esc` nella ricerca la svuota. Scrivere nell'elenco non fa niente (per
  cercare c'e' il campo).

Il fuoco e' sempre visibile (`outline` da 2px, colore `--blu`, come il resto). Con
i colori forzati di Windows le icone restano distinguibili perche' hanno forme
diverse (spunta, croce, cerchio tratteggiato, orologio).

### Responsive

| Larghezza finestra | Disposizione |
|---|---|
| >= 900px (O1: si propone 1100px) | due colonne: elenco a sinistra, scenario a destra |
| < 900px | una colonna: contatori, ricerca, elenco, **poi** scenario |

Sotto la soglia: l'elenco ha altezza massima `40vh` e scorre da se', cosi' non
spinge lo scenario fuori dallo schermo; i contatori vanno a capo; Esegui ed
Esporta occupano meta' riga ciascuno. Il testo Gherkin va a capo (`pre-wrap`,
`overflow-wrap: anywhere`): **nessuno scorrimento orizzontale**, nemmeno per un
passo lungo. Provato a 390, 768, 899, 900, 1024, 1280, 1920, e a zoom 200%.

### Il testo Gherkin

Le opzioni erano due, e la scelta e' netta.

| | Riusare `GherkinEditor.tsx` (CodeMirror 6) | Un evidenziatore proprio, piccolo |
|---|---|---|
| Sola lettura | **non c'e'** la prop: va aggiunta (`EditorState.readOnly`, `EditorView.editable`) e il componente va toccato | non applicabile: non e' modificabile |
| Cio' che porta dietro | autocompletamento, linter che chiama `/api/lint` a ogni testo, sottolineatura "step non nel catalogo" con click che propone, cronologia, piega righe | niente di tutto cio' |
| Peso | CodeMirror finisce nel pacchetto della pagina (oggi e' solo nel portale) | poche centinaia di byte di codice |
| Altezza | `minHeight: 400px` fisso, anche per uno scenario di cinque righe | quella del testo |
| Verifiche a meta' passo | un commento come un altro, a meno di scrivere un widget CodeMirror | una riga con la sua icona: e' un `switch` in piu' |
| Accessibilita' | un editor e' un controllo complesso per chi usa uno screen reader; una pagina di sola lettura non ne ha bisogno | testo vero, ordinato per righe, selezionabile e copiabile |
| Il tester non si sporca | rischio di vedere sottolineato "step non in catalogo" su uno scenario che per lui e' giusto | no |

**Scelta: un evidenziatore proprio.** E' una funzione pura che trasforma il testo
in righe tipizzate (`tokenizzaGherkin`) e un componente che le disegna
(`GherkinLeggibile`). La funzione si prova con vitest, in ambiente node, senza
alcun test di componente — che e' esattamente quello che il progetto sa fare.
Il sotto-progetto 2, quando servira' modificare, usera' `GherkinEditor`: **li' e'
l'editor che serve**, e il passaggio da lettura a modifica e' proprio il momento
in cui un componente prende il posto dell'altro.

Righe riconosciute, ognuna con il suo aspetto (il colore **rinforza**, il testo
resta leggibile da solo):

| Riga | Aspetto |
|---|---|
| `@tag` | tenue, in corpo piccolo |
| `Feature:` `Scenario:` `Scenario Outline:` `Background:` `Rule:` `Examples:` | parola chiave in grassetto e `--blu`; il titolo in `--testo`, grassetto |
| `Given` `When` `Then` `And` `But` `*` | parola chiave in `--blu`, grassetto, larghezza fissa cosi' i passi si allineano; il resto del passo in `--testo` |
| testo fra virgolette dentro un passo | `--verde`, **sottolineatura sottile**: i valori si vedono anche senza colori |
| `# durante questo passo si verifica: "X"` | riga a se', rientrata sotto il suo passo, con icona (occhio) e la frase tradotta "Durante questo passo si verifica: X", su fondo `--superficie-tenue` |
| altri commenti `# ...` | tenui, corsivo |
| tabelle `\| a \| b \|` | a colonne allineate, tenui i separatori |
| descrizione libera sotto `Feature:` | testo normale |
| `# language: it` o parole chiave non inglesi | **non si interpreta**: le righe restano testo semplice. Il progetto scrive Gherkin inglese; meglio non colorare che colorare male |

Le verifiche a meta' passo meritano il trattamento speciale perche' sono la
risposta alla domanda "cosa controlla davvero questo test?" per il tester che le
ha dichiarate registrando. Il generatore le scrive in italiano, con un prefisso
fisso (`scripts/lib/generate-emit.ts`, riga `# durante questo passo si verifica:`);
il tokenizzatore lo riconosce, e un **caso di contratto** (stesso metodo di
`catalogo-fixtures.contratto.test.ts`) legge quel file e fallisce se il prefisso
cambia da una parte sola. L'etichetta mostrata e' in `messages/*.json`, quindi si
traduce; il testo fra virgolette resta quello del tester.

I numeri di riga stanno in un contatore CSS (`::before`), non nel testo: copiando
lo scenario non si portano dietro i numeri. Sono tenui e opzionali (si leggono
bene anche senza).

**Dove si legge il testo.** Da `GET /api/download?file=<file>`, che c'e' gia' e ha
le guardie (percorso, estensione, collegamenti simbolici). Risponde con
`Content-Disposition: attachment`, ma `fetch` lo ignora. Il testo di uno scenario
sta in una piccola cache **a chiave `file@impronta`** (vedi "I dati"): quando il
file cambia cambia l'impronta, e la voce vecchia non si legge piu', senza che
nessuno debba invalidare niente. Massimo 30 voci; la piu' vecchia esce.

Su schermo si mostra **il file intero**, non solo lo scenario scelto: un file
registrato ha un solo scenario, e un file scritto a mano con piu' scenari si
legge meglio nel suo contesto (con il suo `Background`). Se gli scenari sono piu'
d'uno, la riga `Scenario:` di quello scelto ha una barra laterale `--blu` e viene
portata in vista. Tagliare il file per mostrare un solo scenario richiede di
capire dove finiscono le tabelle `Examples` e i tag — complica per un guadagno
che oggi non serve.

## I dati

### La risposta di `GET /api/scenari`

Si **estende** la rotta che c'e' gia', invece di aprirne una accanto: la
schermata ha bisogno dell'elenco e degli esiti insieme, hanno lo stesso momento
di invalidazione (dopo una prova, dopo un salvataggio), e uno stato di
caricamento solo e' piu' semplice di due.

```ts
interface RispostaScenari {
  file: FileScenari[];
  /** Quanti scenari sono solo descritti (@non-automatizzato), in tutti i file. */
  soloDescritti: number;
  /** 'illeggibile': il file degli esiti c'e' ma non si legge. */
  esiti: 'ok' | 'illeggibile';
}

interface FileScenari {            // c'era gia': due campi in piu'
  file: string; nome: string; generato: boolean; nonAutomatizzati: number;
  impronta: string;                // hash del testo, vedi sotto
  scenari: Array<{
    nome: string;
    riga: number;
    ultimoEsito: UltimoEsito | null;   // null = mai eseguito su questo computer
  }>;
}

interface UltimoEsito {
  esito: 'passato' | 'fallito';
  quando: string;                  // ISO, la fine dello scenario
  durataMs: number;
  ambiente: string;                // il nome dell'ambiente su cui giro'
  aggiornato: boolean;             // false = il testo e' cambiato dopo quella prova
  passoFallito?: {                 // solo se esito = 'fallito'
    numero: number;                // 1-based, fra i passi dello scenario
    totale: number;
    testo: string;
    motivo: 'errore' | 'non-collegato';
    riepilogo?: RiepilogoErrore;   // il tipo che c'e' gia' in artefatti.ts
  };
}
```

Cio' che **non** c'e': messaggio d'errore grezzo, screenshot, stack, righe di
output. Un esito pesa poche centinaia di byte e non porta con se' niente che sia
stato digitato o catturato.

`elencaScenari(cartella)` non cambia firma; si aggiunge accanto
`riepilogaScenari(cartella)` che, nello stesso passaggio sui file, restituisce
anche `soloDescritti` (oggi i file senza scenari eseguibili vengono scartati e il
loro conteggio si perde). `elencaScenari` diventa un sottile involucro.
`impronta` si calcola sul testo che la funzione ha **gia'** letto: nessuna
lettura in piu'.

La rotta aggiunge poi `ultimoEsito` unendo l'elenco con il file degli esiti.
Quella unione e' una **funzione pura** (`unisciEsiti`), non codice dentro la
rotta: si prova senza server.

### Dove si legge l'esito: due approcci

Il problema: l'esecuzione di un test scrive `reports/cruscotto/<id>.json` con
`{id, nome, stato, avvio, codice, fine}`, che non dice quali scenari c'erano; i
messaggi di Cucumber stanno in `reports/cruscotto/test-<id>.ndjson`. Un'esecuzione
puo' contenere piu' scenari; `pickle.uri` ha le barre rovesciate su Windows; ci
sono oggi 99 file `test-*.json` e 12 `.ndjson` (200-300 KB l'uno: dentro ci sono
i sorgenti di tutti i `.feature` e gli screenshot in base64); e F20 prevede di
tenere solo gli ultimi N file di `reports/cruscotto`.

**Approccio A — un indice scritto a fine esecuzione.**
Quando un test finisce, il server legge il suo `.ndjson` **una volta**, ne ricava
un esito per scenario, e li fonde in `reports/esiti-scenari.json`.

**Approccio B — ricostruzione dai `.ndjson` a richiesta.**
Ogni `GET /api/scenari` scorre i `test-*.ndjson` dal piu' recente e, per ogni
scenario, prende il primo esito che trova.

| | A. Indice | B. Ricostruzione |
|---|---|---|
| Costo di una lettura | un JSON da poche decine di KB | tutti i `.ndjson` (oggi 12 x 250 KB; a 100 prove con screenshot, decine di MB): da centinaia di millisecondi a secondi, a ogni apertura della pagina |
| Mitigazione | non serve | una cache in memoria per file (per data di modifica): la prima apertura resta lenta, e a ogni riavvio dell'app si ricomincia |
| Che cosa perde con **F20** | niente: l'indice non dipende dai file di stato | **tutto cio' che e' piu' vecchio degli N file tenuti**. Uno scenario provato un mese fa e poi non piu' diventerebbe "mai eseguito" in silenzio: un numero sbagliato con l'aria giusta |
| Si lega a F20 | no: F20 puo' cancellare molto piu' aggressivamente (i `.ndjson` pesano per gli screenshot) | si: bisogna decidere quanto tenere pensando agli esiti, non ai megabyte |
| Nuove scritture | una (a fine prova) | nessuna |
| Nuovi modi di rompersi | scrittura fallita o interrotta (app chiusa a meta' prova, disco pieno): l'esito manca o e' vecchio; indice corrotto | nessuno |
| Due fonti che possono divergere | si, indice e `.ndjson`: mitigato derivando l'indice **dalla stessa funzione** che legge i messaggi | no, una fonte sola |
| Ambiente su cui e' girato | si puo' registrare: la rotta `avvia` ha i parametri | **non e' nei messaggi ne' nel file di stato**: va aggiunto comunque al registro |
| Vecchie prove | non le conosce (parte da zero) | le legge, ma quelle di prima del 24 settembre non hanno i messaggi e quelle di scenari spostati hanno un percorso che non esiste piu' |

**Raccomandazione: A.** Il costo di B non e' la lentezza, che si mitiga, ma il
legame con la pulizia di `reports/cruscotto` (F20): B regge solo se nessuno
cancella i `.ndjson`, e F20 e' una voce aperta della lista che li cancella. Con A
l'esito vive in un posto che nessuna pulizia tocca. Il rischio di A — due fonti —
si contiene facendo estrarre l'indice dalla stessa lettura dei messaggi che
usa Esecuzione (una sola funzione, vedi "Componenti"), e rendendo l'indice
**scartabile**: perderlo costa "mai eseguito", mai un numero sbagliato.

**Niente ricostruzione dei vecchi `.ndjson`** al primo avvio (O6): non ci sono
scenari salvati su questo ramo, quelli di prima del 24 settembre non hanno i
messaggi, e riempire l'indice con prove di scenari che hanno cambiato posto
produce voci orfane. Un indice che parte vuoto e' onesto: "mai eseguito su questo
computer".

### Cosa si salva, e quando

File: **`reports/esiti-scenari.json`**, non dentro `reports/cruscotto/`: quella
cartella e' il bersaglio della pulizia F20 (e contiene altri file di stato, come
il manifesto della generazione); un file di un'altra natura non deve stare dove
una pulizia per numero potrebbe portarselo via. E' gia' coperto da `.gitignore`
(`reports/`).

```json
{
  "versione": 1,
  "voci": [
    {
      "file": "shop/order/completa-ordine.feature",
      "nome": "Il cliente completa l'ordine",
      "esito": "fallito",
      "quando": "2026-09-30T14:36:53.739Z",
      "durataMs": 10992,
      "ambiente": "staging",
      "esecuzione": "test-muo7kv2k",
      "impronta": "9f2c1e7a40b3d518",
      "passoFallito": { "numero": 3, "totale": 6, "testo": "il cliente aggiunge Maglia blu al carrello", "motivo": "errore", "riepilogo": { "primaRiga": "...", "paginaAttesa": "...", "indirizzoOra": "..." } }
    }
  ]
}
```

**Chiave di una voce:** `file` + `nome`. Con `file` normalizzato: il
`pickle.uri` dei messaggi arriva come `src\features\shop\order\x.feature` su
Windows; si porta a barre in avanti e si toglie il prefisso `src/features/`, per
coincidere con `FileScenari.file`. Il `nome` e' quello della **definizione**
nel `gherkinDocument` (non quello del `pickle`: per uno `Scenario Outline` il
pickle sostituisce i segnaposto, e `Login <utente>` diventerebbe tre nomi che
nessun elenco conosce). Per risalire dal `pickle` alla definizione si usa
`pickle.astNodeIds[0]`, che e' l'id del nodo `Scenario` nel `gherkinDocument`
dello stesso `.ndjson`; si guarda dentro `children[].scenario` e dentro
`children[].rule.children[].scenario`.

**Come si ricava l'esito di uno scenario**, in una sola passata sui messaggi:

1. si raggruppano i `testStepFinished` per `testCaseStartedId`, e si prende solo
   il tentativo che non ha `willBeRetried: true`;
2. un caso **senza** `testCaseFinished` (il processo e' stato ucciso a meta') non
   produce niente: non e' ne' rosso ne' verde;
3. `fallito` se almeno un passo ha stato `FAILED` o `AMBIGUOUS`; **anche** se un
   passo e' `UNDEFINED` o `PENDING` senza altri fallimenti (`motivo:
   'non-collegato'`): uno scenario che non puo' partire non e' verde;
4. `passato` altrimenti. `testRunFinished.success` **non** si guarda: dice
   com'e' andata l'esecuzione intera, e lo scenario A puo' essere verde mentre il
   B della stessa esecuzione e' rosso;
5. `durataMs` da `testCaseStarted.timestamp` a `testCaseFinished.timestamp`;
   `quando` e' quest'ultimo;
6. `impronta` e' l'hash del testo del **sorgente contenuto nei messaggi** (il
   messaggio `source` di quel file), non del file letto dopo: se il file cambia
   mentre il test gira, l'impronta e' comunque quella di cio' che e' girato;
7. un `Scenario Outline` con piu' esempi da' **una voce sola**: rossa se anche un
   solo esempio lo e', con il primo passo fallito trovato.

**L'impronta** e' l'hash (sha-1, primi 16 caratteri) del testo con i fine riga
portati a `\n`. Lo stesso `improntaDiTesto()` serve all'elenco (`FileScenari.impronta`)
e all'estrazione: una funzione, un posto. Normalizzare i fine riga evita che un
checkout con `autocrlf` faccia diventare "modificato" cio' che non lo e'.

**Quando si scrive.** In `registro.ts`, nel `onFine` di un'esecuzione di nome
`test`, **prima** di impostare lo stato finale (`conclusa`/`fallita`):

```
onFine(codice):
   se e' 'interrotta' -> niente (come oggi: ritorna subito)
   se nome = 'test'   -> estrai le voci dal .ndjson e fondile nell'indice
   poi: stato = conclusa/fallita, fine = adesso, salva()
```

L'ordine importa: l'evento `fine` del flusso SSE parte appena lo stato non e' piu'
`in corso`, e la finestra rilegge `GET /api/scenari` subito. Se l'indice si
scrivesse dopo, la rilettura vedrebbe l'esito **vecchio** — proprio il difetto
che C9 vieta. L'estrazione e' sincrona: la lettura piu' pesante (un'esecuzione
tutta rossa, con screenshot) e' di qualche decina di MB, cioe' qualche centinaio
di millisecondi, e su una macchina di tester e' accettabile; non si complica con
un caso asincrono finche' non serve.

Un'esecuzione **interrotta** (il tester ha premuto Interrompi) non scrive
niente: i messaggi sono tagliati, e un esito dedotto da meta' esecuzione e' un
numero che sembra giusto. Un errore nell'estrazione o nella scrittura **non
cambia l'esito dell'esecuzione**: stesso criterio di `salva()` oggi (lo stato su
disco e' un servizio, non un requisito).

**Come si fonde.** Una voce nuova sostituisce quella con la stessa chiave se la
sua `quando` e' piu' recente o uguale (un orologio che torna indietro non
cancella un esito piu' nuovo). Le voci di file che **non esistono piu'** sotto
`src/features/` si scartano al momento della scrittura: l'indice non cresce
all'infinito con gli scenari cancellati. La scrittura e' atomica (file
temporaneo + rinomina): una scrittura interrotta non lascia un indice a meta'.
Se all'apertura l'indice non e' leggibile, lo si **rinomina** in
`esiti-scenari.json.illeggibile` prima di scriverne uno nuovo (non si butta una
cosa che qualcuno potrebbe voler guardare), e la lettura dice `illeggibile` fino
alla prossima prova.

L'esecuzione e' una alla volta per i comandi lunghi (`test` e' in `LUNGHI`), e la
fusione e' sincrona nello stesso processo: due fusioni non si intrecciano.

### Come si invalida

Due livelli, perche' sono due problemi diversi.

**Lato server: la validita' dell'esito.** Non c'e' niente da invalidare, perche'
l'impronta lo fa da sola. `ultimoEsito.aggiornato` e' vero solo se l'impronta
della voce e quella del file *adesso* coincidono. Cosi' i tre eventi dell'elenco:

| Evento | Cosa succede all'esito |
|---|---|
| Dopo un'esecuzione | l'indice viene riscritto prima della fine (sopra) |
| Dopo un **salvataggio** da Registra | il file si sposta da `generated/x.feature` a `shop/order/x.feature` e prende i tag `@shop @order`: **cambia chiave e cambia testo**, quindi lo scenario salvato risulta "mai eseguito". E' vero: non e' mai girato *dov'e' adesso* |
| Dopo una **rigenerazione** che sovrascrive il file | il testo cambia, l'impronta non coincide: "modificato dopo l'ultima prova", e conta fra i da eseguire |
| Dopo una **modifica** (sotto-progetto 2) o un `git pull` che cambia il file | idem. Chi scrive il file non deve avvisare nessuno |

Il salvataggio fa perdere l'esito di una prova fatta *prima* di salvare. Si
accetta: il caso e' raro (si prova di solito dopo aver salvato, Registra stesso
porta a Esecuzione con lo scenario preselezionato), e il costo di sapere "dove e'
andato" (spostare la voce, ricalcolare l'impronta dopo l'aggiunta dei tag) e'
sproporzionato.

**Lato client: quando rileggere.** Con lo store condiviso di `risorsa.ts`, una
risorsa `scenari` (come `configurazione` e `diagnosi` in `stato-controllo.ts`):

- **All'apertura della pagina**: `useRisorsa` rilegge sempre; i dati di prima
  restano a schermo.
- **Quando la finestra torna in primo piano** (`focus`): `carica()`, perche' la
  prova puo' essere stata lanciata da un'altra scheda.
- **Subito dopo l'evento che li cambia**, anche se la pagina non e' aperta, con
  `ricarica()` (garantisce una lettura partita *dopo* la modifica), cosi' al
  ritorno non c'e' un attimo di dati vecchi:
  - in Esecuzione, quando arriva `fine` del flusso;
  - in `SalvaScenario`, dopo un salvataggio riuscito;
  - in Registra, in `dopoGenerazione`, che oggi aggiorna gia' il catalogo.
  Sono tre righe, in un modulo (`stato-scenari.ts`) che espone
  `dopoUnCambioDegliScenari()`; i componenti non importano lo store.

Non c'e' polling: niente cambia mentre il tester guarda questa pagina, perche' le
prove si lanciano da un'altra.

### Rinominato, spostato, cancellato

| Cosa e' successo | Cosa vede il tester |
|---|---|
| Lo scenario ha cambiato titolo | e' un'altra voce: **mai eseguito**. Quella vecchia resta nell'indice, orfana, e non si mostra |
| Il file e' stato spostato o rinominato | idem: nuova chiave |
| Il file e' stato cancellato | sparisce dall'elenco; la voce dell'indice si scarta alla prossima scrittura |
| Un indirizzo `?file=` punta a uno dei tre | stato 9, "non c'e' piu'" |
| Due scenari con lo stesso titolo nello stesso file | la stessa chiave: l'esito e' del piu' recente dei due. Raro, e il sotto-progetto 2 puo' vietarlo alla radice |

Le voci orfane (stesso file, titolo che non c'e' piu') non si potano: sono
poche, e una potatura sbagliata costerebbe un esito vero. Si accetta una piccola
crescita al posto di un rischio.

### Limiti dichiarati

- **L'esito e' locale.** Sta in `reports/`, che e' fuori da git e resta sulla
  macchina (ROADMAP §5, "taking application data off the machine"). Gli scenari
  si condividono; gli esiti no. Su una macchina appena configurata, o dopo una
  clonazione, tutto e' "mai eseguito". La pagina lo dice due volte: nella riga
  sotto i contatori e in "Mai eseguito su questo computer".
- **Solo l'ultima prova**, non una storia. Trend, "quante volte e' stato rosso
  questo mese" sono un altro lavoro (ROADMAP §5: niente cruscotti di esecuzione
  su misura).
- **Un esito per scenario, qualunque ambiente.** Lo scenario provato su
  `staging` e poi su `produzione` ha l'esito dell'ultima delle due, e la scheda
  dice quale (`ambiente`). Vedi O5.
- **Nessun dettaglio dell'errore oltre alla frase**: lo screenshot e i dettagli
  tecnici restano nell'esecuzione e nei suoi file, che F20 puo' pulire. Vedi O7.

## Componenti e file

Ogni file una responsabilita'. Percorsi sotto `web-ui/` se non indicato.

### Nuovi

| File | Responsabilita' |
|---|---|
| `src/app/(cruscotto)/scenari/page.tsx` | La pagina: legge la selezione dall'indirizzo, compone i componenti, sceglie lo stato (caricamento, errore, vuoto, elenco). Nessuna logica di filtro |
| `src/components/cruscotto/scenari/RiepilogoEsiti.tsx` | I tre contatori-pulsante |
| `src/components/cruscotto/scenari/ElencoScenari.tsx` | Ricerca, listbox, gruppi, tastiera. Riceve gli scenari gia' filtrati |
| `src/components/cruscotto/scenari/RigaScenario.tsx` | Una opzione: icona, titolo, riga d'esito. `memo`: una riga che non cambia non si ridisegna |
| `src/components/cruscotto/scenari/PannelloScenario.tsx` | Titolo, azioni, scheda dell'esito, testo. **Il punto di aggancio di "Modifica"**: la riga delle azioni accetta una proprieta' `altreAzioni?: ReactNode` che oggi nessuno passa |
| `src/components/cruscotto/scenari/SchedaEsito.tsx` | La scheda "Com'e' andata l'ultima volta" nei suoi quattro casi (superato, non superato, mai eseguito, modificato) |
| `src/components/cruscotto/scenari/StatoVuotoScenari.tsx` | Lo stato vuoto con il pulsante |
| `src/components/cruscotto/scenari/ScheletroScenari.tsx` | Lo scheletro della pagina |
| `src/components/cruscotto/FraseFallimento.tsx` | Le righe "pagina attesa / indirizzo raggiunto / manca <elemento>", estratte da `PassoTest.tsx` e usate da entrambi |
| `src/components/GherkinLeggibile.tsx` | Disegna le righe tipizzate (sola lettura, senza CodeMirror) |
| `src/lib/gherkin-lettura.ts` | `tokenizzaGherkin(testo)`: puro, nessun React |
| `src/lib/scenari-elenco.ts` | Puro: `raggruppa`, `cerca`, `filtraPerEsito`, `riepiloga`, `risolviSelezione`, `prossimoIndice` (la regola delle frecce) |
| `src/lib/esiti-da-messaggi.ts` | Puro: dal testo `.ndjson` alle voci d'esito (regole sopra). Usa `analizzaMessaggi` di `artefatti.ts` |
| `src/lib/esiti-scenari.ts` | Disco: `leggiEsiti`, `registraEsiti` (fusione, potatura dei file spariti, scrittura atomica, file illeggibile), `unisciEsiti` (puro) |
| `src/lib/impronta-scenario.ts` | `improntaDiTesto()`: l'hash, in un posto solo |
| `src/lib/percorso-scenario.ts` | `SCENARIO_VALIDO` (spostato da `esecuzione.ts`) e `percorsoScenario(file, riga)`: il percorso che Esecuzione accetta, o `null` |
| `src/lib/formato-quando.ts` | `formattaQuando`, `formattaDurata` (quest'ultima spostata da `esecuzione/page.tsx`) |
| `src/lib/stato-scenari.ts` | La risorsa `scenari` (`creaRisorsa`), `risorsaTesto(file, impronta)` (cache a chiave `file@impronta`, 30 voci), `dopoUnCambioDegliScenari()` |
| `messages/it.json`, `messages/en.json` | Namespace `Scenari` e chiave `Cruscotto.navScenari` (sotto) |

### Toccati

| File | Cosa cambia |
|---|---|
| `src/components/cruscotto/BarraLaterale.tsx` | Una voce in `VOCI`, fra Registra ed Esecuzione: `{ href: '/scenari', chiaveEtichetta: 'navScenari', Icona: ListChecks }`, e `'navScenari'` nel tipo `chiaveEtichetta` |
| `src/app/(cruscotto)/catalogo/page.tsx` | Si toglie la `Sezione` degli scenari, l'import di `SezioneScenari` e dell'icona `ListTree`, e il paragrafo del commento che ne parla |
| `src/components/cruscotto/catalogo/SezioneScenari.tsx` | **Si elimina** |
| `messages/{it,en}.json`, namespace `Catalogo` | Si tolgono `scenariTitolo`, `scenariSottotitolo`, `nessunoScenarioSalvato`, `generato`, `esporta`, `esportaScenario` **solo se un `grep` non trova altri usi** (non l'ho verificato per `esporta`/`generato`) |
| `src/lib/scenari.ts` | `FileScenari` guadagna `impronta`; `riepilogaScenari` accanto a `elencaScenari` |
| `src/app/api/scenari/route.ts` | Compone elenco + esiti, risponde con `RispostaScenari` |
| `src/lib/artefatti.ts` | Si estrae `analizzaMessaggi(testo)`: i casi di prova con uri, definizione, passi, tempi, impronta e compiutezza. `leggiPassiTest` diventa un'applicazione di quella funzione: **il comportamento non cambia**, e `artefatti.test.ts` lo prova |
| `src/lib/registro.ts` | Nel `onFine` di `test`, estrae e registra gli esiti prima dello stato finale |
| `src/lib/esecuzione.ts` | `SCENARIO_VALIDO` si importa da `percorso-scenario.ts` |
| `src/app/(cruscotto)/esecuzione/page.tsx` | Importa `formattaDurata` dal modulo nuovo; chiama `dopoUnCambioDegliScenari()` quando arriva `fine` |
| `src/components/cruscotto/SalvaScenario.tsx` | `dopoUnCambioDegliScenari()` dopo un salvataggio riuscito |
| `src/app/(cruscotto)/registra/page.tsx` | `dopoUnCambioDegliScenari()` in `dopoGenerazione` |
| `src/components/cruscotto/PassoTest.tsx` | Usa `FraseFallimento` |
| `docs/OVERVIEW.md` §6, `docs/TESTER-DASHBOARD-GUIDE.md` | Una riga: dove si vedono gli scenari e come e' andata l'ultima volta |

**Non si tocca:** `GherkinEditor.tsx`, `FeaturePreview.tsx`, `/api/download`,
`/api/scenari/esporta`, `/api/scenari/salva`. La rotta di esportazione e di
lettura del testo si riusano cosi' come sono.

## Testi

Namespace `Scenari`, piu' `Cruscotto.navScenari`. Lo stesso insieme di chiavi in
`it.json` e `en.json` (lo verifica `npm run check:i18n` e un caso di parita',
sotto). Linguaggio da tester: "superato", non "pass"; "prova", non "run";
"passo", non "step"; mai "scenario Gherkin", "pickle", "feature".

| Chiave | Italiano | English |
|---|---|---|
| `Cruscotto.navScenari` | Scenari | Scenarios |
| `titolo` | Scenari | Scenarios |
| `descrizione` | I test che hai registrato e come sono andati l'ultima volta. | The tests you recorded and how they went the last time. |
| `notaEsiti` | Gli esiti sono quelli delle prove fatte su questo computer. | Results come from runs made on this computer. |
| `contaPassati` | {n, plural, one {# superato} other {# superati}} | {n} passed |
| `contaFalliti` | {n, plural, one {# non superato} other {# non superati}} | {n} failed |
| `contaDaEseguire` | {n} da eseguire | {n} to run |
| `filtraPer` | Mostra solo: {stato} | Show only: {stato} |
| `cerca` | Cerca uno scenario | Search scenarios |
| `cercaSegnaposto` | Una parola del titolo | A word from the title |
| `cancellaRicerca` | Cancella la ricerca | Clear search |
| `risultati` | {n, plural, =0 {Nessuno scenario trovato} one {# scenario trovato} other {# scenari trovati}} | {n, plural, =0 {No scenarios found} one {# scenario found} other {# scenarios found}} |
| `nessunRisultato` | Nessuno scenario corrisponde a «{testo}». | No scenario matches “{testo}”. |
| `nessunoInQuelloStato` | Nessuno scenario in questo stato. | No scenarios in this state. |
| `mostraTutti` | Mostra tutti | Show all |
| `elencoAria` | Elenco degli scenari | List of scenarios |
| `gruppoNonSalvati` | Registrati, non ancora salvati | Recorded, not saved yet |
| `gruppoSenzaApp` | Senza applicazione | No application |
| `soloDescritti` | {n, plural, one {Un altro caso è solo descritto e non si può eseguire.} other {Altri # casi sono solo descritti e non si possono eseguire.}} | {n, plural, one {One more case is only described and cannot be run.} other {# more cases are only described and cannot be run.}} |
| `esitoPassato` | Superato | Passed |
| `esitoFallito` | Non superato | Failed |
| `esitoDaEseguire` | Mai eseguito | Never run |
| `esitoModificato` | Modificato dopo l'ultima prova | Changed since the last run |
| `rigaPassato` | Superato · {quando} · {durata} | Passed · {quando} · {durata} |
| `rigaFallito` | Non superato al passo {numero} di {totale} · {quando} | Failed at step {numero} of {totale} · {quando} |
| `quandoOggi` | oggi alle {ora} | today at {ora} |
| `quandoIeri` | ieri alle {ora} | yesterday at {ora} |
| `pannelloAria` | Scenario scelto | Selected scenario |
| `aperto` | Aperto: {nome} | Opened: {nome} |
| `nessunaSelezione` | Scegli uno scenario dall'elenco. | Choose a scenario from the list. |
| `registratoNonSalvato` | Registrato, non ancora salvato | Recorded, not saved yet |
| `appFlusso` | Applicazione {app} · Flusso {flusso} | Application {app} · Flow {flusso} |
| `esegui` | Esegui | Run |
| `eseguiAria` | Esegui lo scenario {nome} | Run the scenario {nome} |
| `eseguiNonDisponibile` | Il nome di questo file contiene caratteri che l'esecuzione non accetta. | This file's name has characters the run does not accept. |
| `esporta` | Esporta | Export |
| `esportaAria` | Esporta lo scenario {nome} | Export the scenario {nome} |
| `esitoTitolo` | Com'è andata l'ultima volta | How it went the last time |
| `dettaglioPassato` | Superato {quando}, in {durata}, sull'ambiente {ambiente}. | Passed {quando}, in {durata}, on the {ambiente} environment. |
| `dettaglioFallito` | Non superato {quando}, in {durata}, sull'ambiente {ambiente}. | Failed {quando}, in {durata}, on the {ambiente} environment. |
| `fermoAlPasso` | Si è fermato al passo {numero} di {totale}: | It stopped at step {numero} of {totale}: |
| `passoNonCollegato` | Questo passo non è ancora collegato al codice, quindi non può partire. | This step is not connected to code yet, so it cannot run. |
| `maiEseguitoTitolo` | Mai eseguito su questo computer | Never run on this computer |
| `maiEseguitoTesto` | Premi Esegui per provarlo. | Press Run to try it. |
| `modificatoTesto` | Lo scenario è stato modificato dopo l'ultima prova ({esito} {quando}). Eseguilo di nuovo per sapere se regge ancora. | The scenario changed after the last run ({esito} {quando}). Run it again to know whether it still holds. |
| `testoTitolo` | Cosa fa lo scenario | What the scenario does |
| `testoAria` | Testo dello scenario | Scenario text |
| `verificaNelPasso` | Durante questo passo si verifica: {testo} | During this step it checks: {testo} |
| `testoCaricamento` | Leggo lo scenario… | Reading the scenario… |
| `testoErrore` | Non riesco a leggere il testo di questo scenario. | I can't read this scenario's text. |
| `riprova` | Riprova | Try again |
| `caricamento` | Sto leggendo gli scenari… | Reading the scenarios… |
| `erroreTitolo` | Non riesco a leggere gli scenari | I can't read the scenarios |
| `erroreTesto` | Controlla che la finestra sia ancora collegata al cruscotto e riprova. | Check that the window is still connected to the dashboard and try again. |
| `esitiIlleggibili` | Non riesco a leggere gli esiti salvati su questo computer: finché non riesegui gli scenari risultano da eseguire. | I can't read the results saved on this computer: until you run the scenarios again they show as to run. |
| `vuotoTitolo` | Non c'è ancora nessuno scenario | There are no scenarios yet |
| `vuotoTesto` | Uno scenario nasce da una registrazione: fai il test una volta a mano e qui lo ritrovi, pronto da rieseguire. | A scenario comes from a recording: do the test once by hand and you will find it here, ready to run again. |
| `vuotoAzione` | Registra il primo scenario | Record your first scenario |
| `nonTrovatoTitolo` | Questo scenario non c'è più | This scenario is gone |
| `nonTrovatoTesto` | È stato rinominato, spostato o eliminato. Scegline un altro dall'elenco. | It was renamed, moved or deleted. Pick another one from the list. |
| `tornaElenco` | Torna all'elenco | Back to the list |


## Come si verifica

Metodo del progetto: **prima il caso che fallisce**, nella direzione scomoda,
poi il codice. Vitest, ambiente node, solo `__tests__/**/*.test.ts`: nessun test
di componente. Ogni caso sta nel file che prende il nome del modulo che prova.

### Casi da scrivere prima

**`__tests__/lib/esiti-da-messaggi.test.ts`** — l'estrazione, la parte dove un
numero puo' essere sbagliato con l'aria giusta. Le fixture sono messaggi
Cucumber minimi scritti nei test, con `shop`/`order`.

- *uno scenario con tutti i passi superati e' `passato`, con durata da inizio a fine caso* — non dal `testRunFinished`.
- *un passo fallito rende lo scenario `fallito` e dice quale: numero, totale, testo.*
- *uno scenario verde in un'esecuzione con `testRunFinished.success: false` resta `passato`* (l'altro scenario era rosso). E' la direzione scomoda: guardare il successo globale darebbe un falso rosso.
- *un passo `UNDEFINED` o `PENDING`, senza passi falliti, NON e' verde: `fallito`, motivo `non-collegato`.*
- *piu' scenari nella stessa esecuzione danno una voce ciascuno, e la chiave e' file + titolo.*
- *i percorsi con barre rovesciate (`src\features\shop\order\x.feature`) diventano `shop/order/x.feature`.*
- *uno `Scenario Outline` con tre esempi, uno rosso: una sola voce, rossa, con il titolo non espanso.*
- *uno scenario dentro una `Rule` si trova.*
- *un caso senza `testCaseFinished` (messaggi tagliati a meta') non produce nessuna voce.*
- *un tentativo con `willBeRetried: true` non conta.*
- *le righe che non sono JSON si saltano e il resto si legge.*
- *l'impronta e' quella del `source` dei messaggi, ed e' uguale con fine riga `\r\n` e `\n`.*
- *una voce non porta mai uno screenshot, il messaggio grezzo o i codici colore:* si controlla l'elenco esatto delle chiavi e che `JSON.stringify` della voce non contenga `data:image`.

**`__tests__/lib/esiti-scenari.test.ts`** — su una cartella temporanea.

- *senza file, `leggiEsiti` risponde "nessun esito", non un errore.*
- *un file corrotto risponde `illeggibile`, e la lettura non lo modifica.*
- *scrivendo dopo un file corrotto, quello vecchio viene conservato come `.illeggibile` e il nuovo e' valido.*
- *un esito nuovo sostituisce quello dello stesso scenario e lascia gli altri.*
- *un esito con `quando` piu' vecchio non sostituisce uno piu' recente.*
- *le voci di un file che non esiste piu' si scartano alla scrittura.*
- *dopo la scrittura non resta un file temporaneo* (atomicita').
- *`unisciEsiti`: `aggiornato` e' vero solo se l'impronta coincide; uno scenario rinominato o in un file spostato risulta `ultimoEsito: null`; una voce orfana non compare.*

**`__tests__/lib/registro.test.ts`** (esiste, si estende; il lanciatore finto c'e' gia').

- *a fine di un `test` concluso l'indice contiene gli scenari di quel `.ndjson`.*
- *a fine di un `test` interrotto l'indice **non cambia**.*
- *quando l'indice viene scritto, lo stato dell'esecuzione e' ancora `in corso`* (l'ordine che regge C9; si prova con un doppio dell'estrazione che guarda `stato(id)` mentre viene chiamato).
- *se l'estrazione lancia, l'esecuzione risulta comunque `conclusa`/`fallita` come prima.*
- *un comando che non e' `test` non tocca l'indice.*

**`__tests__/lib/artefatti.test.ts`** (esiste). Prima del refactoring, si aggiunge
un caso di caratterizzazione per `analizzaMessaggi` (stessa fixture di
`leggiPassiTest`, due scenari) e si lasciano **invariati** i casi esistenti: se
passano dopo l'estrazione, il comportamento non e' cambiato.

**`__tests__/lib/scenari.test.ts`** (esiste).

- *`riepilogaScenari` conta come `soloDescritti` anche i casi dei file che non hanno nessuno scenario eseguibile.*
- *`impronta` e' uguale con `\r\n` e `\n`, e diversa se cambia una parola.*

**`__tests__/lib/scenari-elenco.test.ts`**

- *raggruppa per applicazione/flusso; "Registrati, non ancora salvati" viene per primo.*
- *un file direttamente sotto `src/features/`, o con la sola cartella dell'applicazione, non sparisce.*
- *la ricerca ignora maiuscole e accenti, richiede tutte le parole, cerca in titolo, Feature, applicazione e flusso.*
- *dopo la ricerca i gruppi senza scenari spariscono.*
- *`riepiloga`: verdi, rossi, da eseguire; un esito non aggiornato conta fra i da eseguire; la somma e' sempre il totale, anche con ricerca attiva.*
- *il filtro per esito e la ricerca si compongono.*
- *`risolviSelezione`: file + titolo → quello scenario; titolo inesistente in un file che c'e' → il primo del file; file inesistente → "non trovato"; senza parametri → il primo se la pagina e' larga, nessuno se e' stretta.*
- *`prossimoIndice`: giu' e su, Home e Fine; ai capi non gira; salta le intestazioni.*

**`__tests__/lib/gherkin-lettura.test.ts`**

- *riconosce tag, `Feature`, `Background`, `Scenario`, `Scenario Outline`, `Examples`, i passi con `Given/When/Then/And/But/*`.*
- *il testo fra virgolette dentro un passo diventa un valore a parte, anche con un apostrofo dentro.*
- *`# durante questo passo si verifica: "X"` diventa una verifica a meta' passo con testo `X`, anche se X contiene `'`; un altro commento resta commento.*
- *il file con fine riga `\r\n` da' lo stesso risultato di `\n`.*
- *una tabella, una descrizione libera e una riga vuota hanno il loro tipo.*
- *`# language: it` e passi in italiano restano testo semplice e non lanciano.*
- ***contratto**: il prefisso che il tokenizzatore riconosce e' lo stesso che `scripts/lib/generate-emit.ts` scrive* (il caso legge quel file; fallisce se uno solo dei due cambia).

**`__tests__/lib/formato-quando.test.ts`**

- *"oggi" e "ieri" si decidono sul giorno di calendario, non sulle 24 ore* (con un orario fissato dal test e un orario a ridosso della mezzanotte).
- *una data piu' vecchia si scrive con il formato della lingua scelta.*
- *`formattaDurata` mantiene il comportamento che ha oggi in Esecuzione (secondi con un decimale; sopra il minuto, minuti e secondi), con la virgola in italiano e il punto in inglese.*

**`__tests__/lib/stato-scenari.test.ts`**

- *`risorsaTesto` con la stessa `file@impronta` restituisce la stessa risorsa; con un'impronta diversa, un'altra: il testo vecchio non si serve mai a un file cambiato.*
- *la cache non supera 30 voci.*

**`__tests__/api/scenari.test.ts`** (nuovo, nello stile di `scenari-salva.test.ts`)

- *la risposta ha `file`, `soloDescritti`, `esiti`; con l'indice illeggibile `esiti` e' `illeggibile` e tutti gli `ultimoEsito` sono `null`.*
- *uno scenario con voce valida ha `aggiornato: true`; dopo aver cambiato il file, `false`.*
- *nessun `ultimoEsito` contiene schermate o messaggi grezzi.*

**`__tests__/lib/messaggi-scenari.test.ts`** — parita' dei dizionari: `Scenari` e
`Cruscotto.navScenari` hanno le stesse chiavi in `it` e `en`, e ogni
segnaposto `{nome}` di una lingua c'e' anche nell'altra.

Si prova anche, come sempre: `npx tsc --noEmit`, `npm run check:all` (compreso
`check:args`: in questo documento e nei messaggi i comandi sono in forma nuda),
`npm run check:i18n`, `npm run rules:check`; in `web-ui`, `npm test` e
`npm run build`.

### Controlli a mano

Con un repository che oggi **non ha scenari salvati**, la prima cosa da vedere e'
proprio il vuoto. Per il resto serve un po' di materiale: due `.feature` neutri
in `src/features/shop/order/` (non si versionano: restano locali), uno con un
passo che fallisce di proposito.

1. **Vuoto.** Nessuno scenario: la pagina mostra solo il messaggio e il pulsante;
   il pulsante porta a Registra; la console non ha errori.
2. **Primo contatto.** Con gli scenari ma senza esiti: tutti "Mai eseguito su
   questo computer", contatore "da eseguire" = totale, nessun verde.
3. **Un verde e un rosso.** Esegui uno scenario buono e uno che fallisce, dalla
   pagina. Torna indietro: gli esiti ci sono **subito**, senza un attimo del
   vecchio (C9). Il rosso dice a quale passo, e la frase coincide con quella che
   Esecuzione mostra per lo stesso errore.
4. **Modifica.** Cambia una parola nel `.feature` di uno scenario verde: torna
   "Modificato dopo l'ultima prova", e il contatore "da eseguire" sale. Rimettila
   com'era: torna verde.
5. **Link.** Copia `/scenari?file=...&scenario=...` in una nuova scheda: si apre
   quello scenario. Cambia il titolo nell'indirizzo: "Questo scenario non c'e'
   piu'", e nessun altro aperto.
6. **Ricerca.** Con e senza accenti; due parole; una che non trova niente; `Esc`.
   I contatori non cambiano mentre si scrive.
7. **Tastiera sola.** Dalla barra laterale: Tab arriva ai contatori, alla ricerca,
   all'elenco (un solo punto), a Esegui, a Esporta. Frecce, Home, Fine, Invio. Il
   fuoco si vede sempre.
8. **Screen reader** (NVDA con Chrome o Edge): l'elenco si annuncia come lista di
   opzioni con gruppo e stato ("superato", non solo il colore); scegliere annuncia
   "Aperto: ...".
9. **Larghezze.** 390, 768, 899, 900, 1024, 1280, 1920 e zoom 200%: nessuno
   scorrimento orizzontale della pagina, aree cliccabili >= 40px, a 899 elenco
   sopra e scenario sotto; a 900-1099 lo scenario resta leggibile (O1).
10. **Tema scuro** e **colori forzati** di Windows: le icone si distinguono per
    forma, il contrasto regge (verifica con gli strumenti del browser).
11. **Verifiche a meta' passo.** Uno scenario registrato con una verifica durante
    un passo: la riga si legge come "Durante questo passo si verifica: ...".
12. **Esporta** scarica lo stesso pacchetto di prima.
13. **Catalogo.** Non c'e' piu' la sezione Scenari, e il resto non si e' mosso.
14. **Un esito che sopravvive alla pulizia.** Cancella a mano i
    `reports/cruscotto/test-*.ndjson`: l'elenco degli esiti non cambia (e' il
    motivo per cui si e' scelto A).

## Fuori da questo lavoro

- **La modifica degli scenari** (sotto-progetto 2). Qui c'e' solo il punto di
  aggancio: `PannelloScenario` ha una riga di azioni con `altreAzioni`, oggi
  vuota; l'indirizzo `/scenari?file=&scenario=` e' gia' il modo di indicare cosa
  modificare; `GherkinLeggibile` e' il componente che, in modifica, cede il posto
  a `GherkinEditor`. **Cosa non si deve fare qui:** nessun pulsante "Modifica"
  inattivo (un pulsante che non fa niente e' peggio di uno assente), nessuna
  chiave `modifica` nei messaggi. Quel che il sotto-progetto 2 ottiene gratis:
  scrivendo il file, l'impronta cambia, e l'esito diventa "modificato dopo
  l'ultima prova" senza che il suo codice avvisi nessuno.
- **Lanci multipli e paralleli.** Qui si lancia **uno** scenario, con il flusso
  che Esecuzione ha gia'. L'estrazione degli esiti e' gia' pronta per
  un'esecuzione con piu' scenari (una voce ciascuno): un futuro "esegui tutti
  quelli di questo flusso" trova nell'intestazione del gruppo il posto per il
  pulsante, e non deve toccare l'indice. Il parallelo, invece, rompe l'ipotesi
  "un test alla volta" (`LUNGHI` in `registro.ts`) su cui si regge anche la
  fusione sincrona dell'indice: va ripensata insieme.
- **Le schede del Catalogo.** Il Catalogo potra' dire "questo step e' usato da
  questi scenari" e rimandare qui con `/scenari?file=&scenario=`: e' il contratto,
  non c'e' altro da costruire oggi.
- **Una storia degli esiti**, trend, percentuali nel tempo.
- **Condividere gli esiti fra macchine.** E' un capitolo della sincronizzazione
  (U2) e, per come e' fatto il progetto, comporta portare fuori dati dalla
  macchina.
- **Tradurre le parole chiave del Gherkin** (Given/When/Then) per il tester. Il
  testo dei `.feature` e' un documento del repository: e' uno scenario, non una
  schermata.
- **Aprire uno scenario dal Catalogo/Registra** oltre al contratto dell'indirizzo.
- **Rinominare, spostare o cancellare** uno scenario dalla pagina.
- **La pulizia di `reports/cruscotto` (F20)**: resta un lavoro suo. Qui si
  decide solo che l'indice non sta in quella cartella, cosi' F20 puo' scegliere N
  senza pensare agli esiti. Se si vorra' mostrare lo screenshot di un rosso
  vecchio (O7), F20 dovra' tenere i `.ndjson` degli ultimi rossi.

## Domande aperte

Per il proprietario. Ognuna ha una raccomandazione; nessuna blocca l'inizio dei
lavori, ma O1 e O2 conviene scioglierle prima di scrivere il layout e i
contatori.

| # | Domanda | Opzioni | Raccomandazione |
|---|---|---|---|
| O1 | **Da che larghezza due colonne?** A 900px la barra laterale occupa 240 e il contenuto e' largo 612: elenco 260 + scenario 336, stretto per il Gherkin | (a) 900px, come deciso; (b) 1100px: il contenuto e' 812, elenco 280 + scenario 500 | **(b)**. Sotto, elenco sopra e scenario sotto, che e' piu' leggibile di due colonne strette. La soglia sta in una sola classe: cambiarla dopo costa una riga |
| O2 | **Il terzo contatore: cosa conta?** Gli scenari modificati dopo la prova non sono "mai eseguiti" ma non hanno piu' un esito valido | (a) tre contatori, il terzo "da eseguire" = mai eseguiti + modificati; (b) quattro contatori, aggiungendo "modificati" | **(a)**: tre cifre si leggono in un colpo d'occhio, e il tester agisce nello stesso modo (rieseguire). I due casi restano distinti nell'elenco e nel pannello |
| O3 | **Esegui avvia subito o preseleziona?** | (a) porta a Esecuzione con lo scenario scelto, e li' si preme "Lancia il test"; (b) avvia subito con le impostazioni correnti | **(a)**. Esecuzione ha gli interruttori "Guarda il browser" e "Parti senza sessione" e la scelta dell'ambiente: avviare da un'altra pagina vorrebbe dire duplicarli o decidere per il tester. Costa un clic in piu' |
| O4 | **Solo l'ultima prova o una storia?** | (a) solo l'ultima; (b) le ultime N per scenario | **(a)**. La domanda del tester e' "funziona ancora?". Una storia e' una pagina in piu' (ROADMAP §5) e fa crescere un file che oggi pesa poche decine di KB |
| O5 | **L'esito e' per scenario o per scenario e ambiente?** | (a) l'ultimo, qualunque ambiente, con il nome dell'ambiente scritto; (b) uno per ogni coppia | **(a)**. L'ambiente corrente e' uno solo per la finestra; con (b) bisognerebbe mostrare l'esito *dell'ambiente scelto*, e passare da "staging" a "produzione" cambierebbe i numeri sotto gli occhi |
| O6 | **Si riempie l'indice dai `.ndjson` che ci sono gia'?** | (a) no, parte vuoto; (b) una ricostruzione al primo avvio | **(a)**. Su `per-bdh` non ci sono scenari salvati, i `.ndjson` vecchi non hanno i messaggi o puntano a file spostati; un indice vuoto dice la verita' |
| O7 | **Mostrare lo screenshot di un rosso, e dove?** | (a) no, solo la frase e il passo; (b) un link "Vedi la schermata" che apre l'esecuzione passata in Esecuzione | **(a) ora**, (b) quando serve. Richiede che Esecuzione apra un'esecuzione conclusa per `id` (oggi parte solo dalle live) e che F20 tenga i `.ndjson` dei rossi |
| O8 | **Gli scenari "registrati, non ancora salvati" compaiono?** | (a) si, in un gruppo in cima; (b) no, solo quelli salvati | **(a)**. Sono quelli che il tester ha appena prodotto e vuole ritrovare; nasconderli farebbe sembrare persa una registrazione fresca. Non si possono esportare in modo completo se non sono salvati: l'Esporta funziona come oggi |
| O9 | **I contatori sono anche filtri?** (aggiunta rispetto alla decisione) | (a) si, pulsanti a due stati; (b) solo testi | **(a)**. Costa una funzione pura e risponde a "cosa non funziona?" con un clic |

## Ordine di lavoro

Piccolo, e ogni passo si chiude con i controlli del progetto prima del
successivo.

1. I casi puri, **scritti prima e rossi**: `esiti-da-messaggi`, `esiti-scenari`,
   `scenari-elenco`, `gherkin-lettura`, `formato-quando`, `stato-scenari`,
   parita' dei dizionari. Poi i moduli che li fanno passare.
2. Refactoring di `artefatti.ts` (`analizzaMessaggi`), con il caso di
   caratterizzazione gia' verde prima e dopo.
3. Il collegamento in `registro.ts` e l'estensione di `GET /api/scenari`, con i
   loro casi.
4. I testi in `it.json` / `en.json`, `check:i18n`.
5. I componenti e la pagina; la voce nella barra laterale.
6. `FraseFallimento` condivisa con `PassoTest`; le tre chiamate a
   `dopoUnCambioDegliScenari()`.
7. Tolta la sezione dal Catalogo; documenti (`OVERVIEW.md` §6, guida del tester).
8. Controlli a mano della lista sopra, con gli scenari neutri.
