/**
 * Il tema del cruscotto: tre valori, scelti dal tester nella barra laterale.
 * La scelta la salva `next-themes` (localStorage); qui sta solo la logica pura.
 */
export type Tema = 'light' | 'dark' | 'system';

/** Nell'ordine in cui compaiono i bottoni. */
export const TEMI: readonly Tema[] = ['light', 'dark', 'system'];

/** Valore di partenza: come `defaultTheme` di `Providers`. */
export const TEMA_DI_FABBRICA: Tema = 'system';

/** Qualunque cosa arrivi da fuori diventa uno dei tre valori. */
export function normalizzaTema(valore: string | null | undefined): Tema {
  return (TEMI as readonly string[]).includes(valore ?? '') ? (valore as Tema) : TEMA_DI_FABBRICA;
}

/**
 * Il bottone da segnare come attivo. Prima del montaggio il tema scelto non e'
 * noto (lo conosce solo il client): nessun bottone attivo, altrimenti server e
 * client disegnerebbero cose diverse (errore di idratazione).
 */
export function temaAttivo(montato: boolean, scelto: string | null | undefined, bottone: Tema): boolean {
  if (!montato) return false;
  return normalizzaTema(scelto) === bottone;
}
