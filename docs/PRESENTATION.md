# Presenting the project

> **What this document decides:** which materials present the idea, to whom,
> and what each contains. The live demo script stays in
> `docs/anti-entropy/03-piano-demo.md` and takes precedence: the slides support
> it, they do not replace it.
>
> Content comes from `docs/OVERVIEW.md`. If a number changes there, it changes
> here too.

---

## Three audiences, three materials

| Audience | What they must take away | Material | Length |
|---|---|---|---|
| **Seniors / management** | the problem is measured, the fix costs fifteen minutes a month, one owner is needed | **deck** + live demo | 20 min + 10 of questions |
| **People who were not in the room**, or want to re-read | the whole process, with the reasons | **written document** | 15-minute read |
| **Testers** | what changes for me tomorrow: nothing, except two buttons | **one-pager** + `TESTER-DASHBOARD-GUIDE.md` | 2 minutes |

Same message in all three; only the level of detail changes.

---

## The message, in three lines

1. **We have no shared vocabulary**, and the numbers show it.
2. **A catalog that converges on its own**, with a 15-minute monthly ritual,
   creates one without blocking anyone and without changing where people write.
3. **A manual run already is specification and automation**: business experts
   contribute without learning Gherkin.

**One ask:** an owner of the consolidation, 15 minutes a month.

---

## Visual language

- **Six key words**, each with its own icon, introduced on one slide and then
  used as the label at the top of every slide. They are also the words to use
  when speaking:

  | Word | Icon | Meaning |
  |---|---|---|
  | CATALOG | database | the approved phrases, in one place |
  | GOLD | star | the wording chosen among variants |
  | RITUAL | clock | 15 minutes a month to choose |
  | DEMONSTRATION | play | a manual test becomes a scenario |
  | JUDGES | verified | automatic checks that decide |
  | MEASURE | chart | every claim is a number |

- **Colours with one meaning each**: blue for the method and actions, green
  for what is proven, amber for variants and Gold, red for the problem. A
  colour never carries meaning alone: the word is always next to it.
- **Little text**: big numbers, arrows, diagrams. Buttons the audience does
  not know ("End intent", "Verify", "Fix it") are drawn as buttons, with two
  words underneath saying what they do.
- **Titles are statements**: reading the titles alone tells the story.
- **Speaker notes** on every slide, with the key words in capitals.
- Palette: blue `#1A56DB`, green `#067647`, amber `#B54708`, red `#B42318`,
  dark `#0F1728`. Type: Space Grotesk (headings), IBM Plex Sans (text),
  JetBrains Mono (Gherkin).

---

## The deck

Published as a claude.ai deck (private until shared). 21 slides.

| # | Title | Content |
|---|---|---|
| 1 | A shared language for test cases | cover, the six key words |
| 2 | 85 of every 100 steps are written from scratch | reuse ratio 0.72 and 0.85 as bars |
| 3 | 7 in 10 intentions appear only once | 246 against 107; grouping removes only 14% |
| 4 | 107 phrases would cover more than half the steps | 57%, with the arithmetic in three steps |
| 5 | We need a shared vocabulary, and a way to keep it alive | statement |
| 6 | Six words carry the whole proposal | the key words |
| 7 | Three cycles turn around one catalog | language, writing, demonstration |
| 8 | Writers get the phrase that already exists | validator with its three outcomes |
| 9 | Write freely, converge every month | expected curve of variants, marked as illustrative |
| 10 | The ritual: 15 minutes a month, 2–3 people | timeline |
| 11 | A manual test becomes the scenario | business view of the demonstration |
| 12 | From a manual test to a replayable test | technical pipeline: trace and inventory in parallel, generator, Kiro, judges, run |
| 13 | Who decides each link in the chain | script or Kiro, link by link |
| 14 | Three screens, no terminal | the dashboard |
| 15 | The building blocks: free, and already in place | Electron + Next.js, Node scripts, Playwright, Cucumber, catalog, Kiro, Confluence reader, judges |
| 16 | AI proposes, judges decide | what uses AI and what does not |
| 17 | The chain already works on a real app | proven / in progress |
| 18 | What stays the same | boundaries |
| 19 | We ask for one owner of the consolidation | the ask |
| 20 | Appendix: where the numbers come from | data provenance |
| 21 | Appendix: questions you will hear | short answers |

Every demo moment has a backup video, recorded the day before.

---

## The written document

Title: **A shared language for test cases — proposal and process**. About 8
pages. Readable without having seen the presentation.

| Section | Content | Source |
|---|---|---|
| 1. Summary | half a page: problem, proposal, ask | OVERVIEW §1 |
| 2. The problem, measured | the numbers, how they were measured, what they do **not** say | §2 |
| 3. The method | the four ideas and the deterministic principle | §3 |
| 4. The process | the three cycles with the diagram; who does what | §4, §8 |
| 5. Under the hood | the technical pipeline and who decides each link | §5 |
| 6. The ritual | calendar, roles, what is decided and how | `anti-entropy/06-rituale.md` |
| 7. The tools | dashboard, portal, validator, assistant: one line each, with a screenshot | §7, `TESTER-DASHBOARD-GUIDE.md` |
| 8. Data and security | what stays on the machine, credentials, read-only | §9 |
| 9. Status and next steps | what is proven, what is missing, open decisions | §10 |
| 10. The ask | the owner of the consolidation | `anti-entropy/03-piano-demo.md` |
| Appendix | glossary (step, Gold, `@wanted`, reuse ratio, trace, environment) and sources | `anti-entropy/05-referenze.md` |

---

## The tester one-pager

1. **What changes for you:** you write where you write today. If you use the
   app, the editor suggests phrases others have already used.
2. **If you want to contribute to automation:** Record → run your test → name
   the steps → Verify what confirms it worked → Generate the test.
3. **What we do not ask of you:** Gherkin, code, a terminal.
4. **Who decides the shared phrases:** a group of 2–3 people, once a month,
   and you can object beforehand.

---

## Still needed before the demo

| What | Status |
|---|---|
| Numbers for act 1 | ✅ measured |
| Act 2 demo (portal) | ✅ runs locally |
| Act 3 demo (queue and report) | ✅ on an export already downloaded |
| Act 4 demo (Record) | ✅ from the dashboard · backup video to record |
| Act 5 demo (Run) | 🟡 5 of 11 steps: needs task 14, or show a flow without lists |
| Screenshots for slides and document | ⬜ from the dashboard, on a practice app, never company data |
| Deck | 🟡 first version published; to review |
| Written document | ⬜ |
| Tester one-pager | ⬜ |
| With/without rules comparison (optional) | ⬜ depends on P8 |
