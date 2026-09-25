// generato-da: bdd-generate · rigenerabile
// src/pages/human-recharge/app.page.ts
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

export class AppPage extends BasePage {
  readonly path = "/app";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly goodMorningStefanohowChargedAreButton: Locator = this.page.getByText('Good morning, StefanoHow charged are you today?YESTERDAY 50%Today?to discoverDiscover your charge 3 questions + micro-te', { exact: true });  // unstable: nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo
  private readonly rechargesLink: Locator = this.page.getByRole('link', { name: 'Recharges' });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.rechargesLink);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  text "Good morning, StefanoHow charged are you today?YESTERDAY 50%Today?to discoverDiscover your charge 3 questions + micro-te"
   * @attenzione  ancoraggio unstable: nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo
   */
  async clickGoodMorningStefanohowChargedAre(): Promise<void> {
    await this.goodMorningStefanohowChargedAreButton.click();
  }

  /**
   * @componente  link "Recharges"
   */
  async goToRecharges(): Promise<void> {
    await this.rechargesLink.click();
  }
}
