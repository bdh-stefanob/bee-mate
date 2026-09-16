# L'assistente: cosa gli diamo, e come misuriamo se serve

> **Il motore e' Kiro**, sia come IDE sia come fornitore del modello a pagamento.
> Amazon Q resta supportato — e la sua CLI resta utile — ma non e' piu' lo
> strumento principale. Tutto cio' che segue vale per entrambi: la sorgente e'
> una sola, le due versioni si generano.

## I tre modi in cui gli si parla, e a cosa servono

| Meccanismo | Kiro | Amazon Q | Quando entra in gioco |
|---|---|---|---|
| **Regole** | `.kiro/steering/*.md` | `.amazonq/rules/*.md` | da sole, secondo l'inclusione |
| **Agenti** | `.kiro/agents/*.json` | `.amazonq/cli-agents/*.json` | quando lo si chiama per nome |
| **Automatismi** | `.kiro/hooks/*.json` | — | a un evento dell'editor |
| **Compito** | `reports/generate/<nome>/brief.md` | idem | una volta per scenario, generato |

Le colonne Kiro sono **generate** da quelle Amazon Q con `npm run rules:sync`.
Due copie scritte a mano divergono in silenzio, ed e' curioso riprodurre qui
dentro il problema di entropia che il progetto esiste per risolvere.

Sono livelli di specificita' crescente, e servono tutti.

Le **regole** sono cio' che non cambia mai: l'architettura a layer, le
convenzioni delle Page Object, il divieto di selettori negli step. Vanno lette
anche da chi non sta generando niente, ed e' giusto che si carichino da sole.

L'**agente** e' il mestiere: quali strumenti puo' usare, cosa non deve fare, come
verifica il proprio lavoro. `bdd-generate` puo' scrivere ed eseguire comandi;
`bdd-authoring` legge soltanto e propone, perche' rivedere uno scenario non deve
poter modificare un file.

Il **compito** e' l'unica parte che cambia a ogni scenario: i candidati di
catalogo per quel passo, i metodi disponibili su quella pagina, i buchi che il
generatore ha dichiarato. E' generato, non scritto a mano — e questo e' il punto:
un prompt scritto a mano non e' riproducibile, non e' confrontabile e non lo puo'
rivedere nessuno.

## Perche' l'agente non e' un prompt piu' lungo

La differenza sta in cosa **non** puo' fare.

`bdd-authoring` dichiara `"tools": ["fs_read"]`: non e' una raccomandazione, e'
un limite. Un assistente che rivede uno scenario e per comodita' lo corregge da
solo toglie a una persona una decisione che era sua. Il limite lo rende
impossibile invece che sconsigliato.

`bdd-generate` puo' scrivere, ma il suo compito e' scritto in modo che il grosso
del lavoro sia gia' fatto: le Page Object esistono, i metodi sono elencati, i
candidati sono cinque. Un modello che sceglie fra cinque opzioni sbaglia in modi
che un compilatore prende. Un modello che compone da zero sbaglia in modi che si
scoprono in produzione.

## L'inclusione: il metodo sempre attivo, la meccanica no

Kiro carica ogni file di steering secondo il suo front-matter, e qui c'e' un modo
di sbagliare che non fa rumore.

La tentazione e' rendere tutto condizionale per risparmiare contesto. Ma la
regola piu' importante che abbiamo — *non inventare frasi, cerca prima nel
catalogo* — serve **proprio quando** qualcuno chiede "scrivimi uno scenario per
il login" senza avere ancora aperto un `.feature`. Legata a `fileMatch` su
`**/*.feature`, in quel momento non sarebbe in contesto, e l'assistente si
comporterebbe esattamente come il problema che stiamo prevenendo.

| File | Inclusione | Perche' |
|---|---|---|
| `product.md` | **always** | le tre regole, in ordine di importanza |
| `bdd-authoring.md` | **always** | il procedimento: cerca, riusa, proponi UNO |
| `step-catalog.md` | **always** | "cerca nel catalogo" e' inutile senza sapere com'e' fatto |
| `automation-layers.md` | fileMatch `src/**/*.ts` | dettaglio tecnico |
| `from-recording.md` | fileMatch `src/**` | serve solo generando |
| `metodo-di-lavoro.md` | **always** | come si lavora qui: il piano, lo stato, cosa non si committa mai |
| `lezioni.md` | fileMatch `**/*.ts` | le trappole gia' pagate, con l'incidente che le ha insegnate |

Circa duecentocinquanta righe sempre attive: il costo di contesto e' modesto, e
copre tutto cio' che serve per decidere **cosa** scrivere. Condizionale solo cio'
che serve a scrivere il **codice**, che senza quei file davanti non serve.

## Gli automatismi (solo Kiro)

`.kiro/hooks/valida-scenari.json` fa scattare due cose da sole:

- salvi un `.feature` → parte `npm run validate:steps`
- salvi un `.steps.ts` → parte `npm run catalog`

Sembra poco ed e' il pezzo che regge il modello nel tempo. Il giudizio
sull'entropia e' **deterministico** e non passa dall'assistente (D6); l'hook
toglie l'ultimo anello umano rimasto, che era *ricordarsi di lanciarlo*. E il
secondo hook fa in modo che chi cerca uno step trovi quello che c'e' davvero e
non quello che c'era.

## L'IDE basta. La CLI e' un di piu'

**Il CLI di Kiro e' un prodotto separato dall'IDE**: averlo installato non
installa l'altro, e sulla macchina aziendale `kiro-cli` puo' semplicemente non
esserci. Non e' un problema, e vale la pena dire perche' prima che sembri tale.

La misura non passa dall'assistente. `npm run benchmark` legge dei file e li
giudica con `tsc`, il dry-run di Cucumber e il validatore: gli stessi file
misurati danno gli stessi numeri, che ci sia arrivato uno script o una persona
che incolla un compito in chat. **Il CLI cambia come si guida la generazione,
non cosa si misura.**

| | Con la CLI | Solo IDE |
|---|---|---|
| I numeri del confronto | uguali | uguali |
| Rifare la stessa esecuzione fra un mese | uno script | il compito e' su disco, si reincolla |
| Metterlo in CI | si' | no |
| Serve alla dimostrazione | no | — |

Quindi: si parte dall'IDE. Il CLI si installa se e quando serve
(`curl -fsSL https://cli.kiro.dev/install | bash`) — e su una macchina gestita
quella riga si concorda con chi la gestisce, non si lancia e basta.

## Da verificare sulla macchina aziendale (cinque minuti)

Formati presi dalla documentazione, non da un'installazione:

```powershell
# C'e' gia' qualcosa sul PATH?
Get-Command kiro-cli, kiro, q -ErrorAction SilentlyContinue

# Gli agenti ci sono, e da dove li prende?
kiro-cli agent list

# L'automatismo: l'hook sta DENTRO l'agente che scrive (postToolUse su fs_write).
# Non esiste un evento "salvataggio file": vedi F25.
# In Kiro (IDE): il selettore di agente c'e' nella barra della chat?
```

Se un campo non combacia, si correggono i JSON sorgente in
`.amazonq/cli-agents/` e si rilancia `npm run rules:sync`. Le regole non
c'entrano e continuano a funzionare comunque.

## Il confronto

La domanda arrivera' in questa forma: *"ma tutto questo impianto serve, o basta
chiedere all'assistente?"*. E' una domanda legittima, ed e' meglio arrivarci con
una tabella che con un'opinione.

### La trappola numero uno: il modello non fissato

Kiro sta su **Auto** e sceglie il modello in base al tipo di richiesta. Comodo
per lavorare, **rovinoso per misurare**: due esecuzioni fatte con due modelli
diversi non misurano le regole, misurano i modelli — e guardando i risultati non
si vede.

Prima di qualunque confronto il modello va fissato: dal selettore in chat, o col
campo `model` negli agenti. `npm run rules:sync` lo ripete a ogni esecuzione,
perche' e' la cosa che si dimentica per prima, dato che non fa male finche' non
serve.

### La trappola numero due

Amazon Q carica `.amazonq/rules/` **da solo**. Lanciare il compito non guidato in
questo repository significherebbe misurare "con regole" due volte e chiamarne una
"senza". Nessuno in sala se ne accorgerebbe, ed e' esattamente per questo che non
si fa.

Per questo esiste `npm run arena`: un progetto Playwright + Cucumber che
funziona, senza catalogo, senza regole, senza dizionario, senza modelli.
Volutamente generoso — se l'arena non compilasse per motivi suoi, l'esecuzione
senza regole perderebbe per una ragione che non c'entra con la domanda.

### La procedura

```bash
# 1. Il punto di partenza: generazione deterministica, nessuna AI coinvolta
npm run generate no-rules
npm run benchmark label=deterministico

# 2. Con le regole: l'assistente lavora sul compito vincolato.
#    In IDE — la strada che funziona di sicuro:
#      agente bdd-generate, MODELLO FISSATO (non Auto), e in chat:
#      "leggi reports/generate/<nome>/brief.md e fai quello che dice"
#
#    Se il CLI c'e', la stessa cosa in forma riproducibile:
#      kiro-cli chat --no-interactive --trust-tools=read,write "leggi ... e fai quello che dice"
npm run benchmark label=con-regole

# 3. Senza regole: campo neutro, stessa registrazione, richiesta libera
git stash                  # si riparte dal deterministico
npm run arena brief=reports/generate/<nome>/brief-naive.md
cd reports/arena/senza-regole
#    l'assistente si apre DA QUI DENTRO, senza agente. Prima di dargli il compito
#    chiedigli quali regole ha in contesto: deve rispondere nessuna (task 8)
cd ../../..
npm run benchmark label=senza-regole root=reports/arena/senza-regole

# 4. La tabella
npm run benchmark confronta
```

Il catalogo e il dizionario restano quelli veri anche misurando l'arena: sono il
metro, e il metro non cambia fra una misura e l'altra.

### Cosa aspettarsi, detto prima di saperlo

Vale la pena scriverlo adesso, perche' scriverlo dopo non conta niente.

Mi aspetto che l'esecuzione senza regole **compili** — i modelli su Playwright e
Cucumber sono bravi — e che perda su tre cose: selettori dentro alle step
definition, step nuovi introdotti al posto di quelli esistenti, e locator che
sulla pagina non esistono. Mi aspetto che l'esecuzione con regole vinca sul riuso
e sulle violazioni di layer, e che sul resto la differenza sia piccola.

Se non fosse cosi', la tabella lo direbbe, e sarebbe un risultato lo stesso: il
valore del metodo non e' che l'AI sia guidata, e' che il risultato sia
verificabile. Il generatore deterministico produce un test verde anche se
l'assistente non fa niente.

### Le tre risposte che servono in sala

**"Non basta un buon prompt?"** — Un prompt e' cio' che una persona si ricorda di
scrivere quel giorno. Il compito qui e' generato dai dati: gli stessi candidati,
gli stessi metodi, gli stessi buchi, ogni volta. E si puo' rileggere fra un mese.

**"E se l'AI sbaglia?"** — Se inventa un metodo, `tsc` fallisce. Se scrive una
frase senza glue, il dry-run fallisce. Se introduce una variante, il validatore
la segnala. Non e' fiducia: sono tre giudici che non discutono, e che c'erano
gia'.

**"E se l'AI non e' disponibile?"** — Resta un test verde, scritto con le parole
di chi il test l'ha eseguito. L'assistente porta quelle parole nel vocabolario
condiviso; non le fa esistere.
