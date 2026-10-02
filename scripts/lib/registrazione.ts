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
import type { Contesto, ScoutResult, SenzaAncoraggio } from "./generation-contract";

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
  /** Il gesto non ha ruolo ne nome: vedi SenzaAncoraggio nel contratto. */
  ancoraggioAssente?: SenzaAncoraggio;
  /** Dove e avvenuto: la domanda, il dialog. Vedi Contesto nel contratto. */
  contesto?: Contesto;
  /** Il campo e stato inviato con Invio, non solo compilato. */
  invio?: boolean;
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
  /**
   * Le pagine di cui si e' chiesto l'inventario e che non si e' fatto in tempo a
   * leggere: attraversate in meno del tempo di assestamento. Si dichiarano, non
   * si colmano — un dizionario piu' povero di quel che sembra e' un difetto che
   * si scopre molto piu' tardi, quando i locator non trovano niente.
   */
  pagineMancate(): string[];
  /** Annulla gli inventari in coda: si chiama prima di chiudere. */
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
   * Cosa fare quando arriva un gesto: inventariare la pagina.
   *
   * Si assegna piu' sotto perche' la binding si espone prima che la pagina
   * esista — e la binding e' il solo punto che sa quando un gesto e' avvenuto.
   */
  let dopoOgniAzione: () => void = () => { /* assegnata dopo l'apertura della pagina */ };

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
    // Un gesto cambia la pagina anche senza navigare: si chiede l'inventario.
    if (event.type === "action") dopoOgniAzione();
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
  // PER PERCORSO VERO, NON PER CHIAVE MASCHERATA.
  //
  // Con la chiave mascherata i dizionari di `/questions/1`, `/questions/2` e
  // `/questions/3` si fondevano gia' qui, prima che qualcuno potesse decidere se
  // quelle tre pagine sono la stessa cosa. La decisione la prende il generatore,
  // guardando i componenti: per poterla prendere deve averli separati.
  const assorbi = (d: ScoutResult): void => {
    const key = pageIdentity(d.url).keyEsatta;
    const gia = dizionari.get(key);
    dizionari.set(key, gia ? mergeInventories(gia, d) : d);
    mancate.delete(key);
  };

  /** Una scansione in attesa per ciascuna pagina, con la chiave di chi l'ha chiesta. */
  const attese = new Map<string, NodeJS.Timeout>();
  /** Le pagine di cui si e' chiesto l'inventario e che si e' lasciate prima di leggerle. */
  const mancate = new Set<string>();
  /** Le scansioni si fanno una per volta: due `evaluate` sovrapposti non aiutano nessuno. */
  let coda: Promise<void> = Promise.resolve();

  const chiaveCorrente = (): string => {
    try {
      const url = page.url();
      // about:blank e' la pagina su cui nasce ogni scheda: non l'ha visitata
      // nessuno, e inventariarla produrrebbe un dizionario vuoto per una pagina
      // che non esiste — o, peggio, un avviso di pagina non inventariata.
      if (!url || url === "about:blank") return "";
      return pageIdentity(url).keyEsatta;
    } catch {
      return "";
    }
  };

  // ── L'inventario, preso mentre si registra ────────────────────────────────
  //
  // DOPO OGNI AZIONE, NON SOLO QUANDO SI NAVIGA. E' la correzione che conta di
  // piu': un sacco di stato compare senza cambiare pagina. Dopo "Open camera"
  // nascono "Take Picture", "Save", "That's me"; dopo una ricerca per postcode
  // nascono i pin e il pulsante che li conferma. Legandosi a `framenavigated` il
  // dizionario di quelle pagine conteneva solo cio' che c'era all'arrivo — cioe'
  // non conteneva nessuno dei componenti che il tester ha davvero toccato.
  //
  // UNA CODA PER PAGINA, E NESSUNA RICHIESTA ANNULLATA. Prima c'era un solo
  // timer, riazzerato a ogni navigazione: una pagina attraversata in fretta non
  // veniva mai inventariata, e la scansione guardava la pagina aperta al momento
  // dello scatto, non quella che l'aveva chiesta. Ora la richiesta porta con se'
  // l'identita' di chi l'ha fatta, e se nel frattempo si e' andati altrove non
  // si legge la pagina sbagliata: si **dichiara** di non avere letto quella
  // giusta. Una richiesta gia' in attesa non si riazzera, cosi' una raffica di
  // gesti non sposta in avanti la scansione all'infinito.
  //
  // Ogni errore qui e' silenzioso di proposito: una pagina non inventariata e'
  // un dizionario piu' povero, non una sessione persa. Fermare la registrazione
  // di qualcuno a meta' per un dettaglio tecnico sarebbe sproporzionato.
  const chiediInventario = (): void => {
    const chiave = chiaveCorrente();
    if (!chiave || attese.has(chiave)) return;
    attese.set(
      chiave,
      setTimeout(() => {
        attese.delete(chiave);
        if (chiaveCorrente() !== chiave) {
          // Si e' lasciata la pagina prima di riuscire a leggerla. Se non ne
          // abbiamo nemmeno una versione precedente, e' un buco: va detto.
          if (!dizionari.has(chiave)) mancate.add(chiave);
          return;
        }
        coda = coda.then(() =>
          inventory(page)
            .then(assorbi)
            .catch(() => { /* pagina che naviga mentre si legge: si riprovera' */ })
        );
      }, attesaInventarioMs)
    );
  };

  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    if (frame.url() !== "about:blank") pagine.add(frame.url());
    chiediInventario();
  });
  chiediInventario();
  dopoOgniAzione = chiediInventario;

  return {
    page,
    eventi,
    pagine,
    dizionari,
    inventariaOra: async () => {
      await coda;
      await inventory(page).then(assorbi).catch(() => { /* browser gia' chiuso */ });
    },
    pagineMancate: () => [...mancate],
    ferma: () => {
      for (const t of attese.values()) clearTimeout(t);
      attese.clear();
    },
    fermato: () => fermato,
    barraPresente: () =>
      page
        .evaluate(() => Boolean(document.getElementById("__bdd_recorder_host")))
        .catch(() => false),
  };
}
