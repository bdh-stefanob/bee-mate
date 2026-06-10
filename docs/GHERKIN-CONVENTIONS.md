# Boots BDD — Gherkin Conventions

This document defines how to write Gherkin scenarios and steps for the Boots
test suite. It applies to QA authors writing `.feature` files AND to AI tools
helping to generate or review scenarios.

---

## 1. Taxonomy

```
Domain        → the Boots product area (Brochure, Clinic, Weight Loss, Hair Loss…)
  Feature     → a user capability within that domain (Login, Service Selection…)
    Scenario  → a specific user journey with a defined outcome
      Steps   → Given / When / Then lines
```

File locations follow the same hierarchy:
```
src/features/<domain>/<feature-name>.feature
src/steps/<domain>/<feature-name>.steps.ts
```

---

## 2. Step naming rules

**Template:**
```
[Given/When/Then] the user [verb] [object] [optional: on/from/in {string}]
```

**Allowed verbs:**
| Verb | Use for |
|------|---------|
| `is on the` | navigation / page assertion |
| `clicks` | single button or link |
| `selects` | option from a list, radio button, checkbox group |
| `enters` | text input, numeric value |
| `completes` | packaged multi-step flow (e.g. SMS verification) |
| `flags` | checkbox that must be ticked |
| `confirms` | confirmation / continue action |

**Do not use:**
- `clicks on` → use `clicks`
- `insert` → use `enters`
- `lands on` → use `is on the`
- ALL CAPS page names inline (see section 3)

---

## 3. Page context — the key rule

❌ **Old pattern (avoid):**
```
THE USER ON MEDICINE PREFER clicks "Wegovy" quantity "0.25mg" Coaching "with"
THE USER ON BOWEL AND GUT CONDITIONS clicks "Pancreatitis"
```

✅ **Correct pattern:**
```gherkin
When the user selects medicine "Wegovy" with quantity "0.25mg" and coaching "with"
When the user selects "Pancreatitis" on the "Bowel and Gut Conditions" questionnaire page
```

**Rule:** The page/context is always a `{string}` parameter or is established by
a preceding `Given/Then` step. Never embed the page name in ALL CAPS inside the
step expression.

The ALL CAPS "stem" concept maps to two things in this system:
- The `area` field in the step catalog (for filtering and grouping)
- The `{string}` page parameter in the step expression

---

## 4. Parametric step catalog (available templates)

These expressions are in the catalog. Reuse them — do not create new steps
for variations that fit an existing template.

### Navigation & assertions
| Expression | Use for |
|------------|---------|
| `the user is on the Brochure home page` | start on Brochure |
| `the user is on the {string} page` | any page assertion or navigation |
| `the user is successfully logged in` | post-login assertion |

### Generic interactions
| Expression | Use for |
|------------|---------|
| `the user clicks the Login button` | login entry point |
| `the user clicks {string} on the {string} service page` | service CTAs |
| `the user enters valid login credentials on the {string} page` | packaged credentials |
| `the user completes SMS verification` | full 2FA flow |

### Weight Loss questionnaire
| Expression | Use for |
|------------|---------|
| `the user selects {string} from the popular services menu` | menu navigation |
| `the user selects {string} as their service status` | new / returning selection |
| `the user selects medicine {string} with quantity {string} and coaching {string}` | medicine picker |
| `the user confirms the medicine selection` | medicine confirmation page |
| `the user flags the consent checkbox and continues on the {string} page` | consent pages |
| `the user enters height {string} in {string} and weight {string} in {string}` | measurements |
| `the user selects {string} on the {string} questionnaire page` | any single-choice question |
| `the user selects {string} and enters {string} on the {string} questionnaire page` | option + free text |
| `the user clicks next on the {string} questionnaire page` | advance questionnaire page |

---

## 5. When to use Scenario Outline

Use `Scenario Outline` + `Examples` whenever the same flow repeats with different
data values. Do NOT write one scenario per data combination.

```gherkin
# BAD — one scenario per medicine:
Scenario: Select Wegovy 0.25mg with coaching
  When the user selects medicine "Wegovy" with quantity "0.25mg" and coaching "with"

Scenario: Select Wegovy 0.5mg without coaching
  When the user selects medicine "Wegovy" with quantity "0.5mg" and coaching "without"

# GOOD — one outline, data in the table:
Scenario Outline: Select medicine and coaching plan
  When the user selects medicine "<medicine>" with quantity "<quantity>" and coaching "<coaching>"

  Examples:
    | medicine | quantity | coaching |
    | Wegovy   | 0.25mg   | with     |
    | Wegovy   | 0.5mg    | without  |
```

Group Examples blocks by category (one block per medicine family, one per condition
type, etc.) to keep the table readable.

---

## 6. Given / When / Then rules

| Keyword | Meaning | Use for |
|---------|---------|---------|
| `Given` | Pre-condition / state | Navigation to start page, user role, test data |
| `When`  | Action | Every user interaction (click, enter, select) |
| `Then`  | Observable outcome | Page assertions, success/error messages |
| `And`   | Continue previous keyword | Chain multiple actions or assertions |
| `But`   | Exception to the previous | Rarely needed |

**Common mistake:**
```gherkin
# BAD — Then used as a navigation step inside a When chain:
When the user clicks the Login button
Then the user lands on the Clinic login page   ← this is a state, not an outcome
When the user enters valid login credentials

# GOOD — navigation absorbed into the next action step:
When the user clicks the Login button
And the user enters valid login credentials on the "Clinic login" page
```

---

## 7. Scenario tags

Apply tags at Feature and/or Scenario level to enable filtering in CI.

| Tag | Meaning |
|-----|---------|
| `@smoke` | Must pass before any deployment |
| `@brochure-clinic` | Brochure → Clinic cross-domain journey |
| `@weight-loss` | Weight Loss service |
| `@auth` | Authentication flows |
| `@questionnaire` | Multi-page questionnaire flows |
| `@medicine-selection` | Medicine picker specifically |
| `@wanted` | Scenario uses steps not yet implemented |

---

## 8. Requesting new steps (@wanted)

If a scenario needs a step that does not exist in the catalog:

1. Write the scenario using the step expression you need
2. Tag the scenario `@wanted`
3. Submit to Steve (gatekeeper) for review
4. Approved steps get implemented; the `@wanted` tag is removed

Do NOT invent step expressions that duplicate an existing parametric template.
Check the catalog first: `npm run catalog` regenerates `STEP_CATALOG.md`.

---

## 9. DO / DON'T quick reference

| ❌ Don't | ✅ Do |
|---------|-------|
| `THE USER ON X clicks "Y"` | `the user selects "Y" on the "X" questionnaire page` |
| One scenario per data row | `Scenario Outline` with `Examples` table |
| `And the user lands on X` in a When block | Use `Then the user is on the "X" page` |
| `the user insert the code` | `the user enters the SMS code` |
| 4 steps for SMS verification | `the user completes SMS verification` |
| `GIVEN` / `WHEN` / `THEN` (uppercase) | `Given` / `When` / `Then` (sentence case) |
| Step name includes full page path | Page name as `{string}` parameter |

---

## 10. Using this document with an AI

When asking an AI (ChatGPT, Claude, Copilot) to write or review Gherkin:

1. Paste this file as context before your request
2. Include the relevant section of `STEP_CATALOG.md` (the available expressions)
3. Describe the user journey in plain English
4. Ask: *"Write a Gherkin scenario following the Boots conventions above"*

The AI will use the parametric templates from section 4, apply the DO/DON'T
rules from section 9, and flag any step that is not in the catalog as `@wanted`.

> Note: A VS Code extension that enforces these rules inline (autocomplete,
> linting, @wanted detection) is tracked separately in the project roadmap.
