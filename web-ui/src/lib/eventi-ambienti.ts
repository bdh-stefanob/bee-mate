/**
 * eventi-ambienti.ts
 * ------------------
 * F3: dopo aggiungere o eliminare un ambiente nella schermata Check-up, la
 * barra laterale restava sul suo elenco vecchio finche' non si ricaricava la
 * finestra — perche' `SelettoreAmbiente` legge `/api/configurazione` una
 * volta sola, all'apertura, e `SezioneAmbienti` (un sottoalbero React
 * diverso, senza un antenato comune sotto cui mettere uno stato condiviso)
 * non aveva modo di dirglielo.
 *
 * Un pub/sub minimo, in memoria: chi cambia la lista chiama
 * `notificaAmbientiCambiati()`, chi la mostra si iscrive con
 * `suAmbientiCambiati()` e la ricarica. Deliberatamente non un `CustomEvent`
 * su `window` — qui basta un modulo (un'unica istanza per finestra, come ogni
 * modulo lato client) e resta verificabile senza un DOM finto.
 */

type Ascoltatore = () => void;

const ascoltatori = new Set<Ascoltatore>();

/** Chiamata da chi scrive l'elenco (aggiungi, elimina, modifica indirizzo, registra accesso). */
export function notificaAmbientiCambiati(): void {
  for (const f of ascoltatori) f();
}

/** Chiamata da chi mostra l'elenco. Restituisce la funzione per disiscriversi. */
export function suAmbientiCambiati(f: Ascoltatore): () => void {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}
