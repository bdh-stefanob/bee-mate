# L'assistente nel cruscotto — design

> Proposta del 2026-10-01, **non ancora approvata**. Sotto-progetto 5 di 5 della
> richiesta "come aggiungere Kiro e l'AI al prodotto". Nessun codice, nessun
> messaggio, nessuna configurazione e' stato toccato scrivendo questo file.

## Stato (2026-10-01)

**Solo progetto.** Cio' che esiste oggi, verificato leggendo i file:

| Cosa | Dove | Nota |
|---|---|---|
| Il compito per l'assistente, generato | `scripts/lib/generate-brief.ts` → `reports/generate/<nome>/brief.md` | per ogni passo i candidati di catalogo in due classi (stessi componenti / formulazione simile) e i metodi disponibili. **Contiene anche i valori digitati dal tester e le note** (vedi "Cosa entra") |
| La rosa di candidati | `rankCandidates` in `scripts/lib/generate-core.ts` | prima chi tocca gli stessi componenti, poi chi somiglia come frase (soglia 0,45); al massimo cinque |
| Due agenti Kiro | `.kiro/agents/bdd-generate.json` (scrive), `bdd-authoring.json` (sola lettura) | generati da `.amazonq/cli-agents/` |
| Il campo `origin` | `Origin = "deterministico" \| "assistito"` in `scripts/lib/generation-contract.ts`; scritto in ogni `GeneratedFile` e nel manifesto | oggi sempre `deterministico` |
| La misura | `scripts/benchmark.ts`, `scripts/lib/benchmark.ts`, `benchmark-arena.ts` | sette misure per esecuzione, referto di soli numeri |
| La riscrittura di una frase ovunque compaia | `web-ui/src/lib/riscrittura-step.ts` | tutto-o-niente, **solo frasi senza parametri** |
| L'elenco chiuso dei comandi | `web-ui/src/lib/esecuzione.ts` | nove nomi; nessuno avvia un assistente |
| La spiegazione di un fallimento, senza AI | `web-ui/src/lib/artefatti.ts` (`riepilogoErrore`), `diagnosi-fallimento.ts` | pagina attesa, indirizzo raggiunto, elemento mancante; due cause riconosciute con sicurezza |
| La voce "Assistente" in Controllo | `scripts/diagnosi.ts` | cerca `kiro-cli`, `kiro`, `q` sul PATH; e' una voce **avanzata**: non entra nel calcolo di "pronto" |

Cio' che **non** esiste: un pulsante che chiami un assistente, un formato di
proposta, un modo di vedere cosa ha proposto un modello, una misura del valore
dell'assistente dentro il cruscotto, il confronto con/senza regole (P8: non
ancora fatto).

Una nota sui numeri del catalogo: `OVERVIEW.md` parla di 137 voci (10 realizzate,
127 `@wanted`). Il `step-catalog.json` presente su questa macchina, il
2026-10-01, ne contiene 2. Le cifre di OVERVIEW vengono dalla macchina di
lavoro; qui sotto si ragiona su quelle, e ogni misura va rifatta sul catalogo
della macchina dove si misura.

## Perche' esiste, e la risposta onesta alla domanda del proprietario

La domanda: *come aggiungere Kiro e l'AI al prodotto?* La risposta in tre
frasi, prima del dettaglio:

1. **Il prodotto funziona gia' senza.** Tutta la catena registra → genera →
   esegui e' deterministica (F17), ed e' un requisito che resti cosi' (R8.2).
   Qualunque cosa si aggiunga qui e' un di piu' spegnibile.
2. **Un solo compito dell'AI regge a un esame serio: fare da ponte fra le parole
   del tester e il vocabolario del catalogo.** E' l'unico punto della catena in
   cui un giudizio di significato serve davvero, ed e' l'unico in cui oggi si
   usa Kiro a mano (D23 ne indica due: "la frase Gherkin" e "quale metodo
   chiamare"; il secondo il generatore lo copre gia' in gran parte con un metodo
   per componente nell'ordine registrato, e quanto resti da fare a un modello
   andrebbe misurato prima di progettarci sopra).
3. **Quanto valga quel ponte non lo sappiamo.** Il confronto con/senza regole
   (P8) non e' stato fatto, e nessuno ha misurato quanto spesso un candidato
   proposto sia quello giusto. Questa specifica descrive come costruire il
   meccanismo **e** come scoprire se serve, e mette la scoperta prima della
   spesa: la prima fetta non contiene AI.

## Cosa deve essere vero alla fine

1. Con l'assistente assente, spento o rifiutato dai giudici, il tester registra,
   genera, salva ed esegue **esattamente come oggi** (R8.2), con gli stessi file
   byte per byte.
2. Nessuna riga di un file del repository cambia senza un si' esplicito di una
   persona, riga per riga, con l'originale visibile accanto alla proposta.
3. Ogni file e ogni frase portano la loro origine (`deterministico` o
   `assistito`), e si puo' dire dopo, con un numero, quanto lavoro ha fatto
   l'assistente e quanto di quel lavoro e' stato tenuto.
4. Nessuna funzione "AI" e' accesa senza una misura che dice se aiuta, con la
   soglia scritta **prima** di misurare.
5. Il perimetro dei dati e' scritto, minimo e controllabile: si sa, per ogni
   funzione, cosa entra nel modello e cosa non puo' entrarci per costruzione.

---

## 1. Il principio, riscritto per questo lavoro

> **L'AI propone. Un giudice che non discute dice se la proposta e' ammessa.
> Una persona decide. Se l'AI manca, il prodotto non se ne accorge.**

I giudici che abbiamo gia' (F18), e cosa **non** possono giudicare:

| Giudice | Cosa prende | Cosa NON prende |
|---|---|---|
| Il catalogo / `validate:steps` | una frase che non esiste; una variante nota | una frase che esiste ma **e' un'altra intenzione** |
| `tsc` | un metodo o un tipo inventato | un metodo che esiste ma e' quello sbagliato |
| Dry-run di Cucumber | una frase senza la sua glue | una glue che fa la cosa sbagliata |
| Esecuzione vera | un test che non passa | un test che passa e non prova niente |
| Conferma umana | quasi tutto, **se la persona guarda** | cio' che la persona accetta senza guardare |

Questa tabella e' il punto della specifica. I giudici di codice garantiscono la
**forma**; il **significato** di una proposta (questa frase del catalogo vuol
dire la stessa cosa della mia?) non lo giudica nessuna macchina. Lo giudica la
persona che conferma, e **quanto bene lo faccia si misura** (sezione 6). Per
questo la funzione che sceglie e' costruita in modo che il modello non possa
produrre altro che una scelta fra opzioni elencate: cosi' l'unico errore
possibile e' di significato, che e' l'errore che la conferma e la misura
sorvegliano, e non un errore di forma che passa in silenzio.

### La tabella: funzione, cosa propone, chi decide, senza AI

| Funzione | Cosa propone l'AI | Chi decide | Se l'AI manca |
|---|---|---|---|
| a. Frasi nel vocabolario del catalogo | per ogni passo, una voce **fra i candidati elencati**, oppure "nessuna" | catalogo (la voce esiste, ed e' fra i candidati di quel passo) · `tsc` + dry-run + validatore dopo l'applicazione · **la persona, riga per riga** | restano le frasi del tester; il riquadro mostra i candidati scelti dalle regole, e la persona sceglie da se' |
| b. Nomi dei passi | un nome per intento | la persona (e' l'atto che il metodo le chiede) | la proposta di confini e di etichette che gia' fa `labelling.ts` |
| c. Spiegare un fallimento | una frase in parole semplici e una causa probabile | **nessun giudice**: solo l'esecuzione successiva, e la persona | `riepilogoErrore` e le due cause riconosciute |
| d. Locator alternativo | un `role`+`name` al posto di quello rotto | dizionario dell'inventario (esiste sulla pagina?) · esecuzione vera · diff e conferma | rilancio dello scout e rigenerazione della Page Object |
| e. Raggruppare per significato | coppie o gruppi di frasi che dicono la stessa cosa | rituale mensile (persone) | `cluster.ts`, lessicale, invariato |
| f. Bozza della coda del rituale | testo di motivo ed esempio | persone nel rituale | la coda gia' porta una proposta, un motivo e un esempio (`catalog-sync.ts`) |
| g. Caso della wiki → scenario con sole frasi del catalogo | uno scenario composto da voci **elencate** | validatore · persona | il caso resta com'e' sulla wiki; l'import deterministico (`import-scenarios.ts`) |
| h. Verifiche mancanti | una verifica da aggiungere, guardando l'inventario | **nessun giudice**: solo la persona che la rifarebbe a mano | il conteggio delle verifiche dichiarate e l'avviso se zero |

Le righe c e h hanno la cella "chi decide" senza giudice. E' il segno di una
funzione che non puo' entrare come "l'AI propone, i giudici decidono": al
massimo come consiglio etichettato, mai come azione. Sono due delle ragioni per
cui scendono in classifica (sezione 2).

### Il perimetro dei dati: cosa entra, cosa non entra, mai

La regola di `ROADMAP.md` §5 e' "nessun dato dell'applicazione fuori dalla
macchina; solo i numeri escono". Un modello raggiunto tramite Kiro **e'** fuori
dalla macchina: il compito viaggia verso il fornitore del modello. La regola e'
gia' in tensione con la pratica di oggi (si incolla `brief.md` in Kiro a mano) e
non va nascosta: e' la domanda Q-A1 per il proprietario. Il modo in cui questa
specifica la tratta e': **il canale e' quello approvato in azienda, e si manda il
meno possibile, per costruzione e non per buona volonta'**.

| Entra nel compito (funzione a, variante minima) | Non entra mai |
|---|---|
| l'etichetta che il tester ha dato al passo | valori digitati nei campi |
| la parola chiave (Given/When) | password, sessioni, credenziali, `.env`, `bdd-targets.json` |
| le frasi dei candidati (testo del catalogo) | indirizzi, percorsi di pagina, nomi di host |
| il numero d'ordine del passo | note lasciate durante la registrazione |
| | testi delle verifiche (spesso sono dati dell'applicazione) |
| | schermate, inventari dei componenti, la traccia intera |
| | corpi degli step, Page Object, codice in genere |

Due varianti si **misurano**, non si scelgono a sensazione: A (minima, sopra) e B
(A piu' ruolo e nome dei componenti toccati). B espone nomi di elementi
dell'applicazione; si adotta solo se la misura mostra che A non basta, e solo
con il via libera di Q-A1.

Il compito dell'assistente nel cruscotto e' quindi **piu' piccolo** di
`brief.md`, che oggi include valori digitati (`con "..."` in
`generate-brief.ts`) e note. La strada manuale con `brief.md` continua a
esistere per la persona tecnica; la strada dal cruscotto non puo' mandarli,
perche' il generatore del compito non li legge (verificato da un caso, sezione 9).

---

## 2. Le funzioni candidate

Per ognuna: il problema del tester, cosa entra, cosa esce, il giudice, il
rischio, il costo, come si misura. Le stime di costo sono **stime**, non misure.

### a. Portare le frasi dei passi nel vocabolario del catalogo

- **Problema.** Il tester nomina i passi con le sue parole (e fa bene: F17, D11).
  Quelle parole sono vere ma non sono nel vocabolario condiviso: lo scenario
  salvato **aumenta** l'entropia invece di ridurla. Oggi la distanza la colma una
  persona tecnica con Kiro e `brief.md`, a mano, fuori dal cruscotto.
- **Entra.** Etichetta, parola chiave, candidati (variante A). **Non entra:**
  tutto il resto della tabella sopra.
- **Esce.** Per ogni passo: `voce` (identica a un candidato) oppure `nessuna`,
  piu' una riga di spiegazione. **Non** frasi nuove (la proposta di una voce
  nuova `@wanted` e' fuori dalla fetta, vedi b).
- **Giudice.** Forma: la voce deve essere **uguale byte per byte** a uno dei
  candidati di quel passo nel compito (non "e' nel catalogo": e' fra le
  opzioni che le sono state date). Dopo l'applicazione: validatore, `tsc`,
  dry-run. Significato: la persona.
- **Rischio.**
  1. *Errore di significato accettato senza guardare* (distorsione da
     automazione): il rischio principale; il catalogo si sporca con un'intenzione
     sbagliata e nessun giudice di codice se ne accorge. Mitigazione: niente
     preselezionato, la frase originale accanto, e la misura dei falsi accetti.
  2. *La rosa non contiene la frase giusta.* Il modello sceglie fra cinque
     candidati scelti per somiglianza lessicale, e la sola classe che sopravvive a
     un catalogo senza componenti dichiarati e' quella lessicale: etichette
     italiane e catalogo inglese non si incontrano per somiglianza (F16). Se la
     frase giusta non e' nella rosa, il ponte non si puo' fare. Si misura il
     **richiamo della rosa** (sezione 6); se e' basso la correzione e' allargare
     la rosa (variante "ampia": l'intero catalogo dell'applicazione, che a 137
     voci sta in contesto), da **misurare** come terza variante, non da assumere.
  3. *Il catalogo e' quasi tutto `@wanted`* (127 su 137): scegliere una voce
     `@wanted` significa che lo step generato **realizza** quella voce. E' un
     vantaggio, ma una voce **gia' realizzata** da un altro scenario salvato
     fermerebbe il salvataggio per frase duplicata, perche' il riuso di una
     definizione esistente non e' ancora costruito (`ROADMAP.md` §4, punto 3,
     riga ⬜). Fino ad allora le voci realizzate compaiono disabilitate, con il
     motivo scritto.
  4. *Frasi con parametri:* `riscrittura-step.ts` rifiuta per costruzione le
     frasi con `{string}`/`{int}`. Limite dichiarato della prima versione: i
     candidati con parametri si mostrano ma non si applicano.
  5. *Due passi che puntano alla stessa voce* fonderebbero due definizioni con
     corpi diversi: nella prima versione sono mutuamente esclusivi.
- **Costo (stima).** Il compito esiste in parte (`rankCandidates`); servono
  generatore del compito piu' piccolo, validatore della proposta, applicazione
  con annulla, riquadro, un comando nuovo nell'elenco chiuso: circa 5-7 giorni in
  tutto, di cui 3-4 per la parte senza AI (fetta 1).
- **Come si misura.** Sezione 6. **Ipotesi** da verificare: che la scelta del
  modello fra i candidati superi di almeno 15 punti di copertura la regola
  "prendi il primo candidato agganciato", a parita' di precisione.
- **Verdetto: fare, per prima, in due tempi** (prima senza AI, poi con).

### b. Proporre i nomi dei passi a fine registrazione

- **Problema.** Nominare costa fatica a fine sessione.
- **Perche' no.** Il nome e' l'**unico dato semantico** che dai gesti non si
  deduce (D11, `labelling.ts`): e' il motivo per cui il metodo si regge. Farlo
  proporre a un modello mette un'ipotesi dove ci doveva essere un'osservazione, e
  chi e' stanco accetta. Servirebbero inoltre i gesti, i valori e i testi, cioe'
  la parte piu' sensibile dei dati. E la funzione a gia' assorbe il bisogno
  vero: il tester nomina nelle sue parole, e il ponte verso il vocabolario lo fa
  a. Il numero per decidere di rivederla esiste gia': `Recording.nominazione`
  conta proposti, accettati, rinominati, uniti. Se la proposta **deterministica**
  fosse rinominata quasi sempre, si migliora `etichettaProposta`, che e' codice.
- **Verdetto: non fare.** Rivedere solo se `nominazione` mostra che la proposta
  deterministica e' quasi sempre rifiutata **e** i tester lo chiedono.

### c. Spiegare un fallimento in parole semplici

- **Problema.** "Elemento non trovato" non dice cosa e' successo.
- **Cosa fa oggi senza AI.** `riepilogoErrore`: pagina attesa, indirizzo
  raggiunto, elemento mancante quando la pagina e' giusta; due cause con
  firma sicura (browser mancante, indirizzo irraggiungibile).
- **Quanto si guadagna senza AI, prima.** Due segnali deterministici che oggi
  mancano e che coprono i casi piu' frequenti, ognuno con la sua frase: *sessione
  scaduta* (l'indirizzo raggiunto e' la pagina di accesso dell'ambiente) ed
  *elemento rinominato* (il componente cercato non c'e', ma l'inventario ne ha uno
  dello stesso ruolo con nome simile: si calcola con `tokenSetRatio`, gia' nel
  repository). Sono lavoro **non AI**, e vanno nel backlog (sezione 10).
- **Se poi si volesse l'AI.** Entrerebbe il messaggio d'errore, che contiene
  indirizzi e nomi di elementi: dati dell'applicazione. L'uscita e' una
  spiegazione libera, **senza giudice**: nessuna macchina puo' dire se la causa
  indicata e' vera. Potrebbe solo comparire come "ipotesi dell'assistente",
  sotto i fatti, mai come causa e mai legata a un'azione.
- **Costo.** Basso per la parte deterministica (circa 1 giorno, stima), medio per
  l'AI piu' la sua misura (serve un insieme di fallimenti con la causa nota,
  classificati da una persona).
- **Verdetto: non fare l'AI ora; fare le due regole.** Riprendere l'AI solo
  dopo aver misurato quanti fallimenti restano "sconosciuti" con le regole.

### d. Proporre un locator alternativo quando uno si rompe

- **Problema.** La Page Object punta a un `role`+`name` che l'applicazione ha
  cambiato.
- **Perche' l'AI aggiunge poco.** Le Page Object generate si **rigenerano**
  dal dizionario (D24; "non toccare, si rigenera"). Il rimedio giusto e' rilanciare
  lo scout sulla pagina e rigenerare, non scrivere una patch. Il candidato
  migliore si trova **nell'inventario**, che e' la fonte di verita': stesso
  ruolo, nome piu' vicino. Un modello potrebbe proporre un selettore CSS o un
  nome che sulla pagina non esiste (e' la misura `locatorNonNelDizionario` del
  benchmark, nata per questo), e allora l'unico giudice e' l'esecuzione.
- **Se si facesse.** Mai applicato da solo: diff, e conferma, e solo candidati
  presenti nell'inventario fresco, cioe' una **scelta**, non una scrittura.
  Ma allora il candidato lo sa trovare lo script, senza modello.
- **Verdetto: non fare come AI.** La versione deterministica ("l'elemento che
  cercavi non c'e', ma ce n'e' uno simile nel dizionario") sta con c nel backlog.

### e. Raggruppare le varianti per significato

- **Problema.** Il raggruppamento lessicale assorbe il 14% della varieta' (F12;
  246 intenzioni su 353 compaiono una volta). Un raggruppamento per significato
  potrebbe unire parafrasi che il lessico non vede, specie fra lingue.
- **Entra.** Le frasi del corpus: e' il **volume piu' grande e piu' sensibile**
  di dati di tutto l'elenco (569 + 279 occorrenze reali, oggi in un `-full.json`
  che per scelta resta sulla macchina).
- **Rischio specifico, il piu' serio dell'elenco.** `cluster.ts` spiega perche'
  non usa embedding: **un numero che nessuno sa rifare a mano non regge alla
  domanda "e come fai a saperlo?"**, e non e' riproducibile fra due esecuzioni.
  Il reuse ratio e' il numero da slide. Se lo si rimisura con un altro strumento
  si confronta lo strumento, non l'entropia. Quindi: **il raggruppamento lessicale
  resta la misura ufficiale, sempre**; quello semantico puo' essere solo un
  generatore di *proposte di fusione* per il rituale, mai un metro.
- **Giudice.** Le persone nel rituale. Ma `catalog-apply` non esiste ancora
  (`ROADMAP.md` §4, punto 5): oggi non c'e' dove registrare le decisioni.
- **Misura.** Sullo **stesso export**, prima e dopo: stesso corpus, stesse
  soglie del lessicale, stesso insieme di coppie valutate da una persona: un
  campione di 100 coppie fuse dal modello e non dal lessico, piu' 100 a caso;
  precisione delle fusioni nuove. **Ipotesi:** il guadagno e' modesto, perche'
  F12 dice che il problema e' l'assenza di vocabolario piu' che la parafrasi.
- **Costo.** Alto (corpus intero, protocollo, giudizio umano su 200 coppie), e
  il rischio sui dati e' il maggiore.
- **Verdetto: dopo.** Solo come proposte per il rituale, dopo che a ha provato il
  canale e il perimetro dei dati, e dopo `catalog-apply`.

### f. Preparare la bozza della coda del rituale

- **Perche' no.** La coda ha gia' per ogni proposta un motivo e un esempio,
  calcolati (`catalog-sync.ts`, campi `reason` ed `examples`). Un modello
  riscriverebbe testo che esiste. Con un effetto perverso: un motivo piu'
  levigato rende **piu' facile approvare**, e il rituale dura quindici minuti
  perche' si scrive solo per dissentire (D21). La qualita' del motivo non e' un
  collo di bottiglia misurato.
- **Verdetto: non fare.**

### g. Da un caso scritto sulla wiki a uno scenario con sole frasi del catalogo

- **Problema.** I casi scritti non sono automatizzati (F1); portarli nel
  vocabolario e' lavoro manuale.
- **E' a con un altro ingresso.** Le righe-passo della wiki sono l'ingresso, la
  rosa di candidati si calcola con lo stesso `rankCandidates` (senza componenti:
  solo la classe lessicale), il modello sceglie, la persona conferma. Stesso
  contratto, stesso validatore, funzione `frasi` con `sorgente: "wiki"`.
- **Rischio che a non ha.** (1) Testo di terzi nel compito: puo' contenere
  istruzioni ("ignora le regole..."). La difesa non e' un filtro sul testo ma la
  **forma dell'uscita** (scelta chiusa) e l'agente di sola lettura. (2) Uno
  scenario che **nessuno ha mai eseguito**: e' il contrario di Specification by
  Demonstration (D9). Mitigazione: l'esito e' sempre `@non-automatizzato`
  (escluso da `cucumber.js`, non offerto in Esecuzione), cioe' **documento**, non
  test, finche' una persona non lo registra.
- **Costo.** Medio, ma solo dopo a: adattatore di ingresso piu' un'uscita.
- **Verdetto: dopo a, se a supera il suo criterio.** Stessa soglia, stesso
  insieme di misura (le frasi della wiki servono anche da corpus di valutazione
  per a: vedi sezione 6).

### h. Suggerire verifiche mancanti guardando l'inventario

- **Problema vero:** uno scenario senza `Then` e' un documento che sembra un test
  (D11).
- **Perche' no.** La verifica e' "cio' che mi ha convinto che e' andata bene":
  e' un'osservazione del tester, non una deduzione dall'inventario. Un modello
  che propone "verifica anche X" inventa un'osservazione che nessuno ha fatto, ed
  e' esattamente lo scenario mai eseguito a mano. Nessun giudice la prende. E
  l'inventario e' un dato dell'applicazione. Il rimedio deterministico esiste ed
  e' gia' in lista: le verifiche tipizzate (`ROADMAP.md` §4, punto 7) e la
  "rilevazione automatica del cambiamento" tenuta da parte
  (`docs/anti-entropy/README.md`, "Miglioramenti tenuti da parte"): il recorder
  mostra **cosa e' cambiato** dopo l'azione e il tester lo conferma.
- **Verdetto: non fare come AI.**

### L'ordine, per valore e costo

| # | Funzione | Valore | Costo | Rischio | Verdetto |
|---|---|---|---|---|---|
| 1 | a, parte senza AI (candidati scelti dalle regole, conferma, annulla) | medio-alto | basso-medio | basso | **fare per prima** |
| 2 | a, con l'assistente | da misurare | basso (sopra il punto 1) | medio (significato) | fare **se** passa il criterio di ingresso |
| 3 | c e d, versioni **deterministiche** (sessione scaduta, elemento simile) | medio | basso | basso | fuori da questo lavoro, nel backlog |
| 4 | g | medio-alto | medio | medio-alto | dopo 2, condizionale |
| 5 | e | potenzialmente alto | alto | alto (dati, metro) | dopo `catalog-apply` e dopo 2, solo come proposta |
| 6 | c con testo dell'AI | basso-medio | medio | medio (senza giudice) | non ora |
| - | b, d (come AI), f, h (come AI) | basso o negativo | - | - | **non fare** |

---

## 3. Come si integra tecnicamente

Quattro strade. La scelta pesa piu' sul **cosa vede e fa il tester** e su
**cosa succede quando qualcosa va storto** che sul resto: i dati che escono
dipendono dal contenuto del compito, non dal mezzo con cui arriva al modello.

### (i) Kiro CLI lanciato dal cruscotto, come comando dell'elenco chiuso

- **Come.** Un comando nuovo `proponi`, con un solo parametro tipizzato (l'id del
  compito, validato da un'espressione regolare come `BERSAGLIO_VALIDO`). La riga
  e' scritta nel modulo: `kiro-cli chat --no-interactive --agent bdd-propose
  "<istruzione fissa con l'id>"`, senza shell (Node sul file, come D33). Mai un
  testo libero dalla finestra.
- **F24 pesa cosi'.** Non presidiato, `fs_write` risultava "tool not found"; con
  `--trust-all-tools` l'agente ottiene la shell, ed e' proprio cio' che D29
  vieta. Quindi **non si usa la scrittura**: l'agente `bdd-propose` ha solo
  `fs_read`, auto-approvato, e **risponde sullo stdout** con la proposta fra due
  marcatori fissi; il cruscotto la raccoglie e la valida. Nessuna
  `--trust-all-tools`, mai. Resta da provare (sonda P10, 5 minuti) che
  `--no-interactive` con il solo `fs_read` risponda in modo affidabile.
- **Come si rileva il fallimento.** Dagli **artefatti**, non dall'uscita (D34):
  il comando riesce se e solo se si ricava una proposta che il validatore
  accetta. Qualunque altro esito (processo terminato male, tempo scaduto, niente
  fra i marcatori, JSON invalido, id sbagliato) e' "nessuna proposta", con la
  stessa schermata dell'assistente assente. Tempo massimo fissato (90 secondi,
  da tarare con la sonda).
- **Dati.** Il compito verso il fornitore del modello approvato.
- **Costo.** Nessuna licenza nuova; il consumo di quota del piano Kiro gia'
  attivo **non lo so**: va chiesto a chi lo amministra (Q-A6).
- **Affidabilita'.** La piu' incerta: dipende da un binario che sulla macchina
  aziendale puo' non esserci (`07-assistente.md`), che si installa con una riga
  da concordare con chi gestisce la macchina, e da un comportamento non
  presidiato gia' risultato inaffidabile una volta.
- **Cosa vede il tester.** Un pulsante, un'attesa, una proposta. E' l'esperienza
  giusta, ma e' l'ultima cosa che si puo' garantire.

### (ii) Kiro IDE resta lo strumento; il cruscotto prepara e legge ("passaggio di mano")

- **Come.** Il cruscotto scrive `compito.md` (e `compito.json`), mostra "Copia
  l'istruzione" (una riga da incollare nella chat di Kiro: *leggi il compito in
  `reports/assistente/<id>/compito.md` e rispondi come dice*). La persona la
  incolla, Kiro risponde; la risposta arriva in due modi equivalenti: l'agente
  scrive `proposta.json` nella cartella (l'IDE chiede la sua approvazione, come
  sempre), **oppure** la persona copia la risposta e la incolla in un campo del
  cruscotto ("Incolla la risposta"). Poi **"Ho finito: controlla"**.
  Il secondo modo esiste apposta: non dipende da `fs_write`, quindi regge anche
  dove F24 morde.
- **Nessun comando nuovo nell'elenco chiuso** per questa parte (la copia negli
  appunti e' del browser). Un comando facoltativo `apri-assistente`
  (apre l'IDE sulla cartella, parametro: l'id) e' una comodita' successiva, non
  un prerequisito.
- **Dati.** Identici a (i).
- **Costo.** Come (i). **Affidabilita'.** Alta per costruzione, perche' ogni
  passaggio e' di una persona e nessuno e' presidiato da uno script: e' lo
  strumento che oggi funziona (P3).
- **Cosa vede il tester.** Un passaggio che non e' suo: aprire un IDE da
  sviluppatore e incollare. **Onesta': e' per la persona tecnica**, non per il
  tester manuale senza terminale. E' coerente con chi fa oggi questo lavoro a
  mano.

### (iii) Un contratto neutro rispetto al fornitore

Non e' un'alternativa a (i) e (ii): e' lo **strato sotto entrambe**. Un file di
compito in ingresso, un file di proposta in uscita con schema validato (sezione
4). Chi lo produce e' un campo dichiarato (`strumento`: `kiro-ide`, `kiro-cli`,
`amazonq`, `altro`), e la finestra **non cambia comportamento** in base ad esso.
Kiro, Amazon Q o un altro strumento sono intercambiabili, come D5 dice (il
sistema e' AI-agnostic).

Limite dichiarato: la finestra non puo' impedire a una persona di incollare una
risposta ottenuta da uno strumento non approvato. Puo' registrare lo strumento
dichiarato e dire nella guida che la regola e' sua. Non va presentato come un
controllo.

### (iv) Un modello locale

Nessun dato esce dalla macchina: e' il solo aspetto in cui vince. Ma: nessun
modello locale e' stato approvato ne' provato qui; richiede hardware non
verificato; la licenza dei pesi non e' detto sia compatibile con "zero licenze
nuove"; la qualita' sul ponte italiano → inglese e' sconosciuta. E' una strada
plausibile **dietro il contratto** (iii), perche' e' un altro `strumento`. Non
si pianifica ora.

### La tabella

| | Dati che escono | Costo | Affidabilita' | Cosa vede il tester |
|---|---|---|---|---|
| (i) CLI dal cruscotto | il compito, al fornitore approvato | nessuna licenza; quota da chiedere | incerta (binario, F24) | un pulsante |
| (ii) IDE con passaggio di mano | il compito, al fornitore approvato | idem | alta | un passaggio da persona tecnica |
| (iii) contratto neutro | invariato: dipende dal contenuto del compito | nessuno | non e' un trasporto | niente: e' lo strato comune |
| (iv) modello locale | nessuno | licenze e hardware da verificare | sconosciuta | un pulsante, se mai |

### La raccomandazione

**(iii) come base, (ii) come primo trasporto, (i) come secondo trasporto
condizionato, (iv) non pianificata.**

1. Il contratto si scrive per primo (e la fetta 1 lo esercita **senza AI**: le
   proposte deterministiche hanno lo stesso formato e lo stesso riquadro).
2. Il primo trasporto e' il passaggio di mano: e' l'unico che oggi si sa far
   funzionare, e serve alla persona che gia' lo fa a mano. Il suo costo e' di
   preparare il compito e leggere il risultato: poco.
3. (i) si costruisce **solo se** la misura dice che l'assistente aiuta (sezione 6)
   **e** la sonda P10 dice che il CLI risponde in modo affidabile con il solo
   `fs_read`. Costruirla prima sarebbe pagare l'integrazione piu' fragile per una
   funzione di cui non conosciamo il valore.

---

## 4. Il contratto di una proposta

### File e posizione

Tutto sotto `reports/assistente/<id>/` (gitignorato: niente esce, D4/ROADMAP
§5). L'id e' `AAAAMMGG-HHMMSS-<4 caratteri>`, valida un'espressione regolare, mai
un percorso.

| File | Chi lo scrive | Contenuto |
|---|---|---|
| `compito.json` | uno script, chiamato dall'elenco chiuso (`compito-assistente`) | il compito in forma strutturata |
| `compito.md` | lo stesso script | lo stesso compito, per l'assistente: regole fisse in testa, poi i passi |
| `proposta.json` | l'assistente (o la persona che incolla) | la proposta |
| `esito.json` | l'applicazione delle scelte | cosa e' stato tenuto, rifiutato, scartato; soli numeri e frasi |
| `prima/` | l'applicazione | copia dei file prima della modifica, per annullare |

`compito.md` e' **generato**, mai scritto a mano: lo stesso argomento di
`generate-brief.ts` (riproducibile, confrontabile, rivedibile). Due compiti
costruiti dalla stessa registrazione e dallo stesso catalogo sono identici
**byte per byte**: e' un caso (sezione 9).

### Lo schema del compito (versione 1)

```json
{
  "schema": 1,
  "id": "20261001-153000-a1b2",
  "funzione": "frasi",
  "sorgente": "registrazione",
  "variante": "A",
  "catalogo": { "impronta": "sha256:<...>", "voci": 137 },
  "passi": [
    {
      "n": 1,
      "parola": "Given",
      "etichetta": "<la frase del tester>",
      "candidati": [
        {
          "voce": "<espressione del catalogo, esatta>",
          "classe": "stessi-componenti",
          "stato": "wanted",
          "parametri": false
        }
      ]
    }
  ]
}
```

- `classe` e' una delle due classi del generatore (`stessi-componenti`,
  `formulazione-simile`): e' una **prova** (identita') o una **stima**
  (somiglianza), e la finestra le mostra in modo diverso.
- `stato` e `parametri` dicono se la voce si puo' applicare (sopra, rischi 3 e
  4): non e' il modello a deciderlo.
- `impronta` e' un hash del catalogo e dei passi: una proposta fatta su un
  compito diverso da quello corrente e' **scaduta**.

### Lo schema della proposta (versione 1)

```json
{
  "schema": 1,
  "compito": "20261001-153000-a1b2",
  "impronta": "sha256:<la stessa del compito>",
  "strumento": { "nome": "kiro-ide", "modello": "<identificativo>", "modelloFissato": true },
  "proposte": [
    { "passo": 1, "scelta": "voce", "voce": "<identica a un candidato del passo 1>", "perche": "<fino a 200 caratteri>" },
    { "passo": 2, "scelta": "nessuna", "perche": "<fino a 200 caratteri>" }
  ]
}
```

### La validazione (la fa un codice, e non c'e' trattativa)

Si valida in **due livelli**, e un livello non rimedia all'altro.

1. **Del file.** Schema 1; campo `compito` e `impronta` uguali a quelli del
   compito corrente (altrimenti: *scaduta*); **nessun campo sconosciuto**
   (si rifiuta, non si ignora: e' il modo di impedire che passi altro); al
   massimo 64 KB; al massimo una proposta per passo; `passo` esistente nel
   compito. Una risposta incollata puo' essere racchiusa in un solo blocco di
   codice: si estrae quello; qualunque altra cosa attorno si scarta. Un file che
   non passa questo livello e' rifiutato **per intero**.
2. **Di ogni riga.** `scelta` e' `voce` o `nessuna`; per `voce`, la stringa e'
   uguale **byte per byte** a un candidato **di quel passo**; `perche` e' testo
   semplice di al massimo 200 caratteri, senza caratteri di controllo. Una riga
   che non passa viene **scartata da sola**, e le altre restano: lo schermo dice
   quante e perche'.

`perche` e `strumento` e `modello` sono **dati non attendibili**: la finestra li
mostra come testo, mai come markup, mai come collegamento, e non li usa per
decidere niente. La certezza dichiarata dal modello **non e' un campo**: la
fiducia autodichiarata di un modello non e' calibrata, e mostrarla invoglia a
fidarsi. Al suo posto si mostrano i fatti del compito (la classe del candidato).

### Come la finestra la mostra

Il riquadro (sezione 7): per ogni passo con una proposta, la frase del tester e
la voce del catalogo **affiancate**, con la classe del candidato in parole e, se
c'e', la spiegazione dell'assistente **etichettata come non verificata**. Per
ogni riga una scelta a due stati: *Tieni la mia frase* / *Usa quella del
catalogo*. **Niente e' preselezionato**: l'assenza di una scelta equivale a
tenere la propria frase. Un unico pulsante in fondo, "Applica N scelte", attivo
solo con N almeno uno. Mai un "accetta tutto".

### Cosa succede quando si applica

Tutto-o-niente, in quest'ordine, riusando `riscrittura-step.ts` e il criterio
"si scrive solo se ogni file si lascia riscrivere":

1. si calcolano le riscritture di **tutti** i file coinvolti (il `.feature` e il
   suo file di step) senza scrivere niente; se anche una sola non si puo'
   (parametri, voce gia' realizzata, due passi sulla stessa voce) non si scrive
   niente e si dice quale;
2. si copiano i file originali in `prima/`;
3. si scrive;
4. si lanciano i **tre giudici** (uno script che li raccoglie e scrive un esito
   in JSON, letto dagli artefatti: nessun giudice nuovo, solo quelli di F18);
5. se anche uno solo fallisce, si **ripristina da `prima/`** e la finestra dice
   quale giudice ha detto no e perche': *proposta rifiutata dai giudici*.

La frase originale del tester resta come commento sopra il passo nel `.feature`
(`# frase del tester: ...`) e in `esito.json`: e' la **variante nota** di quella
voce, il materiale con cui il rituale puo' proporre un alias (D14). Non diventa
un alias da sola: il catalogo cambia solo per decisione delle persone.

### Come si annulla

Finche' lo scenario non e' stato salvato, "Annulla le modifiche" ripristina i
file da `prima/`. Prima di farlo si confronta l'impronta dei file attuali con
quella scritta dall'applicazione: se una persona li ha modificati a mano nel
frattempo, **non si annulla** e si dice perche' (stessa regola di "una Page
Object modificata a mano non si tocca", D40). **Le proposte si applicano prima di
salvare, mai dopo**: dopo il salvataggio lo scenario e' nel repository, e annullare e'
un lavoro di git, non del cruscotto.

### Come si traccia chi ha proposto cosa

Il campo `origin` esiste gia' e si usa cosi':

- ogni `GeneratedFile` il cui contenuto e' cambiato per una riga accettata passa
  a `origin: "assistito"` nel manifesto; gli altri restano `deterministico`;
- `esito.json` porta, per **ogni riga**, un'origine propria: `deterministico`
  (la voce e' stata scelta fra i candidati dalle regole), `assistito` (dal
  modello), `persona` (tenuta la frase del tester). Le righe `deterministico`
  della fetta 1 e `assistito` della fetta 2 usano lo **stesso** formato;
- compare lo strumento dichiarato e il modello, mai una persona: l'attribuzione
  e' per area, mai per persona (D15). Si registrano solo conteggi e tempi, mai
  chi ha cliccato.

Un'aggiunta da verificare con `check:templates`: una riga di commento nel
`.feature` (`# origine-frasi: assistito`) accanto al marcatore di generazione, cosi'
che l'origine sopravviva al salvataggio nel repository. Non tocca la regola del
marcatore (un file senza marcatore e' modificato a mano e non si sovrascrive).

---

## 5. L'agente che prova in solitaria

Il desiderio: far provare la catena a un agente senza una persona accanto. Oggi
un agente puo' pilotare il cruscotto (le rotte `/api/esegui` e le letture degli
artefatti), ma **non** il browser aperto dal recorder, che e' fatto per mani
umane.

Due strade. Un avvertimento che vale per entrambe: **cio' che prova un agente
e' lo strumento, non l'applicazione.** Un agente non ha mai eseguito il test a
mano; scrive cio' che crede che il flusso sia. Se quel risultato entrasse nel
repository come scenario, sarebbe la forma piu' pulita dello scenario mai
eseguito, cioe' il contrario del metodo (D9).

### (a) Registrazione da copione

Il recorder accetta un file di azioni al posto di una persona:

```json
{
  "schema": 1,
  "ambiente": "<nome di un ambiente di collaudo>",
  "intenti": [
    {
      "nome": "<il nome del passo>",
      "azioni": [
        { "azione": "click", "ruolo": "button", "nome": "<nome accessibile>" },
        { "azione": "fill", "ruolo": "textbox", "nome": "<nome accessibile>", "valore": "<valore di prova>" }
      ],
      "verifiche": [ { "ruolo": "heading", "nome": "<nome>", "testo": "<testo atteso>" } ]
    }
  ]
}
```

- **Come produce la stessa traccia di una persona.** Non scrive la traccia: **fa
  le stesse cose che farebbe una persona, e lascia che il recorder le registri**.
  Le azioni si eseguono con `getByRole(...).click()/fill()` sulla pagina, che
  genera eventi del DOM veri, raccolti dal binding `__bddEmit` esattamente come
  per una persona; "Fine intento" e "Verifica" si premono sui pulsanti della
  barra, **per identificativo** (`#intent`, `#assert`, e il campo del nome), non
  per testo (la barra e' ancora in due lingue, `ROADMAP.md` §4 punto 1). Cosi'
  il copione prova anche la barra. Il modo preciso in cui il nome arriva (campo
  della barra o fine sessione) si legge in `recorder-overlay.ts` e
  `fine-sessione.ts` all'inizio della fetta: il vincolo e' che passi dallo
  stesso cammino di un tester, non da uno parallelo. Da controllare: se la barra
  sta in un shadow DOM, i selettori cambiano.
- **Interfaccia.** Nell'elenco chiuso, `registrazione` guadagna un parametro
  `copione`, validato come `percorsoDi` (dentro `reports/`). Un agente avvia
  `registrazione` con quel parametro, poi `generazione`, poi `test`, e legge gli
  artefatti: la catena intera, senza mani umane.
- **Il secondo uso, che vale da solo.** Lo stesso copione e' un **test di
  regressione del recorder**: contro il negozio di prova pubblico (ambiente
  `demo`), il copione deve produrre una traccia con intenti, verifiche e URL
  stampigliati uguali a quelli attesi. Oggi il recorder non ha niente di simile;
  e' cio' che `check:accesso` e' per l'accesso (browser vero contro
  un'applicazione finta) e che `check:all` gia' ospita. **Ipotesi:** abbassa il
  rischio di rompere la barra senza accorgersene, come e' successo piu' volte; si
  misura contando le regressioni del recorder che il caso prende prima dell'uso.
- **Costo (stima).** 1,5-2 giorni.
- **Come si evita che diventi un modo per scrivere test senza averli eseguiti.**
  Quattro difese, **tutte** necessarie, perche' ognuna da sola ha un buco:
  1. *Provenienza nella traccia.* `Recording.origine: "persona" | "copione"` e
     l'impronta del copione. Il generatore la riporta nel manifesto e in una
     riga del `.feature`.
  2. *Solo ambienti di collaudo.* Un ambiente dichiara `collaudo: true` nel suo
     blocco; un copione contro un ambiente senza quel segno viene rifiutato. Il
     solo ambiente con quel segno, per ora, e' il negozio di prova pubblico.
     **Mai** un ambiente aziendale.
  3. *Il salvataggio rifiuta.* La rotta di salvataggio rifiuta una registrazione
     `copione` con un codice proprio: puo' essere generata ed eseguita, **non
     entra in `src/features/<app>/`**.
  4. *Non sporca il catalogo.* Le step generate hanno `@wanted` e finiscono nel
     catalogo quando si lancia `npm run catalog`: per un copione la generazione
     scrive altrove. Il generatore accetta gia' un `out` (`outRoot`, default
     `src`): si indirizza a `reports/collaudo/<nome>/`. **Da verificare** che
     Cucumber regga una radice fuori da `src/` (`cucumber.js` carica
     `src/steps/**`, e `BDD_PATHS` sceglie i percorsi); se no, tag `@da-copione`
     escluso dal catalogo e dal salvataggio. Si decide con un caso, non a occhio.
- **Cosa non e'.** Non e' un corpus per misurare il valore dell'assistente: i
  copioni li scrive un modello, e misurare un modello su scenari scritti da un
  modello non dice niente sulle persone. Serve a provare la **catena**.

### (b) Una porta di debug sul browser del recorder

Un agente si collega al browser (porta di debug) e lo pilota liberamente.

- **Rischio.** La porta di debug non e' autenticata: chiunque sulla macchina si
  collega, e un browser avviato con una sessione salvata (`storageState`) da' a
  chi si collega **l'accesso autenticato**, con i cookie. Su una macchina
  aziendale e' un'apertura da non lasciare accesa. E "libero" vuol dire non
  riproducibile: ogni giro e' un'improvvisazione, e non c'e' niente da rifare
  per confrontare. Un agente che esplora non produce un copione, produce una
  storia irripetibile.
- **Cosa guadagna.** Esplorare un'applicazione che non conosce: utile a chi
  *scrive* un copione, e non a chi lo esegue.
- **Costo.** Basso da fare, alto da mettere in sicurezza (porta casuale, token,
  mai con sessione, mai su ambienti non di collaudo).
- **Verdetto: non fare nel prodotto.** Al massimo una modalita' da
  sviluppatore, solo contro l'ambiente di collaudo, senza sessione, con porta
  casuale: e' un attrezzo di chi costruisce lo strumento, e non entra nel
  cruscotto.

### Raccomandazione

**(a) si', in parallelo alle fette dell'assistente** (non ne dipende, e ci da' un
test del recorder). **(b) no.** E se si volesse far provare la catena **a Kiro**
in solitaria: oggi non e' affidabile (F24); la strada che regge e' un agente
che pilota il cruscotto da fuori (Claude Code, o una persona con Kiro IDE), non
Kiro non presidiato.

---

## 6. La misura

Una funzione "AI" non entra nel prodotto se non ha la sua misura, scritta **prima**
di misurare. Questa sezione e' il criterio.

### Cosa **non** e' ancora stato fatto, e cosa cambia

P8 (con/senza regole) non e' stata eseguita. Questa specifica non dipende dal
suo esito, ma condivide con essa il metodo (le sette misure di `benchmark.ts`, il
modello **fissato**, il campo neutro) e **dovrebbe seguirla o accompagnarla**:
se P8 mostrasse che le regole non cambiano nulla anche su un compito vincolato,
l'agente `bdd-propose` potrebbe essere molto piu' scarno. Q-A10.

### La trappola da non ripetere

F20: Kiro su **Auto** sceglie il modello da solo, e due esecuzioni con due modelli
diversi misurano i modelli. Quindi:

- `proposta.json` porta `strumento.modello` e `modelloFissato`;
- l'agente `bdd-propose` dichiara il campo `model` (come ricorda
  `07-assistente.md`);
- **un'esecuzione con `modelloFissato: false` non entra in nessuna misura**: puo'
  servire alla persona, e non vale come prova;
- cambiare il modello vuol dire **rifare la misura**: la soglia e' del modello
  misurato, non della funzione.

### Come si misura la funzione a

**L'insieme d'oro.** Una persona tecnica, **senza vedere le proposte**, scrive per
ogni passo la voce giusta del catalogo o `nessuna`. Quest'ordine (prima l'oro,
poi le proposte) evita di ancorarsi al giudizio del modello. Un quinto dei passi
lo etichetta una seconda persona: l'accordo fra le due dice quanto e'
soggettivo il metro. Composizione minima: **almeno 60 passi**, di cui almeno 30
da almeno 3 registrazioni vere e il resto da righe-passo del corpus della wiki
(sono scritte da tester, hanno la stessa natura, e sono gia' disponibili: coprono
la classe lessicale, mentre la classe "stessi componenti" richiede registrazioni).
Almeno il 25% di `nessuna`: senza, non si prova l'astensione. Stato di oggi: le
registrazioni vere sono poche (una sessione di P1, il giro di P2); sotto i
requisiti, il risultato si riporta come **aneddotico**.

**I bracci**, sugli stessi passi, con lo stesso catalogo (impronta nel compito) e
lo stesso modello fissato:

| Braccio | Cos'e' |
|---|---|
| R | la **regola**: propone il primo candidato agganciato; se non ce n'e', il primo lessicale sopra soglia |
| A | assistente, variante minima |
| B | assistente, variante con i componenti toccati |
| W | assistente, rosa **ampia** (tutto il catalogo dell'applicazione) |

Ogni braccio assistente si ripete **3 volte** sullo stesso compito: il modello
non e' deterministico, e la stabilita' e' una misura.

**Le misure**, tutte calcolabili senza chiedere un parere:

| Misura | Cosa dice |
|---|---|
| Richiamo della rosa | la voce giusta e' fra i candidati? Se e' bassa, nessuna scelta puo' aiutare |
| Precisione P | fra le proposte `voce`, quante giuste secondo l'oro |
| Copertura C | fra i passi che **hanno** una voce giusta, quanti l'hanno ricevuta |
| Astensione A | fra i passi senza voce giusta, quanti hanno ricevuto `nessuna` |
| Stabilita' S | stessa decisione in 3 esecuzioni |
| **Falsi accetti** | proposte sbagliate che una **persona** ha accettato nella prova d'uso (distorsione da automazione) |
| Le sette misure del benchmark | su ogni scenario salvato; devono **non peggiorare** (l'AI non scrive codice: ci si aspetta zero differenza su compila, senza glue, selettori, locator) e il riuso e gli step nuovi dire se il vocabolario e' migliorato |
| Tempo dal riquadro al salvataggio | mediana, in secondi; si ricava da `esito.json` (tempi locali, nessuna telemetria) |

### Il criterio di ingresso

Le soglie sono **proposte** del progettista: il proprietario le conferma o le
cambia **prima della prima misura**, e dopo non si cambiano (si scrive adesso,
perche' scriverlo dopo non conta niente: `07-assistente.md`).

1. **Sicurezza.** P >= 0,90 e A >= 0,80 per il braccio scelto.
2. **Valore.** C(assistente) supera C(R) di almeno **0,15** assoluti, con P non
   inferiore a P(R) meno 0,02. Se non supera una regola che costa zero, non vale
   le parti in movimento.
3. **Stabilita'.** S >= 0,80.
4. **Nessuna regressione.** Dopo l'applicazione con i giudici, le sette misure
   non sono peggiori del braccio R; `stepNuovi` non aumenta.
5. **Bias.** Con almeno 3 persone che usano il riquadro, i falsi accetti del
   braccio assistente non superano quelli del braccio R. Se li superano, la
   distorsione da automazione e' reale e la funzione non entra.
6. **Modello fissato** in tutte le esecuzioni conteggiate.
7. **Il lato che non e' un modello.** Un insieme di compiti avversari (risposte
   con voci inventate, passi in piu', campi sconosciuti, risposte vecchie, testo
   che imita istruzioni) deve essere **rifiutato al 100%** dal validatore, a
   prescindere dal modello: e' un caso di verifica, non una misura.

**Cosa si puo' dire con 60 passi.** Se i passi con proposta sono circa 45, un
intervallo al 95% attorno a P = 0,90 e' di circa nove punti percentuali. La
soglia e' un **cancello minimo**, non la prova di un valore: sopra la soglia si
continua a misurare in uso (ogni mese, un campione di 10 proposte accettate
riviste da una persona, e i contatori di `esito.json`).

**Se non passa:** la funzione resta spenta (o si toglie), il risultato si
pubblica comunque, e il prodotto non cambia, perche' non dipendeva da lei. E'
un esito valido, come lo e' quello di P8.

### Cosa si misura nella fetta 1, senza AI

Stesso formato, braccio R soltanto: P e C delle regole, tasso di riquadri con
almeno una riga accettata, falsi accetti, riuso e step nuovi **prima e dopo
sulla stessa registrazione** (si calcolano offline: la registrazione resta, si
confronta lo scenario con e senza le sostituzioni accettate). E' il **metro** per
il giorno in cui qualcuno chiedera "e l'assistente cosa aggiunge?".

---

## 7. L'interfaccia

### Dove compaiono le proposte

**In Registra, dopo "Genera il test", prima di "Salva lo scenario".** E' l'unico
momento in cui servono: lo scenario esiste, non e' ancora nel repository, e il
tester sta gia' decidendo dove metterlo (`SalvaScenario`). E' una sezione
**ripiegata** sopra la scheda del salvataggio, con un conteggio. Non blocca:
"Salva" resta sempre disponibile, e salvare senza aprire il riquadro e' un
percorso normale.

Non in Scenari (non esiste ancora e la fase e' dopo il salvataggio, quando le
proposte non si applicano piu'), e non nella scheda di uno step del Catalogo
(la scheda dice cosa fa uno step, non lavora su uno scenario in corso).

Se nessun passo ha candidati, **il riquadro non compare**.

### Il linguaggio

Mai "LLM", "prompt", "token", "modello", "AI generativa". Le parole del tester:
*suggerimento*, *frase del catalogo*, *assistente*, *vocabolario condiviso*,
*scelta*. Per la persona tecnica (passaggio di mano) si nomina Kiro, perche'
deve aprirlo, e si dice "istruzione" e non "prompt". Il riquadro dichiara
sempre **chi ha suggerito**: "Regole del catalogo" oppure "Assistente". Sono
due cose diverse e la persona deve poterle distinguere.

Tutti i testi stanno nei dizionari italiano e inglese (D36); `check:i18n` fallisce
se manca una chiave.

### Lo schema

```
+-------------------------------------------------------------------------+
| (i) Frasi del catalogo                                         [?] Aiuto |
|     3 dei tuoi 7 passi possono usare una frase gia' nel catalogo.        |
|     Suggerimenti di: Regole del catalogo                                 |
+-------------------------------------------------------------------------+
| Passo 2                                                                  |
|   La tua frase    Conferma l'ordine                                      |
|   Nel catalogo    the user confirms the order                            |
|   Perche'         Tocca gli stessi elementi di pagina che hai usato      |
|                   (e' una prova, non una stima)                          |
|                                                                          |
|   Scelta         ( ) Tieni la mia frase    ( ) Usa quella del catalogo   |
+-------------------------------------------------------------------------+
| Passo 5                                                                  |
|   La tua frase    Controllo il totale                                    |
|   Nel catalogo    the order total is shown                               |
|   Perche'         Frase simile alla tua (62%) - e' una stima             |
|   Assistente      "Stessa verifica, scritta in altre parole."            |
|                   (spiegazione dell'assistente, non verificata)          |
|                                                                          |
|   Scelta         ( ) Tieni la mia frase    ( ) Usa quella del catalogo   |
+-------------------------------------------------------------------------+
| Passo 6                                                                  |
|   (!) Non applicabile: la frase del catalogo e' gia' definita in un      |
|       altro scenario salvato.                                            |
+-------------------------------------------------------------------------+
|  [ Applica 1 scelta ]                  [ Annulla le modifiche ]          |
|  Puoi annullare finche' non salvi. Salvare senza usare i suggerimenti    |
|  va benissimo.                                                           |
+-------------------------------------------------------------------------+
```

### Gli stati

| Stato | Cosa dice | Cosa si puo' fare |
|---|---|---|
| Nessun suggerimento | il riquadro non c'e' | salvare |
| **Regole pronte** (fetta 1) | "Suggerimenti di: Regole del catalogo" | scegliere, applicare |
| **Assistente assente** | "L'assistente non e' disponibile: restano i suggerimenti del catalogo." (icona informativa, mai errore) | come sopra; l'assistente non e' mai richiesto |
| **Assistente occupato** (fetta 2/4) | "Sto aspettando l'assistente. Puoi continuare: salvare con le tue frasi e' sempre possibile." con un tempo trascorso e "Smetti di aspettare" | tutto il resto |
| **Passaggio di mano in corso** (fetta 2) | "Ho preparato il compito." con "Copia l'istruzione", "Incolla la risposta" e "Ho finito: controlla" | idem |
| **Proposta pronta** | il riquadro completo, "Suggerimenti di: Assistente" | scegliere, applicare |
| **Righe scartate** | "2 suggerimenti scartati: la frase proposta non e' fra quelle del catalogo." elenco ripiegato | le righe valide restano |
| **Proposta rifiutata dai giudici** | "Le modifiche non passavano i controlli e sono state annullate: <quale, in parole>." Nulla e' cambiato | riprovare, o salvare com'e' |
| **Scaduta** | "Il catalogo e' cambiato dopo la richiesta: chiedi di nuovo." | richiedere |
| **Applicata** | "Hai usato 2 frasi del catalogo. Puoi annullare finche' non salvi." | annullare, salvare |

### Accessibilita'

Quanto gia' vale per il cruscotto (contrasto >= 4,5:1, mai il colore come unico
segnale, area >= 40 px, contorno di focus sempre visibile), piu':

- ogni stato ha **icona e parola**; la distinzione fra *prova* e *stima* e' una
  parola, non un colore;
- la scelta e' un gruppo di opzioni (`radiogroup`) con legenda "Passo 2: scegli la
  frase": si naviga con le frecce, lo stato scelto si legge, non solo si vede;
- le due frasi hanno un'etichetta testuale ("La tua frase", "Nel catalogo"); la
  differenza non e' evidenziata con il solo colore;
- i cambi di stato (occupato, pronta, scartate, rifiutata) sono annunciati da
  un'area `aria-live="polite"`; dopo "Applica" il focus va al riepilogo;
- il testo dell'assistente e' **testo**: non e' mai markup ne' un collegamento,
  anche perche' non e' attendibile (sezione 4);
- il riquadro e' ripiegato per default e si apre da tastiera; sotto i 900 px resta
  su una colonna.

---

## 8. Ordine di consegna

Fette piccole. La prima si regge da sola, **senza AI**, ed e' misurabile.

| Fetta | Cosa | Perche' in questo ordine | Stima |
|---|---|---|---|
| **0** | Tre sonde da cinque minuti sulla macchina aziendale (**P10**): (1) `kiro-cli chat --no-interactive` con un agente a solo `fs_read` risponde sullo stdout? (2) l'agente nell'IDE puo' scrivere nella cartella del compito, con approvazione? (3) il modello si fissa, e quale compare? In piu': la risposta a Q-A1 e l'inizio dell'insieme d'oro | non si costruisce niente sulla base di cio' che non si e' provato (F21, F23, F25: tre guasti scoperti cosi'). Q-A1 blocca tutto cio' che manda dati a un modello | 0,5 giorni + il tempo di risposta |
| **1** | **Il riquadro con suggerimenti delle regole.** Il compito (variante A) generato dalla registrazione e dal catalogo; il riquadro; applicazione tutto-o-niente con `prima/`; annullamento; il comando `verifica` (i tre giudici in uno script); `esito.json`; origini per riga. **Nessun modello** | e' utile da solo (il tester riusa il vocabolario con un click confermato), misurabile da solo (riuso e step nuovi prima/dopo sulla stessa registrazione; P e C delle regole; falsi accetti), e costruisce **tutto cio' che l'assistente dovra' usare**: formato, validatore, riquadro, annulla, giudici, misura. Se l'assistente non arrivasse mai, resta un riquadro utile | 3-4 giorni |
| **C** (parallela) | **Collaudo da copione.** Parametro `copione`, ambiente `collaudo`, provenienza nella traccia, rifiuto al salvataggio, `check:registratore` | non dipende dall'assistente, da' un test al recorder e permette a un agente di provare la catena | 1,5-2 giorni |
| **2** | **Il contratto con l'assistente, passaggio di mano.** Schema della proposta e validatore a due livelli; "Copia l'istruzione", "Incolla la risposta", "Ho finito: controlla"; agente `bdd-propose` a sola lettura con modello fissato; `strumento` e `modello` in `esito.json`; spento per default (impostazione, e solo se l'agente c'e') | il riquadro e i giudici della fetta 1 non cambiano: cambia solo chi propone. Per la persona tecnica che oggi lo fa a mano | 2-3 giorni |
| **3** | **La misura e la decisione.** Insieme d'oro, bracci R/A/B/W, tre ripetizioni, criterio della sezione 6, referto di soli numeri. **Cancello:** se non passa, le fette 4+ non partono e la 2 resta spenta | senza questo passo l'assistente sarebbe un'opinione | 1-2 giorni di lavoro + etichettatura (stima: 2-4 ore di una persona tecnica per l'insieme, piu' un quinto da una seconda) |
| **4** | *Condizionale a 3 e a P10.* Il comando `proponi` (CLI, senza `--trust-all-tools`, solo `fs_read`, risposta sullo stdout) per un pulsante solo | e' cio' che rende l'esperienza giusta per un tester, ma la piu' fragile: si paga solo dopo aver visto il valore | 2-3 giorni |
| **5** | *Condizionale a 3.* La funzione g (wiki → scenario `@non-automatizzato`) sullo stesso contratto | e' a con un altro ingresso | 2-3 giorni |
| **6** | *Condizionale a 3 e a `catalog-apply`.* La funzione e: proposte di fusione per il rituale, con protocollo di valutazione sullo stesso export | il rischio sui dati e sul metro e' il piu' alto, e non ha dove atterrare senza `catalog-apply` | da stimare dopo 3 |

La fetta 1 dipende da una cosa gia' in roadmap: finche' il **riuso di una definizione
esistente** non e' costruito (`ROADMAP.md` §4, punto 3), le voci gia' realizzate
compaiono disabilitate. Non la blocca: la limita, e lo dice.

### Cosa non costruire

- Una **chat libera** nel cruscotto, o un campo dove scrivere un'istruzione: e'
  "AI generativa libera per i tester" (`ROADMAP.md` §5) e una scorciatoia al
  comando arbitrario.
- Un assistente che **scrive** step, Page Object o codice in genere: i corpi li
  scrive il generatore (D23).
- Un assistente che **applica da solo**, o un "accetta tutto".
- La **proposta di frasi nuove** nella fetta 2: l'uscita e' una scelta fra
  candidati. Una voce nuova `@wanted` e' una decisione di catalogo, e va in coda.
- Un ciclo "riprova finche' passa": un modello lasciato libero di riprovare
  finche' i giudici tacciono impara a **soddisfare i giudici**, che non e' la
  stessa cosa che dire il vero.
- Un metro **semantico** al posto di quello lessicale per l'entropia.
- Una **telemetria**: i contatori restano in `reports/`, su disco.
- L'invio di **schermate**, **inventari**, **sessioni** o **valori digitati**.
- Una dipendenza dal **fornitore**: `strumento` e' un dato, non un ramo di codice.
- Una **porta di debug** sul browser del recorder dentro il prodotto.
- Un cruscotto del **consumo** dell'assistente.

---

## 9. Come si verifica

Casi scritti **prima** del codice, nel verso scomodo (il metodo di lavoro: prima il
controllo, poi la correzione). `vitest` in `web-ui/__tests__/**/*.test.ts`,
ambiente node; controlli dello script in `scripts/lib/*.check.ts`, inseriti in
`check:all`. Un solo insieme di **esempi condivisi** in `test-fixtures/assistente/`
(compiti e proposte validi e invalidi), letto da entrambi i lati: una sola
sorgente, come per i cataloghi di prova.

### `web-ui/__tests__/lib/proposta-assistente.test.ts` (validatore)

- una proposta valida passa;
- una voce **non uguale byte per byte** a un candidato del passo e' scartata,
  anche se e' nel catalogo; anche una voce valida ma di un **altro passo**;
- campo sconosciuto nel file o in una riga: il file/la riga e' rifiutato, non
  ignorato;
- `compito` o `impronta` diversi: *scaduta*, nessuna riga applicabile;
- piu' di una proposta per lo stesso passo, `passo` inesistente, file oltre 64 KB,
  non JSON, blocco di codice con testo attorno, due blocchi: tutti rifiutati;
- `perche` con markup, un collegamento, caratteri di controllo, oltre 200
  caratteri: resta testo e viene troncato o rifiutato come da schema, mai
  interpretato;
- l'insieme **avversario** (voci inventate, istruzioni dentro `perche`,
  risposta vecchia, passi in piu') e' rifiutato al 100%;
- una riga scartata **non** fa cadere le altre; un file rifiutato non lascia
  righe applicabili.

### `web-ui/__tests__/lib/compito-assistente.test.ts` (cosa entra)

- lo stesso ingresso produce **lo stesso compito, byte per byte**;
- il compito **non contiene** i valori digitati, le password, gli indirizzi, i
  percorsi di pagina, le note, i testi delle verifiche, i nomi dei componenti
  (variante A): si costruisce una registrazione con valori riconoscibili e si
  cerca ognuno nell'uscita;
- al massimo cinque candidati per passo; la classe e' una delle due; `stato` e
  `parametri` sono coerenti con il catalogo;
- una voce con parametri e una gia' realizzata sono marcate non applicabili.

### `web-ui/__tests__/lib/applica-proposte.test.ts` (tutto-o-niente e annulla)

- una scelta valida riscrive il `.feature` **e** il file di step, e la frase del
  tester resta come commento;
- una voce con parametri: nessun file scritto, e si dice quale;
- due passi sulla stessa voce: nessun file scritto;
- un giudice che fallisce (finto): i file tornano **identici byte per byte** a
  `prima/`;
- annulla dopo una modifica manuale: **rifiutato**, e il motivo e' detto;
- annulla senza modifiche: ripristina;
- **il prodotto identico senza assistente:** con nessun file di proposta e
  nessun agente, la generazione e il salvataggio producono gli **stessi file,
  byte per byte,** di prima della modifica (un caso di riferimento); con proposta
  rifiutata, idem;
- `origin`: i file con una riga accettata hanno `assistito` nel manifesto, gli
  altri `deterministico`; l'origine per riga e' una fra tre valori.

### `web-ui/__tests__/lib/esecuzione.test.ts` (aggiunte)

- `verifica` rifiuta un percorso che non e' un `.feature` sotto `src/features/`,
  `..`, spazi, `&`;
- `registrazione` con `copione`: solo un percorso sotto `reports/`;
- (fetta 4) `proponi` accetta solo un id valido; l'istruzione e' fissa; nessuna
  shell; **nessun argomento contiene `trust`**: la forma e' un caso, non una
  speranza.

### `web-ui/__tests__/api/assistente.test.ts`

Con un lanciatore finto (come in `esegui.test.ts`): assistente assente → risposta
"assente", mai un errore, e il resto delle rotte funziona; compito richiesto due
volte → stesso id e stesso contenuto; una proposta scaduta non si applica.

### `scripts/lib/assistente-compito.check.ts`

La lettura dal lato script: la registrazione e il catalogo di prova producono un
compito che rispetta lo schema condiviso; un catalogo cambiato cambia l'impronta.

### `scripts/lib/registratore.check.ts` (fetta C)

Browser vero contro un'applicazione finta, come `accesso.check.ts`: un copione
produce una traccia con intenti, verifiche e URL attesi; il copione contro un
ambiente senza `collaudo: true` e' rifiutato; la registrazione da copione ha
`origine: "copione"` e il salvataggio la rifiuta.

### Cosa **non** si verifica con un caso

Il valore. Quello lo dice la misura (sezione 6), non un test, e finche' non e'
fatta la sezione 2 dichiara il beneficio come **ipotesi**.

---

## 10. Fuori da questo lavoro

- **Le versioni deterministiche di c e d**: "sessione scaduta" (l'indirizzo
  raggiunto e' la pagina di accesso dell'ambiente) ed "elemento simile nel
  dizionario" (stesso ruolo, nome vicino), nella spiegazione del fallimento. Costano
  circa un giorno (stima), non usano modelli e prendono buona parte di cio' che
  c e d promettevano. Sono nel backlog di `ROADMAP.md` §4, punto 10 (le correzioni
  del cruscotto), non qui.
- **Le verifiche tipizzate** (§4, punto 7) e la **rilevazione automatica del
  cambiamento** per h.
- **`catalog-apply` e `catalog-refactor`** (§4, punto 5): prerequisito di e.
- **Il riuso di una definizione di step esistente** (§4, punto 3): prerequisito
  per estendere a anche alle voci gia' realizzate.
- **P8** (con/senza regole) e le prove P3-P7 sul campo.
- **L'installazione di `kiro-cli`** sulla macchina aziendale: si concorda con chi
  gestisce la macchina.
- **Un modello locale**, finche' non c'e' un modello approvato.
- **La scelta del nome del prodotto** (U1) e la distribuzione (U3, U4).

## Domande aperte per il proprietario

| # | Domanda | Opzioni | Raccomandazione |
|---|---|---|---|
| **Q-A1** | Il fornitore del modello raggiunto tramite Kiro e' **dentro** il perimetro "nessun dato dell'applicazione fuori dalla macchina"? Oggi la regola di `ROADMAP.md` §5 e la pratica (si incolla `brief.md`, che contiene anche valori digitati) non coincidono | (1) si', con il perimetro minimo della sezione 1 e una conferma scritta di chi ha titolo in azienda; (2) si' solo per frasi del catalogo e della wiki, **mai** etichette delle registrazioni; (3) no: nessun modello, e restano solo le fette 1 e C | (1), con la conferma scritta. Le fette 2+ non partono senza. Ammettere anche che la pratica attuale con `brief.md` espone di piu' del compito nuovo |
| Q-A2 | Chi usa il primo trasporto (fetta 2)? | la persona tecnica che oggi lo fa a mano / il tester | La persona tecnica. Il tester ha un'esperienza da un pulsante solo con la fetta 4, **se** e quando vale la pena |
| Q-A3 | Le soglie del criterio di ingresso (sezione 6): 0,90 · 0,80 · 0,15 · 0,80 | confermarle / cambiarle | Confermarle o cambiarle **ora**, prima di vedere un numero; cambiarle dopo e' un modo di truccare il confronto |
| Q-A4 | Chi etichetta l'insieme d'oro, e chi e' la seconda persona | la persona tecnica + un tester di un'altra area / solo la persona tecnica | Due persone, di aree diverse: il metro non puo' essere piu' soggettivo del compito |
| Q-A5 | Quale modello si fissa, e chi decide quando cambiarlo | il piu' capace fra quelli approvati / il piu' economico | Il piu' capace fra gli approvati **per la misura**; cambiarlo e' una nuova misura, e lo decide chi ha scritto la soglia |
| Q-A6 | Il consumo di quota del piano Kiro gia' in uso: chi lo amministra, e c'e' un limite? Non lo so | chiedere / ignorare | Chiedere, prima della fetta 2. "Nessuna licenza nuova" non e' "nessun consumo" |
| Q-A7 | I copioni (fetta C) possono mirare a un ambiente aziendale non di produzione? | solo l'ambiente pubblico di prova / anche un ambiente aziendale di collaudo | Solo l'ambiente pubblico. Un copione su un ambiente vero produce scenari che nessuno ha eseguito, dentro un'applicazione vera |
| Q-A8 | La frase originale del tester resta come commento nel `.feature` e alimenta gli alias del rituale? | si' / no (si perde) | Si': e' la variante nota che il rituale chiedeva (D14); l'alias entra solo per decisione delle persone |
| Q-A9 | Il nome, per il tester, del riquadro e di cio' che propone | "Suggerimenti" / "Assistente" | "Suggerimenti" per il riquadro, con l'etichetta di chi ha suggerito dentro: "Regole del catalogo" o "Assistente". Chiamare "assistente" un riquadro che nella fetta 1 non ha modelli sarebbe una promessa che non regge |
| Q-A10 | Si fa P8 prima della fetta 2? | prima / insieme / dopo | Insieme: condividono il metodo e il modello fissato. P8 da' un'indicazione anche sull'agente: se le regole non cambiano nulla su un compito vincolato, `bdd-propose` puo' essere piu' scarno |

## Decisioni da registrare in `docs/anti-entropy/README.md` se la specifica passa

Proposte, non scritte: la tabella delle decisioni non e' stata toccata.

| # | Decisione proposta | Motivo |
|---|---|---|
| D41 | L'assistente nel cruscotto **sceglie fra opzioni elencate**; non scrive frasi, codice o selettori. La voce proposta e' valida solo se uguale a un candidato di quel passo | l'unico errore possibile e' di significato, che la conferma e la misura sorvegliano; un errore di forma passerebbe in silenzio |
| D42 | Il cruscotto parla all'assistente con un **contratto di file** (compito, proposta, esito), indipendente dal fornitore; il primo trasporto e' il passaggio di mano | F24: l'esecuzione non presidiata non e' affidabile; il passaggio di mano regge anche dove `fs_write` non va |
| D43 | La prima fetta **non contiene AI**: stesso riquadro, stesso formato, candidati scelti dalle regole | costruisce giudici, annulla e metro **prima** di spendere per il modello; e' il braccio di controllo del confronto |
| D44 | Una funzione AI entra solo se supera un criterio **scritto prima** della misura, a modello fissato, contro la regola deterministica | P8 e F20: senza metro e senza modello fissato non si misura l'assistente, si misurano le impressioni |
| D45 | Un copione di registrazione **non entra mai nel repository**: serve a provare la catena, solo su ambienti di collaudo | uno scenario che nessuno ha eseguito a mano e' il contrario di Specification by Demonstration (D9) |
