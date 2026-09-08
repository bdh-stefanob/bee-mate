---
inclusion: fileMatch
fileMatchPattern: 'src/**'
---

# Da una sessione registrata a uno scenario eseguibile

Questa regola vale quando esiste una registrazione sotto `reports/recordings/` e
un dizionario sotto `reports/scout/`, e si tratta di produrre feature, Page
Object e step definition.

## Prima cosa da sapere: quasi tutto è già scritto

Il generatore (`npm run generate`) ha già prodotto, in modo deterministico:

- lo **scheletro** delle Page Object, con `path` e `assertLoaded()`;
- **un metodo per ogni componente** presente nel dizionario;
- il **glue** delle step definition;
- l'**intestazione** del file `.feature`.

Non riscriverli, non reinventarli, non proporre una struttura diversa. Se una
convenzione non piace, si cambia il modello in `templates/`, non il file
generato: cambiarlo qui significa che alla rigenerazione successiva sparisce.

Restano due cose, e sono le uniche che richiedono giudizio:

1. **la frase Gherkin** di ogni intento;
2. **quali metodi chiamare** per realizzare quell'intento.

## Regola 1 — la frase si sceglie dal catalogo, non si inventa

Per ogni intento il generatore fornisce `candidates`: gli step di catalogo
plausibili, ordinati. Le opzioni sono tre, in quest'ordine:

1. **Un candidato esprime già l'intento** → si usa **con la stessa identica
   formulazione**. Non "quasi": identica. Una quasi-duplicazione è peggio di uno
   step mancante, perché non si trova cercando e si consolida da sola.
2. **Un candidato ci va vicino ma il valore cambia** → si parametrizza
   (`{string}`, `{int}`), e la modifica riguarda lo step esistente, non un
   secondo step accanto.
3. **Nessun candidato regge** → si propone **una** formulazione nuova, taggata
   `@wanted`, e si dice esplicitamente che è nuova. Non si sceglie il candidato
   meno peggio per far quadrare il conto.

La frase descrive **cosa voleva ottenere il tester**, non cosa ha cliccato:

```gherkin
# NO — meccanica UI, fragile, illeggibile per il business
When l'utente clicca su "Add to cart"
And l'utente clicca su "Carrello"

# SÌ — intento
When l'utente aggiunge il prodotto al carrello
```

L'etichetta che il tester ha scritto premendo "Fine intento" è il punto di
partenza migliore: è l'unico dato semantico dell'intera catena che non stiamo
inferendo. Va ripulita, non sostituita con un'interpretazione propria.

## Regola 2 — si chiamano solo metodi che esistono

Nel corpo di uno step si chiamano **esclusivamente** i metodi generati sulle
Page Object. Non si inventa un metodo perché sarebbe comodo, non si scrive un
locator, non si tocca `this.page` direttamente.

Un selettore dentro a una step definition è un errore di layer, sempre.

Se per realizzare l'intento serve un metodo che non c'è, il componente non era
nel dizionario: **dirlo**, e proporre di rifare `npm run scout` sulla pagina
giusta. Non aggirarlo.

## Come si verifica il proprio lavoro

Due comandi, entrambi deterministici. Nessuno dei due è un parere:

```bash
npx tsc --noEmit -p tsconfig.json    # il metodo esiste? il tipo torna?
npm run test:dry                     # ogni step ha una definizione?
npm run validate:steps               # la frase è nel catalogo, o è una variante?
```

Se `tsc` fallisce, un metodo è stato inventato. Se il dry-run fallisce, una
frase Gherkin non ha glue. Vanno risolti prima di dire che è pronto — non
segnalati come "da sistemare".

## Le convenzioni del codice, in breve

Sono già nei modelli: qui stanno solo perché servono a rileggere il risultato.

- Page Object: estende `BasePage`, `page` dal costruttore, **mai singleton**.
- `assertLoaded()` su ogni Page Object, sempre.
- Step definition: `function (this: CustomWorld)`, **mai arrow function**.
- Page Object dichiarate a livello di modulo, inizializzate nello step che
  possiede la transizione — **mai in un hook `Before`**.
- Un metodo che cambia pagina restituisce la Page Object successiva
  (return-value chaining).
- `@intent` obbligatorio su ogni step definition: il catalogo lo legge e lo
  pubblica.

Il nome del World in questo repository è `CustomWorld` (`src/support/world.ts`).
Non scriverlo a memoria: prendilo dall'import che il modello ha già messo.

## Cosa non fare, mai

- **Uno step Gherkin per ogni componente.** La mappatura è asimmetrica:
  componente → metodo è 1:1 e meccanico, intento → step è 1:N e semantico. Da
  venti pagine escono centinaia di step atomici: più entropia di quanta se ne
  toglie.
- **Riempire un buco tacendolo.** Il generatore elenca i propri `gaps`: vanno
  riportati, non colmati a indovinare. Un file che sembra completo e non lo è si
  scopre in esecuzione, e sembra un altro problema.
- **Inventare un dato.** Se il valore di un campo era una password, la
  registrazione riporta `<password>`: non è un segnaposto da riempire, è la
  prova che non l'abbiamo mai avuto. Va preso da `.env`.
