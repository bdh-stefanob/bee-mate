import { NextResponse } from 'next/server';
import { REPO_ROOT } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { preparaSuggerimenti } from '@/lib/suggerimenti-server';

/**
 * POST /api/suggerimenti
 *
 * Prepara i suggerimenti dell'ultimo scenario generato: i candidati di catalogo che il
 * generatore ha gia' calcolato, scelti dalle regole (nessun modello, nessuna rete).
 * Risponde `nessuno` quando non c'e' niente da offrire: la finestra, allora, non
 * mostra il riquadro. E' un POST perche' scrive i file del contratto sotto
 * `reports/assistente/`.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }
  try {
    return NextResponse.json(preparaSuggerimenti(REPO_ROOT));
  } catch {
    // Un guasto qui non deve mai impedire di salvare: nessun suggerimento e basta.
    return NextResponse.json({ stato: 'nessuno' });
  }
}
