import { NextResponse } from 'next/server';
import { FEATURES_DIR } from '@/lib/repo';
import { riepilogaScenari } from '@/lib/scenari';
import { precaricaFeatures } from '@/lib/cache-file';
import { assicuraIndiceAsync, leggiEsiti, percorsoIndice, unisciEsiti } from '@/lib/esiti-scenari';
import type { RispostaScenari } from '@/lib/esiti-tipi';
import { leggiPrimiVerdi, percorsoPrimiVerdi } from '@/lib/cronometro';
import { messaggiInCorso } from '@/lib/registro';

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
  // A freddo i .feature si leggono prima, in modo asincrono: il conto che segue
  // trova i testi pronti e il server resta libero per le altre richieste.
  await precaricaFeatures(FEATURES_DIR);
  const { file, soloDescritti } = riepilogaScenari(FEATURES_DIR);
  // Asincrona: la ricostruzione dell'indice (una tantum) puo' leggere centinaia
  // di MB, e non deve tenere fermo il server per le altre richieste.
  // Le corsie ancora in corso non si leggono: i loro file sono parziali.
  await assicuraIndiceAsync(percorsoIndice(), undefined, FEATURES_DIR, messaggiInCorso());
  const lettura = leggiEsiti(percorsoIndice());
  const corpo: RispostaScenari = {
    file: unisciEsiti(file, lettura.voci, leggiPrimiVerdi(percorsoPrimiVerdi())),
    soloDescritti,
    esiti: lettura.stato,
  };
  return NextResponse.json(corpo);
}
