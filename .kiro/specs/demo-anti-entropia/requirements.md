# Requisiti — Demo anti-entropia

Metodo: **Specification by Demonstration**. Un tester esperto di business esegue il
test a mano; la sessione viene registrata; da li' si derivano scenario Gherkin e codice
di automazione, pescando il linguaggio da un catalogo condiviso.

Requisiti in notazione EARS: QUANDO <evento> IL SISTEMA DEVE <comportamento>; SE
<condizione> ALLORA IL SISTEMA DEVE <comportamento>. Lo stato di ciascuno e' in
`tasks.md`; il perche' di ogni scelta in `docs/anti-entropy/README.md`.

## Vincoli, non negoziabili

- **V1 — Zero costi.** Nessuno strumento a pagamento oltre a quelli gia' in azienda.
- **V2 — Facile.** Un comando per azione; ogni errore dice come si risolve.
- **V3 — Alla portata dei tester manuali.** Per contribuire non serve saper scrivere
  Gherkin ne' codice.
- **V4 — Provabile subito.** Ogni affermazione sulla riduzione dell'entropia e' un
  numero rifacibile da chiunque.
- **V5 — Nessun dato aziendale nel repository**, che e' pubblico.

---

### R1 — Misurare l'entropia di partenza

**Storia:** come senior, voglio sapere quanto e' grave il problema, con un numero.

1. QUANDO si analizza il corpus dei casi di test IL SISTEMA DEVE riportare il reuse
   ratio (passi distinti / passi totali) per area.
2. QUANDO si raggruppano le varianti IL SISTEMA DEVE indicare quanti step canonici
   coprirebbero quale quota del corpus.
3. IL SISTEMA DEVE produrre queste misure senza portare le frasi reali fuori dalla
   macchina che le ha lette.

### R2 — Registrare una sessione manuale

**Storia:** come tester manuale, voglio fare il mio test come sempre e ottenere uno
scenario, senza imparare niente di nuovo.

1. QUANDO il tester interagisce con l'applicazione IL SISTEMA DEVE registrare ogni click
   e ogni campo compilato come ruolo + nome accessibile, senza richiedere pulsanti.
2. QUANDO il tester preme "Verifica" e indica un elemento IL SISTEMA DEVE registrarlo
   come asserzione, **anche se l'elemento non e' interattivo** (titolo, messaggio,
   totale).
3. SE nel punto cliccato non c'e' niente da indicare ALLORA IL SISTEMA DEVE restare in
   modalita' verifica.
4. QUANDO la registrazione termina con gesti non etichettati IL SISTEMA DEVE proporre i
   confini fra i passi dove cambia l'identita' della pagina, e chiedere un nome per
   ciascuno, con la possibilita' di unire un passo al precedente.
5. QUANDO una pagina si assesta durante la registrazione IL SISTEMA DEVE inventariarne i
   componenti, fondendo gli inventari successivi della stessa pagina.
6. SE un campo e' di tipo password ALLORA IL SISTEMA NON DEVE registrarne il valore.
7. QUANDO la registrazione parte IL SISTEMA DEVE dire se la barra si e' montata.

### R3 — Generare codice che compila senza AI

**Storia:** come SDET, voglio Page Object e step pronti, senza doverli scrivere.

1. QUANDO si genera da una registrazione IL SISTEMA DEVE produrre feature, Page Object e
   step definition che passano `tsc` senza che nessun modello abbia scritto codice.
2. IL SISTEMA DEVE usare come frasi Gherkin le etichette date dal tester.
3. SE un componente toccato non e' nel dizionario ALLORA IL SISTEMA DEVE sintetizzarne
   il locator e dichiararlo come buco.
4. SE il percorso attraversa piu' domini, o piu' indirizzi distinti finiscono sulla
   stessa Page Object, ALLORA IL SISTEMA DEVE dichiararlo come buco.
5. IL SISTEMA NON DEVE sovrascrivere un file che non porta il marcatore di generazione.
6. IL SISTEMA NON DEVE scrivere selettori nelle step definition.

### R4 — L'assistente porta le frasi nel vocabolario condiviso

**Storia:** come chi mantiene il catalogo, voglio che uno scenario nuovo riusi gli step
esistenti invece di inventarne di simili.

1. QUANDO si prepara il compito per l'assistente IL SISTEMA DEVE elencare per ogni passo
   i candidati di catalogo: prima quelli ancorati agli stessi componenti, poi quelli con
   formulazione simile, in due classi mai sommate.
2. SE uno step di catalogo dichiara componenti disgiunti da quelli toccati ALLORA IL
   SISTEMA NON DEVE proporlo.
3. QUANDO l'assistente ha finito IL SISTEMA DEVE poter verificare il suo lavoro con
   giudici deterministici: `tsc`, dry-run di Cucumber, validatore degli step.

### R5 — Una sessione in un comando

**Storia:** come tester, voglio lanciare un comando solo e ottenere dizionario,
scenario, codice e controlli, invece di cinque comandi da ricordare in ordine.

1. QUANDO il tester lancia il comando di sessione su un bersaglio IL SISTEMA DEVE
   registrare, inventariare, far nominare i passi, verificare la mappa, generare,
   verificare la conformita' e produrre il referto, in quest'ordine.
2. QUANDO la verifica di mappa trova che le Page Object esistenti coprono tutti i
   componenti necessari IL SISTEMA DEVE riusarle senza rigenerarle.
3. SE mancano componenti ALLORA IL SISTEMA DEVE aggiungere solo quelli mancanti e
   dichiarare quali.
4. IL SISTEMA NON DEVE rimuovere metodi esistenti da una Page Object.
5. QUANDO la conformita' e' verificata IL SISTEMA DEVE riportare quanti passi sono gia'
   nel catalogo, quanti sono nuovi, e la conformita' media.
6. SE un passo intermedio fallisce ALLORA IL SISTEMA DEVE fermarsi dicendo quale e come
   si riprende, senza perdere la registrazione gia' salvata.

### R6 — Misurare se le regole servono

**Storia:** come chi presenta, voglio rispondere con una tabella alla domanda "ma basta
chiedere all'AI?".

1. IL SISTEMA DEVE misurare ogni esecuzione con: compila, passi senza glue, step nuovi,
   riuso, conformita', selettori negli step, locator non nel dizionario.
2. QUANDO si misura l'esecuzione senza regole IL SISTEMA DEVE farlo in un progetto
   separato che non contiene regole ne' catalogo.
3. IL SISTEMA DEVE ricordare di fissare il modello prima di un confronto.

### R7 — Portare fuori i numeri, mai i dati

1. QUANDO si produce un referto IL SISTEMA DEVE includere solo numeri calcolati ed
   etichette scritte nel proprio sorgente, mai stringhe lette dai dati.
2. IL SISTEMA DEVE mantenere gitignorati registrazioni, dizionari e sessioni.

### R8 — Test verde sull'applicazione vera

**Storia:** come chi presenta, voglio mostrare uno scenario nato da un test manuale che
gira verde.

1. QUANDO si lancia `npm run test:bersaglio <bersaglio>` IL SISTEMA DEVE eseguire lo
   scenario generato, gia' autenticato con la sessione salvata, in qualunque shell.
2. SE l'assistente non e' disponibile ALLORA lo scenario deterministico DEVE girare
   comunque.

### R9 — Accessibilita' come sottoprodotto

1. QUANDO si inventaria una pagina IL SISTEMA DEVE riportare l'indice di accessibilita'
   e i componenti senza nome, ambigui o instabili, ciascuno con il motivo giusto.
2. SE il nome accessibile e' un URL o un numero di telefono ALLORA IL SISTEMA NON DEVE
   giudicarlo instabile per un motivo sbagliato.
