/**
 * args.ts
 * -------
 * Come si leggono le opzioni da riga di comando. Una volta, per tutti gli script.
 *
 * PERCHE' ESISTE
 * Sulla macchina aziendale un'opzione scritta con i trattini dopo `npm run x --`
 * non arriva allo script: npm la prende per un'opzione sua, e lo script parte
 * senza. Nessun errore — un'esecuzione diversa da quella chiesta, con numeri che
 * sembrano buoni. E' successo quattro volte. Non si salva nemmeno la forma
 * `--x=v`: anche quella npm la trattiene (vedi `confluence-fetch.ts`).
 *
 * Un argomento senza trattini invece arriva sempre, in ogni shell. Quindi ogni
 * opzione si scrive anche in forma nuda:
 *
 *   npm run benchmark label=con-regole referto=referto.json
 *   npm run benchmark confronta
 *   npm run generate no-rules
 *
 * Le forme con i trattini restano valide per chi lancia `npx ts-node scripts/...`,
 * dove npm non c'e' in mezzo.
 *
 * UNA COPIA SOLA
 * Prima di questo file la lettura delle opzioni esisteva in tredici copie, e non
 * erano uguali: due non accettavano nemmeno `--x=v`, una spiegava che quella
 * forma npm la lascia passare, un'altra che la trattiene. `args.check.ts`
 * fallisce se uno script torna a definirne una sua.
 */

/** `--label` e `label` sono la stessa chiave. */
function chiave(flag: string): string {
  return flag.replace(/^-+/, "");
}

/** Forma nuda `chiave=valore`: la chiave comincia con una lettera. */
const NUDA = /^[a-z][a-z0-9-]*=/i;

/**
 * Il valore di un'opzione, in una delle tre forme:
 * `--label x`, `--label=x`, `label=x`.
 */
export function argValue(args: readonly string[], flag: string): string | undefined {
  const k = chiave(flag);
  for (const a of args) {
    if (a.startsWith(`--${k}=`)) return a.slice(k.length + 3);
    if (a.startsWith(`${k}=`)) return a.slice(k.length + 1);
  }
  const i = args.indexOf(`--${k}`);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

/** Un interruttore: `--confronta` oppure la parola nuda `confronta`. */
export function hasFlag(args: readonly string[], flag: string): boolean {
  const k = chiave(flag);
  return args.includes(`--${k}`) || args.includes(k);
}

/**
 * Gli argomenti che non sono opzioni: il bersaglio, un indirizzo, un file.
 *
 * `interruttori` sono le parole nude che lo script legge come interruttori:
 * senza, `npm run targets env` prenderebbe "env" per il nome di un bersaglio.
 * Un indirizzo con `?a=b` resta posizionale — comincia con `https:`, non con
 * una chiave — e cosi' un percorso Windows.
 */
export function positionals(args: readonly string[], interruttori: readonly string[] = []): string[] {
  const parole = new Set(interruttori.map(chiave));
  return args.filter((a) => !a.startsWith("-") && !NUDA.test(a) && !parole.has(a));
}
