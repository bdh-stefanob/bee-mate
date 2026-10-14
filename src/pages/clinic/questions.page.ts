// generato-da: bdd-generate · rigenerabile
// src/pages/clinic/questions.page.ts
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


export class QuestionsPage extends BasePage {
  readonly path = "/questions/1";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
  private readonly noButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*NO[^\p{L}\p{N}]*$/u });
  private readonly mdCalendarDateSelectionIndicatorButton: Locator = this.page.locator('.md-calendar-date-selection-indicator').first();  // unnamed: nessun ruolo e nessun nome accessibile: ancorato a un selettore CSS, che e' un dettaglio di implementazione; serve una ricetta: un comportamento dichiarato, non un locator per ogni elemento; 106 elementi uguali sulla pagina: si prende il primo
  private readonly nextButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Next[^\p{L}\p{N}]*$/u });
  private readonly openCalendarButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Open calendar[^\p{L}\p{N}]*$/u });
  private readonly stayOnTheSameDoseButton: Locator = this.page.getByRole('button', { name: /^[^\p{L}\p{N}]*Stay on the same dose[^\p{L}\p{N}]*$/u });
  private readonly el0Field: Locator = this.page.getByRole('spinbutton', { name: /^[^\p{L}\p{N}]*0[^\p{L}\p{N}]*$/u }).first();  // ambiguous: il nome e' solo un numero: e' un valore che cambia, non un'identita'; 3 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  // Costruito dalle asserzioni che il tester ha dichiarato registrando: sono
  // gli elementi per cui ha detto "se vedo questo, sono dove volevo essere".
  async assertLoaded(): Promise<void> {
    // PROVA 14/10: la stessa pagina /questions/1 porta domande diverse a seconda
    // della storia dell'utente; si riconosce da una qualunque delle sue risposte.
    await this.expectVisible(this.noButton.or(this.stayOnTheSameDoseButton).or(this.nextButton).first());
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
  // Un metodo per componente: e' la meta' meccanica della mappatura. L'altra
  // meta' — intento -> step Gherkin — e' 1:N e non si genera da qui.
  /**
 * @componente  button "NO"
 */
async clickNo(): Promise<void> {
  await this.noButton.click();
}

  /**
   * @componente   "md-calendar-date-selection-indicator"
   * @attenzione  ancoraggio unnamed: nessun ruolo e nessun nome accessibile: ancorato a un selettore CSS, che e' un dettaglio di implementazione; serve una ricetta: un comportamento dichiarato, non un locator per ogni elemento; 106 elementi uguali sulla pagina: si prende il primo
   */
  async clickMdCalendarDateSelectionIndicator(): Promise<void> {
    await this.clickSenzaAncoraggio(this.mdCalendarDateSelectionIndicatorButton);
  }

  /**
   * @componente  button "Next"
   */
  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * @componente  button "Open calendar"
   */
  async clickOpenCalendar(): Promise<void> {
    await this.openCalendarButton.click();
  }

  /**
   * @componente  button "Stay on the same dose"
   */
  async clickStayOnTheSameDose(): Promise<void> {
    await this.stayOnTheSameDoseButton.click();
  }

  /**
   * @componente  spinbutton "0"
   * @attenzione  ancoraggio ambiguous: il nome e' solo un numero: e' un valore che cambia, non un'identita'; 3 elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro
   */
  async fill0(value: string): Promise<void> {
    await this.el0Field.fill(value);
  }
}
