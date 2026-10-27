// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/summary.page.ts
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


export class SummaryPage extends BasePage {
  readonly path = "/summary";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly el0000Expiry0729Button: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*\.\.\.\.0000 Expiry 07\/29[^\p{L}\p{N}]*$/u }).first();  // ambiguous: contiene un identificativo numerico; 22 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
private readonly placeOrderButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Place Order[^\p{L}\p{N}]*$/u });
  private readonly toggleVitalityMembershipSectionButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Toggle Vitality membership section[^\p{L}\p{N}]*$/u });
  private readonly creditOrDebitCardCvcField: Locator = this.page.getByRole('textbox', { name: /^[^\p{L}\p{N}]*Credit or debit card CVC\/CVV[^\p{L}\p{N}]*$/u });
  private readonly creditOrDebitCardExpirationField: Locator = this.page.getByRole('textbox', { name: /^[^\p{L}\p{N}]*Credit or debit card expiration date[^\p{L}\p{N}]*$/u });
  private readonly creditOrDebitCardNumberField: Locator = this.page.getByRole('textbox', { name: /^[^\p{L}\p{N}]*Credit or debit card number[^\p{L}\p{N}]*$/u });
  private readonly el0000Expiry1229Button: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*\.\.\.\.0000 Expiry 12\/29[^\p{L}\p{N}]*$/u });  // unstable: contiene un identificativo numerico
  private readonly el0005Expiry0729Button: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*\.\.\.\.\d+ Expiry \d+\/\d+[^\p{L}\p{N}]*$/u }).first();  // ambiguous: contiene un identificativo numerico; 5 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
  private readonly saveContinueButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Save & continue[^\p{L}\p{N}]*$/u });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    // Nessun elemento stabile fra quelli toccati: si usa il primo toccato, che
// esisteva all'arrivo ma non e' univoco (ce ne sono piu' d'uno uguali).
await this.expectVisible(this.el0000Expiry0729Button);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
 * @componente  button "....0000 Expiry 07/29"
 * @attenzione  ancoraggio ambiguous: contiene un identificativo numerico; 22 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
 */
async click0000Expiry0729(): Promise<void> {
  await this.el0000Expiry0729Button.click();
}

/**
 * @componente  button "Place Order"
 */
async clickPlaceOrder(): Promise<void> {
  await this.placeOrderButton.click();
}

  /**
   * @componente  button "Toggle Vitality membership section"
   */
  async clickToggleVitalityMembershipSection(): Promise<void> {
    await this.toggleVitalityMembershipSectionButton.click();
  }

  /**
   * @componente  textbox "Credit or debit card CVC/CVV"
   */
  async fillCreditOrDebitCardCvc(value: string): Promise<void> {
    await this.creditOrDebitCardCvcField.fill(value);
  }

  /**
   * @componente  textbox "Credit or debit card expiration date"
   */
  async fillCreditOrDebitCardExpiration(value: string): Promise<void> {
    await this.creditOrDebitCardExpirationField.fill(value);
  }

  /**
   * @componente  textbox "Credit or debit card number"
   */
  async fillCreditOrDebitCardNumber(value: string): Promise<void> {
    await this.creditOrDebitCardNumberField.fill(value);
  }

  /**
   * @componente  button "....0000 Expiry 12/29"
   * @attenzione  ancoraggio unstable: contiene un identificativo numerico
   */
  async click0000Expiry1229(): Promise<void> {
    await this.el0000Expiry1229Button.click();
  }

  /**
   * @componente  button "....0005 Expiry 07/29"
   * @attenzione  ancoraggio ambiguous: contiene un identificativo numerico; 5 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
   */
  async click0005Expiry0729(): Promise<void> {
    await this.el0005Expiry0729Button.click();
  }

  /**
   * @componente  button "Save & continue"
   */
  async clickSaveContinue(): Promise<void> {
    await this.saveContinueButton.click();
  }
}
