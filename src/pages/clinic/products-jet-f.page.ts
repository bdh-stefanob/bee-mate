// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/products-jet-f.page.ts
//
// PAGE OBJECT — l'unico layer che conosce i selettori.
//
// Generata da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-21T12-55-02-371Z.json
//   dizionario    : reports\scout\qa-brochure.lemonaidhealth.co.uk-jet-lag.json, reports\scout\qa-brochure.lemonaidhealth.co.uk.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-account-visit-history.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-account.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-important-info.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-Jet-Lag.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-login.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-messages.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-order-complete-async-no-call.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-pharmacies.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-pharmacy-map-selection.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-406-JET-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-products-JET-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-1.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-2.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-3.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-services-JET.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-summary.json, reports\scout\qa-clinic.lemonaidhealth.co.uk.json, reports\scout\qa.lemonaidpims.co.uk.json
//   il            : 2026-10-21T13:03:49.976Z
//
// I locator vengono dal dizionario, non dalla memoria di nessuno. Se uno smette
// di funzionare, la pagina e' cambiata: si rifa' `npm run scout`, non si tira a
// indovinare.
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";


export class ProductsJetFPage extends BasePage {
  readonly path = "/products/JET-F";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly el10HardCapsules120MelatoninButton: Locator = this.page.getByRole('button', { name: '10 Hard Capsules £120 Melatonin 3mg Melatonin is a hormone found naturally in the body that can be used to regulate your' });  // unstable: nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    // Nessuna verifica dichiarata dal tester su questa pagina: si riconosce da un
// componente qualunque. E' un riconoscimento debole — registrando, premi
// "Verifica" su cio' che dice davvero "sono sulla pagina giusta".
await this.expectVisible(this.el10HardCapsules120MelatoninButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
 * @componente  button "10 Hard Capsules £120 Melatonin 3mg Melatonin is a hormone found naturally in the body that can be used to regulate your"
 * @attenzione  ancoraggio unstable: nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo
 */
async click10HardCapsules120Melatonin(): Promise<void> {
  await this.el10HardCapsules120MelatoninButton.click();
}
}
