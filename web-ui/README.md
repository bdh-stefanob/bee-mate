# BDD Catalog — desktop app

The tester dashboard, on a Next.js server packaged with Electron: Check-up,
Record, Scenarios, Run, Catalog. Specification in
`../docs/superpowers/specs/2026-09-22-cruscotto-tester-design.md`, user guide in
`../docs/TESTER-DASHBOARD-GUIDE.md`.

The root `/` redirects to `/controllo`. The addresses of the old portal (`/portale`, `/editor`, `/features`, `/components`, `/tags`, `/settings`) redirect to the dashboard (`next.config.ts`).

## Getting started

```bash
cd web-ui            # routes resolve the repository root from here
npm install
npm run dev          # http://localhost:3000
npm run electron:dev # the desktop app, in development
npm test             # vitest
npm run build
npm run electron:build:win   # Windows installer
```

## Pages

| URL | What it does |
|---|---|
| `/controllo` | machine status, environments, credentials, sign-in |
| `/registra` | records a session, shows what it understood, generates the test |
| `/scenari` | the saved scenarios and their last result; edit, move, delete, export |
| `/esecuzione` | runs the test, steps live, screenshot on failure |
| `/catalogo` | the steps, the page components they touch, what needs tidying up |

## API routes

| Method | Route | What it does |
|---|---|---|
| POST | `/api/esegui` | starts a command from the **closed list** (`src/lib/esecuzione.ts`), returns its id |
| GET | `/api/esegui` | the running operation, if any (so a screen can pick it up again) |
| GET | `/api/esegui/[id]/flusso` | events of the run (Server-Sent Events) |
| POST | `/api/esegui/[id]/ferma` | stops it |
| GET | `/api/controllo` | the machine diagnosis, structured |
| GET, POST | `/api/configurazione` | lists configured environments (names and status only); writes a variable to `.env` without ever reading its value back |
| POST, DELETE | `/api/configurazione/ambienti` | adds, updates and deletes an environment in `bdd-targets.json` |
| POST | `/api/configurazione/ambienti/login` | derives the sign-in block from a recording |
| POST | `/api/ambiente` | the environment chosen in the sidebar |
| GET | `/api/traccia`, `/api/traccia/ultima` | summary of a recording, read from the trace |
| GET | `/api/passi` | the steps of a test run, read from Cucumber's messages |
| GET | `/api/scenari` | runnable scenarios under `src/features/`, with their line numbers, for "What to run" |
| GET | `/api/scenari/cartelle` | applications and flows to suggest: the catalog's `app` / `area` plus existing folders |
| POST | `/api/scenari/salva` | moves the scenario just generated (read from the generation manifest, never from the window) to `src/features/<app>/<flow>/<name>.feature` |
| POST | `/api/lingua` | the window's language (cookie) |
| GET | `/api/scenari/contenuto` | the text of one scenario and the catalog's expressions, for editing |
| POST | `/api/scenari/anteprima` | previews an edit: what would change, and the two-level check |
| POST | `/api/scenari/modifica` | applies an edit (title, step, check, rename, move, delete, text), atomically |
| GET, POST | `/api/scenari/annulla` | the last edit that can be undone; undoes it |
| GET | `/api/scenari/esporta` | exports scenarios |
| GET | `/api/download` | downloads a `.feature` file (used by the Scenarios screen) |
| POST | `/api/lint` | validates Gherkin text (the advanced text editor) |
| GET | `/api/catalogo`, `/api/catalogo/stato` | the catalog and its freshness, for the Catalog screen |
| GET, POST | `/api/catalogo/fondi` | merges two phrases that mean the same (preview, apply) |
| GET, POST | `/api/catalogo/fondi/annulla` | the last merge; undoes it |
| GET, POST | `/api/catalogo/riconciliazione`, `/api/catalogo/riconcilia` | gives a new wording to a phrase that touches different elements (preview, apply) |
| GET | `/api/prova` | a finished run, read from its files, for "See the screenshot" |
| POST | `/api/suggerimenti`, `/api/suggerimenti/applica`, `/api/suggerimenti/annulla` | step-name suggestions for the last generated scenario, chosen by rules (no model, no network): prepare, apply, undo |

## Rules that apply here

- **No arbitrary commands.** The window sends a name and typed parameters;
  scripts start without a shell.
- **Results are read from artifacts**, never from console output.
- **One long-running command at a time**; an interrupted run stays recorded as
  interrupted.
- **No credential value** leaves the server: not in responses, logs or status
  files.
- **Every text in two languages**: `messages/en.json` and `messages/it.json`,
  checked by `npm run check:i18n` at the repository root.

## Stack

Next.js 15 (App Router) · React · Tailwind CSS v4 · shadcn/ui · CodeMirror ·
next-intl · Electron · Vitest.
