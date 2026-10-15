# Step Catalog

> **Auto-generated — do not edit by hand.**
> Source of truth: the step definitions in the code. Regenerated on
> every build. To change a step, change the code.

Last update: 2026-10-15T07:21:24.773Z
Total: **76** steps (9 implemented, 67 wanted, 0 deprecated)

Ancorati a componenti di frontend: **63/76** (83%)

## How to use

Before writing a new step in a `.feature`, **search here** (Ctrl+F) for
an existing step that matches the intent. If it exists, reuse the exact
expression. If it does not, flag it to the step gatekeeper.

---

## Domain: `clinic/sentinelle` (7 steps)

### `the order is pending clinical assessment` ⚠️ _undocumented_

_Source:_ `src\steps\clinic\sentinelle\sentinelle.steps.ts:51`

### `the patient answers the questionnaire` ⚠️ _undocumented_

_Source:_ `src\steps\clinic\sentinelle\sentinelle.steps.ts:30`

### `the patient is logged into clinic as {string}`

Accede a clinic come paziente, dalla brochure.

**Parameters:**
- `email` — L'utenza; la password viene dall'ambiente.

_Source:_ `src\steps\clinic\sentinelle\sentinelle.steps.ts:20`

### `the patient pays with the saved card` ⚠️ _undocumented_

_Source:_ `src\steps\clinic\sentinelle\sentinelle.steps.ts:41`

### `the patient picks up in store near {string}` ⚠️ _undocumented_

_Source:_ `src\steps\clinic\sentinelle\sentinelle.steps.ts:35`

### `the patient starts the weight loss service as a returning patient` ⚠️ _undocumented_

_Source:_ `src\steps\clinic\sentinelle\sentinelle.steps.ts:25`

### `the patient takes the photos` ⚠️ _undocumented_

_Source:_ `src\steps\clinic\sentinelle\sentinelle.steps.ts:46`

## Domain: `clinic/weight-loss` (44 steps)

### 🔧 `submit photo`

submit photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Submit"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:356`

### 🔧 `the suer check new notification`

the suer check new notification

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "22 Secure messages"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:313`

### 🔧 `the user answer the question`

the user answer the question

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Next"

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:185`

### 🔧 `the user check and continue the order`

the user check and continue the order

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `checkbox` "I understand the important information above."
- `button` "Continue"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:212`

### 🔧 `the user check the notification and the page`

the user check the notification and the page

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "1 Secure messages"

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:357`

### 🔧 `the user choose pick up in store`

the user choose pick up in store

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Yes, pick up in store"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:242`

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

### 🔧 `the user click on start service`

the user click on start service

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Start a consultations Choose from our list of services"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:96`

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

### 🔧 `the user complete the questionary`

the user complete the questionary

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "No"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:224`

### 🔧 `the user continue`

the user continue

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "continue"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:196`

### 🔧 `the user get another photo for document`

the user get another photo for document

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Submit" — pagina `IdPage`
- `button` "Open camera" — pagina `VisitPage`
- `button` "Take Picture" — pagina `VisitPage`
- `button` "Save" — pagina `VisitPage`
- `button` "That's me" — pagina `VisitPage`

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:315`

### 🔧 `the user get the front photo`

the user get the front photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Open camera"
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:378`

### 🔧 `the user get the id photo`

the user get the id photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Open camera"
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:336`

### 🔧 `the user get the second photo`

the user get the second photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Open camera"
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:292`

### 🔧 `the user insert a card and a photo with {string}, {string} and {string}`

the user insert a card and a photo with {string}, {string} and {string}

**Parameters:**
- `valore1` — textbox "Credit or debit card number"
- `valore2` — textbox "Credit or debit card expiration date"
- `valore3` — textbox "Credit or debit card CVC/CVV"

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Toggle Vitality membership section" — pagina `SummaryPage`
- `textbox` "Credit or debit card number" — pagina `SummaryPage`
- `textbox` "Credit or debit card expiration date" — pagina `SummaryPage`
- `textbox` "Credit or debit card CVC/CVV" — pagina `SummaryPage`
- `button` "Place Order" — pagina `SummaryPage`
- `button` "Open camera" — pagina `IdPage`
- `button` "Take Picture" — pagina `IdPage`
- `button` "Save" — pagina `IdPage`
- `button` "That's me" — pagina `IdPage`

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:260`

### 🔧 `the user insert personal photo`

the user insert personal photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Open camera"
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:309`

### 🔧 `the user insert the bmi and the date with {string}`

the user insert the bmi and the date with {string}

**Parameters:**
- `valore` — spinbutton "0" (sotto "1. What is your current weight?")

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `spinbutton` "0"
- `button` "Next"
- `button` "Open calendar"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:206`

### 🔧 `the user insert the bmi data with {string}`

the user insert the bmi data with {string}

**Parameters:**
- `valore` — spinbutton "0" (sotto "BMI Test question")

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `spinbutton` "0"
- `button` "Next"

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:202`

### 🔧 `the user insert the dose with {string}`

the user insert the dose with {string}

**Parameters:**
- `valore` — spinbutton "0" (sotto "1. What is your current weight?")

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `checkbox` "I understand the important information above." — pagina `ImportantInfoPage`
- `button` "Continue" — pagina `ImportantInfoPage`
- `button` "Stay on the same dose" — pagina `QuestionsPage`
- `spinbutton` "0" — pagina `QuestionsPage`

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:178`

### 🔧 `The user log in and click on start a service with {string}`

The user log in and click on start a service with {string}

**Parameters:**
- `valore` — textbox "Email" (sotto "LOG IN TO SAVE TIME")

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Log in" — pagina `HomePage`
- `textbox` "Email" — pagina `LoginPage`
- `button` "Log In" — pagina `LoginPage`
- `link` "Start a consultations Choose from our list of services" — pagina `AccountPage`

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:77`

### 🔧 `The user log in with {string}`

The user log in with {string}

**Parameters:**
- `valore` — textbox "Email" (sotto "LOG IN TO SAVE TIME")

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Log in" — pagina `HomePage`
- `textbox` "Email" — pagina `LoginPage`
- `button` "Log In" — pagina `LoginPage`

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:73`

### 🔧 `the user logged in`

the user logged in

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Log in"
- `textbox` "Email"
- `button` "Log In"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:68`

### 🔧 `the user open the notification and see the order`

the user open the notification and see the order

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Submit" — pagina `VisitPage`
- `button` "1 Secure messages" — pagina `OrderCompleteAsyncNoCallPage`

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:425`

### 🔧 `the user read the imprtant info with {string}`

the user read the imprtant info with {string}

**Parameters:**
- `valore` — textbox "TdL 1430 Text Answer" (sotto "TdL 1430 Text Question")

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "continue" — pagina `ProductWeiFPage`
- `checkbox` "I understand the important information above." — pagina `ImportantInfoPage`
- `button` "Continue" — pagina `ImportantInfoPage`
- `textbox` "TdL 1430 Text Answer" — pagina `Questions1Page`

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:162`

### 🔧 `the user say no to GP`

the user say no to GP

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "NO"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:228`

### 🔧 `the user select the card`

the user select the card

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "....0000 Expiry 12/29"
- `button` "Place Order"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:284`

### 🔧 `the user select the card and accept payment`

the user select the card and accept payment

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "....0000 Expiry 07/29"
- `button` "Place Order"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:274`

### 🔧 `the user select the medication`

the user select the medication

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "I haven't been here for over 3 months I last used a weight loss medicine from Boots Online doctor more than 3 months ago" — pagina `WeiPage`
- `button` "7.2mg" — pagina `ProductsWeiFPage`
- `button` "Without Coaching £285.97" — pagina `ProductsWeiFPage`
- `button` "Select" — pagina `ProductsWeiFPage`
- `button` "continue" — pagina `ProductWeiFPage`

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:145`

### 🔧 `the user select the Mounjaro 7.5mg without coaching`

the user select the Mounjaro 7.5mg without coaching

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "I'M NEW I am new to the Boots Online Doctor Weight Loss service" — pagina `WeiPage`
- `button` "0.5mg" — pagina `ProductsWeiFPage`
- `button` "Without Coaching £151" — pagina `ProductsWeiFPage`
- `button` "10mg £317.97" — pagina `ProductsWeiFPage`
- `button` "7.5mg" — pagina `ProductsWeiFPage`
- `button` "Select" — pagina `ProductsWeiFPage`

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:130`

### 🔧 `the user select the right store`

the user select the right store

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Select Pharmacy"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:258`

### 🔧 `the user select the store pharmacy to pick up with {string}`

the user select the store pharmacy to pick up with {string}

**Parameters:**
- `valore` — textbox "zip"

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Yes, pick up in store" — pagina `PharmaciesPage`
- `textbox` "zip" — pagina `PharmacyMapSelectionPage`
- `button` "Select Pharmacy" — pagina `PharmacyMapSelectionPage`

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:225`

### 🔧 `The user sleect the store with {string}`

The user sleect the store with {string}

**Parameters:**
- `valore` — textbox "zip"

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `textbox` "zip"
- `button` "Select Pharmacy"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:263`

### 🔧 `The user start a wright loss service`

The user start a wright loss service

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Weight Loss" — pagina `HomePage`
- `link` "Get started" — pagina `TreatmentPage`

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:106`

### 🔧 `the user start the service`

the user start the service

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Weight Loss" — pagina `HomePage`
- `link` "Get started" — pagina `TreatmentPage`

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:118`

### 🔧 `the user submit the photo and the order`

the user submit the photo and the order

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"
- `button` "Submit"

_Source:_ `src\steps\clinic\weight-loss\complete-an-order-on-weight-loss.steps.ts:340`

### 🔧 `user choos to pick up in store`

user choos to pick up in store

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Yes, pick up in store"

_Source:_ `src\steps\clinic\weight-loss\a-user-complete-an-order-in-weight-loss.steps.ts:243`

### 🔧 `user get the second photo`

user get the second photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"

_Source:_ `src\steps\clinic\weight-loss\the-complete-the-second-order.steps.ts:404`

## Domain: `common` (2 steps)

### `the page shows {string}`

Verifica che un elemento atteso sia visibile sulla pagina.

**Parameters:**
- `atteso` — Il nome accessibile, o il testo, dell'elemento.

_Source:_ `src\steps\common\verifica.steps.ts:21`

### `the user is logged in`

L'utente e' dentro l'applicazione: con una sessione valida non fa

_Source:_ `src\steps\common\accesso.steps.ts:18`

## Domain: `generated` (18 steps)

### 🔧 `submit photo`

submit photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Submit"

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:294`

### 🔧 `the user choose pick up in store`

the user choose pick up in store

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Yes, pick up in store"

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:225`

### 🔧 `the user click on start service`

the user click on start service

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Start a consultations Choose from our list of services"

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:83`

### 🔧 `the user complete the questionary`

the user complete the questionary

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "No"

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:207`

### 🔧 `the user get the front photo`

the user get the front photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Open camera"
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:316`

### 🔧 `the user get the id photo`

the user get the id photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Open camera"
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:276`

### 🔧 `the user insert personal photo`

the user insert personal photo

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:254`

### 🔧 `the user insert the bmi and the date`

the user insert the bmi and the date

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `spinbutton` "0"
- `button` "Next"
- `button` "Open calendar"

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:192`

### 🔧 `the user insert the dose`

the user insert the dose

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `checkbox` "I understand the important information above." — pagina `ImportantInfoPage`
- `button` "Continue" — pagina `ImportantInfoPage`
- `button` "Stay on the same dose" — pagina `QuestionsPage`
- `spinbutton` "0" — pagina `QuestionsPage`

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:166`

### 🔧 `The user log in with {string}`

The user log in with {string}

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:65`

### 🔧 `the user open the notification and see the order`

the user open the notification and see the order

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Submit" — pagina `VisitPage`
- `button` "1 Secure messages" — pagina `OrderCompleteAsyncNoCallPage`

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:356`

### 🔧 `the user select the card`

the user select the card

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:245`

### 🔧 `the user select the medication`

the user select the medication

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "I haven't been here for over 3 months I last used a weight loss medicine from Boots Online doctor more than 3 months ago" — pagina `WeiPage`
- `button` "7.2mg" — pagina `ProductsWeiFPage`
- `button` "Without Coaching £285.97" — pagina `ProductsWeiFPage`
- `button` "Select" — pagina `ProductsWeiFPage`
- `button` "continue" — pagina `ProductWeiFPage`

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:134`

### 🔧 `The user sleect the store with {string}`

The user sleect the store with {string}

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:236`

### 🔧 `the user start the service`

the user start the service

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `link` "Weight Loss" — pagina `HomePage`
- `link` "Get started" — pagina `TreatmentPage`

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:105`

### 🔧 `user get the second photo`

user get the second photo

**Componenti di frontend:** _(mai confermati sulla pagina)_
- `button` "Take Picture"
- `button` "Save"
- `button` "That's me"

_Source:_ `src\steps\generated\the-complete-the-second-order.steps.ts:337`

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

