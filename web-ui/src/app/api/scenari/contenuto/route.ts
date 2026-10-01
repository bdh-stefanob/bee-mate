import { NextResponse } from 'next/server';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import { leggiContenuto } from '@/lib/contenuto-scenario';
import { rispostaErrore } from '@/lib/risposte-scenari';

/**
 * GET /api/scenari/contenuto?file=<percorso relativo a src/features/>
 *
 * Legge uno scenario per chi lo modifica: il testo con la sua `versione`, i passi
 * (con gli altri scenari che li usano e se si possono rinominare) e i passi che si
 * possono offrire al posto di un altro. Aggiunge a `GET /api/download` cio' che
 * serve solo alla modifica. Sola lettura: niente guardia di origine.
 *
 * Il percorso passa dalle guardie su traversal, estensione e collegamenti
 * simbolici; le risposte non contengono mai un percorso assoluto.
 */
export async function GET(request: Request) {
  const file = new URL(request.url).searchParams.get('file') ?? '';
  try {
    return NextResponse.json(leggiContenuto({ repoRoot: REPO_ROOT, featuresDir: FEATURES_DIR }, file));
  } catch (e) {
    const r = rispostaErrore(e);
    return NextResponse.json(r.corpo, { status: r.stato });
  }
}
