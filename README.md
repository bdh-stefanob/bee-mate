# BDD Automation Scaffold

A test-automation scaffold built on **Playwright + Cucumber.js + TypeScript**, paired with a desktop **BDD Catalog** app that lets the QA team browse, search, and compose Gherkin scenarios without touching the codebase directly.

---

## Table of Contents

1. [What this is](#what-this-is)
2. [Architecture](#architecture)
3. [BDD Catalog App — Pages & Features](#bdd-catalog-app--pages--features)
4. [Installation](#installation)
5. [Proposing steps to the catalog](#proposing-steps-to-the-catalog)
6. [Updates](#updates)
7. [Step Catalog](#step-catalog)
8. [Development Setup](#development-setup)

---

## What this is

This repository contains two things that work together:

| Part | What it does |
|---|---|
| **Scaffold** (`src/`) | Playwright + Cucumber.js test suite, 4-layer architecture, pre-commit validation |
| **BDD Catalog** (`web-ui/`) | Electron desktop app — browse steps, write feature files, push to GitHub |

The core idea: instead of every engineer inventing new step definitions, the team reuses steps from a shared catalog. The app makes reuse faster than writing from scratch. New steps go through a `@wanted` proposal flow and require team approval before implementation.

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

See `CONTRIBUTING.md` for the full coding standard.

---

## BDD Catalog App — Pages & Features

### Catalog (`/`)

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
- **No Node.js required** — the desktop app is fully standalone

### Step 1 — Clone the repository

```bash
git clone https://github.com/<org>/<repo>.git
```

### Step 2 — Download the installer

Go to the [Releases page](../../releases) and download the latest `BDD Catalog Setup x.x.x.exe`.

### Step 3 — Install

Run the installer. It does not require administrator rights and lets you choose the installation directory.

### Step 4 — First launch — Workspace picker

On the first launch, a folder picker dialog appears:

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
npx ts-node scripts/render-markdown.ts
```

> ⚠️ Do not run `npm run catalog` on this repository — it overwrites `step-catalog.json` from the implemented `.steps.ts` files, discarding all `@wanted` steps.

---

## Development Setup

Only needed if you want to contribute to the scaffold or the app.

### Scaffold

```bash
npm install
npx playwright install chromium
npm test              # run all scenarios
npm run test:dry      # dry-run — validate steps without executing
```

### BDD Catalog App (web-ui)

```bash
cd web-ui
npm install
npm run dev           # Next.js dev server at http://localhost:3000
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
