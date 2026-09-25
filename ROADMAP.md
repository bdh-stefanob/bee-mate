# Roadmap — BDD Automation Scaffold

> Working document for the agent (Claude Code, Kiro) and for anyone joining the
> project. It says **what to build next**, in which **order**, and above all
> **what NOT to build**. Read it before proposing architecture or features.
>
> The full picture (problem, method, process, building blocks) is in
> [`docs/OVERVIEW.md`](docs/OVERVIEW.md). This file holds priorities only.
>
> Updated 2026-09-24.

---

## 1. Where we are

The project went through three phases:

| Phase | When | Goal | Outcome |
|---|---|---|---|
| **M1 — Scaffold and authoring app** | June 2026 | show the manager a shared step catalog instead of a notepad | ✅ desktop app with catalog and constrained editor, validator, VS Code extension, scenario import, Jira sync |
| **Anti-entropy** | 3–22 September | measure the entropy of real test cases and make it converge; Specification by Demonstration | ✅ full chain: read the wiki → measure → catalog → record → generate → test. Details in `docs/anti-entropy/` |
| **Tester dashboard** | 22–24 September | make the chain usable without a terminal | ✅ MVP of the three screens, refined through use. Spec in `docs/superpowers/specs/` |

**Next milestone: the demo to the seniors** (mid October 2026). The script
is in `docs/anti-entropy/03-piano-demo.md`, the material in
`docs/PRESENTATION.md`.

---

## 2. Core principle: deterministic calibration

> Step reuse must NOT depend on testers' goodwill or memory, nor on a model's
> probabilistic suggestions.

The guarantee lives in deterministic mechanisms:

1. **Constrained autocomplete**: editors (desktop app, VS Code) suggest ONLY
   steps that exist in `step-catalog.json`. They look up, they do not generate.
2. **Structural validation**: every step of a `.feature` is matched against the
   catalog. Exact → ok. Similar to an existing one → warning with a
   suggestion. New → blocked (pre-commit hook).
3. **Code judges**: `tsc`, Cucumber dry-run, `validate:steps`. AI produces,
   judges decide (D6).

**September change (D17):** variants are no longer blocked while people write
on the wiki. They are recorded and converge afterwards, through the monthly
ritual that elects the Gold. Blocking stays on the repository; the wiki gets
measurement.

LLMs (Kiro, Amazon Q, Copilot, Claude) are there for **speed**, not for
**guarantees**.

---

## 3. Architecture

```
                        step-catalog.json  (single source of truth)
                                 |
   +-----------------+-----------+-----------+------------------+
   |                 |                       |                  |
 Wiki (where        Desktop app            VS Code            Assistant
 people write)      - dashboard            - extension         - rules
 - observatory        Check-up             - pre-commit hook   - agents
 - queue + ritual     Record                                   - generated
 - publishing (Q9)    Run                                        brief
                    - portal
                      catalog, editor
   |                 |                       |                  |
   +-----------------+-----------+-----------+------------------+
                                 |
             Repository: features/ → steps/ → actions/ → pages/
                                 |
                  Execution (Playwright + Cucumber)
```

Each block, with where it lives in the code: `docs/OVERVIEW.md` §7.

---

## 4. Next steps, in order

The order comes from the demo: first what unblocks it, then what makes it
credible, then the rest.

| # | What | Why now | Estimate | Reference |
|---|---|---|---|---|
| 1 | **Housekeeping**: align the `web-ui` lockfile; make the two machine-bound test cases portable; recorder bar in both languages (it shows "Fine intento" / "Verifica" while the app says "End intent" / "Verify") | `npm ci` fails on a clean machine; the tester sees two languages at once | ½ d | task 16 |
| 2 | **A row inside a list**: the recorder stores what distinguishes the row; the generator emits a two-level locator | this is where the generated test stops; it unblocks act 5 of the demo | 1–2 d | task 14 |
| 3 | **One home for every scenario** (proposal below) | generated scenarios stay on one machine, outside the `<app>/<flow>` tree, and cannot be picked individually | 1–2 d, after decisions S1–S3 | OVERVIEW §6 |
| 4 | **Presentation material**: deck, written document, tester one-pager | "do not leave it for last" | 1.5 d | `docs/PRESENTATION.md` |
| 5 | **Close the ritual**: `catalog-apply` (records decisions) and `catalog-refactor` (rewrites variants, mandatory preview) | without them the ritual elects the Gold but never brings it into scenarios | 1–2 d | task 15 |
| 6 | **Catalog content**: elect the first Gold phrases from the corpus | 127 of 137 entries are `@wanted` | 1 d | `03-piano-demo.md` |
| 7 | **Typed checks**: value, appeared, disappeared, navigated | better generated assertions | ½–1 d | task 7, D16 |
| 8 | A scenario already in the repository fails the validator | it blocks whoever touches it | ½ d | task 13 |
| 9 | Package the VS Code extension (`.vsix`) | today it installs only from source | ½ d | old 5.6 |
| 10 | **Dashboard fixes from the 25 September walkthrough**: readable failures, sidebar in sync, no terminal commands, one language | a tester cannot tell why a step failed; four batches, F1–F20 | 3.5–4 d | task 18, `docs/reviews/2026-09-25-dashboard-walkthrough.md`, issues #1–#4 |

### Item 3: one home for every scenario

**Decided on 2026-09-24:** S1 the versioned tree, S2 the catalog's `app` and
`area`, S3 overwrite only while the generation marker is still there.

| Part | Status |
|---|---|
| After "Generate the test", the Record screen asks application, flow and name, and moves the file to `src/features/<app>/<flow>/<name>.feature` with `@app @flow` tags (the `@generato` tag and the generation marker stay) | ✅ done 2026-09-24 |
| Suggestions come from the catalog's `app` / `area` and from existing folders; a new value can be typed | ✅ |
| A destination still carrying the marker is overwritten; a hand-edited one is left alone and the new file goes next to it (`-2`) | ✅ |
| "Keep it with the recorded scenarios" leaves it in `src/features/generated/`, as before | ✅ |
| The Run screen picks what to run: all recorded scenarios (both still in `generated/` and already moved, found by the `@generato` tag), one file, or one scenario; after saving, the new scenario is preselected | ✅ |
| **Glue of saved scenarios** — decided 2026-09-24: versioned too. Steps go to `src/steps/<app>/<flow>/<name>.steps.ts`; Page Objects to `src/pages/<app>/`, shared: an existing one is reused, or **grows** with the missing methods, never loses one; a hand-edited one is never touched. A phrase already defined by another saved scenario stops the save and is listed. Everything is planned before anything is written. The generic check step now lives once in `src/steps/common/verifica.steps.ts` | ✅ done |
| Reusing an existing step definition instead of stopping on a duplicate phrase (needs Page Objects held by the World instead of module variables) | ⬜ |
| Refresh the catalog after generating | ⬜ |
| Pick a whole flow or application in Run | ⬜ |

**Waiting on a decision** (see §6): two domains (task 3), numeric segments
(task 4), 3 or 4 layers (task 11), executable without the repository (U3), versioning the glue of saved
scenarios (item 3).

**Waiting on the work machine:** field trials P3–P9
(`docs/anti-entropy/10-prove-sul-campo.md`). The most important is **P4**: a
colleague uses the dashboard with no explanation.

---

## 5. What NOT to do

- ❌ **Custom run dashboards**: results are read in the dashboard and in
  Cucumber's reporter.
- ❌ **Free generative AI for testers in the editor**: it breaks calibration.
  Autocomplete only looks up the catalog. AI is for drafts, constrained by the
  generated brief.
- ❌ **Selectors inside steps**: respect the layers (see `CONTRIBUTING.md`).
- ❌ **Duplicate steps "for speed"**: the pre-commit hook is there for this.
- ❌ **Writing `STEP_CATALOG.md` by hand**: it is generated.
- ❌ **Generating step bodies with a model**: the deterministic generator
  writes the skeleton; logic cannot be inferred from text.
- ❌ **A backend with a database**: everything comes from `step-catalog.json`
  and files on disk.
- ❌ **Automatic mass rewriting**: preview and diff, always (D19).
- ❌ **Naming people** in reports, queues or slides: attribution is by area (D15).
- ❌ **Arbitrary commands from the window**: the dashboard accepts only a
  closed list of names with typed parameters, never a string to execute.
- ❌ **A command where a button can be**: the tester never sees a terminal.
- ❌ **Taking application data off the machine**: recordings, dictionaries
  and sessions stay in `reports/` (gitignored); only numeric reports leave.
- ❌ **Credentials in environment files or commits**: only `${VARIABLE}`,
  with values in `.env`.

---

## 6. Open decisions

The full list, with who decides, is in `docs/OVERVIEW.md` §10. The main ones:

- **U1** product name · **U2** where the tester's work ends up · **U3**
  executable without the repository · **U4** a product for others
- **S1–S3** where scenarios live (above)
- **T3** two domains · **T4** numeric segments · **T11** 3 or 4 layers
- **Q5** who owns the ritual · **Q9** publishing to the wiki · **Q10** company
  remote

---

## 7. Quick start for the agent

When you open a session on this repository:

1. Read `docs/OVERVIEW.md` for the picture, `CONTRIBUTING.md` for the
   architectural rules, this file for priorities.
2. Asked for a feature or scenario: first `npm run catalog`, then propose
   existing steps only. New steps → `@wanted` and team approval.
3. Asked to work on the dashboard: the spec is
   `docs/superpowers/specs/2026-09-22-cruscotto-tester-design.md`; the lessons
   learned are in the commit messages of the `cruscotto-tester` branch.
4. Asked to change the architecture: ask for explicit confirmation.
5. Before closing any work: `npx tsc --noEmit`, `npm run check:all`,
   `npm run rules:check` at the root; `npm test` and `npm run build` in
   `web-ui`.

**Commit convention:** Conventional Commits (`feat:`, `fix:`, `chore:`,
`docs:`, `test:`).

---

## Appendix — The June roadmap, item by item

For anyone who finds references to the old numbers.

| Item | What it was | Status |
|---|---|---|
| 5.0a | Import plain-text scenarios | ✅ `scripts/import-scenarios.ts`, import from the app |
| 5.0b | Web authoring app | ✅ became the desktop app (Next.js + Electron) |
| 5.0c | UI/UX review | ❔ no record of a formal review; the dashboard has accessibility requirements in its spec, checked by hand |
| 5.1 | Static catalog site | ⏭ not done: the catalog is browsed in the app and published to the wiki (D8) |
| 5.2 | Pre-commit hook | ✅ `.husky/pre-commit` → `validate:steps`, with similarity warning |
| 5.3 | `feature-author` skill | ⏭ replaced by the Kiro agents (`bdd-generate`, `bdd-authoring`) and the generated brief |
| 5.4 | Documented VS Code setup | 🟡 the extension covers completion; no versioned `.vscode/` |
| 5.5 | Published HTML reporter | ⏭ superseded: results are read in the dashboard |
| 5.6 | VS Code extension | 🟡 completion, diagnostics, hover, tree; no `.vsix` package yet |
| 5.7 | Harvest from existing `.feature` files | ✅ in another form: `analyze:corpus` and `catalog:sync` work on the wiki and on `.feature` folders |
| 5.8 | Jira integration | ✅ `jira:sync`, `jira:fetch` |
