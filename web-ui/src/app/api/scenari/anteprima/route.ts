import { NextResponse } from 'next/server';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { pianifica } from '@/lib/piano-modifica';
import { leggiOperazione, rispostaErrore } from '@/lib/risposte-scenari';

/**
 * POST /api/scenari/anteprima
 *
 * Corpo: `{ operazione: 'testo' | 'rinomina', file, versione, ... }`. Calcola il
 * piano SENZA scrivere e risponde con i blocchi e gli avvisi del controllo
 * rapido e con le conseguenze: quali scenari toccherebbe, quali diventerebbero
 * "tuoi" (perdono il marcatore di generazione). E' la schermata di conferma
 * della rinomina e il "controlla" prima di salvare.
 *
 * Non scrive, ma e' un POST con un corpo e prende la stessa guardia di origine
 * di tutte le altre: una pagina qualunque non deve poter interrogare gli scenari.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta-non-ammessa' }, { status: 403 });
  }
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta' }, { status: 400 });
  }
  const op = leggiOperazione(corpo);
  if (!op) return NextResponse.json({ errore: 'richiesta' }, { status: 400 });

  try {
    const piano = pianifica({ repoRoot: REPO_ROOT, featuresDir: FEATURES_DIR }, op);
    return NextResponse.json({
      ok: piano.blocchi.length === 0,
      blocchi: piano.blocchi,
      avvisi: piano.avvisi,
      conseguenze: piano.conseguenze,
      // Una rinomina vale per tutto il repository: chiede sempre conferma.
      tocca: piano.operazione === 'rinomina',
      scrive: piano.scritture.length,
      marcatoreTolto: piano.marcatoreTolto,
    });
  } catch (e) {
    const r = rispostaErrore(e);
    return NextResponse.json(r.corpo, { status: r.stato });
  }
}
