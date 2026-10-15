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
  /** Dove e' definita (o dove lo sara'): "percorso:riga". */
  sourceRef?: string;
}

/** Il file di un `sourceRef`, con le barre normalizzate. */
const fileDi = (rif: string | undefined): string => (rif ?? "").replace(/:\d+$/, "").replace(/\\/g, "/");

/**
 * Unisce le voci derivate dal codice con quelle che il catalogo precedente
 * teneva e che il codice non definisce.
 *
 * UNO STEP NATO DAL CODICE NON E' UNA RICHIESTA (revisione del 15/10). Si
 * conserva cio' che il team ha chiesto, non cio' che il codice ha smesso di
 * definire: una voce che punta a un file letto in questa rigenerazione e non
 * definita li' e' una frase cambiata o tolta; una voce del limbo dei generati
 * (`*\/generated/`) e' uno scenario mai salvato. Il catalogo versionato teneva
 * 18 voci cosi', e chi le riusava otteneva uno step non definito.
 */
export function conservaRichieste<T extends VoceCatalogo>(
  daCodice: readonly T[],
  precedenti: readonly T[]
): T[] {
  const implementate = new Set(daCodice.map((s) => s.expression));
  const fileLetti = new Set(daCodice.map((s) => fileDi(s.sourceRef)).filter(Boolean));
  const richieste = precedenti.filter((s) => {
    if (s.status === "implemented" || implementate.has(s.expression)) return false;
    const file = fileDi(s.sourceRef);
    if (/(^|\/)generated\//.test(file)) return false;
    return !fileLetti.has(file);
  });
  return [...daCodice, ...richieste];
}
