/**
 * Lo stato iniziale della pagina Registra (audit UI del 4/10, fase 6, con F14).
 *
 * Si mostra quando nessuna registrazione e' in corso. Quale dei due:
 * - "pronto": c'e' un ambiente scelto; la pagina spiega i tre passi (accedi,
 *   registra, salva) e porta al pulsante che avvia la registrazione;
 * - "senza-ambiente": non c'e' niente su cui registrare; la pagina dice perche'
 *   e porta al Check-up, dove l'ambiente si aggiunge (F14).
 *
 * La scelta sta qui, in una funzione pura, e non nel componente.
 */
export type StatoInizialeRegistra = { tipo: 'pronto'; ambiente: string } | { tipo: 'senza-ambiente' };

/** I tre passi, nell'ordine in cui il tester li vive. Le chiavi: `Registra.passo_<id>_titolo` e `_testo`. */
export const PASSI_REGISTRA = ['accedi', 'registra', 'salva'] as const;

export function statoInizialeRegistra(ambiente: string): StatoInizialeRegistra {
  const nome = ambiente.trim();
  return nome ? { tipo: 'pronto', ambiente: nome } : { tipo: 'senza-ambiente' };
}
