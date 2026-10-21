/**
 * lib/elenco-registrazione.ts
 * ---------------------------
 * Cosa la barra della registrazione mostra di quanto il tester ha gia'
 * registrato, e cosa toglie "Annulla l'ultimo".
 *
 * I contatori ("12 azioni · 3 intenti") dicono QUANTO, non COSA: a meta' di
 * una registrazione lunga il tester non sa piu' quali passi ha chiuso e quali
 * verifiche ha fatto, e lo scopre solo leggendo lo scenario generato.
 *
 * L'elenco si calcola qui, dal lato Node, per la stessa ragione dei contatori:
 * la barra rinasce a ogni navigazione e da sola lo perderebbe.
 *
 * Annullare tocca solo cio' che il tester ha DICHIARATO (un passo chiuso, una
 * verifica, una nota), mai i gesti: un passo riaperto restituisce le sue
 * azioni al passo in corso, e si richiude con un'altra frase.
 */

import type { RawEvent } from "./registrazione";

export type VoceElenco =
  | { tipo: "passo"; testo: string; azioni: number }
  | { tipo: "verifica"; testo: string }
  | { tipo: "nota"; testo: string }
  | { tipo: "in-corso"; testo: ""; azioni: number };

/**
 * Una verifica o una nota appartiene al passo che il tester chiude DOPO di
 * lei, come in `group()` di record.ts: e' li' che la generazione la mette, e
 * l'elenco deve dire la stessa cosa. Quelle fatte dopo l'ultimo passo chiuso,
 * senza altre azioni, restano sotto quel passo (sempre come `group()`).
 */
export function elencoRegistrato(eventi: readonly RawEvent[]): VoceElenco[] {
  const elenco: VoceElenco[] = [];
  let azioni = 0;
  let inAttesa: VoceElenco[] = [];
  for (const e of eventi) {
    if (e.type === "action") azioni++;
    else if (e.type === "intent") {
      elenco.push({ tipo: "passo", testo: e.label?.trim() || "(senza nome)", azioni }, ...inAttesa);
      azioni = 0;
      inAttesa = [];
    } else if (e.type === "assert") inAttesa.push({ tipo: "verifica", testo: e.text || e.name || "" });
    else if (e.type === "note") inAttesa.push({ tipo: "nota", testo: e.text ?? "" });
  }
  if (azioni > 0) elenco.push({ tipo: "in-corso", testo: "", azioni });
  elenco.push(...inAttesa);
  return elenco;
}

export interface Annullato {
  tipo: "passo" | "verifica" | "nota";
  testo: string;
}

/** Toglie l'ultima cosa dichiarata e dice quale; `null` se ci sono solo gesti. */
export function annullaUltimo(eventi: RawEvent[]): Annullato | null {
  for (let i = eventi.length - 1; i >= 0; i--) {
    const e = eventi[i]!;
    if (e.type !== "intent" && e.type !== "assert" && e.type !== "note") continue;
    const voce = elencoRegistrato([e])[0] as Exclude<VoceElenco, { tipo: "in-corso" }>;
    eventi.splice(i, 1);
    return { tipo: voce.tipo, testo: voce.testo };
  }
  return null;
}
