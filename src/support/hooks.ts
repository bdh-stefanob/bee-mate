// src/support/hooks.ts
// Lifecycle hooks: spin up a browser before each scenario, tear it down after.
// On failure, attach a screenshot to the report for debugging.

import { Before, After, AfterStep, Status, ITestCaseHookParameter, setDefaultTimeout } from "@cucumber/cucumber";
import { CustomWorld } from "./world";
import { scriviFallimento } from "../../scripts/lib/fallimento";

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

// Il passo che e' fallito, per il dossier: l'hook di fine scenario non lo conosce.
let passoFallito: string | undefined;

Before(function () {
  passoFallito = undefined;
});

AfterStep(function ({ pickleStep, result }) {
  if (result.status === Status.FAILED && !passoFallito) passoFallito = pickleStep.text;
});

After(async function (this: CustomWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const image = await this.page.screenshot().catch(() => undefined);
    if (image) this.attach(image, "image/png");
    await dossier(this, scenario, image);
  }
  await this.destroy();
});

/**
 * Il dossier del fallimento (vedi scripts/lib/fallimento.ts). Mai un errore:
 * serve a capire un fallimento, non a causarne un altro.
 */
async function dossier(world: CustomWorld, scenario: ITestCaseHookParameter, image?: Buffer): Promise<void> {
  try {
    const aria = await world.page
      .locator("body")
      .ariaSnapshot({ timeout: 3000 })
      .catch(() => undefined);
    const titolo = await world.page.title().catch(() => undefined);
    const cartella = scriviFallimento({
      scenario: scenario.pickle.name,
      feature: scenario.pickle.uri,
      ...(passoFallito ? { passo: passoFallito } : {}),
      messaggio: scenario.result?.message ?? "(nessun messaggio)",
      url: world.page.url(),
      ...(titolo ? { titolo } : {}),
      ...(aria ? { aria } : {}),
      ...(image ? { screenshot: image } : {}),
      ...(process.env["BDD_TARGET"] ? { ambiente: process.env["BDD_TARGET"] } : {}),
    });
    console.log(`
  Dossier del fallimento: ${cartella}
`);
  } catch (err) {
    console.log(`
  Dossier del fallimento non scritto: ${(err as Error).message}
`);
  }
}
