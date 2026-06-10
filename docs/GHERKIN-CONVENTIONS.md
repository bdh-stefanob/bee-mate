# Boots BDD — Gherkin Conventions

Reference for QA authors and AI tools writing `.feature` files for the Boots suite.

---

## 1. App structure

```
Brochure (app)          boots.com marketing / public site
Clinic (app)
  ├── auth              login, registration, 2FA
  ├── weight-loss       consultation questionnaire + medicine selection
  ├── hair-loss
  ├── acne
  └── ...               other Clinic services
```

Cross-domain journeys (e.g. user starts on Brochure → lands on Clinic) go in
`brochure-clinic/`. Everything else lives under its own app folder.

```
src/features/<app>/<service>/<scenario>.feature
src/steps/<app>/<service>/<scenario>.steps.ts
```

---

## 2. Given / When / Then — the core rule

| Keyword | Answers | Signals |
|---------|---------|---------|
| `Given` | *Where does the test start?* | Precondition. Declarative state. Never describes how the user got there. |
| `When`  | *What does the user intentionally do?* | User action with a purpose: click, select, enter, submit. |
| `Then`  | *What did the system do as a result?* | Observable outcome: page change caused by a redirect, success/error message, data update. |
| `And`   | *Continues the previous keyword* | Chains multiple actions or outcomes. |

**Navigation rule — the practical test:**

> If the user *chose* to go somewhere → `When`.  
> If the system *took* the user somewhere → `Then`.  
> If the test *starts* there → `Given`.

```gherkin
# The user clicked Login on purpose → When
When the user clicks the Login button

# The system redirected after successful auth → Then
Then the user is on the "My Account" page

# The test starts on this page, we don't care how → Given
Given the user is on the Brochure home page
```

**Common mistake — don't mix outcomes into the action chain:**
```gherkin
# BAD — page arrival embedded inside When block
When the user clicks the Login button
And the user lands on the Clinic login page   ← system redirect, belongs in Then
And the user enters valid login credentials

# GOOD — redirect is an outcome, then the next action builds on it
When the user clicks the Login button
Then the user is on the "Clinic login" page
When the user enters valid login credentials on the "Clinic login" page
And the user completes SMS verification
Then the user is successfully logged in
And the user is on the "My Account" page
```

---

## 3. Step writing best practices

**Format:** `the user [verb] [object] [optional context]`

Use sentence case. One note on convention: steps written in ALL CAPS
(e.g. `THE USER ON X clicks "Y"`) should be converted to the parametric
format shown below — the page context becomes a `{string}` parameter.

**Prefer these verbs:**

| Verb | When to use |
|------|-------------|
| `is on the` | start state or redirect outcome |
| `clicks` | single button or link |
| `selects` | radio button, checkbox option, dropdown, list item |
| `enters` | text field, numeric value |
| `completes` | multi-step packaged flow (e.g. SMS verification) |
| `flags` | checkbox that must be ticked |
| `confirms` | confirmation / proceed action |

**Abstract repetitive sub-flows:**  
If a flow has 3+ steps that always appear together, wrap them in one step.
```gherkin
# BAD — brittle, breaks if UI changes
And the user clicks on SMS verification
And the user clicks on Send code
And the user enters the code received by SMS
And the user clicks Verify button

# GOOD — intent is clear, implementation detail is hidden
And the user completes SMS verification
```

**Use `{string}` parameters for values that vary:**
```gherkin
# Instead of one step per option:
When the user selects "Pancreatitis" on the "Bowel and Gut Conditions" questionnaire page
When the user selects "None of the above" on the "Bowel and Gut Conditions" questionnaire page

# One parametric step covers all options on all pages:
the user selects {string} on the {string} questionnaire page
```

**Use Scenario Outline for data variations:**
```gherkin
# BAD — one scenario per medicine:
Scenario: Wegovy 0.25mg with coaching
Scenario: Wegovy 0.5mg without coaching

# GOOD — one outline, all combinations in the table:
Scenario Outline: Select medicine and coaching plan
  When the user selects medicine "<medicine>" with quantity "<quantity>" and coaching "<coaching>"
  Examples:
    | medicine | quantity | coaching |
    | Wegovy   | 0.25mg   | with     |
    | Wegovy   | 0.5mg    | without  |
```

---

## 4. Available step catalog

### Common (shared across all apps)
| Expression | Type |
|------------|------|
| `the user is on the {string} page` | Given / Then |
| `I am logged in as a {string} user` | Given |

### Brochure → Clinic (cross-domain auth)
| Expression | Type |
|------------|------|
| `the user is on the Brochure home page` | Given |
| `the user clicks the Login button` | When |
| `the user enters valid login credentials on the {string} page` | When |
| `the user completes SMS verification` | When |
| `the user is successfully logged in` | Then |

### Clinic — Weight Loss questionnaire
| Expression | Type |
|------------|------|
| `the user selects {string} from the popular services menu` | When |
| `the user clicks {string} on the {string} service page` | When |
| `the user selects {string} as their service status` | When |
| `the user selects medicine {string} with quantity {string} and coaching {string}` | When |
| `the user confirms the medicine selection` | When |
| `the user flags the consent checkbox and continues on the {string} page` | When |
| `the user enters height {string} in {string} and weight {string} in {string}` | When |
| `the user selects {string} on the {string} questionnaire page` | When |
| `the user selects {string} and enters {string} on the {string} questionnaire page` | When |
| `the user clicks next on the {string} questionnaire page` | When |

---

## 5. Tags

| Tag | Meaning |
|-----|---------|
| `@smoke` | Must pass before any deployment |
| `@brochure-clinic` | Cross-domain Brochure → Clinic journey |
| `@auth` | Authentication flows |
| `@weight-loss` | Weight Loss service |
| `@questionnaire` | Multi-page questionnaire |
| `@medicine-selection` | Medicine picker |
| `@wanted` | Scenario uses steps not yet implemented |

---

## 6. Requesting new steps

1. Write the scenario using the expression you need.
2. Tag it `@wanted`.
3. Open a PR or discussion so the team can review the new expression.
4. Once approved, the step gets implemented and `@wanted` is removed.

Check the catalog first: `npm run catalog` regenerates `STEP_CATALOG.md`.

---

## 7. Using this document with an AI

1. Paste this file as context at the start of the conversation.
2. Add the relevant section from `STEP_CATALOG.md`.
3. Describe the user journey in plain language.
4. Ask: *"Write a Gherkin scenario following the Boots conventions above."*

The AI will use the parametric templates from section 4, apply the
Given/When/Then navigation rule from section 2, and mark unknown steps `@wanted`.

> VS Code inline enforcement (autocomplete + linting against this convention)
> is tracked separately in the project roadmap.

---

## 8. References

The conventions in this document are grounded in established BDD literature:

| Resource | Author(s) | Why it matters |
|----------|-----------|----------------|
| [The Cucumber Book](https://pragprog.com/titles/hwcuc2/the-cucumber-book-second-edition/) | Matt Wynne, Aslak Hellesøy | Canonical source for declarative vs imperative Gherkin style and "right level of abstraction" |
| [Specification by Example](https://gojko.net/books/specification-by-example/) | Gojko Adzic | Business-readable scenarios as living documentation; avoid UI-level step noise |
| [Writing better Gherkin](https://cucumber.io/docs/bdd/better-gherkin/) | cucumber.io | Official Cucumber guidance: express user intent, not interaction sequences |
| [Screenplay Pattern](https://serenity-js.org/handbook/design/screenplay-pattern/) | Serenity/JS | Maps BDD intent to code: Task (goal) → Interaction (UI action). Aligns with this repo's 4-layer architecture |
| [BDD in Action](https://www.manning.com/books/bdd-in-action-second-edition) | John Ferguson Smart | End-to-end guide on integrating BDD into delivery teams; good for onboarding |
