// generato-da: bdd-generate · rigenerabile
// src/pages/shop/checkout-complete.page.ts
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

export class CheckoutCompletePage extends BasePage {
  readonly path = "/checkout-complete.html";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly backHomeButton: Locator = this.page.getByRole('button', { name: 'Back Home' });
  private readonly thankYouForYourOrderButton: Locator = this.page.getByRole('heading', { name: 'Thank you for your order!' });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.backHomeButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  button "Back Home"
   */
  async clickBackHome(): Promise<void> {
    await this.backHomeButton.click();
  }

  /**
   * @componente  heading "Thank you for your order!"
   */
  async clickThankYouForYourOrder(): Promise<void> {
    await this.thankYouForYourOrderButton.click();
  }
}
