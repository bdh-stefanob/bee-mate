/**
 * lib/copione.ts
 * ---------------
 * Guida un copione (lib/copione-schema.ts) nel browser VERO, con lo stesso
 * cablaggio del recorder (lib/registrazione.ts): non scrive la traccia, fa le
 * stesse cose che farebbe una persona e lascia che il recorder le registri.
 *
 * NON DUPLICA app-finta.check.ts, LO RIUSA COME MODELLO
 * `app-finta.check.ts` fa esattamente questo, ma con un percorso scritto in
 * TypeScript. Qui lo stesso meccanismo (`apriRegistrazione` + eventi
 * `__bddEmit` per i confini e le verifiche, + `group()` di record.ts) guida un
 * percorso che arriva come DATO, non come codice. Vedi il rapporto N10 per la
 * proposta — non ancora decisa — di fare convergere anche l'app finta su
 * questo formato.
 *
 * AZIONI PER RUOLO + NOME, MAI SELETTORI
 * Come ogni altro posto del progetto: `page.getByRole(ruolo, { name })`.
 */

import type { BrowserContext, Page } from "@playwright/test";
import { apriRegistrazione, type RawEvent } from "./registrazione";
import { group } from "../record";
import type { Copione, IntentoCopione, VerificaCopione } from "./copione-schema";
import { impronta } from "./copione-difese";
import type { Recording, ScoutResult } from "./generation-contract";

export interface OpzioniCopione {
  /** L'indirizzo da cui parte: il tester lo scriverebbe nella barra, il copione lo riceve da `resolveTarget`. */
  startUrl: string;
  /** Pausa fra un'azione e l'altra: senza, l'inventario (dopo ogni azione) non fa in tempo a vedere la pagina. */
  attesaGestoMs?: number;
  /** Quanto aspettare che la pagina si assesti prima di inventariarla. */
  attesaInventarioMs?: number;
  /** Timeout di ogni singola azione Playwright. */
  timeoutAzioneMs?: number;
}

export interface EsitoCopione {
  recording: Recording;
  dizionari: Map<string, ScoutResult>;
  /** Le azioni che non e' stato possibile compiere: il copione descrive un'applicazione diversa da quella vera. */
  nonRiuscite: string[];
  /** Pagine attraversate prima che si assestassero. */
  pagineMancate: string[];
}

async function compiaAzione(page: Page, azione: IntentoCopione["azioni"][number], timeoutMs: number): Promise<void> {
  const locator = page
    .getByRole(azione.ruolo as Parameters<Page["getByRole"]>[0], { name: azione.nome, exact: true })
    .first();
  if (azione.azione === "click") {
    await locator.click({ timeout: timeoutMs });
  } else {
    await locator.fill(azione.valore ?? "", { timeout: timeoutMs });
  }
}

/**
 * Guida il copione sulla pagina aperta da `apriRegistrazione`, dichiarando i
 * confini e le verifiche come farebbe la barra, e restituisce una
 * registrazione con `origine: "copione"` (difesa 1).
 */
export async function eseguiCopione(context: BrowserContext, copione: Copione, opzioni: OpzioniCopione): Promise<EsitoCopione> {
  const attesaGesto = opzioni.attesaGestoMs ?? 300;
  const timeoutAzione = opzioni.timeoutAzioneMs ?? 10_000;
  const sessione = await apriRegistrazione(context, { attesaInventarioMs: opzioni.attesaInventarioMs ?? 300 });
  const page = sessione.page;
  const nonRiuscite: string[] = [];
  const inizio = Date.now();

  const dichiara = async (evento: Omit<RawEvent, "at">): Promise<void> => {
    await page.evaluate(
      (payload: string) =>
        (window as unknown as { __bddEmit(p: string): Promise<unknown> }).__bddEmit(payload),
      JSON.stringify({ ...evento, at: Date.now() })
    );
  };

  const dichiaraVerifica = async (v: VerificaCopione): Promise<void> => {
    await dichiara({ type: "assert", role: v.ruolo, name: v.nome, ...(v.testo ? { text: v.testo } : {}) });
  };

  await page.goto(opzioni.startUrl, { waitUntil: "domcontentloaded" });

  for (const intento of copione.intenti) {
    // Le verifiche con `dopoAzione` si dichiarano ESATTAMENTE in quel punto,
    // non tutte in fondo: e' quello che tiene viva la correzione del 30/9
    // sulla posizione (`afterStep`) delle verifiche a meta' passo.
    const rimanenti = [...(intento.verifiche ?? [])];
    const dichiaraFinoA = async (soglia: number): Promise<void> => {
      for (let k = rimanenti.length - 1; k >= 0; k--) {
        const v = rimanenti[k]!;
        const sogliaV = v.dopoAzione ?? intento.azioni.length;
        if (sogliaV <= soglia) {
          await dichiaraVerifica(v);
          rimanenti.splice(k, 1);
        }
      }
    };

    await dichiaraFinoA(0);
    let fatte = 0;
    for (const azione of intento.azioni) {
      try {
        await compiaAzione(page, azione, timeoutAzione);
      } catch (err) {
        nonRiuscite.push(
          `${intento.nome} · ${azione.azione} ${azione.ruolo} "${azione.nome}": ${(err as Error).message.split("\n")[0]}`
        );
      }
      fatte++;
      // Come in app-finta.check.ts: il tempo che passa fra un gesto e l'altro
      // quando lo fa una persona. Senza, l'inventario non vede niente, e si
      // misurerebbe la fretta del controllo invece del recorder.
      await page.waitForTimeout(attesaGesto);
      await dichiaraFinoA(fatte);
    }
    await dichiaraFinoA(Infinity); // quel che resta (default: dopo l'ultima azione)
    await dichiara({ type: "intent", label: intento.nome });
  }

  // La verifica fuori da ogni intento: si dichiara DOPO l'ultimo "Fine
  // intento", senza che un nuovo intento la richiuda. group() (record.ts) la
  // attacca al passo precedente — l'altra correzione del 30/9.
  if (copione.verificaFinale) await dichiaraVerifica(copione.verificaFinale);

  sessione.ferma();
  await sessione.inventariaOra();

  const { intents, unlabelled } = group(sessione.eventi);

  const recording: Recording = {
    startUrl: opzioni.startUrl,
    recordedAt: new Date(inizio).toISOString(),
    durationSeconds: Math.round((Date.now() - inizio) / 1000),
    pagesVisited: [...sessione.pagine],
    summary: {
      intents: intents.length,
      steps: intents.reduce((n, i) => n + i.steps.length, 0),
      assertions: intents.reduce((n, i) => n + i.assertions.length, 0),
      unlabelled,
    },
    intents,
    target: copione.ambiente,
    // Difesa 1: la provenienza, sempre. Mai dedotta: e' questa funzione, e
    // solo questa, a poterla scrivere.
    origine: "copione",
    copioneImpronta: impronta(copione),
  };

  return {
    recording,
    dizionari: sessione.dizionari,
    nonRiuscite,
    pagineMancate: sessione.pagineMancate(),
  };
}
