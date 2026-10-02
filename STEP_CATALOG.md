# Step Catalog

> **Auto-generated — do not edit by hand.**
> Source of truth: the step definitions in the code. Regenerated on
> every build. To change a step, change the code.

Last update: 2026-10-02T09:30:03.931Z
Total: **25** steps (2 implemented, 23 wanted, 0 deprecated)

Ancorati a componenti di frontend: **23/25** (92%)

## How to use

Before writing a new step in a `.feature`, **search here** (Ctrl+F) for
an existing step that matches the intent. If it exists, reuse the exact
expression. If it does not, flag it to the step gatekeeper.

---

## Domain: `clinic/weight-loss` (16 steps)

### 🔧 `the suer check new notification`

the suer check new notification

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "22 Secure messages"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:313`

### 🔧 `the user check and continue the order`

the user check and continue the order

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `checkbox` "I understand the important information above."
- `button` "Continue"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:212`

### 🔧 `the user click on back to account`

the user click on back to account

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Back to Account"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:85`

### 🔧 `the user click on get started`

the user click on get started

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Get started"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:130`

### 🔧 `the user click on i am old user`

the user click on i am old user

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "I haven't been here for over 3 months I last used a weight loss medicine from Boots Online doctor more than 3 months ago"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:160`

### 🔧 `the user click on start services`

the user click on start services

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Start a consultations Choose from our list of services"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:100`

### 🔧 `the user click on started over a started services`

the user click on started over a started services

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Start over"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:145`

### 🔧 `the user click on weight loss treatment`

the user click on weight loss treatment

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Weight Loss"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:115`

### 🔧 `the user compile the treatment section`

the user compile the treatment section

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "0.5mg"
- `button` "With Coaching £146.97"
- `radio` "With Coaching"
- `button` "Select"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:178`

### 🔧 `the user complete the photo autentication`

the user complete the photo autentication

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Open camera"
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"
- `button` "Submit"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:294`

### 🔧 `the user continue`

the user continue

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "continue"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:196`

### 🔧 `the user logged in`

the user logged in

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Log in"
- `textbox` "Email"
- `button` "Log In"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:68`

### 🔧 `the user say no to GP`

the user say no to GP

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "NO"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:228`

### 🔧 `the user select the card and accept payment`

the user select the card and accept payment

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "....0000 Expiry 07/29"
- `button` "Place Order"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:274`

### 🔧 `the user select the right store`

the user select the right store

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Select Pharmacy"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:258`

### 🔧 `user choos to pick up in store`

user choos to pick up in store

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Yes, pick up in store"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:243`

## Domain: `common` (2 steps)

### `the page shows {string}`

Verifica che un elemento atteso sia visibile sulla pagina.

**Parameters:**
- `atteso` — Il nome accessibile, o il testo, dell'elemento.

_Source:_ `src\steps\common\verifica.steps.ts:21`

### `the user is logged in`

L'utente e' dentro l'applicazione: con una sessione valida non fa

_Source:_ `src\steps\common\accesso.steps.ts:18`

## Domain: `generated` (2 steps)

### 🔧 `il cliente accede all'area ordini`

il cliente accede all'area ordini

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `textbox` "Email"
- `button` "Entra"

_Source:_ `src\steps\generated\zz-controllo.steps.ts:39`

### 🔧 `il cliente annulla un ordine`

il cliente annulla un ordine

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Annulla ordine"

_Source:_ `src\steps\generated\zz-controllo.steps.ts:58`

## Domain: `qa-brochure/weight-loss` (5 steps)

### 🔧 `the user check the last notification`

the user check the last notification

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "2 Secure messages"

_Source:_ `src\steps\qa-brochure\weight-loss\the-user-complete-the-order.steps.ts:179`

### 🔧 `the user click get started`

the user click get started

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Get started"

_Source:_ `src\steps\qa-brochure\weight-loss\the-user-complete-the-order.steps.ts:94`

### 🔧 `the user complete the order`

the user complete the order

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "I'M NEW I am new to the Boots Online Doctor Weight Loss service" — pagina `WeiPage`
- `button` "With Coaching £121" — pagina `ProductsWeiFPage`
- `radio` "With Coaching" — pagina `ProductsWeiFPage`
- `button` "Select" — pagina `ProductsWeiFPage`
- `button` "continue" — pagina `ProductWeiFPage`
- `checkbox` "I understand the important information above." — pagina `ImportantInfoPage`
- `button` "Continue" — pagina `ImportantInfoPage`
- `button` "Start of the Questionnaire Section - Move along" — pagina `QuestionsPage`
- `button` "Next" — pagina `QuestionsPage`
- `button` "No GP" — pagina `QuestionsPage`
- `spinbutton` "0" — pagina `QuestionsPage`
- `button` "Yes, pick up in store" — pagina `PharmaciesPage`
- `button` "Select Pharmacy" — pagina `PharmacyMapSelectionPage`
- `button` "Place Order" — pagina `SummaryPage`
- `button` "Open camera" — pagina `VisitPage`
- `button` "Take Picture" — pagina `VisitPage`
- `button` "Save" — pagina `VisitPage`
- `button` "That's me" — pagina `VisitPage`
- `button` "Submit" — pagina `VisitPage`

_Source:_ `src\steps\qa-brochure\weight-loss\the-user-complete-the-order.steps.ts:127`

### 🔧 `the user land on brochure`

the user land on brochure

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Start a consultations Choose from our list of services" — pagina `AccountPage`
- `button` "Accept All" — pagina `HomePage`

_Source:_ `src\steps\qa-brochure\weight-loss\the-user-complete-the-order.steps.ts:61`

### 🔧 `the user open the weight loss`

the user open the weight loss

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Weight Loss"

_Source:_ `src\steps\qa-brochure\weight-loss\the-user-complete-the-order.steps.ts:81`

