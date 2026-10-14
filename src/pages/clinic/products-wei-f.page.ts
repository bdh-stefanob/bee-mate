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
  private readonly el05mgButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*0\.5mg[^\p{L}\p{N}]*$/u });
private readonly withCoaching14697Button: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*With Coaching £146\.97[^\p{L}\p{N}]*$/u });
private readonly withCoachingChoice: Locator = this.page.getByRole('radio', { name: /^[^\p{L}\p{N}]*With Coaching[^\p{L}\p{N}]*$/u }).first();  // ambiguous: 6 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
private readonly selectButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Select[^\p{L}\p{N}]*$/u }).first();  // ambiguous: 7 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
  private readonly el10mg31797Button: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*10mg £317\.97[^\p{L}\p{N}]*$/u });
  private readonly el75mgButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*7\.5mg[^\p{L}\p{N}]*$/u });
  private readonly withoutCoaching151Button: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Without Coaching £151[^\p{L}\p{N}]*$/u });
  private readonly el72mgButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*7\.2mg[^\p{L}\p{N}]*$/u });
  private readonly withoutCoaching28597Button: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Without Coaching £285\.97[^\p{L}\p{N}]*$/u });

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
  await this.spunta(this.withCoachingChoice);
}

/**
 * @componente  button "Select"
 * @attenzione  ancoraggio ambiguous: 7 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
 */
async clickSelect(): Promise<void> {
  await this.selectButton.click();
}

  /**
   * @componente  button "10mg £317.97"
   */
  async click10mg31797(): Promise<void> {
    await this.el10mg31797Button.click();
  }

  /**
   * @componente  button "7.5mg"
   */
  async click75mg(): Promise<void> {
    await this.el75mgButton.click();
  }

  /**
   * @componente  button "Without Coaching £151"
   */
  async clickWithoutCoaching151(): Promise<void> {
    await this.withoutCoaching151Button.click();
  }

  /**
   * @componente  button "7.2mg"
   */
  async click72mg(): Promise<void> {
    await this.el72mgButton.click();
  }

  /**
   * @componente  button "Without Coaching £285.97"
   */
  async clickWithoutCoaching28597(): Promise<void> {
    await this.withoutCoaching28597Button.click();
  }
}
