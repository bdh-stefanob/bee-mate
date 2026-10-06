/**
 * Le regole pure delle corsie (un test che gira su un ambiente): quante se ne
 * possono avere insieme, quando due corsie condividono l'account, come si
 * riagganciano dopo essere tornati sulla schermata.
 *
 * Non importa niente di server: questo file lo usano sia il registro (che
 * applica il tetto) sia la schermata (che lo mostra e non fa partire una riga
 * di troppo). Un solo numero, in un solo posto.
 */

/**
 * Quanti test possono girare insieme. Due per la demo (Q3 della spec); tre
 * solo dopo una misura di memoria e processore (fetta S5).
 */
export const MASSIMO_TEST_CONTEMPORANEI = 2;

/** Quante righe di corsia la schermata lascia preparare insieme. */
export const MASSIMO_RIGHE = MASSIMO_TEST_CONTEMPORANEI;

/** Si puo' aggiungere una riga di corsia solo se non si e' gia' al massimo. */
export function puoAggiungereRiga(righeAttuali: number): boolean {
  return righeAttuali < MASSIMO_RIGHE;
}

/**
 * Si puo' lanciare, se gia' ci sono `inCorso` test e se ne vogliono avviare
 * `nuove`, solo finche' il totale non supera il tetto. Il server applica la
 * stessa regola a ogni richiesta: questa funzione serve a spegnere il bottone
 * prima, non a decidere da sola.
 */
export function puoLanciare(inCorso: number, nuove: number): boolean {
  return inCorso + nuove <= MASSIMO_TEST_CONTEMPORANEI;
}

/**
 * Due corsie (o piu') sullo stesso ambiente condividono lo stesso account: va
 * detto (Q4 = b). Un ambiente vuoto non conta, perche' vuol dire "non ancora
 * scelto".
 */
export function avvisoStessoAmbiente(ambienti: string[]): boolean {
  const visti = new Set<string>();
  for (const a of ambienti) {
    if (a === '') continue;
    if (visti.has(a)) return true;
    visti.add(a);
  }
  return false;
}

/** Quel che il server dice di un'operazione in corso (solo id, nome e avvio). */
export interface OperazioneRiaggancio {
  id: string;
  nome: string;
  avvio: string;
}

/** Una corsia da riagganciare: il suo id e quando e' partita, se si sa. */
export interface CorsiaDaRiagganciare {
  id: string;
  avviatoAlle: number | null;
}

/**
 * Alla riapertura della schermata: tutte le corsie di test che il server dice
 * ancora in corso. Le altre operazioni (registrazione, sessione...) non sono
 * corsie: la schermata le segnala a parte.
 */
export function righeDaRiagganciare(operazioni: OperazioneRiaggancio[]): CorsiaDaRiagganciare[] {
  return operazioni
    .filter((o) => o.nome === 'test')
    .map((o) => {
      const millis = Date.parse(o.avvio);
      return { id: o.id, avviatoAlle: Number.isNaN(millis) ? null : millis };
    });
}
