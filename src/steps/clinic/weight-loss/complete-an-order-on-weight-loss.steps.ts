// generato-da: bdd-generate · rigenerabile
// src/steps/clinic/weight-loss/complete-an-order-on-weight-loss.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-14T08-51-36-224Z.json
//   il            : 2026-10-14T09:12:42.248Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { HomePage } from "../../../pages/clinic/home.page";
import { LoginPage } from "../../../pages/clinic/login.page";
import { AccountPage } from "../../../pages/clinic/account.page";
import { TreatmentPage } from "../../../pages/clinic/treatment.page";
import { WeiPage } from "../../../pages/clinic/wei.page";
import { ProductsWeiFPage } from "../../../pages/clinic/products-wei-f.page";
import { ProductWeiFPage } from "../../../pages/clinic/product-wei-f.page";
import { ImportantInfoPage } from "../../../pages/clinic/important-info.page";
import { Questions1Page } from "../../../pages/clinic/questions1.page";
import { Questions2Page } from "../../../pages/clinic/questions2.page";
import { PharmaciesPage } from "../../../pages/clinic/pharmacies.page";
import { PharmacyMapSelectionPage } from "../../../pages/clinic/pharmacy-map-selection.page";
import { SummaryPage } from "../../../pages/clinic/summary.page";
import { IdPage } from "../../../pages/clinic/id.page";
import { VisitPage } from "../../../pages/clinic/visit.page";
import { OrderCompleteAsyncNoCallPage } from "../../../pages/clinic/order-complete-async-no-call.page";
import { MessagesPage } from "../../../pages/clinic/messages.page";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let homePage: HomePage;
let loginPage: LoginPage;
let accountPage: AccountPage;
let treatmentPage: TreatmentPage;
let weiPage: WeiPage;
let productsWeiFPage: ProductsWeiFPage;
let productWeiFPage: ProductWeiFPage;
let importantInfoPage: ImportantInfoPage;
let questions1Page: Questions1Page;
let questions2Page: Questions2Page;
let pharmaciesPage: PharmaciesPage;
let pharmacyMapSelectionPage: PharmacyMapSelectionPage;
let summaryPage: SummaryPage;
let idPage: IdPage;
let visitPage: VisitPage;
let orderCompleteAsyncNoCallPage: OrderCompleteAsyncNoCallPage;
let messagesPage: MessagesPage;

/**
 * @intent  The user log in and click on start a service with {string}
 * @page    HomePage
 * @component button "Log in" page=HomePage
 * @component textbox "Email" page=LoginPage
 * @component button "Log In" page=LoginPage
 * @component link "Start a consultations Choose from our list of services" page=AccountPage
 * @param valore textbox "Email" (sotto "LOG IN TO SAVE TIME")
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click on start services
 *          - the user logged in
 *          - the user land on brochure
 *          - il cliente accede all'area ordini
 *          - the user is logged in
 */
Given("The user log in and click on start a service with {string}", async function (this: CustomWorld, valore: string) {
  homePage = new HomePage(this.page);
  await homePage.navigate();
  await homePage.clickLogIn();
  loginPage = new LoginPage(this.page);
  await loginPage.assertLoaded();
  await loginPage.fillEmail(valore);
  await loginPage.fillPassword(this.passwordAmbiente());
  await loginPage.clickLogIn();
  accountPage = new AccountPage(this.page);
  await accountPage.assertLoaded();
  await accountPage.goToStartAConsultationsChooseFrom();
});

/**
 * @intent  The user start a wright loss service
 * @page    HomePage
 * @component link "Weight Loss" page=HomePage
 * @component link "Get started" page=TreatmentPage
 * @contesto link "Get started": sotto "Weight Loss Treatment Service"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click on weight loss treatment
 *          - the user open the weight loss
 *          - the user click get started
 *          - the user click on get started
 */
When("The user start a wright loss service", async function (this: CustomWorld) {
  await homePage.goToWeightLoss();
  treatmentPage = new TreatmentPage(this.page);
  await treatmentPage.assertLoaded();
  await treatmentPage.goToGetStarted();
});

/**
 * @intent  the user select the Mounjaro 7.5mg without coaching
 * @page    WeiPage
 * @component link "I'M NEW I am new to the Boots Online Doctor Weight Loss service" page=WeiPage
 * @component button "0.5mg" page=ProductsWeiFPage
 * @component button "Without Coaching £151" page=ProductsWeiFPage
 * @component button "10mg £317.97" page=ProductsWeiFPage
 * @component button "7.5mg" page=ProductsWeiFPage
 * @component button "Select" page=ProductsWeiFPage
 * @contesto button "Select": sotto "Wegovy - New Product Group"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user compile the treatment section
 *          - the user complete the order
 */
When("the user select the Mounjaro 7.5mg without coaching", async function (this: CustomWorld) {
  weiPage = new WeiPage(this.page);
  await weiPage.assertLoaded();
  await weiPage.clickIMNewIAm();
  productsWeiFPage = new ProductsWeiFPage(this.page);
  await productsWeiFPage.assertLoaded();
  await productsWeiFPage.click05mg();
  await productsWeiFPage.clickWithoutCoaching151();
  await productsWeiFPage.click10mg31797();
  await productsWeiFPage.click75mg();
  await productsWeiFPage.click75mg();
  await productsWeiFPage.click10mg31797();
  await productsWeiFPage.clickSelect();
});

/**
 * @intent  the user read the imprtant info with {string}
 * @page    ProductWeiFPage
 * @component button "continue" page=ProductWeiFPage
 * @component checkbox "I understand the important information above." page=ImportantInfoPage
 * @component button "Continue" page=ImportantInfoPage
 * @component textbox "TdL 1430 Text Answer" page=Questions1Page
 * @contesto textbox "TdL 1430 Text Answer": sotto "TdL 1430 Text Question"
 * @param valore textbox "TdL 1430 Text Answer" (sotto "TdL 1430 Text Question")
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user continue
 *          - the user check and continue the order
 *          - the user complete the order
 */
When("the user read the imprtant info with {string}", async function (this: CustomWorld, valore: string) {
  productWeiFPage = new ProductWeiFPage(this.page);
  await productWeiFPage.assertLoaded();
  await productWeiFPage.clickContinue();
  importantInfoPage = new ImportantInfoPage(this.page);
  await importantInfoPage.assertLoaded();
  await importantInfoPage.setIUnderstandTheImportantInformation();
  await importantInfoPage.clickContinue();
  questions1Page = new Questions1Page(this.page);
  await questions1Page.assertLoaded();
  await questions1Page.fillTdl1430TextAnswer(valore);
});

/**
 * @intent  the user answer the question
 * @page    Questions1Page
 * @component button "Next"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user complete the order
 */
When("the user answer the question", async function (this: CustomWorld) {
  await questions1Page.clickNext();
});

/**
 * @intent  the user insert the bmi data with {string}
 * @page    Questions2Page
 * @component spinbutton "0"
 * @component button "Next"
 * @contesto spinbutton "0": sotto "BMI Test question"
 * @param valore spinbutton "0" (sotto "BMI Test question")
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user complete the order
 */
When("the user insert the bmi data with {string}", async function (this: CustomWorld, valore: string) {
  questions2Page = new Questions2Page(this.page);
  await questions2Page.assertLoaded();
  await questions2Page.fill0(valore);
  await questions2Page.clickNext();
});

/**
 * @intent  the user select the store pharmacy to pick up with {string}
 * @page    PharmaciesPage
 * @component button "Yes, pick up in store" page=PharmaciesPage
 * @component textbox "zip" page=PharmacyMapSelectionPage
 * @component button "Select Pharmacy" page=PharmacyMapSelectionPage
 * @contesto button "Select Pharmacy": nel dialog "(senza nome)"
 * @param valore textbox "zip"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user select the right store
 *          - user choos to pick up in store
 *          - the user complete the order
 */
When("the user select the store pharmacy to pick up with {string}", async function (this: CustomWorld, valore: string) {
  pharmaciesPage = new PharmaciesPage(this.page);
  await pharmaciesPage.assertLoaded();
  await pharmaciesPage.clickYesPickUpInStore();
  pharmacyMapSelectionPage = new PharmacyMapSelectionPage(this.page);
  await pharmacyMapSelectionPage.assertLoaded();
  await pharmacyMapSelectionPage.fillZip(valore);
  await pharmacyMapSelectionPage.clickUnnamed();
  await pharmacyMapSelectionPage.clickSelectPharmacy();
});

/**
 * @intent  the user insert a card and a photo with {string}, {string} and {string}
 * @page    SummaryPage
 * @component button "Toggle Vitality membership section" page=SummaryPage
 * @component textbox "Credit or debit card number" page=SummaryPage
 * @component textbox "Credit or debit card expiration date" page=SummaryPage
 * @component textbox "Credit or debit card CVC/CVV" page=SummaryPage
 * @component button "Place Order" page=SummaryPage
 * @component button "Open camera" page=IdPage
 * @component button "Take Picture" page=IdPage
 * @component button "Save" page=IdPage
 * @component button "That's me" page=IdPage
 * @contesto button "That's me": nel dialog "Your photo is one colour Your photo appears to be one colour. Please retake your photo. That's me Retake photo"
 * @param valore1 textbox "Credit or debit card number"
 * @param valore2 textbox "Credit or debit card expiration date"
 * @param valore3 textbox "Credit or debit card CVC/CVV"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user complete the photo autentication
 *          - the user select the card and accept payment
 *          - the user complete the order
 */
When("the user insert a card and a photo with {string}, {string} and {string}", async function (this: CustomWorld, valore1: string, valore2: string, valore3: string) {
  summaryPage = new SummaryPage(this.page);
  await summaryPage.assertLoaded();
  await summaryPage.clickToggleVitalityMembershipSection();
  await summaryPage.clickToggleVitalityMembershipSection();
  await summaryPage.fillCreditOrDebitCardNumber(valore1);
  await summaryPage.fillCreditOrDebitCardExpiration(valore2);
  await summaryPage.fillCreditOrDebitCardCvc(valore3);
  await summaryPage.clickPlaceOrder();
  idPage = new IdPage(this.page);
  await idPage.assertLoaded();
  await idPage.clickOpenCamera();
  await idPage.clickTakePicture();
  await idPage.clickSave();
  await idPage.clickThatSMe();
});

/**
 * @intent  the user get the second photo
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
 *          - the user complete the photo autentication
 *          - the user complete the order
 */
When("the user get the second photo", async function (this: CustomWorld) {
  await idPage.clickOpenCamera();
  await idPage.clickTakePicture();
  await idPage.clickSave();
  await idPage.clickThatSMe();
});

/**
 * @intent  the user get another photo for document
 * @page    IdPage
 * @component button "Submit" page=IdPage
 * @component button "Open camera" page=VisitPage
 * @component button "Take Picture" page=VisitPage
 * @component button "Save" page=VisitPage
 * @component button "That's me" page=VisitPage
 * @contesto button "That's me": nel dialog "Your photo is one colour Your photo appears to be one colour. Please retake your photo. That's me Retake photo"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user complete the photo autentication
 *          - the user complete the order
 */
When("the user get another photo for document", async function (this: CustomWorld) {
  await idPage.clickSubmit();
  visitPage = new VisitPage(this.page);
  await visitPage.assertLoaded();
  await visitPage.clickOpenCamera();
  await visitPage.clickTakePicture();
  await visitPage.clickSave();
  await visitPage.clickThatSMe();
});

/**
 * @intent  the user submit the photo and the order
 * @page    VisitPage
 * @component button "Take Picture"
 * @component button "Save"
 * @component button "That's me"
 * @component button "Submit"
 * @contesto button "That's me": nel dialog "Your photo is one colour Your photo appears to be one colour. Please retake your photo. That's me Retake photo"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user complete the photo autentication
 *          - the user complete the order
 */
When("the user submit the photo and the order", async function (this: CustomWorld) {
  await visitPage.clickTakePicture();
  await visitPage.clickSave();
  await visitPage.clickThatSMe();
  await visitPage.clickSubmit();
});

/**
 * @intent  the user check the notification and the page
 * @page    OrderCompleteAsyncNoCallPage
 * @component button "1 Secure messages"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("the user check the notification and the page", async function (this: CustomWorld) {
  orderCompleteAsyncNoCallPage = new OrderCompleteAsyncNoCallPage(this.page);
  await orderCompleteAsyncNoCallPage.assertLoaded();
  await this.expectTextVisible("1");
  await orderCompleteAsyncNoCallPage.click1SecureMessages();
  messagesPage = new MessagesPage(this.page);
  await messagesPage.assertLoaded();
});
