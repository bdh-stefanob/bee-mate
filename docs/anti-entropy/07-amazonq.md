# Amazon Q: cosa gli diamo, e come misuriamo se serve

## I tre modi in cui gli si parla, e a cosa servono

| Meccanismo | Dove vive | Quando entra in gioco |
|---|---|---|
| **Regole di progetto** | `.amazonq/rules/*.md` | sempre, da sole, in IDE e in CLI |
| **Agenti** | `.amazonq/cli-agents/*.json` | quando lo si chiama: `q chat --agent bdd-generate` |
| **Compito** | `reports/generate/<nome>/brief.md` | una volta per scenario, generato |

Sono tre livelli di specificita' crescente, e servono tutti e tre.

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

## Da verificare sulla macchina aziendale (due minuti)

Lo schema degli agenti l'ho preso dalla documentazione, non da un'installazione:

```bash
q --version
q agent list                 # vede bdd-generate e bdd-authoring?
q chat --agent bdd-generate  # parte?
```

Dentro a una sessione, `/agent schema` stampa lo schema della versione
installata. Se qualche campo non combacia, sono i due file JSON in
`.amazonq/cli-agents/` da correggere — le regole in `.amazonq/rules/` non
c'entrano e continuano a funzionare comunque.

## Il confronto

La domanda arrivera' in questa forma: *"ma tutto questo impianto serve, o basta
chiedere all'assistente?"*. E' una domanda legittima, ed e' meglio arrivarci con
una tabella che con un'opinione.

### La trappola da evitare

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
npm run generate -- --no-rules
npm run benchmark -- --label deterministico

# 2. Con le regole: Amazon Q lavora sul compito vincolato
q chat --agent bdd-generate
#   > leggi reports/generate/<nome>/brief.md e fai quello che dice
npm run benchmark -- --label con-regole

# 3. Senza regole: campo neutro, stessa registrazione, richiesta libera
git stash                  # si riparte dal deterministico
npm run arena -- --brief reports/generate/<nome>/brief-naive.md
cd reports/arena/senza-regole && q chat     # SENZA --agent, e da qui dentro
cd ../../.. && npm run benchmark -- --label senza-regole --root reports/arena/senza-regole

# 4. La tabella
npm run benchmark -- --confronta
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
