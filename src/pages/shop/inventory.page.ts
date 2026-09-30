// generato-da: bdd-generate · rigenerabile
// src/pages/shop/inventory.page.ts
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

export class InventoryPage extends BasePage {
  readonly path = "/inventory.html";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly addToCartButton: Locator = this.page.getByRole('button', { name: 'Add to cart' }).first();  // ambiguous: 6 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
  private readonly cart1ItemsButton: Locator = this.page.getByRole('button', { name: 'Cart, 1 items' });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    // Nessun elemento stabile fra quelli toccati: si usa il primo toccato, che
    // esisteva all'arrivo ma non e' univoco (ce ne sono piu' d'uno uguali).
    await this.expectVisible(this.addToCartButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  button "Add to cart"
   * @attenzione  ancoraggio ambiguous: 6 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
   */
  async clickAddToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  /**
   * @componente  button "Cart, 1 items"
   */
  async clickCart1Items(): Promise<void> {
    await this.cart1ItemsButton.click();
  }
}
