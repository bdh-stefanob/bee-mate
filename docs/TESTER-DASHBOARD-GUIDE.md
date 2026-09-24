# Tester dashboard — user guide

_For people who run tests by hand. You do not need to know Gherkin or code,
and you never need to open a terminal._

The dashboard is the part of the desktop app that opens first. It has three
entries in the sidebar, one for each thing you do:

| Entry | What it is for |
|---|---|
| **Check-up** | know whether your machine is ready, and fix what is missing |
| **Record** | run your test as always, and get a scenario out of it |
| **Run** | run the scenario on its own and see how it went |

The sidebar also has:

- **Environment**: the environment you are working on. You choose it once and
  it applies to every screen.
- **Language**: English or Italian. The choice is kept when you close the app.
- **Step catalog**: the portal with the catalog and the editor (see
  `USER-GUIDE.md`).

> **Before you start:** the app works on a copy of the project on your
> computer. The first time, it asks which folder that copy is in.

---

## 1. Check-up

At the top, the status in one line, always with an icon **and** a word:

- **Ready**: you can work.
- **Ready — N things worth a look**: you can work. There are warnings worth
  reading, but they do not block you.
- **Missing N things**: fix something before recording.

Below, one row per requirement, with its result (**All set**, **Attention** or
**Missing**). When something is missing and the window can fix it, a **Fix
it** button appears next to it. Items that only matter to the people who build
the tool are folded under **Advanced**.

### Environments

An environment is an address where you record and run tests, for example
"staging".

1. **Add**: type a name and an address, then press **Add**. The name cannot be
   changed later, because saved sessions and recordings are tied to it.
2. **Record the sign-in** (once): the browser opens, you sign in as you
   normally do, then close it. The window works out the sign-in steps from
   that and tells you which credentials are needed. **No value you typed ever
   goes into the environments file**: a variable name is stored instead.
3. **Fill in**: enter user name and password in the masked fields. They stay
   on your computer and are never shown again once saved.
4. **Sign in now**: the browser opens, you sign in and close it. The session is
   saved by itself, so tests start already signed in.

From the same row you can change the address or delete the environment.
Before deleting, the window tells you what you lose: the recorded sign-in and
the saved session. Credentials stay, because something else may need them.

**Other variables (advanced)** is only for credentials that belong to no
environment, such as tokens for other integrations.

---

## 2. Record

1. Check the environment in the sidebar.
2. Press **Record a session**. The browser opens with a bar in the top-right
   corner.
3. Run your test exactly as you would. In addition:
   - at the end of each step press **End intent** and give the step a name
     ("I open a new order", "I confirm the payment");
   - when something confirms that it worked (a title, a message, a total),
     press **Verify** and click on it.
4. When you are done, close the browser. If some gestures have no name, the
   window suggests where to split the steps and asks you to name them.

> The bar in the browser currently shows these two buttons in Italian
> ("Fine intento", "Verifica"). An English version is planned.

The window then shows **what it understood** from the recording:

- the steps, with the names you gave them and how many actions and checks each
  one contains;
- how many checks you recorded in total;
- **Before you generate**: where the test might be fragile, in
  plain words, with what to do about it.

Then press **Generate the test**. When it is done, the window asks **where the
scenario belongs**:

- **Application** and **Flow**: pick one from the list (they come from the
  step catalog) or type a new one; only lowercase letters, digits and dashes;
- **Scenario name**: what it checks, for example "Sign in and see the
  dashboard". The name of your first step is proposed.

**Save and go to Run** puts it next to the other scenarios of that flow and
opens *Run* with it already selected. If a scenario with the same name was
edited by hand, it is left untouched and yours is saved next to it.
**Keep it with the recorded scenarios** skips this step.

If you leave the screen while recording, the recording is still there when you
come back. If another operation is already running, the window says so and
tells you where to watch it: one operation at a time.

---

## 3. Run

1. Check the environment in the sidebar.
2. Choose **What to run**: all recorded scenarios (the default), every
   scenario of one file, or a single scenario. Scenarios tagged
   `@non-automatizzato` are documentation only and are not listed.
3. If you like, switch on one of two options:
   - **Watch the browser**: the test runs in a visible window instead of
     hidden;
   - **Start without a session**: the test does not use the saved sign-in.
     Use it when the scenario already contains the sign-in.
4. Press **Run the test**.

The steps appear one under the other and turn green as they run. If a step
fails, its row turns red and shows the **screenshot** taken at that moment,
together with the page that was expected and the page actually reached.

At the bottom: the result in one line (passed, failed, skipped) and the time
taken.

If the test starts but there is no scenario to run, the window tells you to
record a session and generate the test first.

---

## Frequently asked questions

**Do I have to learn Gherkin?** No. The phrases of the scenario are the names
you give the steps. Whoever looks after the catalog will later align them with
the shared wording.

**Do my credentials end up anywhere?** No. They stay in a file on your
computer that is never shared. They never appear in the window's messages, in
status files or in logs. One declared limit: that file is not encrypted on
disk.

**The test stops on a list with many identical buttons.** Known limit: the
generator cannot yet tell one row from another. It is the next item of work.

**How long does a saved session last?** It depends on the application. The
Check-up screen warns you when a session is older than 12 hours: press **Sign
in now** again.
