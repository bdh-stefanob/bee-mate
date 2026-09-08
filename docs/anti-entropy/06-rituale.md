# 06 — Il rituale di consolidamento del linguaggio

> Il modello adottato accetta che ognuno scriva la propria variante e le fa
> convergere **a valle**. Questo funziona solo se qualcuno, periodicamente,
> sceglie. Senza un momento fissato, "a tempo debito" diventa mai — e il sistema
> smette di ridurre l'entropia: la accumula in modo ordinato.
>
> Questo documento definisce quel momento, e lo tiene deliberatamente piccolo.

---

## In una riga

**Ogni mese, 15 minuti, 2-3 persone: si confermano le formulazioni canoniche e
si applica il refactor.**

Tutto il resto avviene **prima e in asincrono**.

---

## Il vincolo che detta il disegno

Quindici minuti non bastano a discutere. Bastano a **chiudere**.

Questo non e' una limitazione da subire: e' cio' che rende il rituale
sostenibile. Una riunione di un'ora si salta, si rimanda, muore entro tre mesi.
Una da un quarto d'ora si fa anche quando la settimana e' storta.

La conseguenza e' che il grosso del lavoro si sposta prima:

```
   -3 giorni     la coda viene pubblicata e notificata
   -3 → 0 gg     chiunque commenta, obietta, approva in asincrono
   0             15 minuti: si chiude solo cio' che e' rimasto contestato
   +0            refactor applicato, catalogo ripubblicato, numero registrato
```

**Chi non partecipa alla riunione partecipa comunque**, perche' la finestra
asincrona e' aperta a tutti. E' piu' inclusivo di una riunione lunga a cui
mezzo team non e' invitato.

---

## Come si chiama

**Consolidamento del linguaggio.** Non "riunione del catalogo": il catalogo e'
lo strumento, il linguaggio condiviso e' l'obiettivo. La differenza determina
di cosa si parla quando si e' seduti.

---

## Dove si mette

**Dentro una riunione ricorrente che esiste gia'** — tipicamente il punto
tecnico periodico del QA — occupandone gli ultimi 15 minuti una volta al mese.

Non va proposto come cerimonia nuova. *"Un'altra riunione"* e' l'obiezione che
uccide piu' rituali di qualunque difetto di merito, e per un quarto d'ora al
mese sarebbe pure fondata.

**Cadenza mensile.** A sprint la coda e' quasi vuota e la riunione diventa
inutile, quindi salta, quindi muore. A trimestre la coda e' ingestibile in
quindici minuti e il refactor arretrato diventa invasivo.

---

## Chi c'e'

| Ruolo | Note |
|---|---|
| **Gatekeeper del catalogo** | conduce, e ha l'ultima parola sui pareggi |
| **Un tester di un'area, a rotazione** | il posto e' uno, ma **ruota** fra le aree |
| *(al bisogno)* chi sviluppa | solo quando emergono componenti senza nome accessibile |

**Due o tre persone. Mai di piu'.** Con quattro non si chiude in quindici
minuti: si discute.

**La rotazione non e' un dettaglio.** Con un solo posto oltre al gatekeeper, se
partecipasse sempre la stessa area si eleggerebbe il suo gergo e le altre non
lo adotterebbero. La rappresentanza trasversale, che in una riunione grande si
ottiene con le presenze, qui si ottiene con il turno — e va tenuta scritta.

---

## Cosa succede prima (e' qui che si decide quasi tutto)

Lo strumento pubblica la coda **tre giorni prima**, divisa in due:

- **Vincitore netto** — un gruppo dove una formulazione stacca chiaramente le
  altre. Si approva in asincrono. Silenzio = assenso.
- **Pareggio** — due formulazioni si equivalgono. Chiunque puo' esprimersi in
  asincrono; se emerge un consenso, si chiude senza arrivare in riunione.

**In riunione arriva solo cio' che e' rimasto contestato dopo la finestra
asincrona.** In condizioni normali sono due o tre gruppi, non venti.

Un tetto rigido: **massimo 5 gruppi discussi**. Se ne restano di piu', si
prendono quelli con piu' occorrenze — consolidare cio' che e' scritto piu'
spesso rende di piu' — e il resto slitta al mese successivo.

Se la coda non e' stata pubblicata in tempo, **la seduta si annulla**.
Discutere a freddo formulazioni viste per la prima volta produce decisioni
peggiori di nessuna decisione.

---

## I quindici minuti

| Min | Cosa |
|---|---|
| 0-3 | **La metrica.** Reuse ratio del mese, confronto col precedente, per area |
| 3-5 | **Conferma** di quanto gia' approvato in asincrono |
| 5-12 | **I gruppi contestati** — al massimo 5 |
| 12-15 | **Refactor**: cosa si applica ora, chi verifica il diff |

Il primo punto non e' cerimoniale. Il modello scelto fa **crescere l'entropia
prima di farla calare**: aprire con il numero e' l'unico modo per accorgersi in
tempo se sta soltanto crescendo.

---

## Come si decide

1. Lo strumento propone, **con il punteggio in chiaro** — occorrenze, aree
   distinte, conformita', aggancio ai componenti.
2. Chi e' seduto puo' ribaltare la proposta. Non serve una maggioranza: serve
   un motivo.
3. **In caso di stallo decide il gatekeeper, seduta stante.** Rimandare un
   pareggio al mese dopo e' gia' una decisione: quella di non convergere.
4. La formulazione scelta diventa **Gold**; le altre restano registrate come
   varianti note — non si buttano, servono al validatore per suggerire la
   sostituzione a chi le riscrive.

**Nessuno viene nominato.** L'attribuzione delle varianti e' per area, mai per
persona. Un report che dice "Tizio ha introdotto quattro varianti" trasforma
uno strumento di supporto in uno di valutazione, e da quel momento non lo vuole
piu' nessuno in casa.

---

## Chi risolve cosa

Le colonne della matrice **non le giudica la stessa persona**:

| Criterio | Chi e' qualificato |
|---|---|
| Occorrenze, aree distinte | **nessuno** — e' un dato, non un'opinione |
| Quale frase dice meglio la cosa | **QA / esperto di dominio** |
| Parametrizzazione, aggancio ai componenti, implementabilita' | **SDET** |

Con due o tre posti e un quarto d'ora, la conseguenza e' che lo strumento deve
dichiarare **di che giudizio ha bisogno ciascun gruppo**:

```
Gruppo 7 · 3 varianti · 22 occorrenze · giudizio: LINGUAGGIO
Gruppo 9 · 2 varianti ·  8 occorrenze · giudizio: TECNICO
```

Cosi' l'SDET viene coinvolto quando serve, invece di tenere due persone sedute
per decisioni che ne riguardano una sola. Un gruppo e' TECNICO quando la scelta
dipende da parametrizzazione o da quali componenti tocca; e' LINGUAGGIO quando
le varianti sono equivalenti sul piano tecnico e cambia solo come si dice.

## Come si decide, in concreto

### Il principio: il costo non e' decidere, e' registrare

Leggere venti proposte e obiettarne due si fa in cinque minuti. Compilare venti
righe di decisione con una sintassi da ricordare, no — e la seconda volta la
riunione si salta.

Quindi: **si scrive solo per dissentire.** Lasciare in bianco significa
approvato.

### Cosa vede chi decide

Una proposta, un motivo, un esempio. Nient'altro.

```markdown
## Gruppo 12 · 22 occorrenze · 2 aree

  PROPOSTA   usare due step che esistono gia', invece di crearne uno nuovo
             "the user confirms the order" + "the user pays"

  PERCHE'    i componenti toccati coincidono esattamente con quei due step

  ESEMPIO    dentro lo scenario "Acquisto con carta salvata"

  NON SONO D'ACCORDO — perche': ______________________
```

### Quando qualcuno dissente

Solo allora compaiono le alternative, e **solo quelle sensate per quel gruppo**:

```
  Cosa preferisci?
    - un'altra fra queste     [1] …  [2] …
    - una frase diversa:      ______________________
    - non sono la stessa cosa, vanno separate
    - rimandiamo al mese prossimo
```

Chi non dissente non vede mai queste opzioni e non ha bisogno di conoscerle.
Chi dissente le trova nel momento in cui servono.

### La tassonomia sta nello strumento, non nella testa delle persone

Dietro le quinte lo strumento distingue sei esiti — eleggi, scrivi,
parametrizza, scomponi, spezza, rinvia — e sceglie da solo quale proporre, in
base a segnali meccanici. **Nessuno deve impararli.** Sono il modo in cui lo
strumento ragiona, non il vocabolario con cui si risponde.

| # | Domanda che si pone lo strumento | Segnale automatico | Cosa propone |
|---|---|---|---|
| 1 | E' davvero una sola intenzione? | le varianti toccano **componenti diversi** | separare |
| 2 | E' una composizione di step esistenti? | i suoi componenti sono l'**unione** di quelli di 2+ voci a catalogo | usare quelli, senza aggiungerne |
| 3 | Le varianti differiscono solo per un valore? | stessa impronta, parametri diversi | una forma parametrica |
| 4 | Altrimenti | la matrice a punteggio | la variante col punteggio piu' alto |

**La domanda 2 e' quella che ripaga il campo `components`.** Se una variante
viene trattata come nuova, il catalogo cresce; se si riconosce che e' la somma
di due voci esistenti, il catalogo **non cresce** e quello scenario si riscrive
con step che ci sono gia'. Ed e' un confronto fra insiemi, non un'inferenza
semantica.

**La domanda 1 usa i componenti come controllo sul clustering.** Due varianti
fuse perche' le parole si somigliano, ma che toccano componenti disgiunti,
quasi certamente non sono lo stesso intento: un secondo parere indipendente,
uno guarda le parole e l'altro cosa viene toccato sullo schermo.

### Il rischio del silenzio, e come si copre

"Silenzio = consenso" puo' voler dire "nessuno ha letto". Tre difese:

- la finestra asincrona dura tre giorni: chi vuole legge con calma;
- in riunione la conferma in blocco e' **esplicita a voce**, non implicita;
- il registro annota chi c'era: la decisione ha dei nomi dietro.

Se nonostante tutto nessuno legge mai, non e' un problema di formato — e' che
il rituale non serve a nessuno, e va saputo invece che mascherato.

## Cosa esce (definizione di fatto)

La seduta e' conclusa quando:

- ogni gruppo in coda ha una Gold eletta **oppure** un rinvio con un motivo scritto;
- il catalogo aggiornato e' rigenerato e ripubblicato;
- il refactor delle occorrenze e' **applicato, o programmato con una data e un nome**;
- il numero del mese e' registrato, cosi' la serie storica resta continua.

Un consolidamento che elegge le Gold ma non applica il refactor **non ha
prodotto niente**: le occorrenze vecchie restano dove sono, e il mese dopo la
coda e' identica. E' il modo piu' comune in cui questi rituali diventano
teatro.

---

## Come muore, e come evitarlo

| Sintomo | Causa | Rimedio |
|---|---|---|
| Salta due volte di fila | Nessun esito visibile | Mostrare il diff del refactor: si vede che qualcosa e' cambiato |
| Sfora i 15 minuti | Troppi gruppi contestati | Tetto rigido a 5. Il resto slitta, non si allunga |
| Decide sempre la stessa area | Rotazione non rispettata | Il turno va scritto, non ricordato |
| La coda arriva il giorno stesso | Manca la preparazione | Si annulla. Senza eccezioni |
| Le Gold vengono ignorate scrivendo | Nessun rinforzo | Il validatore passa da avviso a blocco: sono le due fasi qui sotto |

---

## Le due fasi

Il rituale cambia natura man mano che il catalogo matura.

**Adozione** — il validatore avvisa e non blocca (`STEP_VALIDATION_MODE=warn`).
Il consolidamento e' l'unico meccanismo di convergenza, e le sedute sono dense:
molti gruppi nuovi ogni mese, molta approvazione asincrona.

**Regime** — il catalogo copre la maggior parte di cio' che si scrive e il
validatore blocca, suggerendo la Gold. Il consolidamento diventa raro e breve:
si occupa solo di cio' che e' davvero nuovo.

Il passaggio fra le due **non e' una data, e' un numero**: quando la copertura
del catalogo si stabilizza e i gruppi nuovi per seduta calano sotto una
manciata, bloccare non e' piu' punitivo — e' ricordare una convenzione che il
team ha gia' adottato.

---

## Come si esegue, in pratica

> Interfaccia degli strumenti che servono al rituale. Quelli marcati *(in
> costruzione)* non esistono ancora: la loro forma e' definita qui perche' e' il
> processo a dettare lo strumento, non il contrario.

### Tre giorni prima — chi prepara la coda

```bash
# 1. Rilegge il corpus dalla sorgente (una volta per ramo, o sull'intero spazio)
npm run confluence:fetch -- <ID-del-ramo>

# 2. Confronta col catalogo corrente ed elegge le Gold candidate   (in costruzione)
npx ts-node scripts/catalog-sync.ts --in reports/confluence-export/<file>.json

#    Produce:
#      reports/catalog-sync/proposals.json   completo, con le frasi reali → NON esce dalla macchina
#      reports/catalog-sync/queue.md         coda di approvazione, leggibile
#      reports/catalog-sync/report.md        variazione dal giro precedente, per area

# 3. Pubblica la coda dove il team la vede, e notifica              (in costruzione)
npx ts-node scripts/catalog-sync.ts --publish
```

**Cosa esce dalla macchina e cosa no.** `proposals.json` contiene le frasi vere
del corpus: resta sotto `reports/`, che e' gitignorato. `queue.md` e
`report.md` sono pensati per essere condivisi, ma vanno **riletti prima**: e'
una scelta di chi prepara, non un automatismo.

### Durante i quindici minuti

Serve solo `queue.md` a schermo. Nessuno deve lanciare comandi in riunione.

### Subito dopo — chi chiude

```bash
# 4. Registra le decisioni (Gold elette, rinvii con motivo)          (in costruzione)
npx ts-node scripts/catalog-apply.ts --decisions <file-decisioni>

# 5. Riscrive TUTTE le occorrenze delle varianti sulla Gold          (in costruzione)
npx ts-node scripts/catalog-refactor.ts --preview     # obbligatorio: mostra il diff
npx ts-node scripts/catalog-refactor.ts --apply       # solo dopo aver guardato

# 6. Rigenera e ripubblica il catalogo
npm run catalog
```

**Il passo 5 non ha una modalita' automatica, e non l'avra'.** Riscrivere in
blocco decine di scenari e' l'operazione piu' pericolosa dell'intero sistema:
se va storta una volta, brucia la fiducia nell'iniziativa in modo definitivo.
L'anteprima con il diff e' obbligatoria e non aggirabile.

### Dove vive tutto: la struttura in Confluence

Il rituale e i suoi materiali stanno dove sta il team, accanto al catalogo:

```
Consolidamento del linguaggio          pagina madre, stabile, con i collegamenti
├── Catalogo degli step                generato, sovrascritto a ogni ciclo
├── Coda — 2026-09                     UNA PAGINA PER SEDUTA
├── Coda — 2026-10
└── Registro dei consolidamenti        proiezione dello storico
```

**Una pagina per seduta, non una riscritta ogni mese.** L'approvazione
asincrona avviene nei **commenti** di Confluence, e i commenti restano
attaccati alla pagina. Sovrascrivendo sempre la stessa, la discussione di
settembre resterebbe appesa a un contenuto diventato nel frattempo quello di
ottobre: illeggibile fra tre mesi, quando qualcuno chiedera' perche' era stata
scelta una certa formulazione. Con una pagina per ciclo, ogni seduta conserva
la sua discussione accanto alla sua coda.

**Cosa e' generato e cosa no.** Catalogo, code e registro sono **proiezioni**:
si rigenerano e si sovrascrivono, quindi non vanno modificati a mano — le
modifiche andrebbero perse al ciclo successivo. Il posto dove intervenire sono
i commenti, che il rigeneratore non tocca.

**La serie storica delle metriche NON vive qui.** La fonte e' un file
versionato nel repository: sono soli aggregati, nessuna frase reale, quindi e'
sicuro committarli — e sopravvivono al cambio di macchina, alla cancellazione
accidentale di una pagina e a chi la "sistema" a mano. La tabella su Confluence
ne e' solo la resa. Se la storia vivesse solo li', basterebbe una modifica
ben intenzionata per perdere il dato su cui poggia l'intera dimostrazione.

### Regola di sicurezza sulla scrittura

Lo strumento scrive **solo su pagine che ha creato lui**, riconoscibili da un
marcatore nel corpo. Puntato a una pagina che non lo porta, **si rifiuta di
scrivere e si ferma**.

Serve contro l'errore banale e irreversibile: un id copiato male e il tool
sovrascrive i casi di test di qualcun altro. Una volta sola basta a chiudere
l'iniziativa, a prescindere da quanto funzioni tutto il resto.

### Il registro delle sedute

Ogni consolidamento lascia una riga in una tabella, sulla stessa pagina del
catalogo:

| Data | Presenti | Gruppi chiusi | Rinviati | Reuse ratio | Δ |
|---|---|---|---|---|---|
| _(compilata a ogni seduta)_ | | | | | |

Non e' burocrazia: **e' la serie storica**. Il modello scelto fa crescere
l'entropia prima di farla calare, quindi la singola misura non dice niente e
solo l'andamento distingue "sta convergendo" da "stiamo accumulando". Ed e'
anche l'unica risposta seria alla domanda che i responsabili faranno, cioe' se
la cosa stia funzionando.

### Chi tiene aggiornato questo documento

Il gatekeeper. Quando il rituale cambia — cadenza, tetto dei gruppi, criteri
della matrice — si cambia qui prima di cambiarlo nella pratica. Un processo
che diverge dalla sua descrizione smette di essere un processo e torna a
essere un'abitudine di chi lo conduce.
