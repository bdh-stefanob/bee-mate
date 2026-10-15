// generato-da: bdd-generate · rigenerabile
// src/steps/clinic/hair-loss/the-user-orders-a-hair-loss-treatment.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports/recordings/qa-clinic.lemonaidhealth.co.uk-2026-10-15T08-39-43-860Z.json
//   il            : 2026-10-15T09:05:14.082Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { HomePage } from "../../../pages/clinic/home.page";
import { VisitHistoryPage } from "../../../pages/clinic/visit-history.page";
import { PropeciaOnlinePage } from "../../../pages/clinic/propecia-online.page";
import { HaiPage } from "../../../pages/clinic/hai.page";
import { ProductHaiFPage } from "../../../pages/clinic/product-hai-f.page";
import { ImportantInfoPage } from "../../../pages/clinic/important-info.page";
import { PharmaciesPage } from "../../../pages/clinic/pharmacies.page";
import { OrderCompleteAsyncNoCallPage } from "../../../pages/clinic/order-complete-async-no-call.page";
import { accediAClinic } from "../../../actions/servizio-weight-loss.actions";
import { scegliProdotto } from "../../../actions/prodotto.actions";
import { rispondiQuestionario } from "../../../actions/questionario.actions";
import { scattaFoto } from "../../../actions/foto.actions";
import { verificaGiaFatto } from "../../../actions/gia-fatto.actions";
import { scegliFarmacia } from "../../../actions/farmacia.actions";
import { paga } from "../../../actions/pagamento.actions";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let homePage: HomePage;
let visitHistoryPage: VisitHistoryPage;
let propeciaOnlinePage: PropeciaOnlinePage;
let haiPage: HaiPage;
let productHaiFPage: ProductHaiFPage;
let importantInfoPage: ImportantInfoPage;
let pharmaciesPage: PharmaciesPage;
let orderCompleteAsyncNoCallPage: OrderCompleteAsyncNoCallPage;

/**
 * @intent  the user log in and land on consultation history with {string}
 * @utility accesso (src/actions/servizio-weight-loss.actions.ts)
 * @wanted
 */
Given("the user log in and land on consultation history with {string}", async function (this: CustomWorld, valore1: string) {
  await accediAClinic(this.page, valore1, this.passwordAmbiente(), "/account/visit-history");
});

/**
 * @intent  the user click on home page button
 * @page    VisitHistoryPage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user click on home page button", async function (this: CustomWorld) {
  visitHistoryPage = new VisitHistoryPage(this.page);
  await visitHistoryPage.assertLoaded();
  await this.vaiA("https://qa-brochure.lemonaidhealth.co.uk/");
});

/**
 * @intent  the user start the hair loss treatment
 * @page    HomePage
 * @component link "Hair loss" page=HomePage
 * @component link "GET STARTED" page=PropeciaOnlinePage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click on get started
 *          - the user click get started
 *          - The user start a wright loss service
 *          - the user start the service
 *          - the patient starts the weight loss service as a returning patient
 */
When("the user start the hair loss treatment", async function (this: CustomWorld) {
  homePage = new HomePage(this.page);
  await homePage.assertLoaded();
  await homePage.goToHairLoss();
  propeciaOnlinePage = new PropeciaOnlinePage(this.page);
  await propeciaOnlinePage.assertLoaded();
  await propeciaOnlinePage.goToGetStarted();
});

/**
 * @intent  the user select the product with {string} and {string} and {string}
 * @page    HaiPage
 * @component link "First time using this service" page=HaiPage
 * @component button "Bundle £20" page=ProductsHaiFPage
 * @component button "No-bundle £150 £51" page=ProductsHaiFPage
 * @component button "2 months" page=ProductsHaiFPage
 * @component button "1 month" page=ProductsHaiFPage
 * @component button "Select" page=ProductsHaiFPage
 * @contesto button "2 months": sotto "Propecia"
 * @contesto button "1 month": sotto "Propecia"
 * @contesto button "Select": sotto "Propecia"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user compile the treatment section
 *          - the user select the medication
 *          - the user select the Mounjaro 7.5mg without coaching
 *          - the user complete the order
 *          - the user select the card
 */
When("the user select the product with {string} and {string} and {string}", async function (this: CustomWorld, valore1: string, valore2: string, valore3: string) {
  haiPage = new HaiPage(this.page);
  await haiPage.assertLoaded();
  await haiPage.clickFirstTimeUsingThisService();
  await scegliProdotto(this.page, valore1, valore2, valore3);
});

/**
 * @intent  the user confirm the product and accept
 * @page    ProductHaiFPage
 * @component button "continue" page=ProductHaiFPage
 * @component checkbox "I understand the important information above." page=ImportantInfoPage
 * @component button "Continue" page=ImportantInfoPage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user check and continue the order
 *          - the user continue
 *          - the user read the imprtant info with {string}
 *          - the user insert the dose
 *          - the user select the medication
 */
When("the user confirm the product and accept", async function (this: CustomWorld) {
  productHaiFPage = new ProductHaiFPage(this.page);
  await productHaiFPage.assertLoaded();
  await productHaiFPage.clickContinue();
  importantInfoPage = new ImportantInfoPage(this.page);
  await importantInfoPage.assertLoaded();
  await importantInfoPage.setIUnderstandTheImportantInformation();
  await importantInfoPage.clickContinue();
});

/**
 * @intent  the user answer to the questions
 * @utility questionario (src/actions/questionario.actions.ts)
 * @wanted
 */
When("the user answer to the questions", async function (this: CustomWorld, tabella: DataTable) {
  await rispondiQuestionario(this.page, tabella.raw());
});

/**
 * @intent  the user take a selphie
 * @utility foto (src/actions/foto.actions.ts)
 * @wanted
 */
When("the user take a selphie", async function (this: CustomWorld) {
  await scattaFoto(this.page);
});

/**
 * @intent  the user take the photoID
 * @page    IdPage
 * @component button "Open camera"
 * @component button "Take Picture"
 * @component button "Save"
 * @component button "That's me"
 * @contesto button "That's me": nel dialog "Your photo is one colour Your photo appears to be one colour. Please retake your photo. That's me Retake photo"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user get the id photo
 *          - the user get the front photo
 *          - the user get the second photo
 *          - user get the second photo
 *          - the user get another photo for document
 */
When("the user take the photoID", async function (this: CustomWorld) {
  // foto: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "foto");
});

/**
 * @intent  the user submit the photo
 * @page    IdPage
 * @component button "Submit"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - submit photo
 *          - the user open the notification and see the order
 *          - the user submit the photo and the order
 *          - the user complete the photo autentication
 *          - the user get another photo for document
 */
When("the user submit the photo", async function (this: CustomWorld) {
  // foto: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "foto");
});

/**
 * @intent  the user search in the map after insert the half postal code and select the store with {string}
 * @page    PharmaciesPage
 * @component button "Yes, pick up in store" page=PharmaciesPage
 * @component textbox "zip" page=PharmacyMapSelectionPage
 * @component button "Close" page=PharmacyMapSelectionPage
 * @component button "Select Pharmacy" page=PharmacyMapSelectionPage
 * @contesto button "Close": nel dialog "(senza nome)"
 * @contesto button "Select Pharmacy": nel dialog "(senza nome)"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user select the right store
 *          - user choos to pick up in store
 *          - the user choose pick up in store
 *          - the user select the store pharmacy to pick up with {string}
 *          - the user complete the order
 */
When("the user search in the map after insert the half postal code and select the store with {string}", async function (this: CustomWorld, valore1: string) {
  pharmaciesPage = new PharmaciesPage(this.page);
  await pharmaciesPage.assertLoaded();
  await pharmaciesPage.clickYesPickUpInStore();
  await scegliFarmacia(this.page, valore1);
});

/**
 * @intent  the user selct the card and confirm
 * @utility pagamento (src/actions/pagamento.actions.ts)
 * @wanted
 */
When("the user selct the card and confirm", async function (this: CustomWorld) {
  await paga(this.page);
});

/**
 * @intent  the user check the notification and the last of the page is the new one
 * @page    OrderCompleteAsyncNoCallPage
 * @component button "15 Secure messages"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user check the notification and the last of the page is the new one", async function (this: CustomWorld) {
  orderCompleteAsyncNoCallPage = new OrderCompleteAsyncNoCallPage(this.page);
  await orderCompleteAsyncNoCallPage.assertLoaded();
  await orderCompleteAsyncNoCallPage.click15SecureMessages();
  // Arrivo su Messages: nessun componente toccato, nessuna Page Object da riconoscere.
});
