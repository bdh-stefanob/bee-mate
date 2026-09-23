/**
 * i18n.ts
 * -------
 * Il dizionario di uno script e la sua risoluzione: una chiave piu' i dati
 * diventa una frase, nella lingua scelta da BDD_LANG.
 *
 * PERCHE' ESISTE
 * `diagnosi.ts` non manda piu' frasi italiane gia' scritte: manda chiavi
 * (`diagnosi.browser.scaricato`) e dati (`{ pronti: 2, totale: 3 }`), perche'
 * la stessa uscita serve anche la finestra, che parla la lingua di chi guarda
 * lo schermo. L'uscita per le persone (`diagnosi.ts` senza `json`) deve pero'
 * restare leggibile da un terminale: questo modulo tiene i dizionari — uno
 * per script, italiano e inglese fianco a fianco — e sostituisce i
 * segnaposto `{nome}` con i dati.
 *
 * L'inglese e' il ripiego quando BDD_LANG non e' impostata: la finestra apre
 * in inglese, e i due mondi devono ripiegare sulla stessa lingua di default.
 *
 * UNA COPIA SOLA
 * Pensato per essere riusato da altri script (generazione, test,
 * registrazione), non solo da `diagnosi.ts`: ognuno porta il proprio
 * dizionario nella stessa forma (`DizionarioScript`), e li risolve tutti con
 * le stesse due funzioni qui sotto. Per ora solo `diagnosi.ts` la usa
 * davvero: gli altri script restano in italiano finche' non arriva il loro
 * giro.
 *
 * Uso:  npm run check:i18n   (il giudice, vedi i18n.check.ts)
 */

export type Lingua = "it" | "en";

export type Dizionario = Record<string, string>;

export interface DizionarioScript {
  it: Dizionario;
  en: Dizionario;
}

/** La lingua scelta da BDD_LANG. L'inglese e' il ripiego, mai l'italiano. */
export function linguaCorrente(env: NodeJS.ProcessEnv = process.env): Lingua {
  return (env.BDD_LANG ?? "").trim().toLowerCase() === "it" ? "it" : "en";
}

/**
 * Risolve una chiave nella lingua data, sostituendo i segnaposto `{nome}` con
 * i valori di `dati`. Se la lingua richiesta non ha la chiave, ripiega
 * sull'inglese; se manca anche li', torna la chiave stessa — visibile e
 * cercabile in un log, mai un testo vuoto in silenzio.
 */
export function traduci(
  dizionario: DizionarioScript,
  lingua: Lingua,
  chiave: string,
  dati?: Record<string, string | number>
): string {
  const modello = dizionario[lingua][chiave] ?? dizionario.en[chiave] ?? chiave;
  if (!dati) return modello;
  return modello.replace(/\{(\w+)\}/g, (segnaposto, nome: string) =>
    nome in dati ? String(dati[nome]) : segnaposto
  );
}
