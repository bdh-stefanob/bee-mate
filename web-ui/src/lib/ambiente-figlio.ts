/**
 * L'ambiente con cui si avvia un processo figlio.
 *
 * `ELECTRON_RUN_AS_NODE` serve per una ragione che si vede solo nel prodotto
 * impacchettato e mai in sviluppo. La riga di comando chiama
 * `process.execPath`, cioe' "l'eseguibile che mi sta facendo girare": sotto
 * `npm run dev` e' Node, e tutto funziona. Ma nell'eseguibile il server non
 * gira in Node, gira dentro Electron — e li' `process.execPath` e'
 * l'applicazione stessa. Senza questa variabile, ogni comando aprirebbe una
 * seconda copia dell'app invece di eseguire uno script: nessuna uscita,
 * nessuna fine, la finestra che aspetta per sempre.
 *
 * Con la variabile, quello stesso eseguibile si comporta da Node. Sotto Node
 * puro non cambia niente, quindi si passa sempre.
 */
export function ambienteFiglio(): NodeJS.ProcessEnv {
  return { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
}
