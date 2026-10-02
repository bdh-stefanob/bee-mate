// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/wei.page.ts
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


export class WeiPage extends BasePage {
  readonly path = "/services/WEI";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly iHavenTBeenHereButton: Locator = this.page.getByRole('link', { name: 'I haven\'t been here for over 3 months I last used a weight loss medicine from Boots Online doctor more than 3 months ago' });  // unstable: nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    // Nessuna verifica dichiarata dal tester su questa pagina: si riconosce da un
// componente qualunque. E' un riconoscimento debole — registrando, premi
// "Verifica" su cio' che dice davvero "sono sulla pagina giusta".
await this.expectVisible(this.iHavenTBeenHereButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
 * @componente  link "I haven't been here for over 3 months I last used a weight loss medicine from Boots Online doctor more than 3 months ago"
 * @attenzione  ancoraggio unstable: nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo
 */
async clickIHavenTBeenHere(): Promise<void> {
  await this.iHavenTBeenHereButton.click();
}
}
