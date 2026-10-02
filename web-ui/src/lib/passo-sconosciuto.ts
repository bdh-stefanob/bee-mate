import { matchesCatalog } from './catalog-match';

/**
 * Il clic su un passo che il catalogo non conosce, nell'editor di testo
 * (`GherkinEditor`): decide se il clic va intercettato per proporre il passo.
 *
 * Una funzione pura (e non un pezzo dell'estensione di CodeMirror) perche' e' qui che
 * stava il difetto: senza un gestore delle proposte (`onProposeStep`), il clic su un
 * passo sconosciuto veniva comunque inghiottito, e il cursore non si metteva piu' su
 * quella riga. Nel cruscotto un passo nuovo non si propone da qui, quindi il gestore non
 * c'e' e il clic deve funzionare come in qualunque campo di testo.
 */

const RIGA_DI_PASSO = /^(\s+)(given|when|then|and|but)\s+(.+)/i;

export type ParolaChiavePassoProposto = 'Given' | 'When' | 'Then';

/** `And` e `But` non dicono che tipo di passo e': come fa la proposta del catalogo, valgono `When`. */
export function parolaChiaveDiProposta(grezza: string): ParolaChiavePassoProposto {
  const l = grezza.toLowerCase();
  if (l === 'given') return 'Given';
  if (l === 'then') return 'Then';
  return 'When';
}

export function passoSconosciutoDaProporre(
  riga: string,
  espressioni: readonly string[],
  haGestore: boolean
): { frase: string; parolaChiave: ParolaChiavePassoProposto } | null {
  if (!haGestore) return null;
  const m = RIGA_DI_PASSO.exec(riga);
  if (!m) return null;
  // Senza catalogo (non ancora arrivato) ogni passo sembrerebbe sconosciuto: non si giudica al buio.
  if (espressioni.length === 0) return null;
  const frase = m[3].trim();
  if (matchesCatalog(frase, [...espressioni])) return null;
  return { frase, parolaChiave: parolaChiaveDiProposta(m[2]) };
}
