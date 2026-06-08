# BDD Automation Scaffold

A greenfield test-automation scaffold: **Playwright + Cucumber.js + TypeScript**,
built around a 4-layer architecture and an anti-noise step standard. The demo
domain is generic (auth + orders) — replace it with your real flows.

## Why this exists

Starting an automation suite from zero is the moment architecture matters most.
Without a standard, every engineer writes steps their own way and the suite fills
with near-duplicate steps nobody can find — **step noise**. This scaffold makes
the right way the easy way: reuse an existing step is faster than writing a new
one. See `CONTRIBUTING.md` for the standard.

## Architecture (4 layers)

```
src/
├─ features/   .feature files (Gherkin)   — what the business does
├─ steps/      thin glue                   — phrase → action call
│  ├─ common/  shared steps (e.g. login)
│  ├─ auth/
│  └─ orders/
├─ actions/    business intentions         — reusable, no selectors
├─ pages/      Page Objects                 — selectors, UI mechanics
├─ api/        API clients                  — endpoints (BE, future)
├─ fixtures/   test data builders
└─ support/    World + hooks
```

Each layer talks only to the one below. A Gherkin step maps to ONE action; if
the UI changes, you fix one Page Object.

## Setup

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm test          # run all scenarios
npm run test:dry  # dry-run (validate steps without executing)
npm run catalog   # regenerate STEP_CATALOG.md from the code
```

HTML report lands in `reports/cucumber-report.html`.

## The step catalog

`STEP_CATALOG.md` is generated from the step definitions — never written by hand,
so it cannot drift. It lists every step, its parameters, its `@intent`
documentation, and a link to the implementation (file:line). Run `npm run catalog`
or wire it into CI (see `.github/workflows/`).

## Demo domain note

The `auth` and `orders` features are a **generic placeholder** to demonstrate the
patterns (declarative login reused across domains, optional data tables,
parameterised Scenario Outlines). Replace them with your real business flows when
the project starts for real.

## What to wire up for a real project

- `actions/auth.actions.ts` → connect `ensureRegisteredUser` to your test-data
  seeding (API client or fixture factory).
- `pages/*` → real selectors for your app.
- `playwright.config.ts` → real `BASE_URL`.
- CI → run `npm test` on PR and `npm run catalog` on merge.
