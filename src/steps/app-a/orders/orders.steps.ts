// src/steps/app-a/orders/orders.steps.ts
// Step stubs per l'area orders dell'app-a.
// Contiene gli step @wanted (non ancora implementati) approvati dal gatekeeper.

import { When } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";

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
