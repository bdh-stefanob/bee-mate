# Step Catalog

> **Auto-generated — do not edit by hand.**
> Source of truth: the step definitions in the code. Regenerated on
> every build. To change a step, change the code.

Last update: 2026-06-10T14:37:30.297Z
Total: **34** steps (10 implemented, 24 wanted, 0 deprecated)

## How to use

Before writing a new step in a `.feature`, **search here** (Ctrl+F) for
an existing step that matches the intent. If it exists, reuse the exact
expression. If it does not, flag it to the step gatekeeper.

---

## Domain: `app-a/imported` (7 steps)

### 🔧 `I add {string} to the basket`

<da completare>

_Requester: TBD — Assignee: —_

_Implementation:_ `src\steps\app-a\imported\checkout.steps.ts:27`

### 🔧 `I am on the homepage`

<da completare>

_Requester: TBD — Assignee: —_

_Implementation:_ `src\steps\app-a\imported\checkout.steps.ts:14`

### 🔧 `I enter my delivery address {string}`

<da completare>

_Requester: TBD — Assignee: —_

_Implementation:_ `src\steps\app-a\imported\checkout.steps.ts:53`

### 🔧 `I proceed to checkout`

<da completare>

_Requester: TBD — Assignee: —_

_Implementation:_ `src\steps\app-a\imported\checkout.steps.ts:40`

### 🔧 `I should see my saved address {string}`

<da completare>

_Requester: TBD — Assignee: —_

_Implementation:_ `src\steps\app-a\imported\checkout.steps.ts:92`

### 🔧 `I should see the order confirmation page`

<da completare>

_Requester: TBD — Assignee: —_

_Implementation:_ `src\steps\app-a\imported\checkout.steps.ts:66`

### 🔧 `the order total should be {int}`

<da completare>

_Requester: TBD — Assignee: —_

_Implementation:_ `src\steps\app-a\imported\checkout.steps.ts:79`

## Domain: `app-a/orders` (1 steps)

### 🔧 `I search for the product {string}`

Searches the catalog for a product by name.

_Requester: DEMO-001 — Assignee: steve_

**Parameters:**
- `product` — The product name to search for.

_Implementation:_ `src\steps\app-a\orders\orders.steps.ts:15`

## Domain: `auth` (4 steps)

### `I am a registered user`

Registers the test user so they can authenticate.

**Post:** A user account exists, with the default role.

_Implementation:_ `src\steps\auth\auth.steps.ts:16`

### `I am a registered user with role {string}`

Registers the test user with a specific role.

**Parameters:**
- `role` — The role to assign: "admin" | "standard".

**Post:** A user account exists with the given role.

_Implementation:_ `src\steps\auth\auth.steps.ts:26`

### `I land on my dashboard`

Verifies the user reached their dashboard after login.

_Implementation:_ `src\steps\auth\auth.steps.ts:47`

### `I log in with valid credentials`

Authenticates the current user with valid credentials.

**Pre:** A registered user exists.

**Post:** An authenticated session is active.

_Implementation:_ `src\steps\auth\auth.steps.ts:39`

## Domain: `brochure-clinic` (5 steps)

### 🔧 `the user clicks the Login button`

Clicks the primary Login button visible on the current page.

_Implementation:_ `src\steps\brochure-clinic\auth.steps.ts:26`

### 🔧 `the user completes SMS verification`

Completes the entire SMS two-factor verification flow in one step.

**Post:** SMS code verified, session active.

_Implementation:_ `src\steps\brochure-clinic\auth.steps.ts:52`

### 🔧 `the user enters valid login credentials on the {string} page`

Enters valid email and password credentials on the named login page.

**Parameters:**
- `page` — The page where credentials are entered (e.g. "Clinic login").

_Implementation:_ `src\steps\brochure-clinic\auth.steps.ts:37`

### 🔧 `the user is on the Brochure home page`

Navigates to the Boots Brochure home page as the test entry point.

**Post:** Browser is on the Brochure home page.

_Implementation:_ `src\steps\brochure-clinic\auth.steps.ts:16`

### 🔧 `the user is successfully logged in`

Asserts the user has an authenticated session after login.

_Implementation:_ `src\steps\brochure-clinic\auth.steps.ts:61`

## Domain: `common` (2 steps)

### `I am logged in as a {string} user` ⚠️ _undocumented_

_Implementation:_ `src\steps\common\common.steps.ts:29`

### 🔧 `the user is on the {string} page`

Asserts or navigates to any named page. Shared across all domains.

**Parameters:**
- `page` — The page title or URL segment (e.g. "My Account", "Summary").

_Implementation:_ `src\steps\common\common.steps.ts:22`

## Domain: `orders` (5 steps)

### `I place the order`

Submits the current cart as an order.

**Pre:** The cart contains at least one product.

**Post:** An order is created.

_Implementation:_ `src\steps\orders\orders.steps.ts:46`

### `the cart contains the following products:`

Adds several products to the cart from a table.

**Post:** The cart contains every product/quantity listed.

_Implementation:_ `src\steps\orders\orders.steps.ts:29`

### `the cart contains the product {string}`

Adds a single product to the cart.

**Parameters:**
- `product` — The product name to add.

**Post:** The cart contains the named product, quantity 1.

_Implementation:_ `src\steps\orders\orders.steps.ts:17`

### `the order is confirmed`

Verifies the order was confirmed.

_Implementation:_ `src\steps\orders\orders.steps.ts:54`

### `the order status is {string}`

Verifies the order has the expected status.

**Parameters:**
- `status` — Expected status, e.g. "pending".

_Implementation:_ `src\steps\orders\orders.steps.ts:64`

## Domain: `weight-loss` (10 steps)

### 🔧 `the user clicks {string} on the {string} service page`

Clicks a primary call-to-action on a service landing page.

**Parameters:**
- `cta` — Button label (e.g. "Get started online", "View our in store service").
- `service` — The service page name (e.g. "Weight Loss Treatment Service").

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:33`

### 🔧 `the user clicks next on the {string} questionnaire page`

Clicks the Next button to advance from a questionnaire page.

**Parameters:**
- `page` — The questionnaire page name.

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:150`

### 🔧 `the user confirms the medicine selection`

Clicks continue on the medicine confirmation page.

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:79`

### 🔧 `the user enters height {string} in {string} and weight {string} in {string}`

Enters height and weight with explicit unit selection.

**Parameters:**
- `height` — Numeric value as string (e.g. "175", "5").
- `heightUnit` — "cm" | "ft/in".
- `weight` — Numeric value as string (e.g. "80", "12").
- `weightUnit` — "kg" | "st/lbs".

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:106`

### 🔧 `the user flags the consent checkbox and continues on the {string} page`

Flags the mandatory consent checkbox and clicks continue.

**Parameters:**
- `page` — The page name (e.g. "Important Info", "GP or Bariatric Team").

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:89`

### 🔧 `the user selects {string} and enters {string} on the {string} questionnaire page`

Selects an option that requires additional free-text on a questionnaire page.

**Parameters:**
- `option` — The option label to select (triggers the text input).
- `value` — The free-text value to enter in the associated input field.
- `page` — The questionnaire page name.

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:137`

### 🔧 `the user selects {string} as their service status`

Selects the user's returning-patient status at the start of the flow.

**Parameters:**
- `status` — One of: "I'm New" | "I haven't been here for over 3 months" |

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:48`

### 🔧 `the user selects {string} from the popular services menu`

Selects a Boots service from the popular services navigation menu.

**Parameters:**
- `service` — The service label (e.g. "Weight loss", "Hair loss", "Acne").

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:19`

### 🔧 `the user selects {string} on the {string} questionnaire page`

Selects a single option on any questionnaire page and clicks next.

**Parameters:**
- `option` — The exact option label to select.
- `page` — The questionnaire page name (e.g. "Ethnic Background",

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:122`

### 🔧 `the user selects medicine {string} with quantity {string} and coaching {string}`

Selects a weight loss medicine with dosage tier and coaching option.

**Parameters:**
- `medicine` — Medicine name: "Wegovy" | "Mounjaro" | "Nevolat" | "Orlistat" |
- `quantity` — Dose string (e.g. "0.25mg", "5mg", "3 Pens"). Empty string when
- `coaching` — "with" | "without".

_Implementation:_ `src\steps\weight-loss\questionnaire.steps.ts:66`

