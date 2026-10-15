// src/pages/clinic/questionario.page.ts
// Il questionario di clinic: stessa pagina (/questions/N) per domande diverse.
// Scritta a mano (nessun marcatore di generazione): la usa la utility del
// questionario. Selettori dallo script di esplorazione del 14/10 e dal POC
// (JetLagWizardPage).
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

/** Il nome del campo data e' la data di oggi, in forma gg/mm/aaaa. */
const DATA = /^\d{2}\/\d{2}\/\d{4}$/;

export class QuestionarioPage extends BasePage {
  readonly path = "/questions/";

  constructor(page: Page) {
    super(page);
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.titolo());
  }

  sulQuestionario(): boolean {
    return this.page.url().includes("/questions/");
  }

  private titolo(): Locator {
    return this.page.locator("h3").filter({ visible: true }).first();
  }

  async domanda(): Promise<string> {
    const t = await this.titolo().textContent({ timeout: 1500 }).catch(() => "");
    return (t ?? "").replace(/\s+/g, " ").trim();
  }

  async aspettaDomanda(ms = 30_000): Promise<void> {
    await this.titolo().waitFor({ state: "visible", timeout: ms }).catch(() => undefined);
  }

  campiNumerici(): Locator {
    return this.page.getByRole("spinbutton").filter({ visible: true });
  }

  private campoData(): Locator {
    return this.page.getByRole("textbox", { name: DATA }).filter({ visible: true }).first();
  }

  async haData(ms = 3000): Promise<boolean> {
    return this.campoData().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
  }

  /** Il campo e' spesso in sola lettura: allora si sceglie oggi dal calendario. */
  async scegliData(valore: string): Promise<void> {
    if (valore !== "oggi" && (await this.campoData().fill(valore, { timeout: 3000 }).then(() => true, () => false))) {
      await this.campoData().press("Tab");
      return;
    }
    await this.page.getByRole("button", { name: "Open calendar" }).click();
    const oggi = this.page
      .locator(".md-calendar-date-today .md-calendar-date-selection-indicator")
      .filter({ visible: true })
      .first();
    const qualunque = this.page
      .locator(".md-calendar-date:not(.md-calendar-date-disabled) .md-calendar-date-selection-indicator")
      .filter({ visible: true })
      .last();
    await oggi.or(qualunque).first().click({ timeout: 10_000 });
  }

  /** Una risposta: l'etichetta esatta, poi un elemento con ng-click che la contiene (POC). */
  async rispondi(risposta: string): Promise<boolean> {
    const etichetta = this.page.getByText(risposta, { exact: true }).filter({ visible: true }).first();
    if (await etichetta.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false)) {
      await etichetta.click();
      return true;
    }
    // Il testo intero, non una sottostringa (revisione del 15/10): «No» trovava
    // «None of the above», e una domanda senza la risposta riceveva una risposta
    // a caso invece di fermare lo scenario.
    const intero = new RegExp(`^\\s*${risposta.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
    const ngClick = this.page.locator("[ng-click]").filter({ hasText: intero }).filter({ visible: true }).first();
    if (!(await ngClick.isVisible().catch(() => false))) return false;
    await ngClick.click();
    return true;
  }

  next(): Locator {
    return this.page.getByRole("button", { name: "Next", exact: true });
  }
}
