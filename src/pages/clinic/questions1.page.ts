// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/questions1.page.ts
//
// PAGE OBJECT — l'unico layer che conosce i selettori.
//
// Generata da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-14T08-51-36-224Z.json
//   dizionario    : reports\scout\qa-brochure.lemonaidhealth.co.uk-mens-health.json, reports\scout\qa-brochure.lemonaidhealth.co.uk-weight-loss-treatment.json, reports\scout\qa-brochure.lemonaidhealth.co.uk.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-account-visit-history.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-account.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-camera-id.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-camera-visit.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-important-info.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-login.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-Map-Emergency-Contraception.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-messages.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-order-complete-async-no-call.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-pharmacies.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-pharmacy-map-selection.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-1026-WEI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-1120-WEI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-products-WEI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-1.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-2.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-services-WEI.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-summary.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-weight-loss.json, reports\scout\the-internet.herokuapp.com-tables.json
//   il            : 2026-10-14T09:12:42.248Z
//
// I locator vengono dal dizionario, non dalla memoria di nessuno. Se uno smette
// di funzionare, la pagina e' cambiata: si rifa' `npm run scout`, non si tira a
// indovinare.
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class Questions1Page extends BasePage {
  readonly path = "/questions/1";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly tdl1430TextAnswerField: Locator = this.page.getByRole('textbox', { name: /^[^\p{L}\p{N}]*TdL 1430 Text Answer[^\p{L}\p{N}]*$/u });  // unstable: contiene un identificativo numerico
  private readonly nextButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Next[^\p{L}\p{N}]*$/u });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.nextButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  textbox "TdL 1430 Text Answer"
   * @attenzione  ancoraggio unstable: contiene un identificativo numerico
   */
  async fillTdl1430TextAnswer(value: string): Promise<void> {
    await this.tdl1430TextAnswerField.fill(value);
  }

  /**
   * @componente  button "Next"
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }
}
