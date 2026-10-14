// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/questions2.page.ts
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

export class Questions2Page extends BasePage {
  readonly path = "/questions/2";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly el0Field: Locator = this.page.getByRole('spinbutton', { name: /^[^\p{L}\p{N}]*0[^\p{L}\p{N}]*$/u }).first();  // ambiguous: il nome e' solo un numero: e' un valore che cambia, non un'identita'; 3 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
  private readonly nextButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Next[^\p{L}\p{N}]*$/u });

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    // Nessun elemento stabile fra quelli toccati: si usa il primo toccato, che
    // esisteva all'arrivo ma non e' univoco (ce ne sono piu' d'uno uguali).
    await this.expectVisible(this.el0Field);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
   * @componente  spinbutton "0"
   * @attenzione  ancoraggio ambiguous: il nome e' solo un numero: e' un valore che cambia, non un'identita'; 3 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
   */
  async fill0(value: string): Promise<void> {
    await this.el0Field.fill(value);
  }

  /**
   * @componente  button "Next"
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }
}
