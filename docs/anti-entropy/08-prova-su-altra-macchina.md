# Provarlo sulla macchina aziendale

## Le tre cose che non arrivano con `git clone`

Sono gitignorate apposta, e su una macchina nuova non ce n'e' nessuna:

| Cosa | Dove | Perche' non e' nel repository |
|---|---|---|
| gli indirizzi | `bdd-targets.json` | sono ambienti aziendali, e questo repo e' pubblico |
| le credenziali | `.env` | non stanno nemmeno in `bdd-targets.json`: li' si scrivono `${COSI}` |
| le sessioni | `reports/sessions/*.json` | **equivalgono a credenziali** |

Quando ne manca una il sintomo non assomiglia alla causa: una variabile non
definita si espande nella stringa vuota, il login compila il campo con niente,
l'applicazione risponde "credenziali errate" — e si va a cercare nel posto
sbagliato. Per questo la prima cosa da lanciare e' quella che risponde alla
domanda giusta.

## Da zero a un test che gira

```bash
git clone <repo>
cd bdd-automation-scaffold
npm install
npx playwright install chromium          # NON lo fa npm install: sono binari a parte
cp bdd-targets.example.json bdd-targets.json     # mettici i TUOI indirizzi

npm run targets            # cosa c'e', cosa manca
npm run targets env        # il blocco da incollare in .env
```

`npm run targets` non stampa mai un valore: solo nomi di variabile, e se sono
definite o no. Un comando diagnostico che stampa segreti finisce prima o poi
incollato in un ticket.

Poi, per ogni ambiente:

```bash
npm run session  -- clinic   # login UNA VOLTA. Automatico dove si puo', a mano dove serve
npm run scout    -- clinic   # dizionario dei componenti
npm run record   -- clinic   # esegui il test a mano: e' l'atto di specifica
npm run generate             # feature + Page Object + step. Nessuna AI, e compila

npm run test:bersaglio clinic   # gira, gia' autenticato
```

Il bersaglio porta con se' **indirizzo e sessione**: i test partono autenticati
senza rifare il login a ogni scenario. Aggiungi `vedi` in fondo al comando per
aprire il browser, che serve quando un passo fallisce e il messaggio non basta.

Niente `BDD_TARGET=clinic npm test`: e' sintassi di bash, e in PowerShell non
imposta niente. `test:bersaglio` passa il bersaglio come argomento e funziona in
ogni shell.

## Se il download dei browser e' bloccato

Su un portatile aziendale la CDN di Playwright puo' essere chiusa dal proxy, e
`npx playwright install` fallisce. Non e' un vicolo cieco: Playwright sa pilotare
il Chrome o l'Edge **gia' installati**, senza scaricare niente.

```bash
BDD_BROWSER=chrome npm run scout -- https://...      # oppure msedge
```

In PowerShell: `$env:BDD_BROWSER="chrome"`.

Senza la variabile ci arriva da solo: prova il Chromium di Playwright, poi
Chrome, poi Edge, e **dice quale ha usato**. Un browser diverso in silenzio
sarebbe peggio di un errore.

Il compromesso, dichiarato: il Chrome di sistema ha la versione che ha, e non e'
identico al Chromium di Playwright. Per inventariare nomi accessibili e
registrare gesti non cambia niente. Per un test che dipende da un dettaglio di
resa, potrebbe.

## Piu' ambienti, tutti insieme

`bdd-targets.json` ne tiene quanti se ne vuole. Ognuno con il suo indirizzo, il
suo login e la sua sessione:

```json
{
  "clinic":  { "url": "${CLINIC_URL}",  "readyWhen": "/visits", "login": { "steps": [ ... ] } },
  "portale": { "url": "${PORTALE_URL}", "readyWhen": "/home" },
  "collaudo":{ "url": "${CLINIC_COLLAUDO_URL}", "readyWhen": "/visits" }
}
```

Lo stesso scenario gira su ambienti diversi cambiando una parola, perche' le
Page Object generate hanno **percorsi relativi**: `/visits`, non
`https://.../visits`. Fissare l'origine nei file la legherebbe a un ambiente
solo — e farebbe finire un indirizzo aziendale in un repository pubblico.

```bash
npm run test:bersaglio clinic
npm run test:bersaglio collaudo
```

## Il login: automatico dove si puo', a mano dove serve

I passi si dichiarano come **dati** nel bersaglio, e i selettori restano nel file
gitignorato. Le credenziali non stanno nemmeno li': `${VAR}` risolto da `.env`,
e non vengono mai stampate.

**Non blocca mai.** Ogni passo che non riesce e' un avviso: il browser resta
aperto e si finisce a mano. E' la lezione del POC aziendale, dove il login
automatico funziona sul caso semplice e **si ferma davanti alla MFA**, e per
un'applicazione e' gia' interamente manuale perche' i selettori non sono
mappati. Un automatismo che fallisse in modo netto sarebbe peggio di nessun
automatismo.

Il conteggio e' esplicito — *"2 passi su 3"* — perche' dice a colpo d'occhio
dov'e' il problema invece di lasciare indovinare.

## Cosa NON portare avanti e indietro

- **I file di sessione.** Sono credenziali. Si rifanno in trenta secondi con
  `npm run session`.
- **`bdd-targets.json` e `.env`.** Vivono su ogni macchina, non si sincronizzano.
- **`reports/`.** Contiene registrazioni e dizionari di applicazioni vere: nomi
  di funzionalita', a volte dati. E' gitignorato, e va lasciato dov'e'.

Cio' che si porta avanti e indietro e' il **codice generato** — feature, Page
Object, step — che e' la cosa che deve stare in repository, ed e' anche l'unica
che non contiene niente di riservato.
