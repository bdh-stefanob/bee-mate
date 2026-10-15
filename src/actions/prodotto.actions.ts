// src/actions/prodotto.actions.ts
// Sceglie un prodotto: la scheda giusta, le scelte finali (durata o dose, poi
// formula), e la conferma con il suo «Select». I tentativi intermedi del tester
// non arrivano qui: li scarta il registro delle utility (src/support/utility.ts).
import type { Page } from "@playwright/test";
import { ProdottiPage } from "../pages/clinic/prodotti.page";

export async function scegliProdotto(page: Page, prodotto: string, ...scelte: string[]): Promise<void> {
  const p = new ProdottiPage(page);
  await p.assertLoaded();
  for (const scelta of scelte) await p.scegli(prodotto, scelta);
  await p.conferma(prodotto);
  await page.waitForURL((u) => !u.pathname.startsWith("/products/"), { timeout: 60_000 });
}
