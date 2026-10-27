// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/insomnia-service.page.ts
//
// PAGE OBJECT — l'unico layer che conosce i selettori.
//
// Generata da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-27T10-22-51-093Z.json
//   dizionario    : reports\scout\qa-brochure.lemonaidhealth.co.uk-jet-lag.json, reports\scout\qa-brochure.lemonaidhealth.co.uk-propecia-online.json, reports\scout\qa-brochure.lemonaidhealth.co.uk.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-account-visit-history.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-account.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-Hair-Loss.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-important-info.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-insomnia.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-Jet-Lag.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-login.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-messages.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-order-complete-async-no-call.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-pharmacies.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-pharmacy-map-selection.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-1017-INS-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-product-406-JET-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-products-HAI-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-products-INS-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-products-JET-F.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-1.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-2.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-3.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-services-HAI.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-services-INS.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-services-JET.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-summary.json, reports\scout\qa-clinic.lemonaidhealth.co.uk.json, reports\scout\qa.lemonaidpims.co.uk.json
//   il            : 2026-10-27T10:26:34.050Z
//
// I locator vengono dal dizionario, non dalla memoria di nessuno. Se uno smette
// di funzionare, la pagina e' cambiata: si rifa' `npm run scout`, non si tira a
// indovinare.
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class InsomniaServicePage extends BasePage {
  readonly path = "/insomnia-service";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly getStartedLink: Locator = this.page.getByRole('link', { name: /^[^\p{L}\p{N}]*Get started[^\p{L}\p{N}]*$/u }).or(this.page.getByText(/^[^\p{L}\p{N}]*Get started[^\p{L}\p{N}]*$/u)).filter({ visible: true }).first();  // ambiguous: 3 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    // Nessun elemento stabile fra quelli toccati: si usa il primo toccato, che
    // esisteva all'arrivo ma non e' univoco (ce ne sono piu' d'uno uguali).
    await this.expectVisible(this.getStartedLink);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  link "Get started"
   * @attenzione  ancoraggio ambiguous: 3 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
   */
  async goToGetStarted(): Promise<void> {
    await this.getStartedLink.click();
  }
}
