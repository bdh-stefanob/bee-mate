// src/support/hooks.ts
// Lifecycle hooks: spin up a browser before each scenario, tear it down after.
// On failure, attach a screenshot to the report for debugging.

import { Before, After, Status, ITestCaseHookParameter, setDefaultTimeout } from "@cucumber/cucumber";
import { CustomWorld } from "./world";

/**
 * Quanto puo' durare un passo prima che Cucumber lo dichiari scaduto.
 *
 * Il valore predefinito di Cucumber e' **5 secondi**, e nessuno l'aveva alzato
 * perche' fin qui i test giravano su fixture. Sulla prima esecuzione contro
 * un'applicazione vera il primo passo e' scaduto li': non era rotto, stava
 * ancora caricando. Anche l'hook di chiusura e' scaduto, per la stessa ragione.
 *
 * Un timeout troppo corto non produce un fallimento onesto: produce un
 * fallimento che parla di se stesso invece che dell'applicazione, e manda a
 * cercare nel posto sbagliato. Sessanta secondi sono larghi di proposito — il
 * test che passa non ci mette comunque di piu' — e `BDD_TIMEOUT` serve a
 * stringerli quando si vuole misurare la lentezza invece di sopportarla.
 */
setDefaultTimeout(Number(process.env["BDD_TIMEOUT"] ?? 60_000));

Before(async function (this: CustomWorld) {
  await this.init();
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const image = await this.page.screenshot();
    this.attach(image, "image/png");
  }
  await this.destroy();
});
