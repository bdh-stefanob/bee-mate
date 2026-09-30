# Kiro: portare il cruscotto sulla macchina aziendale, con un'app su due domini

> **Per chi e' scritto:** l'agente Kiro che aiuta Stefano a configurare questo
> repository su una macchina aziendale e a provarlo su un'applicazione con
> **doppio reindirizzamento fra domini**. Si carica in chat con `#File` oppure
> con "leggi `docs/KIRO-MACCHINA-AZIENDALE.md`". Non sostituisce
> `.kiro/steering/`: lo completa per questo caso.
>
> Gli indirizzi sono segnaposto (`xxx`). **Non scrivere mai indirizzi, nomi di
> pagine o credenziali reali in un file versionato**: vanno in `.env` e in
> `bdd-targets.json`, entrambi gitignorati.

---

## 0. Il caso

L'applicazione ha due domini:

```
brochure-clinic.xxx   (vetrina: servizi per l'utente finale)
        │  login
        ▼
clinic.xxx            (area riservata, es. /account)
        │  l'utente esce da /account
        ▼
brochure-clinic.xxx   (si torna alla vetrina)
```

Il framework e' stato scritto pensando a **un solo indirizzo di base per
ambiente**. Un percorso che cambia dominio e' un **buco dichiarato, non
risolto**: decisione aperta T3, task 3 in `.kiro/specs/demo-anti-entropia/tasks.md`.
Sotto trovi cosa e' sicuro (letto nel codice), cosa no, e come provarlo senza
indovinare.

## 1. Regole che non si toccano

1. **Niente credenziali nel codice, nei documenti, nei commit.** Solo `.env`,
   richiamate come `${VARIABILE}`.
2. **`reports/` non va mai in git** (registrazioni, dizionari, sessioni).
   `bdd-targets.json` nemmeno.
3. **Non modificare i file generati** per aggiustarli: se sbagliano, si corregge
   il generatore o il modello in `templates/`, e si rigenera. Un file senza il
   marcatore di generazione in prima riga e' di una persona: non toccarlo.
4. **Architettura a 4 layer** (`features` → `steps` → `actions` → `pages`).
   Mai selettori negli step. Un refactor architetturale si chiede prima.
5. **I comandi `npm run` si scrivono nella forma nuda**, senza trattini prima
   delle opzioni: `npm run record clinic`, `npm run generate scope=main`. La
   forma `npm run x -- --opzione` e' gia' costata esecuzioni sbagliate senza
   errore (vedi `.kiro/steering/lezioni.md`).
6. **Uno script dice cosa sta per fare prima di farlo.** Riporta a Stefano
   l'output che vedi, non un riassunto.
7. **Non aggiungere codice per il doppio dominio senza il suo via libera**
   (e' la decisione T3). Prima si prova con quello che c'e' (sezione 5).

## 2. Preparare la macchina (in ordine, con la verifica di ognuno)

| # | Cosa | Verifica |
|---|---|---|
| 1 | Node installato; nella radice `npm ci`, poi `npm ci` dentro `web-ui/` | i due comandi finiscono senza errori. Se `web-ui` fallisce sul lockfile e' un difetto noto (housekeeping), riportalo, non aggirarlo |
| 2 | Un browser: Chrome o Edge, oppure `npx playwright install chromium` | `npm run diagnosi` dice quale browser usera' |
| 3 | `.env`: copia `.env.example`, aggiungi le variabili dell'app (sotto) | `npm run targets` elenca l'ambiente e **quali variabili mancano** (solo i nomi, mai i valori) |
| 4 | `bdd-targets.json`: copia `bdd-targets.example.json` e scrivi l'ambiente (sotto) | `npm run targets` non segnala errori |
| 5 | `npx tsc --noEmit` e `npm run test:dry` | verdi. `test:dry` dira' "nessun indirizzo": e' normale finche' non c'e' un bersaglio |

Il proxy aziendale puo' bloccare il download dei browser o raggiungere solo
alcuni domini: se un passo fallisce per la rete, fermati e dillo, non provare
scorciatoie.

### `.env` (nomi, non valori)

```
CLINIC_BROCHURE_URL=https://brochure-clinic.xxx
CLINIC_APP_URL=https://clinic.xxx
CLINIC_USER=...
CLINIC_PASS=...
```

### `bdd-targets.json`: un ambiente, di partenza la vetrina

```json
{
  "clinic": {
    "url": "${CLINIC_BROCHURE_URL}",
    "readyWhen": "clinic.xxx/account",
    "hint": "il login porta su clinic.xxx/account. Prima di salvare la sessione: entra, poi esci da /account e torna sulla vetrina, cosi' il browser ha toccato entrambi i domini",
    "login": {
      "dismiss": [{ "role": "button", "name": "Accept All" }],
      "steps": [
        { "click": { "role": "link", "name": "Login" } },
        { "fill": { "role": "textbox", "name": "Email" }, "value": "${CLINIC_USER}" },
        { "fill": { "selector": "[type=password]" }, "value": "${CLINIC_PASS}" },
        { "click": { "role": "button", "name": "Sign in" } }
      ]
    }
  }
}
```

Note su questo file:

- **`url` e' la vetrina**, perche' la registrazione parte da li' e il generatore
  emette `navigate()` **solo sulla prima pagina** del flusso.
- **`readyWhen` deve contenere il dominio**, non solo `/account`: il segnale e'
  "l'indirizzo contiene questo testo". Un `/account` nudo potrebbe scattare
  anche sulla vetrina, se anche li' esiste una pagina con quel nome.
- I nomi `Login`, `Sign in`, `Email` sono **esempi**: i selettori veri vanno
  mappati sull'app. Il login automatico non e' obbligatorio e non blocca mai:
  se un passo non riesce, si finisce a mano nello stesso browser. Con MFA o SSO
  di terze parti si accede **a mano**, senza blocco `login`.

## 3. Cosa e' sicuro del codice (letto, non supposto)

| Fatto | Dove | Conseguenza |
|---|---|---|
| Un solo `baseURL` per ambiente, dal campo `url` | `src/support/world.ts`, `scripts/lib/targets.ts` | i percorsi relativi si risolvono tutti sulla vetrina |
| Ogni Page Object ha un `path` **relativo** e `navigate()` fa `page.goto(path)` | `templates/page-object.ts.tmpl`, `src/support/base.page.ts` | chiamare `navigate()` su una pagina di `clinic.xxx` porta sulla vetrina, **in silenzio** |
| Il generatore chiama `navigate()` solo sul primo intento; per gli altri `assertLoaded()` | `scripts/lib/generate-emit.ts` | un flusso che passa da un dominio all'altro **cliccando** non dovrebbe rompersi per questo motivo |
| `assertLoaded()` e' costruito dalle **verifiche** del tester, non dall'indirizzo | template Page Object | non dipende dal dominio, purche' il tester abbia marcato "Verifica" su ogni pagina importante |
| L'identita' di una pagina e' `host + percorso`; i file generati stanno in `pages/generated/<host>/` | `pageIdentity` in `scripts/lib/generate-core.ts` | le pagine dei due domini non si sovrascrivono fra loro |
| La sessione e' `context.storageState`: **cookie + localStorage di ogni origine toccata** in quel contesto | `scripts/session.ts` | una sessione salvata dopo aver visitato entrambi i domini li contiene entrambi |
| `storageState` **non** contiene `sessionStorage` (ne', di default, IndexedDB) | comportamento di Playwright | se il token vive li', la sessione salvata non funzionera' mai: il test ripartira' dal login |

## 4. Cosa NON e' verificato: i rischi, in ordine di probabilita'

1. **Uscire da /account potrebbe chiudere la sessione** (logout lato server o
   cookie cancellati). La sessione salvata sarebbe gia' morta al primo uso.
   Sintomo: il test parte, e a meta' l'app mostra il login.
2. **La vetrina cambia faccia dopo il login** (es. "Login" diventa "Il mio
   account"). La pagina di ritorno ha **la stessa identita'** della vetrina
   iniziale (stesso host, stesso percorso), quindi finisce **nella stessa Page
   Object**, con gli inventari fusi: componenti dello stato anonimo e di quello
   loggato insieme. Rischio: un metodo che punta a un elemento che in quel
   momento non c'e'.
3. **Una pagina di `clinic.xxx` usata come inizio di uno scenario** (es. uno
   scenario salvato che parte gia' da /account): `navigate()` andrebbe sulla
   vetrina. E' esattamente il buco T3.
4. **Il login passa da un terzo dominio** (identity provider): tre domini, non
   due. Il cookie di sessione va guardato dove finisce davvero.
5. **Cookie `Secure`/`SameSite`** che il browser scarta fra i due domini: il
   redirect funziona a mano e non nel test. Se succede, servono le DevTools
   (tab Application → Cookies), non altro codice.

## 5. Come provarlo senza scrivere codice (opzione B della T3, con un tentativo di A)

Ogni passo ha un esito da **riportare a Stefano**. Se un passo fallisce, **ti
fermi e riporti**: non proseguire con il successivo.

1. **Sessione.** `npm run session clinic`. Nel browser: accedi, entra in
   `/account`, poi esci e torna sulla vetrina. *Riporta:* se il salvataggio e'
   avvenuto da solo (`readyWhen`) o a mano, e l'eta' della sessione.
2. **La sessione sopravvive?** Lancia una registrazione breve
   (`npm run record clinic`) e guarda se parte gia' dentro. *Riporta:* si'/no,
   e se compare un login a meta' (rischio 1).
3. **Registrazione corta, 3-4 intenti:** vetrina → login → /account → uscita →
   vetrina. Una **Verifica** su ogni pagina (e' cio' che costruisce
   `assertLoaded()`). I nomi degli intenti si danno **alla fine**.
4. **Genera.** `npm run generate`. *Riporta:* le cartelle create sotto
   `src/pages/generated/` (devono esserci due host), e gli avvisi del generatore,
   testuali.
5. **Tsc e dry-run.** `npx tsc --noEmit`, poi `npm run test:dry`. Se il dry-run
   segnala step senza glue o doppioni, riporta l'elenco.
6. **Esegui, in due modi.** `npm run test:bersaglio clinic` (parte gia'
   autenticato). Se la registrazione **contiene** il login, il pulsante non
   esiste piu' con la sessione attiva: usa la variante senza sessione
   (`BDD_NO_SESSION=1` come variabile d'ambiente: in PowerShell
   `$env:BDD_NO_SESSION = "1"`, oppure il pulsante "senza sessione" del
   cruscotto). *Riporta:* passo che fallisce, indirizzo atteso e indirizzo
   raggiunto (li scrive `expectVisible`), screenshot.
7. **Se il passo 6 cade sul cambio di dominio**, non correggere i file generati.
   Riporta il sintomo e passa all'**opzione B**: due registrazioni separate,
   una per la vetrina (fino al login) e una per l'area riservata, con **due
   ambienti** (`clinic-vetrina`, `clinic-app`), ciascuno con il suo `url`. E'
   noiosa ma non richiede codice.

## 6. Sintomo → probabile causa → cosa fare

| Sintomo | Causa probabile | Cosa fare |
|---|---|---|
| Il test riparte dal login a meta' | sessione invalidata dall'uscita (rischio 1) o token in `sessionStorage` | prova a salvare la sessione **senza** uscire da /account; se cosi' regge, il flusso di uscita va registrato a parte |
| `navigate()` finisce sulla vetrina invece che su clinic | percorso relativo, baseURL unica (rischio 3) | non toccare il file: riporta, serve la decisione T3 |
| Un metodo cerca un elemento che non c'e' sulla vetrina | inventari fusi anonimo/loggato (rischio 2) | riporta i due metodi; ripetere lo scout della vetrina da loggato non risolve, e' un limite di identita' della pagina |
| "Nessun indirizzo" al dry-run | nessun bersaglio selezionato | normale in dry-run; con `test:bersaglio clinic` deve sparire |
| Login automatico compila campi vuoti | variabile mancante in `.env` | `npm run targets` dice quali |
| `readyWhen` non scatta | testo troppo generico o dominio diverso da quello scritto | guarda l'indirizzo reale nella barra e correggi il testo |
| "Executable doesn't exist" | browser Playwright non scaricato | `npx playwright install chromium`, o usa Chrome/Edge |
| `npm ci` fallisce in `web-ui` | lockfile non allineato (noto) | riportalo, non aggirare con `npm install` senza dirlo |

## 7. Cosa NON fare

- Non implementare `origins`, `pageIdentity` per origine o `BasePage.navigate()`
  multi-dominio "per far passare la prova": e' la decisione T3, di Stefano.
- Non salvare sessioni, registrazioni o dizionari fuori da `reports/`.
- Non lanciare `confluence:fetch` o `confluence:publish` durante la demo: il
  primo legge pagine reali, il secondo **scrive** (in attesa di via libera, Q9).
- Non "sistemare" un selettore dentro uno step o nel file generato.
- Non lasciare credenziali reali in `bdd-targets.json` (il login usa `${VAR}`).
- Non dire "funziona" se non hai visto un test **verde** con il tuo output.

## 8. Cosa riportare a Stefano alla fine

Un elenco corto, senza indirizzi reali:

1. Quali passi della sezione 2 sono verdi.
2. Per la sezione 5: fino a quale passo e' arrivato il flusso, e dove si e'
   fermato, con l'errore **testuale**.
3. Quale rischio della sezione 4 si e' verificato (1–5), se uno.
4. Se serve l'opzione A (codice) o basta la B (due registrazioni).
5. Cosa c'e' ora di **salvato e verde** da mostrare come rete di sicurezza
   nella demo.
