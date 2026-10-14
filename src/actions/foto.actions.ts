// src/actions/foto.actions.ts
// Selfie, documento, fronte, lato: tutte le foto che la pagina chiede, in
// qualunque ordine e quantita'. «That's me» e' facoltativo (POC,
// completeIdVerification): con la fotocamera finta compare l'avviso "foto di un
// solo colore", e si conferma.
import type { Page } from "@playwright/test";
import { FotoPage } from "../pages/clinic/foto.page";

const MAX_GESTI = 12;

export async function scattaFoto(page: Page): Promise<void> {
  const f = new FotoPage(page);
  await f.assertLoaded();
  for (let i = 0; i < MAX_GESTI; i++) {
    // Promise.any, non race: un'attesa che fallisce subito (la pagina che cambia)
    // non deve vincere sulle altre.
    const quale = await Promise.any([
      f.pulsante("Open camera").waitFor({ state: "visible", timeout: 30_000 }).then(() => "apri" as const),
      f.pulsante("Take Picture").waitFor({ state: "visible", timeout: 30_000 }).then(() => "scatta" as const),
      f.pulsante("Submit").waitFor({ state: "visible", timeout: 30_000 }).then(() => "invia" as const),
    ]).catch(() => null);
    if (!quale) return;
    if (quale === "invia") {
      await f.pulsante("Submit").click();
      await page.waitForTimeout(2000);
      if (!f.sullaFotocamera()) return;
      continue;
    }
    if (quale === "apri") await f.pulsante("Open camera").click();
    await f.pulsante("Take Picture").click();
    await f.pulsante("Save").click();
    const sonoIo = f.pulsante("That's me");
    if (await sonoIo.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false)) await sonoIo.click();
  }
}
