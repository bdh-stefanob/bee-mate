# Project overview

> **The entry point.** This document describes the whole project: the
> problem, the method, the process, the building blocks, where things stand
> and what is missing. The reasoning behind each choice lives in the documents
> listed in §11. Slides and written documents are built **from here**.
>
> Updated 2026-09-24, branch `cruscotto-tester`.

---

## 1. In one sentence

**Give testers a shared language for test cases, let it converge without
blocking anyone, and measure that it converges.** On top of that, turn a
tester's manual run into a scenario and an automated test, without the tester
having to learn Gherkin or code.

---

## 2. The problem

Testers from different areas write test cases in Gherkin-like form on wiki
pages, with no shared vocabulary and no single source of truth. The same
behaviour is described in many different ways, and reusing costs more than
rewriting.

Measured on the real corpus (numbers only, no content):

| Measure | Value | How to read it |
|---|---|---|
| Reuse ratio, branch A | **0.72** (569 steps, 409 different phrasings) | 1.0 = no reuse at all |
| Reuse ratio, branch B | **0.85** (279 steps, 238 different phrasings) | 85 in 100 steps written from scratch |
| Variety removed by grouping similar phrasings | **14%** | it is not paraphrasing: there is **no vocabulary** |
| Intentions that appear only once | **246 of 353** | |
| Coverage with 107 shared steps | **57%** of branch A | the headline number |
| Where the test cases live | **two unconnected branches** | no shared source of truth |

### Where the numbers come from

| Numbers | Source | Where the evidence is |
|---|---|---|
| Reuse ratio, intentions, coverage | Test cases read from Confluence (two branches, REST API, read-only), then `npm run analyze:corpus`: normalisation, grouping by similarity, counts | Full results stay on the work machine under `reports/` (gitignored). The counts were copied into `docs/anti-entropy/README.md` (facts F11–F13) in early September 2026 |
| Catalog size and status | `step-catalog.json` in this repository: 137 entries, 10 implemented, 127 wanted | the file itself |
| Recording and test results | Field trials on the real application, 16–22 September | `docs/anti-entropy/10-prove-sul-campo.md` |
| Accessibility of pages | Page inventories | `referti/` (numbers only) |

The current catalog did **not** produce the entropy numbers: they measure what
testers wrote on the wiki. The catalog was seeded later from the groups that
analysis found.

---

## 3. The method

Four ideas. The reasoning for each is in `docs/anti-entropy/README.md`
(decisions D1–D39).

1. **A shared catalog as the contract** (D3, D13). The step catalog
   (`step-catalog.json`) is the source; automation consumes it. It is seeded
   from phrases testers already wrote, not designed from scratch.
2. **Converge afterwards, do not block upfront** (D17, D21). Nobody waits for
   an approval to write. Variants are recorded and, once a month, the canonical
   wording (the **Gold**) is elected with a transparent scoring matrix. The
   declared cost: entropy goes up before it goes down.
3. **A tiny ritual** (D18). Fifteen minutes a month, two or three people,
   inside a meeting that already exists. Decisions are taken asynchronously in
   the three days before; people write only to disagree.
4. **Specification by Demonstration** (D9, D10). A business expert's manual
   run *is* the specification. It is recorded as a semantic trace (role +
   accessible name, not CSS selectors), and scenario and automation are
   derived from it, in the tester's own words.

One principle holds them together:

> **AI proposes, deterministic judges decide** (D6, D23). The catalog
> validator judges phrases, the TypeScript compiler judges code, Cucumber's
> dry-run judges the wiring. No guarantee of the system depends on a model.

---

## 4. The process

Three cycles share one object: the catalog.

```mermaid
flowchart TB
    subgraph L["1. Language — monthly"]
        W[Wiki pages<br/>written test cases] -->|read-only| O[Observatory<br/>normalise · group · measure]
        O --> Q[Approval queue<br/>one proposal, one reason, one example]
        Q -->|15 minutes a month| R[Ritual<br/>elects the Gold]
        R --> C
    end

    C[(Step catalog<br/>step-catalog.json)]

    subgraph A["2. Writing — daily"]
        C --> E[Constrained editor<br/>desktop app · VS Code]
        E --> V{Validator<br/>does the phrase exist?}
        V -->|yes| F[conforming .feature]
        V -->|known variant| S[suggests the Gold]
        V -->|new| P[@wanted proposal]
        P --> Q
    end

    subgraph D["3. From demonstration to test — dashboard"]
        T[Tester runs the test by hand] -->|Record| TR[Semantic trace<br/>named steps · checks]
        TR -->|Generate the test| G[Feature + Page Objects + steps<br/>deterministic, compiles]
        C -.candidates.-> G
        G -->|Run| X[Green or red test<br/>with screenshot and reason]
    end

    G -.components.-> C
```

### 1. The language cycle

| Step | Tool | Status |
|---|---|---|
| Read the corpus from the wiki (read-only) | `npm run confluence:discover` / `:probe` / `:fetch` | ✅ verified on the real corpus |
| Normalise, group, measure | `npm run analyze:corpus in=<export>` | ✅ |
| Compare with the catalog, prepare queue and per-area report | `npm run catalog:sync` | ✅ |
| Elect the Gold (scoring matrix) | `scripts/lib/gold.ts` | ✅ |
| Publish catalog and queue next to the scenarios | `npm run confluence:publish` | ✅ built · ⏸ **needs approval** (Q9) |
| Record the ritual's decisions | `catalog-apply` | ⬜ **does not exist yet** |
| Rewrite variants to the Gold, with a mandatory preview | `catalog-refactor` | ⬜ **does not exist yet** |

Full procedure: `docs/anti-entropy/06-rituale.md`.

### 2. Writing

| Channel | For whom | What it does |
|---|---|---|
| **Desktop app, portal** (`web-ui`, "Step catalog") | testers without the repository | searchable catalog, Gherkin editor with catalog-only autocomplete, unknown steps underlined, `@wanted` proposals, commit to GitHub |
| **VS Code extension** (`vscode-extension/`) | technical testers | completion, diagnostics, hover, catalog tree |
| **Validator** (`npm run validate:steps`, pre-commit hook) | everyone | exact → ok · similar → suggests the existing phrase · new → blocks |
| **Assistant** (Kiro / Amazon Q, rules in `.amazonq/rules/`) | people writing with AI | searches the catalog first, proposes at most one new step, never writes without a human yes |

### 3. From demonstration to test: the dashboard

Three screens in the desktop app, built for **a manual tester working alone,
with no terminal**:

| Screen | What the tester does | What happens underneath |
|---|---|---|
| **Check-up** | sees whether the machine is ready; configures environments, credentials and sign-in with buttons | structured diagnosis (`npm run diagnosi`), writes `bdd-targets.json` and `.env` |
| **Record** | presses "Record a session", runs the test by hand, closes each step with "End intent", marks checks with "Verify", then "Generate the test" | `record.ts` writes the trace; the screen shows steps, checks and gaps read from the trace; `generate.ts` writes feature, Page Objects and steps |
| **Run** | presses "Run the test"; can watch the browser or start without a session | Cucumber runs on the chosen environment; steps turn green or red; on failure, screenshot and actual URL |

The working environment is chosen **once**, in the sidebar, and applies to the
whole window.

---

## 5. Under the hood: from a manual test to a replayable test

```mermaid
flowchart LR
    M[Manual test<br/>tester in Chrome] --> T[Trace<br/>gestures by role + name<br/>named steps, checks]
    M --> I[Page inventory<br/>every UI component<br/>on each page visited]
    T --> G[Generator<br/>script, no AI]
    I --> G
    G --> O[Output<br/>Page Objects · step definitions<br/>feature file · catalog entries]
    G -.brief.md.-> K[Kiro, optional<br/>picks catalog phrases]
    K -.-> O
    O --> J[Judges<br/>tsc · dry-run · validator]
    J --> R[Run from the app<br/>replayable]
```

1. **Record** (`scripts/record.ts`). Playwright opens Chrome (or Edge) and
   injects a small bar with two buttons: *End intent* and *Verify*. Every
   click and fill is stored as **role + accessible name**
   (`{ role: "button", name: "Confirm" }`), with the page URL, never as a CSS
   selector. Passwords are never stored.
2. **Inventory, in parallel** (`scripts/lib/inventory.ts`). While the tester
   works, each page that settles is inventoried: all its UI components, by
   the same role + name, with a stability and accessibility judgement.
   Inventories of the same page are merged. This is our own component
   dictionary: it plays the role Playwright Codegen would play, but in the
   same vocabulary as the trace. `npm run scout` does the same for a single
   page without recording.
3. **Generate** (`scripts/generate.ts`). A plain script with no AI:
   - gesture → UI component: they share role + name, so they **coincide**;
     nothing is inferred;
   - UI component → Page Object method: one method per component;
   - recorded check → assertion and `assertLoaded()`;
   - named step → Gherkin phrase, in the tester's words.

   It writes `src/pages/generated/`, `src/steps/generated/`,
   `src/features/generated/`, plus a manifest. Each generated step carries
   `@wanted`, its `@intent` and the `@component`s it touches, so
   `npm run catalog` turns it into a catalog entry that declares its
   components.
4. **Kiro, optional** (`reports/generate/<name>/brief.md`). The generator
   writes a task for the assistant. For each step it lists catalog candidates:
   first those declaring the **same components**, then those with similar
   wording, as two separate classes. Kiro only chooses, it never composes
   from scratch. If Kiro is not used, the test still runs with the tester's
   phrases.
5. **Judges.** `tsc` (does the code add up?), Cucumber dry-run (is every step
   wired?), `validate:steps` (does the phrase exist in the catalog?).
6. **Run** (`scripts/test-bersaglio.ts`, the *Run* screen). Cucumber runs the
   generated scenarios on the chosen environment, already signed in with the
   saved session. The same test can be replayed as often as needed.

### Who decides each link

| Link | How | Who |
|---|---|---|
| Gesture → UI component | same role + name on both sides | script |
| UI component → Page Object method | one method per component | script |
| Check → assertion | from the recorded check | script |
| Step phrase → catalog step | candidates with the same components first, similar wording second | Kiro, then the validator |
| Step → methods to call | chosen among the generated methods | Kiro, then the compiler |
| New catalog entry | `@wanted`, with its components | script; approved in the ritual |

**Weak point today:** none of the 137 hand-written catalog steps declares its
components, so the strongest signal is empty for them. It grows only from real
recordings (D38).

### Kiro from the command line

| Check | Result |
|---|---|
| `kiro-cli agent list` finds our two agents in `.kiro/agents` | ✅ (F23) |
| The read-only agent cannot write without human approval | ✅, but only without `--trust-all-tools` (F24) |
| Unattended run of the brief (`kiro-cli chat --no-interactive ...`) | ⚠️ not reliable yet: `fs_write` reported "tool not found" (F24) |
| Kiro IDE with our rules and agents | ✅ used on the work machine |

---

## 6. Where scenarios live

Cucumber and the app read one root, `src/features/`.

| Kind | Path | In git? | Organised by |
|---|---|---|---|
| Hand-written or imported scenarios | `src/features/<app>/<flow>/<name>.feature` | yes | `@app` and `@flow` tags; the portal places files from the tags |
| Test cases documented but never automated | same tree, tagged `@non-automatizzato` | yes | excluded from runs by `cucumber.js`, not offered in Run |
| Scenarios generated and **saved** by the tester | `src/features/<app>/<flow>/<name>.feature`, steps in `src/steps/<app>/<flow>/`, Page Objects in `src/pages/<app>/` | yes, all three | `@app @flow @generato` tags; app and flow from the catalog's `app` / `area` |
| Scenarios generated and not saved yet | `src/features/generated/<recording-name>.feature` | no | flat; named after the recording |
| Test cases on the wiki | Confluence pages | — | the wiki tree |

**The path of a recorded scenario** (since 2026-09-24):

1. *Record* → the tester runs the test → *Generate the test*.
2. The screen asks **where it belongs**: application, flow, name. The file
   moves into the tree with its tags; the generation marker stays, so a later
   regeneration may overwrite it while nobody has edited it by hand.
3. *Run* opens with that scenario selected. "All recorded scenarios" finds
   every `@generato` scenario, wherever it lives.

**The glue travels with the scenario** (decided 2026-09-24, the repository is
private): its steps go to `src/steps/<app>/<flow>/<name>.steps.ts` and its
Page Objects to `src/pages/<app>/`, all versioned. Page Objects are shared per
application: a later scenario reuses one, or adds the methods it lacks, and
never removes a method another scenario calls; a hand-edited Page Object is
never touched. A step phrase already defined by another saved scenario stops
the save, with the phrases listed, because Cucumber refuses two definitions of
the same phrase. Nothing is written until every check has passed. In short,
the UI test framework builds itself, one saved recording at a time.

Still missing: the catalog is not refreshed after generating, and Run cannot
yet pick a whole flow or application.

---

## 7. The building blocks

| Block | Technology | Where it lives | What it does | Status |
|---|---|---|---|---|
| **Step catalog** | JSON | `step-catalog.json`, `STEP_CATALOG.md` | 137 entries (10 implemented, 127 `@wanted`); schema v2 with area, status, aliases, components | ✅ content to consolidate |
| **Test framework** | Playwright + Cucumber.js + TypeScript | `src/` | layered architecture | ✅ |
| **Observatory** | Node.js + TypeScript, Confluence REST | `scripts/confluence-*.ts`, `analyze-corpus.ts`, `lib/normalize.ts`, `lib/cluster.ts` | reads the corpus, measures entropy, proposes candidates | ✅ |
| **Catalog cycle** | Node.js + TypeScript | `scripts/catalog-sync.ts`, `lib/gold.ts`, `confluence-publish.ts` | queue, per-area report, Gold election, publishing | 🟡 apply and refactor missing |
| **Scout** (component dictionary) | Playwright | `scripts/scout.ts`, `lib/inventory.ts`, `lib/stability.ts` | inventories role + name of every component, with stability and accessibility | ✅ |
| **Recorder** | Playwright | `scripts/record.ts`, `lib/recorder-overlay.ts`, `lib/labelling.ts` | semantic trace with named steps and checks; inventory during the session | ✅ field-tested (P1) |
| **Generator** | Node.js + TypeScript, templates | `scripts/generate.ts`, `lib/generate-*.ts`, `templates/` | feature + Page Objects + steps, deterministic; declares gaps | ✅ compiles; 5 of 11 steps green on the real case |
| **Environments and sessions** | JSON + `.env` | `bdd-targets.json`, `scripts/session.ts`, `lib/targets.ts` | several environments, automatic sign-in where possible, saved session | ✅ |
| **Measurement** | Node.js + TypeScript | `scripts/benchmark.ts`, `benchmark-arena.ts`, `referto.ts` | seven measures per run; with/without rules comparison; numbers-only report | ✅ built · P8 comparison to do |
| **Assistant** | Kiro (IDE + CLI), Amazon Q | `.amazonq/rules/` (source) → `.kiro/steering/` (generated); agents `bdd-generate`, `bdd-authoring` | method rules always on; one agent that writes, one that only reviews | 🟡 IDE works; CLI partly (§5) |
| **Dashboard** | Electron + Next.js | `web-ui/src/app/(cruscotto)/`, `web-ui/src/lib/` | the three screens; closed list of commands; results read from artifacts | ✅ MVP complete |
| **Portal** | Electron + Next.js, CodeMirror | `web-ui/src/app/(portale)/` | catalog, editor, features, components, tags, settings | ✅ |
| **VS Code extension** | VS Code API | `vscode-extension/` | completion, diagnostics, hover, tree | 🟡 not packaged |
| **Checks** | ts-node, Vitest | `scripts/lib/*.check.ts` (`npm run check:all`), `web-ui/__tests__` | 247 script assertions, 187 app cases | ✅ |

---

## 8. Who does what

| Role | Does | Uses | Must **not** have to |
|---|---|---|---|
| **Manual tester** | runs tests as always, names steps, marks checks | dashboard, portal | write Gherkin or code, open a terminal |
| **Consolidation owner** | runs the monthly 15 minutes, breaks ties | queue, per-area report | name people: attribution is by area |
| **Tester from one area, rotating** | represents their area in the ritual | queue | — |
| **SDET** | implements `@wanted` steps, reviews generated code | VS Code, generator, assistant | write step bodies blindly |
| **Seniors / management** | decide whether to adopt the method | per-area reports | — |

**The only thing the proposal asks for:** one owner of the consolidation,
fifteen minutes a month. Without one, the catalog becomes a well-documented
archive of variants.

---

## 9. Rules that do not change

| Rule | Where it applies |
|---|---|
| No cost: no licences, no servers | everything |
| No company data leaves the machine: `reports/` is gitignored, reports carry numbers only | observatory, recorder, reports |
| Credentials only in `.env`, never in environment files: `${VARIABLE}` instead | environments, dashboard |
| One phrase per concept; one intent step beats three UI steps | catalog, assistant |
| Selectors only in Page Objects | framework, generator |
| No automatic mass rewrite: preview and diff are mandatory | ritual |
| The tester never sees a command where a button can be | dashboard |
| Results are read from artifacts, never from console output | dashboard, measurement |

---

## 10. Status and what is missing

### Working, tested on a real application

- entropy measured on the real corpus (§2);
- recording with named steps and checks (P1: 7 intentions, 12 actions, 4 checks);
- generation that compiles without AI, and 5 of 11 steps green on the real
  case, sign-in included; it stops on a button repeated in a hundred rows
  (task 14);
- the whole chain driven from the dashboard, with no terminal.

**Checks:** `tsc`, `check:all` and `rules:check` green at the root; app build
green; 185 of 187 cases green in `web-ui`. The two red cases depend on the
author's machine: one reads a local, gitignored recording, the other checks a
Windows path on Linux.

### To build

See `ROADMAP.md` §4 for the ordered list. In short: rows inside lists (task
14), where scenarios live (§6), applying and rewriting after the ritual,
catalog content, typed checks, and the presentation material.

### Open decisions

| # | Question | Who decides |
|---|---|---|
| U1 | Product name (today "BDD Catalog") | project owner |
| U2 | Where the tester's work ends up: commit, wiki, both | project owner |
| U3 | Must the executable work without the repository? | project owner. If yes, execution moves into Electron and scripts are bundled |
| U4 | Does the tool become a product for others? | project owner |
| S1 | Where generated scenarios are versioned (see §6) | project owner |
| T3 | Flow across two domains: code support or two recordings | whoever knows the flow |
| T4 | `/questions/N`: identifier or step | whoever knows the flow |
| T11 | 3 or 4 layers (`CLAUDE.md` says 4, the generator produces 3) | owner of `CLAUDE.md` |
| Q5 | Who owns the ritual | to be asked at the demo |
| Q9 | Publishing to the wiki (a write) | someone with authority in the company |
| Q10 | The company remote and its history | someone with authority in the company |

### Field trials (work machine only)

P3 (assistant with no file open), P4 (**a colleague uses the dashboard with no
explanation**, the test of "within reach of manual testers"), P5 (session
lifetime), P6 (hard pages), P7 (agents in the IDE), P8 (with and without
rules), P9 (publishing). Protocol in `docs/anti-entropy/10-prove-sul-campo.md`.

---

## 11. Document map

| If you want to know… | Read |
|---|---|
| **Everything, briefly** | this document |
| What to build next, in which order, and what **not** to build | `ROADMAP.md` |
| How to use the dashboard | `docs/TESTER-DASHBOARD-GUIDE.md` |
| How to use the portal | `docs/USER-GUIDE.md` |
| How to present the project | `docs/PRESENTATION.md` |
| How to write steps and scenarios | `CONTRIBUTING.md`, `docs/GHERKIN-CONVENTIONS.md`, `docs/STEP-LIFECYCLE.md` |
| The dashboard's specification and plan | `docs/superpowers/specs/`, `docs/superpowers/plans/` |
| Requirements, design and tasks of the chain | `.kiro/specs/demo-anti-entropia/` |
| Facts, decisions and open questions, with their reasons *(Italian)* | `docs/anti-entropy/README.md` |
| The monthly ritual *(Italian)* | `docs/anti-entropy/06-rituale.md` |
| The assistant and how it is measured *(Italian)* | `docs/anti-entropy/07-assistente.md` |
| Setting up another machine *(Italian)* | `docs/anti-entropy/08-prova-su-altra-macchina.md` |
| Field trials and results *(Italian)* | `docs/anti-entropy/10-prove-sul-campo.md` |

`.planning/` holds the planning of the first phase (June 2026): history, not
current state.

---

## 12. Timeline

| When | What |
|---|---|
| June 2026 | Playwright + Cucumber scaffold; desktop app with catalog and constrained editor; scenario import; VS Code extension; demo to the manager (M1) |
| 3–8 September | Turn towards **anti-entropy**: reading the wiki, baseline measured, grouping, scout, recorder, assistant rules, catalog cycle with Gold and aliases |
| 9–17 September | Deterministic generation, measurement, multiple environments; move to Kiro; first field trials (P1 passed, P2 first round) |
| 21–22 September | P2 fourth round (5 of 11 green); **dashboard** specified and built |
| 23–24 September | Dashboard refined through use: two languages, environments configured from the window, recorded sign-in, components anchored in the catalog, environment chosen once |
