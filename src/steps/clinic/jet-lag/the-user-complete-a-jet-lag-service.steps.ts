// generato-da: bdd-generate · rigenerabile
// src/steps/clinic/jet-lag/the-user-complete-a-jet-lag-service.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-21T12-55-02-371Z.json
//   il            : 2026-10-21T13:03:49.976Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { VisitHistoryPage } from "../../../pages/clinic/visit-history.page";
import { HomePage } from "../../../pages/clinic/home.page";
import { JetLagPage } from "../../../pages/clinic/jet-lag.page";
import { ProductsJetFPage } from "../../../pages/clinic/products-jet-f.page";
import { ProductJetFPage } from "../../../pages/clinic/product-jet-f.page";
import { ImportantInfoPage } from "../../../pages/clinic/important-info.page";
import { PharmaciesPage } from "../../../pages/clinic/pharmacies.page";
import { OrderCompleteAsyncNoCallPage } from "../../../pages/clinic/order-complete-async-no-call.page";
import { accediAClinic } from "../../../actions/servizio-weight-loss.actions";
import { rispondiQuestionario } from "../../../actions/questionario.actions";
import { verificaGiaFatto } from "../../../actions/gia-fatto.actions";
import { scegliFarmacia } from "../../../actions/farmacia.actions";
import { paga } from "../../../actions/pagamento.actions";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let visitHistoryPage: VisitHistoryPage;
let homePage: HomePage;
let jetLagPage: JetLagPage;
let productsJetFPage: ProductsJetFPage;
let productJetFPage: ProductJetFPage;
let importantInfoPage: ImportantInfoPage;
let pharmaciesPage: PharmaciesPage;
let orderCompleteAsyncNoCallPage: OrderCompleteAsyncNoCallPage;

/**
 * @intent  the user log in with username and password with {string}
 * @utility accesso (src/actions/servizio-weight-loss.actions.ts)
 * @wanted
 */
Given("the user log in with username and password with {string}", async function (this: CustomWorld, valore1: string) {
  await accediAClinic(this.page, valore1, this.passwordAmbiente(), "/account/visit-history");
});

/**
 * @intent  the user click on Boots title and land on main page
 * @page    VisitHistoryPage
 * @component button "Boots online doctor"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click on home page button
 *          - the user click on home page button
 *          - the user log in and land on consultation history with {string}
 *          - the user log in and land on consultation history with {string}
 */
When("the user click on Boots title and land on main page", async function (this: CustomWorld) {
  visitHistoryPage = new VisitHistoryPage(this.page);
  await visitHistoryPage.assertLoaded();
  await visitHistoryPage.clickBootsOnlineDoctor();
});

/**
 * @intent  the user select Jet-Lag service
 * @page    HomePage
 * @component button "Services" page=HomePage
 * @component link "Jet lag" page=HomePage
 * @component link "GET STARTED" page=JetLagPage
 * @contesto link "GET STARTED": sotto "Get jet lag treatment for help adjusting to your new time zone"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click get started
 *          - the user click on get started
 *          - the user start the service
 *          - The user start a wright loss service
 *          - the user start the hair loss treatment
 */
When("the user select Jet-Lag service", async function (this: CustomWorld) {
  homePage = new HomePage(this.page);
  await homePage.assertLoaded();
  await homePage.clickServices();
  await homePage.goToJetLag();
  jetLagPage = new JetLagPage(this.page);
  await jetLagPage.assertLoaded();
  await jetLagPage.goToGetStarted();
});

/**
 * @intent  the user select and confirm the propduct
 * @page    ProductsJetFPage
 * @component button "10 Hard Capsules £120 Melatonin 3mg Melatonin is a hormone found naturally in the body that can be used to regulate your" page=ProductsJetFPage
 * @component button "continue" page=ProductJetFPage
 * @contesto button "10 Hard Capsules £120 Melatonin 3mg Melatonin is a hormone found naturally in the body that can be used to regulate your": sotto "Ultimately it will be a joint decision between you and one of our clinicians on whether a particular medicine is appropriate."
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user continue
 *          - the user confirm the product and accept
 *          - the user confirm the product and accept
 *          - the user check and continue the order
 *          - the user read the imprtant info with {string}
 */
When("the user select and confirm the propduct", async function (this: CustomWorld) {
  productsJetFPage = new ProductsJetFPage(this.page);
  await productsJetFPage.assertLoaded();
  await productsJetFPage.click10HardCapsules120Melatonin();
  productJetFPage = new ProductJetFPage(this.page);
  await productJetFPage.assertLoaded();
  await productJetFPage.clickContinue();
});

/**
 * @intent  the user accept important info
 * @page    ImportantInfoPage
 * @component checkbox "I understand the important information above."
 * @component button "Continue"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user confirm the product and accept
 *          - the user confirm the product and accept
 *          - the user continue
 *          - the user check and continue the order
 *          - the user read the imprtant info with {string}
 */
When("the user accept important info", async function (this: CustomWorld) {
  importantInfoPage = new ImportantInfoPage(this.page);
  await importantInfoPage.assertLoaded();
  await importantInfoPage.setIUnderstandTheImportantInformation();
  await importantInfoPage.clickContinue();
});

/**
 * @intent  the user complete the questionarie
 * @utility questionario (src/actions/questionario.actions.ts)
 * @wanted
 */
When("the user complete the questionarie", async function (this: CustomWorld, tabella: DataTable) {
  await rispondiQuestionario(this.page, tabella.raw());
});

/**
 * @intent  the user click No on gp
 * @page    Questions2Page
 * @component button "No"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user say no to GP
 *          - the user complete the questionary
 *          - the user click on home page button
 *          - the user click on home page button
 */
When("the user click No on gp", async function (this: CustomWorld) {
  // questionario: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "questionario");
});

/**
 * @intent  the user click on pick up in store
 * @page    PharmaciesPage
 * @component button "Yes, pick up in store"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - user choos to pick up in store
 *          - the user choose pick up in store
 *          - the user select the store pharmacy to pick up with {string}
 *          - the user search in the map after insert the half postal code and select the store with {string}
 *          - the user search in the map after insert the half postal code and select the store with {string}
 */
When("the user click on pick up in store", async function (this: CustomWorld) {
  pharmaciesPage = new PharmaciesPage(this.page);
  await pharmaciesPage.assertLoaded();
  await pharmaciesPage.clickYesPickUpInStore();
});

/**
 * @intent  the user insert the store cap and select it on the map with {string}
 * @utility farmacia (src/actions/farmacia.actions.ts)
 * @wanted
 */
When("the user insert the store cap and select it on the map with {string}", async function (this: CustomWorld, valore1: string) {
  await scegliFarmacia(this.page, valore1);
});

/**
 * @intent  the user select a card on his list and confrm the payment
 * @utility pagamento (src/actions/pagamento.actions.ts)
 * @wanted
 */
When("the user select a card on his list and confrm the payment", async function (this: CustomWorld) {
  await paga(this.page);
});

/**
 * @intent  the user see the new notification and check it
 * @page    OrderCompleteAsyncNoCallPage
 * @component button "92 Secure messages"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user see the new notification and check it", async function (this: CustomWorld) {
  orderCompleteAsyncNoCallPage = new OrderCompleteAsyncNoCallPage(this.page);
  await orderCompleteAsyncNoCallPage.assertLoaded();
  await this.expectTextVisible("Secure messages");
  await orderCompleteAsyncNoCallPage.click92SecureMessages();
  // Arrivo su Messages: nessun componente toccato, nessuna Page Object da riconoscere.
});
