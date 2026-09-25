/**
 * diagnosi-fallimento.ts
 * ----------------------
 * Una registrazione (o una generazione) che fallisce manda al cruscotto solo
 * "conclusa / fallita / interrotta" (vedi l'evento `fine` in
 * `api/esegui/[id]/flusso`): il perche' sta nelle righe di output che lo
 * stesso flusso ha gia' streammato (finding F2 — prima si buttavano via, e la
 * finestra diceva solo "non e' andata · riprova").
 *
 * Due cause si riconoscono con sicurezza, dal testo vero che gli script
 * scrivono quando falliscono (verificato lanciando `record.ts` davvero, non
 * supposto):
 *
 * - nessun browser disponibile: `scripts/lib/browser.ts` scrive
 *   "Nessun browser disponibile." quando ha provato tutti i canali;
 * - indirizzo irraggiungibile: Playwright fallisce la navigazione con
 *   "net::ERR_..." (DNS, connessione rifiutata, ...).
 *
 * Ogni altra causa resta sconosciuta: si mostra il messaggio generico e le
 * ultime righe, non si inventa una diagnosi che non c'e'.
 */
export type CausaFallimento = 'browser-mancante' | 'indirizzo-irraggiungibile';

const FIRME: ReadonlyArray<{ causa: CausaFallimento; corrisponde: RegExp }> = [
  { causa: 'browser-mancante', corrisponde: /Nessun browser disponibile/ },
  { causa: 'indirizzo-irraggiungibile', corrisponde: /net::ERR_|ENOTFOUND|ECONNREFUSED/ },
];

export function rilevaCausaFallimento(righe: readonly string[]): CausaFallimento | null {
  const testo = righe.join('\n');
  for (const { causa, corrisponde } of FIRME) {
    if (corrisponde.test(testo)) return causa;
  }
  return null;
}
