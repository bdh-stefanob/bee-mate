// src/pages/clinic/accesso-clinic.page.ts
// L'accesso del paziente: dalla brochure al modulo di clinic. Scritta a mano:
// la usa la utility di accesso della sentinella.
import { type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export const BROCHURE = "https://qa-brochure.lemonaidhealth.co.uk";

export class AccessoClinicPage extends BasePage {
  readonly path = "/login";

  constructor(page: Page) {
    super(page);
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.page.getByRole("textbox", { name: "Email" }));
  }

  async apriDallaBrochure(): Promise<void> {
    await this.page.goto(`${BROCHURE}/`);
    await this.page.getByRole("button", { name: "Log in", exact: true }).click();
  }

  /** «Log In» esatto: l'intestazione ha un «Log in» che altrimenti lo confonde. */
  async entra(email: string, password: string): Promise<void> {
    await this.page.getByRole("textbox", { name: "Email" }).fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.getByRole("button", { name: "Log In", exact: true }).click();
    await this.page.getByRole("button", { name: /My account/ }).waitFor({ state: "visible", timeout: 45_000 });
  }
}
