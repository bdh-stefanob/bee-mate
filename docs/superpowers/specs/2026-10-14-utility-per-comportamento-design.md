# Utility per comportamento — design

> Approvata il 2026-10-14. Nasce dalle prime esecuzioni vere sul flusso
> `clinic` (13 e 14 ottobre): uno scenario registrato e generato si fermava sempre
> prima della meta', ogni volta su un comportamento diverso del sito. Questa spec
> dice come le parti difficili del flusso smettono di essere generate clic per
> clic e diventano poche azioni scritte una volta, che ogni scenario riusa.

## Perche' esiste

Il generatore riproduce i gesti registrati. Funziona finche' il sito si comporta
sempre allo stesso modo. Sul flusso Weight Loss di QA non succede:

| Comportamento | Cosa ha mostrato la prova |
|---|---|
| Ordine in sospeso | il dialog «Resume / Start over» c'e' o non c'e' secondo la storia dell'utente |
| Questionario | stesso indirizzo (`/questions/1`), domande diverse fra primo ordine e successivi; campi senza nome |
| Velo di caricamento | la pagina resta sotto la rotellina oltre 30 secondi, a volte |
| Mappa della farmacia | il clic sul pin a volte non viene registrato; un clic normale non lo sceglie |
| Pagamento | carta digitata (primo ordine) o carta salvata (successivi); i campi della carta stanno in iframe di Stripe |
| Foto | quattro foto, con «That's me» facoltativo |
| Esito | il numero dei messaggi e le date cambiano a ogni ordine |

Misura del 14/10: lo scenario «ordine successivo», salvato dal cruscotto, supera
4 passi su 16 dopo le correzioni al generatore. Ogni lancio ha trovato un ostacolo
nuovo, e ognuno e' un comportamento che si ripete in tutti i servizi (Weight
Loss, Jet Lag, Morning After Pill).

Il POC in `uiautomationpwpoc` ha gia' risolto quasi tutti questi comportamenti a
mano, e il suo scenario Jet Lag gira su QA: e' la prova che la strada funziona.

## Le decisioni

| # | Decisione | Perche' |
|---|---|---|
| U1 | **Una utility per comportamento, non per servizio.** | I servizi condividono quasi tutto il flusso; una utility per servizio ripeterebbe la stessa meccanica in piu' posti |
| U2 | **Le utility si scrivono una volta**, partendo dal POC, e una prova su QA le giudica. Non si estraggono dalle registrazioni (per ora). | Il POC le ha gia' rese robuste; le registrazioni contengono troppo rumore per estrarne codice affidabile |
| U3 | **La frase del `.feature` resta quella del tester.** Cambia il corpo dello step: chiama la utility invece di riprodurre i clic. | La convergenza delle frasi sul catalogo resta una decisione del team (rituale mensile, `docs/anti-entropy/06-rituale.md`) |
| U4 | **Il riconoscimento e' per componenti, non per parole.** Componenti del passo identici a quelli dichiarati dalla utility: la usa da solo. Coincidenza parziale: la propone nel commento del passo, come i candidati di oggi. | E' un confronto fra insiemi, deterministico: lo stesso meccanismo di `rankCandidates` (classe "stessi-componenti") |
| U5 | **I valori registrati diventano parametri della utility.** Il CAP, le risposte del questionario, la carta. | I dati cambiano piu' spesso del codice; stanno nel `.feature`, dove il tester li cambia da solo |
| U6 | **Manutenzione con quattro regole** (sezione dedicata). | Una utility rotta rompe tutti gli scenari che la usano: va scoperto prima dei tester |

## Come entra nel flusso

```
registrazione   passo "The user sleect the store": fill textbox "zip" (NW1), click "Select Pharmacy"
      |
generazione     il registro delle utility: "scelta della farmacia" dichiara
      |         { textbox "zip", button "Select Pharmacy" } -> coincidono
      v
.feature        When The user sleect the store with "NW1"          (frase del tester, invariata)
step            await scegliFarmacia(this.page, { cap: valore })    (corpo: la utility)
      |
esecuzione      CAP, scorrimento, pin disegnato, clic col mouse, Select Pharmacy
```

Un passo che nessuna utility copre resta come oggi: gesti generati, `@wanted`.

### Il registro delle utility

Un file accanto a `src/support/avvisi.ts` e `src/support/ricette.ts`, sulla
stessa forma (riconoscimento dichiarativo, letto dal generatore senza aprire un
browser). Per ogni utility:

- **nome** e **dove** sta (`src/actions/<comportamento>.actions.ts`);
- **riconoscimento**: l'insieme dei componenti (ruolo + nome, eventualmente
  un'espressione per i nomi che cambiano) che un passo deve toccare;
- **parametri**: come si ricavano dai gesti registrati (il valore del campo
  `zip`; le coppie domanda → risposta del questionario);
- **frase proposta per il catalogo**, che il team puo' adottare quando vuole.

Il registro sostituisce `ricette.ts`: la ricetta della mappa diventa la prima
utility.

### Dove sta il codice

Rispetta i quattro livelli del progetto:

- `src/actions/<comportamento>.actions.ts` — la utility: l'intenzione, nessun selettore;
- `src/pages/common/*.page.ts` — le Page Object condivise che la utility usa: i selettori, in un posto solo;
- `src/support/base.page.ts` — le protezioni comuni (velo di caricamento, modale dei messaggi, casella disegnata).

## Le utility iniziali

In ordine di lavoro. Per ognuna: da dove si parte nel POC, come si riconosce, quali parametri.

| # | Utility | Dal POC | Riconoscimento | Parametri dalla registrazione |
|---|---|---|---|---|
| 0 | **Protezioni comuni** in `BasePage` | `waitForLoadingOverlayGone`, `dismissNewMessageModalIfPresent`, `toggleStyledCheckbox` | — (sempre attive) | — |
| 1 | **Ordine in sospeso**: «Start over» con `dispatchEvent`, ricontrollato perche' il dialog arriva in ritardo | `ResumeOrderPage`, `ConsultationNewOrReturningPage` | gia' un avviso | — |
| 2 | **Questionario**: legge la domanda a schermo, risponde dalla tabella, avanza da solo o con Next | `JetLagWizardPage.answerQuestionnaire` | gesti su `/questions/` | coppie (intestazione della domanda → risposta cliccata o digitata): il registratore salva gia' l'intestazione di ogni gesto |
| 3 | **Scelta della farmacia** | `JetLagDeliveryPage.selectFirstAvailablePharmacy`, `src/actions/mappa.actions.ts` | `textbox "zip"` + `button "Select Pharmacy"` | il CAP |
| 4 | **Foto d'identita' e del corpo**: facoltative se non richieste, «That's me» facoltativo | `JetLagWizardPage.completeIdVerification` | `Open camera`, `Take Picture`, `Save` | quante e quali |
| 5 | **Pagamento**: carta salvata, oppure carta nuova negli iframe di Stripe; i dialog dopo «Place order» | `PaymentPage` | `Place Order` (+ carta salvata o campi carta) | numero, scadenza, CVC se digitati |
| 6 | **Esito**: «Clinical assessment Pending» | `JetLagConfirmationPage` | gesti e verifiche sulla pagina di conferma | — |
| 7 | **Utente nuovo a ogni giro** (per lo scenario «primo ordine») | `generateTestEmail` + registrazione | un passo di registrazione dell'account | — |

Le verifiche registrate su numeri e date (il `10` di «10 Secure messages», la
data del messaggio) non diventano piu' verifiche: il generatore le scarta e lo
dichiara, come fa con gli avvisi. Fanno parte di U4 sul lato verifiche.

## Manutenzione

1. **I selettori stanno solo nelle Page Object, mai nelle utility.** Quasi ogni
   cambiamento del sito tocca una riga di una Page Object condivisa, e tutti gli
   scenari tornano a funzionare insieme.
2. **Una sentinella per ogni utility**: uno scenario minimo che la esercita su QA,
   lanciabile ogni giorno anche dal cruscotto. Il sito cambia, la sentinella si
   accende con il nome della utility, prima che falliscano gli scenari dei tester.
3. **La riparazione parte dal dossier del fallimento**, che dice cosa c'era sulla
   pagina. La correzione la propone l'assistente; la sentinella verde la conferma.
4. **Se il flusso cambia davvero si registra di nuovo**, e la utility si aggiorna
   da quella prova, non a memoria.

Il costo: serve qualcuno che approvi le correzioni proposte (il gatekeeper del
catalogo, con l'SDET per i casi tecnici).

## Come si prova

- **Ogni utility**: la sua sentinella su QA, e dove possibile un controllo
  sull'app finta (`npm run check:app-finta`), che gia' simula mappa e fotocamera.
- **Il generatore**: in `check:generate`, casi costruiti sui gesti veri delle
  registrazioni del 13 e 14 ottobre — passo riconosciuto con componenti identici
  (corpo = utility), coincidenza parziale (solo proposta), nessuna coincidenza
  (come oggi), parametri ricavati (CAP, coppie del questionario).
- **Il criterio di fatto**: lo scenario «ordine successivo» salvato il 14/10
  (`src/features/clinic/weight-loss/the-complete-the-second-order.feature`),
  rigenerato, gira su QA dall'inizio alla fine due volte di fila con lo stesso
  utente.

## Fuori da questa spec

- Estrarre utility nuove dalle registrazioni (strada B): dopo, quando ce ne sono
  abbastanza come modello.
- Pulizia dei gesti esplorativi durante la registrazione: rimandata (decisione del 14/10).
- Cambiare la frase del `.feature` con quella del catalogo: decisione del team.

## Decisioni prese all'approvazione (2026-10-14)

| # | Domanda | Decisione |
|---|---|---|
| Q1 | Le risposte del questionario: tabella nel `.feature` o parametri dello step? | Tabella Gherkin sotto lo step: leggibile, e il tester la cambia da solo |
| Q2 | Le Page Object condivise vanno in `src/pages/common/` o per applicazione? | Per applicazione (`clinic`, `qa-brochure`): i due domini hanno pagine diverse |
| Q3 | Chi approva le correzioni delle utility? | Il gatekeeper del catalogo, con l'SDET per i casi tecnici |

## Prova di fattibilita' (2026-10-14)

`scripts/esplora-flusso.ts` percorre il flusso «ordine successivo» con le
tecniche descritte qui (avvisi, velo, questionario guidato dalla domanda,
ricetta della mappa, carta salvata, foto) e arriva a «Clinical assessment
Pending» due volte di fila con la stessa utenza, in circa 2 minuti e 15 secondi.
Le foto di ogni pagina e il diario dei tempi sono in `reports/esplora/` (fuori da
git): sono la mappa da cui portare le utility in `src`.
