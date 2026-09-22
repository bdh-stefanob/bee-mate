export interface VoceDiagnosi {
  nome: string;
  esito: 'ok' | 'manca' | 'attenzione';
  dettaglio: string;
  /** Il rimedio scritto per una persona: c'e' sempre, se un rimedio esiste. */
  rimedio?: string;
  /** Lo stesso rimedio come nome chiuso, quando la finestra puo' avviarlo da sola. */
  rimedioChiuso?: string;
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
  return { pronto: voci.every((v) => v.esito === 'ok'), voci };
}
