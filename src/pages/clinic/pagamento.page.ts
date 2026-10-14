// src/pages/clinic/pagamento.page.ts
// Il riepilogo dell'ordine e il pagamento. Scritta a mano: la usa la utility
// del pagamento. I campi della carta stanno in iframe di Stripe (POC, PaymentPage).
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class PagamentoPage extends BasePage {
  readonly path = "/summary";

  constructor(page: Page) {
    super(page);
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.page.getByRole("heading", { name: /your order/i }));
  }

  cartaSalvata(): Locator {
    return this.page.getByRole("button", { name: /Expiry/ }).filter({ visible: true }).first();
  }

  /** Stripe: un iframe per campo, nell'ordine numero, scadenza, CVC. */
  async scriviCarta(numero: string, scadenza: string, cvc: string): Promise<void> {
    const frame = (n: number) => this.page.frameLocator('iframe[name^="__privateStripeFrame"]').nth(n);
    await frame(0).getByRole("textbox", { name: "Credit or debit card number" }).fill(numero);
    await frame(1).getByRole("textbox", { name: "Credit or debit card expiration date" }).fill(scadenza);
    await frame(2).getByRole("textbox", { name: "Credit or debit card CVC/CVV" }).fill(cvc);
  }

  async confermaOrdine(): Promise<void> {
    await this.page.getByRole("button", { name: /place order/i }).click();
  }
}
