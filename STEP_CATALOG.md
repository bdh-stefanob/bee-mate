# Step Catalog

> **Auto-generated — do not edit by hand.**
> Source of truth: the step definitions in the code. Regenerated on
> every build. To change a step, change the code.

Last update: 2026-09-25T07:31:12.940Z
Total: **144** steps (11 implemented, 133 wanted, 0 deprecated)

Ancorati a componenti di frontend: **5/144** (3%)

## How to use

Before writing a new step in a `.feature`, **search here** (Ctrl+F) for
an existing step that matches the intent. If it exists, reuse the exact
expression. If it does not, flag it to the step gatekeeper.

---

## Domain: `app-a/imported` (7 steps)

### 🔧 `I add {string} to the basket`

<da completare>

_Requester: TBD — Assignee: —_

_Source:_ `src\steps\app-a\imported\checkout.steps.ts:28`

### 🔧 `I am on the homepage`

<da completare>

_Requester: TBD — Assignee: —_

_Source:_ `src\steps\app-a\imported\checkout.steps.ts:15`

### 🔧 `I enter my delivery address {string}`

<da completare>

_Requester: TBD — Assignee: —_

_Source:_ `src\steps\app-a\imported\checkout.steps.ts:54`

### 🔧 `I proceed to checkout`

<da completare>

_Requester: TBD — Assignee: —_

_Source:_ `src\steps\app-a\imported\checkout.steps.ts:41`

### 🔧 `I should see my saved address {string}`

<da completare>

_Requester: TBD — Assignee: —_

_Source:_ `src\steps\app-a\imported\checkout.steps.ts:93`

### 🔧 `I should see the order confirmation page`

<da completare>

_Requester: TBD — Assignee: —_

_Source:_ `src\steps\app-a\imported\checkout.steps.ts:67`

### 🔧 `the order total should be {int}`

<da completare>

_Requester: TBD — Assignee: —_

_Source:_ `src\steps\app-a\imported\checkout.steps.ts:80`

## Domain: `app-a/orders` (1 steps)

### 🔧 `I search for the product {string}`

Searches the catalog for a product by name.

_Requester: DEMO-001 — Assignee: steve_

**Parameters:**
- `product` — The product name to search for.

_Source:_ `src\steps\app-a\orders\orders.steps.ts:15`

## Domain: `auth` (4 steps)

### `I am a registered user`

Registers the test user so they can authenticate.

**Post:** A user account exists, with the default role.

_Source:_ `src\steps\auth\auth.steps.ts:16`

### `I am a registered user with role {string}`

Registers the test user with a specific role.

**Parameters:**
- `role` — The role to assign: "admin" | "standard".

**Post:** A user account exists with the given role.

_Source:_ `src\steps\auth\auth.steps.ts:26`

### `I land on my dashboard`

Verifies the user reached their dashboard after login.

_Source:_ `src\steps\auth\auth.steps.ts:47`

### `I log in with valid credentials`

Authenticates the current user with valid credentials.

**Pre:** A registered user exists.

**Post:** An authenticated session is active.

_Source:_ `src\steps\auth\auth.steps.ts:39`

## Domain: `brochure-clinic` (5 steps)

### 🔧 `the user clicks the Login button`

Clicks the primary Login button visible on the current page.

_Source:_ `src\steps\brochure-clinic\auth.steps.ts:26`

### 🔧 `the user completes SMS verification`

Completes the entire SMS two-factor verification flow in one step.

**Post:** SMS code verified, session active.

_Source:_ `src\steps\brochure-clinic\auth.steps.ts:52`

### 🔧 `the user enters valid login credentials on the {string} page`

Enters valid email and password credentials on the named login page.

**Parameters:**
- `page` — The page where credentials are entered (e.g. "Clinic login").

_Source:_ `src\steps\brochure-clinic\auth.steps.ts:37`

### 🔧 `the user is on the Brochure home page`

Navigates to the the public site home page as the test entry point.

**Post:** Browser is on the Brochure home page.

_Source:_ `src\steps\brochure-clinic\auth.steps.ts:16`

### 🔧 `the user is successfully logged in`

Asserts the user has an authenticated session after login.

_Source:_ `src\steps\brochure-clinic\auth.steps.ts:61`

## Domain: `brochure-clinic/login` (53 steps)

### 🔧 `a registered user landed on the Brochure home page` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `a registered user previously logged in with MFA by {string}` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user previously flagged the 'Remember this device' option` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user is on brochure homepage` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user 90 days ago flagged the option 'Remember this device'` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user inserted valid credentials to login` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user landed on 'Register for an Online Doctor account'` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user inserted credentials to login` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user flagged the authentication method` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user is waiting for the code` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user selected a service` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user started the consultation` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user entered all personal info` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user selected the product to order` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user confirmed he understand the important information` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user completeed all questionnaire answers` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user uploaded the Selfie/ID photos` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks on the Login button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user lands on the Clinic login page` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user enters a valid email address` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user enters a valid password` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks on the login button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user flags the {string}` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks on Send code` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user inserts the received code` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks the verify button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user in order to re-login clicks on the Login button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user enters {string}` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks on the Login link at the bottom of the screen` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user flags the authentication method` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user after 10 seconds clicks on 'Didn't get the code'` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user submits the photos screen` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the system redirects the user on the Clinic login page` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user inserts 6 consecutive times an incorrect code` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user requests 5 consecutive times to send the MFA code` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user enters 6 consecutive times an invalid password` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user received the code` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user inserts after 10 minutes from receipt` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user successfully logs in` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user is redirected on My account page` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the system shows the screen to perform the MFA` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user is able to login after the authentication` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the system displays an error message` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user isn't able to login` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the system locks the account` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the system shows an error message with a link` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user is redirect to the 'Forgot password' flow` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user needs to follow the 'Forgot password' flow` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the system doesn't authenticate the login` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user needs to login again and authenticate with a new code` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the system retains the selected journey` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user can select the delivery method` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user can complete the order` ⚠️ _undocumented_

_Source:_ `team-qa`

## Domain: `brochure-clinic/registration` (47 steps)

### 🔧 `a user on Brochure home page` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks on the "Login" button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user lands on Clinic login page` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks on "Register for an Online Doctor account" button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the email address` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the Password` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user confirm the Password` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user select a security question` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the security answer` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks "Continue" button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the first name` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the last name` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user select the birth gender` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the date of birth` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the mobile number` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the postcode` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insters the {string}` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user flag the {string} about billing and shipping address` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the postcode of Billing address` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user flag the {string} about Term and Conditions` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user select a radio button as autentication metod` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks "Send code" button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the code received` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user clicks "Verify" button` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the postcode through Find my location functionality` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user selects a service` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user starts the order` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user is redirected to Clinic` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user enters the postal code` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user selects their gender` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user enters their date of birth` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user selects the product to order` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user confirms they understand the important information` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user completes all questionnaire answers` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user uploads Selfie/ID photos` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the address` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the {string}, {string}, {string}` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user {string} and {string} Password` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user insert the email address already registred` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user successfully logged in the application` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user lands on clinic home page` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `an error message is dysplayed` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the "Continue" button is disabled` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user is unable to register a new user` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user lands on clinic delivery method` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user chose the delivery method` ⚠️ _undocumented_

_Source:_ `team-qa`

### 🔧 `the user is able to complete the order` ⚠️ _undocumented_

_Source:_ `team-qa`

## Domain: `common` (3 steps)

### `I am logged in as a {string} user` ⚠️ _undocumented_

_Source:_ `src\steps\common\common.steps.ts:29`

### `the page shows {string}`

Verifica che un elemento atteso sia visibile sulla pagina.

**Parameters:**
- `atteso` — Il nome accessibile, o il testo, dell'elemento.

_Source:_ `src\steps\common\verifica.steps.ts:21`

### 🔧 `the user is on the {string} page`

Asserts or navigates to any named page. Shared across all domains.

**Parameters:**
- `page` — The page title or URL segment (e.g. "My Account", "Summary").

_Source:_ `src\steps\common\common.steps.ts:22`

## Domain: `generated` (2 steps)

### 🔧 `L'utente accede al catalogo`

L'utente accede al catalogo

_Source:_ `src\steps\generated\www-saucedemo-com.steps.ts:35`

### 🔧 `l'utente aggiunge un prodotto al carrello`

l'utente aggiunge un prodotto al carrello

_Source:_ `src\steps\generated\www-saucedemo-com.steps.ts:64`

## Domain: `human-recharge/recharge` (7 steps)

### 🔧 `the user clcik on the recharge button`

the user clcik on the recharge button

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Recharges"

_Source:_ `src\steps\human-recharge\recharge\user-try-to-recharge-without-charge.steps.ts:136`

### 🔧 `the user click on the login button`

the user click on the login button

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Sign in"

_Source:_ `src\steps\human-recharge\recharge\user-try-to-recharge-without-charge.steps.ts:102`

### 🔧 `The user click on the login button`

The user click on the login button

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Sign in"

_Source:_ `src\steps\human-recharge\recharge\user-try-to-recharge-without-charge.steps.ts:48`

### 🔧 `the user click on the the first music`

the user click on the the first music

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Open FOCUS" — pagina `RicarichePage`
- `button` "Listen with headphones or smartphone" — pagina `RicaricheDetailPage`
- `button` "Back" — pagina `RicaricheDetailPage`

_Source:_ `src\steps\human-recharge\recharge\user-try-to-recharge-without-charge.steps.ts:155`

### 🔧 `the user insert the password`

the user insert the password

_Source:_ `src\steps\human-recharge\recharge\user-try-to-recharge-without-charge.steps.ts:85`

### 🔧 `the user insert the username`

the user insert the username

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `textbox` "Email"

_Source:_ `src\steps\human-recharge\recharge\user-try-to-recharge-without-charge.steps.ts:67`

### 🔧 `the user land on the homepage`

the user land on the homepage

_Source:_ `src\steps\human-recharge\recharge\user-try-to-recharge-without-charge.steps.ts:118`

## Domain: `orders` (5 steps)

### `I place the order`

Submits the current cart as an order.

**Pre:** The cart contains at least one product.

**Post:** An order is created.

_Source:_ `src\steps\orders\orders.steps.ts:46`

### `the cart contains the following products:`

Adds several products to the cart from a table.

**Post:** The cart contains every product/quantity listed.

_Source:_ `src\steps\orders\orders.steps.ts:29`

### `the cart contains the product {string}`

Adds a single product to the cart.

**Parameters:**
- `product` — The product name to add.

**Post:** The cart contains the named product, quantity 1.

_Source:_ `src\steps\orders\orders.steps.ts:17`

### `the order is confirmed`

Verifies the order was confirmed.

_Source:_ `src\steps\orders\orders.steps.ts:54`

### `the order status is {string}`

Verifies the order has the expected status.

**Parameters:**
- `status` — Expected status, e.g. "pending".

_Source:_ `src\steps\orders\orders.steps.ts:64`

## Domain: `weight-loss` (10 steps)

### 🔧 `the user clicks {string} on the {string} service page`

Clicks a primary call-to-action on a service landing page.

**Parameters:**
- `cta` — Button label (e.g. "Get started online", "View our in store service").
- `service` — The service page name (e.g. "Weight Loss Treatment Service").

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:33`

### 🔧 `the user clicks next on the {string} questionnaire page`

Clicks the Next button to advance from a questionnaire page.

**Parameters:**
- `page` — The questionnaire page name.

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:150`

### 🔧 `the user confirms the medicine selection`

Clicks continue on the medicine confirmation page.

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:79`

### 🔧 `the user enters height {string} in {string} and weight {string} in {string}`

Enters height and weight with explicit unit selection.

**Parameters:**
- `height` — Numeric value as string (e.g. "175", "5").
- `heightUnit` — "cm" | "ft/in".
- `weight` — Numeric value as string (e.g. "80", "12").
- `weightUnit` — "kg" | "st/lbs".

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:106`

### 🔧 `the user flags the consent checkbox and continues on the {string} page`

Flags the mandatory consent checkbox and clicks continue.

**Parameters:**
- `page` — The page name (e.g. "Important Info", "GP or Bariatric Team").

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:89`

### 🔧 `the user selects {string} and enters {string} on the {string} questionnaire page`

Selects an option that requires additional free-text on a questionnaire page.

**Parameters:**
- `option` — The option label to select (triggers the text input).
- `value` — The free-text value to enter in the associated input field.
- `page` — The questionnaire page name.

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:137`

### 🔧 `the user selects {string} as their service status`

Selects the user's returning-patient status at the start of the flow.

**Parameters:**
- `status` — One of: "I'm New" | "I haven't been here for over 3 months" |

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:48`

### 🔧 `the user selects {string} from the popular services menu`

Selects a service from the popular services navigation menu.

**Parameters:**
- `service` — The service label (e.g. "Weight loss", "Hair loss", "Acne").

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:19`

### 🔧 `the user selects {string} on the {string} questionnaire page`

Selects a single option on any questionnaire page and clicks next.

**Parameters:**
- `option` — The exact option label to select.
- `page` — The questionnaire page name (e.g. "Ethnic Background",

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:122`

### 🔧 `the user selects medicine {string} with quantity {string} and coaching {string}`

Selects a weight loss medicine with dosage tier and coaching option.

**Parameters:**
- `medicine` — Medicine name: "Medicina A" | "Medicina B" | "Medicina C" | "Medicina D" |
- `quantity` — Dose string (e.g. "0.25mg", "5mg", "3 Pens"). Empty string when
- `coaching` — "with" | "without".

_Source:_ `src\steps\weight-loss\questionnaire.steps.ts:66`

