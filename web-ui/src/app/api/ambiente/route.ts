import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ambienteValido, NOME_COOKIE_AMBIENTE } from '@/lib/ambiente-corrente';
import { daAltraOrigine } from '@/lib/stessa-origine';

/**
 * Cambia l'ambiente su cui lavora l'intera finestra: un cookie, non un
 * parametro che ogni schermata deve ripetersi. Stesso schema di
 * `/api/lingua`. Il nome non si verifica contro `bdd-targets.json` qui: un
 * nome sintatticamente valido ma sconosciuto si comporta come "nessuno
 * scelto" per chi lo consuma (le pagine confrontano contro l'elenco vero).
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  const corpo = (await request.json().catch(() => null)) as { ambiente?: unknown } | null;
  if (!corpo || !ambienteValido(corpo.ambiente)) {
    return NextResponse.json({ errore: 'ambiente non valido' }, { status: 400 });
  }

  const barattoloCookie = await cookies();
  // Un anno: la scelta resta fra un'apertura e l'altra della finestra, come
  // la lingua.
  barattoloCookie.set(NOME_COOKIE_AMBIENTE, corpo.ambiente, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return NextResponse.json({ impostato: true });
}
