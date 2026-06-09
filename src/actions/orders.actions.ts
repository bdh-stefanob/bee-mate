// src/actions/orders.actions.ts
// DOMAIN / ACTION LAYER for orders. Small, focused actions composed together —
// no god-methods. Steps call these; these call Page Objects / API clients.

import { Page } from "@playwright/test";
import { CartPage } from "../pages/cart.page";

export interface CartItem {
  product: string;
  quantity: number;
}

export class OrderActions {
  constructor(private page: Page) {}

  async addToCart(items: CartItem[]): Promise<void> {
    const cart = new CartPage(this.page);
    for (const item of items) {
      await cart.addProduct(item.product, item.quantity);
    }
  }

  async placeOrder(): Promise<void> {
    await new CartPage(this.page).checkout();
  }

  async isOrderConfirmed(): Promise<boolean> {
    return new CartPage(this.page).isConfirmationVisible();
  }

  async orderStatus(): Promise<string> {
    return new CartPage(this.page).readOrderStatus();
  }
}
