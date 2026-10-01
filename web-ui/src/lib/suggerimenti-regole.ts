/**
 * suggerimenti-regole.ts
 * ----------------------
 * Il proponente a REGOLE: nessun modello, nessuna rete. Per ogni passo di uno
 * scenario appena generato prende i candidati di catalogo che il generatore ha gia'
 * calcolato (`rankCandidates`: prima chi tocca gli stessi componenti, poi chi
 * somiglia come frase, due classi mai sommate) e li trasforma in una proposta
 * nello STESSO formato che usera' un assistente. E' il braccio R del confronto
 * (spec, sezione 6): la regola che costa zero e che l'assistente dovra' battere.
 *
 * LA REGOLA
 *  - c'e' almeno un candidato agganciato ai componenti toccati dal tester (una
 *    prova di identita'): si propone il primo;
 *  - altrimenti, il primo candidato per formulazione simile (una stima; il
 *    generatore ha gia' scartato sotto la soglia di somiglianza);
 *  - altrimenti, "nessuna". Mai il candidato meno peggio, mai una frase nuova.
 *
 * Non si propone un'altra voce se la prima non si puo' applicare (gia' realizzata,
 * con parametri): la frase che dice la stessa cosa e' quella, e dirlo e' piu' onesto
 * che ripiegare su una piu' debole. La finestra la mostra come "non applicabile".
 */

import {
  motivoNonApplicabile,
  type ClasseCandidato,
  type Compito,
  type MotivoNonApplicabile,
  type Proposta,
  type RigaProposta,
  type RigaValidata,
} from './suggerimenti-contratto';

export function proponiConRegole(compito: Compito): Proposta {
  const proposte: RigaProposta[] = compito.passi.map((p) => {
    const scelto =
      p.candidati.find((c) => c.classe === 'stessi-componenti') ??
      p.candidati.find((c) => c.classe === 'formulazione-simile');
    return scelto
      ? { passo: p.n, scelta: 'voce', voce: scelto.voce }
      : { passo: p.n, scelta: 'nessuna' };
  });
  return {
    schema: 1,
    compito: compito.id,
    impronta: compito.catalogo.impronta,
    origin: 'deterministico',
    strumento: { nome: 'regole' },
    proposte,
  };
}

/** Una riga del riquadro: tutto cio' che serve a mostrarla, senza rileggere il compito. */
export interface RigaVista {
  passo: number;
  /** Altri passi con la stessa frase: si riscrivono insieme. */
  anche: number[];
  etichetta: string;
  voce: string;
  classe: ClasseCandidato;
  somiglianza?: number;
  /** Spiegazione di chi ha proposto, solo se c'e' (testo non attendibile). */
  perche?: string;
  motivoNonApplicabile: MotivoNonApplicabile | null;
}

/** Le sole righe che propongono una voce: "nessuna" non ha niente da mostrare ne' da scegliere. */
export function vistaSuggerimenti(compito: Compito, righe: readonly RigaValidata[]): RigaVista[] {
  const viste: RigaVista[] = [];
  for (const r of righe) {
    if (r.scelta !== 'voce' || r.voce === undefined) continue;
    const passo = compito.passi.find((p) => p.n === r.passo);
    const candidato = passo?.candidati.find((c) => c.voce === r.voce);
    if (!passo || !candidato) continue;
    viste.push({
      passo: passo.n,
      anche: passo.anche,
      etichetta: passo.etichetta,
      voce: candidato.voce,
      classe: candidato.classe,
      ...(candidato.somiglianza !== undefined ? { somiglianza: candidato.somiglianza } : {}),
      ...(r.perche !== undefined ? { perche: r.perche } : {}),
      motivoNonApplicabile: motivoNonApplicabile(candidato),
    });
  }
  return viste;
}
