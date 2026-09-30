# Step Catalog

> **Auto-generated — do not edit by hand.**
> Source of truth: the step definitions in the code. Regenerated on
> every build. To change a step, change the code.

Last update: 2026-09-30T14:39:46.350Z
Total: **19** steps (1 implemented, 18 wanted, 0 deprecated)

Ancorati a componenti di frontend: **15/19** (79%)

## How to use

Before writing a new step in a `.feature`, **search here** (Ctrl+F) for
an existing step that matches the intent. If it exists, reuse the exact
expression. If it does not, flag it to the step gatekeeper.

---

## Domain: `common` (1 steps)

### `the page shows {string}`

Verifica che un elemento atteso sia visibile sulla pagina.

**Parameters:**
- `atteso` — Il nome accessibile, o il testo, dell'elemento.

_Source:_ `src\steps\common\verifica.steps.ts:21`

## Domain: `generated` (5 steps)

### 🔧 `the user open the recharge tab`

the user open the recharge tab

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Recharges"

_Source:_ `src\steps\generated\humanrechargeweb-humanrecharge-up-railway-app.steps.ts:64`

### 🔧 `the user signs in`

the user signs in

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Sign in" — pagina `HomePage`
- `textbox` "Email" — pagina `AccediPage`
- `button` "Sign in" — pagina `AccediPage`

_Source:_ `src\steps\generated\humanrechargeweb-humanrecharge-up-railway-app.steps.ts:44`

### 🔧 `the user adds a product to the cart`

the user adds a product to the cart

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Add to cart"

_Source:_ `src\steps\generated\www-saucedemo-com.steps.ts:64`

### 🔧 `the user complete the order`

the user complete the order

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Cart, 1 items" — pagina `InventoryPage`
- `button` "Checkout" — pagina `CartPage`
- `textbox` "First Name" — pagina `CheckoutStepOnePage`
- `textbox` "Last Name" — pagina `CheckoutStepOnePage`
- `textbox` "Zip/Postal Code" — pagina `CheckoutStepOnePage`
- `button` "Continue" — pagina `CheckoutStepOnePage`
- `button` "Finish" — pagina `CheckoutStepTwoPage`

_Source:_ `src\steps\generated\www-saucedemo-com.steps.ts:86`

### 🔧 `the user logs in`

the user logs in

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `textbox` "Username"
- `button` "Login"

_Source:_ `src\steps\generated\www-saucedemo-com.steps.ts:46`

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

## Domain: `shop/order` (6 steps)

### 🔧 `The user back to home`

The user back to home

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Back Home"

_Source:_ `src\steps\shop\order\the-user-complete-the-order-and-go-back-to-home.steps.ts:101`

### 🔧 `The user complete the order`

The user complete the order

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Add to cart" — pagina `InventoryPage`
- `button` "Cart, 1 items" — pagina `InventoryPage`
- `button` "Checkout" — pagina `CartPage`
- `textbox` "First Name" — pagina `CheckoutStepOnePage`
- `textbox` "Last Name" — pagina `CheckoutStepOnePage`
- `textbox` "Zip/Postal Code" — pagina `CheckoutStepOnePage`
- `button` "Continue" — pagina `CheckoutStepOnePage`
- `button` "Finish" — pagina `CheckoutStepTwoPage`

_Source:_ `src\steps\shop\order\the-user-complete-the-order-and-go-back-to-home.steps.ts:72`

### 🔧 `The user logged in`

The user logged in

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `textbox` "Username"
- `button` "Login"

_Source:_ `src\steps\shop\order\the-user-complete-the-order-and-go-back-to-home.steps.ts:47`

### 🔧 `the tester did not close this step`

the tester did not close this step

_Source:_ `src\steps\shop\order\the-user-complet-the-order-on-demo.steps.ts:110`

### 🔧 `the user add a product to the cart`

the user add a product to the cart

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Add to cart"

_Source:_ `src\steps\shop\order\the-user-complet-the-order-on-demo.steps.ts:64`

### 🔧 `the user logged in`

the user logged in

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `textbox` "Username"
- `button` "Login"

_Source:_ `src\steps\shop\order\the-user-complet-the-order-on-demo.steps.ts:47`

