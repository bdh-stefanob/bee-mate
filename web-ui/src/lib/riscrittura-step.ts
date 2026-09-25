/**
 * riscrittura-step.ts
 * --------------------
 * La riscrittura di una frase di step, ovunque compaia. Due funzioni pure,
 * stesso stile di `scriviVariabile`/`scriviBersaglio` in `configurazione.ts`:
 * prendono un testo e ne restituiscono uno nuovo, senza toccare il disco. Chi
 * chiama (la rotta) decide se e quando scrivere — e qui sta la regola che
 * conta di piu': SI SCRIVE SOLO SE OGNI FILE COINVOLTO SI E' LASCIATO
 * RISCRIVERE. Uno scenario che cita uno step che non esiste piu' e' peggio del
 * doppione che si voleva togliere, quindi la rotta calcola tutte le riscritture
 * prima di scriverne anche una sola.
 *
 * LIMITE DICHIARATO: solo frasi senza parametri
 * Un'espressione con `{string}`/`{int}` non ha una forma unica nel file
 * `.feature` (il parametro e' gia' sostituito col valore vero), quindi non la
 * si puo' cercare per uguaglianza testuale ne' riscrivere senza reinserire
 * quel valore in una posizione che va dedotta. Farlo qui, alla cieca, sarebbe
 * il tipo di guasto silenzioso che questo file esiste per evitare. Le due
 * funzioni si rifiutano esplicitamente (vedi `SoloEspressioneSenzaParametri`)
 * invece di produrre una riscrittura scorretta ma plausibile.
 */

const SEGNAPOSTO = /\{[a-zA-Z]+\}/;

/** Vero se l'espressione contiene un segnaposto Cucumber (`{string}`, `{int}`, ...). */
export function haParametri(espressione: string): boolean {
  return SEGNAPOSTO.test(espressione);
}

function escapeRegExp(testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class RiscritturaNonSupportata extends Error {}

function assicuraSenzaParametri(espressione: string, ruolo: 'da' | 'a'): void {
  if (haParametri(espressione)) {
    throw new RiscritturaNonSupportata(
      `la frase "${ruolo}" ha un parametro ({string}/{int}/...): questa riscrittura non e' supportata`
    );
  }
}

/**
 * Riscrive, in un file `.feature`, ogni riga Given/When/Then/And/But la cui
 * frase e' esattamente `da`, in `a`. Preserva indentazione, parola chiave e
 * fine riga. Ritorna il testo (invariato se non c'era nulla da cambiare) e
 * quante righe sono state toccate.
 */
export function riscriviScenario(
  testo: string,
  da: string,
  a: string
): { testo: string; sostituzioni: number } {
  assicuraSenzaParametri(da, 'da');
  assicuraSenzaParametri(a, 'a');

  const eol = testo.includes('\r\n') ? '\r\n' : '\n';
  const righe = testo.split(/\r\n|\n/);
  const pattern = new RegExp(`^(\\s*)(Given|When|Then|And|But)(\\s+)${escapeRegExp(da)}(\\s*)$`);

  let sostituzioni = 0;
  const risultato = righe.map((riga) => {
    const m = riga.match(pattern);
    if (!m) return riga;
    sostituzioni++;
    const [, indentazione, parolaChiave, spazio, spazioFinale] = m;
    return `${indentazione}${parolaChiave}${spazio}${a}${spazioFinale}`;
  });

  return { testo: risultato.join(eol), sostituzioni };
}

/**
 * Riscrive, nella definizione dello step (`.steps.ts`), la chiamata
 * `Given/When/Then("da", ...)` in `Given/When/Then("a", ...)`, e la riga di
 * documentazione `@intent da` in `@intent a` quando c'e'. La definizione vive
 * in un solo punto per frase, quindi si aspetta al massimo una chiamata: piu'
 * di una e' un segnale che il file non e' quello che si pensava, e si
 * restituisce il conteggio cosi' chi chiama puo' rifiutare la riscrittura
 * invece di scegliere a caso quale tenere.
 */
export function riscriviDefinizione(
  testo: string,
  da: string,
  a: string
): { testo: string; sostituzioni: number } {
  assicuraSenzaParametri(da, 'da');
  assicuraSenzaParametri(a, 'a');

  const daEscaped = escapeRegExp(da);
  const chiamata = new RegExp(`(Given|When|Then)(\\(\\s*)(['"])${daEscaped}\\3`, 'g');

  let sostituzioni = 0;
  let risultato = testo.replace(chiamata, (_match, parolaChiave, apertura, virgoletta) => {
    sostituzioni++;
    return `${parolaChiave}${apertura}${virgoletta}${a}${virgoletta}`;
  });

  // Il commento @intent e' documentazione, non e' cio' che decide se la
  // riscrittura e' riuscita: si aggiorna se c'e', non si conta come mancata
  // riscrittura se non c'e' (uno step senza quel commento resta valido).
  const intentPattern = new RegExp(`(@intent\\s+)${daEscaped}(\\s*$)`, 'm');
  risultato = risultato.replace(intentPattern, `$1${a}$2`);

  return { testo: risultato, sostituzioni };
}
