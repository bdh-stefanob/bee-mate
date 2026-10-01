import { NextResponse } from 'next/server';
import { REPO_ROOT } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { applicaSuggerimenti } from '@/lib/suggerimenti-server';
import { ErroreApplicazione, type Scelta } from '@/lib/suggerimenti-applica';
import { giudiciVeri } from '@/lib/suggerimenti-giudici';

/**
 * POST /api/suggerimenti/applica
 *
 * Corpo: `{ id, scelte: [{ passo, voce }] }`. Applica le sole scelte che la persona ha
 * fatto, tutto o niente, e fa giudicare il risultato da compilazione, prova a vuoto e
 * validatore. Mai un percorso dalla finestra: i file li dice il manifesto della
 * generazione.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  let corpo: { id?: unknown; scelte?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta non leggibile' }, { status: 400 });
  }
  if (typeof corpo !== 'object' || corpo === null || typeof corpo.id !== 'string' || !Array.isArray(corpo.scelte)) {
    return NextResponse.json({ errore: 'servono id e scelte' }, { status: 400 });
  }
  const scelte: Scelta[] = [];
  for (const s of corpo.scelte.slice(0, 64)) {
    if (typeof s !== 'object' || s === null) return NextResponse.json({ errore: 'scelta non valida' }, { status: 400 });
    const { passo, voce } = s as { passo?: unknown; voce?: unknown };
    if (typeof passo !== 'number' || !Number.isInteger(passo) || passo < 1 || typeof voce !== 'string' || voce.length > 300) {
      return NextResponse.json({ errore: 'scelta non valida' }, { status: 400 });
    }
    scelte.push({ passo, voce });
  }

  try {
    return NextResponse.json(await applicaSuggerimenti(REPO_ROOT, { id: corpo.id, scelte }, giudiciVeri()));
  } catch (err) {
    // I messaggi sono scritti per una persona e non contengono percorsi assoluti;
    // i dettagli sono frasi di step.
    const e = err instanceof ErroreApplicazione ? err : null;
    return NextResponse.json(
      { errore: e ? e.message : 'non sono riuscito ad applicare le scelte', codice: e?.codice, dettagli: e?.dettagli ?? [] },
      { status: e ? 400 : 500 }
    );
  }
}
