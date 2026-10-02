// generato-da: bdd-generate · rigenerabile
// src/steps/qa-brochure/weight-loss/the-user-complete-the-order.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-09-30T15-10-45-430Z.json
//   il            : 2026-09-30T15:13:59.508Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { AccountPage } from "../../../pages/qa-brochure/account.page";
import { HomePage } from "../../../pages/qa-brochure/home.page";
import { TreatmentPage } from "../../../pages/qa-brochure/treatment.page";
import { WeiPage } from "../../../pages/qa-brochure/wei.page";
import { ProductsWeiFPage } from "../../../pages/qa-brochure/products-wei-f.page";
import { ProductWeiFPage } from "../../../pages/qa-brochure/product-wei-f.page";
import { ImportantInfoPage } from "../../../pages/qa-brochure/important-info.page";
import { QuestionsPage } from "../../../pages/qa-brochure/questions.page";
import { PharmaciesPage } from "../../../pages/qa-brochure/pharmacies.page";
import { PharmacyMapSelectionPage } from "../../../pages/qa-brochure/pharmacy-map-selection.page";
import { SummaryPage } from "../../../pages/qa-brochure/summary.page";
import { VisitPage } from "../../../pages/qa-brochure/visit.page";
import { OrderCompleteAsyncNoCallPage } from "../../../pages/qa-brochure/order-complete-async-no-call.page";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let accountPage: AccountPage;
let homePage: HomePage;
let treatmentPage: TreatmentPage;
let weiPage: WeiPage;
let productsWeiFPage: ProductsWeiFPage;
let productWeiFPage: ProductWeiFPage;
let importantInfoPage: ImportantInfoPage;
let questionsPage: QuestionsPage;
let pharmaciesPage: PharmaciesPage;
let pharmacyMapSelectionPage: PharmacyMapSelectionPage;
let summaryPage: SummaryPage;
let visitPage: VisitPage;
let orderCompleteAsyncNoCallPage: OrderCompleteAsyncNoCallPage;

/**
 * @intent  the user land on brochure
 * @page    AccountPage
 * @component link "Start a consultations Choose from our list of services" page=AccountPage
 * @component button "Accept All" page=HomePage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
Given("the user land on brochure", async function (this: CustomWorld) {
  accountPage = new AccountPage(this.page);
  await accountPage.navigate();
  await accountPage.goToStartAConsultationsChooseFrom();
  homePage = new HomePage(this.page);
  await homePage.assertLoaded();
  await homePage.clickAcceptAll();
  homePage = new HomePage(this.page);
  await homePage.assertLoaded();
});

/**
 * @intent  the user open the weight loss
 * @page    HomePage
 * @component link "Weight Loss"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user open the weight loss", async function (this: CustomWorld) {
  await homePage.goToWeightLoss();
});

/**
 * @intent  the user click get started
 * @page    TreatmentPage
 * @component link "Get started"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user click get started", async function (this: CustomWorld) {
  treatmentPage = new TreatmentPage(this.page);
  await treatmentPage.assertLoaded();
  await treatmentPage.goToGetStarted();
});

/**
 * @intent  the user complete the order
 * @page    WeiPage
 * @component link "I'M NEW I am new to the Boots Online Doctor Weight Loss service" page=WeiPage
 * @component button "With Coaching £121" page=ProductsWeiFPage
 * @component radio "With Coaching" page=ProductsWeiFPage
 * @component button "Select" page=ProductsWeiFPage
 * @component button "continue" page=ProductWeiFPage
 * @component checkbox "I understand the important information above." page=ImportantInfoPage
 * @component button "Continue" page=ImportantInfoPage
 * @component button "Start of the Questionnaire Section - Move along" page=QuestionsPage
 * @component button "Next" page=QuestionsPage
 * @component button "No GP" page=QuestionsPage
 * @component spinbutton "0" page=QuestionsPage
 * @component button "Yes, pick up in store" page=PharmaciesPage
 * @component button "Select Pharmacy" page=PharmacyMapSelectionPage
 * @component button "Place Order" page=SummaryPage
 * @component button "Open camera" page=VisitPage
 * @component button "Take Picture" page=VisitPage
 * @component button "Save" page=VisitPage
 * @component button "That's me" page=VisitPage
 * @component button "Submit" page=VisitPage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user complete the order", async function (this: CustomWorld) {
  weiPage = new WeiPage(this.page);
  await weiPage.assertLoaded();
  await weiPage.clickIMNewIAm();
  productsWeiFPage = new ProductsWeiFPage(this.page);
  await productsWeiFPage.assertLoaded();
  await productsWeiFPage.clickWithCoaching121();
  await productsWeiFPage.setWithCoaching();
  await productsWeiFPage.clickSelect();
  productWeiFPage = new ProductWeiFPage(this.page);
  await productWeiFPage.assertLoaded();
  await productWeiFPage.clickContinue();
  importantInfoPage = new ImportantInfoPage(this.page);
  await importantInfoPage.assertLoaded();
  await importantInfoPage.setIUnderstandTheImportantInformation();
  await importantInfoPage.clickContinue();
  questionsPage = new QuestionsPage(this.page);
  await questionsPage.assertLoaded();
  await questionsPage.clickStartOfTheQuestionnaireSection();
  await questionsPage.clickNext();
  await questionsPage.clickNoGp();
  await questionsPage.fill0("100");
  await questionsPage.clickNext();
  pharmaciesPage = new PharmaciesPage(this.page);
  await pharmaciesPage.assertLoaded();
  await pharmaciesPage.clickYesPickUpInStore();
  pharmacyMapSelectionPage = new PharmacyMapSelectionPage(this.page);
  await pharmacyMapSelectionPage.assertLoaded();
  await pharmacyMapSelectionPage.clickSelectPharmacy();
  summaryPage = new SummaryPage(this.page);
  await summaryPage.assertLoaded();
  await summaryPage.clickPlaceOrder();
  visitPage = new VisitPage(this.page);
  await visitPage.assertLoaded();
  await visitPage.clickOpenCamera();
  await visitPage.clickTakePicture();
  await visitPage.clickSave();
  await visitPage.clickThatSMe();
  await visitPage.clickSubmit();
  visitPage = new VisitPage(this.page);
  await visitPage.assertLoaded();
});

/**
 * @intent  the user check the last notification
 * @page    OrderCompleteAsyncNoCallPage
 * @component button "2 Secure messages"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user check the last notification", async function (this: CustomWorld) {
  orderCompleteAsyncNoCallPage = new OrderCompleteAsyncNoCallPage(this.page);
  await orderCompleteAsyncNoCallPage.assertLoaded();
  await orderCompleteAsyncNoCallPage.click2SecureMessages();
  messagesPage = new MessagesPage(this.page);
  await messagesPage.assertLoaded();
});
