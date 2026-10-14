// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/visit.page.ts
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


export class VisitPage extends BasePage {
  readonly path = "/camera/visit/";

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
