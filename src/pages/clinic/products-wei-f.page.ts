// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/products-wei-f.page.ts
//
// PAGE OBJECT — l'unico layer che conosce i selettori.
//
// Generata da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-01T13-46-03-103Z.json
//   dizionario    : reports\scout\qa-brochure.lemonaidhealth.co.uk.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-login.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-order-complete-async-no-call.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-3.json, reports\scout\qa-clinic.lemonaidhealth.co.uk.json, reports\scout\qa.lemonaidpims.co.uk.json
//   il            : 2026-10-01T13:52:20.475Z
//
// I locator vengono dal dizionario, non dalla memoria di nessuno. Se uno smette
// di funzionare, la pagina e' cambiata: si rifa' `npm run scout`, non si tira a
// indovinare.
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";


export class ProductsWeiFPage extends BasePage {
  readonly path = "/products/WEI-F";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly el05mgButton: Locator = this.page.getByRole('button', { name: '0.5mg' });
private readonly withCoaching14697Button: Locator = this.page.getByRole('button', { name: 'With Coaching £146.97' });
private readonly withCoachingChoice: Locator = this.page.getByRole('radio', { name: 'With Coaching' }).first();  // ambiguous: 6 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
private readonly selectButton: Locator = this.page.getByRole('button', { name: 'Select' }).first();  // ambiguous: 7 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.el05mgButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
 * @componente  button "0.5mg"
 */
async click05mg(): Promise<void> {
  await this.el05mgButton.click();
}

/**
 * @componente  button "With Coaching £146.97"
 */
async clickWithCoaching14697(): Promise<void> {
  await this.withCoaching14697Button.click();
}

/**
 * @componente  radio "With Coaching"
 * @attenzione  ancoraggio ambiguous: 6 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
 */
async setWithCoaching(): Promise<void> {
  await this.withCoachingChoice.check();
}

/**
 * @componente  button "Select"
 * @attenzione  ancoraggio ambiguous: 7 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
 */
async clickSelect(): Promise<void> {
  await this.selectButton.click();
}
}
