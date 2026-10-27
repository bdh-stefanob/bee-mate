// generato-da: bdd-generate · rigenerabile
// src/steps/clinic/weight-loss/the-complete-the-second-order.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports/recordings/qa-clinic.lemonaidhealth.co.uk-2026-10-14T09-14-05-713Z.json
//   il            : 2026-10-15T09:04:49.357Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { HomePage } from "../../../pages/clinic/home.page";
import { AccountPage } from "../../../pages/clinic/account.page";
import { TreatmentPage } from "../../../pages/clinic/treatment.page";
import { WeiPage } from "../../../pages/clinic/wei.page";
import { ProductWeiFPage } from "../../../pages/clinic/product-wei-f.page";
import { ImportantInfoPage } from "../../../pages/clinic/important-info.page";
import { PharmaciesPage } from "../../../pages/clinic/pharmacies.page";
import { OrderCompleteAsyncNoCallPage } from "../../../pages/clinic/order-complete-async-no-call.page";
import { accediAClinic } from "../../../actions/servizio-weight-loss.actions";
import { scegliProdotto } from "../../../actions/prodotto.actions";
import { rispondiQuestionario } from "../../../actions/questionario.actions";
import { verificaGiaFatto } from "../../../actions/gia-fatto.actions";
import { scegliFarmacia } from "../../../actions/farmacia.actions";
import { paga } from "../../../actions/pagamento.actions";
import { scattaFoto } from "../../../actions/foto.actions";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let homePage: HomePage;
let accountPage: AccountPage;
let treatmentPage: TreatmentPage;
let weiPage: WeiPage;
let productWeiFPage: ProductWeiFPage;
let importantInfoPage: ImportantInfoPage;
let pharmaciesPage: PharmaciesPage;
let orderCompleteAsyncNoCallPage: OrderCompleteAsyncNoCallPage;

/**
 * @intent  The user log in with {string}
 * @utility accesso (src/actions/servizio-weight-loss.actions.ts)
 * @wanted
 */
Given("The user log in with {string}", async function (this: CustomWorld, valore1: string) {
  await accediAClinic(this.page, valore1, this.passwordAmbiente(valore1), "/account");
});

/**
 * @intent  the user click on start service
 * @page    AccountPage
 * @component link "Start a consultations Choose from our list of services"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user click on start service
 *          - the user click on start services
 *          - the user land on brochure
 *          - The user log in and click on start a service with {string}
 *          - the patient starts the weight loss service as a returning patient
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
 *          - the user start the service
 *          - the user click on get started
 *          - the user click get started
 *          - the user open the weight loss
 */
When("the user start the service", async function (this: CustomWorld) {
  homePage = new HomePage(this.page);
  await homePage.assertLoaded();
  await homePage.goToWeightLoss();
  treatmentPage = new TreatmentPage(this.page);
  await treatmentPage.assertLoaded();
  await treatmentPage.goToGetStarted();
});

/**
 * @intent  the user select the medication with {string} and {string} and {string}
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
 *          - the user select the medication
 *          - the user click on i am old user
 *          - the user continue
 *          - the user check and continue the order
 *          - the user read the imprtant info with {string}
 */
When("the user select the medication with {string} and {string} and {string}", async function (this: CustomWorld, valore1: string, valore2: string, valore3: string) {
  weiPage = new WeiPage(this.page);
  await weiPage.assertLoaded();
  await weiPage.clickIHavenTBeenHere();
  await scegliProdotto(this.page, valore1, valore2, valore3);
  productWeiFPage = new ProductWeiFPage(this.page);
  await productWeiFPage.assertLoaded();
  await productWeiFPage.clickContinue();
});

/**
 * @intent  the user insert the dose
 * @page    ImportantInfoPage
 * @component checkbox "I understand the important information above." page=ImportantInfoPage
 * @component button "Continue" page=ImportantInfoPage
 * @component button "Stay on the same dose" page=QuestionsPage
 * @component spinbutton "0" page=QuestionsPage
 * @contesto spinbutton "0": sotto "1. What is your current weight?"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user insert the dose
 *          - the user continue
 *          - the user check and continue the order
 *          - the user read the imprtant info with {string}
 *          - the user insert the bmi data with {string}
 */
When("the user insert the dose", async function (this: CustomWorld, tabella: DataTable) {
  importantInfoPage = new ImportantInfoPage(this.page);
  await importantInfoPage.assertLoaded();
  await importantInfoPage.setIUnderstandTheImportantInformation();
  await importantInfoPage.clickContinue();
  await rispondiQuestionario(this.page, tabella.raw());
});

/**
 * @intent  the user insert the bmi and the date
 * @page    QuestionsPage
 * @component spinbutton "0"
 * @component button "Next"
 * @component button "Open calendar"
 * @contesto spinbutton "0": sotto "1. What is your current weight?"
 * @contesto "md-calendar-date-selection-indicator" (senza ruolo): nel dialog "Calendar"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user insert the bmi and the date
 *          - the user insert the bmi data with {string}
 *          - the user answer the question
 *          - the user insert the dose
 *          - the user complete the order
 */
When("the user insert the bmi and the date", async function (this: CustomWorld) {
  // questionario: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "questionario");
});

/**
 * @intent  the user complete the questionary
 * @page    QuestionsPage
 * @component button "No"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user complete the questionary
 *          - the user say no to GP
 */
When("the user complete the questionary", async function (this: CustomWorld) {
  // questionario: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "questionario");
});

/**
 * @intent  the user choose pick up in store
 * @page    PharmaciesPage
 * @component button "Yes, pick up in store"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester, con i valori digitati portati
 * nel .feature. Da portare nel catalogo:
 *          - the user choose pick up in store
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
 * @utility farmacia (src/actions/farmacia.actions.ts)
 * @wanted
 */
When("The user sleect the store with {string}", async function (this: CustomWorld, valore1: string) {
  await scegliFarmacia(this.page, valore1);
});

/**
 * @intent  the user select the card
 * @utility pagamento (src/actions/pagamento.actions.ts)
 * @wanted
 */
When("the user select the card", async function (this: CustomWorld) {
  await paga(this.page);
});

/**
 * @intent  the user insert personal photo
 * @utility foto (src/actions/foto.actions.ts)
 * @wanted
 */
When("the user insert personal photo", async function (this: CustomWorld) {
  await scattaFoto(this.page);
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
 *          - the user get the id photo
 *          - the user get the front photo
 *          - the user get the second photo
 *          - user get the second photo
 *          - the user get another photo for document
 */
When("the user get the id photo", async function (this: CustomWorld) {
  // foto: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "foto");
});

/**
 * @intent  submit photo
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
When("submit photo", async function (this: CustomWorld) {
  // foto: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "foto");
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
 *          - the user get the front photo
 *          - the user get the id photo
 *          - the user get the second photo
 *          - user get the second photo
 *          - the user get another photo for document
 */
When("the user get the front photo", async function (this: CustomWorld) {
  // foto: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "foto");
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
 *          - user get the second photo
 *          - the user get the second photo
 *          - the user get the id photo
 *          - the user get the front photo
 *          - the user submit the photo and the order
 */
When("user get the second photo", async function (this: CustomWorld) {
  // foto: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "foto");
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
 *          - the user open the notification and see the order
 *          - the user check the notification and the page
 *          - submit photo
 *          - the user submit the photo and the order
 *          - the user complete the photo autentication
 */
When("the user open the notification and see the order", async function (this: CustomWorld) {
  // foto: fatto in un passo precedente (la utility lo fa tutto in una volta).
  await verificaGiaFatto(this.page, "foto");
  orderCompleteAsyncNoCallPage = new OrderCompleteAsyncNoCallPage(this.page);
  await orderCompleteAsyncNoCallPage.assertLoaded();
  await orderCompleteAsyncNoCallPage.click1SecureMessages();
  // Arrivo su Messages: nessun componente toccato, nessuna Page Object da riconoscere.
});
