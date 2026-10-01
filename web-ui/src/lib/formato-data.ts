/**
 * Una data ISO nella lingua della finestra. `toLocaleString()` nudo usa la
 * lingua del sistema e in una finestra italiana usciva "9/25/2026, 12:19:15 PM".
 * Stringa assente o non valida: null (la pagina mostra "?").
 * `fusoOrario` serve ai test, per non dipendere dalla macchina.
 */
export function formatoData(iso: string | null | undefined, lingua: string, fusoOrario?: string): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(lingua, { dateStyle: 'medium', timeStyle: 'short', timeZone: fusoOrario }).format(data);
  } catch {
    return null;
  }
}
