import { NextResponse } from 'next/server';
import { FEATURES_DIR } from '@/lib/repo';
import { riepilogaScenari } from '@/lib/scenari';
import { assicuraIndice, leggiEsiti, percorsoIndice, unisciEsiti } from '@/lib/esiti-scenari';
import type { RispostaScenari } from '@/lib/esiti-tipi';

/**
 * GET /api/scenari
 *
 * Gli scenari che le schermate Scenari ed Esecuzione possono offrire: file sotto
 * `src/features/`, ciascuno con i suoi scenari eseguibili e la loro riga, piu'
 * come e' andata l'ultima volta su ogni ambiente (`esiti`, dall'indice in
 * `reports/esiti-scenari.json`) e quanti casi sono solo descritti.
 *
 * Di sola lettura per il tester. L'unica scrittura e' la ricostruzione
 * dell'indice dalle esecuzioni gia' fatte, una volta sola, la prima volta che
 * l'indice non c'e'. Non porta schermate, messaggi grezzi o percorsi assoluti.
 */
export async function GET() {
  const { file, soloDescritti } = riepilogaScenari(FEATURES_DIR);
  assicuraIndice(percorsoIndice(), undefined, FEATURES_DIR);
  const lettura = leggiEsiti(percorsoIndice());
  const corpo: RispostaScenari = {
    file: unisciEsiti(file, lettura.voci),
    soloDescritti,
    esiti: lettura.stato,
  };
  return NextResponse.json(corpo);
}
