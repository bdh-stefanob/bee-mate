# Cruscotto per il tester — design

> Specifica approvata il 2026-09-22. Prima versione: le tre schermate che rendono
> la catena usabile senza terminale. Catalogo, assistente e sincronizzazione
> restano fuori, dichiarati.

## Perche' esiste

La catena funziona — registrazione, generazione, test — ma si guida con sei
comandi in un terminale, nell'ordine giusto, con tre file di configurazione
scritti a mano. Il vincolo V3 del progetto dice **alla portata dei tester
manuali**: finche' serve un terminale, quel vincolo non e' soddisfatto, e la
dimostrazione vale solo con il suo autore alla tastiera.

L'app desktop esiste gia' (catalogo, editor Gherkin, impostazioni) ed e' gia'
impacchettata come eseguibile. Qui non si costruisce un secondo prodotto: si
aggiunge a quello che c'e' la parte che manca.

## Per chi, e cosa deve poter fare da solo

**Un tester manuale, sulla sua macchina, senza nessuno accanto.** Deve poter:

1. sapere se la macchina e' pronta, e rimediare a cio' che manca;
2. registrare una sessione e vedere cosa il sistema ne ha capito;
3. lanciare il test generato e leggerne l'esito, verde o rosso che sia.

Quello che non deve mai vedere: un comando, un percorso di file, un messaggio
pensato per chi ha scritto lo strumento.

## Vincoli

- **Nessun riferimento aziendale nel prodotto**: nome, colori e testi sono
  neutri. La palette e' ispirata, non presa.
- **Accessibilita'**: contrasto almeno 4,5:1 sui testi, mai il colore come unico
  segnale, area cliccabile >= 40px, contorno di focus sempre visibile.
- **Responsive**: da un laptop piccolo (1280x720, anche 1024 di larghezza) a uno
  schermo collegato. Una colonna sotto i 900px, due sopra.
- **Zero costi**: nessuna licenza, nessun servizio esterno.
- **Tre settimane alla demo**: cio' che non serve alle tre schermate non entra.

## Le tre schermate

### Controllo

La prima che si apre, e l'unica che puo' fermare tutto. Una riga per requisito,
ognuna con stato (icona + parola, mai solo un colore) e, quando manca qualcosa,
**il pulsante che la risolve**:

| Requisito | Se manca |
|---|---|
| Browser per l'automazione | pulsante che lo installa, con avanzamento |
| Dipendenze del progetto | pulsante che le installa |
| Ambiente configurato (indirizzo) | campo, con elenco degli ambienti gia' noti |
| Credenziali dell'ambiente | campi mascherati; il valore non riappare mai |
| Sessione di accesso | eta' della sessione, pulsante "accedi adesso" |

Sotto, lo stato in una riga: *pronto* oppure *mancano due cose*.

### Registra

Un pulsante grande. L'ambiente si sceglie da un elenco — non si scrive un
indirizzo. Premendo, si apre il browser con la barra del recorder; l'app intanto
mostra un'attesa onesta ("sto registrando: torna qui quando hai finito").

Alla chiusura del browser, l'app mostra **cosa ha capito**, letto dalla traccia
salvata e non dall'output a schermo:

- i passi con il nome che il tester ha dato loro;
- quante verifiche ha dichiarato, e su cosa;
- i buchi, tradotti: "tre elementi non erano nel dizionario della pagina: il test
  funziona, ma potrebbe essere fragile" con il rimedio in un pulsante
  ("scansiona quella pagina").

Un solo pulsante per proseguire: **Genera il test**.

### Esecuzione

I passi dello scenario in verticale, che diventano verdi mentre girano. Al
fallimento: riga rossa, schermata catturata, pagina attesa e indirizzo reale, e
una frase che dice cosa significa.

Due interruttori, non di piu':

- **Guarda il browser** (altrimenti gira nascosto);
- **Parti senza sessione** (per i test che contengono l'accesso).

In fondo, l'esito in una riga e il tempo impiegato.

## Architettura

### Dove gira cosa

L'eseguibile avvia gia' un server Next e ci carica dentro la finestra; le rotte
API esistono e sanno risolvere la radice del repository (`src/lib/repo.ts`). Le
schermate nuove usano lo stesso impianto: **nessun secondo runtime**.

Il giorno in cui servisse un eseguibile autosufficiente, l'esecuzione si sposta
nel processo principale di Electron: e' il motivo per cui sta tutta dietro a un
modulo solo.

### Il modulo che esegue

`web-ui/src/lib/esecuzione.ts`, lato server:

```
avvia(nome: Comando, opzioni): { id }      // lancia, non attende
stato(id): Esecuzione                       // stato + ultime righe
ferma(id): void                             // termina il processo
```

**Elenco chiuso dei comandi.** `Comando` e' un'unione di nomi noti — diagnosi,
sessione, registrazione, generazione, test, scansione — e ognuno ha la sua riga
di comando **scritta nel modulo**. La UI manda un nome e dei parametri tipizzati
(quale ambiente, con o senza sessione), mai una stringa da eseguire. Un'app che
accetta comandi arbitrari dalla finestra e' un terminale travestito.

Le opzioni si passano agli script **in forma nuda** (`label=x`), la sola che
arriva intatta in ogni shell: vedi `metodo-di-lavoro.md`.

### Rotte

| Rotta | Fa |
|---|---|
| `POST /api/esegui` | avvia un comando dell'elenco, restituisce l'id |
| `GET /api/esegui/<id>/flusso` | eventi (righe di output, cambi di stato, fine) |
| `POST /api/esegui/<id>/ferma` | interrompe |
| `GET /api/controllo` | l'esito della diagnosi, in forma strutturata |

Il flusso usa Server-Sent Events: unidirezionale, nessuna dipendenza nuova,
riconnessione gestita dal browser.

### I risultati si leggono dagli artefatti, mai dalla prosa

Regola gia' pagata su questo progetto (un conteggio preso da un riassunto dava
92 invece di 0). Quindi:

| Cosa mostra la UI | Da dove lo legge |
|---|---|
| Passi, verifiche, buchi della registrazione | il JSON della traccia |
| File generati, buchi per tipo | il manifesto della generazione |
| Passi verdi e rossi, schermate | il flusso di messaggi di Cucumber |
| Stato della macchina | uscita strutturata di `diagnosi` (da aggiungere) |

L'output testuale scorre a video per dire *cosa sta succedendo adesso*, e non
decide niente.

### Stato, interruzioni, concorrenza

Ogni esecuzione ha un file di stato sotto `reports/`: comando, avvio, fine,
esito, artefatti. Chiudendo l'app a meta' di una registrazione, alla riapertura
quella risulta **interrotta** e la traccia gia' salvata resta.

Un solo comando lungo alla volta. Due registrazioni insieme si pestano i piedi:
il secondo tentativo riceve un no chiaro, non una coda silenziosa.

### Credenziali

L'app scrive `.env` e il file dei bersagli nella radice del repository, gia'
ignorati da git. I campi sono mascherati; i valori non compaiono nell'output,
nel file di stato, ne' nei log.

**Limite dichiarato**: su disco quel file resta in chiaro. Spostarlo nel gestore
credenziali del sistema e' un passo successivo — va detto, non aggirato.

## Aspetto

Barra laterale con tre voci; sotto i 900px diventa una barra in alto. Contenuto
in una colonna sui laptop piccoli, due sopra (azione a sinistra, esito a destra),
larghezza massima contenuta perche' le righe lunghe non si leggono.

| Ruolo | Colore |
|---|---|
| Blu primario (azioni, voce attiva) | `#1A56DB` |
| Verde esito | `#067647` |
| Rosso esito | `#B42318` |
| Testo primario / secondario | `#101828` / `#475467` |
| Superfici | `#FFFFFF` / `#F9FAFB` / bordi `#EAECF0` |

Tipografia di sistema, densita' media, nessuna ombra decorativa. Ogni stato ha
icona **e** parola.

Il nome del prodotto resta da scegliere: neutro, senza riferimenti aziendali.

## Come si verifica

`vitest` c'e' gia' in `web-ui`. Casi, scritti prima del codice:

- l'elenco chiuso **rifiuta** un comando non previsto;
- i parametri diventano opzioni in forma nuda, mai concatenazione di stringhe;
- la lettura degli artefatti: una traccia senza verifiche, un manifesto con
  buchi, un flusso di messaggi con un passo rosso;
- un'esecuzione interrotta risulta interrotta, e gli artefatti restano;
- due comandi lunghi insieme: il secondo riceve un rifiuto esplicito.

Niente test che pilotano l'interfaccia: a tre settimane dalla demo costano molto
e proteggono poco.

## Fuori dalla prima versione

- **Catalogo e assistente**: esistono gia' a meta' nell'app, e il tester li usa
  di rado.
- **Sincronizzazione**: dove finisce il lavoro prodotto (commit, pagina wiki,
  aggiornamento dell'app) e' un capitolo suo.
- **Piu' utenti, aggiornamento automatico, telemetria.**

## Domande aperte

| # | Domanda | Blocca |
|---|---|---|
| U1 | Il nome del prodotto | Niente: si mette un segnaposto e si cambia |
| U2 | Dove finisce il lavoro del tester (sincronizzazione) | La versione successiva |
| U3 | L'eseguibile deve funzionare senza il repository? | Se si', l'esecuzione si sposta in Electron e gli script vanno impacchettati |
| U4 | "Freemium": lo strumento diventa un prodotto per altri? | Distribuzione e licenze, non l'impianto |
