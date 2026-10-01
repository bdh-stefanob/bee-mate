/**
 * Da un percorso `app/flusso/nome.feature` (relativo a `src/features/`) a
 * "applicazione / flusso": e' cio' che si mostra al tester al posto del
 * percorso di file. Puro; condiviso con la pagina Scenari.
 */
export function percorsoScenario(file: string): { app: string; flusso: string } {
  const parti = file.split(/[\\/]/).filter((p) => p.length > 0);
  // L'ultima parte e' il nome del file: app e flusso sono le cartelle sopra.
  const cartelle = parti.slice(0, -1);
  return { app: cartelle[0] ?? '—', flusso: cartelle[1] ?? '—' };
}
