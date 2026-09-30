// generato-da: bdd-generate · rigenerabile
// src/pages/shop/checkout-step-one.page.ts
//
// PAGE OBJECT — l'unico layer che conosce i selettori.
//
// Generata da:
//   registrazione : reports\recordings\www.saucedemo.com-2026-09-30T13-33-47-948Z.json
//   dizionario    : reports\scout\humanrechargeweb-humanrecharge.up.railway.app.json, reports\scout\the-internet.herokuapp.com-tables.json, reports\scout\www.saucedemo.com.json
//   il            : 2026-09-30T13:35:04.978Z
//
// I locator vengono dal dizionario, non dalla memoria di nessuno. Se uno smette
// di funzionare, la pagina e' cambiata: si rifa' `npm run scout`, non si tira a
// indovinare.
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class CheckoutStepOnePage extends BasePage {
  readonly path = "/checkout-step-one.html";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly firstNameField: Locator = this.page.getByRole('textbox', { name: 'First Name' });
  private readonly lastNameField: Locator = this.page.getByRole('textbox', { name: 'Last Name' });
  private readonly zipPostalCodeField: Locator = this.page.getByRole('textbox', { name: 'Zip/Postal Code' });
  private readonly continueButton: Locator = this.page.getByRole('button', { name: 'Continue' });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.firstNameField);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  textbox "First Name"
   */
  async fillFirstName(value: string): Promise<void> {
    await this.firstNameField.fill(value);
  }

  /**
   * @componente  textbox "Last Name"
   */
  async fillLastName(value: string): Promise<void> {
    await this.lastNameField.fill(value);
  }

  /**
   * @componente  textbox "Zip/Postal Code"
   */
  async fillZipPostalCode(value: string): Promise<void> {
    await this.zipPostalCodeField.fill(value);
  }

  /**
   * @componente  button "Continue"
   */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }
}
