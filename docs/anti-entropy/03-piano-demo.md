# 03 — Sceneggiatura della demo

> **Questo documento decide lo scope, non lo riassume.**
>
> Scritto prima di costruire il resto, di proposito. Con tre settimane a
> disposizione il modo standard di sbagliare e' costruire fino al giorno 13 e
> poi scrivere le slide di corsa. Invece: cio' che e' in scena si costruisce,
> cio' che non c'e' si taglia senza discussione.
>
> Se durante la costruzione emerge qualcosa che vale la pena mostrare, **si
> modifica prima questo file** e poi si costruisce.

---

## La richiesta

**Adottare il metodo**: catalogo condiviso, rituale mensile, misurazione
continua.

Non si chiede budget, non si chiedono persone, non si chiede di approvare
l'automazione UI. Si chiede una convenzione e **quindici minuti al mese di una
persona**.

Registrazione e generazione sono in scena come **prova che la strada scala**,
non come oggetto della richiesta. Se piacciono, la conversazione sull'
automazione si apre da sola — ed e' molto meglio che arrivi da loro.

### La sola cosa che si chiede davvero

> Serve un **proprietario del consolidamento**: una persona, quindici minuti al
> mese.

Va detta esplicitamente, con queste parole, e va messa in fondo come unica
slide di richiesta. Senza proprietario il modello non converge, e tutto il
resto diventa un raccoglitore di varianti molto ben documentato.

E' un ask minuscolo: proprio per questo va isolato, invece di annegarlo in una
lista di cose desiderabili.

---

## Durata e forma

**20 minuti di racconto + 10 di domande.** Non oltre: la parte che convince
sta nei primi otto.

Nessuna installazione richiesta a chi guarda. Nessuna dipendenza da rete
aziendale durante gli atti 1-3.

---

## I cinque atti

### Atto 1 — Il problema, con i vostri numeri (4 min)

Non si racconta che c'e' entropia: si mostra.

| Cosa si mostra | Perche' funziona |
|---|---|
| **Reuse ratio 0,72 e 0,85** su due rami reali | 1,0 = zero riuso. Su uno dei due, 85 passi su 100 sono scritti da zero |
| Il clustering assorbe solo il **14%** della varieta' | Cambia la diagnosi: non e' parafrasi, e' **assenza di vocabolario** |
| **107 step coprirebbero il 57%** di quanto scritto oggi | L'aritmetica e' rifacibile in diretta: 353 gruppi, 107 con >=2 occorrenze, 246 singoletti |
| I casi di test stanno in **due rami scollegati** | Conferma fisica: aree diverse, alberi diversi, nessun punto di verita' |

**La frase da dire:** *"Non state riusando male un vocabolario. Non ne avete
uno."*

E' una tesi piu' difficile da contestare di "avete dei duplicati", perche'
nessuno puo' rispondere "ma noi gia' riusiamo".

> **Rischio:** nessuno. I dati sono su file, l'atto gira offline.

---

### Atto 2 — Il rimedio (4 min)

Il catalogo con gli alias, e **l'app che esiste gia'**.

1. Si apre il catalogo: una voce, la sua forma canonica, **le varianti note**,
   i **componenti di frontend** che tocca.
2. Si apre l'app desktop: si scrive uno scenario, l'autocomplete propone solo
   step del catalogo, uno step sconosciuto si sottolinea.
3. Si scrive una variante nota: il validatore **non dice "non conforme"** —
   dice quale riga usare al suo posto.

**La frase da dire:** *"Un tester scarica un eseguibile e scrive scenari
conformi senza toccare il repository."*

> **Rischio:** basso, gira in locale. Da provare il giorno prima.

---

### Atto 3 — Come resta vivo (4 min)

E' l'atto che risponde alla domanda che faranno di sicuro: *"e fra sei mesi chi
lo aggiorna?"*

1. Si lancia il ciclo: rilegge il corpus, confronta col catalogo, prepara la coda.
2. Si apre la coda: una proposta, un motivo, un esempio, una riga per dissentire.
3. Si mostra il report per area — **mai per persona**, e va detto ad alta voce.
4. Si mostra il rituale: **quindici minuti, una volta al mese, 2-3 persone.**

**La frase da dire:** *"Il catalogo non lo mantiene nessuno: si mantiene."*

> **Rischio:** basso. Gira su un export gia' scaricato.

---

### Atto 4 — Da dove vengono gli scenari (5 min)

Il pezzo che nessuno si aspetta.

1. Un tester esegue **a mano** un flusso, come farebbe comunque.
2. Preme *Fine intento* dopo ogni passo, *Verifica* su cio' che prova la riuscita.
3. Si mostra la traccia: **non selettori**, ma `role` + `name` — lo stesso
   vocabolario del dizionario dei componenti.
4. Si genera lo scenario: gli step vengono **dal catalogo**, non inventati.
5. Il validatore conferma.

**La frase da dire:** *"L'esecuzione manuale e' gia' l'atto di specifica. Chi
conosce il business non deve imparare Gherkin per contribuire."*

**Se arriva l'obiezione** — *"e' record-and-playback, non funziona"* — la
risposta e' pronta: quello produceva script imperativi legati ai selettori; qui
la meccanica la da' la registrazione, **il linguaggio lo da' il catalogo**, e
l'assistente fa solo il ponte senza poter inventare frasi.

> **Rischio: medio.** Dipende da un ambiente e da una sessione dal vivo.
> **Mitigazione: registrazione video di riserva, preparata il giorno prima.**

---

### Atto 5 — Il test verde (3 min)

Lo scenario generato diventa step e Page Object, e il test passa.

**La frase da dire:** *"Da qui in poi e' un consumer del catalogo. Il catalogo
vale anche senza."*

> **Rischio: alto.** Ambiente, rete, tempi.
> **Mitigazione: si taglia.** Vedi sotto.

---

## Cosa si taglia, e in che ordine

Se il tempo stringe o qualcosa non e' pronto, si toglie **da sotto**:

| Ordine | Cosa | Effetto sulla tesi |
|---|---|---|
| 1° | Atto 5 (test verde) | Nessuno: e' la prova che scala, non l'argomento |
| 2° | Atto 4 dal vivo → video | Piccolo: si perde l'effetto, resta il contenuto |
| 3° | Atto 4 intero | Si perde il pezzo originale, la proposta regge lo stesso |

**Gli atti 1-3 non si tagliano mai.** Sono la proposta. Se restano solo quelli,
la presentazione funziona ancora: numeri reali, rimedio concreto, processo che
lo tiene vivo.

E' lo stesso principio dell'architettura: nessun single point of failure.

---

## Preparazione — il giorno prima

- [ ] Gli export e i report sono su disco: **nessun atto 1-3 tocca la rete**
- [ ] L'app desktop si apre e carica il catalogo
- [ ] La registrazione dell'atto 4 e' stata provata **due volte di fila**
- [ ] Il video di riserva dell'atto 4 e' registrato
- [ ] Il test dell'atto 5 e' passato almeno una volta oggi
- [ ] Zoom del browser al 110%, barra del recorder spostata dove non copre
- [ ] Notifiche disattivate

---

## Le domande che faranno, e le risposte

| Domanda | Risposta |
|---|---|
| *"Quanto costa?"* | Zero licenze, zero server. Quindici minuti al mese di una persona |
| *"Chi lo mantiene fra sei mesi?"* | Nessuno: si mantiene. Atto 3 |
| *"E' l'ennesimo tool interno?"* | Non sostituisce Confluence ne' il test management. E' una convenzione piu' un validatore |
| *"L'AI decide al posto nostro?"* | No. L'AI propone, il validatore deterministico giudica. E chi approva vede il punteggio in chiaro e puo' ribaltarlo |
| *"Dobbiamo cambiare come scriviamo?"* | No. Si continua a scrivere come si vuole: la convergenza avviene a valle |
| *"Non e' record-and-playback?"* | Vedi atto 4 |
| *"E i dati sensibili?"* | Fase 1 in sola lettura. Le frasi reali non escono dalla macchina: solo aggregati |
| *"Funziona su tutte le aree?"* | Misurato su due rami reali. Il report e' per area, cosi' si vede dove serve di piu' |

---

## Cosa NON si dice

- **Non si nomina nessuno.** Ne' in slide, ne' a voce. L'attribuzione e' per
  area. Una battuta su chi scrive piu' varianti brucia l'iniziativa in un
  secondo, e non si recupera.
- **Non si promette l'automazione UI.** Non e' l'oggetto della richiesta, e
  prometterla apre una discussione su tempi e persone che sposta l'attenzione
  dalla cosa che si vuole ottenere.
- **Non si nasconde che l'entropia crescera' prima di calare.** Va detto
  nell'atto 3: se lo scoprono dopo, sembra che lo strumento non funzioni.

---

## Cosa deve esistere per andare in scena

Elenco derivato dagli atti. **Quello che non e' qui non si costruisce.**

| # | Serve a | Stato |
|---|---|---|
| 1 | Metriche e report su file — atto 1 | ✅ fatto |
| 2 | Catalogo con alias e componenti — atto 2 | ✅ fatto |
| 3 | Validatore che suggerisce la variante — atto 2 | ✅ fatto |
| 4 | Ciclo del catalogo e coda — atto 3 | ✅ fatto |
| 5 | Recorder — atto 4 | ✅ fatto |
| 6 | Dizionario dei componenti — atto 4 | ✅ fatto |
| 7 | **Catalogo neutro per l'app di prova** | ⬜ mezza giornata |
| 8 | **Mappa componenti ↔ step, sul solo percorso della demo** | ⬜ mezza giornata |
| 9 | **Generazione dello scenario dalla traccia** | ⬜ 1,5 giorni |
| 10 | **Refactor del catalogo** — rende il ciclo utile, non descrittivo | ⬜ 1 giorno |
| 11 | Step + Page Object, esecuzione — atto 5 | ⬜ 1,5 giorni, **tagliabile** |
| 12 | **Le slide** | ⬜ 1,5 giorni |

**Totale: ~6 giorni** senza l'atto 5, ~7,5 con.

Fuori scope, dichiarato: integrazione nell'app, verifiche tipizzate,
generalita' della mappa componenti oltre il percorso della demo.
