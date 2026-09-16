# Lezioni gia' pagate

Ogni voce e' una trappola in cui questo progetto e' gia' caduto: la regola, il perche',
cosa e' successo. Leggerle costa due minuti; ricaderci e' costato ore.

## Riga di comando

**Una regola smentita dagli esempi perde.** "Mai un'opzione con i trattini dopo
`npm run x --`" stava scritta qui, dopo quattro esecuzioni sbagliate senza errore
(`--space`, `--root`, `--pause`, `--nome`: una misura sulla pagina sbagliata, un
file sovrascritto). Ma una trentina di esempi, nei documenti e nei messaggi degli
script, usavano proprio quella forma — e alla prima prova Kiro ha suggerito
`--scope` cosi'. Ora la regola sui comandi sta in `metodo-di-lavoro.md`, sempre
attiva; le opzioni si leggono da `lib/args.ts` anche in forma nuda (`scope=main`);
e `check:args` fallisce su un esempio sbagliato. Quando una regola conta, gli
esempi li controlla una macchina.

**Uno script dice cosa sta per fare prima di farlo.** Pausa, scope, viewport stampati
sopra ai risultati: un flag perso diventa visibile invece che deducibile dai numeri.

## Codice iniettato nel browser

**Niente backtick dentro `DOM_PROBE_SOURCE` e `RECORDER_OVERLAY_SOURCE`.** Sono
stringhe `String.raw`: un backtick, anche in un commento, chiude il template. E'
successo tre volte. `tsc` lo prende subito — lancialo.

**`describe()` accetta solo controlli; per le verifiche serve `describeAny()`.**
Finche' la modalita' Verifica passava da `closestInteractive`, un titolo o un
messaggio di conferma non erano indicabili: il click cadeva nel vuoto senza
spiegazioni. La prima sessione vera e' uscita con zero verifiche anche per questo.

## File e nomi

**Il nome di un file generato viene da cio' che si e' misurato, non da cio' che si e'
chiesto.** Due scansioni partite dallo stesso `/login` sono finite su pagine diverse,
salvate con lo stesso nome: la seconda ha cancellato la prima, e con lei il dato
migliore della giornata. Non fallisce — cancella.

**`page.url()` e' la verita' dopo un reindirizzamento.** L'URL di ogni gesto lo
stampiglia Node leggendo `page.url()`, non la pagina dichiarandolo.

**Un nome che comincia con una cifra non e' un identificatore.** Un badge "1"
produceva `1Button`. `toCamelCase` mette un prefisso.

**Un file che non porta il marcatore `generato-da: bdd-generate` non si riscrive.**
Togliere il marcatore significa "questo file adesso e' mio".

## Misure

**Mai leggere un numero dalla prosa di uno strumento.** Il conteggio dei passi senza
glue, preso con un'espressione regolare dal riassunto di Cucumber, dava 92 invece di
0: contava anche il resto del repository. Si legge l'output strutturato (il flusso di
messaggi) e si risale alla sorgente di ogni dato.

**Due classi di prove non si sommano.** L'ancoraggio al componente (role+name) e'
identita'; la somiglianza fra frasi e' una stima. Sommarle con dei pesi prima puniva
gli step senza `components` per un campo non compilato, poi — normalizzando — faceva
vincere un candidato con un solo segnale debole. Si ordinano in due classi separate.

**Un avviso che sbaglia insegna a ignorare gli avvisi.** Numeri di telefono e URL
giudicati "instabili", un avviso di reindirizzamento identico con e senza `--pause`:
ogni falso allarme rende inutile quello vero. Si corregge il motivo, non si silenzia.

**Il confronto con e senza regole richiede il modello fissato.** Kiro su "Auto"
sceglie il modello per tipo di richiesta: due esecuzioni con modelli diversi misurano
i modelli, non le regole. E l'esecuzione "senza regole" va fatta nell'arena
(`npm run arena`), mai qui: l'assistente carica da solo le regole del repository.

## Generazione

**Fra Page Object generate, niente return-value chaining.** Due pagine che si
raggiungono a vicenda si importerebbero a vicenda, e con CommonJS uno dei due
`require` torna vuoto: costruttore `undefined` a runtime. La transizione avviene
nella glue.

**Un segmento numerico nel percorso e' un id o un passo?** `/orders/123` e' un id;
`/questions/3` di un questionario e' un passo, con componenti suoi. Dall'esterno non
si distingue: il generatore lo dichiara, non indovina.

**Un percorso che cambia dominio non si risolve con un solo `baseURL`.** Dichiarato
come buco finche' non si decide come gestirlo (task 3 del piano).

**Il dizionario preso durante la registrazione batte quello preso a freddo.** Una
pagina scansionata a parte puo' mostrare uno stato diverso da quello attraversato.
Gli inventari della stessa pagina si **fondono**: un modale aperto a meta' sessione
mostra componenti che dopo non ci sono piu', e sono proprio quelli toccati.

## Registrazione

**Chi esegue un test sta eseguendo un test.** Chiedergli di dichiarare i confini
durante l'esecuzione non funziona: la prima sessione vera ha prodotto 38 gesti e zero
confini. I passi si nominano **alla fine**; nella barra resta solo Verifica, che vuole
l'elemento sullo schermo.

**Le password non si registrano, mai.** Il valore diventa `<password>`, che non e' un
segnaposto da riempire: e' la prova che non l'abbiamo mai avuto. Nel codice generato
viene da `.env`.

## Ambiente

**`npm install` non scarica i browser.** `lib/browser.ts` prova Chromium, poi Chrome,
poi Edge, e dice quale ha usato. Mai cambiare browser in silenzio.

**Windows: la giunzione `node_modules` dell'arena si sgancia prima di cancellare.** E
una shell rimasta dentro una cartella la tiene occupata.

**I fine riga non sono contenuto.** Su una macchina Windows appena clonata
`rules:check` dichiarava disallineate tutte e nove le regole: git converte LF in CRLF
quando scrive i file, e il confronto era byte a byte. Nessuno aveva toccato niente.
Chi confronta due testi che possono venire da un checkout usa `stessoTesto` di
`lib/eol.ts`. Il danno di un avviso cosi' non e' il messaggio: e' che insegna a
ignorare gli avvisi.

## Dove vive la logica condivisa

Non duplicarla: importala.

| Cosa | Dove |
|---|---|
| Tipi di registrazione, dizionario, catalogo, buchi | `scripts/lib/generation-contract.ts` |
| Come si descrive un elemento del DOM | `scripts/lib/dom-probe.ts` |
| Come si inventaria una pagina | `scripts/lib/inventory.ts` |
| Nomi di metodi, campi, locator | `scripts/lib/component-naming.ts` |
| Giudizio di stabilita' di un nome | `scripts/lib/stability.ts` |
| Identita' di una pagina, aggancio, candidati | `scripts/lib/generate-core.ts` |
| Confini proposti fra i passi | `scripts/lib/labelling.ts` |
| Avvio del browser | `scripts/lib/browser.ts` |
| Lettura delle opzioni da riga di comando | `scripts/lib/args.ts` |
| Confronto fra testi con fine riga diversi | `scripts/lib/eol.ts` |
