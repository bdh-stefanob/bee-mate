export interface VoceDiagnosi {
  nome: string;
  esito: 'ok' | 'manca' | 'attenzione';
  dettaglio: string;
  /** Il rimedio scritto per una persona: c'e' sempre, se un rimedio esiste. */
  rimedio?: string;
  /** Lo stesso rimedio come nome chiuso, quando la finestra puo' avviarlo da sola. */
  rimedioChiuso?: string;
  /**
   * Riguarda chi ha costruito la catena (l'IDE con cui si scrivono script e
   * regole), non chi la usa per registrare ed eseguire un test a mano. Una
   * voce cosi' non deve mai decidere se la macchina e' "pronta" per un
   * tester: sennò la schermata direbbe per sempre "manca qualcosa" a chi non
   * ha né vuole un assistente da riga di comando sul PATH.
   */
  avanzata?: boolean;
}

/** Separata dalla rotta perche' e' la parte che si puo' verificare da sola. */
export function interpreta(grezzo: { voci: VoceDiagnosi[] }) {
  const voci = grezzo.voci.map((v) => ({
    ...v,
    // I due campi restano distinti fino alla riga che li mostra: un rimedio che
    // la macchina non sa avviare deve comunque arrivare all'occhio del tester,
    // come testo da copiare. Fonderli faceva sparire la seconda meta'.
    rimedio: v.rimedio ? { comando: v.rimedio, chiuso: v.rimedioChiuso } : undefined,
  }));
  // "Pronto" guarda solo cio' che impedisce davvero di lavorare: le voci
  // avanzate restano visibili in una sezione a parte, e un avviso resta un
  // avviso. Contare anche gli avvisi rendeva la riga falsa e per giunta
  // circolare: "Registrazioni" non puo' essere a posto finche' il tester non
  // ha registrato, cioe' finche' non ha fatto la cosa che quella schermata
  // dovrebbe invitarlo a fare.
  const essenziali = voci.filter((v) => !v.avanzata);
  return { pronto: essenziali.every((v) => v.esito !== 'manca'), voci };
}
