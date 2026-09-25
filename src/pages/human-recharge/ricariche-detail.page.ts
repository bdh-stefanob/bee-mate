// generato-da: bdd-generate · rigenerabile
// src/pages/human-recharge/ricariche-detail.page.ts
//
// PAGE OBJECT — l'unico layer che conosce i selettori.
//
// Generata da:
//   registrazione : reports\recordings\humanrechargeweb-humanrecharge.up.railway.app-2026-09-25T07-24-30-011Z.json
//   dizionario    : reports\scout\humanrechargeweb-humanrecharge.up.railway.app.json, reports\scout\the-internet.herokuapp.com-tables.json, reports\scout\www.saucedemo.com.json
//   il            : 2026-09-25T07:28:18.173Z
//
// I locator vengono dal dizionario, non dalla memoria di nessuno. Se uno smette
// di funzionare, la pagina e' cambiata: si rifa' `npm run scout`, non si tira a
// indovinare.
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class RicaricheDetailPage extends BasePage {
  readonly path = "/app/ricariche/3f009b78-cf07-4825-a5a6-d4ef1c0ac58c";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly listenWithHeadphonesOrSmartphoneButton: Locator = this.page.getByRole('button', { name: 'Listen with headphones or smartphone' });
  private readonly backButton: Locator = this.page.getByRole('button', { name: 'Back' });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.listenWithHeadphonesOrSmartphoneButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  button "Listen with headphones or smartphone"
   */
  async clickListenWithHeadphonesOrSmartphone(): Promise<void> {
    await this.listenWithHeadphonesOrSmartphoneButton.click();
  }

  /**
   * @componente  button "Back"
   */
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }
}
