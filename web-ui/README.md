# BDD Catalog — desktop app

The app has two faces on the same Next.js server, packaged with Electron:

- the **dashboard** for manual testers: Check-up, Record, Run.
  Specification in `../docs/superpowers/specs/2026-09-22-cruscotto-tester-design.md`,
  user guide in `../docs/TESTER-DASHBOARD-GUIDE.md`;
- the **portal** for writing scenarios with the catalog: catalog, editor,
  features, components, tags, settings. User guide in `../docs/USER-GUIDE.md`.

The root `/` redirects to `/controllo`.

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

| URL | Group | What it does |
|---|---|---|
| `/controllo` | dashboard | machine status, environments, credentials, sign-in |
| `/registra` | dashboard | records a session, shows what it understood, generates the test |
| `/esecuzione` | dashboard | runs the test, steps live, screenshot on failure |
| `/portale` | portal | step catalog, searchable and filterable |
| `/editor` | portal | Gherkin editor with catalog-only autocomplete |
| `/features` | portal | the repository's `.feature` files, by application and flow |
| `/components` | portal | for each UI component, how many steps use it |
| `/tags` | portal | page tags, with the steps and files that use them |
| `/settings` | portal | integrations (GitHub, Jira), commit identity |

## API routes

**Dashboard**

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

**Portal**

| Method | Route | What it does |
|---|---|---|
| GET | `/api/catalog` | `step-catalog.json` |
| POST | `/api/catalog/propose` | proposes new steps (`@wanted`) |
| GET, POST | `/api/features` | lists and saves `.feature` files |
| POST | `/api/features/move` | moves a `.feature` file |
| POST | `/api/lint` | validates Gherkin text |
| POST | `/api/import` | imports scenarios from text |
| GET | `/api/download` | downloads a `.feature` file |
| PUT | `/api/enums` | updates the allowed values of a parameter |
| GET | `/api/tags` | tag aggregate |
| GET | `/api/git/status` | repository status |
| POST | `/api/github/push` | commit to GitHub |
| POST | `/api/jira/sync` | Jira sync |

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
