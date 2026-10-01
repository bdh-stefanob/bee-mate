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

/**
 * Il percorso con cui si indica a Esecuzione UNO scenario: costruzione e
 * validazione in un posto solo.
 *
 * Uno scenario da eseguire: un `.feature` dentro `src/features/`, con la riga
 * facoltativa. Si dice cosa e' ammesso — lettere, cifre, `._-/` — invece di
 * cosa e' vietato, e la riga e' un numero da 1 in su, uno solo. Tutto il resto
 * arriverebbe a Cucumber come un argomento che nessuno ha scelto.
 *
 * E' la stessa regola che `esecuzione.ts` applica al lancio (`scenarioDi`):
 * vive qui perche' la pagina Scenari la deve conoscere per sapere se un file si
 * puo' lanciare, e `esecuzione.ts` e' un modulo del server.
 */
export const SCENARIO_VALIDO = /^src\/features\/[A-Za-z0-9._\/-]{1,200}\.feature(:[1-9][0-9]{0,5})?$/;

/** `src/features/<file>:<riga>`, o `null` se il server lo rifiuterebbe. */
export function percorsoDiEsecuzione(file: string, riga: number): string | null {
  if (!Number.isInteger(riga) || riga < 1) return null;
  const percorso = `src/features/${file}:${riga}`;
  if (percorso.includes('..') || percorso.includes('//')) return null;
  return SCENARIO_VALIDO.test(percorso) ? percorso : null;
}

/**
 * Dove porta "Esegui": a Esecuzione con lo scenario gia' scelto, senza avviare
 * niente (Esecuzione ha gli interruttori e l'ambiente: avviare da un'altra
 * pagina vorrebbe dire decidere per il tester).
 */
export function indirizzoEsecuzione(file: string, riga: number): string | null {
  const percorso = percorsoDiEsecuzione(file, riga);
  return percorso ? `/esecuzione?scenario=${encodeURIComponent(percorso)}` : null;
}
