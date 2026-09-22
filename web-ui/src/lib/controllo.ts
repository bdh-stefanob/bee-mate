export interface VoceDiagnosi {
  nome: string;
  esito: 'ok' | 'manca' | 'attenzione';
  dettaglio: string;
  rimedio?: string;
}

/** Separata dalla rotta perche' e' la parte che si puo' verificare da sola. */
export function interpreta(grezzo: { voci: VoceDiagnosi[] }) {
  const voci = grezzo.voci.map((v) => ({
    ...v,
    rimedio: v.rimedio ? { comando: v.rimedio } : undefined,
  }));
  return { pronto: voci.every((v) => v.esito === 'ok'), voci };
}
