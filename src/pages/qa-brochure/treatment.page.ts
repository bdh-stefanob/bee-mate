// generato-da: bdd-generate · rigenerabile
// src/pages/qa-brochure/treatment.page.ts
//
// PAGE OBJECT — l'unico layer che conosce i selettori.
//
// Generata da:
//   registrazione : reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-09-30T15-10-45-430Z.json
//   dizionario    : reports\scout\qa-brochure.lemonaidhealth.co.uk.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-login.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-order-complete-async-no-call.json, reports\scout\qa-clinic.lemonaidhealth.co.uk-questions-3.json, reports\scout\qa-clinic.lemonaidhealth.co.uk.json, reports\scout\qa.lemonaidpims.co.uk.json
//   il            : 2026-09-30T15:13:59.508Z
//
// I locator vengono dal dizionario, non dalla memoria di nessuno. Se uno smette
// di funzionare, la pagina e' cambiata: si rifa' `npm run scout`, non si tira a
// indovinare.
//
// Togliendo il marcatore in prima riga questo file diventa tuo: la generazione
// lo salta invece di riscriverlo.

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";


export class TreatmentPage extends BasePage {
  readonly path = "/weight-loss/treatment";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly getStartedLink: Locator = this.page.getByRole('link', { name: 'Get started' }).first();  // ambiguous: 3 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro

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
