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
  /** Quale pin scegliere, fra quelli disegnati, nell'ordine del DOM (0 = il primo). */
  indicePin?: number;
  /** Quanto aspettare che il pin compaia prima di arrendersi. */
  attesaMs?: number;
  /**
   * Come si riconosce un pin. Il default e' quello osservato sull'applicazione
   * vera e sull'app finta; un'altra mappa lo dichiara qui, senza toccare la ricetta.
   */
  selettorePin?: string;
  /** Di quanto scorrere la pagina perche' la mappa entri nell'area visibile (0 = non scorrere). */
  scorriPx?: number;
}

/** Sotto questa misura un pin e' nel DOM ma non e' disegnato: non e' cliccabile. */
const LATO_MINIMO_PIN = 5;

/**
 * Sceglie un pin sulla mappa cliccando col mouse sul suo centro, non tramite
 * l'azione guidata dal locator: quella fallirebbe con "element intercepts
 * pointer events" contro il livello che sta sopra, e un clic sintetico una
 * mappa vera lo ignora. E' la stessa tecnica di `clickSenzaAncoraggio` (vedi
 * `src/support/base.page.ts`), qui mirata al pin giusto invece che al livello
 * che lo copre.
 *
 * SU UNA MAPPA VERA I PIN NON CI SONO FINCHE' NON SI VEDONO (2026-10-13, prima
 * esecuzione sull'ambiente QA). Google Maps disegna i segnaposto solo per la
 * porzione di mappa dentro l'area visibile, e in un browser senza finestra non
 * si accorge da solo che la pagina e' scorsa. Quindi, prima di cercarli: si
 * scorre la pagina e si annuncia un ridimensionamento, cosi' la mappa ricalcola
 * cosa mostrare. E si conta solo un pin che ha una dimensione: uno nel DOM con
 * rettangolo nullo esiste e non si puo' cliccare.
 */
export async function sceltaSuMappa(page: Page, opzioni: OpzioniSceltaSuMappa = {}): Promise<void> {
  const { indicePin = 0, attesaMs = 25_000, selettorePin = ".custom-marker", scorriPx = 400 } = opzioni;

  if (scorriPx > 0) await page.evaluate((px) => window.scrollBy(0, px), scorriPx);
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));

  const argomenti = { selettore: selettorePin, indice: indicePin, lato: LATO_MINIMO_PIN };

  const comparso = await page
    .waitForFunction(
      ({ selettore, indice, lato }) =>
        [...document.querySelectorAll(selettore)].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > lato && r.height > lato;
        }).length > indice,
      argomenti,
      { timeout: attesaMs }
    )
    .then(() => true, () => false);
  if (!comparso) {
    const nelDom = await page.locator(selettorePin).count().catch(() => 0);
    throw new Error(
      `La ricetta "scelta-su-mappa" non ha trovato il pin n. ${indicePin} (selettore ${selettorePin}).\n` +
        `  Elementi con quel selettore nel DOM: ${nelDom}.\n` +
        (nelDom === 0
          ? `  Nessuno: la ricerca non ha dato risultati, oppure questa mappa disegna i pin in un altro modo\n` +
            `  (in quel caso va dichiarato \`selettorePin\`).`
          : `  Ci sono ma non sono disegnati: la mappa non li ha ancora messi nell'area visibile.`)
    );
  }

  // Le coordinate del mouse sono quelle dell'area visibile: un pin sotto il bordo
  // della finestra non si colpisce, e va portato dentro.
  //
  // SI SCORRE LA FINESTRA, MAI `scrollIntoView` SUL PIN. Il pin vive dentro il
  // riquadro della mappa, che nasconde cio' che sborda: `scrollIntoView` fa
  // scorrere anche quel riquadro, la mappa non lo sa e da li' in poi disegna i
  // pin in un punto e li ascolta in un altro. Il clic arriva, e non sceglie niente.
  const centro = await page.evaluate(({ selettore, indice, lato }) => {
    const pinScelto = (): Element | undefined =>
      [...document.querySelectorAll(selettore)].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > lato && r.height > lato;
      })[indice];
    let pin = pinScelto();
    if (!pin) return null;
    let r = pin.getBoundingClientRect();
    const y = r.y + r.height / 2;
    if (y < 0 || y > window.innerHeight) {
      window.scrollBy(0, y - window.innerHeight / 2);
      pin = pinScelto();
      if (!pin) return null;
      r = pin.getBoundingClientRect();
    }
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, argomenti);
  if (!centro) {
    throw new Error(
      `La ricetta "scelta-su-mappa" aveva trovato il pin n. ${indicePin}, ma e' sparito prima del clic:\n` +
        `  la mappa si e' ridisegnata. Rilancia; se si ripete, aumenta \`attesaMs\`.`
    );
  }

  await page.mouse.click(centro.x, centro.y);
}
