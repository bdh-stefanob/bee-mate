// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/order-complete-async-no-call.page.ts
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


export class OrderCompleteAsyncNoCallPage extends BasePage {
  readonly path = "/order-complete-async-no-call";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly el22SecureMessagesButton: Locator = this.page.getByRole('button', { name: '22 Secure messages' });
private readonly el22Button: Locator = this.page.getByText('22', { exact: true });  // unstable: il nome e' solo un numero: e' un valore che cambia, non un'identita'

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.el22SecureMessagesButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
 * @componente  button "22 Secure messages"
 */
async click22SecureMessages(): Promise<void> {
  await this.el22SecureMessagesButton.click();
}

/**
 * @componente  text "22"
 * @attenzione  ancoraggio unstable: il nome e' solo un numero: e' un valore che cambia, non un'identita'
 */
async click22(): Promise<void> {
  await this.el22Button.click();
}
}
