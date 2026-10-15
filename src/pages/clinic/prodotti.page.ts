// src/pages/clinic/prodotti.page.ts
// La pagina dei prodotti di un servizio (/products/<codice>): piu' schede, una
// per prodotto, ognuna con le sue durate o dosi, le sue formule e il suo
// «Select». Scritta a mano: la usa la utility della scelta del prodotto.
// Struttura osservata il 15/10 (Hair loss, Weight Loss): ogni scheda e' un
// elemento con ng-repeat "featured_product_group in ...", con il nome del
// prodotto come titolo.
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class ProdottiPage extends BasePage {
  readonly path = "/products/";

  constructor(page: Page) {
    super(page);
  }

  async assertLoaded(): Promise<void> {
    await this.page.waitForURL(/\/products\//, { timeout: 60_000 });
    await this.expectVisible(this.schede().first());
  }

  private schede(): Locator {
    return this.page.locator('[ng-repeat*="featured_product_group in"]').filter({ visible: true });
  }

  /** La scheda del prodotto, dal suo titolo esatto («Wegovy» non e' «Wegovy - New Product Group»). */
  scheda(prodotto: string): Locator {
    return this.schede()
      .filter({ has: this.page.getByRole("heading", { name: prodotto, exact: true }) })
      .first();
  }

  /** Un'opzione della scheda dal suo nome senza prezzo: «No-bundle» trova «No-bundle £150 £51». */
  async scegli(prodotto: string, opzione: string): Promise<void> {
    const nome = new RegExp(`^\\W*${escape(opzione)}(\\s|£|$)`, "i");
    await this.scheda(prodotto).getByRole("button", { name: nome }).filter({ visible: true }).first().click();
  }

  /** «Select» della scheda: si abilita solo quando la scelta e' valida. */
  async conferma(prodotto: string): Promise<void> {
    const select = this.scheda(prodotto).getByRole("button", { name: "Select", exact: true });
    await this.page
      .waitForFunction((el) => el instanceof HTMLButtonElement && !el.disabled, await select.elementHandle(), {
        timeout: 15_000,
      })
      .catch(() => {
        throw new Error(`Prodotto «${prodotto}»: «Select» resta disabilitato, la scelta non e' valida.`);
      });
    await select.click();
  }
}
