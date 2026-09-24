# Guida al cruscotto

_Per chi esegue i test a mano. Non serve saper scrivere Gherkin ne' codice, e non
serve aprire un terminale._

Il cruscotto e' la parte dell'app desktop che si apre per prima. Ha tre voci nella
barra laterale, una per ogni cosa che fai:

| Voce | A cosa serve |
|---|---|
| **Controllo** | sapere se la macchina e' pronta, e sistemare cio' che manca |
| **Registra** | fare il tuo test come sempre, e ottenerne uno scenario |
| **Esecuzione** | far girare lo scenario da solo e vedere com'e' andata |

Nella barra laterale trovi anche:

- **Ambiente**: su quale ambiente stai lavorando. Si sceglie una volta e vale
  per tutte le schermate.
- **Lingua**: italiano o inglese. La scelta resta anche quando chiudi l'app.
- **Catalogo passi**: il portale con il catalogo e l'editor (vedi
  `USER-GUIDE.md`).

> **Cosa serve prima:** l'app lavora su una copia del progetto sul tuo computer.
> La prima volta ti chiede in quale cartella si trova.

---

## 1. Controllo

In alto c'e' lo stato in una riga, sempre con un'icona **e** una parola:

- **Pronto**: puoi lavorare.
- **Pronto — N cose da guardare**: puoi lavorare. Ci sono avvisi che conviene
  leggere, ma non ti bloccano.
- **Mancano N cose**: prima di registrare va sistemato qualcosa.

Sotto, una riga per ogni requisito, con il suo esito (**A posto**,
**Attenzione** o **Manca**). Quando qualcosa manca e la finestra sa sistemarlo,
accanto c'e' il pulsante **Rimedia**. Le voci che riguardano solo chi sviluppa
lo strumento stanno chiuse sotto **Avanzate**.

### Ambienti

Un ambiente e' un indirizzo su cui registri e lanci i test, per esempio
"collaudo".

1. **Aggiungere**: scrivi nome e indirizzo, poi premi **Aggiungi**. Il nome
   dopo non si puo' cambiare, perche' resta legato alle sessioni e alle
   registrazioni.
2. **Registra l'accesso** (una volta sola): si apre il browser, entri come fai
   di solito e poi lo chiudi. La finestra ricava da li' i passi di accesso e ti
   dice quali credenziali servono. Nel file degli ambienti **non finisce mai un
   valore che hai scritto**: al suo posto c'e' il nome di una variabile.
3. **Compila**: inserisci utente e password nei campi mascherati. Restano solo
   sul tuo computer, e una volta salvati non si vedono piu'.
4. **Accedi adesso**: si apre il browser, entri e lo chiudi. La sessione si
   salva da sola, e i test partiranno gia' autenticati.

Dalla stessa riga puoi modificare l'indirizzo o eliminare l'ambiente. Prima di
eliminarlo la finestra ti dice cosa perdi: l'accesso registrato e la sessione
salvata. Le credenziali invece restano, perche' potrebbero servire ad altro.

**Altre variabili (avanzato)** serve solo per le credenziali che non
appartengono a nessun ambiente, come i token per altre integrazioni.

---

## 2. Registra

1. Controlla l'ambiente nella barra laterale.
2. Premi **Registra una sessione**. Si apre il browser con una barra in alto a
   destra.
3. Fai il tuo test come lo faresti sempre. In piu':
   - alla fine di ogni passo premi **Fine intento** e dagli un nome ("apro un
     nuovo ordine", "confermo il pagamento");
   - quando qualcosa ti conferma che e' andata bene (un titolo, un messaggio, un
     totale), premi **Verifica** e cliccaci sopra.
4. Quando hai finito, chiudi il browser. Se ci sono gesti senza nome, ti viene
   proposto dove dividere i passi e ti chiede come chiamarli.

La finestra ti mostra **cosa ha capito** dalla registrazione:

- i passi, con il nome che hai dato e quante azioni e verifiche contengono;
- quante verifiche hai registrato in tutto;
- **Da sapere prima di generare**: i punti in cui il test potrebbe essere
  fragile, detti a parole, con il rimedio.

Poi premi **Genera il test**.

Se esci dalla schermata mentre registri, al ritorno la registrazione e' ancora
li'. Se c'e' gia' un'altra operazione in corso, la finestra te lo dice e ti
indica dove guardarla: se ne fa una alla volta.

---

## 3. Esecuzione

1. Controlla l'ambiente nella barra laterale.
2. Se vuoi, attiva uno dei due interruttori:
   - **Guarda il browser**: il test gira in una finestra visibile invece che
     nascosto;
   - **Parti senza sessione**: il test non usa l'accesso salvato. Serve quando
     lo scenario contiene gia' l'accesso.
3. Premi **Lancia il test**.

I passi compaiono in verticale e diventano verdi mentre girano. Se un passo
fallisce, la sua riga diventa rossa e mostra la **schermata catturata** in quel
momento, insieme alla pagina che ci si aspettava e a quella in cui ci si e'
trovati.

In fondo trovi l'esito in una riga (superati, falliti, saltati) e il tempo
impiegato.

Se il test parte ma non c'e' nessuno scenario da eseguire, la finestra ti dice
di registrare una sessione e generare il test prima.

---

## Domande frequenti

**Devo imparare Gherkin?** No. Le frasi dello scenario sono i nomi che dai ai
passi. Chi cura il catalogo le fara' convergere poi sulle forme condivise.

**Le mie credenziali finiscono da qualche parte?** No. Restano in un file sul
tuo computer, che non viene mai condiviso. Non compaiono nei messaggi della
finestra, nei file di stato ne' nei log. Un limite dichiarato: su disco quel
file non e' cifrato.

**Il test si ferma su una lista con tanti pulsanti uguali.** E' un limite noto:
per ora il generatore non sa distinguere una riga dall'altra. E' il prossimo
lavoro in programma.

**Una sessione salvata quanto dura?** Dipende dall'applicazione. La schermata
Controllo avvisa quando una sessione ha piu' di 12 ore: in quel caso premi di
nuovo **Accedi adesso**.
