// src/steps/orders/orders.steps.ts
// Order steps. Demonstrates the canonical, declarative style and an OPTIONAL
// data table: the same business action ("cart contains products") is expressed
// both as a single-product step and a table-driven step, reusing one action.

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { CustomWorld } from "../../support/world";
import { OrderActions } from "../../actions/orders.actions";

/**
 * @intent  Adds a single product to the cart.
 * @param   product  The product name to add.
 * @post    The cart contains the named product, quantity 1.
 * @page    CartPage
 */
Given(
  "the cart contains the product {string}",
  async function (this: CustomWorld, product: string) {
    await new OrderActions(this.page).addToCart([{ product, quantity: 1 }]);
  }
);

/**
 * @intent  Adds several products to the cart from a table.
 * @post    The cart contains every product/quantity listed.
 * @page    CartPage
 */
Given(
  "the cart contains the following products:",
  async function (this: CustomWorld, table: DataTable) {
    const items = table.hashes().map((row) => ({
      product: row.product,
      quantity: Number(row.quantity),
    }));
    await new OrderActions(this.page).addToCart(items);
  }
);

/**
 * @intent  Submits the current cart as an order.
 * @pre     The cart contains at least one product.
 * @post    An order is created.
 * @page    CartPage
 */
When("I place the order", async function (this: CustomWorld) {
  await new OrderActions(this.page).placeOrder();
});

/**
 * @intent  Verifies the order was confirmed.
 * @page    CartPage
 */
Then("the order is confirmed", async function (this: CustomWorld) {
  const confirmed = await new OrderActions(this.page).isOrderConfirmed();
  assert.equal(confirmed, true, "Expected the order to be confirmed");
});

/**
 * @intent  Verifies the order has the expected status.
 * @param   status  Expected status, e.g. "pending".
 * @page    CartPage
 */
Then(
  "the order status is {string}",
  async function (this: CustomWorld, status: string) {
    const actual = await new OrderActions(this.page).orderStatus();
    assert.equal(actual, status, `Expected order status "${status}"`);
  }
);

/**
 * @intent    Searches the catalog for a product by name.
 * @param     product  The product name to search for.
 * @wanted
 * @requester DEMO-001
 * @assignee  steve
 */
When(
  "I search for the product {string}",
  async function (this: CustomWorld, product: string) {
    throw new Error('NOT IMPLEMENTED');
  }
);
