// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/product-hai-f.page.ts
//
// PAGE OBJECT — l'unico layer che conosce i selettori.
//
// Generata da:
//   registrazione : reports/recordings/qa-clinic.lemonaidhealth.co.uk-2026-10-15T08-39-43-860Z.json
//   dizionario    : reports\scout\qa-brochure.lemonaidhealth.co.uk-mens-health.json, reports\scout\qa-brochure.lemonaidhealth.co.uk-propecia-online.json, reports\scout\qa-brochure.lemonaidhealth.co.uk-weight-loss-treatment.json, reports\scout\qa-brochure.lemonaidhealth.co.uk.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-account-visit-history.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-account.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-camera-id.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-camera-visit.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-Hair-Loss.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-important-info.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-login.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-Map-Emergency-Contraception.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-messages.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-order-complete-async-no-call.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-pharmacies.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-pharmacy-map-selection.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-1026-WEI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-1059-WEI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-1120-WEI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-29-HAI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-products-HAI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-products-WEI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-1.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-2.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-services-HAI.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-services-WEI.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-summary.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-weight-loss.json, reports\scout\the-internet.herokuapp.com-tables.json
//   il            : 2026-10-15T09:05:14.082Z
//
// I locator vengono dal dizionario, non dalla memoria di nessuno. Se uno smette
// di funzionare, la pagina e' cambiata: si rifa' `npm run scout`, non si tira a
// indovinare.
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class ProductHaiFPage extends BasePage {
  readonly path = "/product/29/HAI-F";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly continueButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*continue[^\p{L}\p{N}]*$/u });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.continueButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  button "continue"
   */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }
}
