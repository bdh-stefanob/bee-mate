// generato-da: bdd-generate · rigenerabile
// src/pages/qa-brochure/questions.page.ts
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


export class QuestionsPage extends BasePage {
  readonly path = "/questions/1";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly startOfTheQuestionnaireSectionButton: Locator = this.page.getByRole('button', { name: 'Start of the Questionnaire Section - Move along' });
private readonly nextButton: Locator = this.page.getByRole('button', { name: 'Next' });
private readonly noGpButton: Locator = this.page.getByRole('button', { name: 'No GP' });
private readonly el0Field: Locator = this.page.getByRole('spinbutton', { name: '0' }).first();  // ambiguous: il nome e' solo un numero: e' un valore che cambia, non un'identita'; 4 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.startOfTheQuestionnaireSectionButton);
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
 * @componente  button "Start of the Questionnaire Section - Move along"
 */
async clickStartOfTheQuestionnaireSection(): Promise<void> {
  await this.startOfTheQuestionnaireSectionButton.click();
}

/**
 * @componente  button "Next"
 */
async clickNext(): Promise<void> {
  await this.nextButton.click();
}

/**
 * @componente  button "No GP"
 */
async clickNoGp(): Promise<void> {
  await this.noGpButton.click();
}

/**
 * @componente  spinbutton "0"
 * @attenzione  ancoraggio ambiguous: il nome e' solo un numero: e' un valore che cambia, non un'identita'; 4 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
 */
async fill0(value: string): Promise<void> {
  await this.el0Field.fill(value);
}
}
