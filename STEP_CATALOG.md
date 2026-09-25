# Step Catalog

> **Auto-generated — do not edit by hand.**
> Source of truth: the step definitions in the code. Regenerated on
> every build. To change a step, change the code.

Last update: 2026-09-25T10:19:14.299Z
Total: **10** steps (1 implemented, 9 wanted, 0 deprecated)

Ancorati a componenti di frontend: **7/10** (70%)

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

## Domain: `generated` (2 steps)

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

