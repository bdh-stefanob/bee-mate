/**
 * catalog-merge.ts
 * ----------------
 * Cosa sopravvive quando il catalogo si rigenera.
 *
 * L'INCIDENTE (2026-09-22)
 * Il catalogo si deriva dal codice — "nessuno lo scrive a mano" — ma non tutto
 * il catalogo **e'** codice: le voci `wanted` sono richieste, formulazioni che
 * il team vuole e che nessuno ha ancora implementato. Nel codice non esistono,
 * quindi la rigenerazione le cancellava: 100 voci diventavano 34, e il comando
 * che le cancellava e' quello che i documenti dicono di lanciare.
 *
 * Spariva in silenzio esattamente la cosa che questo progetto esiste per
 * costruire: il vocabolario condiviso.
 *
 * LA REGOLA
 * Il codice vince su cio' che descrive; il resto si conserva. Una richiesta non
 * sparisce quando qualcuno la implementa — cambia stato, perche' da quel
 * momento e' il codice a definirla.
 */

export interface VoceCatalogo {
  expression: string;
  status?: "implemented" | "wanted" | "deprecated";
}

/**
 * Unisce le voci derivate dal codice con quelle che il catalogo precedente
 * teneva e che il codice non definisce.
 */
export function conservaRichieste<T extends VoceCatalogo>(
  daCodice: readonly T[],
  precedenti: readonly T[]
): T[] {
  const implementate = new Set(daCodice.map((s) => s.expression));
  const richieste = precedenti.filter(
    (s) => s.status !== "implemented" && !implementate.has(s.expression)
  );
  return [...daCodice, ...richieste];
}
