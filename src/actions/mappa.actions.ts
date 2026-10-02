// src/actions/mappa.actions.ts
// Scegliere un pin su una mappa, quando un livello sopra intercetta i clic.
//
// IL CASO. Una libreria di mappe vera (Leaflet, Google Maps) non lascia che si
// clicchi un pin come un pulsante qualunque: un livello trasparente sopra la
// mappa riceve il clic, fa il proprio hit-test sulle coordinate e decide lui
// quale pin e' stato colpito. Il generatore vede un solo elemento cliccabile —
// quel livello — e un clic al centro del suo rettangolo non colpisce nessun
// pin in particolare: funziona per un pulsante, non per una mappa.
//
// PERCHE' E' UNA RICETTA E NON UNA REGOLA DEL GENERATORE. Scegliere IL pin
// giusto richiede sapere quale, in base a cosa il tester cercava — un'informazione
// di business che la registrazione non porta (il DOM non dice "questa e' la
// farmacia che l'utente voleva"). Il generatore non puo' indovinarlo: puo' solo
// dichiarare che il gesto assomiglia a questo caso (vedi
// `src/support/ricette.ts`) e lasciare a una persona la scelta di usare questa
// azione al suo posto. Non si applica mai da sola.
//
// Fallisce parlando: un pin che non compare (perche' la mappa non si e' ancora
// ridisegnata, o la ricerca non ha dato risultati) dice quale indice cercava e
// perche' non c'era, non trenta secondi di silenzio.

import type { Page } from "@playwright/test";

export interface OpzioniSceltaSuMappa {
  /** Quale pin scegliere, nell'ordine in cui compaiono nel DOM (0 = il primo). */
  indicePin?: number;
  /** Quanto aspettare che il pin compaia prima di arrendersi. */
  attesaMs?: number;
}

/**
 * Sceglie un pin sulla mappa (selettore `.custom-marker`, lo stesso che
 * sintetizza `componenteSenzaRuolo`) cliccando col mouse sul suo centro, non
 * tramite l'azione guidata dal locator: quella fallirebbe con "element
 * intercepts pointer events" contro il livello che sta sopra. E' la stessa
 * tecnica di `clickSenzaAncoraggio` (vedi `src/support/base.page.ts`), qui
 * mirata al pin giusto invece che al livello che lo copre.
 */
export async function sceltaSuMappa(page: Page, opzioni: OpzioniSceltaSuMappa = {}): Promise<void> {
  const { indicePin = 0, attesaMs = 5000 } = opzioni;
  const pin = page.locator(".custom-marker").nth(indicePin);

  const visibile = await pin
    .waitFor({ state: "visible", timeout: attesaMs })
    .then(() => true, () => false);
  if (!visibile) {
    throw new Error(
      `La ricetta "scelta-su-mappa" non ha trovato il pin n. ${indicePin}.\n` +
        `  Se la mappa congela l'area visibile alla creazione (come l'app finta usata per\n` +
        `  provarla), un pin fuori da quell'area non esiste finche' non arriva un\n` +
        `  ridimensionamento: prova a dispatchare un evento "resize" prima di questo passo.`
    );
  }

  const box = await pin.boundingBox();
  if (!box) {
    throw new Error(
      `La ricetta "scelta-su-mappa" ha trovato il pin n. ${indicePin} nel DOM, ma non il suo\n` +
        `  rettangolo: non e' visualizzato (dimensione nulla, o fuori schermo).`
    );
  }

  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
