// src/pages/app-a/cart.page.ts
// PAGE OBJECT for cart/checkout. Selectors and UI mechanics only.

import { Page } from "@playwright/test";

export class CartPage {
  constructor(private page: Page) {}

  private readonly addButton = (product: string) =>
    `[data-testid="add-${product}"]`;
  private readonly checkoutButton = '[data-testid="checkout"]';
  private readonly confirmation = '[data-testid="order-confirmation"]';
  private readonly status = '[data-testid="order-status"]';

  async addProduct(product: string, quantity: number): Promise<void> {
    for (let i = 0; i < quantity; i++) {
      await this.page.click(this.addButton(product));
    }
  }

  async checkout(): Promise<void> {
    await this.page.click(this.checkoutButton);
  }

  async isConfirmationVisible(): Promise<boolean> {
    return this.page.isVisible(this.confirmation);
  }

  async readOrderStatus(): Promise<string> {
    return (await this.page.textContent(this.status)) ?? "";
  }
}
