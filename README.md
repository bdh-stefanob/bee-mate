# BDD Automation Scaffold

A test-automation scaffold built on **Playwright + Cucumber.js + TypeScript**, paired with a desktop **BDD Catalog** app that lets the QA team turn a manual test run into a generated, runnable test, keep and edit the scenarios, and browse the shared step catalog — without opening a terminal.

> **Start here:** [`docs/OVERVIEW.md`](docs/OVERVIEW.md) describes the whole project — problem, method, process, components, status and open decisions. [`ROADMAP.md`](ROADMAP.md) lists what comes next.

---

## Table of Contents

1. [What this is](#what-this-is)
2. [Architecture](#architecture)
3. [Tester dashboard](#tester-dashboard)
4. [Installation](#installation)
5. [Updates](#updates)
6. [Step Catalog](#step-catalog)
7. [Development Setup](#development-setup)

---

## What this is

This repository contains three things that work together around one shared step catalog (`step-catalog.json`):

| Part | What it does |
|---|---|
| **Scaffold** (`src/`) | Playwright + Cucumber.js test suite, layered architecture, pre-commit validation |
| **BDD Catalog app** (`web-ui/`) | Electron desktop app: the **tester dashboard** (check the machine, record a session, keep and edit the scenarios, run the generated test, browse the step catalog) |
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

Code generated from recordings first lands in `src/features/generated/`, `src/steps/generated/` and `src/pages/generated/` (gitignored). When the tester **saves** a scenario from the dashboard, the feature, its steps and its Page Objects move into the versioned tree — `src/features/<app>/<flow>/`, `src/steps/<app>/<flow>/`, `src/pages/<app>/` — so the UI test framework grows with every saved recording. Page Objects are shared per application: a new scenario adds the methods it needs and never removes one. Generated code uses three layers — steps call Page Objects directly. Whether the handwritten code stays at four layers is an open decision (see `docs/OVERVIEW.md` §9).

See `CONTRIBUTING.md` for the full coding standard.

---

## Tester dashboard

The first screen the app opens. Five entries in the sidebar, built for a manual tester working alone, with no terminal. User guide: [`docs/TESTER-DASHBOARD-GUIDE.md`](docs/TESTER-DASHBOARD-GUIDE.md).

| Screen | What the tester does | What happens underneath |
|---|---|---|
| **Check-up** (`/controllo`) | sees whether the machine is ready; adds environments, fills credentials, records the login once, logs in | structured diagnosis; writes `bdd-targets.json` and `.env` (both gitignored), never echoing a value |
| **Record** (`/registra`) | runs the test by hand, closes each step with *End intent*, marks checks with *Verify*, then presses *Generate the test* | `scripts/record.ts` writes a semantic trace (role + accessible name, not selectors); the screen shows what was understood, read from the trace; `scripts/generate.ts` writes feature, Page Objects and steps |
| **Scenarios** (`/scenari`) | sees the saved scenarios and how each went the last time; edits one (title, steps, checks, rename, move, delete, or its text), with Undo | every change is checked with a Cucumber dry run before anything is written; the steps and Page Objects move with the scenario; nothing is saved if the test would not run |
| **Run** (`/esecuzione`) | presses *Run the test*, optionally watching the browser or starting without the saved session | Cucumber runs on the chosen environment; steps turn green or red live; a failure shows the screenshot and the actual URL |
| **Catalog** (`/catalogo`) | browses the steps and the page components they touch; merges duplicate phrases and fixes ambiguous ones | reads `step-catalog.json`; rewrites scenarios and steps when phrases are merged or renamed, with Undo |

The working environment is chosen once, in the sidebar. English and Italian are available, and so are a light and a dark theme; the choices are kept in the window.

**Safety by design:** the dashboard only accepts a closed list of command names with typed parameters — never a string to execute — and launches scripts without a shell. Results are read from artifacts on disk (trace JSON, generation manifest, Cucumber messages), never from console output. One long-running command at a time.

---

## Installation

### Prerequisites

- **Git** — to clone the repository ([git-scm.com](https://git-scm.com))
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

Regenerating keeps the `@wanted` entries: the code wins for what it defines, and requests that exist only in the catalog are preserved (`scripts/lib/catalog-merge.ts`). Steps generated from recordings also declare the frontend **components** they touch, so the Catalog screen can show how many scenarios depend on a component.

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
