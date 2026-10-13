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
// UN AVVISO NON E' UN PASSO, E VALE DA DUE LATI.
//
// A tempo di esecuzione il gestore chiude e basta, mai un errore: se non compare
// non succede niente, e se compare e non si chiude lo scenario prosegue e
// fallira' (con il dossier) solo se bloccava davvero qualcosa.
//
// A tempo di GENERAZIONE, il gesto che il tester ha fatto su un avviso non deve
// diventare un passo. Il tester ha cliccato «Accept All» perche' il banner c'era
// in quel momento; uno scenario che lo clicca fallisce ogni volta che non c'e',
// cioe' quasi sempre dalla seconda esecuzione in poi. Per questo ogni voce porta
// un `riconoscimento` dichiarativo — ruolo e nome accessibile, lo stesso
// vocabolario del probe del DOM — che il generatore puo' confrontare con i gesti
// registrati senza aprire un browser. Il `locator` si deriva da li': una sola
// descrizione, o i due lati divergono in silenzio.
//
// COME SI CHIUDE: il gesto che non cambia lo stato dell'applicazione — Escape,
// «Chiudi» — mai quello che conferma. Un'eccezione dichiarata: un banner dei
// cookie non ha un Escape ne' un «Chiudi», e accettare e' l'unica via per
// proseguire. Accettare i cookie non tocca lo stato di business (un ordine, un
// carrello, un pagamento), riprendere un ordine si': la regola resta quella,
// l'eccezione vale solo dove non c'e' altra uscita e il gesto non decide niente.

import type { Locator, Page } from "@playwright/test";

/** Come si riconosce un avviso: lo stesso vocabolario del probe del DOM. */
export interface Riconoscimento {
  role: string;
  /** Il nome accessibile. Un'espressione perche' spesso cambia di maiuscole. */
  name: RegExp;
}

export interface Avviso {
  nome: string;
  /** Come si riconosce, sia a schermo sia dentro una registrazione. */
  riconoscimento: Riconoscimento;
  /** Come si chiude. */
  chiudi: (page: Page) => Promise<void>;
}

export const AVVISI: readonly Avviso[] = [
  {
    nome: "riprendi l'ordine aperto",
    // «Start over» sta nello stesso dialog di «Resume»: e' lo stesso avviso, e il
    // gesto che il tester ci fa sopra non deve diventare un passo.
    riconoscimento: { role: "button", name: /resume|^start over$/i },
    // SECONDA ECCEZIONE DICHIARATA, e viene da una prova vera (2026-10-13).
    //
    // Dove il dialog offre «Start over», Escape non e' un'uscita: l'applicazione
    // lo prende per un rifiuto e rimanda allo storico delle visite, da cui lo
    // scenario non prosegue piu'. Con un ordine lasciato a meta' sull'utenza lo
    // scenario si fermava sempre li', e senza ordine a meta' passava: cioe' non
    // era ripetibile. Ricominciare e' l'unico gesto che porta nello stesso punto
    // in entrambi i casi — con o senza ordine in sospeso si parte dall'inizio.
    //
    // Dove «Start over» non c'e' resta la regola: Escape, l'ordine non si tocca.
    chiudi: async (page) => {
      const ricomincia = page.getByRole("button", { name: /^start over$/i }).first();
      if (await ricomincia.isVisible().catch(() => false)) {
        const prima = page.url();
        await ricomincia.click({ timeout: 5000 });
        // Ricominciare porta altrove. Sull'ambiente QA a volte la pagina resta
        // dov'e', sotto il velo di caricamento, anche per piu' di mezzo minuto:
        // ricaricarla la sblocca (l'ordine a meta' ormai non c'e' piu', quindi
        // il dialog non ricompare). Visto 3 volte su 8 il 2026-10-13.
        const andata = await page
          .waitForURL((u) => u.toString() !== prima, { timeout: 10_000 })
          .then(() => true, () => false);
        if (!andata) await page.reload();
        return;
      }
      await page.keyboard.press("Escape");
    },
  },
  {
    nome: "banner dei cookie",
    riconoscimento: { role: "button", name: /^accept all$/i },
    // L'eccezione dichiarata in testa al file: non c'e' un'altra uscita, e
    // accettare i cookie non decide niente del business.
    chiudi: async (page) => {
      await page.getByRole("button", { name: /^accept all$/i }).first().click({ timeout: 5000 });
    },
  },
];

/** Il locator di un avviso, derivato dal suo riconoscimento: una sola descrizione. */
export function locatorDiAvviso(page: Page, avviso: Avviso): Locator {
  return page.getByRole(avviso.riconoscimento.role as "button", { name: avviso.riconoscimento.name });
}

/**
 * Il gesto registrato e' un gesto su un avviso noto?
 *
 * Pura, e senza niente di Playwright dentro: la chiama il generatore, che non
 * apre nessun browser. Il confronto e' sul vocabolario del probe — ruolo e nome
 * accessibile — quindi e' identita', non somiglianza.
 */
export function avvisoDelGesto(
  gesto: { role: string; name: string },
  avvisi: readonly Avviso[] = AVVISI
): Avviso | null {
  return (
    avvisi.find(
      (a) => a.riconoscimento.role === gesto.role && a.riconoscimento.name.test(gesto.name)
    ) ?? null
  );
}

/**
 * Registra i gestori sulla pagina. `BDD_NO_AVVISI=1` li spegne: serve per uno
 * scenario che vuole proprio cliccare uno di quei pulsanti.
 */
export async function registraAvvisi(page: Page, avvisi: readonly Avviso[] = AVVISI): Promise<void> {
  if (process.env["BDD_NO_AVVISI"] === "1") return;
  for (const avviso of avvisi) {
    await page.addLocatorHandler(locatorDiAvviso(page, avviso).first(), async () => {
      try {
        await avviso.chiudi(page);
      } catch {
        // Non chiudere un avviso non e' un fallimento del test.
      }
    });
  }
}
