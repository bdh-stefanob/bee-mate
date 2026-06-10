# Step Catalog

> **Auto-generated — do not edit by hand.**
> Source of truth: the step definitions in the code. Regenerated on
> every build. To change a step, change the code.

Last update: 2026-06-10T07:27:40.433Z
Total: **18** steps (10 implemented, 8 wanted, 0 deprecated)

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

## Domain: `common` (1 steps)

### `I am logged in as a {string} user`

Logs in as a user of the given role in one declarative step.

**Parameters:**
- `role` — The role to log in as: "admin" | "standard".

**Post:** An authenticated session is active for that role.

_Implementation:_ `src\steps\common\common.steps.ts:16`

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

