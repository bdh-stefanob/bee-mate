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
| **M1 — Scaffold and authoring app** | June 2026 | show the manager a shared step catalog instead of a notepad | ✅ desktop app with catalog and constrained editor (the "portal": removed on 2 October 2026, see item 11), validator, VS Code extension, scenario import, Jira sync |
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
 - publishing (Q9)    Scenarios (edit)                           brief
                      Run
                      Catalog
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
| 11 | **Old portal removed** (job N5): pages, routes, components, libraries and the `sonner` dependency are gone; the old addresses redirect to the dashboard; the token and drafts it left in the window's storage are cleaned at first start | the dashboard now edits scenarios (title, steps, checks, rename, move, delete, text) and has the catalog and the theme selector | ✅ done 2026-10-02, except: **product name change waits for U1** (see `docs/superpowers/specs/2026-10-01-modifica-scenari-e-dismissione-portale-design.md` B10); `step-enums.json` stays, with no readers (M9); the `catalog` branch cycle on GitHub is left as it is (M10) | spec B |

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

### Parked observation — test IDs (`data-testid`)

*Raised 2026-10-02, from a colleague.* Stable test IDs would make the automation
more robust than role + accessible name: a name changes with wording or language,
repeats (`Select Pharmacy` once per pharmacy) or is meaningless (a field named "0").

**Not actionable today:** we cannot ask the app team to add them. Kept here so it
is not lost. Two cautions for whoever picks it up: it means a dedicated attribute,
not the HTML `id` (framework ids like `ng-17` change on every build); and IDs alone
do not fix the map pins or the repeated questionnaire pages: those need recipes.

**If it becomes possible:**
1. the scout records `data-testid` when present and the generator prefers it over
   role + name;
2. the stability judgement lists the critical components that have none, as a
   concrete list to bring to the developers;
3. where there is no ID, role + name stays, plus the recipes.

### Open — recipes for complex behaviours

*Raised 2026-10-02, from the fake-app run (`npm run check:app-finta`).* Some
behaviours are not one gesture on one component, and generating them as a list
of gestures produces code that happens to work on the recorded path and nothing
more. The two cases we have measured:

- **Map pins.** `div.custom-marker` has no role and no accessible name. The
  recorder now records the click and the generator anchors it to the CSS class,
  declaring it `unnamed` — honest, but a class is an implementation detail, and
  on a real map library the click needs `page.mouse.click` plus a scroll and a
  `resize` (the library only draws the visible area). Reference that works:
  `uiautomationpwpoc/src/test/page-objects/JetLagDeliveryPage.ts`.
- **A photo taken twice.** Take Picture → Save → That's me, repeated until the
  page says it has enough. Generated as six gestures it is six gestures; as a
  behaviour it is "provide two photos", and the number belongs to the data.

A recipe would be a behaviour declared once in `templates/`, recognised by a
signature over the recorded gestures, with its values (postcode, answers, how
many photos) outside the steps. **Not done:** recognising the signature is where
this can go wrong silently, and nothing is worse than a recipe that fires on the
wrong page. What exists today is the declaration — the generator says, for every
gesture with no accessible anchor, that a recipe is what is missing there.

### Next — one action, one implementation (agreed 2026-10-15, not started)

**Rule:** two steps are the same action when they are built from the same
parts (utility or page method) with the same fixed values, whatever their
text. A composite step is never merged with a simple one, and a scenario is
never split automatically. The same action has one implementation. The
`.feature` text may differ, but a catalog merge must be able to bring it back to
one phrase, updating every test case without breaking anything.

1. **Generation.** If the same phrase is already saved, reuse it and emit no
   definition. If the phrase differs but the action is certainly the same, the
   step becomes one line calling the same action, marked
   `@stessa-azione-di "<catalog phrase>"`, and the catalog shows the pair as a
   duplicate. If only the text is similar, nothing happens here.
2. **Merging afterwards.** The merge must work for phrases with parameters and
   with definitions in different files. Values are carried over into every
   `.feature`. The merge is refused when the parameters do not match.
3. **"Without breaking anything".** A dry-run of all scenarios runs after the
   merge, with an automatic undo on any undefined or ambiguous step. A real
   rerun on the environment is a separate button.
4. **Small extras.** Warn when a scenario being saved duplicates one already
   saved. Write no steps file when it would be empty.

**Proof:** on clinic, three login phrases call `accediAClinic` and two
questionnaire phrases call `rispondiQuestionario`. Read the step bodies first.
Hair loss lands on `/account/visit-history`: a different action, so it is not
merged. Merge the valid pairs, then rerun Weight Loss, Hair loss and the
sentinel on QA.

### Parked until after the demo — a generated codebase that converges

*Raised 2026-10-15.* Every saved recording adds files, and the result grows
instead of converging. There is one page per URL rather than one per concept
(`questions`, `questions1`, `questions2` sit next to the hand-written
`questionario`). Steps are owned by whichever scenario was saved first. The same
app also appears under two names (`clinic`, `qa-brochure`). The code will be
maintained mostly by agents (Kiro, plus a repair agent started from the
dashboard) and by SDETs for structural work. So no change to a shared part may
land without proof. Four sub-projects, in this order, each with its own spec:

1. **S1, converging structure.** One page per concept, shared steps with a clear
   home and owner, no duplicate scenarios, and a clear line between what the
   machine owns and what people own.
2. **S2, the guard.** Every change to a shared part works out which scenarios it
   touches, reruns them, and accepts or rejects the change. This applies to the
   dashboard, to Kiro (hook or CI) and to SDETs. Owner's choice: update the
   existing method only after the scenarios using it pass again.
3. **S3, recognising change.** When the app changes, tell "same element, new
   name" apart from "element gone", at record time and at run time.
4. **S4, the repair agent.** See `2026-10-01-assistente-nel-cruscotto-design.md`.
   Blocked on Q-A1.

**Not now:** the focus until the demo is record → generate → run.

### Open — guided recording (catalog steps offered while navigating)

*Raised 2026-10-15, after two testers wrote the same phrase on purpose.* Saving
now reuses a phrase that is already defined (the catalog wins) and stops only
when the arguments differ. The next step is to avoid the duplicate at the
source. While the tester navigates the selected application, the dashboard
lists the catalog steps that act on the current page. Clicking one runs it in
the recording browser and inserts it into the recording, already resolved. The
rest is recorded by hand, as it is today. **Not designed yet.** The hard part is
running a step inside the recording browser with the scenario's state (World,
session, environment). It needs a spec before any code.

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
