import { NextResponse } from 'next/server';
import { REPO_ROOT } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { annullaSuggerimenti } from '@/lib/suggerimenti-server';
import { ErroreApplicazione } from '@/lib/suggerimenti-applica';

/**
 * POST /api/suggerimenti/annulla
 *
 * Corpo: `{ id }`. Rimette lo scenario e i suoi step com'erano prima delle scelte,
 * solo se nessuno li ha toccati nel frattempo e lo scenario non e' ancora stato
 * salvato.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  let corpo: { id?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta non leggibile' }, { status: 400 });
  }
  if (typeof corpo !== 'object' || corpo === null || typeof corpo.id !== 'string') {
    return NextResponse.json({ errore: 'serve l\'id' }, { status: 400 });
  }

  try {
    return NextResponse.json(await annullaSuggerimenti(REPO_ROOT, corpo.id));
  } catch (err) {
    const e = err instanceof ErroreApplicazione ? err : null;
    return NextResponse.json(
      { errore: e ? e.message : 'non sono riuscito ad annullare', codice: e?.codice, dettagli: e?.dettagli ?? [] },
      { status: e ? 400 : 500 }
    );
  }
}
