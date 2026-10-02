// generato-da: bdd-generate · rigenerabile
// src/steps/clinic/weight-loss/a-user-complete-an-order-in-weight-loss.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-01T13-46-03-103Z.json
//   il            : 2026-10-01T13:52:20.475Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { LoginPage } from "../../../pages/clinic/login.page";
import { VisitHistoryPage } from "../../../pages/clinic/visit-history.page";
import { AccountPage } from "../../../pages/clinic/account.page";
import { HomePage } from "../../../pages/clinic/home.page";
import { TreatmentPage } from "../../../pages/clinic/treatment.page";
import { WeightLossPage } from "../../../pages/clinic/weight-loss.page";
import { WeiPage } from "../../../pages/clinic/wei.page";
import { ProductsWeiFPage } from "../../../pages/clinic/products-wei-f.page";
import { ProductWeiFPage } from "../../../pages/clinic/product-wei-f.page";
import { ImportantInfoPage } from "../../../pages/clinic/important-info.page";
import { QuestionsPage } from "../../../pages/clinic/questions.page";
import { PharmaciesPage } from "../../../pages/clinic/pharmacies.page";
import { PharmacyMapSelectionPage } from "../../../pages/clinic/pharmacy-map-selection.page";
import { SummaryPage } from "../../../pages/clinic/summary.page";
import { VisitPage } from "../../../pages/clinic/visit.page";
import { OrderCompleteAsyncNoCallPage } from "../../../pages/clinic/order-complete-async-no-call.page";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let loginPage: LoginPage;
let visitHistoryPage: VisitHistoryPage;
let accountPage: AccountPage;
let homePage: HomePage;
let treatmentPage: TreatmentPage;
let weightLossPage: WeightLossPage;
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
 * @intent  the user logged in
 * @page    LoginPage
 * @component button "Log in"
 * @component textbox "Email"
 * @component button "Log In"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user is logged in
 */
Given("the user logged in", async function (this: CustomWorld) {
  loginPage = new LoginPage(this.page);
  await loginPage.navigate();
  await loginPage.fillEmail("stefano.bertaccini+qa2@bootsdigitalhealth.co.uk");
  await loginPage.fillPassword(this.passwordAmbiente());
  await loginPage.clickLogIn();
});

/**
 * @intent  the user click on back to account
 * @page    VisitHistoryPage
 * @component button "Back to Account"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user click on back to account", async function (this: CustomWorld) {
  visitHistoryPage = new VisitHistoryPage(this.page);
  await visitHistoryPage.assertLoaded();
  await visitHistoryPage.clickBackToAccount();
});

/**
 * @intent  the user click on start services
 * @page    AccountPage
 * @component link "Start a consultations Choose from our list of services"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user click on start services", async function (this: CustomWorld) {
  accountPage = new AccountPage(this.page);
  await accountPage.assertLoaded();
  await accountPage.goToStartAConsultationsChooseFrom();
});

/**
 * @intent  the user click on weight loss treatment
 * @page    HomePage
 * @component link "Weight Loss"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user click on weight loss treatment", async function (this: CustomWorld) {
  homePage = new HomePage(this.page);
  await homePage.assertLoaded();
  await homePage.goToWeightLoss();
});

/**
 * @intent  the user click on get started
 * @page    TreatmentPage
 * @component link "Get started"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user click on get started", async function (this: CustomWorld) {
  treatmentPage = new TreatmentPage(this.page);
  await treatmentPage.assertLoaded();
  await treatmentPage.goToGetStarted();
});

/**
 * @intent  the user click on started over a started services
 * @page    WeightLossPage
 * @component button "Start over"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user click on started over a started services", async function (this: CustomWorld) {
  weightLossPage = new WeightLossPage(this.page);
  await weightLossPage.assertLoaded();
  await weightLossPage.clickStartOver();
});

/**
 * @intent  the user click on i am old user
 * @page    WeiPage
 * @component link "I haven't been here for over 3 months I last used a weight loss medicine from Boots Online doctor more than 3 months ago"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user click on i am old user", async function (this: CustomWorld) {
  weiPage = new WeiPage(this.page);
  await weiPage.assertLoaded();
  await weiPage.clickIHavenTBeenHere();
});

/**
 * @intent  the user compile the treatment section
 * @page    ProductsWeiFPage
 * @component button "0.5mg"
 * @component button "With Coaching £146.97"
 * @component radio "With Coaching"
 * @component button "Select"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user compile the treatment section", async function (this: CustomWorld) {
  productsWeiFPage = new ProductsWeiFPage(this.page);
  await productsWeiFPage.assertLoaded();
  await productsWeiFPage.click05mg();
  await productsWeiFPage.clickWithCoaching14697();
  await productsWeiFPage.setWithCoaching();
  await productsWeiFPage.clickSelect();
});

/**
 * @intent  the user continue
 * @page    ProductWeiFPage
 * @component button "continue"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user continue", async function (this: CustomWorld) {
  productWeiFPage = new ProductWeiFPage(this.page);
  await productWeiFPage.assertLoaded();
  await productWeiFPage.clickContinue();
});

/**
 * @intent  the user check and continue the order
 * @page    ImportantInfoPage
 * @component checkbox "I understand the important information above."
 * @component button "Continue"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user check and continue the order", async function (this: CustomWorld) {
  importantInfoPage = new ImportantInfoPage(this.page);
  await importantInfoPage.assertLoaded();
  await importantInfoPage.setIUnderstandTheImportantInformation();
  await importantInfoPage.clickContinue();
});

/**
 * @intent  the user say no to GP
 * @page    QuestionsPage
 * @component button "NO"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user is logged in
 */
When("the user say no to GP", async function (this: CustomWorld) {
  questionsPage = new QuestionsPage(this.page);
  await questionsPage.assertLoaded();
  await questionsPage.clickNo();
});

/**
 * @intent  user choos to pick up in store
 * @page    PharmaciesPage
 * @component button "Yes, pick up in store"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user is logged in
 */
When("user choos to pick up in store", async function (this: CustomWorld) {
  pharmaciesPage = new PharmaciesPage(this.page);
  await pharmaciesPage.assertLoaded();
  await pharmaciesPage.clickYesPickUpInStore();
});

/**
 * @intent  the user select the right store
 * @page    PharmacyMapSelectionPage
 * @component button "Select Pharmacy"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user select the right store", async function (this: CustomWorld) {
  pharmacyMapSelectionPage = new PharmacyMapSelectionPage(this.page);
  await pharmacyMapSelectionPage.assertLoaded();
  await pharmacyMapSelectionPage.clickSelectPharmacy();
});

/**
 * @intent  the user select the card and accept payment
 * @page    SummaryPage
 * @component button "....0000 Expiry 07/29"
 * @component button "Place Order"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user select the card and accept payment", async function (this: CustomWorld) {
  summaryPage = new SummaryPage(this.page);
  await summaryPage.assertLoaded();
  await summaryPage.click0000Expiry0729();
  await summaryPage.clickPlaceOrder();
});

/**
 * @intent  the user complete the photo autentication
 * @page    VisitPage
 * @component button "Open camera"
 * @component button "Take Picture"
 * @component button "Save"
 * @component button "That's me"
 * @component button "Submit"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user complete the photo autentication", async function (this: CustomWorld) {
  visitPage = new VisitPage(this.page);
  await visitPage.assertLoaded();
  await visitPage.clickOpenCamera();
  await visitPage.clickTakePicture();
  await visitPage.clickSave();
  await visitPage.clickThatSMe();
  await visitPage.clickSubmit();
});

/**
 * @intent  the suer check new notification
 * @page    OrderCompleteAsyncNoCallPage
 * @component button "22 Secure messages"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the suer check new notification", async function (this: CustomWorld) {
  orderCompleteAsyncNoCallPage = new OrderCompleteAsyncNoCallPage(this.page);
  await orderCompleteAsyncNoCallPage.assertLoaded();
  await this.expectTextVisible("22");
  await orderCompleteAsyncNoCallPage.click22SecureMessages();
});
