// src/pages/clinic/servizio-weight-loss.page.ts
// L'avvio del servizio Weight Loss: dalla pagina del trattamento fino al
// questionario, per un paziente di ritorno. Scritta a mano: la usa la utility
// della sentinella. Selettori dallo script di esplorazione del 14/10.
import { type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";
import { BROCHURE } from "./accesso-clinic.page";

export class ServizioWeightLossPage extends BasePage {
  readonly path = "/weight-loss/treatment";

  constructor(page: Page) {
    super(page);
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.page.getByRole("link", { name: /^Get started/ }).filter({ visible: true }).first());
  }

  async apri(): Promise<void> {
    await this.page.goto(`${BROCHURE}/weight-loss/treatment`);
    await this.page.getByRole("link", { name: /^Get started/ }).filter({ visible: true }).first().click();
  }

  /** Un <a> senza indirizzo: per Playwright non e' un link, si cerca per testo. */
  async comePazienteDiRitorno(): Promise<void> {
    const ritorno = this.page.getByText(/I haven't been here for over 3 months/).filter({ visible: true }).first();
    await ritorno.waitFor({ state: "visible", timeout: 60_000 });
    await ritorno.click();
  }

  async scegliProdotto(dose: string, coaching: "With Coaching" | "Without Coaching"): Promise<void> {
    await this.page.getByRole("heading", { name: /which medicine/i }).waitFor({ state: "visible", timeout: 60_000 });
    await this.page.getByRole("button", { name: dose, exact: true }).first().click();
    await this.page
      .getByRole("button", { name: new RegExp(`^\\W*${coaching}\\b`) })
      .filter({ visible: true })
      .first()
      .click();
    await this.page.getByRole("button", { name: "Select", exact: true }).and(this.page.locator(":enabled")).first().click();
    await this.page.getByRole("button", { name: /^continue$/i }).filter({ visible: true }).first().click();
  }

  async accettaInformazioniImportanti(): Promise<void> {
    await this.page.getByText("I understand the important information above.").filter({ visible: true }).first().click();
    await this.page.getByRole("button", { name: "Continue", exact: true }).click();
    await this.page.waitForURL(/\/questions\//, { timeout: 60_000 });
  }

  async ritiroInFarmacia(): Promise<void> {
    await this.page.getByRole("button", { name: "Yes, pick up in store" }).click({ timeout: 60_000 });
  }
}
