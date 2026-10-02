// src/support/avvisi.ts
// Gli avvisi che l'applicazione mostra quando vuole, non quando li aspetta il test.
//
// Un account con un ordine non concluso mostra «riprendi l'ordine» subito dopo
// l'accesso — ma anche in altri momenti, e non si sa quali. Un test che lo
// gestisce in un punto solo (il login) cade appena compare altrove: il click
// successivo e' intercettato dal modale e fallisce con un errore che parla del
// click, non dell'avviso.
//
// Playwright ha lo strumento giusto: `addLocatorHandler` esegue il gestore ogni
// volta che il locator e' visibile mentre il test sta per agire, in qualunque
// punto dello scenario. Il test non deve saperne niente, e quindi nemmeno il
// generatore: vale per ogni scenario, generato o scritto a mano.
//
// UN AVVISO NON E' UN PASSO. Il gestore chiude e basta, mai un errore: se non
// compare non succede niente, e se compare e non si chiude lo scenario prosegue
// e fallira' (con il dossier) solo se bloccava davvero qualcosa.
//
// Per aggiungere un avviso noto: una voce in AVVISI. Chiudere sempre con un
// gesto che non cambia lo stato dell'applicazione (Escape, «Chiudi»), mai con
// quello che conferma.

import type { Locator, Page } from "@playwright/test";

export interface Avviso {
  nome: string;
  /** Come si riconosce, dato che e' a schermo. */
  locator: (page: Page) => Locator;
  /** Come si chiude. */
  chiudi: (page: Page) => Promise<void>;
}

export const AVVISI: readonly Avviso[] = [
  {
    nome: "riprendi l'ordine aperto",
    locator: (page) => page.getByRole("button", { name: /resume/i }),
    // Escape, non «Resume»: l'ordine non si tocca.
    chiudi: async (page) => {
      await page.keyboard.press("Escape");
    },
  },
];

/**
 * Registra i gestori sulla pagina. `BDD_NO_AVVISI=1` li spegne: serve per uno
 * scenario che vuole proprio cliccare uno di quei pulsanti.
 */
export async function registraAvvisi(page: Page, avvisi: readonly Avviso[] = AVVISI): Promise<void> {
  if (process.env["BDD_NO_AVVISI"] === "1") return;
  for (const avviso of avvisi) {
    await page.addLocatorHandler(avviso.locator(page).first(), async () => {
      try {
        await avviso.chiudi(page);
      } catch {
        // Non chiudere un avviso non e' un fallimento del test.
      }
    });
  }
}
