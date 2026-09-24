/**
 * fine-sessione.ts
 * ----------------
 * Quando e' finita una sessione nel browser che il tester guida a mano.
 *
 * L'INCIDENTE (2026-09-24, Windows, Chrome)
 * Il tester registrava l'accesso, chiudeva la finestra, e il cruscotto restava
 * a girare per sempre. Il registratore aspettava lo stop dalla barra oppure lo
 * scollegamento del browser: ma chiudere la finestra chiude la PAGINA, e il
 * processo del browser avviato da Playwright puo' restare vivo senza finestre.
 * Nessuno dei due segnali arrivava, e il processo non finiva mai.
 *
 * Lo stesso difetto era gia' stato corretto in `session.ts` il 2026-09-23; qui
 * era rimasto. Ora il criterio e' uno, in un posto solo: la sessione finisce
 * quando il tester preme stop, quando il browser si scollega, oppure quando non
 * resta aperta nessuna pagina del contesto — comprese quelle aperte dopo, come
 * una scheda o un popup.
 */

import type { Browser, BrowserContext, Page } from "@playwright/test";

export type MotivoFine = "stop" | "browser-chiuso" | "pagine-chiuse";

export function attendiFineSessione(
  browser: Browser,
  context: BrowserContext,
  fermato: () => boolean,
  intervalloMs = 300
): Promise<MotivoFine> {
  return new Promise<MotivoFine>((resolve) => {
    let finito = false;
    const concludi = (motivo: MotivoFine): void => {
      if (finito) return;
      finito = true;
      clearInterval(timer);
      resolve(motivo);
    };

    const timer = setInterval(() => {
      if (fermato()) concludi("stop");
    }, intervalloMs);

    browser.on("disconnected", () => concludi("browser-chiuso"));

    const seNessunaAperta = (): void => {
      if (context.pages().length === 0) concludi("pagine-chiuse");
    };
    const osserva = (p: Page): void => {
      p.on("close", seNessunaAperta);
    };
    context.pages().forEach(osserva);
    context.on("page", osserva);
  });
}
