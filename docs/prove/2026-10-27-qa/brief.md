# Compito: portare uno scenario generato nel vocabolario del catalogo

Una tester ha eseguito a mano una sessione (200s, 7 intenti dichiarati da lei). Da quella sessione sono gia' stati generati **feature, Page Object e step definition, in modo deterministico**. Il test gira. Nessun modello ha scritto niente di quel codice.

## Cosa NON devi fare

- Non riscrivere le Page Object. Esistono, sono generate dal dizionario dei componenti, e alla prossima rigenerazione le tue modifiche sparirebbero.
- Non inventare metodi. Sotto c'e' l'elenco esatto di quelli disponibili: chiamarne uno che non c'e' fa fallire `tsc`.
- Non scrivere selettori. Un selettore in una step definition e' un errore di layer, sempre.
- Non proporre una struttura diversa. Se una convenzione non va, si cambia il modello in `templates/`, non il file generato.

## Cosa devi fare

Due cose, e solo due:

1. **La frase Gherkin** di ogni passo. Adesso e' l'etichetta che ha scritto la tester: vera, ma non nel vocabolario condiviso.
2. **Quali metodi chiamare**, dove la sequenza generata non rende l'intento.

Per ogni passo, in quest'ordine:

1. Un candidato esprime gia' l'intento → usalo **con la stessa identica formulazione**. Non "quasi": identica. Una quasi-duplicazione e' peggio di uno step mancante.
2. Ci va vicino ma cambia un valore → parametrizzalo (`{string}`, `{int}`) **modificando lo step esistente**, non aggiungendone uno accanto.
3. Nessuno regge → proponi **una** formulazione nuova, taggata `@wanted`, e dillo. Non scegliere il meno peggio per far quadrare il conto.

## I passi, uno per uno

### 1. the user select insomnia treatment

- Pagina: `HomePage` (`/`)
- **Cambia pagina**: finisce su `InsomniaServicePage`

**Cosa ha fatto la tester**

- `clickServices` — click su button "Services"
- `goToInsomnia` — click su link "Insomnia"
- `goToGetStarted` — click su link "Get started"

**Candidati dal catalogo**

- `When the user click on get started` — pagina TreatmentPage
- `When the user click get started` — pagina TreatmentPage
- `When the user select Jet-Lag service` — pagina HomePage
- `When the user start the hair loss treatment` — pagina HomePage
- `When the user start the service` — pagina HomePage

### 2. the user select i'am new

- Pagina: `InsPage` (`/services/INS`)

**Cosa ha fatto la tester**

- `clickIMNewToBoots` — click su link "I'm new to Boots Online Doctor for insomnia I'm here for my first visit with the medical team for insomnia treatment..." ⚠ non nel dizionario

**Candidati dal catalogo**

- `When the user select the card`
- `When the user insert the store cap and select it on the map with {string}`
- `When the user select a card on his list and confrm the payment`
- `When the user selct the card and confirm`

### 3. the user select a product

- Pagina: `ProductsInsFPage` (`/products/INS-F`)
- **Cambia pagina**: finisce su `ProductInsFPage`

**Cosa ha fatto la tester**

- `click30Tablets85Quviviq25mg` — click su button "30 Tablets £85 Quviviq 25mg Quviviq is an oral tablet used to treat chronic insomnia (long-term sleeping difficulties) t"
- `clickContinue` — click su button "continue"

**Candidati dal catalogo**

- `When the user continue` — pagina ProductWeiFPage
- `When the user confirm the product and accept` — pagina ProductHaiFPage
- `When the user select and confirm the propduct` — pagina ProductsJetFPage
- `When the user read the imprtant info with {string}` — pagina ProductWeiFPage
- `When the user check and continue the order` — pagina ImportantInfoPage

### 4. the user accept important info

- Pagina: `ImportantInfoPage` (`/important-info`)

**Cosa ha fatto la tester**

- `setIUnderstandTheImportantInformation` — set su checkbox "I understand the important information above." con "checked"
- `clickContinue` — click su button "Continue"

**Candidati dal catalogo**

- `When the user accept important info` — pagina ImportantInfoPage
- `When the user confirm the product and accept` — pagina ProductHaiFPage
- `When the user continue` — pagina ProductWeiFPage
- `When the user check and continue the order` — pagina ImportantInfoPage
- `When the user read the imprtant info with {string}` — pagina ProductWeiFPage

### 5. th user pick up in store and selct a store

- Pagina: `Questions1Page` (`/questions/1`)
- **Cambia pagina**: finisce su `PharmacyMapSelectionPage`

**Cosa ha fatto la tester**

- `?` — click su button "Less than 3 months"
- `?` — click su button "Next"
- `?` — click su button "Less than 7 hours"
- `?` — click su button "Next"
- `clickYesPickUpInStore` — click su button "Yes, pick up in store"
- `?` — fill su textbox "zip" con "NW1"
- `?` — click su button "Select Pharmacy"

**Candidati dal catalogo**

- `When user choos to pick up in store` — pagina PharmaciesPage
- `When the user choose pick up in store` — pagina PharmaciesPage
- `When the user click on pick up in store` — pagina PharmaciesPage
- `When the user select the store pharmacy to pick up with {string}` — pagina PharmaciesPage
- `When the user select the right store` — pagina PharmacyMapSelectionPage

### 6. the user comple the card assignemnt

- Pagina: `SummaryPage` (`/summary`)

**Cosa ha fatto la tester**

- `click0005Expiry0729` — click su button "....0005 Expiry 07/29"
- `clickSaveContinue` — click su button "Save & continue"

**Candidati dal catalogo**

- `When the user select the card`
- `When the user selct the card and confirm`

### 7. the user check notification

- Pagina: `OrderCompleteAsyncNoCallPage` (`/order-complete-async-no-call`)
- **Cambia pagina**: finisce su `MessagesPage`

**Cosa ha fatto la tester**

- `click16SecureMessages` — click su button "16 Secure messages" ⚠ non nel dizionario

**Cosa ha verificato**

- button "16 Secure messages"

**Candidati dal catalogo**

_Nessuno._ Serve una formulazione nuova, da taggare `@wanted`. Non ripiegare su uno step lontano.

## I metodi che puoi chiamare

Questo e' l'elenco completo. Non ce ne sono altri, e chiamarne uno che non c'e' fa fallire la compilazione.

### `HomePage`

- `clickServices()` — button "Services"
- `goToInsomnia()` — link "Insomnia"

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

### `InsomniaServicePage`

- `goToGetStarted()` — link "Get started" ⚠ ambiguous

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

### `InsPage`

- `clickIMNewToBoots()` — link "I'm new to Boots Online Doctor for insomnia I'm here for my first visit with the medical team for insomnia treatment..." ⚠ unstable

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

### `ProductsInsFPage`

- `click30Tablets85Quviviq25mg()` — button "30 Tablets £85 Quviviq 25mg Quviviq is an oral tablet used to treat chronic insomnia (long-term sleeping difficulties) t" ⚠ unstable

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

### `ProductInsFPage`

- `clickContinue()` — button "continue"

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

### `ImportantInfoPage`

- `setIUnderstandTheImportantInformation()` — checkbox "I understand the important information above."
- `clickContinue()` — button "Continue"

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

### `PharmaciesPage`

- `clickYesPickUpInStore()` — button "Yes, pick up in store"

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

### `SummaryPage`

- `click0005Expiry0729()` — button "....0005 Expiry 07/29" ⚠ ambiguous
- `clickSaveContinue()` — button "Save & continue"

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

### `OrderCompleteAsyncNoCallPage`

- `click16SecureMessages()` — button "16 Secure messages"

Piu' `navigate()` e `assertLoaded()`, che vengono da `BasePage`.

## Il passo di verifica

Tutte le verifiche di presenza usano un solo step parametrizzato:

    Then the page shows {string}

E' uno solo di proposito: uno per elemento sarebbe uno step nuovo a ogni registrazione, cioe' esattamente l'entropia da togliere. Specializzalo solo dove l'intento lo merita davvero — e in quel caso dillo.

## I file su cui lavorare

- `src/pages/generated/qa-brochure.lemonaidhealth.co.uk/home.page.ts` — **non toccare**, si rigenera
- `src/pages/generated/qa-brochure.lemonaidhealth.co.uk/insomnia-service.page.ts` — **non toccare**, si rigenera
- `src/pages/generated/qa-clinic.lemonaidhealth.co.uk/ins.page.ts` — **non toccare**, si rigenera
- `src/pages/generated/qa-clinic.lemonaidhealth.co.uk/products-ins-f.page.ts` — **non toccare**, si rigenera
- `src/pages/generated/qa-clinic.lemonaidhealth.co.uk/product-ins-f.page.ts` — **non toccare**, si rigenera
- `src/pages/generated/qa-clinic.lemonaidhealth.co.uk/important-info.page.ts` — **non toccare**, si rigenera
- `src/pages/generated/qa-clinic.lemonaidhealth.co.uk/pharmacies.page.ts` — **non toccare**, si rigenera
- `src/pages/generated/qa-clinic.lemonaidhealth.co.uk/summary.page.ts` — **non toccare**, si rigenera
- `src/pages/generated/qa-clinic.lemonaidhealth.co.uk/order-complete-async-no-call.page.ts` — **non toccare**, si rigenera
- `src/steps/generated/qa-clinic-lemonaidhealth-co-uk.steps.ts`
- `src/features/generated/qa-clinic-lemonaidhealth-co-uk.feature`

## Cosa il generatore non ha saputo fare da solo

Non sono errori da correggere in silenzio: sono cose da **riportare**. Riempirle indovinando produce un file che sembra completo e non lo e'.

- **ancoraggio-instabile** — (tutta la registrazione): Il percorso attraversa 2 domini diversi. Le Page Object generate hanno percorsi relativi a un solo indirizzo di partenza: quelle del secondo dominio non navigherebbero dove credono. Serve un indirizzo per dominio — oppure si spezza la registrazione in due, una per dominio.
- **ancoraggio-instabile** — the user select insomnia treatment: link "Get started" e' un ancoraggio ambiguous (3 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro). Il test si rompera' senza che nessuno abbia cambiato niente.
- **componente-non-nel-dizionario** — the user select i'am new: link "I'm new to Boots Online Doctor for insomnia I'm here for my first visit with the medical team for insomnia treatment..." su InsPage non e' nel dizionario. Il locator e' stato sintetizzato dalla registrazione, ma non sappiamo se e' univoco sulla pagina. Rilancia lo scout su https://qa-clinic.lemonaidhealth.co.uk/services/INS
- **ancoraggio-instabile** — the user select i'am new: link "I'm new to Boots Online Doctor for insomnia I'm here for my first visit with the medical team for insomnia treatment..." e' un ancoraggio unstable (nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo). Il test si rompera' senza che nessuno abbia cambiato niente.
- **ancoraggio-instabile** — the user select a product: button "30 Tablets £85 Quviviq 25mg Quviviq is an oral tablet used to treat chronic insomnia (long-term sleeping difficulties) t" e' un ancoraggio unstable (nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo). Il test si rompera' senza che nessuno abbia cambiato niente.
- **utility-proposta** — the user select a product: Questo passo assomiglia alla utility "prodotto" (src/actions/prodotto.actions.ts), ma contiene anche altri gesti: resta generato com'e'. Se i gesti in piu' sono rumore, toglili e rigenera.
- **ancoraggio-instabile** — the user comple the card assignemnt: button "....0005 Expiry 07/29" e' un ancoraggio ambiguous (contiene un identificativo numerico; 5 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro). Il test si rompera' senza che nessuno abbia cambiato niente.
- **componente-non-nel-dizionario** — the user check notification: button "16 Secure messages" su OrderCompleteAsyncNoCallPage non e' nel dizionario. Il locator e' stato sintetizzato dalla registrazione, ma non sappiamo se e' univoco sulla pagina. Rilancia lo scout su https://qa-clinic.lemonaidhealth.co.uk/order-complete-async-no-call
- **asserzione-non-verificabile** — the user check notification: La verifica su text "27/10/2026 11:25 AM" e' ancorata a un nome unstable (contiene una data; contiene un identificativo numerico). Verifica il contenuto, non l'esistenza dell'elemento.
- **nessuno-step-di-catalogo** — the user check notification: Nessuno step di catalogo assomiglia a questo intento. Serve una formulazione nuova, da taggare @wanted — non il candidato meno peggio.

## Come si verifica il tuo lavoro

Nessuno di questi e' un parere. Se falliscono, il lavoro non e' finito — non e' "da sistemare poi".

```bash
npx tsc --noEmit -p tsconfig.json   # hai inventato un metodo?
npm run test:dry                    # ogni frase Gherkin ha la sua glue?
npm run validate:steps              # la frase e' nel catalogo, o e' una variante?
```
