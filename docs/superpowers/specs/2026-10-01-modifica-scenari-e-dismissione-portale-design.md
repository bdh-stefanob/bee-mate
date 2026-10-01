# Modifica degli scenari nel cruscotto e dismissione del portale — design

> Proposta del 2026-10-01, sotto-progetto 2 di 5. **Non costruita**; le domande
> M1-M10 hanno avuto risposta il 2026-10-01 (tabella "Decise" in fondo).
> Presuppone
> la pagina Scenari in sola lettura (elenco a sinistra, scenario a destra con
> Esegui ed Esporta) progettata in
> `docs/superpowers/specs/2026-10-01-pagina-scenari-design.md`. Qui si progetta
> cio' che succede quando si preme "Modifica" in quel pannello, e lo
> spegnimento del vecchio portale.

## Perche' esiste

L'app ha due facce sullo stesso server. Il cruscotto (Controllo, Registra,
Esecuzione, Catalogo) e' quello per cui il progetto esiste: un tester manuale
registra, genera, esegue. Il portale (`(portale)/`: catalogo, editor, features,
tags, components, settings) e' la prima versione dell'app, nata quando l'idea
era "far scrivere Gherkin ai tester con l'autocompletamento del catalogo". Il
metodo e' cambiato (Specification by Demonstration: lo scenario nasce da una
registrazione), e il portale oggi costa piu' di quanto vale:

- **e' un secondo prodotto da mantenere**: due sistemi di lingua (`useLanguage`
  e `next-intl`), due modi di mostrare gli errori (toast e messaggi in pagina),
  token dell'utente in `localStorage`, una dozzina di componenti che il
  cruscotto non usa;
- **ha sette rotte che scrivono sul disco o escono dalla macchina senza la
  guardia stessa-origine** che tutte le rotte del cruscotto hanno (vedi
  "Cio' che e' stato verificato");
- **contraddice il modello di versionamento deciso il 2026-09-24**: l'editor
  salva un solo `.feature` e il push su GitHub ne manda uno solo, senza i suoi
  step e le sue Page Object. Su un'altra macchina e' un test che non parte;
- **il tester non lo usa**: Electron apre `/controllo` e dal cruscotto non c'e'
  piu' nessun link verso il portale.

Quello che il portale faceva di davvero utile — correggere uno scenario gia'
salvato senza ripetere la registrazione — oggi non ha casa. Questo lavoro gliela
da', dentro la pagina Scenari, e poi spegne il resto.

## Cosa deve essere vero alla fine

1. Un tester puo', dalla pagina Scenari e senza conoscere Gherkin, cambiare il
   titolo di uno scenario salvato, rinominare un passo, sostituirlo con un altro
   del catalogo, toglierlo, aggiungere una verifica, spostarlo in un altro
   flusso ed eliminarlo.
2. **Uno scenario salvato non diventa mai "undefined" per colpa di una
   modifica fatta dal cruscotto.** Se una frase cambia, cambiano insieme lo
   scenario, la definizione dello step e ogni altro scenario che la usa; oppure
   non cambia niente.
3. Una Page Object condivisa non perde mai un metodo, e l'editor non scrive mai
   una Page Object.
4. Il tester sa sempre quando un file smette di essere "rigenerabile" e che
   cosa significa, in parole sue.
5. Ogni modifica si puo' annullare subito; nessuna si perde per un cambio di
   scenario o per un conflitto col disco.
6. Il portale non esiste piu': niente pagine, niente rotte, niente componenti,
   niente dipendenze, niente documenti che lo descrivono. Il prodotto ha una
   faccia sola, un sistema di lingua solo, e nessuna rotta di scrittura senza
   guardia.
7. A ogni passo del lavoro il prodotto si avvia, `npm test` e `npm run build`
   passano, e il passo si puo' annullare con un solo `git revert`.

## Cio' che e' stato verificato nel codice

L'inventario ricevuto e' esatto; verificato a campione. Quattro correzioni e
un difetto nuovo.

**Correzioni all'inventario**

- Lo script di importazione si chiama `scripts/import-scenarios.ts` (non
  `import-scenari`). Come `jira-sync.ts` e `jira-fetch.ts`, non importa nulla da
  `web-ui/`: sono CLI indipendenti (vedi B8).
- `GET /api/download` aveva come lettori pagine del portale (`features/page`,
  `FileSidebar`, `FeaturePreview`, `FeatureImportDialog`), ma l'altra spec lo
  adotta per leggere il testo di uno scenario e lo dichiara "non si tocca".
  **Quindi resta**, con il suo test `__tests__/api/download.test.ts`, e diventa
  una rotta del cruscotto. `GET /api/scenari/contenuto` (sotto) non lo
  sostituisce: aggiunge a un file letto la sua `versione` e la struttura dei
  passi, che servono solo a chi modifica.
- `ui/separator` serve solo a `GherkinToolbar`, che non si riusa (e' in inglese,
  con i bottoni `Feature:`/`Background:`/`Examples:`: roba da chi sa Gherkin).
  Quindi `separator` muore davvero. `ui/button`, `badge`, `tooltip` restano.
- `FeaturePlacementDialog` e `feature-tags.ts` **non si riusano**, nonostante
  siano nell'elenco dei riusabili: il dialogo ha stringhe fisse fuori da
  `next-intl`, e `setFeatureTags` ha un difetto (sotto). Muoiono entrambi.

**Difetti da correggere se si riusano le rotte del portale**

- (a) **Chiuso (passo 0, 2026-10-01).** `POST /api/features` e
  `POST /api/features/move` non avevano `daAltraOrigine`, e nemmeno le altre
  sei rotte di scrittura elencate sotto. Un'altra scheda del browser poteva
  scrivere o spostare `.feature`: `request.json()` legge il corpo a prescindere
  dal tipo di contenuto, quindi un modulo `text/plain` bastava. Ora hanno la
  guardia, con un test parametrico (`__tests__/api/guardia-origine.test.ts`:
  altra origine e `same-site` -> 403 e niente scritto; `same-origin` passa).
- (b) **Chiuso (2026-10-01), ed era peggio di cosi' descritto.**
  `POST /api/features` accettava `filePath` relativo a `src/features/` e
  restituiva un percorso relativo alla radice (`src/features/...`), e lo stesso
  faceva `POST /api/features/move`. Provato con un test: rimandando il percorso
  restituito alla stessa rotta il file finiva in
  `src/features/src/features/...` (un duplicato annidato), e rimandandolo a
  `move` come `fromPath` la risposta era 404, non un "sposta" riuscito. Ora
  entrambe rispondono con un percorso relativo a `src/features/`, rimandabile
  com'e' (`__tests__/api/features-percorsi.test.ts`, con l'andata e ritorno). I
  chiamanti del portale (editor, pagina Features, importazione) tengono il
  percorso restituito nel loro stato e non ne aggiungono prefissi: non hanno
  richiesto modifiche. Il formato e' lo stesso dell'elenco `GET /api/features`,
  con cui i tab confrontano `filePath`.
- (c) **Provato in parte, e corretto.** `setFeatureTags` (provato con
  `__tests__/lib/feature-tags.test.ts`, visto fallire):
  - con i tag in prima riga **perdeva** `@non-automatizzato`, `@generato` e
    ogni altro tag (sostituiva l'intera riga con `@app @flow`): vero;
  - con il commento del marcatore in testa (il formato dei file salvati dal
    cruscotto) **non riconosceva** la riga dei tag e ne aggiungeva una seconda:
    vero, ma qui `@generato` sopravviveva, nella riga vecchia, che pero' teneva
    il flusso vecchio (due righe, due flussi);
  - applicarla due volte non era idempotente (stesso difetto);
  - `getFeatureTags` leggeva la prima riga che inizia con `@` ovunque nel file
    (anche i tag di uno scenario) e trattava `@generato` come app.
  Corretta: la riga dei tag e' quella sopra `Feature:` (saltando righe vuote e
  commenti), si sostituiscono solo i due tag di posizionamento (i primi due non
  riservati) e ogni altro tag resta; i tag riservati sono `@generato`,
  `@da-rivedere`, `@non-automatizzato`, `@wanted`, `@ticket:...`. Il modulo
  resta comunque fra quelli che muoiono con il portale (B2): la correzione serve
  finche' il portale e' acceso.

**Decisione: le rotte del portale non si riusano.** `POST /api/scenari/...`
(sotto) nasce con la guardia, con percorsi sempre relativi a `src/features/` e
con i tag preservati (`trasforma` di `salva-scenario.ts`, che antepone i tag
mancanti e lascia gli altri). I difetti (a)-(c) spariscono con le rotte che
li hanno. Nel periodo in cui il portale e' ancora acceso sono gia' corretti (il
passo 0 e' fatto), perche' erano buchi reali e costavano una riga a rotta.

**Rotte di scrittura che erano senza guardia, ora protette:** `catalog/propose`,
`enums`, `features`, `features/move`, `github/push`, `import`, `jira/sync`
(tutte del portale) e `lingua` (resta). `lint` e' di sola lettura nei fatti.
Spegnere il portale toglie sette rotte su otto.

## Parte A — Modifica degli scenari

### A1. Chi modifica, e che cosa

Il tester manuale non conosce Gherkin e non deve doverlo conoscere
(`docs/OVERVIEW.md` §8: "non deve dover scrivere Gherkin o codice"). Eppure uno
scenario salvato e' un `.feature` legato a una definizione di step: la frase
"the user adds the item" nel file e `When("the user adds the item", ...)` in
`src/steps/shop/checkout/...steps.ts` sono la stessa cosa scritta due volte.
Cambiare una frase da una parte sola la rende "undefined": il test non parte, e
il sintomo (un passo saltato) non assomiglia alla causa.

Tre approcci.

| | 1. Editor Gherkin pieno | 2. Modifica guidata | 3. Ibrido (raccomandato) |
|---|---|---|---|
| Cos'e' | CodeMirror nel pannello di destra | gesti su righe gia' esistenti: titolo, rinomina, usa un altro passo, togli, sposta, elimina | la guidata e' la via normale; "Modifica il testo" sta sotto "Avanzate" |
| Pro | un componente gia' scritto (colori, autocompletamento dal catalogo, sottolineatura dello step sconosciuto, lint) | una frase non puo' diventare "undefined" per costruzione; il tester non vede mai la sintassi | copre il tester e chi sa Gherkin; il testo avanzato non puo' inventare frasi |
| Contro | richiede di sapere Gherkin; non sa rinominare una frase in modo coerente (rinominarla nel file la rende subito sconosciuta); ogni errore si scopre al salvataggio | non puo' riordinare, ne' aggiungere passi diversi da una verifica; i file con piu' scenari, Background o tabelle non si possono modificare | piu' superficie da costruire e da provare; due modi di fare la stessa cosa |
| Dove si rompe | il tester sposta una frase "per correggerla" e il test non parte piu' | un membro del team che sa Gherkin si sente legato e torna a VS Code | il testo avanzato resta un buco se lo si lascia salvare con frasi sconosciute: qui non si puo' |

**Raccomandazione: 3, costruito nell'ordine 2 poi 1.** La guidata e' il
prodotto; il testo avanzato e' l'ultimo passo del lavoro (P5) e si puo'
tagliare senza rifare niente. La regola che li tiene insieme: **il testo non puo'
inventare frasi.** Ogni riga di passo deve combaciare con uno step esistente;
se non combacia il salvataggio e' bloccato, con una frase che dice cosa fare.
Una frase nuova non si crea da qui: e' uno step nuovo, e per le regole del
progetto (`ROADMAP.md` §5, `CLAUDE.md` regola 2) si propone come `@wanted` e
si approva col team.

### A2. I gesti

| Gesto | Cosa tocca | Quando |
|---|---|---|
| **Titolo** dello scenario | solo il `.feature` (riga `Feature:` e `Scenario:`) | in bozza, si salva con "Controlla e salva" |
| **Usa un altro passo** (cambia questa riga con un passo del catalogo) | solo questo `.feature` | in bozza |
| **Togli il passo** | solo questo `.feature` | in bozza |
| **Aggiungi una verifica** (`the page shows "..."`) | solo questo `.feature`; lo step e' quello comune, non serve glue | in bozza |
| **Cambia il testo di una verifica** | solo questo `.feature` (e' il parametro `{string}` dello step comune) | in bozza |
| **Rinomina il passo** (cambia la frase ovunque) | questo `.feature`, **ogni altro `.feature` che la usa** e **la definizione** nel suo `.steps.ts` | subito, con conferma; solo a bozza pulita |
| **Sposta** in un altro flusso della stessa applicazione | `.feature` e `.steps.ts` (stessa profondita' di cartelle: gli import restano validi) | subito, con conferma |
| **Elimina** lo scenario | `.feature`, le definizioni che nessun altro scenario usa, il `.steps.ts` se resta vuoto | subito, con elenco delle conseguenze |
| **Modifica il testo** (avanzato) | questo `.feature` | in bozza |

Limiti dichiarati, ciascuno con la sua frase per il tester:

- **Solo scenari salvati e semplici.** La modifica guidata si offre quando il
  file ha un solo `Scenario:` e nessun `Scenario Outline`, `Background`,
  `Rule`, tabella o DocString. Sugli altri la guidata e' spenta con una frase
  ("ha una struttura che la modifica guidata non copre") e resta il testo
  avanzato.
- **Gli scenari in `generated/` non si modificano da qui**: sono la bozza
  appena registrata, con i loro step ancora in `steps/generated/`. Si salvano
  prima (schermata Registra). Il pannello lo dice e non offre "Modifica".
- **Gli scenari `@non-automatizzato` sono documenti**, non test: si leggono,
  non si modificano dal cruscotto.
- **Rinominare una frase con parametri non e' supportato** (`riscrittura-step.ts`
  lo rifiuta di proposito: il valore e' gia' dentro il `.feature` e non si
  rimette al suo posto alla cieca). Vale anche per le definizioni in
  `steps/common/` (cambierebbero per ogni scenario del progetto) e in
  `steps/generated/`.
- **"Usa un altro passo" offre solo passi `implemented` senza parametri.** Un
  passo `@wanted` ha uno stub: il test parte e fallisce. Un passo con parametri
  ha bisogno di campi per i valori: per ora si ottiene dal testo avanzato.
- **Le verifiche a meta' passo** (righe `# durante questo passo si verifica:
  "X"` sotto un passo) descrivono cio' che il codice di quel passo controlla.
  La guidata le mostra sotto il loro passo, **non le modifica**: cambiare la
  riga non cambierebbe il controllo. Togliendo il passo vanno via con lui. Le
  verifiche che si aggiungono da qui sono passi veri (`Then the page shows
  "x"`), accodati in fondo, con `Then` e poi `And` come fa il generatore.
- **Riordinare i passi si fa solo dal testo avanzato.** In uno scenario
  registrato i passi sono quasi sempre in ordine causale; un gesto di
  riordino alla portata di tutti lo romperebbe piu' spesso di quanto serva.
- **Spostare in un'altra applicazione non c'e'.** Le Page Object sono per
  applicazione (`src/pages/<app>/`): lo scenario spostato resterebbe
  agganciato alle pagine di quella vecchia. Domanda M4.

Cio' che la validazione **non** puo' garantire, e il pannello lo dice: che il
test *funzioni*. In uno scenario registrato il primo passo inizializza spesso la
Page Object che i successivi usano (variabili di modulo). Togliere o cambiare
il primo passo puo' lasciare gli altri con una pagina non inizializzata:
Cucumber trova tutte le definizioni e il test cade comunque a meta'. Per questo,
dopo ogni salvataggio che tocca i passi, il pannello dice "non l'ho ancora
eseguito" e propone **Esegui lo scenario** (che precarica la schermata
Esecuzione con quello scenario).

### A3. Come l'editor si appoggia ai moduli che ci sono

Letti per intero. Cosa offrono e cosa se ne riusa.

| Modulo | Cosa offre | Come lo usa la modifica |
|---|---|---|
| `riscrittura-step.ts` | `riscriviScenario(testo, da, a)` riscrive le righe `Given/When/Then/And/But` la cui frase e' esattamente `da`, conservando indentazione, parola chiave e fine riga (CRLF compreso). `riscriviDefinizione` riscrive la chiamata `Given/When/Then("da", ...)` e la riga `@intent da`. Entrambe si rifiutano con `RiscritturaNonSupportata` se la frase ha parametri. Funzioni pure, nessun disco | e' il motore del gesto "Rinomina il passo". Regola ereditata: **si calcolano tutte le riscritture prima di scriverne una** |
| `fusione-step.ts` | `estraiDefinizione` (quante volte compare la frase, e il corpo), `rimuoviDefinizione` (toglie la definizione col suo JSDoc e ricuce lo spazio), `corpiEquivalenti`. Si ferma se la frase non compare esattamente una volta | `rimuoviDefinizione` serve a "Elimina" per togliere le definizioni rimaste senza uso. La fusione dei doppioni resta del Catalogo: non si offre qui |
| `riconciliazione.ts` | `individuaCoppie`: coppie di step quasi uguali, col verdetto `stessoComponente` (doppione, si fonde) oppure no (equivoco di nomi, si distingue). Confronto per applicazione, con `common` e `generated` come eccezioni | dopo una rinomina si ricalcolano le coppie sul catalogo "dopo": se la nuova frase e' quasi uguale a un'altra si **avvisa**, con la frase giusta per il caso (stesso componente: "forse e' un doppione"; componente diverso: "e' un equivoco di nomi, scegline una piu' diversa") |
| `salva-scenario.ts` | `MARCATORE`, `trasforma` (titolo e tag: antepone i tag mancanti, non tocca gli altri), `nomeFile`, regole dei nomi di cartella (`NOME_CARTELLA`), `ErroreSalvataggio` con codici, il modello `pianifica...` / `scrivi...` | titolo e spostamento usano `trasforma` (si esporta) e le stesse regole sui nomi. I codici d'errore si estendono (`conflitto`, `non-modificabile`, `frase-esistente`, `passo-sconosciuto`, `cambiato-dopo`...) |
| `salva-glue.ts` | `frasiDefinite(testo)` (le frasi che un file definisce), `pianificaGlue`/`scriviGlue` (leggere tutto, poi scrivere), la regola "una Page Object cresce, non perde mai un metodo; una modificata a mano non si tocca" | `frasiDefinite` serve a contare le definizioni e a vedere se una frase e' gia' definita altrove. **L'editor non scrive mai una Page Object**: la regola e' soddisfatta per costruzione |
| `catalogo.ts` | `trovaUsatoIn` (quali scenari usano ogni frase, scansionando i `.feature` e non un indice), `espressioneInRegex` | "usato anche in..." sotto ogni passo, e l'elenco delle conseguenze di rinomina ed elimina |
| `esportazione.ts` | `fileDiDefinizioneUsati`, `importPagineUsate` | trovare la definizione di un passo e le Page Object che importa, senza duplicare la risoluzione di `sourceRef` |
| `percorso-definizione.ts`, `percorsi.ts`, `percorsi-disco.ts` | risoluzione di `sourceRef` e guardie sui percorsi (traversal, collegamenti simbolici, estensione) | ogni percorso che arriva dalla finestra passa di li' |
| `rigenerazione-catalogo.ts` | rigenera `step-catalog.json` (tre fasi) | dopo una rinomina o un'eliminazione che toccano la glue |

Il gesto "Rinomina il passo" fa **gia'** la stessa cosa della rotta
`POST /api/catalogo/riconcilia` (riscrive la frase negli scenari e nella
definizione, oppure non tocca niente). Non si scrive una seconda copia: la
logica di quella rotta si estrae in `lib/rinomina-passo.ts`
(`pianificaRinomina(da, a)` restituisce le scritture, non le esegue), la rotta
diventa sottile e la modifica la usa. Si scrive prima un test di
caratterizzazione sul comportamento attuale della rotta.

### A4. Il marcatore di generazione

I file salvati dal cruscotto portano `generato-da: bdd-generate · rigenerabile`
(`MARCATORE`, riconosciuto con `includes`, quindi ovunque nel file). Finche' c'e',
un nuovo salvataggio con lo stesso titolo nella stessa cartella **sovrascrive**
il file (`sovrascritto: true`); senza, il nuovo file va accanto, con `-2`.
Toglierlo vuol dire "questo file e' mio" (`isRegenerable` in
`render-template.ts`).

**Regola proposta: chi modifica, rende suo.**

- Ogni `.feature` che un'operazione dell'editor **riscrive davvero** perde il
  marcatore (si toglie la riga che lo contiene). Una "modifica" senza
  differenze non scrive niente e non lo toglie.
- Ogni `.steps.ts` che l'editor riscrive (rinomina, eliminazione di una
  definizione) perde il marcatore, per lo stesso motivo: non e' piu' quello che
  il generatore produrrebbe.
- **Le Page Object non si toccano mai, marcatore compreso.** Se perdessero il
  marcatore, il salvataggio di un altro scenario che ha bisogno di un loro
  metodo si fermerebbe con `pagina-a-mano`: l'editor romperebbe la crescita
  automatica della glue.
- `@generato`, `@da-rivedere` e gli altri tag restano dove sono: modificare
  non e' "rivedere", e togliere un tag di nascosto sarebbe una magia.
- Annulla rimette tutto com'era, marcatore compreso (l'istantanea e' il file
  intero).

Cosa ne dice il pannello, **prima** del salvataggio e solo se il marcatore c'e'
(non e' una conferma, e' un'informazione sotto il pulsante):

> Questo scenario e' stato creato da una registrazione. Quando lo modifichi
> diventa tuo: se registri di nuovo e salvi con lo stesso titolo, il tuo lavoro
> non viene sovrascritto — il nuovo scenario si salva accanto, con un numero in
> piu'.

Un passo cambiato da una rinomina in uno scenario *non aperto* (un altro che
usa la stessa frase) segue la stessa regola: lo dice l'elenco delle
conseguenze ("anche questi scenari diventano tuoi").

### A5. Stati e flussi

La bozza e' sempre **un testo** (il contenuto del `.feature`): i gesti guidati
sono trasformazioni di quel testo (funzioni pure in `lib/modifica-scenario.ts`) e
il testo avanzato modifica la stessa stringa. Un'unica fonte di verita'.

```
+-- Scenari ----------------------+------------------------------------------+
| [Cerca...]                      | Pagamento con carta          [Esegui]    |
|                                 | shop / checkout          [Esporta]       |
| shop / checkout                 |                          [Modifica]      |
|  > Pagamento con carta   <---   |  (lettura: vista dell'altra spec)        |
|    Ordine annullato             +------------------------------------------+
| shop / account                  |  --- dopo "Modifica" ---                 |
|    Accesso                      | Titolo [Pagamento con carta           ]  |
|                                 |                                          |
|                                 | Passi                                    |
|                                 |  1 Given the user opens the shop         |
|                                 |    [Usa un altro]  [Togli]               |
|                                 |  2 When the user adds the item           |
|                                 |    Usato anche in 2 altri scenari        |
|                                 |    [Rinomina]  [Usa un altro]  [Togli]   |
|                                 |  3 Then the page shows "Order placed"    |
|                                 |    [Cambia il testo] [Togli]             |
|                                 |  [+ Aggiungi una verifica]               |
|                                 |                                          |
|                                 | Avanzate v   Modifica il testo           |
|                                 |              Sposta   Elimina            |
|                                 |  Salvando diventa tuo: ...               |
|                                 |  [Controlla e salva]  [Annulla modifiche]|
+---------------------------------+------------------------------------------+
```

Sotto i 900px e' una colonna: la lista e' una schermata, il pannello un'altra;
le azioni di ogni passo vanno a capo sotto la frase.

**Stati della bozza** (il riduttore sta in `lib/bozza-scenario.ts`, puro, cosi'
si prova in `vitest` senza componenti):

| Stato | Quando | Esce con |
|---|---|---|
| `lettura` | pannello normale dell'altra spec | "Modifica" |
| `carico` | si legge `GET /api/scenari/contenuto` | `pulita`, o `non-modificabile` con la ragione |
| `pulita` | testo uguale all'ultimo letto dal disco | un gesto -> `sporca`; Rinomina/Sposta/Elimina -> `conferma` |
| `sporca` | testo diverso dal letto | "Controlla e salva" -> `controllo`; "Annulla modifiche" -> `pulita` |
| `controllo` | anteprima sul server: controlli rapidi, conseguenze | errori -> `sporca` (con blocchi in vista); tocca altro, o e' rinomina/elimina/sposta -> `conferma`; niente di piu' -> `salvataggio` |
| `conferma` | elenco delle conseguenze, in linea nel pannello | "Conferma" -> `salvataggio`; "Torna indietro" -> stato di prima |
| `salvataggio` | scrittura, poi controllo vero (dry-run); se fallisce si ripristina | ok -> `salvata`; `conflitto`; `errore` |
| `salvata` | banner con **Annulla la modifica**, **Esegui lo scenario** | un nuovo gesto -> `sporca`; Annulla -> `pulita` col testo di prima |
| `conflitto` | il file e' cambiato sul disco | vedi sotto |
| `errore` | non si e' scritto niente (o si e' ripristinato) | "Riprova" |

**Modifiche non salvate.** Cambiare scenario nell'elenco, premere un'altra voce
della barra laterale o "Annulla modifiche" in stato `sporca` apre un dialogo
in linea con tre scelte: **Salva**, **Scarta**, **Resta qui** (Esc = Resta qui,
mai `window.confirm`). Per la barra laterale serve un piccolo contesto
(`ModificheContext`, in memoria) che `BarraLaterale` consulta prima di
navigare; la voce "Scenari" mostra un punto e la parola "modifiche non salvate"
(non solo il colore). Chiudere la finestra o ricaricare: `beforeunload`, e in
Electron serve l'ascolto di `will-prevent-unload` in `electron/main.js`,
altrimenti il browser interno **blocca la chiusura in silenzio** e la finestra
non si chiude piu'. Il dialogo di Electron e' in italiano come gli altri di
`main.js`.

**Conflitto col disco.** Il server manda con ogni lettura una `versione`
(`improntaDiTesto()` del contenuto del file, vedi A10). Al salvataggio il client la rimanda e il
server la confronta con il file di adesso; se e' diversa risponde `conflitto`
e non scrive. Il pannello mostra tre scelte: **Guarda la versione attuale**
(ricarica; il testo del tester non va perso: resta in un riquadro copiabile),
**Copia il mio testo**, **Salva comunque** (sovrascrive, con la stessa conferma
in linea). Per le operazioni che toccano piu' file il server rilegge ogni file
subito prima di scrivere e, se uno e' cambiato dal momento del piano, si ferma
con `conflitto` senza scrivere niente.

### A6. Validazione e salvataggio

**Due livelli, con ruoli diversi.** I controlli rapidi (livello 1) guidano chi
scrive; il controllo vero (livello 2) decide. Un terzo matcher sarebbe un terzo
punto in cui le regole possono divergere: il validatore del pre-commit
(`scripts/validate-steps.ts`) e il confronto del browser (`catalog-match.ts`)
trattano gia' i parametri in modo diverso. Qui il giudice e' Cucumber, come dice
D6 ("l'AI produce, il codice giudica").

**Livello 1, sul server, in memoria, a ogni "Controlla e salva".**

- sintassi con il parser ufficiale (lo stesso di `POST /api/lint`);
- titolo e almeno un passo;
- ogni riga di passo combacia con una frase del catalogo (`espressioneInRegex`);
- nessuna frase "nuova senza corrispondenza" **in nessun altro file**: si
  confronta l'insieme delle righe che non combaciano prima e dopo
  l'operazione, su tutti i `.feature`. E' il caso "la rinomina ha lasciato una
  riga con la frase vecchia scritta in un modo che non ho riconosciuto";
- ambiguita': piu' espressioni del catalogo combaciano con la stessa riga e
  l'ambiguita' non c'era prima.

**Livello 2, dopo la scrittura, sullo stato vero del repository.** Cucumber in
dry-run sui `.feature` toccati (`cucumber.js` legge `BDD_PATHS`; l'esito si
legge dai messaggi, non dall'output: D34). Vede cio' che il catalogo non vede:
il codice vero degli step, la compilazione TypeScript, le ambiguita' reali. La
funzione che lo lancia vive lato server, prende solo percorsi calcolati dal
server (mai dalla finestra), e usa `execFile` asincrono con un limite di tempo:
non e' un comando nuovo dell'elenco chiuso della finestra, e non blocca il
server come `execFileSync`. **Se non riesce a concludere, vale come fallito.**

Cosa blocca e cosa avvisa.

| Blocca (non si scrive, o si ripristina) | Avvisa (si salva) |
|---|---|
| sintassi non valida | frase simile a un'altra esistente ("assomiglia a ...") |
| titolo vuoto, su piu' righe, oltre 80 caratteri | non c'e' nessuna verifica (`Then`): lo scenario non controlla niente |
| nessun passo | si e' tolto il passo di accesso (`the user is logged in`): senza sessione valida lo scenario puo' cadere al primo passo |
| frase sconosciuta (nessuno step la riconosce) | un passo non e' piu' usato da nessuno scenario: la sua definizione resta |
| ambiguita' introdotta dalla modifica | un passo e' `@wanted`: il test partira' e fallira' |
| rinomina: frase nuova gia' esistente come altro step, frase con parametri, definizione in `common/` o `generated/`, definizione non trovata o trovata piu' di una volta | rinomina: la frase nuova e' quasi uguale a un'altra (vedi `riconciliazione.ts`) |
| conflitto col disco, operazione lunga in corso | "non l'ho ancora eseguito" |
| sposta: destinazione occupata, nome di cartella non valido, applicazione diversa | altri scenari in `src/features/` hanno gia' passi non definiti: non dipende dalla modifica |
| il dry-run trova un passo non definito o ambiguo, o un errore di compilazione nei passi toccati (si ripristina tutto) | |
| la guardia stessa-origine rifiuta la richiesta | |

Il livello 2 e' **dopo** la scrittura perche' per vedere una definizione
riscritta Cucumber deve poterla leggere dal disco. Il prezzo: per qualche
secondo il repository ha il contenuto nuovo. Si accetta perche' (1) c'e' una
sola persona alla tastiera, (2) l'operazione prende la stessa serratura delle
operazioni lunghe (`operazioneInCorso()`: se si sta registrando o eseguendo, si
risponde "aspetta che finisca"), e (3) l'istantanea prima della scrittura
permette di tornare indietro byte per byte. Se il controllo vero boccia,
l'istantanea si riapplica da sola e l'esito e' "non salvato", con il perche'.

**Salvataggio atomico.** Si pianifica tutto (nessuna scrittura), si salva
l'istantanea, si scrive ogni file in un temporaneo accanto e lo si rinomina,
si lancia il livello 2, e se qualcosa fallisce a meta' si ripristina. Su
Windows un rename su un file aperto da un altro programma puo' dare `EPERM`: e'
un fallimento come gli altri, ripristino compreso.

**Annulla.** Un solo livello, come per le fusioni (`reports/fusioni/`): le
istantanee stanno in `reports/modifiche/ultima-modifica.json` (fuori da git).
Differenza: **prima di ripristinare si controlla che ogni file sia ancora come
l'ha lasciato la modifica** (impronta dopo la scrittura). Se qualcuno l'ha
cambiato nel frattempo, "Annulla" si rifiuta con `cambiato-dopo` e lo dice,
invece di cancellare lavoro altrui. Un'eliminazione si annulla ricreando i
file. Annullare due volte non fa niente. Dopo una rinomina o un'eliminazione
che toccano la glue il catalogo si rigenera (`tentaRigenerazioneCatalogo`,
come `riconcilia`); per titolo, righe e verifiche non serve: il catalogo viene
dalle definizioni, non dai `.feature`.

### A7. Eliminare uno scenario

Prima: **elenco delle conseguenze, in linea nel pannello, mai `window.confirm`.**
Per uno scenario "Pagamento con carta" appare, per esempio:

> **Eliminare lo scenario "Pagamento con carta"?**
> Verra' eliminato lo scenario e questi 3 passi, perche' nessun altro scenario
> li usa: *the user opens the shop*, *the user adds the item*, *the user pays by
> card*.
> **Restano** questi 2 passi, perche' li usano altri scenari: *the user logs in*
> (usato da "Accesso"), *the page shows {string}* (passo comune).
> Le pagine dell'applicazione restano: possono servire ad altri scenari.
> Subito dopo puoi annullare.

Regole:

- un passo si elimina solo se **nessun altro `.feature`** lo usa
  (`trovaUsatoIn`, scansione reale) e la sua definizione non e' in `common/`.
  Passi con parametri fuori da `common/` restano (non si riscrivono) e sono
  nell'elenco "restano";
- la definizione si toglie con `rimuoviDefinizione`; il `.steps.ts` si cancella
  solo se, tolte le definizioni, `frasiDefinite` e' vuoto;
- **le Page Object non si toccano mai**, ne' i metodi ne' i file. Un metodo
  rimasto senza chiamanti e' rumore, non un guasto; ripulirlo e' un lavoro a
  parte (fuori da questo lavoro) e va fatto guardando l'uso reale. Una
  registrazione futura sulla stessa pagina trova la Page Object e la riusa;
- file con piu' scenari: dalla guidata si elimina solo l'intero file se ha un
  solo scenario; per i file piu' grandi si toglie il blocco dal testo avanzato
  (e le definizioni restano);
- si cancella il file del repository: l'istantanea ne conserva il contenuto per
  l'Annulla. Non e' un cestino: dopo la prossima modifica l'istantanea viene
  sostituita (lo dice la frase "Subito dopo puoi annullare").

### A8. Spostare uno scenario

Si sceglie un flusso (nuovo o esistente) **della stessa applicazione**, con lo
stesso campo con suggerimenti usato da `SalvaScenario`. Si spostano il
`.feature` e il `.steps.ts` nella stessa profondita' di cartelle
(`<app>/<flusso>/`), quindi gli import verso `pages/<app>/` e `support/` restano
validi. Si aggiornano la riga del percorso nel commento di testa e il tag
`@<flusso>`; **gli altri tag non si toccano**. Se il file di destinazione
esiste, o ha il posto occupato il suo `.steps.ts`: si rifiuta (non si scrive
accanto: per spostare conta il posto). Il
nome della cartella segue le regole di `NOME_CARTELLA`. Le cartelle rimaste
vuote si tolgono. Un file spostato perde il marcatore (e' una modifica).

Il nome del file non cambia quando si cambia il titolo: il `.steps.ts` accanto
e' legato a quel nome.

### A9. Il testo avanzato

Sotto "Avanzate", con un'avvertenza: "Qui scrivi come in un file. Puoi usare
solo passi che esistono nel catalogo: se ne scrivi uno nuovo non si salva."
Usa `GherkinEditor` (CodeMirror 6) con queste differenze:

- le espressioni per autocompletamento e sottolineatura arrivano da
  `GET /api/scenari/contenuto` (solo passi `implemented`; `@wanted` e
  `deprecated` non si offrono);
- **senza `onProposeStep` un clic su uno step sconosciuto non deve essere
  inghiottito**: si corregge `createClickToPropose` perche' intercetti il
  mousedown solo se il gestore c'e';
- una nuova prop `etichetta` diventa `aria-label` del contenuto: un editor
  senza nome non lo legge nessuno;
- la tastiera esce dal campo con Tab (da verificare a mano: un editor che
  trattiene il Tab e' una trappola);
- il linter mostra l'errore del parser **in inglese** (cosi' lo scrive il
  parser). Nel testo avanzato e' accettabile (e' per chi sa leggerlo); nella
  guidata il tester vede solo una frase tradotta e il numero di riga;
- `@lezer/highlight`, importato da `lib/gherkin-cm.ts`, va dichiarato in
  `package.json` (oggi arriva solo come dipendenza transitiva di
  `@codemirror/language`);
- il componente si carica con `next/dynamic` senza SSR, per non appesantire le
  altre schermate.

Passare dalla guidata al testo e ritorno e' gratuito: e' la stessa stringa.
Dal testo alla guidata, se il testo non e' piu' "semplice" (due scenari, una
tabella), la guidata si spegne con la sua frase.

### A10. Aggancio con la pagina Scenari

L'altra spec (letta, e' nella stessa cartella) lascia di proposito un solo
punto di attacco e nessun pulsante finto. Cosa si prende da li', e cosa si
aggiunge:

1. **Il pulsante "Modifica" lo mette questo lavoro**, nella riga delle azioni di
   `PannelloScenario` attraverso la proprieta' `altreAzioni?: ReactNode` che
   oggi nessuno passa. La pagina Scenari non ha, e non deve avere, una chiave
   `modifica` nei suoi messaggi: sta in `ModificaScenario`.
2. Lo scenario si indica con `/scenari?file=<percorso relativo a
   src/features/>&scenario=<titolo>`. L'unita' di modifica e' il **file**
   (la pagina mostra il file intero). Dopo un'operazione l'indirizzo si
   riscrive con `router.replace`: titolo cambiato -> nuovo `scenario`; file
   spostato -> nuovo `file`; file eliminato -> si seleziona il vicino
   nell'elenco, senza aprire in silenzio un altro scenario a caso del file.
3. In modifica, `PannelloModifica` prende il posto di `GherkinLeggibile` (la
   lettura con l'evidenziatore proprio). `GherkinEditor` si monta **solo** nel
   testo avanzato, dentro il pannello di modifica: la pagina Scenari non si
   porta dietro CodeMirror.
4. La `versione` di un file e' **`improntaDiTesto()`** dell'altra spec (hash del
   testo con le fine riga normalizzate): una sola funzione per "il file e'
   cambiato", cosi' lo stato "modificato dopo l'ultima prova" e il conflitto
   non possono dissentire. Il testo che si riscrive conserva le fine riga
   del file letto.
5. Scrivere il file cambia l'impronta, quindi l'elenco mostra da solo
   "modificato dopo l'ultima prova" e il contatore "da eseguire" sale: la
   modifica non avvisa nessuno. Alla fine di ogni operazione `alTermine` chiede
   la `ricarica()` dell'elenco.
6. "Esegui lo scenario" nel banner di esito usa lo stesso costruttore di
   indirizzo del pulsante Esegui della pagina (`percorso-scenario.ts`): non se
   ne scrive un secondo.
7. I testi della pagina stanno nel suo namespace `Scenari`; quelli di questa
   spec nel namespace `ModificaScenario`. La voce "Scenari" della barra laterale
   porta il punto delle modifiche non salvate (A5).

Se l'altra spec cambia, cambia solo questo elenco.

### A11. Accessibilita', tastiera, responsive, lingua

- **Tastiera.** Tutto si raggiunge con Tab, nell'ordine visivo. Entrando in
  modifica il fuoco va al campo "Titolo"; uscendo, torna al pulsante
  "Modifica". Ogni dialogo (modifiche non salvate, conferma, conflitto) e'
  `role="dialog"` `aria-modal="true"`, trattiene il fuoco, si chiude con Esc
  (che sceglie sempre l'opzione che non cambia niente) e restituisce il fuoco a
  chi l'ha aperto.
- **Nomi.** Ogni pulsante di riga porta nell'etichetta la frase del passo
  ("Rinomina il passo «the user adds the item»"), perche' "Rinomina" ripetuto
  quattro volte non dice nulla a chi ascolta lo schermo.
- **Esiti.** Il risultato del controllo e del salvataggio e' in una regione
  `aria-live="polite"` (errori: `role="alert"`); ogni blocco e' collegato alla
  sua riga con `aria-describedby`. Stato = icona **e** parola, mai solo il
  colore. Area cliccabile almeno 40px, contorno di fuoco sempre visibile,
  contrasto 4,5:1: gli stessi token (`--blu`, `--bordo`, `--testo-tenue`) del
  resto del cruscotto, chiari e scuri.
- **Movimento.** Nessuna animazione necessaria; quelle che ci sono rispettano
  `prefers-reduced-motion`.
- **Responsive.** Una colonna sotto i 900px; il testo avanzato scorre dentro il
  proprio riquadro, mai la pagina in orizzontale.
- **Lingua.** Ogni stringa passa da `next-intl` (`messages/it.json` e
  `messages/en.json`), con i plurali ICU. Le frasi di step restano come sono
  (sono dati, non interfaccia).
- **Niente comandi ne' percorsi.** Il tester vede applicazione e flusso per
  nome, titoli e frasi. Gli errori nominano la causa e il rimedio, mai un
  percorso o un nome di file. Le rotte non mettono percorsi assoluti nelle
  risposte. (Nota fuori da questo lavoro: `SalvaScenario` mostra oggi
  `src/features/<app>/<flusso>/` e andra' corretto.)

## Dati e rotte

Tutte le rotte di scrittura hanno `daAltraOrigine` (`lib/stessa-origine.ts`)
come prima cosa. Tutte le risposte usano percorsi **relativi a `src/features/`**
con `/`, mai assoluti ne' relativi alla radice: cosi' il difetto (b) non puo'
ripresentarsi, e un test di andata e ritorno lo prova.

| Rotta | Fa |
|---|---|
| `GET /api/scenari/contenuto?file=` | legge uno scenario: `{ testo, versione, marcatore, semplice, ragione?, passi: [{riga, parolaChiave, frase, condivisoCon: [{file, scenario}], rinominabile, motivo?}], espressioni: [...] }`. Percorso validato con `dentroLaCartellaSuDisco`; `generated/`, `@non-automatizzato` e file fuori da `src/features/` ricevono `semplice: false` o 403 con la ragione. Nessuna guardia di origine (sola lettura) |
| `POST /api/scenari/anteprima` | `{ operazione, ... }`: calcola il piano **senza scrivere** e risponde con blocchi, avvisi e conseguenze (altri scenari toccati, definizioni cambiate, passi non piu' usati, marcatore tolto) |
| `POST /api/scenari/modifica` | `{ operazione: "testo" \| "rinomina" \| "sposta" \| "elimina", file, versione, ... }`: piano, istantanea, scrittura atomica, controllo vero, ripristino se bocciato. Risponde con l'esito e con i file toccati per nome |
| `GET /api/scenari/annulla`, `POST /api/scenari/annulla` | se c'e' un'ultima modifica annullabile, e la annulla (un livello, con controllo `cambiato-dopo`) |

Forma delle operazioni:

```
{ operazione: "testo",    file, versione, testo }
{ operazione: "rinomina", file, versione, da, a }
{ operazione: "sposta",   file, versione, flusso }
{ operazione: "elimina",  file, versione }
```

(In `rinomina`, `file` e `versione` sono quelli dello scenario aperto, solo
per accorgersi che e' cambiato; la frase vale per tutto il repository.)

**Le due correzioni, e dove stanno.**

- (a) la guardia stessa-origine sta in testa a ogni `POST` nuovo, con un test
  per rotta ("altra origine -> 403, nessuna scrittura"). Alle due rotte vecchie
  si mette subito (passo 0), perche' vivono ancora un po'.
- (b) il percorso restituito e' sempre quello ricevuto, relativo a
  `src/features/`; non c'e' piu' un ramo "sposta" implicito in una rotta di
  salvataggio, perche' "salva" e "sposta" sono operazioni distinte e nominate.

Le rotte `POST /api/features` e `POST /api/features/move` non si riusano: si
cancellano con il portale (B2), e con loro il difetto (c).

**Interazione con "Salva" della schermata Registra.** `POST /api/scenari/salva`
scrive nelle stesse cartelle. Prende la stessa serratura in-process
(una riga) cosi' una registrazione che si salva e una modifica non si
pestano.

## File

**Nuovi**

| File | Cosa |
|---|---|
| `web-ui/src/lib/modifica-scenario.ts` | funzioni pure sul testo: "semplice?", titolo, sostituzione di una riga, togli passo (promuove la parola chiave: se si toglie un `Given` e segue un `And`, l'`And` diventa `Given`), aggiungi verifica, togli marcatore |
| `web-ui/src/lib/piano-modifica.ts` | `pianifica(op)` (legge il disco, non scrive), `applica(piano, convalida)` (istantanea, scrittura atomica, ripristino), `annulla()` |
| `web-ui/src/lib/convalida-scenario.ts` | livello 1 (in memoria) e livello 2 (dry-run asincrono, lettura dei messaggi) |
| `web-ui/src/lib/rinomina-passo.ts` | `pianificaRinomina(da, a)`: la logica estratta da `api/catalogo/riconcilia`, usata da entrambe |
| `web-ui/src/lib/bozza-scenario.ts` | il riduttore degli stati di A5, puro |
| `web-ui/src/app/api/scenari/contenuto/route.ts`, `anteprima/route.ts`, `modifica/route.ts`, `annulla/route.ts` | le rotte della tabella |
| `web-ui/src/context/ModificheContext.tsx` | "ci sono modifiche non salvate", in memoria, per la barra laterale |
| `web-ui/src/components/cruscotto/scenari/modifica/PannelloModifica.tsx`, `RigaPasso.tsx`, `SelettorePasso.tsx`, `ConfermaConseguenze.tsx`, `DialogoNonSalvate.tsx`, `BannerEsito.tsx`, `EditorTesto.tsx` | l'interfaccia (cartella `modifica/` per non sovrapporsi ai file dell'altra spec) |
| `web-ui/__tests__/lib/modifica-scenario.test.ts`, `piano-modifica.test.ts`, `convalida-scenario.test.ts`, `bozza-scenario.test.ts`, `rinomina-passo.test.ts`; `__tests__/api/scenari-modifica.test.ts`; `__tests__/fixtures/dry-run-*.ndjson` | vedi "Come si verifica" |

**Toccati**

| File | Cosa cambia |
|---|---|
| `web-ui/src/lib/salva-scenario.ts` | si esportano `trasforma` e il nome-cartella; nuovi `CodiceErrore`; il commento che dice "il portale gia' mostra" va corretto |
| `web-ui/src/app/api/catalogo/riconcilia/route.ts` | diventa sottile, usa `pianificaRinomina` |
| `web-ui/src/app/api/scenari/salva/route.ts` | prende la serratura |
| `web-ui/src/components/GherkinEditor.tsx` | la correzione del mousedown e la prop `etichetta` |
| `web-ui/src/components/cruscotto/BarraLaterale.tsx`, `web-ui/src/app/(cruscotto)/layout.tsx` | contesto delle modifiche non salvate; pulizia di `localStorage` (B7) |
| `web-ui/electron/main.js` | `will-prevent-unload` con dialogo |
| `web-ui/messages/it.json`, `en.json` | namespace `ModificaScenario` |
| `web-ui/package.json` e il lockfile | `@lezer/highlight` dichiarato; poi esce `sonner` (B5) |
| `web-ui/src/app/api/features/route.ts`, `features/move/route.ts`, `import/route.ts`, `catalog/propose/route.ts`, `enums/route.ts`, `github/push/route.ts`, `jira/sync/route.ts`, `lingua/route.ts` | guardia stessa-origine (passo 0); tranne `lingua`, le altre si cancellano dopo |

**Cancellati:** vedi B2.

## Testi principali (namespace `ModificaScenario`)

Nei file veri le stringhe italiane si scrivono con le lettere accentate, come
il resto di `messages/it.json`. Qui, in ASCII.

| Chiave | it | en |
|---|---|---|
| `modifica` | Modifica | Edit |
| `titoloCampo` | Titolo dello scenario | Scenario title |
| `passi` | Passi | Steps |
| `rinomina` | Rinomina il passo | Rename step |
| `rinominaAria` | Rinomina il passo "{frase}" | Rename step "{frase}" |
| `usaAltro` | Usa un altro passo | Use a different step |
| `togli` | Togli il passo | Remove step |
| `aggiungiVerifica` | Aggiungi una verifica | Add a check |
| `verificaCampo` | Testo che deve comparire | Text that must appear |
| `usatoAnche` | {n, plural, one {Usato anche in un altro scenario} other {Usato anche in # altri scenari}} | {n, plural, one {Also used in one other scenario} other {Also used in # other scenarios}} |
| `usatoSoloQui` | Usato solo qui | Used only here |
| `salva` | Controlla e salva | Check and save |
| `controllo` | Controllo il test... | Checking the test... |
| `salvata` | Salvato. | Saved. |
| `nonEseguito` | Non l'ho ancora eseguito: provalo. | I haven't run it yet: try it. |
| `eseguiOra` | Esegui lo scenario | Run the scenario |
| `annullaModifica` | Annulla la modifica | Undo the change |
| `diventaTuo` | Questo scenario e' stato creato da una registrazione. Quando lo modifichi diventa tuo: se registri di nuovo e salvi con lo stesso titolo, il tuo lavoro non viene sovrascritto — il nuovo scenario si salva accanto, con un numero in piu'. | This scenario was created from a recording. Once you edit it, it's yours: if you record again and save with the same title, your work isn't overwritten — the new scenario is saved next to it, with a number added. |
| `bloccoSconosciuto` | Il passo "{frase}" non esiste nel catalogo: il test non partirebbe. Scegli un altro passo. | The step "{frase}" isn't in the catalog: the test wouldn't run. Pick another step. |
| `bloccoAmbiguo` | Il passo "{frase}" corrisponde a piu' passi del catalogo: il test non saprebbe quale usare. | The step "{frase}" matches more than one catalog step: the test wouldn't know which to use. |
| `bloccoSintassi` | Il testo non e' valido alla riga {riga}. | The text isn't valid at line {riga}. |
| `bloccoFraseEsiste` | Esiste gia' un passo con questo nome. Per usarlo, scegli "Usa un altro passo". | A step with this name already exists. To use it, choose "Use a different step". |
| `bloccoNonRinominabile` | Questo passo non si puo' rinominare da qui: e' condiviso da tutti gli scenari o contiene un valore variabile. | This step can't be renamed here: it's shared by every scenario or contains a variable value. |
| `avvisoSimile` | Assomiglia a "{frase}", che esiste gia'. | It looks like "{frase}", which already exists. |
| `avvisoNessunaVerifica` | Questo scenario non verifica niente: aggiungi una verifica. | This scenario doesn't check anything: add a check. |
| `avvisoSenzaAccesso` | Hai tolto l'accesso: senza una sessione valida lo scenario puo' fermarsi al primo passo. | You removed the sign-in: without a valid session the scenario may stop at the first step. |
| `avvisoNonPiuUsato` | "{frase}" non e' piu' usato da nessuno scenario. Resta nel catalogo. | "{frase}" is no longer used by any scenario. It stays in the catalog. |
| `confermaRinominaTitolo` | {n, plural, one {Rinominare il passo in uno scenario?} other {Rinominare il passo in # scenari?}} | {n, plural, one {Rename the step in one scenario?} other {Rename the step in # scenarios?}} |
| `confermaRinominaTesto` | Il passo cambia nome anche nella sua definizione. Questi scenari diventano tuoi. | The step is renamed in its definition too. These scenarios become yours. |
| `eliminaTitolo` | Eliminare lo scenario "{nome}"? | Delete the scenario "{nome}"? |
| `eliminaVanno` | Verranno eliminati anche questi passi, perche' nessun altro scenario li usa: | These steps will be deleted too, because no other scenario uses them: |
| `eliminaRestano` | Restano questi passi, perche' li usano altri scenari: | These steps stay, because other scenarios use them: |
| `eliminaPagine` | Le pagine dell'applicazione restano: possono servire ad altri scenari. | The application's pages stay: other scenarios may need them. |
| `eliminaAnnullabile` | Subito dopo puoi annullare. | You can undo right afterwards. |
| `spostaTitolo` | Sposta in un altro flusso | Move to another flow |
| `spostaOccupato` | In quel flusso c'e' gia' uno scenario con questo nome. | There's already a scenario with this name in that flow. |
| `nonSalvateTitolo` | Hai modifiche non salvate | You have unsaved changes |
| `nonSalvateScelte` | Salva / Scarta / Resta qui | Save / Discard / Stay here |
| `conflittoTitolo` | Lo scenario e' cambiato mentre lo modificavi. | The scenario changed while you were editing it. |
| `conflittoScelte` | Guarda la versione attuale / Copia il mio testo / Salva comunque | See the current version / Copy my text / Save anyway |
| `avanzate` | Avanzate | Advanced |
| `testoAvanzato` | Modifica il testo | Edit the text |
| `testoAvvertenza` | Qui scrivi come in un file. Puoi usare solo passi che esistono nel catalogo: se ne scrivi uno nuovo non si salva. | Here you write as in a file. You can only use steps that exist in the catalog: a new one won't save. |
| `nonModificabileRegistrato` | Questo scenario non e' ancora salvato. Salvalo prima in un'applicazione e in un flusso, dalla schermata Registra. | This scenario isn't saved yet. Save it first to an application and a flow, from the Record screen. |
| `nonModificabileDocumento` | Questo e' un caso documentato, non automatizzato: si legge, non si modifica da qui. | This is a documented case, not automated: you can read it, not edit it here. |
| `nonModificabileComplesso` | Ha una struttura che la modifica guidata non copre (piu' scenari, esempi o tabelle). Puoi modificarne il testo. | Its structure isn't covered by guided editing (several scenarios, examples or tables). You can edit its text. |
| `richiestaNonAmmessa` | Richiesta non ammessa. | Request not allowed. |
| `operazioneInCorso` | C'e' un'operazione in corso: aspetta che finisca. | An operation is running: wait for it to finish. |

## Parte B — Dismissione del portale

### B1. Principio

Si spegne **dopo** che la modifica nel cruscotto funziona, e si spegne in due
tempi: prima le pagine diventano irraggiungibili (reversibile con una
riga di configurazione), poi si cancella il codice, strato dopo strato,
dalle foglie verso le radici. A ogni commit `tsc`, `npm test` e
`npm run build` passano.

### B2. Cosa si cancella (in quest'ordine)

**Commit 1 — pagine e rotte (nessuno le importa)**

- `web-ui/src/app/(portale)/` per intero: `components/page`, `editor/_content`,
  `editor/page`, `features/page`, `layout`, `portale/page`, `settings/page`,
  `tags/page`.
- Rotte: `api/catalog/route.ts`, `api/catalog/propose`, `api/enums`,
  `api/features/route.ts`, `api/features/move`, `api/git/status`,
  `api/github/push`, `api/import`, `api/jira/sync`, `api/tags`. (`api/download`
  **resta**: lo usa la pagina Scenari.)
- Test: `__tests__/api/catalog.test.ts`, `__tests__/api/propose.test.ts`.

**Commit 2 — componenti (usati solo dalle pagine appena cancellate)**

`CommitPreviewDialog`, `FeatureImportDialog`, `FeaturePlacementDialog`,
`FeaturePreview`, `FileSidebar`, `GherkinToolbar`, `ImportDropzone`,
`LanguageToggle`, `NavSettingsLink`, `ThemeToggle`, `ProposeStepModal`,
`StepBrowser`, `StepParamPicker`, `StepCatalog`, `StepDetailModal`,
`ScenarioOutline` (gia' inutilizzato). `hooks/useSettings.ts`.

**Commit 3 — librerie e componenti `ui/`**

- `lib/catalog.ts`, `lib/github-utils.ts` **e** `src/lib/github-utils.test.ts`
  (il file di test vagante dentro `src/`: `vitest` non lo esegue, ma `tsc`
  lo compila e fallirebbe), `lib/import-extended.ts`, `lib/page-markers.ts`,
  `lib/step-snippets.ts`, `lib/feature-tags.ts`, `lib/i18n.ts` (il vecchio
  dizionario).
- Test: `__tests__/lib/catalog.test.ts`, `__tests__/lib/github-utils.test.ts`.
- `components/ui/`: `card`, `input`, `select`, `separator`, `table`, `popover`,
  `sonner`.
- Codice morto che resta senza chiamanti e va tolto insieme ai suoi test (se
  l'altra spec non li usa): `listFeatures`, `parseFeatureSummary` in
  `lib/features.ts` e il tipo `FeatureSummary` in `lib/types.ts`; il tipo
  `ParamEnumDef` e il campo `paramEnums` in `lib/types.ts`. **Prima di
  togliere `paramEnums` si controlla `catalogo-fixtures.contratto.test.ts`**,
  che lo nomina fra i campi del contratto del catalogo.

**Commit 4 — Providers, layout, dipendenze**

- `providers/Providers.tsx`: via `LanguageContext`, `useLanguage`,
  `translations`, `Toaster`. Restano `ThemeProvider`, `TooltipProvider`,
  `ErrorBoundary`.
- `package.json` + lockfile: via `sonner`.
- `next.config.ts`: si aggiorna il commento che nomina il portale; **non si
  tocca `serverExternalPackages`** (vedi Rischi).
- `app/layout.tsx`: il commento sul portale.

### B3. Cosa si sposta o si riusa

| Cosa | Dove va |
|---|---|
| `GherkinEditor`, `gherkin-cm`, `autocomplete`, `catalog-match` | restano, usati dal testo avanzato (P5). Se il testo avanzato non entra, escono tutti (vedi B4) |
| `FeaturePlacementDialog` | non si riusa: la scelta del flusso si fa con il campo con suggerimenti gia' presente in `SalvaScenario` |
| `GET /api/download` (lettura di un `.feature`) | resta, usata dalla pagina Scenari; la modifica aggiunge `GET /api/scenari/contenuto` per la parte che serve a lei |
| `POST /api/features` (salvataggio) | `POST /api/scenari/modifica` |
| `POST /api/features/move` | `POST /api/scenari/modifica` con `operazione: "sposta"` |
| la logica di rinomina di `riconcilia` | `lib/rinomina-passo.ts` |
| pagina Features | la pagina Scenari (altra spec) |
| pagina Components e pagina Catalog del portale | gia' nel Catalogo del cruscotto |

### B4. Cosa resta

`lib/repo`, `percorsi`, `percorsi-disco`, `types` (ridotto), `utils`,
`features` (solo `walkFeatures`), `component-impact`, `stessa-origine`;
`ui/badge`, `button`, `tooltip`; `ErrorBoundary`; `Providers` (ridotto);
tutto il cruscotto e le sue rotte; `api/lint` (serve al linter del testo
avanzato), `api/lingua` e `api/download` (con il suo test).

**Se il passo 5 venisse tagliato per tempo (M1 e' si', ma e' l'ultimo)**, escono anche: `GherkinEditor`,
`gherkin-cm`, `autocomplete`, `catalog-match` e i loro test, le dipendenze
`@codemirror/*`, `@cucumber/gherkin` e `@cucumber/messages` (se la sintassi si
controlla altrimenti), `api/lint` e il suo parser, i token `--cm-*` e le regole
`.cm-*` di `globals.css`, e `serverExternalPackages`.

### B5. Dipendenze npm

| Dipendenza | Esito |
|---|---|
| `sonner` | **esce** (e' usata solo dalle pagine e da `Providers`) |
| `@lezer/highlight` | **entra**, dichiarata esplicitamente (e' gia' importata) |
| `@base-ui/react`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `next-themes`, `tw-animate-css`, `shadcn` | restano: `button`, `badge`, `tooltip`, `globals.css` e il cruscotto li usano |
| `@codemirror/*`, `@cucumber/gherkin`, `@cucumber/messages` | restano (testo avanzato e `api/lint`); escono solo se il passo 5 viene tagliato |

Il lockfile di `web-ui` e' gia' disallineato (`npm ci` fallisce su una macchina
pulita: `ROADMAP.md` §4 punto 1). La modifica a `package.json` e la
riallineatura del lockfile si fanno **insieme** a quel punto, non in un lavoro
a parte, e il passo si chiude con `npm ci` in una cartella pulita.

### B6. Documenti da aggiornare

| File | Cosa |
|---|---|
| `README.md` | la riga della tabella dei componenti (le "due facce"), "The portal is reachable from the dashboard sidebar", tutta la sezione "BDD Catalog App — Pages & Features" (Catalog, Editor, Features, Components, Tags, Settings), la sezione "Proposing steps to the catalog" (descrive il giro del ramo `catalog` su GitHub), la riga "For the portal only, no Node.js is required" e la frase "so the portal can show..." |
| `web-ui/README.md` | l'introduzione, la tabella delle pagine (via le sei righe del portale, dentro Scenari), la tabella delle rotte (via la sezione "Portal", dentro le nuove rotte) |
| `docs/USER-GUIDE.md` | e' la guida del portale: si sostituisce con la guida alla modifica degli scenari, oppure si cancella e il contenuto utile va in `docs/TESTER-DASHBOARD-GUIDE.md` (che oggi, alla riga 20, rimanda al portale) |
| `docs/OVERVIEW.md` | §4 punto 2 "Writing" (il canale "Desktop app, portal"), §6 (la riga "the portal places files from the tags"), §7 (riga "Portal"), §8 (ruolo del tester), §11 (il riferimento a `USER-GUIDE.md`) |
| `docs/STEP-LIFECYCLE.md` | i riferimenti a "verde/arancione/rosso nel portale", allo Step Browser, al riavvio del portale, alla sezione degli enum (`step-enums.json`) |
| `ROADMAP.md` | §3 (lo schema: "portal"), §4 (nuovo punto), §1 |
| `docs/QA-FUNZIONALE-AGENTE.md` | §7, le prove U3 e U12 e l'elenco delle pagine del portale |
| `docs/PRESENTATION.md`, `docs/reviews/2026-09-25-dashboard-walkthrough.md`, `docs/anti-entropy/README.md` (D38 dice "mappa nel portale") | solo i riferimenti; la rassegna del 25 settembre ha F9 e F19 che si chiudono con lo spegnimento: si spuntano |
| `web-ui/electron-builder.yml` | `productName` (oggi "BDD Catalog"): **cambia con questo lavoro (decisione M7), ma e' bloccato finche' U1 non da' il nome nuovo.** Cosa, dove e con quale migrazione: B10. `appId` e `copyright` si lasciano |
| commenti in codice | `next.config.ts`, `app/layout.tsx`, `BarraLaterale.tsx`, `i18n/request.ts`, `salva-scenario.ts`, `components/cruscotto/catalogo/*` (nominano "il vecchio portale") |

### B7. Le funzioni che si perdono

| Funzione | Raccomandazione | Perche' |
|---|---|---|
| **Push su GitHub dall'app** | togliere; il "dove finisce il lavoro del tester" e' U2 | spingeva un solo `.feature` via API, senza step ne' Page Object (ora versionati con lo scenario): sull'altra macchina un test che non parte. Il token stava in `localStorage`, la rotta senza guardia. Fino a U2 il lavoro resta nella copia di lavoro: va detto al proprietario |
| **Sync Jira** (commento sul ticket dal tag `@ticket`) | togliere dall'app; resta il CLI `npm run jira:sync` | la rotta era una copia dello script. Chi la usa e' tecnico |
| **Import da .txt / `.feature`** | togliere dall'app; resta `scripts/import-scenarios.ts` | il metodo e' la dimostrazione, non la trascrizione. Se emergesse il bisogno, un "Importa" in Scenari e' un lavoro a parte |
| **Proposta di step `@wanted` dall'editor** (clic sulla frase sottolineata, o "Proponi N step"; scrive `step-proposals.json` sul ramo `catalog` di GitHub) | togliere dall'app; rimandare | e' l'unico percorso dentro l'app verso l'approvazione del team (`CLAUDE.md` regola 2): togliendolo, proporre torna a essere un gesto fuori dall'app (si segna `@wanted` nel catalogo e se ne parla nel rituale, come descrive `README.md` "Step Catalog"). I buchi di una registrazione sono gia' tradotti nella schermata Registra. Se serve, "Chiedi un passo" nel Catalogo e' un lavoro a parte; il ramo `catalog` su GitHub resta com'e' (domanda M10) |
| **Indice dei tag** (marcatori di pagina `# #TAG`) | togliere | convenzione degli scenari importati; la mappa per componente e per pagina e' gia' nel Catalogo |
| **Modifica degli enum degli step** (`step-enums.json`) | togliere dall'app; il file resta per ora (domanda M9) | serviva ai menu a tendina dell'editor del portale: nessun altro lo legge |
| **Cambio tema chiaro/scuro** | l'interruttore del portale (`ThemeToggle`) muore; **nasce un selettore nella barra laterale**, accanto alla lingua (decisione M5, vedi B9) | il tema non segue solo il sistema: il tester sceglie fra chiaro, scuro e "come il sistema". `next-themes` resta; il cruscotto ha gia' i colori scuri (`.dark`) |
| **Impostazioni** (token in `localStorage`, identita' dei commit) | togliere | le credenziali degli ambienti sono in Controllo; i token delle integrazioni a riga di comando stanno in `.env` ("Altre variabili" in Controllo). Pulizia dei residui: sotto |
| **Scrivere uno scenario da zero col catalogo** (editor + StepBrowser + schede) | togliere | e' il metodo vecchio. Chi sa Gherkin ha VS Code e l'estensione; il tester registra. Da dire al proprietario: dopo questo lavoro **nessun percorso nell'app crea uno scenario senza registrare** (domanda M8) |
| **Bozze dell'editor in `localStorage`** | togliere | sostituite dalla bozza in memoria e dall'Annulla |

**Pulizia dei residui.** Il portale ha lasciato nel profilo di Electron di ogni
macchina il token GitHub e le bozze (`bdd-scaffold-settings`,
`gsd-editor-tabs`, `gsd-editor-active-tab`, `gsd-editor-incoming`,
`gsd-editor-draft`, `gsd-editor-sidebar`). Un segreto che resta su disco dopo la
funzione che lo usava e' un guasto in attesa. Il layout del cruscotto, al primo
avvio dopo l'aggiornamento, li rimuove (in `try/catch`: lo storage puo' mancare
o dare errore). Si tiene per due versioni, poi si toglie.

### B8. Script di repository e estensione

Restano **tutti**: sono CLI indipendenti. Verificato: `scripts/` non importa nulla
da `web-ui/` (solo due commenti), e `vscode-extension/` legge soltanto
`step-catalog.json`.

- `scripts/jira-sync.ts`, `scripts/jira-fetch.ts`, `scripts/import-scenarios.ts`:
  chi li usa e' tecnico e lavora a riga di comando. Il bisogno di averli
  nell'app era del portale. Si valuteranno quando si decide U2.
- `vscode-extension/`: e' il canale di scrittura di chi sa Gherkin; con il
  portale spento diventa l'unico. Il suo pacchetto `.vsix` (punto 9 della
  roadmap) sale di importanza.
- `CLAUDE.md` e le regole degli assistenti non nominano il portale: niente da
  cambiare.

### B9. Il selettore del tema (decisione M5)

Il tema chiaro/scuro **non** segue solo il sistema: nella barra laterale, accanto
al selettore della lingua, c'e' un selettore a tre valori.

- **Dove vive.** `web-ui/src/components/cruscotto/SelettoreTema.tsx`, accanto a
  `SelettoreLingua.tsx` (che ha gia' la forma giusta: gruppo `role="group"` con
  etichetta, bottoni con stato attivo, stessi token `--bordo`, `--blu`,
  `--testo-tenue`). Lo monta `BarraLaterale` sotto la lingua. (La cartella
  `components/cruscotto/` e' toccata da altri lavori in corso: questa spec dice
  dove andra', non lo costruisce.)
- **Tre valori:** "Chiaro" (`light`), "Scuro" (`dark`), "Come il sistema"
  (`system`). Il valore di partenza e' `system`, come oggi.
- **Persistenza.** `next-themes` e' gia' nel progetto e `Providers` lo monta cosi'
  (verificato): `<NextThemesProvider attribute="class" defaultTheme="system"
  enableSystem>`. La scelta la salva lui in `localStorage` (chiave `theme`), che in
  Electron sta nel profilo della finestra e resta fra un'apertura e l'altra.
  Niente rotta e niente cookie nuovi. Il selettore usa `useTheme()`: `theme` e' il
  valore scelto (anche `system`), non quello risolto (`resolvedTheme`).
- **Nessun lampo al primo disegno.** `next-themes` mette uno script bloccante
  nel `<head>` che applica la classe `dark` prima del primo disegno, e il
  layout radice ha gia' `suppressHydrationWarning` su `<html>`: non si tocca
  niente di questo. L'unica precauzione e' nel selettore: `useTheme()` non
  conosce il valore finche' il componente non e' montato, quindi prima del
  montaggio non si segna nessun bottone come attivo, e si attiva quello vero
  dopo; altrimenti il server disegna un bottone e il client un altro (errore di
  idratazione). Lo stato "montato" si ottiene come fa l'attuale `ThemeToggle` del
  portale (che muore con lui).
- **Testi** nel namespace `Cruscotto` (`messages/it.json`, `en.json`):
  `themeLabel`, `themeLight`, `themeDark`, `themeSystem`. Stato = parola e icona,
  mai solo il colore; area cliccabile almeno 40px.
- **Cosa non cambia:** i colori scuri (`.dark` in `globals.css`) ci sono gia'.
- **Come si verifica.** `vitest` non prova i componenti e la scelta e' di
  `next-themes`: non si ricopia in un modulo puro. A mano, nei due temi e nelle
  due lingue: le tre scelte funzionano; chiusa e riaperta la finestra la scelta
  resta; con `scuro` salvato la pagina non si mostra mai chiara nemmeno per un
  istante (ricarica ripetuta).

### B10. Il nome del prodotto (decisione M7)

**Stato: bloccato.** Il proprietario ha deciso che il nome cambia **con questo
lavoro**, ma non ha ancora dato il nome nuovo (decisione U1 aperta). Finche' il
nome non c'e' **non si cambia niente nel codice**: ne' `productName`, ne' i
testi, ne' i documenti. Cambiare `productName` sposta la cartella `userData` di
ogni macchina; farlo due volte (un nome provvisorio, poi quello vero) imporrebbe
due migrazioni a ogni tester.

Quando il nome c'e', in un solo commit:

| Dove | Cosa cambia |
|---|---|
| `web-ui/electron-builder.yml` | `productName`. `appId` e `copyright` restano (cambiare l'`appId` e' un'altra migrazione, e non serve) |
| `web-ui/electron/main.js` | la migrazione di `userData` (sotto) |
| titolo e testi visibili | `metadata.title` in `app/layout.tsx` e i testi di `messages/*.json` che nominano il prodotto |
| documenti | `README.md`, `web-ui/README.md`, `docs/USER-GUIDE.md` e `docs/TESTER-DASHBOARD-GUIDE.md`, `docs/OVERVIEW.md` (dove compare il vecchio nome) |
| pacchetto | il nome dell'installatore e dell'eseguibile che `electron-builder` produce |

**La migrazione di `userData`.** Oggi `userData` e' una cartella col nome del
prodotto sotto `%APPDATA%`; vi stanno `bdd-settings.json` (la cartella del
progetto scelta, letta in `main.js` da `settingsPath`), `debug.log` e il profilo
della finestra (cookie della lingua, `localStorage` compreso il tema). Con un
nome nuovo Electron ne usa una nuova e vuota: il tester si ritroverebbe senza
progetto, con lingua e tema di partenza.

Il passo, **prima** di leggere `bdd-settings.json` e prima di `app.whenReady()`:

1. calcolare il percorso della vecchia cartella (sorella della nuova, col nome
   vecchio, scritto una volta sola in una costante);
2. se la nuova **non esiste** (o e' vuota) e la vecchia **esiste**: copiarla
   nella nuova (copia, non spostamento: la vecchia resta come rete di
   sicurezza) e segnare la migrazione con un file `migrato-dal-nome-vecchio`
   dentro la nuova, cosi' non si ripete;
3. se la copia fallisce (file aperto, permessi) non si blocca l'avvio: si parte con
   la cartella nuova vuota, si scrive nel `debug.log` e si mostra l'avviso;
4. la vecchia cartella **non si cancella da codice**: lo dice l'avviso, lo decide
   il tester.

**L'avviso all'utente** (dialogo in italiano come gli altri di `main.js`,
mostrato una volta):

> L'applicazione ha cambiato nome. Le tue impostazioni sono state copiate
> nella nuova cartella; la vecchia (col nome precedente) resta dov'e' e puoi
> eliminarla quando vuoi. Se non trovi piu' il progetto, scegli di nuovo la
> cartella: succede solo questa volta.

Se la copia non e' riuscita il testo dice invece che il progetto va scelto di
nuovo. Il dialogo nasce con la migrazione, non prima.

**Come si verifica.** La parte pura (calcolo dei due percorsi, decisione "copiare o
no" date le due cartelle) si estrae in una funzione senza `electron` e si prova
con `vitest` su cartelle temporanee: nuova assente e vecchia presente -> copia;
nuova presente -> niente; vecchia assente -> niente; copia fallita -> non blocca.
L'avvio vero si prova a mano su una macchina con le impostazioni vecchie.
**Bloccato da U1: non si inizia prima del nome.**

## Ordine di lavoro

Passi piccoli, ciascuno annullabile con un `git revert`, con il controllo che
dice "fatto". Le stime sono a occhio.

| # | Passo | Fatto quando | Stima |
|---|---|---|---|
| 0 | **Guardia stessa-origine** alle otto rotte di scrittura che non l'hanno (**fatto il 2026-10-01**, con la correzione dei percorsi (b) e dei tag (c)) | per ognuna c'e' un test "altra origine -> 403, niente scritto"; il portale salva ancora (stessa origine) | 1/2 g |
| 1 | **Fondamenta**, senza interfaccia: `modifica-scenario`, `piano-modifica`, `convalida-scenario`, `rinomina-passo` (estratta da `riconcilia`, con test di caratterizzazione scritto prima), `bozza-scenario` | tutti i casi di "Come si verifica" per questi moduli passano; `npx tsc --noEmit` pulito | 2 g |
| 2 | **Rotte**: `contenuto`, `anteprima`, `modifica`, `annulla`; guardia a ogni `POST`; serratura anche in `salva` | i test di `scenari-modifica.test.ts` passano; nessuna risposta contiene un percorso assoluto; andata e ritorno dei percorsi verificata | 1 g |
| 3 | **Modifica guidata**: titolo, usa un altro, togli, verifica, rinomina; bozza, controllo, esito, Annulla, "Esegui lo scenario"; `ModificheContext` e `will-prevent-unload`; testi it/en | a mano su uno scenario registrato e salvato, in italiano e in inglese e a 900px: si cambia il titolo, si rinomina un passo usato da due scenari, si salva, si annulla, si riesegue. Percorso con sola tastiera completo | 2 g |
| 4 | **Sposta ed elimina**, con l'elenco delle conseguenze | si elimina uno scenario che condivide un passo con un altro: il passo resta, la Page Object e' identica byte per byte, l'Annulla ricrea tutto | 1,5 g |
| 5 | **Testo avanzato**: `EditorTesto`, correzione di `GherkinEditor`, `@lezer/highlight` dichiarato | si scrive una frase sconosciuta: il salvataggio e' bloccato con la frase giusta; il Tab esce dal campo | 1 g |
| | *Controllo di equivalenza (cancello):* ogni funzione della tabella B7 e' "tenuta" o "tolta" con il consenso del proprietario | domande M1-M10 chiuse (fatto il 2026-10-01) | |
| 5b | **Selettore del tema** (B9): `SelettoreTema` accanto a `SelettoreLingua`, testi it/en | a mano: tre scelte, la scelta resta dopo la chiusura della finestra, nessun lampo al primo disegno, in italiano e in inglese | 1/2 g |
| 6 | **Spegnere** il portale: in `next.config.ts` i vecchi indirizzi (`/portale`, `/editor`, `/features`, `/components`, `/tags`, `/settings`) rimandano a `/scenari` o `/catalogo`; la pulizia di `localStorage` entra nel layout | i vecchi indirizzi non mostrano piu' il portale; il cruscotto e' intatto; si annulla togliendo il blocco | 1/2 g |
| 7 | **Cancellare** il codice, in quattro commit (B2: pagine e rotte; componenti; librerie e `ui/`; `Providers` e dipendenze) | a ogni commit: `npx tsc --noEmit`, `npm test`, `npm run build` e `npm run lint` in `web-ui`; alla fine l'elenco delle rotte di `next build` non ha nessun indirizzo del portale e `npm ci` funziona in una cartella pulita | 1 g |
| 8 | **Documenti** (B6) | `grep -ri portale` nei documenti e nel codice di `web-ui` non trova piu' nulla che non sia storia (commit, `.planning/`, `.superpowers/`); `npm run check:all` e `npm run rules:check` alla radice passano | 1/2 g |

Il nome del prodotto (B10) non ha un numero: parte quando U1 da' il nome.

Il minimo per la demo e' fino al passo 3; i passi 4 e 5 si possono rimandare
senza lasciare niente di rotto. Il passo 5 e' il piu' tagliabile (M1 e' si', ma per ultimo): se il tempo
manca si taglia senza rifare niente, e con lui esce un blocco di cancellazione
in piu' (B4).

## Rischi

| Rischio | Come ci si accorge | Come si ripara |
|---|---|---|
| **Import incrociati**: un modulo "condiviso" importa uno che muore (`Providers` -> `lib/i18n`, `GherkinToolbar` -> `ui/separator`) | `npx tsc --noEmit` e `npm run build` dopo ogni commit di cancellazione; un passo = un solo strato | si cancella nell'ordine foglie-radici di B2; un commit che non compila si annulla intero |
| **Test che nominano moduli cancellati** (`catalogo-fixtures.contratto.test.ts` nomina `paramEnums`; `src/lib/github-utils.test.ts` dentro `src/`) | `npm test`, e `tsc` per quello dentro `src/` | si aggiorna il contratto del catalogo prima di togliere il tipo |
| **Build**: l'output `standalone` cambia e il pacchetto Electron non parte | `npm run build` in `web-ui`; una volta alla fine `npm run electron:build:win` e un avvio a mano | il commit di cancellazione si annulla |
| **`serverExternalPackages`**: se uno toglie `api/lint` "perche' sembra del portale", il linter dell'editor ricade in silenzio sulle regole manuali e nessuno se ne accorge | un test che importa `api/lint` e ne prova la risposta; lo stesso test elenca come "resta" la rotta | `serverExternalPackages` si cambia solo insieme al taglio del passo 5 |
| **Il livello 2 e' lento o non parte** (ts-node compila tutti gli step) | tempo del salvataggio sul repository vero; messaggio "Controllo il test..." che non finisce | limite di tempo e fallimento chiuso: non si salva; si misura prima di P3 e, se supera una decina di secondi, si valuta la modalita' solo-traduzione della diagnosi |
| **Il repository ha il contenuto nuovo per qualche secondo** durante il controllo vero | `operazioneInCorso()` rifiuta un'esecuzione parallela; un test lo prova | ripristino automatico dall'istantanea |
| **Windows e i file aperti**: un rename su un file aperto da un altro programma da' `EPERM` | test che simula l'errore a meta' | ripristino dall'istantanea e messaggio con la causa |
| **Due matcher che divergono** (browser, validatore del pre-commit, Cucumber) | un caso per riga: la stessa frase passata a tutti e tre | il giudice e' Cucumber; il pre-commit resta come ultima rete al commit |
| **Dipendenza nascosta fra passi** (la Page Object nasce nel primo): la validazione e' verde e il test cade | non si vede dal controllo: per questo "Esegui lo scenario" e' in ogni esito | il pannello lo dice, con il pulsante |
| **Residui nel profilo di Electron** (token GitHub, bozze) | a mano, con `localStorage` di una finestra di prova | pulizia al primo avvio |
| **`productName` nuovo = `userData` nuovo**: ogni tester deve riscegliere la cartella del progetto | si vede al primo avvio dopo l'aggiornamento | cambiare il nome una volta, con la migrazione e l'avviso di B10 (decisione M7); **non si cambia prima che U1 dia il nome** |
| **Il tema lampeggia al primo disegno** (pagina chiara, poi scura) | a mano, con tema scuro salvato e ricarica: la pagina non deve mai mostrarsi chiara | `next-themes` inietta lo script bloccante nel `<head>`; non lo si sposta in un effetto (B9) |
| **Lockfile**: togliere `sonner` e aggiungere `@lezer/highlight` senza riallineare il lockfile rompe `npm ci` | `npm ci` in una cartella pulita al passo 7 | si riallinea insieme al punto 1 della roadmap |

## Come si verifica

`vitest` gira solo su `web-ui/__tests__/**/*.test.ts`, in ambiente node: **niente
test di componenti.** E' il motivo per cui il riduttore degli stati e le
trasformazioni di testo sono moduli puri. Tutti i casi si scrivono **prima** del
codice, su cartelle temporanee (`os.tmpdir()`), mai su `src/features/` vera:
le funzioni di `piano-modifica` ricevono le radici come parametro, come
`salvaScenario(radiceFeatures, ...)`.

**`modifica-scenario`**
- "semplice": un solo scenario si'; con `Scenario Outline`, `Background`, `Rule`,
  tabella, DocString, due scenari no.
- titolo: cambia `Feature:` e `Scenario:` insieme quando erano uguali; uno
  scenario gia' rinominato a mano resta com'e'; rifiuta vuoto, due righe, oltre
  80 caratteri; mantiene i tag e il commento di testa.
- sostituisci una riga: conserva indentazione, parola chiave e CRLF.
- togli un passo: se era un `Given` e segue un `And`, l'`And` diventa `Given`;
  le righe `# durante questo passo si verifica: "X"` che lo seguono vanno via
  con lui, e solo quelle (non il commento del passo dopo).
- aggiungi una verifica: accoda `Then the page shows "x"` (e `And` se il passo
  precedente era gia' un `Then`); un valore con virgolette doppie diventa con
  virgolette singole (come fa il generatore); un valore con un a capo e'
  rifiutato.
- togli marcatore: dopo, `includes(MARCATORE)` e' falso; i tag, compreso
  `@generato`, restano; un testo senza marcatore resta identico.

**`piano-modifica` / `convalida-scenario`**
- una modifica senza differenze non scrive niente e non toglie il marcatore.
- una modifica vera toglie il marcatore al `.feature` e al `.steps.ts`
  riscritto, e **non** a una Page Object: l'impronta della Page Object e'
  identica prima e dopo.
- rinomina: riscrive la frase nel `.feature` aperto, in ogni altro `.feature`
  che la usa e nella definizione (anche la riga `@intent`); con una sola
  riscrittura che fallisce non si scrive niente; si rifiuta se la frase nuova
  esiste gia', se ha parametri, se la definizione e' in `common/` o in
  `generated/`, se la definizione compare zero o due volte.
- rinomina con una riga che usa la frase vecchia in una forma non riconosciuta
  (maiuscole diverse) in un altro file: il livello 1 la vede come "non combacia
  piu'" e blocca.
- eliminazione: l'elenco separa "vanno" e "restano" correttamente; un passo
  usato da un altro scenario resta; un passo di `common/` resta sempre; il
  `.steps.ts` sparisce solo se non ha piu' definizioni; la Page Object e'
  identica byte per byte; un file con due scenari non si elimina dalla guidata.
- sposta: destinazione occupata -> rifiuto e niente scritto; il commento di
  testa e il tag di flusso si aggiornano; **gli altri tag restano** (il test del
  difetto (c): `@generato` e `@non-automatizzato` sopravvivono, e la riga dei
  tag non si duplica quando la prima riga e' il commento del marcatore);
  applicazione diversa rifiutata; nome di cartella non valido rifiutato; la
  cartella vuota si toglie.
- conflitto: `versione` diversa -> `conflitto` e niente scritto; `versione`
  uguale -> scrive; un file cambiato fra piano e scrittura -> `conflitto`.
- atomicita': una scrittura che fallisce a meta' (simulata) lascia tutti i file
  com'erano; un controllo vero bocciato (iniettato, come il `Lanciatore` di
  `registro.ts`) ripristina byte per byte.
- annulla: ripristina; un'eliminazione ricrea i file; annullare due volte non fa
  niente; se un file e' cambiato dopo la modifica -> `cambiato-dopo`, niente
  toccato.
- livello 1: sintassi non valida; frase sconosciuta; frase ambigua introdotta
  (blocca) e preesistente (avvisa); nessun `Then` (avvisa); tolto
  `the user is logged in` (avvisa); passo `@wanted` (avvisa); frase quasi uguale
  a un'altra con lo stesso componente e con componente diverso (due testi
  diversi); `@non-automatizzato` e `generated/` rifiutati.
- lettura del controllo vero: un file di messaggi con un passo non definito, uno
  con un passo ambiguo, uno tutto verde, uno con errore di compilazione;
  un tempo scaduto vale fallito.
- **un solo test d'integrazione con Cucumber vero** (limite di tempo largo,
  salta se il binario manca): una feature d'esempio con una frase ambigua e una
  non definita. Serve a confermare che il dry-run le segnali: lo si **assume**
  qui, non e' provato.

**`bozza-scenario` (il riduttore)**
- ogni transizione della tabella di A5, compresa quella a "conflitto";
- cambiare scenario con una bozza `sporca` non cambia niente finche' non si
  sceglie; "Resta qui" e Esc non perdono il testo; "Scarta" lo perde;
- "Rinomina", "Sposta" ed "Elimina" non partono da `sporca` (rinomina: con la
  frase che dice di salvare o scartare prima).

**Rotte (`__tests__/api/scenari-modifica.test.ts`)**
- ogni `POST` con `sec-fetch-site: cross-site` risponde 403 e non scrive;
- percorso con `..`, assoluto, collegamento simbolico, estensione diversa: 403;
- nessuna risposta contiene la radice del repository ne' una barra rovesciata;
- andata e ritorno: il percorso restituito, rimandato, e' la stessa operazione
  (non finisce in un "sposta");
- la stessa regola per le otto rotte della passo 0, con un solo test
  parametrico.

**Spegnimento (a mano, e con i comandi di sempre)**
- dopo ogni commit di cancellazione: `npx tsc --noEmit`, `npm test`,
  `npm run build`, `npm run lint` in `web-ui`;
- alla fine: l'elenco delle rotte di `next build` non contiene nessun indirizzo
  del portale; ogni pagina del cruscotto si apre; `npm ci` in una cartella
  pulita; `npm run check:all` e `npm run rules:check` alla radice; un avvio di
  Electron.

## Fuori da questo lavoro

- **Creare uno scenario da zero** nell'app (solo registrando, come oggi).
- **Registrare di nuovo** uno scenario esistente per aggiornarlo.
- **Proporre uno step nuovo** (`@wanted`) e approvarlo: e' del rituale del
  catalogo.
- **Modificare Page Object o step a mano**, o ripulire i metodi senza uso.
- **Riordino guidato dei passi** e passi con parametri nella guidata.
- **Scenari `@non-automatizzato`** e file con piu' scenari, Background, esempi
  o tabelle nella modifica guidata (solo testo avanzato, se entra).
- **Rinominare un'applicazione o un flusso**, e spostare fra applicazioni.
- **Pubblicare il lavoro** (push, wiki, aggiornamento dell'app): U2.
- **Storia delle versioni di uno scenario**: la storia e' git, e git non e'
  un'interfaccia per il tester.
- **Piu' persone che modificano lo stesso scenario insieme**: il conflitto
  col disco protegge dall'errore, non e' collaborazione.
- **La pagina Scenari in sola lettura**: altra spec.

## Domande aperte per il proprietario

### Decise (2026-10-01)

| # | Decisione | Dove si riflette |
|---|---|---|
| M1 | **Si'**: il testo avanzato entra, per ultimo (P5) | A1, A9, B4, passo 5 |
| M2 | **Solo "ovunque"**: rinominare un passo vale per tutti gli scenari che lo usano, con elenco e conferma; niente "solo qui" | A2, A3 |
| M3 | **Si'**: si modificano solo scenari salvati e semplici; i `@non-automatizzato` e quelli in `generated/` no | A2 |
| M4 | **Solo stessa applicazione** per lo spostamento | A2, A8 |
| M5 | **Selettore** del tema (chiaro, scuro, come il sistema) accanto alla lingua: **diversa dalla raccomandazione** ("segue il sistema") | B7, B9, passo 5b |
| M6 | **Si'**: niente push dall'app fino a U2; il lavoro resta nella copia di lavoro | B7 |
| M7 | **Ora**: il nome del prodotto cambia con questo lavoro, **diversa dalla raccomandazione** ("con U1"). **Bloccato: il nome nuovo non c'e' ancora (U1 aperta) e nel codice non si cambia niente finche' non c'e'** | B6, B10, Rischi |
| M8 | **Si'**: dopo lo spegnimento nessun percorso nell'app crea uno scenario senza registrare | B7 |
| M9 | **Tenere il file** `step-enums.json`, segnato come senza lettori | B7 |
| M10 | **Si lascia com'e'**: il giro delle proposte (ramo `catalog`, `step-proposals.json`) resta in piedi senza interfaccia | B7 |

### Le domande come erano poste

Storico: le raccomandazioni sono quelle originali; per M5 e M7 la decisione le
ribalta.

| # | Domanda | Opzioni | Raccomandazione |
|---|---|---|---|
| M1 | Il **testo avanzato** (CodeMirror) entra nella prima versione? | si' / no, solo guidata | **Si', ma ultimo (P5)**: serve a chi sa Gherkin e ai file con piu' scenari. Se il tempo manca si taglia senza rifare niente, e con lui esce un blocco di cancellazione e di dipendenze (B4) |
| M2 | **Rinominare un passo vale per tutti gli scenari che lo usano.** Va bene, o serve anche "solo in questo scenario"? | solo ovunque (con elenco e conferma) / anche "solo qui" | **Solo ovunque.** "Solo qui" e' "Usa un altro passo": due gesti, due significati, nessuna frase nuova creata in silenzio |
| M3 | Si modificano solo scenari **salvati e semplici**? Gli `@non-automatizzato` e quelli in `generated/` no? | si' / aprire anche i documenti al testo avanzato | **Si'.** I documenti non hanno step e il validatore li salta di proposito; modificarli dal cruscotto non serve a nessuno |
| M4 | Lo **spostamento** vale solo dentro la stessa applicazione? | solo stessa applicazione / anche fra applicazioni | **Solo stessa applicazione.** Le Page Object sono per applicazione: spostare fuori lascerebbe lo scenario agganciato alle pagine di un'altra |
| M5 | **Tema chiaro/scuro**: nessun interruttore (segue il sistema) o un selettore accanto alla lingua? | segue il sistema / selettore | **Segue il sistema.** Un controllo in meno; si aggiunge se un tester lo chiede (un file) |
| M6 | **Senza il push dell'app** il lavoro del tester resta nella copia di lavoro fino a U2. E' accettabile per la demo? | si' / tenere un push minimo nel cruscotto | **Si'.** Il push del portale mandava un solo file e andava comunque buttato: il vero "pubblica" nasce con U2 |
| M7 | Il **nome del prodotto** (`productName` "BDD Catalog") cambia ora, con questo lavoro, o con U1? | ora / con U1 | **Con U1.** Cambiarlo sposta la cartella dei dati di ogni macchina (si riscelgono il progetto e le impostazioni): una volta sola, con un avviso |
| M8 | Dopo lo spegnimento **nessun percorso nell'app crea uno scenario senza registrare**. Va bene? | si' / un "Nuovo scenario" guidato | **Si'.** E' la tesi del progetto (dimostrare, non scrivere). Chi sa Gherkin ha VS Code e l'estensione |
| M9 | **`step-enums.json`** e la documentazione degli enum: si cancellano ora o dopo? | ora / tenere il file per ora | **Tenerlo per ora, segnato come senza lettori**: e' un file di dati nel repository e costa niente; si decide col prossimo giro di pulizia |
| M10 | Il **giro delle proposte** (ramo `catalog` su GitHub, `step-proposals.json`) resta in piedi senza interfaccia, o si chiude? | si lascia com'e' / si chiude il ramo e si documenta il solo percorso `@wanted` nel catalogo | **Si lascia com'e'** finche' il rituale (Q5, Q9, Q10 in `docs/OVERVIEW.md`) non decide dove vivono le proposte: chiuderlo ora e' decidere al posto suo |
