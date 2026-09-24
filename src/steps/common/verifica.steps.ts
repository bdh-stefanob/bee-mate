// src/steps/common/verifica.steps.ts
// Il passo di verifica generico, scritto una volta sola.
//
// Ogni scenario generato da una registrazione lo usa per le verifiche che il
// tester ha dichiarato ("Verifica"). Prima il generatore lo riscriveva in ogni
// file di step: con due scenari salvati, Cucumber trovava la stessa frase due
// volte e si rifiutava di partire. Qui c'e' una definizione, e basta.

import { Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";

/**
 * @intent  Verifica che un elemento atteso sia visibile sulla pagina.
 * @param   atteso  Il nome accessibile, o il testo, dell'elemento.
 * @area    common
 *
 * Uno solo per tutte le verifiche di presenza: uno per elemento sarebbe uno
 * step nuovo a ogni registrazione. La meccanica vive nel World: una step
 * definition non conosce selettori.
 */
Then("the page shows {string}", async function (this: CustomWorld, atteso: string) {
  await this.expectTextVisible(atteso);
});
