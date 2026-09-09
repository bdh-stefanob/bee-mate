/**
 * lib/labelling.ts
 * ----------------
 * Proporre i confini fra un intento e l'altro, per farli **nominare dopo**.
 *
 * IL PROBLEMA, VISTO SUL CAMPO
 * Il metodo si regge su due cose che dai gesti non si deducono: dove finisce un
 * passo e cosa dimostra che e' andato bene. Finora si chiedevano al tester
 * mentre eseguiva, premendo un pulsante nella barra.
 *
 * Non ha funzionato, e non per distrazione: chi esegue un test **sta eseguendo
 * un test**. Sta guardando l'applicazione, non la barra. Alla prima sessione
 * vera sono usciti 38 gesti e zero confini — e sarebbe successo a chiunque.
 *
 * LA CORREZIONE: separare i due momenti
 * Durante l'esecuzione si esegue e basta. Alla fine, con la sessione davanti
 * tutta insieme, si nominano i passi. E' anche il momento in cui si nomina
 * meglio: si e' appena visto dove il flusso cambiava davvero, invece di doverlo
 * indovinare a meta' strada.
 *
 * Il giudizio resta umano — cambia solo quando lo si esprime. Il cambio di
 * pagina e' una PROPOSTA, non una decisione: e' il confine giusto quasi sempre,
 * ma un modulo lungo su una pagina sola sono tre intenti, e due pagine che si
 * attraversano di corsa sono un intento solo. Chi ha eseguito il test lo sa.
 *
 * COSA RESTA NELLA BARRA
 * Le **verifiche**. Quelle vogliono che si punti un elemento mentre e' sullo
 * schermo, e a posteriori non si ricostruiscono: se non hai detto tu cosa ti ha
 * convinto che fosse andata bene, non c'e' modo di saperlo dopo.
 */

import { pageIdentity } from "./generate-core";
import type { Assertion, Step } from "./generation-contract";

export interface Gruppo {
  /** I gesti, nell'ordine. */
  steps: Step[];
  assertions: Assertion[];
  /** La pagina su cui il gruppo comincia. */
  pageUrl?: string;
  /** La pagina su cui finisce, se diversa. */
  endUrl?: string;
}

/**
 * Spezza una sequenza di gesti sui cambi di pagina.
 *
 * Il confine e' il cambio di **identita'** della pagina, non dell'URL: dentro a
 * un questionario `/questions/1` e `/questions/2` sono lo stesso passo del
 * viaggio, e spezzare a ogni domanda produrrebbe venti intenti da un modulo solo.
 * E' lo stesso criterio con cui il generatore decide le Page Object, quindi le
 * due letture non possono divergere.
 */
export function proponiGruppi(steps: readonly Step[], assertions: readonly Assertion[]): Gruppo[] {
  if (steps.length === 0 && assertions.length === 0) return [];

  const chiave = (url?: string): string => (url ? pageIdentity(url).key : "");

  const gruppi: Gruppo[] = [];
  let corrente: Gruppo | null = null;
  let chiaveCorrente = "";

  for (const s of steps) {
    const k = chiave(s.url);
    if (!corrente || (k && k !== chiaveCorrente)) {
      corrente = { steps: [], assertions: [], ...(s.url ? { pageUrl: s.url } : {}) };
      gruppi.push(corrente);
      chiaveCorrente = k;
    }
    corrente.steps.push(s);
    if (s.url && s.url !== corrente.pageUrl) corrente.endUrl = s.url;
  }

  // Le verifiche vanno al gruppo della loro pagina; se non se ne trova uno —
  // succede quando si verifica su una pagina dove non si e' toccato niente —
  // finiscono nell'ultimo, che e' il gruppo che le ha prodotte.
  for (const a of assertions) {
    const k = chiave(a.url);
    const suo = [...gruppi].reverse().find((g) => chiave(g.endUrl ?? g.pageUrl) === k);
    (suo ?? gruppi[gruppi.length - 1])?.assertions.push(a);
  }

  return gruppi;
}

/**
 * Una riga per gesto, leggibile da chi ha appena eseguito il test.
 *
 * I valori si mostrano: siamo sulla macchina di chi ha registrato, e senza il
 * valore digitato "compilato Email" non aiuta a ricordare quale passo fosse.
 * Le password no, e non perche' si nascondano qui: non sono mai state registrate.
 */
export function descriviGesto(s: Step): string {
  const azione = s.action === "fill" ? "compilato" : s.action === "set" ? "scelto" : "premuto";
  const valore = s.secret
    ? " (password)"
    : s.value
      ? ` con "${s.value.length > 30 ? `${s.value.slice(0, 30)}…` : s.value}"`
      : "";
  return `${azione} ${s.role} "${s.name}"${valore}`;
}

/** Il percorso della pagina, senza dominio: in un elenco l'origine e' rumore. */
export function descriviPagina(url?: string): string {
  if (!url) return "(pagina non registrata)";
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}

/**
 * Un'etichetta plausibile, da cui partire invece che dal foglio bianco.
 *
 * Non e' un tentativo di indovinare l'intento — quello e' il lavoro della
 * persona. E' che un campo precompilato con qualcosa di ragionevole si corregge,
 * mentre un campo vuoto si salta: e un intento saltato costa uno scenario in
 * meno, non un'etichetta in meno.
 */
export function etichettaProposta(g: Gruppo): string {
  const pagina = descriviPagina(g.endUrl ?? g.pageUrl)
    .split("/")
    .filter((p) => p && !/^\d+$/.test(p))
    .pop();

  const haCampi = g.steps.some((s) => s.action === "fill" || s.action === "set");
  const verbo = haCampi ? "the user completes" : "the user goes through";
  return pagina ? `${verbo} ${pagina.replace(/[-_]/g, " ")}` : "";
}
