/**
 * Il percorso con cui si indica a Esecuzione UNO scenario: costruzione e
 * validazione in un posto solo.
 *
 * Uno scenario da eseguire: un `.feature` dentro `src/features/`, con la riga
 * facoltativa. Si dice cosa e' ammesso — lettere, cifre, `._-/` — invece di
 * cosa e' vietato, e la riga e' un numero da 1 in su, uno solo. Tutto il resto
 * arriverebbe a Cucumber come un argomento che nessuno ha scelto.
 *
 * E' l'unica definizione: `esecuzione.ts` la importa e la applica al lancio
 * (`scenarioDi`), la pagina Scenari la usa per sapere se un file si puo'
 * lanciare. Sta in un file senza dipendenze dal server per questo.
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

/**
 * Dove porta "Vedi la schermata": a Esecuzione, che apre una prova GIA'
 * conclusa in sola lettura. L'id e' quello che l'indice degli esiti ricorda; il
 * server lo rivalida comunque (solo minuscole, cifre, trattino).
 */
export function indirizzoProva(esecuzione: string): string | null {
  return /^[a-z0-9-]{1,80}$/.test(esecuzione) ? `/esecuzione?prova=${encodeURIComponent(esecuzione)}` : null;
}
