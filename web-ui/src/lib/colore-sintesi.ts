/**
 * Il colore del riquadro di sintesi in cima al Check-up: quello dell'esito
 * PEGGIORE fra quelli che il tester deve guardare.
 *
 * Ordine, dal peggiore: una mancanza vera (rosso) > un avviso (ambra) > cio'
 * che nasce usando l'applicazione e non e' ancora fatto (blu, non e' un guasto)
 * > tutto a posto (verde). Prima il colore dipendeva solo dal verdetto "pronto",
 * che non conta gli avvisi: "Pronto — 1 cosa da guardare" usciva verde.
 */
export type ColoreSintesi = 'rosso' | 'ambra' | 'blu' | 'verde';

export function coloreSintesi(c: { mancanti: number; daGuardare: number; perIniziare: boolean }): ColoreSintesi {
  if (c.mancanti > 0) return 'rosso';
  if (c.daGuardare > 0) return 'ambra';
  if (c.perIniziare) return 'blu';
  return 'verde';
}
