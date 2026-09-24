# BDD Automation Scaffold

A test-automation scaffold built on **Playwright + Cucumber.js + TypeScript**, paired with a desktop **BDD Catalog** app that lets the QA team browse, search, and compose Gherkin scenarios without touching the codebase directly — and turn a manual test run into a generated, runnable test without opening a terminal.

> **Start here:** [`docs/OVERVIEW.md`](docs/OVERVIEW.md) describes the whole project — problem, method, process, components, status and open decisions. [`ROADMAP.md`](ROADMAP.md) lists what comes next.

---

## Table of Contents

1. [What this is](#what-this-is)
2. [Architecture](#architecture)
3. [Tester dashboard](#tester-dashboard)
4. [BDD Catalog App — Pages & Features](#bdd-catalog-app--pages--features)
5. [Installation](#installation)
6. [Proposing steps to the catalog](#proposing-steps-to-the-catalog)
7. [Updates](#updates)
8. [Step Catalog](#step-catalog)
9. [Development Setup](#development-setup)

---

## What this is

This repository contains three things that work together around one shared step catalog (`step-catalog.json`):

| Part | What it does |
|---|---|
| **Scaffold** (`src/`) | Playwright + Cucumber.js test suite, layered architecture, pre-commit validation |
| **BDD Catalog app** (`web-ui/`) | Electron desktop app with two faces: the **tester dashboard** (check the machine, record a session, run the generated test) and the **portal** (browse steps, write feature files, push to GitHub) |
| **Anti-entropy toolchain** (`scripts/`) | measures how fragmented existing test cases are, prepares the monthly consolidation of the shared language, records manual sessions and generates feature files, Page Objects and step definitions from them — deterministically |

The core idea: testers from different areas describe the same behaviour in different words. A shared catalog gives them one vocabulary; a 15-minute monthly ritual makes variants converge without blocking anyone; and recording a manual test run turns it into a scenario written with the tester's own step names. AI assistants may propose, but deterministic judges (catalog validator, TypeScript compiler, Cucumber dry-run) decide.

New steps go through a `@wanted` proposal flow and require team approval before implementation.

---

## Architecture

The scaffold enforces a strict 4-layer separation:

```
src/
├─ features/          Gherkin .feature files — what the business does
│  └─ brochure-clinic/
│     ├─ login/
│     └─ registration/
├─ steps/             Thin glue — maps Gherkin phrase → action call
├─ actions/           Business intentions — reusable, no selectors
├─ pages/             Page Objects — selectors and UI mechanics only
├─ fixtures/          Test data builders
└─ support/           World + hooks
```

**Rule:** each layer talks only to the one below. Selectors never appear in step definitions. If the UI changes, you fix one Page Object.

Code generated from recordings lands in `src/features/generated/`, `src/steps/generated/` and `src/pages/generated/` (gitignored: it carries real page and component names) and uses three layers — steps call Page Objects directly. Whether the handwritten code stays at four layers is an open decision (see `docs/OVERVIEW.md` §9).

See `CONTRIBUTING.md` for the full coding standard.

---

## Tester dashboard

The first screen the app opens. Three entries in the sidebar, built for a manual tester working alone, with no terminal. User guide: [`docs/TESTER-DASHBOARD-GUIDE.md`](docs/TESTER-DASHBOARD-GUIDE.md).

| Screen | What the tester does | What happens underneath |
|---|---|---|
| **Check-up** (`/controllo`) | sees whether the machine is ready; adds environments, fills credentials, records the login once, logs in | structured diagnosis; writes `bdd-targets.json` and `.env` (both gitignored), never echoing a value |
| **Record** (`/registra`) | runs the test by hand, closes each step with *End intent*, marks checks with *Verify*, then presses *Generate the test* | `scripts/record.ts` writes a semantic trace (role + accessible name, not selectors); the screen shows what was understood, read from the trace; `scripts/generate.ts` writes feature, Page Objects and steps |
| **Run** (`/esecuzione`) | presses *Run the test*, optionally watching the browser or starting without the saved session | Cucumber runs on the chosen environment; steps turn green or red live; a failure shows the screenshot and the actual URL |

The working environment is chosen once, in the sidebar. English and Italian are available; the choice is kept in a cookie.

**Safety by design:** the dashboard only accepts a closed list of command names with typed parameters — never a string to execute — and launches scripts without a shell. Results are read from artifacts on disk (trace JSON, generation manifest, Cucumber messages), never from console output. One long-running command at a time.

---

## BDD Catalog App — Pages & Features

The portal is reachable from the dashboard sidebar (*Step catalog*).

### Catalog (`/portale`)

The home page. Displays all steps in the catalog as a searchable table.

- **Search bar** — filter by step expression, area, or page name
- **Area filter** — dropdown to narrow by functional area (e.g. `login`, `registration`)
- **Status filter** — `wanted` (proposed, not yet implemented) / `implemented` / `deprecated`
- **Click a row** — opens the Step Detail modal to view and edit parameter enums
- **Double-click a row** — opens the step in the Editor with the expression pre-loaded

### Editor (`/editor`)

The main authoring surface for writing `.feature` files.

- **CodeMirror editor** — Gherkin syntax highlighting, autocomplete triggered on `G`, `W`, `T` keypresses
- **StepBrowser panel** (right sidebar):
  - Filter pills **G / W / T** — show only Given, When, or Then steps
  - Area pills — filter by functional area
  - Text search — searches expression, area, and page name
  - Click a step to insert it at cursor; parametric steps open a value picker
- **Scenario outline panel** — lists all scenarios in the current file, numbered and collapsible; click to scroll to that scenario in the editor
- **Unknown step highlighting** — steps not found in the catalog are underlined in orange. Hover for a tooltip; click to open the proposal modal for that step
- **Propose step panel** — banner at the bottom counts unknown steps in the current file; "Proponi N step al catalogo" sends all of them to the `catalog` branch for review
- **Commit to GitHub** — pushes the current feature file to the configured branch (a confirmation dialog shows your identity and target branch before pushing)
- **Save** (`Ctrl+S` or Save button) — writes the `.feature` file to `src/features/{app}/{flow}/{slug}.feature`, derived from the `@app @flow` tags
- **State persistence** — draft survives navigation between pages (stored in `localStorage`)

### Features (`/features`)

Browse all existing `.feature` files in the repository.

- **App → Flow → File tree** — collapsible, organised by directory structure
- **Edit button** — loads the selected file into the Editor
- Each entry shows the feature name, number of scenarios, and tags

### Components (`/components`)

"If I change this component, how many steps depend on it?" — the reverse index from frontend components (role + accessible name) to the catalog steps that declare them. Only steps generated from a recording carry components today; hand-written steps are counted as *not anchored*.

### Tags (`/tags`)

Page tags aggregated across feature files, with how many steps and files use each one.

### Settings (`/settings`)

Configure integrations. All values are stored locally in `localStorage` — never committed to the repository.

**GitHub integration** (required to commit feature files and propose steps):

| Field | Description |
|---|---|
| GitHub Token | Personal Access Token with `repo` scope — [generate one here](https://github.com/settings/tokens) |
| Repository owner | Organisation or username that owns the repo (e.g. `my-org`) |
| Repository name | Repository name (e.g. `bdd-automation-scaffold`) |
| Branch | Branch where feature files are committed (default: `main`) |
| Catalog branch | Branch where step proposals are pushed for review (default: `catalog`) |

**Commit identity** (required to propose steps — your name appears in the Git commit):

| Field | Description |
|---|---|
| Commit name | Your display name (e.g. `Jane Smith`) |
| Commit email | Your GitHub email (e.g. `jane@company.com`) |

**Other integrations:**
- **Jira sync** — sync step proposals to Jira tickets (requires API token in `.env`)
- **Workspace path** — shows the currently selected repository folder

---

## Installation

### Prerequisites

- **Git** — to clone the repository ([git-scm.com](https://git-scm.com))
- **For the portal only**, no Node.js is required — the desktop app is standalone
- **For the tester dashboard**, the app runs the project's scripts on your clone, so the clone needs its dependencies (`npm install`) and a browser for Playwright (the *Check-up* screen can install it). Whether the executable should work without the repository is an open decision (U3 in `docs/OVERVIEW.md`)

### Step 1 — Clone the repository

```bash
git clone https://github.com/<org>/<repo>.git
```

### Step 2 — Download the installer

Go to the [Releases page](../../releases) and download the latest `BDD Catalog Setup x.x.x.exe`.

### Step 3 — Install

Run the installer. It does not require administrator rights and lets you choose the installation directory.

### Step 4 — First launch — Workspace picker

On the first launch, a folder picker dialog appears (the app then opens on the *Check-up* screen):

> *"Select the BDD project folder"*
> *(the folder must contain `step-catalog.json`)*

Navigate to the root of the cloned repository and select it. The app saves this path automatically — subsequent launches open directly without asking again.

### Resetting the workspace

Delete or edit `%APPDATA%\web-ui\bdd-settings.json` to force the picker to reappear on the next launch.

---

## Proposing steps to the catalog

When you write a scenario that uses a step not yet in the catalog, the editor highlights it with an **orange underline**.

**Two ways to propose:**

1. **Click the underlined step** → a modal opens pre-filled with the expression; select the functional area and click *Propose step*
2. **"Proponi N step al catalogo" button** (bottom banner) → sends all unknown steps in the file at once

Both methods push a `step-proposals.json` file to the `catalog` branch on GitHub, attributed to your commit identity. A confirmation dialog shows exactly *who* is committing and *where* before anything is pushed.

**After proposing:**
- The step appears in the catalog with a **Proposed** badge (orange)
- The maintainer reviews the `catalog` branch, adjusts expressions if needed, and merges `catalog → main`
- A developer implements the step definition and marks it `implemented`

> Steps on the `catalog` branch are visible to everyone in the app immediately — no need to wait for the merge.

---

## Updates

Releases are published automatically on GitHub via CI whenever a new version tag is pushed.

**To update:**

1. Go to the [Releases page](../../releases)
2. Download the new `BDD Catalog Setup x.x.x.exe`
3. Run the installer — it upgrades in place

**To publish a new release** (maintainers only):

```bash
git tag v1.2.3
git push origin v1.2.3
```

GitHub Actions builds the Windows installer and attaches it to the release automatically.

---

## Step Catalog

`step-catalog.json` is the source of truth for all known steps. It is version-controlled so the whole team shares the same catalog.

**Workflow for new steps:**

1. A QA engineer identifies a step that does not exist → flags it `@wanted` in the catalog
2. The team reviews and approves the expression
3. A developer implements the step definition (`.steps.ts`) and marks it `implemented`

`STEP_CATALOG.md` is a human-readable version generated from `step-catalog.json`:

```bash
npm run catalog
```

Regenerating keeps the `@wanted` entries: the code wins for what it defines, and requests that exist only in the catalog are preserved (`scripts/lib/catalog-merge.ts`). Steps generated from recordings also declare the frontend **components** they touch, so the portal can show how many scenarios depend on a component.

---

## Development Setup

Only needed if you want to contribute to the scaffold or the app.

### Scaffold

```bash
npm install
npx playwright install chromium
npm test              # run all scenarios
npm run test:dry      # dry-run — validate steps without executing
npm run check:all     # the toolchain's own checks
npm run diagnosi      # is this machine ready? (same checks as the dashboard)
```

The recording-to-test chain from a terminal, and setting it up on another machine: [`docs/anti-entropy/08-prova-su-altra-macchina.md`](docs/anti-entropy/08-prova-su-altra-macchina.md).

### BDD Catalog App (web-ui)

```bash
cd web-ui
npm install
npm run dev           # Next.js dev server at http://localhost:3000 (opens on /controllo)
npm test              # vitest
npm run electron:dev  # full Electron app in dev mode
npm run electron:build:win   # build Windows installer
```

### Pre-commit hook

The hook validates that every step used in `.feature` files exists in `step-catalog.json`. To bypass for Scenario Outline `<angle>` syntax:

```bash
SKIP_STEP_VALIDATION=1 git commit -m "..."
```

### Debug log (Electron)

`%APPDATA%\web-ui\debug.log` — written on every launch; useful for diagnosing startup issues.
