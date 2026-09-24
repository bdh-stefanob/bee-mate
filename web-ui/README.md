# BDD Catalog — app desktop

L'app ha due facce sullo stesso server Next.js, impacchettato con Electron:

- il **cruscotto** per il tester manuale: Controllo, Registra, Esecuzione.
  Specifica in `../docs/superpowers/specs/2026-09-22-cruscotto-tester-design.md`,
  guida d'uso in `../docs/GUIDA-CRUSCOTTO.md`;
- il **portale** per scrivere scenari con il catalogo: catalogo, editor, feature,
  componenti, tag, impostazioni. Guida d'uso in `../docs/USER-GUIDE.md`.

La radice `/` reindirizza a `/controllo`.

## Avvio

```bash
cd web-ui            # le rotte risolvono la radice del repository da qui
npm install
npm run dev          # http://localhost:3000
npm run electron:dev # l'app desktop, in sviluppo
npm test             # vitest
npm run build
npm run electron:build:win   # installatore Windows
```

## Pagine

| URL | Gruppo | Cosa fa |
|---|---|---|
| `/controllo` | cruscotto | stato della macchina, ambienti, credenziali, accesso |
| `/registra` | cruscotto | registra una sessione, mostra cosa ha capito, genera il test |
| `/esecuzione` | cruscotto | lancia il test, passi in tempo reale, schermata al fallimento |
| `/portale` | portale | catalogo degli step, cercabile e filtrabile |
| `/editor` | portale | editor Gherkin con autocomplete vincolato al catalogo |
| `/features` | portale | i `.feature` del repository, per applicazione e flusso |
| `/components` | portale | per ogni componente di frontend, quanti step lo usano |
| `/tags` | portale | tag delle pagine, con step e file che li usano |
| `/settings` | portale | integrazioni (GitHub, Jira), identita' di commit |

## Rotte API

**Cruscotto**

| Metodo | Rotta | Cosa fa |
|---|---|---|
| POST | `/api/esegui` | avvia un comando dell'**elenco chiuso** (`src/lib/esecuzione.ts`), restituisce l'id |
| GET | `/api/esegui` | l'operazione in corso, se c'e' (per riprenderla tornando sulla schermata) |
| GET | `/api/esegui/[id]/flusso` | eventi dell'esecuzione (Server-Sent Events) |
| POST | `/api/esegui/[id]/ferma` | interrompe |
| GET | `/api/controllo` | la diagnosi della macchina, strutturata |
| GET, POST | `/api/configurazione` | elenca gli ambienti configurati (solo nomi e stato); scrive una variabile in `.env`, senza mai rileggerne il valore |
| POST, DELETE | `/api/configurazione/ambienti` | aggiunge, modifica ed elimina un ambiente in `bdd-targets.json` |
| POST | `/api/configurazione/ambienti/login` | ricava il blocco di accesso da una registrazione |
| POST | `/api/ambiente` | l'ambiente scelto nella barra laterale |
| GET | `/api/traccia`, `/api/traccia/ultima` | il riepilogo di una registrazione, letto dalla traccia |
| GET | `/api/passi` | i passi di un test, letti dai messaggi di Cucumber |
| POST | `/api/lingua` | la lingua della finestra (cookie) |

**Portale**

| Metodo | Rotta | Cosa fa |
|---|---|---|
| GET | `/api/catalog` | `step-catalog.json` |
| POST | `/api/catalog/propose` | propone step nuovi (`@wanted`) |
| GET, POST | `/api/features` | elenca e salva i `.feature` |
| POST | `/api/features/move` | sposta un `.feature` |
| POST | `/api/lint` | valida un testo Gherkin |
| POST | `/api/import` | importa scenari da testo |
| GET | `/api/download` | scarica un `.feature` |
| PUT | `/api/enums` | aggiorna i valori ammessi di un parametro |
| GET | `/api/tags` | aggregato dei tag |
| GET | `/api/git/status` | stato del repository |
| POST | `/api/github/push` | commit su GitHub |
| POST | `/api/jira/sync` | sincronizzazione con Jira |

## Regole che valgono qui

- **Nessun comando arbitrario.** La finestra manda un nome e parametri
  tipizzati; gli script partono senza shell.
- **I risultati si leggono dagli artefatti**, mai dall'output a schermo.
- **Un comando lungo alla volta**; un'esecuzione interrotta resta registrata
  come interrotta.
- **Nessun valore di credenziale** esce dal server: ne' in risposta, ne' nei
  log, ne' nei file di stato.
- **Ogni testo in due lingue**: `messages/en.json` e `messages/it.json`,
  controllati da `npm run check:i18n` nella radice.

## Stack

Next.js 15 (App Router) · React · Tailwind CSS v4 · shadcn/ui · CodeMirror ·
next-intl · Electron · Vitest.
