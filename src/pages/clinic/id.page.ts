// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/id.page.ts
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

export class IdPage extends BasePage {
  readonly path = "/camera/id";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly openCameraButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Open camera[^\p{L}\p{N}]*$/u });
  private readonly takePictureButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Take Picture[^\p{L}\p{N}]*$/u });
  private readonly saveButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Save[^\p{L}\p{N}]*$/u });
  private readonly thatSMeButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*That's me[^\p{L}\p{N}]*$/u });
  private readonly submitButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Submit[^\p{L}\p{N}]*$/u });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.openCameraButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  button "Open camera"
   */
  async clickOpenCamera(): Promise<void> {
    await this.openCameraButton.click();
  }

  /**
   * @componente  button "Take Picture"
   */
  async clickTakePicture(): Promise<void> {
    await this.takePictureButton.click();
  }

  /**
   * @componente  button "Save"
   */
  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * @componente  button "That's me"
   */
  async clickThatSMe(): Promise<void> {
    await this.thatSMeButton.click();
  }

  /**
   * @componente  button "Submit"
   */
  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }
}
