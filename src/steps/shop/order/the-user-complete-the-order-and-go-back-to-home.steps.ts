// generato-da: bdd-generate · rigenerabile
// src/steps/shop/order/the-user-complete-the-order-and-go-back-to-home.steps.ts
//
// STEP DEFINITION — glue sottile. Traduce la frase Gherkin in chiamate ai metodi
// delle Page Object. **Mai selettori qui**: se ne compare uno, e' finito nel
// layer sbagliato.
//
// Generato da:
//   registrazione : reports\recordings\www.saucedemo.com-2026-09-30T13-33-47-948Z.json
//   il            : 2026-09-30T13:35:04.978Z
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { HomePage } from "../../../pages/shop/home.page";
import { InventoryPage } from "../../../pages/shop/inventory.page";
import { CartPage } from "../../../pages/shop/cart.page";
import { CheckoutStepOnePage } from "../../../pages/shop/checkout-step-one.page";
import { CheckoutStepTwoPage } from "../../../pages/shop/checkout-step-two.page";
import { CheckoutCompletePage } from "../../../pages/shop/checkout-complete.page";

// Dichiarate a livello di modulo, non dentro agli step: cosi' sopravvivono da
// uno step all'altro dello stesso scenario. Non e' stato globale — il World di
// Cucumber viene ricreato a ogni scenario, e con lui il browser.
//
// L'inizializzazione avviene nello step che possiede la transizione, mai in un
// hook `Before`: e' quello step a sapere su quale pagina ci si trova.
let homePage: HomePage;
let inventoryPage: InventoryPage;
let cartPage: CartPage;
let checkoutStepOnePage: CheckoutStepOnePage;
let checkoutStepTwoPage: CheckoutStepTwoPage;
let checkoutCompletePage: CheckoutCompletePage;

/**
 * @intent  The user logged in
 * @page    HomePage
 * @component textbox "Username"
 * @component button "Login"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - the user logged in
 */
Given("The user logged in", async function (this: CustomWorld) {
  homePage = new HomePage(this.page);
  await homePage.navigate();
  await homePage.fillUsername("standard_user");
  await homePage.fillPassword(this.passwordAmbiente());
  await homePage.clickLogin();
});

/**
 * @intent  The user complete the order
 * @page    InventoryPage
 * @component button "Add to cart" page=InventoryPage
 * @component button "Cart, 1 items" page=InventoryPage
 * @component button "Checkout" page=CartPage
 * @component textbox "First Name" page=CheckoutStepOnePage
 * @component textbox "Last Name" page=CheckoutStepOnePage
 * @component textbox "Zip/Postal Code" page=CheckoutStepOnePage
 * @component button "Continue" page=CheckoutStepOnePage
 * @component button "Finish" page=CheckoutStepTwoPage
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          - The user complete the order
 *          - the user add a product to the cart
 */
When("The user complete the order", async function (this: CustomWorld) {
  inventoryPage = new InventoryPage(this.page);
  await inventoryPage.assertLoaded();
  await inventoryPage.clickAddToCart();
  await this.expectTextVisible("Cart, 1 items");
  await inventoryPage.clickCart1Items();
  cartPage = new CartPage(this.page);
  await cartPage.assertLoaded();
  await cartPage.clickCheckout();
  checkoutStepOnePage = new CheckoutStepOnePage(this.page);
  await checkoutStepOnePage.assertLoaded();
  await checkoutStepOnePage.fillFirstName("Stefano");
  await checkoutStepOnePage.fillLastName("Bertaccini");
  await checkoutStepOnePage.fillZipPostalCode("47122");
  await checkoutStepOnePage.clickContinue();
  checkoutStepTwoPage = new CheckoutStepTwoPage(this.page);
  await checkoutStepTwoPage.assertLoaded();
  await checkoutStepTwoPage.clickFinish();
});

/**
 * @intent  The user back to home
 * @page    CheckoutCompletePage
 * @component button "Back Home"
 * @wanted
 *
 * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:
 *          (nessuno: serve una formulazione nuova)
 */
When("The user back to home", async function (this: CustomWorld) {
  checkoutCompletePage = new CheckoutCompletePage(this.page);
  await checkoutCompletePage.assertLoaded();
  await this.expectTextVisible("Thank you for your order!");
  await checkoutCompletePage.clickBackHome();
});
