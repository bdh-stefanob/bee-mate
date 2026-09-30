// generato-da: bdd-generate · rigenerabile
// src/pages/shop/home.page.ts
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

export class HomePage extends BasePage {
  readonly path = "/";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly usernameField: Locator = this.page.getByRole('textbox', { name: 'Username' });
  private readonly passwordField: Locator = this.page.locator('input[type="password"]');
  private readonly loginButton: Locator = this.page.getByRole('button', { name: 'Login' });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.usernameField);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  textbox "Username"
   */
  async fillUsername(value: string): Promise<void> {
    await this.usernameField.fill(value);
  }

  /**
   * @componente  textbox "Password"
   */
  async fillPassword(value: string): Promise<void> {
    await this.passwordField.fill(value);
  }

  /**
   * @componente  button "Login"
   */
  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }
}
