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

  // UN PIN SI CONTA SOLO SE UN CLIC AL SUO CENTRO LO COLPISCE (ambiente QA,
  // 2026-10-14). Disegnato non basta: un pin sul bordo della mappa e' tagliato
  // dal riquadro, uno sotto l'intestazione fissa e' coperto, e il clic arriva
  // su qualcos'altro senza errori — la mappa non sceglie niente. Lo dice il
  // browser stesso: l'elemento in cima a quel punto deve essere il pin.
  //
  // Prima pero' la mappa si porta al centro della finestra: scorrendo la
  // FINESTRA, mai `scrollIntoView` sul pin, che farebbe scorrere anche il
  // riquadro della mappa a sua insaputa (la mappa disegna i pin in un punto e
  // li ascolta in un altro).
  await page.evaluate((selettore) => {
    const pin = document.querySelector(selettore);
    let riquadro: Element | null = pin?.parentElement ?? null;
    while (riquadro && !/(hidden|clip)/.test(getComputedStyle(riquadro).overflow)) riquadro = riquadro.parentElement;
    if (!riquadro) return;
    const r = riquadro.getBoundingClientRect();
    window.scrollBy(0, r.top + r.height / 2 - window.innerHeight / 2);
    window.dispatchEvent(new Event("resize"));
  }, selettorePin);

  const trova = ({ selettore, indice, lato }: typeof argomenti): { x: number; y: number } | null => {
    const colpibili = [...document.querySelectorAll(selettore)]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > lato && r.height > lato)
      .map(({ el, r }) => ({ el, x: r.x + r.width / 2, y: r.y + r.height / 2 }))
      .filter(({ el, x, y }) => {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
        // Il riquadro della mappa: il primo antenato che taglia cio' che sborda.
        let riquadro: Element | null = el.parentElement;
        while (riquadro && !/(hidden|clip)/.test(getComputedStyle(riquadro).overflow)) riquadro = riquadro.parentElement;
        if (riquadro) {
          const q = riquadro.getBoundingClientRect();
          if (x < q.left || x > q.right || y < q.top || y > q.bottom) return false;
        }
        // In cima a quel punto ci deve essere la mappa (il pin, o il livello che
        // ascolta i clic sopra la mappa), non l'intestazione o il resto della pagina.
        const sopra = document.elementFromPoint(x, y);
        if (!sopra) return false;
        return el === sopra || el.contains(sopra) || (riquadro !== null && riquadro.contains(sopra));
      });
    const scelto = colpibili[indice];
    return scelto ? { x: scelto.x, y: scelto.y } : null;
  };

  const comparso = await page
    .waitForFunction(trova, argomenti, { timeout: attesaMs })
    .then(() => true, () => false);
  if (!comparso) {
    const nelDom = await page.locator(selettorePin).count().catch(() => 0);
    throw new Error(
      `La ricetta "scelta-su-mappa" non ha trovato il pin n. ${indicePin} (selettore ${selettorePin}).\n` +
        `  Elementi con quel selettore nel DOM: ${nelDom}.\n` +
        (nelDom === 0
          ? `  Nessuno: la ricerca non ha dato risultati, oppure questa mappa disegna i pin in un altro modo\n` +
            `  (in quel caso va dichiarato \`selettorePin\`).`
          : `  Ci sono, ma nessuno si puo' colpire con un clic: tagliati dal bordo della mappa,\n` +
            `  coperti da qualcosa, o fuori dalla finestra.`)
    );
  }

  const centro = await page.evaluate(trova, argomenti);
  if (!centro) {
    throw new Error(
      `La ricetta "scelta-su-mappa" aveva trovato il pin n. ${indicePin}, ma e' sparito prima del clic:\n` +
        `  la mappa si e' ridisegnata. Rilancia; se si ripete, aumenta \`attesaMs\`.`
    );
  }

  await page.mouse.click(centro.x, centro.y);
}
