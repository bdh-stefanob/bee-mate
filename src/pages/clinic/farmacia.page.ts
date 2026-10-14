// src/pages/clinic/farmacia.page.ts
// La scelta della farmacia: CAP, mappa, conferma. Scritta a mano: la usa la
// utility della farmacia. Il pin si sceglie con la ricetta della mappa.
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class FarmaciaPage extends BasePage {
  readonly path = "/pharmacy-map-selection";
  private readonly cap: Locator = this.page.getByRole("textbox", { name: "zip", exact: true });
  private readonly conferma: Locator = this.page.getByRole("button", { name: "Select Pharmacy", exact: true });

  constructor(page: Page) {
    super(page);
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.cap);
  }

  async cerca(cap: string): Promise<void> {
    await this.cap.fill(cap);
    await this.cap.press("Enter");
  }

  async confermaFarmacia(): Promise<void> {
    await this.conferma.click();
  }
}
