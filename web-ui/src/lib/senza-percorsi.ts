/**
 * senza-percorsi.ts
 * -----------------
 * Il testo di uno scenario, com'e' mostrato al tester, senza i percorsi di file.
 *
 * Il generatore scrive in testa al `.feature` dei commenti che dicono da quale
 * registrazione viene e dove sta il file (`reports\recordings\...json`,
 * `src/features/...`). Sono utili a chi apre il file a mano, ma il tester non
 * conosce i percorsi del progetto: vederli nel pannello lo confonde.
 *
 * Si tocca SOLO la riga dei commenti e MAI il numero di righe: i numeri di
 * riga di `Scenario:` e dei passi restano quelli del file (servono per
 * evidenziare e per aprire la modifica).
 */

/** Un percorso che comincia da una delle due cartelle del progetto, in una delle due scritture. */
// Un percorso assoluto di Windows (puo' contenere spazi: arriva fino alla virgola o
// alla parentesi), uno assoluto di Unix, o uno relativo che parte da `src`/`reports`.
const PERCORSO = /[A-Za-z]:[\\/][^,;)\r\n]*|(?<![\w.])\/(?:[\w.-]+\/)+[^\s,;)]*|\b(?:src|reports)[\\/][^\s,;)]*/g;

export function senzaPercorsi(testo: string): string {
  return testo
    .split('\n')
    .map((riga) => {
      if (!riga.trimStart().startsWith('#')) return riga;
      if (!PERCORSO.test(riga)) return riga;
      PERCORSO.lastIndex = 0;
      return riga
        .replace(PERCORSO, '')
        .replace(/\(\s*,\s*/g, '(')
        .replace(/[ \t]+(\r?)$/, '$1')
        .replace(/^(\s*#)[ \t]+(\r?)$/, '$1$2');
    })
    .join('\n');
}
