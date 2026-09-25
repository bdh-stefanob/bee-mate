// generato-da: bdd-generate · rigenerabile
// src/steps/human-recharge/recharge/user-try-to-recharge-without-charge.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports\recordings\humanrechargeweb-humanrecharge.up.railway.app-2026-09-25T07-24-30-011Z.json
//   il            : 2026-09-25T07:28:18.173Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { HomePage } from "../../../pages/human-recharge/home.page";
import { AccediPage } from "../../../pages/human-recharge/accedi.page";
import { AppPage } from "../../../pages/human-recharge/app.page";
import { RicarichePage } from "../../../pages/human-recharge/ricariche.page";
import { RicaricheDetailPage } from "../../../pages/human-recharge/ricariche-detail.page";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let homePage: HomePage;
let accediPage: AccediPage;
let appPage: AppPage;
let ricarichePage: RicarichePage;
let ricaricheDetailPage: RicaricheDetailPage;

/**
 * @intent  The user click on the login button
 * @page    HomePage
 * @component link "Sign in"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user clicks the Login button
 *          - the user clicks on the Login button
 *          - the user clicks on the login button
 *          - the user in order to re-login clicks on the Login button
 *          - the user clicks on the "Login" button
 */
Given("The user click on the login button", async function (this: CustomWorld) {
  homePage = new HomePage(this.page);
  await homePage.navigate();
  await homePage.goToSignIn();
});

/**
 * @intent  the user insert the username
 * @page    AccediPage
 * @component textbox "Email"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user insert the last name
 *          - the user insert the {string}, {string}, {string}
 *          - the user insert the first name
 *          - the user insert the address
 *          - the user insert the Password
 */
When("the user insert the username", async function (this: CustomWorld) {
  accediPage = new AccediPage(this.page);
  await accediPage.assertLoaded();
  await accediPage.fillEmail("s.bertaccinidev@gmail.com");
});

/**
 * @intent  the user insert the password
 * @page    AccediPage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user insert the Password
 *          - the user insert the postcode
 *          - the user confirm the Password
 *          - the user enters a valid password
 *          - the user insert the last name
 */
When("the user insert the password", async function (this: CustomWorld) {
  await accediPage.fillPassword(process.env["APP_PASSWORD"] ?? "" /* mai registrata: viene da .env */);
});

/**
 * @intent  the user click on the login button
 * @page    AccediPage
 * @component button "Sign in"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user clicks the Login button
 *          - the user clicks on the Login button
 *          - the user clicks on the login button
 *          - the user in order to re-login clicks on the Login button
 *          - the user clicks on the "Login" button
 */
When("the user click on the login button", async function (this: CustomWorld) {
  await accediPage.clickSignIn();
});

/**
 * @intent  the user land on the homepage
 * @page    AppPage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - I am on the homepage
 *          - the user is on brochure homepage
 *          - the user lands on clinic home page
 *          - the user landed on 'Register for an Online Doctor account'
 *          - a registered user landed on the Brochure home page
 */
When("the user land on the homepage", async function (this: CustomWorld) {
  appPage = new AppPage(this.page);
  await appPage.assertLoaded();
});

/**
 * @intent  the user clcik on the recharge button
 * @page    AppPage
 * @component link "Recharges"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user clicks on the "Login" button
 *          - the user clicks on "Register for an Online Doctor account" button
 *          - the user clicks on the Login button
 *          - the user clicks on the login button
 *          - the user clicks the verify button
 */
When("the user clcik on the recharge button", async function (this: CustomWorld) {
  await appPage.goToRecharges();
});

/**
 * @intent  the user click on the the first music
 * @page    RicarichePage
 * @component button "Open FOCUS" page=RicarichePage
 * @component button "Listen with headphones or smartphone" page=RicaricheDetailPage
 * @component button "Back" page=RicaricheDetailPage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user clicks on the Login button
 *          - the user clicks on the login button
 *          - the user clicks on Send code
 *          - the user clicks on the "Login" button
 *          - the user clicks on "Register for an Online Doctor account" button
 */
When("the user click on the the first music", async function (this: CustomWorld) {
  ricarichePage = new RicarichePage(this.page);
  await ricarichePage.assertLoaded();
  await ricarichePage.clickOpenFocus();
  await ricaricheDetailPage.clickListenWithHeadphonesOrSmartphone();
  await ricaricheDetailPage.clickBack();
  ricaricheDetailPage = new RicaricheDetailPage(this.page);
  await ricaricheDetailPage.assertLoaded();
});
