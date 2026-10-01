/**
 * Come si scrive "quando" e "quanto ci ha messo": puro, senza React, cosi' si
 * prova con vitest.
 */

export type Traduttore = (chiave: string, valori?: Record<string, number | string>) => string;

function stessoGiorno(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * "oggi alle 16:36", "ieri alle 16:36", o "27 settembre alle 16:36".
 *
 * "Oggi" e "ieri" si decidono sul GIORNO DI CALENDARIO di chi guarda, non sulle
 * 24 ore: una prova di venti minuti fa a cavallo della mezzanotte e' di ieri.
 * Le chiavi sono quelle del namespace `Scenari` (`quandoOggi`, `quandoIeri`,
 * `quandoData`). Una data che non si legge da' una stringa vuota: meglio niente
 * di "Invalid Date" su uno schermo.
 */
export function formattaQuando(iso: string, locale: string, t: Traduttore, adesso: Date = new Date()): string {
  const quando = new Date(iso);
  if (Number.isNaN(quando.getTime())) return '';
  const ora = quando.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  if (stessoGiorno(quando, adesso)) return t('quandoOggi', { ora });
  const ieri = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() - 1);
  if (stessoGiorno(quando, ieri)) return t('quandoIeri', { ora });
  const data = quando.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    ...(quando.getFullYear() !== adesso.getFullYear() ? { year: 'numeric' as const } : {}),
  });
  return t('quandoData', { data, ora });
}

/**
 * Sotto il minuto un numero di secondi con un decimale basta e si legge a
 * colpo d'occhio; sopra il minuto, minuti e secondi separati sono piu'
 * leggibili di "127.3 s". Il separatore decimale segue la lingua scelta
 * (virgola in italiano, punto in inglese).
 *
 * Le chiavi (`durataSecondi`, `durataMinutiSecondi`) sono quelle del namespace
 * `Esecuzione`, lo stesso testo che la schermata Esecuzione usa per la stessa
 * cosa.
 */
export function formattaDurata(ms: number, locale: string, t: Traduttore): string {
  const secondiTotali = ms / 1000;
  if (secondiTotali < 60) {
    const s = secondiTotali.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return t('durataSecondi', { s });
  }
  const minuti = Math.floor(secondiTotali / 60);
  const secondi = Math.floor(secondiTotali % 60);
  return t('durataMinutiSecondi', { m: minuti, s: String(secondi).padStart(2, '0') });
}
