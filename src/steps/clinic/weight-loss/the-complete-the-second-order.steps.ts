// generato-da: bdd-generate · rigenerabile
// src/steps/clinic/weight-loss/the-complete-the-second-order.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-14T09-14-05-713Z.json
//   il            : 2026-10-14T09:43:22.465Z
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
import { QuestionsPage } from "../../../pages/clinic/questions.page";
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
let questionsPage: QuestionsPage;
let pharmaciesPage: PharmaciesPage;
let pharmacyMapSelectionPage: PharmacyMapSelectionPage;
let summaryPage: SummaryPage;
let idPage: IdPage;
let visitPage: VisitPage;
let orderCompleteAsyncNoCallPage: OrderCompleteAsyncNoCallPage;
let messagesPage: MessagesPage;

/**
 * @intent  The user log in with {string}
 * @page    HomePage
 * @component button "Log in" page=HomePage
 * @component textbox "Email" page=LoginPage
 * @component button "Log In" page=LoginPage
 * @param valore textbox "Email" (sotto "LOG IN TO SAVE TIME")
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user logged in
 *          - The user log in and click on start a service with {string}
 *          - il cliente accede all'area ordini
 *          - the user is logged in
 */
Given("The user log in with {string}", async function (this: CustomWorld, valore: string) {
  homePage = new HomePage(this.page);
  await homePage.navigate();
  await homePage.clickLogIn();
  loginPage = new LoginPage(this.page);
  await loginPage.assertLoaded();
  await loginPage.fillEmail(valore);
  await loginPage.fillPassword(this.passwordAmbiente());
  await loginPage.clickLogIn();
});

/**
 * @intent  the user click on start service
 * @page    AccountPage
 * @component link "Start a consultations Choose from our list of services"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click on start services
 *          - the user land on brochure
 *          - The user log in and click on start a service with {string}
 */
When("the user click on start service", async function (this: CustomWorld) {
  accountPage = new AccountPage(this.page);
  await accountPage.assertLoaded();
  await accountPage.goToStartAConsultationsChooseFrom();
});

/**
 * @intent  the user start the service
 * @page    HomePage
 * @component link "Weight Loss" page=HomePage
 * @component link "Get started" page=TreatmentPage
 * @contesto link "Get started": sotto "Weight Loss Treatment Service"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - The user start a wright loss service
 *          - the user click on get started
 *          - the user click get started
 *          - the user open the weight loss
 *          - the user click on weight loss treatment
 */
When("the user start the service", async function (this: CustomWorld) {
  await homePage.goToWeightLoss();
  treatmentPage = new TreatmentPage(this.page);
  await treatmentPage.assertLoaded();
  await treatmentPage.goToGetStarted();
});

/**
 * @intent  the user select the medication
 * @page    WeiPage
 * @component link "I haven't been here for over 3 months I last used a weight loss medicine from Boots Online doctor more than 3 months ago" page=WeiPage
 * @component button "7.2mg" page=ProductsWeiFPage
 * @component button "Without Coaching £285.97" page=ProductsWeiFPage
 * @component button "Select" page=ProductsWeiFPage
 * @component button "continue" page=ProductWeiFPage
 * @contesto link "I haven't been here for over 3 months I last used a weight loss medicine from Boots Online doctor more than 3 months ago": sotto "Have you used this service before?"
 * @contesto button "Select": sotto "Wegovy"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click on i am old user
 *          - the user continue
 *          - the user check and continue the order
 *          - the user read the imprtant info with {string}
 *          - the user compile the treatment section
 */
When("the user select the medication", async function (this: CustomWorld) {
  weiPage = new WeiPage(this.page);
  await weiPage.assertLoaded();
  await weiPage.clickIHavenTBeenHere();
  productsWeiFPage = new ProductsWeiFPage(this.page);
  await productsWeiFPage.assertLoaded();
  await productsWeiFPage.click72mg();
  await productsWeiFPage.clickWithoutCoaching28597();
  await productsWeiFPage.clickSelect();
  productWeiFPage = new ProductWeiFPage(this.page);
  await productWeiFPage.assertLoaded();
  await productWeiFPage.clickContinue();
});

/**
 * @intent  the user insert the dose with {string}
 * @page    ImportantInfoPage
 * @component checkbox "I understand the important information above." page=ImportantInfoPage
 * @component button "Continue" page=ImportantInfoPage
 * @component button "Stay on the same dose" page=QuestionsPage
 * @component spinbutton "0" page=QuestionsPage
 * @contesto spinbutton "0": sotto "1. What is your current weight?"
 * @param valore spinbutton "0" (sotto "1. What is your current weight?")
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user continue
 *          - the user check and continue the order
 *          - the user read the imprtant info with {string}
 *          - the user insert the bmi data with {string}
 *          - the user complete the order
 */
When("the user insert the dose with {string}", async function (this: CustomWorld, valore: string) {
  importantInfoPage = new ImportantInfoPage(this.page);
  await importantInfoPage.assertLoaded();
  await importantInfoPage.setIUnderstandTheImportantInformation();
  await importantInfoPage.clickContinue();
  questionsPage = new QuestionsPage(this.page);
  await questionsPage.assertLoaded();
  await questionsPage.clickStayOnTheSameDose();
  await questionsPage.fill0(valore);
});

/**
 * @intent  the user insert the bmi and the date with {string}
 * @page    QuestionsPage
 * @component spinbutton "0"
 * @component button "Next"
 * @component button "Open calendar"
 * @contesto spinbutton "0": sotto "1. What is your current weight?"
 * @contesto "md-calendar-date-selection-indicator" (senza ruolo): nel dialog "Calendar"
 * @param valore spinbutton "0" (sotto "1. What is your current weight?")
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user insert the bmi data with {string}
 *          - the user answer the question
 *          - the user complete the order
 */
When("the user insert the bmi and the date with {string}", async function (this: CustomWorld, valore: string) {
  await questionsPage.fill0(valore);
  await questionsPage.clickNext();
  await questionsPage.clickOpenCalendar();
  await questionsPage.clickMdCalendarDateSelectionIndicator();
  await questionsPage.clickNext();
});

/**
 * @intent  the user complete the questionary
 * @page    QuestionsPage
 * @component button "No"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user say no to GP
 */
When("the user complete the questionary", async function (this: CustomWorld) {
  await questionsPage.clickNo();
  await questionsPage.clickNo();
});

/**
 * @intent  the user choose pick up in store
 * @page    PharmaciesPage
 * @component button "Yes, pick up in store"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - user choos to pick up in store
 *          - the user select the store pharmacy to pick up with {string}
 *          - the user complete the order
 *          - the user is logged in
 */
When("the user choose pick up in store", async function (this: CustomWorld) {
  pharmaciesPage = new PharmaciesPage(this.page);
  await pharmaciesPage.assertLoaded();
  await pharmaciesPage.clickYesPickUpInStore();
});

/**
 * @intent  The user sleect the store with {string}
 * @page    PharmacyMapSelectionPage
 * @component textbox "zip"
 * @component button "Select Pharmacy"
 * @contesto button "Select Pharmacy": nel dialog "(senza nome)"
 * @param valore textbox "zip"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user select the right store
 *          - the user select the store pharmacy to pick up with {string}
 *          - the user complete the order
 */
When("The user sleect the store with {string}", async function (this: CustomWorld, valore: string) {
  pharmacyMapSelectionPage = new PharmacyMapSelectionPage(this.page);
  await pharmacyMapSelectionPage.assertLoaded();
  await pharmacyMapSelectionPage.submitZip(valore);
  await pharmacyMapSelectionPage.clickSelectPharmacy();
});

/**
 * @intent  the user select the card
 * @page    SummaryPage
 * @component button "....0000 Expiry 12/29"
 * @component button "Place Order"
 * @contesto button "....0000 Expiry 12/29": sotto "Your Order"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user select the card and accept payment
 *          - the user insert a card and a photo with {string}, {string} and {string}
 *          - the user complete the order
 */
When("the user select the card", async function (this: CustomWorld) {
  summaryPage = new SummaryPage(this.page);
  await summaryPage.assertLoaded();
  await summaryPage.click0000Expiry1229();
  await summaryPage.clickPlaceOrder();
});

/**
 * @intent  the user insert personal photo
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
 *          - the user get the second photo
 *          - the user complete the photo autentication
 *          - the user get another photo for document
 *          - the user submit the photo and the order
 *          - the user insert a card and a photo with {string}, {string} and {string}
 */
When("the user insert personal photo", async function (this: CustomWorld) {
  idPage = new IdPage(this.page);
  await idPage.assertLoaded();
  await idPage.clickOpenCamera();
  await idPage.clickTakePicture();
  await idPage.clickSave();
  await idPage.clickThatSMe();
});

/**
 * @intent  the user get the id photo
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
 *          - the user get the second photo
 *          - the user get another photo for document
 *          - the user complete the photo autentication
 *          - the user submit the photo and the order
 *          - the user insert a card and a photo with {string}, {string} and {string}
 */
When("the user get the id photo", async function (this: CustomWorld) {
  await idPage.clickOpenCamera();
  await idPage.clickTakePicture();
  await idPage.clickSave();
  await idPage.clickThatSMe();
});

/**
 * @intent  submit photo
 * @page    IdPage
 * @component button "Submit"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user submit the photo and the order
 *          - the user complete the photo autentication
 *          - the user get another photo for document
 *          - the user complete the order
 */
When("submit photo", async function (this: CustomWorld) {
  await idPage.clickSubmit();
});

/**
 * @intent  the user get the front photo
 * @page    VisitPage
 * @component button "Open camera"
 * @component button "Take Picture"
 * @component button "Save"
 * @component button "That's me"
 * @contesto button "That's me": nel dialog "Your photo is one colour Your photo appears to be one colour. Please retake your photo. That's me Retake photo"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user get the second photo
 *          - the user get another photo for document
 *          - the user complete the photo autentication
 *          - the user submit the photo and the order
 *          - the user insert a card and a photo with {string}, {string} and {string}
 */
When("the user get the front photo", async function (this: CustomWorld) {
  visitPage = new VisitPage(this.page);
  await visitPage.assertLoaded();
  await visitPage.clickOpenCamera();
  await visitPage.clickTakePicture();
  await visitPage.clickSave();
  await visitPage.clickThatSMe();
});

/**
 * @intent  user get the second photo
 * @page    VisitPage
 * @component button "Take Picture"
 * @component button "Save"
 * @component button "That's me"
 * @contesto button "That's me": nel dialog "Your photo is one colour Your photo appears to be one colour. Please retake your photo. That's me Retake photo"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user get the second photo
 *          - the user submit the photo and the order
 *          - the user get another photo for document
 *          - the user complete the photo autentication
 *          - the user insert a card and a photo with {string}, {string} and {string}
 */
When("user get the second photo", async function (this: CustomWorld) {
  await visitPage.clickTakePicture();
  await visitPage.clickSave();
  await visitPage.clickThatSMe();
});

/**
 * @intent  the user open the notification and see the order
 * @page    VisitPage
 * @component button "Submit" page=VisitPage
 * @component button "1 Secure messages" page=OrderCompleteAsyncNoCallPage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user check the notification and the page
 *          - the user submit the photo and the order
 *          - the user complete the photo autentication
 *          - the user get another photo for document
 *          - the user complete the order
 */
When("the user open the notification and see the order", async function (this: CustomWorld) {
  await visitPage.clickSubmit();
  await this.expectTextVisible("1");
  orderCompleteAsyncNoCallPage = new OrderCompleteAsyncNoCallPage(this.page);
  await orderCompleteAsyncNoCallPage.assertLoaded();
  await orderCompleteAsyncNoCallPage.click1SecureMessages();
  messagesPage = new MessagesPage(this.page);
  await messagesPage.assertLoaded();
});
