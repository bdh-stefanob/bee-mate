/**
 * Scrive una variabile in .env conservando il resto del file.
 *
 * Perche' una funzione pura e non una scrittura diretta: cosi' si puo'
 * verificare che sostituisca invece di duplicare — un .env con la stessa chiave
 * due volte ha un comportamento che dipende da chi lo legge, e il sintomo
 * (credenziali che "a volte" non funzionano) non assomiglia alla causa.
 */
const CHIAVE_VALIDA = /^[A-Z][A-Z0-9_]{0,60}$/;

export function scriviVariabile(contenutoEnv: string, chiave: string, valore: string): string {
  if (!CHIAVE_VALIDA.test(chiave)) throw new Error(`chiave non valida: ${JSON.stringify(chiave)}`);
  if (/[\r\n]/.test(valore)) throw new Error('il valore non puo\' contenere un a capo');

  const righe = contenutoEnv.split('\n');
  const i = righe.findIndex((r) => r.startsWith(`${chiave}=`));
  if (i >= 0) {
    righe[i] = `${chiave}=${valore}`;
    return righe.join('\n');
  }
  const senzaCodaVuota = contenutoEnv.endsWith('\n') || contenutoEnv === ''
    ? contenutoEnv
    : `${contenutoEnv}\n`;
  return `${senzaCodaVuota}${chiave}=${valore}\n`;
}

/** I nomi dei bersagli, senza gli indirizzi: quelli non servono alla finestra. */
export function bersagliDaFile(json: string): string[] {
  const dati = JSON.parse(json) as Record<string, unknown>;
  return Object.keys(dati).filter((k) => !k.startsWith('_'));
}
