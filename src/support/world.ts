// src/support/world.ts
// Il "World" di Cucumber e' il contesto di uno scenario. Ogni scenario ne riceve
// uno nuovo, quindi lo stato non passa da uno scenario all'altro. Qui dentro
// vivono il browser e la pagina di Playwright, ed e' da qui che li prendono le
// step definition e le Page Object.

import { setWorldConstructor, World, IWorldOptions } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page, chromium } from "@playwright/test";
import { loadEnv } from "../../scripts/lib/atlassian";

// Una sola implementazione del lettore di .env in tutto il progetto: due copie
// divergono, e la seconda si scopre il giorno in cui una variabile viene letta
// in un posto e non nell'altro.
loadEnv();

/**
 * L'indirizzo di partenza dell'ambiente sotto test.
 *
 * **Non sta nel codice, e non e' una svista.** Le Page Object generate hanno un
 * `path` relativo (`/inventory.html`): l'origine cambia fra locale, staging e
 * collaudo, e scriverla nei file la fisserebbe a un ambiente solo — oltre a far
 * finire un indirizzo aziendale in un repository pubblico.
 *
 * Si mette in `.env`, che e' gitignorato:  BASE_URL=https://...
 */
const BASE_URL = process.env["BASE_URL"] ?? "";

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async init(): Promise<void> {
    // HEADED=1 per guardare il test mentre gira: serve quando un passo fallisce
    // e la causa non si capisce dal messaggio.
    this.browser = await chromium.launch({ headless: process.env["HEADED"] !== "1" });
    this.context = await this.browser.newContext({
      ...(BASE_URL ? { baseURL: BASE_URL } : {}),
      // La sessione salvata da `npm run session` evita di rifare il login a ogni
      // scenario. Assente, si parte da un browser pulito.
      ...(process.env["STORAGE_STATE"] ? { storageState: process.env["STORAGE_STATE"] } : {}),
    });
    this.page = await this.context.newPage();
  }

  /**
   * Verifica che un testo sia visibile sulla pagina corrente.
   *
   * Sta qui e non in una step definition per una ragione precisa: la verifica di
   * presenza non appartiene a nessuna pagina in particolare — vale su qualunque
   * pagina — e scriverla nello step significherebbe metterci dentro un
   * selettore. Il World e' supporto, non glue: e' il posto giusto per la
   * meccanica che non ha una Page Object a cui appartenere.
   *
   * Il difetto era nel codice generato, e non l'ha trovato una rilettura: l'ha
   * trovato la misura "selettori negli step" del benchmark, puntata contro noi
   * stessi.
   */
  async expectTextVisible(text: string, ms = 10_000): Promise<void> {
    await this.page
      .getByText(text, { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: ms });
  }

  async destroy(): Promise<void> {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(CustomWorld);
