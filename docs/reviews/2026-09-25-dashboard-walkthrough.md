# Dashboard walkthrough — 25 September 2026

_Manual functional check of the tester dashboard and the portal, on branch
`cruscotto-tester` at commit 7f83fbd. This file is the work list: each finding
says what happens, where it is in the code, what to change and **when it is
done**. It is tracked as task 18 in `.kiro/specs/demo-anti-entropia/tasks.md`
and in GitHub issues #1–#4 of this repository._

## How it was checked

Production build of `web-ui` (`next build` + `next start`), Chromium at
1280×720, 820 px and 390 px, light and dark, English and Italian. The target
was a local page standing in for the real application, with the fixtures in
`test-fixtures/generate/`.

Flow exercised: first launch → add environment → edit address / delete
(cancelled) → Record → close the browser → summary → Generate → Save to
app/flow → Run preselected (5/5 passed in 6 s) → Run with a failing check →
portal (catalog, features, editor, tags, components, settings).

No console errors and no 4xx/5xx responses on any screen.

## Already fixed

**F0 — recording failed on a machine without Chrome.** The recorder prefers the
system Chrome; Playwright's "Chromium distribution 'chrome' is not found" was not
recognised as a missing browser, so the fallback to Playwright's Chromium never
ran. Fixed in `scripts/lib/browser.ts`, covered by
`scripts/lib/browser-sources.check.ts` (commit 7f83fbd).

## Rules for whoever picks these up

- Follow `.amazonq/rules/metodo-di-lavoro.md`: **write the case that shows the
  defect first**, failing, then fix.
- Every visible string goes through `web-ui/messages/en.json` and `it.json`;
  `npm run check:i18n` must pass.
- The tester never sees a terminal command, and the window only runs the closed
  command list in `web-ui/src/lib/esecuzione.ts` (ROADMAP §5).
- Before closing: `npx tsc --noEmit -p tsconfig.json`, `npm run check:all`,
  `npm run rules:check` at the root; `npm test` and `npm run build` in `web-ui`.
- Tick the box here and in the GitHub issue when a finding is done.

Priorities: **P1** broken or tells the tester the wrong thing · **P2** works,
but a tester would not understand it without help · **P3** polish.

---

## Batch 1 — Failures a tester can read (issue #1)

### F1 (P1) — A failed step shows a raw stack trace with escape codes
- **Seen:** the red step shows `locator.waitFor: Timeout 10000ms exceeded`,
  `[2m … [22m` sequences and paths from `src/support/world.ts`. Nothing says in
  plain words what was expected. `docs/TESTER-DASHBOARD-GUIDE.md` §3 promises
  the expected page and the page reached; neither appears for a failed check.
- **Where:** `web-ui/src/app/(cruscotto)/esecuzione/page.tsx` (step error) and
  the code that reads Cucumber's ndjson.
- **Change:** strip ANSI (`/\x1b\[[0-9;]*m/g`) on the server; lead with one
  translated sentence built from the step (*The text "9999" did not appear on
  the page within 10 s*); put the stack behind a "Technical details" fold.
- **Done when:** a unit test feeds a real failure message with escape codes and
  gets clean text; the failed step shows the plain sentence first in both
  languages; the stack is folded.
- [ ] done

### F2 (P1) — A failed recording does not say why
- **Seen:** the window only says *the recording didn't go through · retry*; the
  script prints the cause and the fix. This hid F0.
- **Where:** `web-ui/src/app/(cruscotto)/registra/page.tsx`, the
  `erroreRegistrazione` branch of `osserva()`.
- **Change:** show the last lines of the operation output (already streamed over
  SSE), or map known failures (no browser, unreachable address) to a sentence
  and an action.
- **Done when:** with `BDD_BROWSER=nonexistent`, the Record screen shows why it
  failed and what to do, without a terminal.
- [ ] done

### F7 (P2) — Run has no Stop button
- **Seen:** during a run the button becomes a disabled *Test running*. Record
  has Stop; Run does not.
- **Where:** `web-ui/src/app/(cruscotto)/esecuzione/page.tsx`;
  `/api/esegui/[id]/ferma` already exists.
- **Change:** reuse Record's Stop button.
- **Done when:** Stop ends a running test, the screen returns to the choice and
  the registry shows the operation as interrupted.
- [ ] done

## Batch 2 — State that stays in sync (issue #2)

### F3 (P1) — The sidebar does not update after adding an environment
- **Seen:** after **Add**, the sidebar still says *No environment configured*
  until reload. Record and Run read the sidebar. Delete likely behaves the same.
- **Where:** `web-ui/src/components/cruscotto/SezioneAmbienti.tsx` (add, delete)
  and the sidebar selector in the dashboard layout.
- **Change:** one shared client store or context for environments, or an event
  after add/delete that the sidebar listens to. Select the first environment
  automatically.
- **Done when:** add and delete are reflected in the sidebar without reload, and
  Record shows the new environment straight away.
- [ ] done

### F4 (P2) — An environment is "ready" before anyone has signed in
- **Seen:** right after adding, with no recorded sign-in and no session:
  *Environments — All set · 1 of 1 ready*.
- **Where:** the environments row of the diagnosis behind `/api/controllo`.
- **Change:** say what is there (*1 environment · sign-in not recorded*) as
  Attention when the application needs a sign-in.
- **Done when:** a case with an environment lacking sign-in and session yields
  Attention, not All set.
- [ ] done

### F5 (P2) — An empty recording still offers "Generate the test"
- **Seen:** closing the browser without doing anything shows *0 steps, 0 checks*
  and an active Generate button.
- **Where:** `registra/page.tsx`, summary phase.
- **Change:** say nothing was recorded; offer **Record again** instead.
- **Done when:** a recording with no intents never shows Generate.
- [ ] done

### F6 (P2) — No way back from the summary
- **Seen:** the summary offers only **Generate the test**.
- **Where:** `registra/page.tsx`, summary phase.
- **Change:** a secondary **Record again** next to Generate.
- **Done when:** Record again returns to the start without generating.
- [ ] done

## Batch 3 — No terminal, one language (issue #3)

### F8 (P2) — Tester screens still show terminal commands
- **Seen:** Check-up shows `npm run scout:pausa <url>` with **Copy command**; the
  warning before generating says to scan *from a terminal*; the portal's
  Components page says to run `npm run generate` and `npm run catalog`.
- **Change:** a **Scan this page** button on the closed command `scansione`,
  ending the scan like a recording (closing the browser) instead of waiting for
  Enter. Portal text without commands.
- **Done when:** no tester-facing screen contains `npm ` (a test can grep the
  messages files for it).
- [ ] done

### F9 (P2) — Two languages on the same screen
- **Seen:** in the English UI the generator warning is Italian (*4 elementi non
  erano nel dizionario…*) with a raw *warning —* prefix, and the page is named by
  its host (*"127.0.0.1"*). The portal mixes Italian labels: *Carica .feature,
  Sposta, Seleziona un feature file…, Nuovo feature, Cartella, Nessun feature
  modificato, Cerca feature…*, the nav item *Cruscotto*, "137 step". The
  recorder bar is Italian only (task 16).
- **Where:** `scripts/generate.ts` diagnostics; portal under
  `web-ui/src/app/(portale)`.
- **Change:** the generator returns a code and parameters, the window
  translates. Move portal strings into `messages/*.json` and extend
  `npm run check:i18n` to the portal.
- **Done when:** switching language changes every visible string on the summary
  and in the portal; `check:i18n` covers the portal.
- [ ] done

### F10 (P2) — "Target" on Run, "Environment" everywhere else
- **Seen:** Run says *Target: demo* and *No target configured* (*Bersaglio*).
- **Where:** `web-ui/messages/en.json`, `it.json`, `Esecuzione` namespace.
- **Change and done when:** Run says *Environment* / *Ambiente*.
- [ ] done

### F11 (P2) — First launch opens on a red "Missing 3 things"
- **Seen:** on a fresh install, dictionaries and recordings count as missing,
  but they come from using the app.
- **Change:** red only for real blockers (no browser, no environment); the rest
  as a neutral *Getting started · 1 of 3* with the next action.
- **Done when:** a fresh install with a browser and one environment is not red.
- [ ] done

## Batch 4 — Polish and housekeeping (issue #4)

- [ ] **F12 — developer words.** *Playwright browser*, *locators get synthesized
  blind*, *4, of which 1 with per-page attribution*, *13 events received*,
  `.feature` paths in What to run; *Keep it with the recorded scenarios* is
  unclear. Use *Test browser*, *Pages scanned*, scenario titles grouped by app
  and flow, *Save later*.
- [ ] **F13 — `window.confirm()`** for delete, replacing a recorded sign-in and
  overwriting an address (`SezioneAmbienti.tsx`). Inline confirmation in the
  environment row with the same consequence list.
- [ ] **F14 — empty states without a way forward.** Record and Run without an
  environment: add **Go to Check-up**.
- [ ] **F15 — Check-up layout.** Status cards narrower than the banner and the
  sections; Environments below *Advanced*; two advanced folds. One width; order
  status → Environments → one Advanced fold including Other variables
  (`web-ui/src/app/(cruscotto)/controllo/page.tsx`).
- [ ] **F16 — add-environment form.** The helper text under *Environment name*
  pushes *Address* lower; Add floats. Helper text under the whole row, one
  baseline.
- [ ] **F17 — sidebar selector truncates** *No environment configur…* at
  1280 px and on phone. Shorter label or wrap.
- [ ] **F18 — Run results.** One card per step with uppercase PASSED; the total
  at the bottom, off-screen on long scenarios; steps and checks look the same.
  Compact rows, checks indented, total at the top.
- [ ] **F19 — the portal looks like another app.** Top nav vs sidebar, *IT*
  toggle vs English/Italiano, dark switch only there; the empty editor
  highlights line 1 in orange. Components stays at 0 anchored after a saved
  scenario because the catalog is not refreshed after generating (ROADMAP §4,
  item 3).
- [ ] **F20 — housekeeping.** After **Save and go to Run**, Page Objects stay in
  `src/pages/generated/` next to the saved copies in `src/pages/<app>/`: confirm
  whether intended, else remove after a successful save
  (`web-ui/src/lib/salva-scenario.ts`). `reports/cruscotto/` keeps one status
  file per operation (80+ after two days): keep the last N
  (`web-ui/src/lib/registro.ts`).
