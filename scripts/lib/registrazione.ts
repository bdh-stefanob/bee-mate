/**
 * lib/registrazione.ts
 * --------------------
 * Il **cablaggio** di una sessione di registrazione: la binding che riceve gli
 * eventi dalla pagina, i due sorgenti iniettati, e l'inventario preso mentre si
 * registra.
 *
 * PERCHE' NON STA DENTRO A record.ts
 * Perche' lo usano in due, e il secondo e' un controllo. `record.ts` apre un
 * browser visibile e aspetta un tester; un controllo automatico guida gli stessi
 * gesti da codice. Se il cablaggio fosse scritto due volte, il controllo
 * misurerebbe la propria copia invece del recorder vero — cioe' direbbe "va
 * bene" mentre sul campo si perde un gesto. E' lo stesso motivo per cui esiste
 * `dom-probe.ts`: una sola implementazione, o l'aggancio fra gesto e componente
 * si rompe in silenzio.
 *
 * Qui non c'e' nessuna decisione: il raggruppamento in intenti (`group`) e la
 * nominazione dei passi restano in `record.ts`, dove si parla col tester.
 */

import type { BrowserContext, Page } from "@playwright/test";
import { DOM_PROBE_SOURCE } from "./dom-probe";
import { RECORDER_OVERLAY_SOURCE } from "./recorder-overlay";
import { inventory, mergeInventories } from "./inventory";
import { pageIdentity } from "./generate-core";
import type { ScoutResult } from "./generation-contract";

/** Un evento come arriva dalla pagina, prima di diventare intento. */
export interface RawEvent {
  type: "ready" | "action" | "assert" | "intent" | "note" | "stop";
  at: number;
  url?: string;
  action?: "click" | "fill" | "set";
  role?: string;
  name?: string;
  value?: string;
  secret?: boolean;
  text?: string;
  label?: string;
}

export interface OpzioniRegistrazione {
  /**
   * Quanto si aspetta che la pagina si assesti prima di inventariarla.
   *
   * Non e' una costante nascosta: un controllo automatico non ha motivo di
   * aspettare quanto aspetta un tester, e aspettare di piu' del necessario in
   * un controllo significa solo farlo durare di piu'.
   */
  attesaInventarioMs?: number;
}

export interface SessioneDiRegistrazione {
  page: Page;
  /** Gli eventi, nell'ordine in cui sono arrivati. */
  eventi: RawEvent[];
  /** Gli indirizzi attraversati. */
  pagine: Set<string>;
  /** I dizionari delle pagine viste, per chiave di identita'. */
  dizionari: Map<string, ScoutResult>;
  /** Inventaria subito la pagina corrente, senza aspettare che si assesti. */
  inventariaOra(): Promise<void>;
  /** Annulla un inventario in coda: si chiama prima di chiudere. */
  ferma(): void;
  /** Il tester ha premuto «Fine registrazione». */
  fermato(): boolean;
  /** La barra e' comparsa davvero su questa pagina? */
  barraPresente(): Promise<boolean>;
}

/**
 * Prepara il contesto e apre la pagina su cui si registra.
 *
 * Il contesto arriva da fuori perche' le sue opzioni (viewport, sessione
 * salvata) sono una decisione di chi registra, non del cablaggio.
 */
export async function apriRegistrazione(
  context: BrowserContext,
  opzioni: OpzioniRegistrazione = {}
): Promise<SessioneDiRegistrazione> {
  const attesaInventarioMs = opzioni.attesaInventarioMs ?? 1200;
  const eventi: RawEvent[] = [];
  const pagine = new Set<string>();
  const dizionari = new Map<string, ScoutResult>();
  let fermato = false;

  /**
   * I totali tornano alla pagina come risposta alla binding.
   *
   * L'overlay viene reiniettato a ogni navigazione, quindi un contatore tenuto
   * nella pagina ripartirebbe da zero appena si cambia pagina: il tester
   * vedrebbe "0 azioni" dopo aver fatto il login e concluderebbe che non sta
   * registrando. Il totale vero lo conosce solo questo lato.
   */
  const counts = (): { actions: number; intents: number; assertions: number } => ({
    actions: eventi.filter((e) => e.type === "action").length,
    intents: eventi.filter((e) => e.type === "intent").length,
    assertions: eventi.filter((e) => e.type === "assert").length,
  });

  await context.exposeBinding("__bddEmit", async (source, payload: string) => {
    let event: RawEvent;
    try {
      event = JSON.parse(payload) as RawEvent;
    } catch {
      return counts();
    }
    if (event.type === "ready") {
      // about:blank e' la pagina su cui nasce ogni scheda: non l'ha visitata nessuno.
      if (event.url && event.url !== "about:blank") pagine.add(event.url);
      return counts();
    }
    if (event.type === "stop") {
      fermato = true;
      return counts();
    }
    // L'URL lo stampiglia Node, non la pagina: `page.url()` e' vero anche dopo
    // un redirect che la pagina non ha avuto tempo di raccontare. Senza, non si
    // sa a quale Page Object appartiene il gesto, e un intento che attraversa
    // due pagine finirebbe tutto nella prima.
    event.url = source.page.url();
    eventi.push(event);
    return counts();
  });

  // addInitScript, non evaluate: cosi' l'overlay rinasce a ogni navigazione.
  // Senza, la barra sparirebbe al primo cambio pagina — cioe' subito.
  await context.addInitScript({ content: DOM_PROBE_SOURCE });
  await context.addInitScript({ content: RECORDER_OVERLAY_SOURCE });

  const page = await context.newPage();

  /**
   * Inventaria la pagina corrente e fonde il risultato con quanto si sapeva.
   *
   * Unione, non sostituzione: un modale aperto a meta' sessione mostra
   * componenti che dopo non ci sono piu', e sono proprio quelli toccati.
   */
  const assorbi = (d: ScoutResult): void => {
    const key = pageIdentity(d.url).key;
    const gia = dizionari.get(key);
    dizionari.set(key, gia ? mergeInventories(gia, d) : d);
  };

  let attesa: NodeJS.Timeout | null = null;

  // ── L'inventario, preso mentre si registra ────────────────────────────────
  //
  // Con un ritardo, e annullabile: su un'applicazione a pagina singola le
  // navigazioni arrivano a raffica, e inventariare a ogni cambio di rotta
  // rallenterebbe chi sta lavorando — che e' la cosa da non fare mai, perche' un
  // tester rallentato torna a fare il test senza lo strumento.
  //
  // Ogni errore qui e' silenzioso di proposito: una pagina non inventariata e'
  // un dizionario piu' povero, non una sessione persa.
  const inventaria = (): void => {
    if (attesa) clearTimeout(attesa);
    attesa = setTimeout(() => {
      void inventory(page)
        .then(assorbi)
        .catch(() => { /* pagina che naviga mentre si legge: si riprovera' */ });
    }, attesaInventarioMs);
  };

  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    if (frame.url() !== "about:blank") pagine.add(frame.url());
    inventaria();
  });
  inventaria();

  return {
    page,
    eventi,
    pagine,
    dizionari,
    inventariaOra: async () => {
      await inventory(page).then(assorbi).catch(() => { /* browser gia' chiuso */ });
    },
    ferma: () => {
      if (attesa) clearTimeout(attesa);
      attesa = null;
    },
    fermato: () => fermato,
    barraPresente: () =>
      page
        .evaluate(() => Boolean(document.getElementById("__bdd_recorder_host")))
        .catch(() => false),
  };
}
