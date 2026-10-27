// generato-da: bdd-generate · rigenerabile
// src/steps/clinic/insomnia/the-user-select-insomnia-treatment.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-27T10-22-51-093Z.json
//   il            : 2026-10-27T10:26:34.050Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { HomePage } from "../../../pages/clinic/home.page";
import { InsomniaServicePage } from "../../../pages/clinic/insomnia-service.page";
import { InsPage } from "../../../pages/clinic/ins.page";
import { ProductsInsFPage } from "../../../pages/clinic/products-ins-f.page";
import { ProductInsFPage } from "../../../pages/clinic/product-ins-f.page";
import { ImportantInfoPage } from "../../../pages/clinic/important-info.page";
import { PharmaciesPage } from "../../../pages/clinic/pharmacies.page";
import { SummaryPage } from "../../../pages/clinic/summary.page";
import { OrderCompleteAsyncNoCallPage } from "../../../pages/clinic/order-complete-async-no-call.page";
import { rispondiQuestionario } from "../../../actions/questionario.actions";
import { scegliFarmacia } from "../../../actions/farmacia.actions";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let homePage: HomePage;
let insomniaServicePage: InsomniaServicePage;
let insPage: InsPage;
let productsInsFPage: ProductsInsFPage;
let productInsFPage: ProductInsFPage;
let importantInfoPage: ImportantInfoPage;
let pharmaciesPage: PharmaciesPage;
let summaryPage: SummaryPage;
let orderCompleteAsyncNoCallPage: OrderCompleteAsyncNoCallPage;

/**
 * @intent  the user select insomnia treatment
 * @page    HomePage
 * @component button "Services" page=HomePage
 * @component link "Insomnia" page=HomePage
 * @component link "Get started" page=InsomniaServicePage
 * @contesto link "Get started": sotto "Insomnia Treatment Service"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click on get started
 *          - the user click get started
 *          - the user select Jet-Lag service
 *          - the user start the hair loss treatment
 *          - the user start the service
 */
Given("the user select insomnia treatment", async function (this: CustomWorld) {
  homePage = new HomePage(this.page);
  await homePage.navigate();
  await homePage.clickServices();
  await homePage.goToInsomnia();
  insomniaServicePage = new InsomniaServicePage(this.page);
  await insomniaServicePage.assertLoaded();
  await insomniaServicePage.goToGetStarted();
});

/**
 * @intent  the user select i'am new
 * @page    InsPage
 * @component link "I'm new to Boots Online Doctor for insomnia I'm here for my first visit with the medical team for insomnia treatment..."
 * @contesto link "I'm new to Boots Online Doctor for insomnia I'm here for my first visit with the medical team for insomnia treatment...": sotto "Have you seen us before?"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user select the card
 *          - the user insert the store cap and select it on the map with {string}
 *          - the user select a card on his list and confrm the payment
 *          - the user selct the card and confirm
 */
When("the user select i'am new", async function (this: CustomWorld) {
  insPage = new InsPage(this.page);
  await insPage.assertLoaded();
  await insPage.clickIMNewToBoots();
});

/**
 * @intent  the user select a product
 * @page    ProductsInsFPage
 * @component button "30 Tablets £85 Quviviq 25mg Quviviq is an oral tablet used to treat chronic insomnia (long-term sleeping difficulties) t" page=ProductsInsFPage
 * @component button "continue" page=ProductInsFPage
 * @contesto button "30 Tablets £85 Quviviq 25mg Quviviq is an oral tablet used to treat chronic insomnia (long-term sleeping difficulties) t": sotto "Ultimately it will be a joint decision between you and one of our clinicians on whether a particular medicine is appropriate."
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user continue
 *          - the user confirm the product and accept
 *          - the user select and confirm the propduct
 *          - the user read the imprtant info with {string}
 *          - the user check and continue the order
 */
When("the user select a product", async function (this: CustomWorld) {
  productsInsFPage = new ProductsInsFPage(this.page);
  await productsInsFPage.assertLoaded();
  await productsInsFPage.click30Tablets85Quviviq25mg();
  productInsFPage = new ProductInsFPage(this.page);
  await productInsFPage.assertLoaded();
  await productInsFPage.clickContinue();
});

/**
 * @intent  th user pick up in store and selct a store with {string}
 * @page    Questions1Page
 * @component button "Less than 3 months" page=Questions1Page
 * @component button "Next" page=Questions1Page
 * @component button "Less than 7 hours" page=Questions2Page
 * @component button "Next" page=Questions2Page
 * @component button "Yes, pick up in store" page=PharmaciesPage
 * @component textbox "zip" page=PharmacyMapSelectionPage
 * @component button "Select Pharmacy" page=PharmacyMapSelectionPage
 * @contesto button "Select Pharmacy": nel dialog "(senza nome)"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - user choos to pick up in store
 *          - the user choose pick up in store
 *          - the user click on pick up in store
 *          - the user select the store pharmacy to pick up with {string}
 *          - the user select the right store
 */
When("th user pick up in store and selct a store with {string}", async function (this: CustomWorld, valore1: string, tabella: DataTable) {
  await rispondiQuestionario(this.page, tabella.raw());
  pharmaciesPage = new PharmaciesPage(this.page);
  await pharmaciesPage.assertLoaded();
  await pharmaciesPage.clickYesPickUpInStore();
  await scegliFarmacia(this.page, valore1);
});

/**
 * @intent  the user comple the card assignemnt
 * @page    SummaryPage
 * @component button "....0005 Expiry 07/29"
 * @component button "Save & continue"
 * @contesto button "....0005 Expiry 07/29": sotto "Your Order"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user select the card
 *          - the user selct the card and confirm
 */
When("the user comple the card assignemnt", async function (this: CustomWorld) {
  summaryPage = new SummaryPage(this.page);
  await summaryPage.assertLoaded();
  await summaryPage.click0005Expiry0729();
  await summaryPage.clickSaveContinue();
});

/**
 * @intent  the user check notification
 * @page    OrderCompleteAsyncNoCallPage
 * @component button "16 Secure messages"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user check notification", async function (this: CustomWorld) {
  orderCompleteAsyncNoCallPage = new OrderCompleteAsyncNoCallPage(this.page);
  await orderCompleteAsyncNoCallPage.assertLoaded();
  await this.expectTextVisible("16 Secure messages");
  await orderCompleteAsyncNoCallPage.click16SecureMessages();
  // Arrivo su Messages: nessun componente toccato, nessuna Page Object da riconoscere.
});
