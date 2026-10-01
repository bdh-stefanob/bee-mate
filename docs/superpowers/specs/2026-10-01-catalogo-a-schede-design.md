# Catalogo a schede — design

> Proposta del 2026-10-01, sotto-progetto 3 di 5 del riordino del cruscotto.
> Direzione gia' approvata dal proprietario: un'intestazione con pochi numeri e
> **tre schede** (Step, Componenti, Da sistemare). Gli scenari escono dal
> Catalogo e vanno nella pagina Scenari (sotto-progetto 2). Qui si decide il
> resto: cosa c'e' in ogni scheda, come e' fatto il componente a schede, cosa si
> sposta e come si verifica. **Niente di questo e' ancora costruito.**

## Perche' esiste

La pagina Catalogo e' stata giudicata "un filo dispersiva". Letta nel codice
(`web-ui/src/app/(cruscotto)/catalogo/page.tsx`), lo e' per tre ragioni precise,
non per gusto:

1. **Quattro domande in una colonna sola.** Step, componenti, disordine e
   scenari si susseguono: per arrivare alla riconciliazione si scorrono tutti
   gli step (storicamente 137) e tutti i componenti. La domanda che ha piu'
   valore per chi mantiene il vocabolario e' l'ultima ma una.
2. **Nessuna sintesi.** Non c'e' un punto in cui si vede in un colpo solo
   "quanti step, quanti pronti, quanti da sistemare". Per saperlo si legge tutto.
3. **Nessun modo di restringere.** Ne' ricerca ne' filtri: con 137 voci e' lungo,
   con 500 e' inutilizzabile. Oggi non si nota perche' sul ramo `per-bdh` il
   catalogo ha **una sola voce** (`the page shows {string}`) e nessuno scenario.

Il lavoro e' quindi tre cose insieme: dare alla pagina una testa (i numeri),
spezzarla in schede, e fare in modo che ogni scheda regga sia il caso quasi
vuoto di oggi sia le centinaia di step di domani.

## Per chi, e per quali domande

Tre persone usano il Catalogo, con frequenze diverse. Il vincolo del cruscotto
resta quello del tester manuale: niente comandi, niente percorsi di file, niente
gergo non spiegato.

| Chi | Quando viene qui | Scheda |
|---|---|---|
| **Tester manuale** (il pubblico del cruscotto) | Dopo aver registrato: "esiste gia' una frase per questo?", "cosa sa fare il sistema?" | **Step** |
| **SDET** (chi mantiene l'automazione) | Prima di toccare una pagina o un componente: "se cambia questo pulsante, quali scenari cadono?" | **Componenti** |
| **Chi mantiene il vocabolario** (gatekeeper del catalogo, vedi `docs/anti-entropy/06-rituale.md`) | Tra un rituale mensile e l'altro: "dove stanno nascendo frasi doppie?" | **Da sistemare** |

La domanda di ogni scheda, in una frase, e' anche il titolo (`h2`) del suo
pannello:

| Scheda | Domanda |
|---|---|
| Step | **Cosa sa fare il sistema oggi?** |
| Componenti | **Se cambio questo elemento della pagina, cosa smette di funzionare?** |
| Da sistemare | **Quali frasi si somigliano troppo?** |

Il tester usa quasi solo la prima. Per questo **Step e' la scheda di apertura**,
e le altre due non gli chiedono niente: un contatore, quando serve, e basta.

## Cosa dice il codice oggi

Verificato leggendo i file, non dalla memoria.

| Fatto | Dove | Conseguenza per questo disegno |
|---|---|---|
| `useCatalogo()` fa un `fetch('/api/catalogo')` dentro un componente e muore con la pagina | `SezioneStep.tsx` | Tornando sulla pagina si riparte dallo scheletro; l'intestazione e le schede non possono condividere il dato. Va nello **store condiviso** (`lib/risorsa.ts`, commit 88171fc) |
| La riconciliazione, dopo una fusione, fa `setCaricamento(true)` e **smonta tutta la lista**, messaggio di esito compreso | `SezioneRiconciliazione.tsx` | Il tester non vede mai "Fuso." (la scheda del doppione sparisce prima). Con lo store la lista resta a schermo mentre si rilegge, e l'esito sta in una striscia a parte |
| L'API degli step **non porta lo stato** (`implemented`/`wanted`/...) ne' l'intento (`doc.intent`), che pure stanno in `step-catalog.json` | `lib/catalogo.ts` (`StepCatalogo`), `tipi.ts` | "Pronti/richiesti" e il filtro per stato non si possono fare senza aggiungere due campi, opzionali e additivi |
| Il tester vede percorsi di file (`{u.file}:{u.riga}`), il nome del file della definizione persa, e il **codice** dei gestori | `SezioneStep.tsx`, `SezioneRiconciliazione.tsx` | Contro il vincolo della specifica del cruscotto. Qui si tolgono i percorsi e si porta il codice dietro "Dettagli tecnici" |
| La coppia "testo quasi uguale, ma almeno uno dei due step **senza componente**" arriva dal motore con `stessoComponente: false` e una spiegazione che dice *"non si puo' concludere"*; la UI la mostra come **Equivoco di denominazione** (rosso, "Distingui") | `riconciliazione.ts`, `SezioneRiconciliazione.tsx` | E' un'affermazione piu' forte di quella del motore. E' il caso piu' comune finche' i 137 step scritti a mano non dichiarano componenti (OVERVIEW §5). Serve un quarto stato, "da verificare" |
| La data dell'aggiornamento usa `toLocaleString()` senza lingua: in finestra italiana esce "9/25/2026, 12:19:15 PM" | `BannerAggiornamento.tsx` | Rilievo del collaudo. Si usa la lingua della finestra |
| La mappa dei componenti e' una tabella con `min-w-[760px]` | `SezioneComponenti.tsx` | Su 390px scorre di lato. Diventa un elenco di righe |
| `fusione` risponde con `catalogoRigenerato: boolean`, ignorato dalla UI | `tipi.ts`, rotta `fondi` | Se e' `false` i numeri sono vecchi e il tester non lo sa. La striscia di esito lo dice |
| Esiste un solo livello di annullamento, e **solo per la fusione**: `riconcilia` (distingui) non salva niente | `fondi/annulla/route.ts`, `riconcilia/route.ts` | Va detto al tester prima di premere, non scoperto dopo |
| `individuaCoppie` confronta tutte le coppie con Levenshtein: O(n^2) | `lib/riconciliazione.ts` | Con 500 step sono 125.000 confronti per richiesta: va misurato (vedi "Rischi") e il conteggio dell'intestazione non deve bloccare il resto |
| In `@base-ui/react` (gia' dipendenza) esiste `Tabs` con `activateOnFocus`, `loopFocus`, `keepMounted` | `node_modules/@base-ui/react/tabs` | Il componente a schede **avvolge** quello, come fanno gia' `select.tsx` e `popover.tsx`: ruoli e frecce non si riscrivono |

## Decisioni di design

Prese in questa proposta, ognuna con il suo perche'. Le piu' discutibili tornano
in "Domande aperte".

| # | Decisione | Perche' |
|---|---|---|
| C1 | Scheda di apertura: **Step**. Aprendo `/catalogo` senza parametri si vede quella | E' la domanda del tester; le altre due si raggiungono dai numeri in testa |
| C2 | La scheda attiva sta nell'indirizzo: `?scheda=step\|componenti\|da-sistemare`. Cambiare scheda **aggiunge** una voce alla cronologia (Indietro funziona); cambiare un filtro la **sostituisce** (Indietro non ripercorre ogni lettera digitata) | Un link porta dritto a una scheda; il tasto Indietro fa quel che ci si aspetta |
| C3 | I numeri in testa sono **link**, non decorazione: ognuno porta alla scheda che mostra quel numero. Nessuna casella usa un filtro: i pulsanti di filtro stanno a un clic, dentro la scheda, e un link da fuori puo' comunque portarci (`urlCatalogo`) | Un numero senza un clic e' una domanda senza risposta |
| C4 | Le schede mostrano **solo il pannello attivo**; i filtri stanno nell'indirizzo, lo stato di apertura delle righe no | Con 500 righe tre pannelli montati tre volte pesano; i dati restano nello store, quindi cambiare scheda e' istantaneo |
| C5 | Liste a **finestra di 50** con "Mostra altri 50", senza virtualizzazione | La ricerca del browser, il lettore di schermo e il focus funzionano senza trucchi; 500 righe chiuse costano poco |
| C6 | Il contatore sulla linguetta compare **solo su "Da sistemare"** e solo se > 0 | E' l'unica scheda che chiede un'azione; sulle altre due il numero e' gia' in testa |
| C7 | Il contatore e le caselle "Da sistemare" contano le coppie su cui **si puo' agire** (doppioni ed equivoci); "da verificare" e "solo da sapere" stanno nel dettaglio | Un contatore che non si puo' azzerare insegna a ignorarlo |
| C8 | Terza scheda: **"Da sistemare"** (non "Ordine") | Vedi la sezione dedicata |
| C9 | I percorsi di file non compaiono mai; compaiono "scenario · applicazione / flusso" | Specifica del cruscotto, e basta derivare l'applicazione e il flusso dal percorso |
| C10 | Il banner di aggiornamento diventa una **riga nell'intestazione**, che si fa avviso solo se serve (in corso, fallito) | Oggi occupa una striscia a piena larghezza anche quando va tutto bene |

## L'intestazione

Titolo, una frase, e quattro numeri. Niente altro prima delle schede.

```
1280 px (contenuto ~976)

Catalogo                                         Aggiornato il 1 ott 2026, 10:56
Le frasi che il sistema conosce, gli elementi delle pagine che toccano,
e dove vanno rimesse in ordine.

+------------------+ +------------------+ +------------------+ +------------------+
| STEP             | | COMPONENTI       | | DA SISTEMARE     | | SCENARI          |
| 137              | | 42               | | (!) 4            | | 12               |
| 10 pronti        | | 61 step su 137   | | coppie da guar-  | | eseguibili       |
| 127 richiesti    | | agganciati       | | dare, + 2 da ver.| |                  |
| Vedi gli step  > | | Vedi i compon. > | | Vedi le coppie > | | Vai agli scen. > |
+------------------+ +------------------+ +------------------+ +------------------+
```

```
390 px (contenuto ~342)

Catalogo
Le frasi che il sistema conosce,
gli elementi delle pagine che
toccano, e dove vanno rimesse in
ordine.
Aggiornato il 1 ott 2026, 10:56

+----------------+ +----------------+
| STEP           | | COMPONENTI     |
| 137            | | 42             |
| 10 pronti      | | 61 step su 137 |
| 127 richiesti  | | agganciati     |
| Vedi gli step >| | Vedi i comp. > |
+----------------+ +----------------+
+----------------+ +----------------+
| DA SISTEMARE   | | SCENARI        |
| (!) 4          | | 12             |
| ...            | | ...            |
+----------------+ +----------------+
```

Griglia a due colonne fino a 1099px, a quattro da 1100px in su (a 900px il
contenuto e' stretto: la barra laterale ne prende 240).

### I numeri e cosa fanno al clic

| Casella | Numero grande | Riga sotto | Clic porta a |
|---|---|---|---|
| **Step** | step totali | "N pronti · M richiesti" (e "K altri" se esistono step proposti o superati) | `?scheda=step` |
| **Componenti** | componenti distinti | "A step su T agganciati a un componente" | `?scheda=componenti` |
| **Da sistemare** | coppie su cui si puo' agire | "Tutto in ordine" se 0; altrimenti "N coppie da guardare" e, se ci sono, "+ K da verificare" | `?scheda=da-sistemare` |
| **Scenari** | scenari eseguibili | "eseguibili" | la pagina Scenari (`/scenari`) |

Perche' queste e non altre:

- **Pronto e richiesto** (`implemented`/`wanted` nel catalogo) sono la misura che
  il progetto cita di piu' (10 pronti, 127 richiesti): vanno in vista.
- **Ancorati**: uno step e' *agganciato* se dichiara almeno un componente. E' il
  numero che oggi dice quanto il catalogo e' collegato alla pagina vera, ed e' il
  rilievo F19 ("Componenti ancorati resta a 0 dopo uno scenario salvato"): vedi
  sotto, "Il numero che resta a zero".
- Il filtro **"solo senza componente"** vive nella scheda Step, non in un
  quinto numero: "pochi numeri" vale piu' di un clic risparmiato.
- Le quattro caselle sono **link interi** (`<a>`), con il testo "Vedi ..."
  incluso: area cliccabile ben oltre i 40px e un nome accessibile completo
  ("Step: 137. 10 pronti, 127 richiesti. Vedi gli step"). Dentro non c'e' nessun
  altro elemento interattivo.
- **"Da sistemare" a zero** non e' vuoto: mostra un segno di spunta e "Tutto in
  ordine". Il segnale e' icona + parola, mai solo il colore; quando e' > 0 il
  bordo e' ambra **e** c'e' il punto esclamativo **e** il numero.

### Stati dell'intestazione

| Stato | Cosa si vede |
|---|---|
| Caricamento | Le quattro caselle compaiono subito con titolo e **barra che pulsa** al posto del numero (`aria-busy`, testo `sr-only` "Carico..."). Ognuna si riempie quando il suo dato arriva: Step e Componenti insieme (stesso dato), Da sistemare dopo (calcolo piu' lento), Scenari per conto suo. La pagina non aspetta la piu' lenta |
| Errore sul catalogo | Le caselle Step e Componenti mostrano "non disponibile"; sotto, **una sola** frase d'errore con il pulsante "Riprova" (oggi l'errore non ha via d'uscita). Le altre due caselle restano |
| Catalogo vuoto (0 step) | Numeri 0, senza giri di parole; la scheda Step spiega come riempirlo |
| Aggiornamento in corso | La riga a destra del titolo dice "Sto aggiornando il catalogo..." con rotellina; le caselle hanno `aria-busy`; e una frase sotto avverte che "i numeri potrebbero non includere ancora l'ultimo scenario salvato" |
| Aggiornamento fallito | Sotto le caselle, un riquadro ambra con icona: "L'ultimo aggiornamento automatico non e' riuscito: ... Quello che vedi e' l'ultimo catalogo buono, non necessariamente quello di oggi." e il pulsante **"Riprova ora"** (lancia il comando `catalogo` dell'elenco chiuso; se un'altra operazione e' in corso risponde "C'e' un'altra operazione in corso: riprova quando finisce") |
| Aggiornato | Una riga discreta: "Aggiornato il 1 ott 2026, 10:56" — data nella **lingua della finestra** (`Intl.DateTimeFormat` con la lingua corrente, non `toLocaleString()` nudo) |
| Mai aggiornato | Niente riga, come oggi: e' lo stato di chi non ha ancora salvato scenari |

### Il numero che resta a zero (F19)

Il rilievo dice che dopo uno scenario salvato "Componenti ancorati" resta a 0. La
causa e' a monte (la rigenerazione del catalogo dopo il salvataggio, ROADMAP §4
punto 3, "Refresh the catalog after generating"), e **non si risolve qui**. Quello
che si risolve qui e' che il numero **non menta in silenzio**:

- l'intestazione sa se e' in corso un aggiornamento e lo dice accanto ai numeri;
- appena l'aggiornamento passa da *in corso* a *ok*, la pagina **rilegge da sola**
  catalogo e coppie (oggi la tabella resta con il numero vecchio, e il banner dice
  solo "aggiornato");
- un aggiornamento fallito lo dice con un riquadro, non con una rotellina che gira.

La regola e' una funzione pura (`dopoAggiornamento(prima, dopo)` → "rileggi?") e
si prova senza browser.

## Le tre schede

### Cose comuni

**Barra degli strumenti** (ricerca, filtri, ordine) sopra la lista, **solo se le
voci sono piu' di 8**. Con una voce, o con tre, una ricerca e' rumore: la lista
sta tutta nello schermo. La soglia e' una costante (`SOGLIA_FILTRI = 8`) e una
funzione pura (`mostraFiltri(n)`).

- **Ricerca**: un campo, senza distinzione di maiuscole e di accenti, con piu'
  parole in AND. Cerca nel testo della frase, nell'intento, nel nome del
  componente e nella pagina. Parametro `q`, scritto nell'indirizzo dopo 250 ms.
- **Filtri** a pulsanti con `aria-pressed` (mai solo il colore: il pulsante
  attivo ha anche un segno di spunta). Quelli che non hanno niente da filtrare
  **non compaiono**: con una sola applicazione non c'e' il filtro per
  applicazione; senza step richiesti non c'e' il pulsante "Richiesto".
- **Ordine**: un `<select>` nativo (sul telefono apre il selettore del sistema).
  L'ordine di default non si scrive nell'indirizzo.
- **Riga dei risultati**: "Mostro 50 di 312" in una regione `aria-live="polite"`,
  piu' "Togli i filtri" quando ce n'e' qualcuno attivo.
- **Finestra di 50**: "Mostra altri 50" in fondo. Dopo il clic il **focus passa
  alla prima riga nuova**, cosi' chi usa la tastiera non deve ripercorrere 50
  righe all'indietro. Cambiando filtro si riparte da 50.
- **Zero risultati**: "Nessun risultato per questi filtri." con "Togli i
  filtri"; il focus va al campo di ricerca.
- **Righe apribili**: un `<button aria-expanded aria-controls>` che occupa tutta
  la riga (>= 40px di altezza); il dettaglio e' una regione sotto di essa.
- Tutte le liste hanno `motion-reduce` sulle animazioni degli scheletri.

**Mai nel dettaglio per il tester**: percorsi di file, numeri di riga, nomi di
classi o metodi. Il "come e' fatto" sta in un'unica voce chiusa, **"Dettagli
tecnici"**, per chi sa leggerla.

**Ruoli tradotti.** Un componente si legge `button "Sign in"`: `button` e'
gergo. Si mostra "Pulsante «Sign in»" con una piccola tabella di ruoli noti
(pulsante, collegamento, campo di testo, casella, opzione, menu a tendina,
titolo, scheda, finestra, voce di menu, immagine); un ruolo sconosciuto si
mostra com'e'. Il nome resta quello della pagina, mai tradotto.

### Scheda 1 — Step

*Cosa sa fare il sistema oggi?*

**Contenuto.** Ogni voce di `GET /api/catalogo` → `step`.

**Una riga mostra** (su due righe di testo, la seconda a capo su schermi stretti):

```
> the page shows {string}                              [condivisa] [Pronto] [3 usi]
  Verifica che un elemento atteso sia visibile sulla pagina.       [senza componente]
```

- la frase, in carattere a spaziatura fissa (e' la frase del catalogo, in
  inglese: non si traduce);
- sotto, l'**intento** (`doc.intent`) in una riga, quando c'e': e' la frase per
  il tester. Quando manca, il segnale "senza descrizione" (oggi
  "non documentato", parola da sviluppatore);
- a destra, sempre testo e mai solo colore: applicazione, **stato** con icona
  (Pronto con spunta; Richiesto con orologio; Proposto con punto interrogativo;
  Superato con barra), "N usi", e "senza componente" quando `componenti` e' vuoto.

> **Nota di qualita' dei dati.** L'intento nel catalogo attuale e' tagliato a
> meta' frase in almeno un caso (`"...con una sessione valida non fa"`): lo
> estrae `scripts/extract-steps.ts`. Non si corregge qui; la riga lo tronca con
> `line-clamp-2` e il dettaglio lo mostra intero cosi' com'e'.

**Cosa si apre nel dettaglio**, in quest'ordine:

1. **Cosa fa** — l'intento intero.
2. **Componenti toccati** — etichette "Pulsante «Accedi» · pagina Login"; se non
   ce ne sono: "Questo step non e' ancora agganciato a un componente." con la
   spiegazione di cosa fare ("si aggancia da solo quando registri una sessione
   che lo usa").
3. **Usato in questi scenari** — "nome dello scenario · applicazione / flusso".
   Se vuoto: "Nessuno scenario usa ancora questo step."
4. **Dettagli tecnici** (chiuso) — l'elenco delle chiamate e il codice del
   gestore. E' dove oggi sta `comportamento`.

**Filtri.**

| Filtro | Parametro | Note |
|---|---|---|
| Ricerca | `q` | come sopra |
| Applicazione | `app` | un `<select>`: "Tutte", poi le applicazioni presenti; `common` si legge "Condivise", `generated` "Non ancora salvate" |
| Stato | `stato=pronto\|richiesto\|proposto\|superato` | pulsanti con il conteggio sul catalogo intero: "Pronto 10", "Richiesto 127" |
| Solo senza componente | `senza-componente=1` | il pulsante porta il conteggio: "Senza componente (127)" |

**Ordine.** `A-Z` (di default; a parita' resta l'ordine del catalogo), `Piu'
usati`, `Senza componente prima`. Il confronto per `A-Z` ignora maiuscole e
accenti.

**Stati.**

| Stato | Cosa si vede |
|---|---|
| Caricamento | tre righe-scheletro, una regione `role="status"` con "Carico..." |
| Errore | il riquadro d'errore con **Riprova** |
| Vuoto (0 step) | "Il catalogo e' ancora vuoto." + "Gli step compaiono quando registri una sessione e salvi lo scenario." + pulsante **Registra una sessione** (porta a `/registra`) |
| 1 voce (oggi) | la riga, **senza barra degli strumenti**, e sotto, se non c'e' nessuno scenario salvato, un suggerimento: "Il catalogo cresce da solo: ogni scenario che salvi aggiunge i suoi step." + **Registra una sessione** |
| 500 voci | barra degli strumenti, 50 righe, "Mostro 50 di 500", "Mostra altri 50" |

```
1280 px — scheda Step, 137 voci

[ Step ]  Componenti   Da sistemare (4)
------------------------------------------------------------------------
Cosa sa fare il sistema oggi?
Ogni frase che puoi usare in uno scenario, con cosa fa e dove e' gia' usata.

[ Cerca una frase, un componente, una pagina...        ]  Applicazione [Tutte v]
Stato: [Tutti] [Pronto 10] [Richiesto 127]  [ ] Senza componente (137)  Ordina [A-Z v]
Mostro 50 di 137                                          Togli i filtri

> the page shows {string}                  [condivisa] [v Pronto] [3 usi]
  Verifica che un elemento atteso sia visibile sulla pagina.
> the user is logged in                    [condivisa] [v Pronto] [1 uso]
  L'utente e' dentro l'applicazione: con una sessione valida non fa
> the user opens the cart                  [shop] [o Richiesto] [0 usi] [senza componente]
...
                         [ Mostra altri 50 ]
```

```
390 px — scheda Step

[ Step ][Componenti][Da sistemare 4]
------------------------------------
Cosa sa fare il sistema oggi?
Ogni frase che puoi usare in
uno scenario...

[ Cerca...                        ]
[Applicazione: Tutte            v ]
[Tutti][Pronto 10][Richiesto 127]
[ ] Senza componente (137)
Ordina [A-Z                     v ]
Mostro 50 di 137

> the page shows {string}
  Verifica che un elemento atteso
  sia visibile sulla pagina.
  [condivisa][v Pronto][3 usi]
> the user opens the cart
  [shop][o Richiesto][0 usi]
  [senza componente]
```

### Scheda 2 — Componenti

*Se cambio questo elemento della pagina, cosa smette di funzionare?*

**Contenuto.** `componenti` di `GET /api/catalogo`: la mappa al contrario, gia'
calcolata dal motore. Questa scheda e' l'erede della pagina `/components` del
portale.

**Un'aggiunta che risponde davvero alla domanda.** Oggi la riga dice "N step".
Ma "cosa si rompe" sono gli **scenari**: la riga mostra anche quanti scenari
**distinti** dipendono dal componente (l'unione degli `usatoIn` dei suoi step,
contando una volta lo scenario che passa da due step). Funzione pura
`impattoComponente(componente, step)`. Gli scenari che non usano step del
catalogo non compaiono: la riga lo dice nel dettaglio ("Conta solo gli scenari
che usano frasi del catalogo").

**Una riga mostra:**

```
> Pulsante «Accedi»       Login        [shop]        12 step · 5 scenari
```

- il componente con il ruolo tradotto; la **pagina** (o "Pagina ambigua: vista
  su A, B" con l'icona di avviso, se `pagineAmbigue`: lo stesso nome visto su
  pagine diverse e' un possibile equivoco); le applicazioni; "N step · M
  scenari".
- **Non e' piu' una `<table>`**: e' un elenco di righe come negli Step, cosi'
  sul telefono non scorre di lato. Sopra i 900px le informazioni si dispongono
  in colonne con una griglia CSS, ma la struttura resta un elenco (la lettura
  da schermo e' la stessa).

**Nel dettaglio:** "Frasi che lo toccano" (l'elenco degli step; dal clic su uno
si va alla scheda Step con la ricerca gia' impostata su quella frase, link
`?scheda=step&q=...`), "Scenari che ne dipendono" (nome · applicazione / flusso).

**Filtri e ordine.**

| Cosa | Parametro | Note |
|---|---|---|
| Ricerca | `q` | nome del componente, pagina, frase |
| Applicazione | `app` | come negli Step |
| Solo pagine ambigue | `ambigua=1` | con il conteggio; compare solo se ce n'e' almeno una |
| Ordine | `ordina=step\|scenari\|az` | di default `step` (piu' step prima: e' l'impatto) |

**Stati.**

| Stato | Cosa si vede |
|---|---|
| Caricamento / errore | come Step (stesso dato: nessuna seconda richiesta) |
| Vuoto, **che e' il caso di oggi** | "Nessun componente ancora." + "Un componente compare quando uno step ne tocca uno: registra una sessione e salva lo scenario." + **Registra una sessione**. Se esistono step ma nessuno ha componenti, in piu': "I N step del catalogo non sono ancora agganciati a una pagina." |
| 1 voce | la riga, senza barra |
| 500 voci | barra, finestra di 50 |

```
1280 px — scheda Componenti

 Step  [ Componenti ]  Da sistemare (4)
------------------------------------------------------------------------
Se cambio questo elemento della pagina, cosa smette di funzionare?
Pulsanti, campi e collegamenti toccati dagli step: per ognuno, chi ne dipende.

[ Cerca...                       ] [ ] Solo pagine ambigue (3)  Ordina [Piu' step v]
Mostro 42 di 42

> Pulsante «Accedi»        Login            [shop]            12 step · 5 scenari
> Campo di testo «Email»   Login            [shop]             8 step · 5 scenari
> Collegamento «Ricariche  (!) Pagina ambigua: vista su        4 step · 2 scenari
  »                          Home, Conto    [shop]
```

```
390 px — scheda Componenti

 Step [Componenti] Da sistemare 4
------------------------------------
Se cambio questo elemento della
pagina, cosa smette di funzionare?

[ Cerca...                       ]
[ ] Solo pagine ambigue (3)
Ordina [Piu' step              v ]

> Pulsante «Accedi»
  Login  [shop]
  12 step · 5 scenari
> Collegamento «Ricariche»
  (!) Pagina ambigua: Home, Conto
  4 step · 2 scenari
```

### Scheda 3 — Da sistemare

*Quali frasi si somigliano troppo?*

**Il nome.** Dei tre proposti — "Ordine", "Doppioni", "Da sistemare" — si
raccomanda **"Da sistemare"**:

| Nome | Pro | Contro |
|---|---|---|
| Ordine | Breve; e' il nome dell'idea ("mettere ordine") | Per un tester e' ambiguo: sa di "ordine di esecuzione" o di "ordina per". Una linguetta che dice solo "Ordine" non dice cosa ci trovi |
| Doppioni | Chiaro e concreto | Troppo stretto: la scheda contiene anche gli **equivoci** (stessa frase, elementi diversi) che *non* sono doppioni, e la distinzione fra i due e' proprio il punto della scheda |
| **Da sistemare** | Dice che cosa c'e' (cose da fare) e quando va guardata (quando il numero e' > 0); a zero si legge bene ("Tutto in ordine") | Piu' lungo; "sistemare" promette un'azione anche per le coppie solo informative (per quelle c'e' il gruppo "Solo da sapere", dichiarato) |

In inglese: **"To tidy up"**. Id nell'indirizzo: `da-sistemare` (resta lo stesso
in entrambe le lingue, cosi' un link vale ovunque).

**Contenuto.** Le coppie sospette di `GET /api/catalogo/riconciliazione`, gia'
giudicate dal motore, divise in **quattro gruppi** (la UI oggi ne ha tre
disegni, qui diventano quattro perche' uno dei casi era mal nominato):

| Gruppo | Quando (funzione pura `classificaCoppia`) | Gesto | Conta nel numero |
|---|---|---|---|
| **Due frasi per la stessa cosa** (doppione) | `stessoComponente` | si sceglie quale frase tenere, si guarda cosa cambia, si fonde | si |
| **Stessa frase, elementi diversi** (equivoco) | testo quasi uguale, entrambi con componenti, componenti diversi | si da' un'altra formulazione a una delle due | si |
| **Da verificare** | testo quasi uguale ma **almeno uno senza componente** | nessuno: "Non si puo' ancora dire se siano la stessa cosa: manca il componente di almeno una. Quando entrambe saranno agganciate, qui comparira' il gesto giusto." | no (ma la casella in testa dice "+ K da verificare") |
| **Solo da sapere** | `motivo === 'applicazioni-diverse'` | nessuno, apposta (come oggi) | no |

Ogni gruppo ha un titolo con il suo conteggio ("Due frasi per la stessa cosa
(3)") e si ripiega con un'icona e il testo "Mostra/Nascondi" (non solo il
colore); **i primi due sono aperti, gli ultimi due chiusi** di default.
All'interno di un gruppo le coppie si ordinano per **uso complessivo
decrescente** (consolidare cio' che si usa di piu' rende di piu', come dice il
rituale), a parita' per id.

**Il flusso di fusione, piu' chiaro.** Oggi funziona ma non si capisce a che
punto si e': una lista di scelte, poi compare un riquadro, poi un pulsante. Si
rende in **tre passi numerati nella stessa scheda**, il secondo e il terzo
nascosti finche' il precedente non e' fatto:

```
+--------------------------------------------------------------------+
| (merge) Due frasi per la stessa cosa                                |
| Lo stesso elemento della pagina, raggiunto con due frasi diverse.   |
|                                                                     |
| 1. Quale frase tieni?                                               |
|  (o) the user clicks the login button   [shop]  5 usi  [piu' usata] |
|  ( ) the user presses sign in           [shop]  1 uso               |
|                                                                     |
| 2. Cosa succede                                                     |
|  Nei tuoi scenari 1 riga passera' da "the user presses sign in" a   |
|  quella che tieni. "the user presses sign in" non esistera' piu'.   |
|    - Accesso con credenziali valide · shop / login                  |
|                                                                     |
| 3. Conferma                                                         |
|  [ Tieni "the user clicks the login button" e fondi l'altra ]       |
+--------------------------------------------------------------------+
```

- **Passo 1**: due opzioni con `radio` (come oggi), senza nessuna preselezionata:
  la scelta e' dell'utente. Sulla piu' usata compare il testo **"piu' usata"**
  (un suggerimento, non una decisione).
- **Passo 2**: appena scelta una frase si calcola l'anteprima (rotta `GET
  /api/catalogo/fondi`, invariata). Si legge **in una frase**: quante righe
  cambiano, in quali scenari (nome · applicazione / flusso), e che la frase
  persa non esistera' piu'. **Nessun percorso di file.**
- **Se i due gestori fanno la stessa cosa** (`equivalenti`): una riga che lo
  dice ("Le due frasi fanno la stessa cosa") e il passo 3 e' un pulsante.
- **Se fanno cose diverse**: un riquadro con il titolo "Attenzione: le due
  frasi non fanno la stessa cosa" e la spiegazione in parole; il confronto dei
  due gestori sta dietro **"Dettagli tecnici"** (chiuso); una casella "Ho
  capito che il comportamento di «B» andra' perso" e solo allora si attiva il
  pulsante, che cambia nome e aspetto: **"Fondi comunque"** (distruttivo).
  Si aggiunge una riga: "Meglio deciderlo con chi mantiene i test
  automatici." (e' una frase, non un blocco).
- **Passo 3**: il pulsante dice **cosa fa con i nomi in chiaro** ("Tieni «A» e
  fondi l'altra"), non "Fondi".

**Dopo la fusione.** La coppia sparisce dalla lista (che si rilegge senza
smontarsi), e in cima alla scheda compare una **striscia di esito**, che resta
finche' non se ne fa un'altra o la si chiude:

```
+--------------------------------------------------------------------+
| (v) Fatto: "the user presses sign in" ora e' "the user clicks the   |
|     login button" (1 riga riscritta).            [ Annulla ] [ x ]  |
| Puoi annullare solo l'ultima fusione: se ne fai un'altra, questa    |
| non si potra' piu' annullare.                                       |
+--------------------------------------------------------------------+
```

- E' una regione `role="status"`; **il focus passa alla striscia** (la scheda
  appena usata e' sparita e il focus altrimenti andrebbe perso).
- "Annulla" usa la rotta `fondi/annulla` gia' esistente. Il testo sull'unico
  livello di annullamento non e' un'avvertenza di contorno: e' la verita' del
  motore, detta prima che serva.
- Se `catalogoRigenerato` e' `false`, la striscia aggiunge: "Il catalogo non si
  e' aggiornato da solo: i numeri qui sopra potrebbero essere vecchi." con
  **Riprova ora**.
- La striscia e' ricostruibile da `GET /api/catalogo/fondi/annulla` anche dopo
  aver cambiato pagina (come oggi), quindi non va persa tornando indietro.

**Equivoco di denominazione.** Stessa struttura in tre passi: 1 quale frase
rinominare, 2 la nuova frase (il campo precompilato come oggi: `frase (nome del
componente)`) con la riga "Cosa succede" (quante righe, quali scenari), 3
**"Dai un'altra formulazione a «A»"**. **Non esiste "Annulla"** per questo gesto
(la rotta `riconcilia` non salva niente): il passo 2 lo dice ("Questa modifica
non si annulla con un pulsante."), senza casella da spuntare. Dopo, la stessa
striscia di esito, **senza** il pulsante Annulla.

**Ricerca e filtri.** Barra solo se le coppie sono piu' di 8: `q` (cerca nelle
due frasi), `app`. Nessun filtro per stato: i gruppi sono gia' il filtro.

**Stati.**

| Stato | Cosa si vede |
|---|---|
| Caricamento | scheletro; la scheda non blocca le altre (la rotta e' la piu' lenta: vedi "Rischi") |
| Errore | riquadro con **Riprova** |
| Vuoto | icona di spunta, "Tutto in ordine" e "Nessuna coppia di frasi si somiglia troppo." Questo e' il caso di oggi (una sola voce) e deve sembrare una buona notizia, non una pagina rotta |
| 1 coppia | un gruppo con una sola scheda, aperta |
| 500 step | i gruppi sono ripiegati se vuoti; ogni gruppo mostra 10 coppie alla volta ("Mostra altre 10"); la barra compare |

```
1280 px — scheda Da sistemare

 Step   Componenti  [ Da sistemare (4) ]
------------------------------------------------------------------------
Quali frasi si somigliano troppo?
Frasi quasi uguali: unirle o distinguerle tiene il catalogo semplice.
Ogni modifica mostra prima cosa cambiera'.

+- (v) Fatto: "..." ora e' "..." (1 riga riscritta).  [Annulla] [x] ----+
| Puoi annullare solo l'ultima fusione.                                  |
+------------------------------------------------------------------------+

v Due frasi per la stessa cosa (3)                              Nascondi
  [scheda in tre passi, come sopra]
  [scheda in tre passi]
v Stessa frase, elementi diversi (1)                            Nascondi
  [scheda in tre passi]
> Da verificare (2)                                              Mostra
> Solo da sapere (1)                                             Mostra
```

```
390 px — scheda Da sistemare

 Step [Componenti][Da sistemare 4]
------------------------------------
Quali frasi si somigliano troppo?
Frasi quasi uguali: unirle o...

v Due frasi per la stessa cosa (3)
+----------------------------------+
| (merge) Due frasi per la stessa  |
| cosa                             |
| 1. Quale frase tieni?            |
| (o) the user clicks the login    |
|     button                       |
|     [shop] [5 usi] [piu' usata]  |
| ( ) the user presses sign in     |
|     [shop] [1 uso]               |
| 2. Cosa succede  (dopo la scelta)|
| 3. [Tieni "..." e fondi l'altra] |
+----------------------------------+
> Da verificare (2)
```

A 390px il pulsante del passo 3 va **a capo, a tutta larghezza**: il testo con i
nomi delle frasi e' lungo, e un pulsante troncato e' un pulsante che mente.

## Il componente Schede

**Dove vive.** `web-ui/src/components/ui/schede.tsx`. Sta in `ui/` perche' e'
una primitiva visiva senza conoscenza del dominio (come `badge.tsx`,
`select.tsx`), e **non importa niente da `next/navigation`**: la parte
dell'indirizzo sta in un hook a parte (`hooks/useSchedaUrl.ts`). Cosi' la
pagina Scenari, o qualunque altra, lo usa con o senza URL.

Avvolge `Tabs` di `@base-ui/react/tabs` (gia' dipendenza): ruoli `tablist` /
`tab` / `tabpanel`, `aria-selected`, `aria-controls` / `aria-labelledby`, frecce,
`Home`, `End` e una sola sosta del tasto Tab sulla lista li da' il componente
sottostante. Il wrapper aggiunge lo stile coi token del cruscotto, il
contatore, lo scorrimento e le due scelte di comportamento qui sotto.

### API

```ts
export interface SchedaDef {
  id: string;                         // stabile, uguale in ogni lingua: finisce nell'indirizzo
  etichetta: string;                  // gia' tradotta
  icona?: LucideIcon;                 // opzionale; mai l'unico segnale
  conteggio?: number | null;          // numero sulla linguetta; null = in caricamento (non si mostra); 0 = non si mostra
  etichettaConteggio?: string;        // testo per lettori di schermo: "4 coppie da guardare"
  tono?: 'neutro' | 'attenzione';     // 'attenzione' = bordo ambra + punto esclamativo, ancora con il numero
  disabilitata?: boolean;
}

export interface SchedeProps {
  schede: SchedaDef[];                // almeno 2
  valore: string;                     // controllato: la scheda attiva
  onCambia: (id: string) => void;
  etichettaAria: string;              // nome della lista di linguette: "Sezioni del catalogo"
  pannello: (id: string) => React.ReactNode;  // il contenuto della scheda attiva
  attivazione?: 'manuale' | 'al-focus';       // default 'manuale'
  mantieniMontate?: boolean;                  // default false: si monta solo la scheda attiva
  className?: string;
}
```

```ts
// hooks/useSchedaUrl.ts
export function useSchedaUrl<T extends string>(opzioni: {
  valide: readonly T[];
  predefinita: T;
  parametro?: string;               // default 'scheda'
  cronologia?: 'aggiungi' | 'sostituisci';  // default 'aggiungi' (push): Indietro torna alla scheda di prima
}): [T, (id: T) => void];
```

La parte pura (leggere e scrivere il parametro) sta in `lib/schede-url.ts`, senza
React ne' Next: `schedaDaUrl(valore, valide, predefinita)` e
`urlConScheda(percorso, parametri, parametro, id, {mantieni})`.

### Comportamento da tastiera

| Tasto | Effetto |
|---|---|
| `Tab` | Entra nella lista di linguette **una volta sola** (sulla linguetta attiva); il `Tab` seguente esce dalla lista, verso il pannello |
| `Freccia destra` / `sinistra` | Sposta il **focus** alla linguetta successiva / precedente; dall'ultima si riparte dalla prima (`loopFocus`) |
| `Home` / `End` | Prima / ultima linguetta |
| `Invio` / `Spazio` | **Attiva** la linguetta col focus (attivazione **manuale**) |
| Clic o tocco | Attiva |

**Perche' manuale.** Con l'attivazione al focus ogni freccia cambierebbe scheda
e quindi scriverebbe una voce nella cronologia: scorrere tre linguette ne
lascerebbe tre, e Indietro sembrerebbe rotto. Con quella manuale si sceglie e si
conferma. Chi non vuole il passaggio in piu' puo' chiedere `attivazione="al-focus"`
e, per non riempire la cronologia, passare `cronologia: 'sostituisci'` a
`useSchedaUrl` (vedi sotto). Il Catalogo usa le due impostazioni di default.

Se la verifica a mano mostra che `Home`/`End` non rispondono nella versione
installata di Base UI, si aggiunge il gestore nel wrapper (e' una decina di
righe); la verifica manuale sotto lo controlla.

**Focus.** Cambiando scheda con tastiera o mouse il focus **resta sulla
linguetta** (comportamento atteso: l'utente sceglie, poi decide se entrare nel
pannello). Il pannello ha `tabIndex={0}`: il suo primo contenuto e' un titolo,
non un controllo, e la regola ARIA in quel caso lo vuole raggiungibile. Il
contorno del focus e' interno (`outline-offset: -2px`) per non essere tagliato
dal bordo del contenitore.

### Indirizzo

- Parametro: `scheda`, con valori `step`, `componenti`, `da-sistemare`.
- Valore mancante o sconosciuto → la scheda predefinita (`step`), **senza
  redirect** e senza errore: un link vecchio funziona comunque.
- Cambiare scheda: `router.push(url)`, con `scroll: false`; ricliccare quella
  attiva non fa niente. Si **tolgono** i parametri di filtro (`q`, `app`,
  `stato`, `senza-componente`, `ambigua`, `ordina`): appartengono a una scheda
  e su un'altra non significano niente. Si tiene `scheda`.
- Cambiare un filtro: `router.replace(url)`.
- Indietro e Avanti cambiano `useSearchParams()`, e quindi la scheda, **senza
  spostare il focus**.
- La pagina avvolge il contenuto in `<Suspense>`, perche' `useSearchParams()`
  nella build di Next lo richiede; `npm run build` in `web-ui` lo verifica.

Un link da altrove: `urlCatalogo({ scheda, q, app, stato, ... })` in
`lib/catalogo-url.ts` costruisce `/catalogo?...` con le stesse regole, cosi' la
pagina Scenari (o l'Esecuzione) puo' puntare a "questo step nel catalogo" senza
scrivere a mano l'indirizzo.

### Responsive

Le linguette sono **una riga orizzontale** con sotto una linea; la scheda attiva
ha la barra blu di 2px **e** il testo in grassetto **e** `aria-selected`.

- Con 2 o 3 schede **si dividono la larghezza** (`flex-1`), e a 390px ci stanno:
  "Step", "Componenti", "Da sistemare 4" occupano circa 300px. Ognuna alta almeno
  44px.
- Se non ci stanno (piu' schede, o la lingua con le parole piu' lunghe), la
  lista **scorre di lato** (`overflow-x: auto`, `scroll-snap`), la linguetta
  attiva viene portata in vista (`scrollIntoView({ inline: 'nearest' })`) e il
  bordo sfumato dice che c'e' altro.
- **Non diventa un menu.** Un menu nasconde il contatore e le altre opzioni, e
  costa un tocco in piu' per ogni cambio. Un menu e' la risposta giusta oltre le
  cinque o sei schede, non per tre: il componente non lo prevede e non serve
  prevederlo oggi.

### Contatore sulla linguetta

Un numero in un'etichetta tondeggiante accanto alla parola. Con `tono:
'attenzione'` ha bordo e testo ambra e un punto esclamativo, cosi' non dipende
dal colore. Per il lettore di schermo la linguetta si legge **"Da sistemare, 4
coppie da guardare"** (il numero visibile e' `aria-hidden`, il testo e'
`sr-only`): "Da sistemare 4" senza spiegazione non dice cosa siano i 4.

## Dati e store

Tutto cio' che la pagina legge sta in `lib/risorse-catalogo.ts`, nello stesso
modo di `lib/stato-controllo.ts`: `creaRisorsa(...)` a livello di modulo,
mostrata con `useRisorsa(risorsa, seleziona)`.

| Risorsa | Legge | Chi la mostra |
|---|---|---|
| `catalogo` | `GET /api/catalogo` | intestazione, scheda Step, scheda Componenti, e la scheda Da sistemare (per l'uso di ogni frase) |
| `riconciliazione` | `GET /api/catalogo/riconciliazione` | contatore sulla linguetta, casella Da sistemare, scheda Da sistemare |
| `scenari` | `GET /api/scenari`, ridotto al numero di scenari eseguibili | casella Scenari |
| `statoAggiornamento` | `GET /api/catalogo/stato` | riga dell'aggiornamento |

Cosa si guadagna, ed e' lo stesso motivo per cui esiste lo store:

- **L'intestazione e il contatore** hanno bisogno di dati che stanno in schede
  che *non sono montate* (le coppie, mentre si guarda Step): da componenti non
  si potrebbe.
- **Cambiare scheda e' istantaneo** e tornare sulla pagina non riparte dallo
  scheletro.
- `condividi` mantiene l'identita' dei dati uguali: un'intestazione ricalcolata
  con `useMemo` sul riferimento non rifa' i conti a ogni rilettura, e le righe
  `memo` non si ridisegnano.
- Dopo una fusione basta `riconciliazione.ricarica()` + `catalogo.ricarica()`:
  la lista resta a schermo (`aggiornando: true`) e la striscia di esito non si
  perde.

`seleziona` (secondo argomento di `useRisorsa`) va definito **fuori dal
componente** e restituire qualcosa che sta gia' nell'istantanea: lo dice il
commento di `useRisorsa`, e l'intestazione lo rispetta calcolando i numeri con
`useMemo` e non dentro il selettore.

**Aggiornamento.** Un hook (`useAggiornamentoCatalogo`) rilegge
`statoAggiornamento` ogni 2 secondi **solo mentre e' `in-corso`** (come oggi), e
quando passa a `ok` fa partire `catalogo.ricarica()` e `riconciliazione.ricarica()`.
La regola e' `dopoAggiornamento(prima, dopo)`.

**Due campi in piu' nell'API.** `lib/catalogo.ts` (`costruisciCatalogo`) aggiunge
a ogni `StepCatalogo`:

```ts
stato: 'implemented' | 'wanted' | 'deprecated' | 'proposed';  // da CatalogStep.status
intento?: string;                                              // da CatalogStep.doc?.intent
```

Sono additivi: nessun consumatore esistente si rompe. `tipi.ts` li rispecchia, e
il test di `costruisciCatalogo` si scrive prima.

## Cosa si sposta, cosa si toglie

**Si toglie dal Catalogo:** la sezione Scenari (`SezioneScenari.tsx`, raggruppata
per applicazione e flusso, con "Esporta"). Va alla pagina **Scenari**
(sotto-progetto 2). Questo lavoro smette di importarlo; se la pagina Scenari
non e' ancora pronta quando questo atterra, il file resta dov'e' (non
importato) finche' il sotto-progetto 2 lo sposta o lo riscrive: **non si cancella
da qui**. Con lui se ne vanno dal namespace `Catalogo` le chiavi `scenariTitolo`,
`scenariSottotitolo`, `generato`, `esporta`, `esportaScenario`,
`nessunoScenarioSalvato`: le porta con se' chi costruisce la pagina Scenari.

**Si riscrive:** la pagina e le tre sezioni (`SezioneStep`, `SezioneComponenti`,
`SezioneRiconciliazione`), spezzate per responsabilita'. Il comportamento delle
rotte non cambia.

### File toccati

| File | Cambia | Responsabilita' dopo |
|---|---|---|
| `web-ui/src/app/(cruscotto)/catalogo/page.tsx` | riscritto | Solo composizione: intestazione, `Schede`, il pannello giusto. Nessun fetch, nessuna logica. In `<Suspense>` |
| `web-ui/src/lib/catalogo.ts` | + `stato`, `intento` | Costruire la risposta di `/api/catalogo` |
| `web-ui/src/components/cruscotto/catalogo/tipi.ts` | + `stato`, `intento` | Forma JSON del contratto |
| `web-ui/src/components/cruscotto/catalogo/Scheletro.tsx` | + `onRiprova` su `ErroreCatalogo`; `motion-reduce` | Scheletro ed errore comuni |
| `web-ui/messages/it.json`, `en.json` | chiavi nuove e tolte | Testi; devono restare uguali nelle due lingue (`npm run check:i18n`) |

### File nuovi

| File | Responsabilita' (una sola) |
|---|---|
| `web-ui/src/components/ui/schede.tsx` | Primitiva a schede accessibile (avvolge Base UI) |
| `web-ui/src/hooks/useSchedaUrl.ts` | Collega la scheda attiva all'indirizzo |
| `web-ui/src/hooks/useAggiornamentoCatalogo.ts` | Rilettura dello stato mentre e' in corso; rilegge il catalogo quando finisce |
| `web-ui/src/lib/schede-url.ts` | Leggere/scrivere il parametro `scheda` (puro) |
| `web-ui/src/lib/catalogo-url.ts` | Filtri della vista da/verso l'indirizzo; `urlCatalogo` (puro) |
| `web-ui/src/lib/catalogo-filtri.ts` | Ricerca, filtri, ordinamenti, finestra a 50, `mostraFiltri` (puro) |
| `web-ui/src/lib/catalogo-numeri.ts` | Numeri dell'intestazione, `classificaCoppia`, `arricchisciCoppia`, `impattoComponente`, `dopoAggiornamento` (puro) |
| `web-ui/src/lib/percorso-scenario.ts` | Da `app/flusso/nome.feature` a "applicazione / flusso" (puro; condiviso con la pagina Scenari) |
| `web-ui/src/lib/formato-data.ts` | Una data ISO nella lingua della finestra (puro) |
| `web-ui/src/lib/risorse-catalogo.ts` | Le quattro risorse condivise |
| `.../catalogo/IntestazioneCatalogo.tsx` | Le quattro caselle |
| `.../catalogo/RigaAggiornamento.tsx` | La riga di stato dell'aggiornamento e l'avviso (sostituisce `BannerAggiornamento.tsx`) |
| `.../catalogo/SchedaStep.tsx`, `RigaStep.tsx` | Scheda Step; una riga di step |
| `.../catalogo/SchedaComponenti.tsx`, `RigaComponente.tsx` | Scheda Componenti; una riga di componente |
| `.../catalogo/SchedaSistemare.tsx` | Scheda Da sistemare: gruppi e striscia |
| `.../catalogo/CoppiaDoppione.tsx`, `CoppiaEquivoco.tsx`, `CoppiaDaVerificare.tsx`, `CoppiaInformativa.tsx` | Una variante di coppia ciascuno (oggi stanno in un file da 614 righe) |
| `.../catalogo/StrisciaEsito.tsx` | L'esito dell'ultima modifica e il suo "Annulla" (sostituisce `BannerAnnullamentoFusione`) |
| `.../catalogo/BarraStrumenti.tsx` | Ricerca, filtri, ordine, riga dei risultati |
| `.../catalogo/ElencoPaginato.tsx` | Finestra a 50, "Mostra altri", focus sulla prima riga nuova |
| `.../catalogo/StatoVuoto.tsx` | Icona, titolo, frase, pulsante di partenza |

(`...` = `web-ui/src/components/cruscotto/catalogo`.)

### File tolti

`SezioneStep.tsx` (e con lui `useCatalogo`), `SezioneComponenti.tsx`,
`SezioneRiconciliazione.tsx`, `BannerAggiornamento.tsx`. `SezioneScenari.tsx`:
vedi sopra. `EtichettaApplicazione.tsx` resta com'e'.

### Non si tocca

Le rotte `/api/catalogo/*` (salvo i due campi di `costruisciCatalogo`),
`lib/riconciliazione.ts`, `lib/fusione-step.ts`, `lib/riscrittura-step.ts`, i
token di `globals.css`: i colori di questo disegno sono tutti gia' li'.

## Testi

Il namespace resta `Catalogo`. Nei messaggi si usano le lettere accentate come
nel resto di `it.json` (la regola dell'apostrofo ASCII vale per questo
documento, non per il dizionario). Elenco dei principali; il resto segue lo
stesso schema.

**Intestazione e aggiornamento**

| Chiave | Italiano | Inglese |
|---|---|---|
| `titoloPagina` | Catalogo | Catalog |
| `descrizionePagina` | Le frasi che il sistema conosce, gli elementi delle pagine che toccano, e dove vanno rimesse in ordine. | The phrases the system knows, the page elements they touch, and where they need tidying up. |
| `numeriAria` | Riepilogo del catalogo | Catalog summary |
| `numStepTitolo` | Step | Steps |
| `numStepDettaglio` | `{pronti, plural, one {# pronto} other {# pronti}} · {richiesti, plural, one {# richiesto} other {# richiesti}}` | `{pronti} ready · {richiesti} requested` |
| `numStepVai` | Vedi gli step | See the steps |
| `numComponentiTitolo` | Componenti | Components |
| `numComponentiDettaglio` | `{ancorati} step su {totale} agganciati a un componente` | `{ancorati} of {totale} steps linked to a component` |
| `numComponentiVai` | Vedi i componenti | See the components |
| `numSistemareTitolo` | Da sistemare | To tidy up |
| `numSistemareDettaglio` | `{n, plural, =0 {Tutto in ordine} one {# coppia da guardare} other {# coppie da guardare}}` | `{n, plural, =0 {All tidy} one {# pair to look at} other {# pairs to look at}}` |
| `numSistemareVerificare` | `+ {n} da verificare` | `+ {n} to check` |
| `numSistemareVai` | Vedi le coppie | See the pairs |
| `numScenariTitolo` | Scenari | Scenarios |
| `numScenariDettaglio` | `{n, plural, one {# eseguibile} other {# eseguibili}}` | `{n, plural, one {# runnable} other {# runnable}}` |
| `numScenariVai` | Vai agli scenari | Go to the scenarios |
| `numeroNonDisponibile` | non disponibile | not available |
| `aggiornamentoInCorso` | Sto aggiornando il catalogo… i numeri potrebbero non includere ancora l'ultimo scenario salvato. | Updating the catalog… the numbers may not include the scenario you just saved yet. |
| `aggiornamentoFallito` | L'ultimo aggiornamento automatico non è riuscito: {dettaglio}. Quello che vedi è l'ultimo catalogo buono, non necessariamente quello di oggi. | The last automatic update failed: {dettaglio}. What you see is the last good catalog, not necessarily today's. |
| `riprovaAggiornamento` | Riprova ora | Try again now |
| `aggiornamentoOccupato` | C'è un'altra operazione in corso: riprova quando finisce. | Another operation is running: try again when it finishes. |

(`aggiornatoIl` resta; cambia solo il modo di formattare `{data}`.)

**Schede e pannelli**

| Chiave | Italiano | Inglese |
|---|---|---|
| `schedeAria` | Sezioni del catalogo | Catalog sections |
| `schedaStep` | Step | Steps |
| `schedaComponenti` | Componenti | Components |
| `schedaSistemare` | Da sistemare | To tidy up |
| `schedaSistemareConteggio` | `{n, plural, one {# coppia da guardare} other {# coppie da guardare}}` | `{n, plural, one {# pair to look at} other {# pairs to look at}}` |
| `stepDomanda` | Cosa sa fare il sistema oggi? | What can the system do today? |
| `stepIntro` | Ogni frase che puoi usare in uno scenario, con cosa fa e dove è già usata. | Every phrase you can use in a scenario, what it does and where it's already used. |
| `componentiDomanda` | Se cambio questo elemento della pagina, cosa smette di funzionare? | If I change this page element, what stops working? |
| `componentiIntro` | Pulsanti, campi e collegamenti toccati dagli step: per ognuno, chi ne dipende. | Buttons, fields and links the steps touch: for each, what depends on it. |
| `sistemareDomanda` | Quali frasi si somigliano troppo? | Which phrases are too alike? |
| `sistemareIntro` | Frasi quasi uguali: unirle o distinguerle tiene il catalogo semplice. Ogni modifica mostra prima cosa cambierà. | Nearly identical phrases: merging or telling them apart keeps the catalog simple. Every change shows what will change first. |

**Strumenti, righe, stati vuoti**

| Chiave | Italiano | Inglese |
|---|---|---|
| `cerca` | Cerca | Search |
| `cercaSegnaposto` | Cerca una frase, un componente, una pagina… | Search a phrase, a component, a page… |
| `filtroApplicazione` | Applicazione | Application |
| `appTutte` | Tutte le applicazioni | All applications |
| `statoTutti` / `statoPronto` / `statoRichiesto` / `statoProposto` / `statoSuperato` | Tutti / Pronto / Richiesto / Proposto / Superato | All / Ready / Requested / Proposed / Retired |
| `soloSenzaComponente` | Senza componente ({n}) | Without component ({n}) |
| `soloPaginaAmbigua` | Solo pagine ambigue ({n}) | Ambiguous pages only ({n}) |
| `ordina` | Ordina per | Sort by |
| `ordineAz` / `ordineUsi` / `ordineSenzaComponentePrima` | A-Z / Più usati / Senza componente prima | A-Z / Most used / Without component first |
| `ordinePiuStep` / `ordinePiuScenari` | Più step / Più scenari | Most steps / Most scenarios |
| `mostrati` | Mostro {mostrati} di {totale} | Showing {mostrati} of {totale} |
| `mostraAltri` | Mostra altri {n} | Show {n} more |
| `togliFiltri` | Togli i filtri | Clear filters |
| `nessunRisultato` | Nessun risultato per questi filtri. | No results for these filters. |
| `senzaDescrizione` | senza descrizione | no description |
| `senzaComponente` | senza componente | no component |
| `dettagliTecnici` | Dettagli tecnici | Technical details |
| `scenarioInFlusso` | `{scenario} · {app} / {flusso}` | `{scenario} · {app} / {flusso}` |
| `nScenari` | `{n, plural, one {# scenario} other {# scenari}}` | `{n, plural, one {# scenario} other {# scenarios}}` |
| `paginaAmbigua` | (esiste) Ambigua: vista su {pagine} | (esiste) Ambiguous: seen on {pagine} |
| `vuotoStepTitolo` | Il catalogo è ancora vuoto | The catalog is still empty |
| `vuotoStepTesto` | Gli step compaiono quando registri una sessione e salvi lo scenario. | Steps appear when you record a session and save the scenario. |
| `suggerimentoPartenza` | Il catalogo cresce da solo: ogni scenario che salvi aggiunge i suoi step. | The catalog grows by itself: every scenario you save adds its steps. |
| `vuotoComponentiTitolo` | Nessun componente ancora | No components yet |
| `vuotoComponentiTesto` | Un componente compare quando uno step ne tocca uno: registra una sessione e salva lo scenario. | A component appears when a step touches one: record a session and save the scenario. |
| `registraSessione` | Registra una sessione | Record a session |
| `riprova` | Riprova | Try again |
| `ruoli.button` / `ruoli.link` / `ruoli.textbox` / `ruoli.checkbox` / `ruoli.combobox` | Pulsante / Collegamento / Campo di testo / Casella / Menu a tendina | Button / Link / Text field / Checkbox / Dropdown |

**Da sistemare**

| Chiave | Italiano | Inglese |
|---|---|---|
| `gruppoDoppioni` | Due frasi per la stessa cosa ({n}) | Two phrases for the same thing ({n}) |
| `gruppoEquivoci` | Stessa frase, elementi diversi ({n}) | Same phrase, different elements ({n}) |
| `gruppoDaVerificare` | Da verificare ({n}) | To check ({n}) |
| `gruppoSoloSapere` | Solo da sapere ({n}) | Just so you know ({n}) |
| `mostraGruppo` / `nascondiGruppo` | Mostra / Nascondi | Show / Hide |
| `passo1Tieni` | 1. Quale frase tieni? | 1. Which phrase do you keep? |
| `passo2Succede` | 2. Cosa succede | 2. What happens |
| `passo3Conferma` | 3. Conferma | 3. Confirm |
| `piuUsata` | più usata | most used |
| `anteprimaRighe` | `{righe, plural, =0 {Nessuno scenario usa «{frase}».} one {# riga negli scenari passerà da «{frase}» a quella che tieni.} other {# righe negli scenari passeranno da «{frase}» a quella che tieni.}} «{frase}» non esisterà più.` | `{righe, plural, =0 {No scenario uses "{frase}".} one {# line in your scenarios will change from "{frase}" to the one you keep.} other {# lines in your scenarios will change from "{frase}" to the one you keep.}} "{frase}" will no longer exist.` |
| `fondiTieni` | Tieni «{frase}» e fondi l'altra | Keep "{frase}" and merge the other |
| `corpiUguali` | Le due frasi fanno la stessa cosa. | Both phrases do the same thing. |
| `corpiDiversiTitolo` | Attenzione: le due frasi non fanno la stessa cosa | Careful: the two phrases don't do the same thing |
| `corpiDiversiSuggerimento` | Meglio deciderlo con chi mantiene i test automatici. | Best decided with whoever maintains the automated tests. |
| `fondiComunque` | Fondi comunque | Merge anyway |
| `esitoFusione` | Fatto: «{da}» ora è «{a}» ({righe, plural, one {# riga riscritta} other {# righe riscritte}}). | Done: "{da}" is now "{a}" ({righe, plural, one {# line rewritten} other {# lines rewritten}}). |
| `soloUltimaFusione` | Puoi annullare solo l'ultima fusione: se ne fai un'altra, questa non si potrà più annullare. | You can only undo the last merge: if you do another one, this one can't be undone any more. |
| `catalogoNonRigenerato` | Il catalogo non si è aggiornato da solo: i numeri qui sopra potrebbero essere vecchi. | The catalog didn't update by itself: the numbers above may be out of date. |
| `distinguiTitolo` | Stessa frase, elementi diversi | Same phrase, different elements |
| `distinguiNonAnnullabile` | Questa modifica non si annulla con un pulsante. | This change can't be undone with a button. |
| `distinguiPulsante` | Dai un'altra formulazione a «{frase}» | Give "{frase}" another wording |
| `daVerificareTitolo` | Non si può ancora dire | Can't tell yet |
| `daVerificareTesto` | Le due frasi si somigliano, ma almeno una non è ancora agganciata a un componente: senza quello non si capisce se siano la stessa cosa. Quando entrambe lo saranno, qui comparirà il gesto giusto. | The two phrases look alike, but at least one isn't linked to a component yet: without that, we can't tell whether they're the same thing. Once both are, the right action will show up here. |
| `nessunDisordineTitolo` | Tutto in ordine | All tidy |
| `nessunDisordine` | (esiste, si accorcia) Nessuna coppia di frasi si somiglia troppo. | No pair of phrases is too alike. |

Chiavi che escono (dopo averle cercate con `grep` nell'albero): `domanda1Titolo`
… `domanda3Sottotitolo`, `nonDocumentato` (sostituita da `senzaDescrizione`),
`maiAggiornato` (la riga non si mostra), `doppioneNonAutomatizzabile`,
`doppioneSpiegazione` e le altre rimaste senza uso.

## Come si verifica

`vitest` gira solo su `web-ui/__tests__/**/*.test.ts` in ambiente `node`, senza
test di componenti. Quindi **tutta la logica sta in funzioni pure**, e i casi
si scrivono **prima** del codice, nello stile degli esistenti.

### Casi da scrivere prima

**`__tests__/lib/schede-url.test.ts`**
- una scheda valida nell'indirizzo → quella;
- parametro assente, vuoto o sconosciuto (`?scheda=boh`) → la predefinita;
- maiuscole (`?scheda=STEP`) → la predefinita (il valore e' esatto);
- parametro ripetuto (`?scheda=step&scheda=componenti`) → il primo;
- `urlConScheda` toglie `q`, `app`, `stato`, `senza-componente`, `ambigua`,
  `ordina` e tiene `scheda`; non tocca parametri estranei;
- `urlConScheda` scrive **sempre** `scheda=<id>`, anche per la scheda
  predefinita: un link copiato e' cosi' esplicito, e il caso fissa la regola.

**`__tests__/lib/catalogo-filtri.test.ts`**
- ricerca: insensibile a maiuscole e accenti (una lettera accentata si trova
  anche scritta senza accento, e viceversa); piu'
  parole in AND; cerca in frase, intento, nome del componente e pagina; query
  solo di spazi → tutto;
- filtro per applicazione, per stato, "senza componente", e le loro
  combinazioni; un filtro con valore sconosciuto nell'indirizzo (`stato=boh`) si
  **ignora**, non svuota la lista;
- ordinamento `A-Z`: stabile a parita', insensibile ad accenti e maiuscole;
  `Piu' usati`: a zero usi per tutti torna `A-Z`;
- finestra: 137 voci, finestra 50 → 50, poi 100, poi 137; resetta cambiando
  filtro;
- `mostraFiltri(n)`: 0, 1, 8 → falso; 9 → vero;
- andata e ritorno `parseVista` / `serializzaVista`: i valori di default non si
  scrivono; l'ordine dei parametri e' stabile.

**`__tests__/lib/catalogo-numeri.test.ts`**
- catalogo vuoto → tutti zeri, nessuna divisione per zero, nessun `NaN`;
- **una voce** (`the page shows {string}`, `implemented`, senza componenti) →
  `{ totale: 1, pronti: 1, richiesti: 0, ancorati: 0, componenti: 0 }`;
- 137 voci con 10 `implemented` e 127 `wanted` → `10` e `127`, e
  `pronti + richiesti + altri === totale` (con proposti e superati contati in
  `altri`);
- "ancorati" conta gli **step** con almeno un componente, non i riferimenti;
- gli scenari: `null` mentre carica non e' `0` (la casella mostra lo
  scheletro, non uno zero falso);
- `classificaCoppia`: i quattro casi, compreso **"una ancorata e una no" →
  `da-verificare`** (non equivoco), "entrambe ancorate, componenti diversi" →
  equivoco, "applicazioni diverse" → informativa;
- il contatore e' `doppioni + equivoci`; `da-verificare` non entra;
- `arricchisciCoppia`: usa `usatoIn` dal catalogo; frase non trovata → `[]`;
- `impattoComponente`: uno scenario che passa da due step conta una volta;
  nessun scenario → 0; scenari con lo stesso nome in file diversi sono due;
- `dopoAggiornamento`: `in-corso → ok` → rileggi; `in-corso → fallita` → no;
  `ok → ok` → no; `assente → ok` → no; `in-corso → in-corso` → no.

**`__tests__/lib/percorso-scenario.test.ts`**
- `shop/orders/checkout.feature` → `{ app: 'shop', flusso: 'orders' }`;
- `generated/x.feature` → `{ app: 'generated', flusso: '—' }`;
- `x.feature` (senza cartelle) → entrambi `—`;
- separatore `\` di Windows → stesso risultato.

**`__tests__/lib/formato-data.test.ts`** (con `timeZone: 'UTC'` per non
dipendere dalla macchina)
- `2026-09-25T12:19:15Z` in `it` **non contiene** `PM` e comincia con il giorno;
  in `en` contiene il mese in inglese;
- stringa non valida → `null` (la UI mostra "?").

**`__tests__/lib/catalogo.test.ts`** (esistente, si estende)
- `costruisciCatalogo` porta `stato` e `intento`; senza `doc` → `intento`
  assente.

**`__tests__/fixtures/catalogo/`**: una fabbrica `catalogoGrande(n)` con 500 step,
usata dai test di filtri e numeri (e dalla misura sotto).

### Controlli manuali (prima di dire "fatto")

| Cosa | Come |
|---|---|
| **Tastiera** | Tab entra nelle linguette una volta; frecce spostano il focus e girano; `Home`/`End` vanno agli estremi; `Invio`/`Spazio` attivano; il Tab seguente va al pannello; il contorno del focus si vede in ogni scheda e sulle caselle in testa |
| **Indirizzo** | Aprire `/catalogo?scheda=da-sistemare` porta alla scheda giusta; `?scheda=boh` apre Step; cambiare scheda e poi **Indietro** torna alla precedente; digitare in ricerca e premere Indietro **non** ripercorre le lettere; ricaricare la pagina conserva scheda e filtri |
| **Lettore di schermo** (NVDA su Windows) | La lista si annuncia come "schede"; la linguetta dice "Step, scheda 1 di 3, selezionata"; "Da sistemare, 4 coppie da guardare"; "Mostro 50 di 137" viene letto cambiando filtro; la striscia di esito viene letta dopo una fusione; le caselle in testa si leggono per intero |
| **390px** | Nessuno scorrimento orizzontale della pagina; le tre linguette ci stanno; il pulsante del passo 3 va a capo a tutta larghezza; nessuna cella tagliata |
| **Tema scuro** | Ambra, verde, rosso e il bordo del contatore mantengono il contrasto 4,5:1; la linguetta attiva si distingue senza colore (barra + grassetto) |
| **Lingue** | La data e' nel formato della lingua; nessuna chiave mancante (`npm run check:i18n`) |
| **Stati** | Con **una sola voce** (oggi): niente barra, il suggerimento di partenza, Componenti e Da sistemare vuoti ma sensati. Con 137 e con **500** voci (fabbrica) la pagina resta fluida |
| **Fusione** | Doppione con gestori uguali; doppione con gestori diversi (casella + "Fondi comunque"); Annulla; fusione con `catalogoRigenerato: false`; distingui |
| **Build** | `npm run build` in `web-ui` (conferma il `Suspense`), `npm test`, `npx tsc --noEmit` e `npm run check:i18n` |

### Rischi

- **Il costo di `individuaCoppie` con 500 step.** O(n^2) con Levenshtein; si
  **misura** con la fabbrica a 500. Se supera circa un secondo, la correzione e'
  a monte e piccola (scartare le coppie le cui lunghezze differiscono di piu' del
  15%: non possono superare la soglia di 0,85) e va fatta in
  `lib/riconciliazione.ts` con i suoi test, **come lavoro a parte**: qui non si
  tocca. Intanto la pagina non aspetta: il numero di "Da sistemare" e' l'ultimo a
  riempirsi.
- **Base UI `Tabs` e l'attivazione manuale.** La versione installata e' 1.5.0 e
  ha `activateOnFocus`; il comportamento di `Home`/`End` si conferma a mano (vedi
  sopra) prima di contarci.

## Come si costruisce

In quest'ordine, un commit ciascuno, ogni passo con i suoi test gia' scritti:

1. Le funzioni pure e i loro test (`schede-url`, `catalogo-url`,
   `catalogo-filtri`, `catalogo-numeri`, `percorso-scenario`, `formato-data`) e i
   due campi in piu' di `costruisciCatalogo`.
2. Le risorse (`risorse-catalogo.ts`) e l'intestazione, con la riga di
   aggiornamento e la data corretta.
3. `Schede` + `useSchedaUrl`, e la pagina con le tre schede ancora vecchie
   dentro (si vede subito il guadagno).
4. Scheda Step; poi Componenti.
5. Scheda Da sistemare: le quattro varianti di coppia, la striscia di esito.
6. Pulizia: file tolti, chiavi i18n, `SezioneScenari` lasciata al
   sotto-progetto 2.
7. I controlli manuali, e l'aggiornamento di `docs/TESTER-DASHBOARD-GUIDE.md` e
   di OVERVIEW §4 (la riga del Catalogo).

## Fuori da questo lavoro, e punti di contatto

**Fuori:**

- il **motore** delle coppie (soglia, criteri, prefiltro): `lib/riconciliazione.ts`;
- la **rigenerazione del catalogo dopo il salvataggio** (la causa di F19);
- la correzione dell'**intento tagliato** nell'estrattore;
- la **fusione per coppie "da verificare"** (vedi domande aperte);
- il **Gold**, la matrice di punteggio e la coda del rituale mensile: vivono
  nell'osservatorio sulla wiki (`docs/anti-entropy/06-rituale.md`). Questa
  scheda e' il posto in cui chi mantiene il vocabolario lavora **tra** un
  rituale e l'altro, sul catalogo del repository; la frase che "resta" in una
  fusione e' un Gold in piccolo, ma qui non c'e' nessun punteggio;
- `catalog-apply` e `catalog-refactor` (ROADMAP §4 punto 5): la fusione con
  anteprima e' un loro pezzo gia' fatto, per una coppia alla volta.

**Punti di contatto con gli altri sotto-progetti:**

| Con | Cosa |
|---|---|
| **Pagina Scenari** (2) | Riceve `SezioneScenari`, le sue chiavi i18n e il pulsante Esporta. La casella "Scenari" in testa porta a `/scenari`: questo lavoro **atterra dopo** (o insieme a) quella pagina. La risorsa `scenari` qui conta `GET /api/scenari`; se la pagina Scenari ne ha gia' una uguale, si importa la sua. `percorso-scenario.ts` e' condiviso: chi arriva secondo usa quello del primo. Un link per scenario da una riga Step verso la pagina Scenari dipende da come quella pagina indirizza uno scenario: oggi non c'e', e le righe mostrano solo il nome |
| **Dismissione del portale** (di `/portale`, `/components`, `/tags`) | **`/components`**: la scheda Componenti ne e' l'erede e lo supera (aggiunge gli scenari che dipendono dal componente), quindi si puo' togliere. **`/portale`** (catalogo e editor del vecchio portale): il filtro per applicazione e per stato entra nella scheda Step; `area` e `domain` no (T3 e' ancora aperta). **`/tags`**: l'indice per pagina si basa sui commenti `#PAGINA` scritti a mano nei `.feature`, che le registrazioni non producono; l'informazione "su che pagina vive" sta gia' nel componente. **Non entra**: se il portale sparisce e serve ancora, si aggiunge in Componenti un modo di ordinare per pagina (`ordina=pagina`), non una quarta scheda |
| **Esecuzione / Registra** | Possono linkare il Catalogo con `urlCatalogo(...)`. Registra e' anche il pulsante di partenza dei vuoti ("Registra una sessione") |
| **Barra laterale** | Nessun cambio: la voce "Catalogo" porta a `/catalogo`, cioe' alla scheda Step. Il contatore delle coppie **non** va sulla voce della barra (e' una decisione da tenere separata: aprirebbe un secondo posto in cui mantenerlo) |

## Domande aperte

| # | Domanda | Opzioni | Raccomandazione |
|---|---|---|---|
| Q1 | Come si chiama la terza scheda? | **a)** "Ordine"; **b)** "Doppioni"; **c)** "Da sistemare" | **c.** "Ordine" e' ambiguo per un tester, "Doppioni" esclude gli equivoci. In inglese "To tidy up" |
| Q2 | Il tester puo' fondere due frasi i cui gestori **non fanno la stessa cosa** ("Fondi comunque")? | **a)** si, con il confronto dei gestori dietro "Dettagli tecnici" e la casella di conferma; **b)** no: la fusione e' bloccata e il tester chiede a chi mantiene l'automazione; **c)** come oggi (confronto in vista) | **a.** Non toglie il gesto a chi e' competente, non mostra codice a chi non lo e', e la frase "meglio deciderlo con chi mantiene i test" lo dice |
| Q3 | Le coppie "da verificare" (testo quasi uguale, uno dei due senza componente) hanno un gesto? E' il caso piu' comune finche' gli step scritti a mano non dichiarano componenti | **a)** solo informazione, per ora; **b)** offrire la fusione quando i gestori sono equivalenti (il controllo esiste gia' in `fondi`), anche senza componenti | **a** qui; **b** e' un lavoro a parte, con le sue prove, perche' cambia cosa il motore considera sicuro |
| Q4 | "Distingui le frasi" deve avere un "Annulla"? | **a)** no, lo si dichiara prima di premere; **b)** si, salvando un'istantanea come fa la fusione | **a.** Costa un lavoro lato server; il passo 2 lo dice chiaro |
| Q5 | Aprendo `/catalogo`, la scheda e' sempre Step, o si ricorda l'ultima visitata? | **a)** sempre Step; **b)** ricorda l'ultima | **a.** E' prevedibile, i link espliciti coprono il resto, e chi mantiene il vocabolario ha la casella "Da sistemare" in testa |
| Q6 | Il contatore deve contare solo le coppie su cui si puo' agire, o tutte (comprese "da verificare" e "solo da sapere")? | **a)** solo azionabili, con "+ K da verificare" a parte; **b)** tutte | **a.** Un numero che non si azzera insegna a ignorarlo |
| Q7 | Il pulsante "Riprova ora" quando l'aggiornamento e' fallito: si fa? | **a)** si (lancia il comando `catalogo`); **b)** no: il tester aspetta il prossimo salvataggio | **a.** "Un comando dove puo' esserci un pulsante" (ROADMAP §5); l'elenco chiuso resta chiuso |
| Q8 | L'indice dei tag del vecchio portale entra? | **a)** no; **b)** si, come ordinamento "per pagina" in Componenti; **c)** si, come quarta scheda | **a.** Dipende da commenti scritti a mano che le registrazioni non producono; se serve ancora, **b** costa poco |
| Q9 | Le linguette Step e Componenti portano un conteggio come "Da sistemare"? | **a)** no; **b)** si | **a.** Il numero e' gia' in testa; tre contatori sulla stessa riga smettono di dire cosa e' urgente |
