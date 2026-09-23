import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { LINGUE, NOME_COOKIE_LINGUA, type Lingua } from '@/i18n/request';

function linguaValida(valore: unknown): valore is Lingua {
  return typeof valore === 'string' && (LINGUE as readonly string[]).includes(valore);
}

/** Cambia la lingua della finestra: un cookie, non un indirizzo diverso. */
export async function POST(richiesta: Request) {
  const corpo = (await richiesta.json().catch(() => null)) as { lingua?: unknown } | null;
  if (!corpo || !linguaValida(corpo.lingua)) {
    return NextResponse.json({ errore: 'lingua non valida' }, { status: 400 });
  }
  const barattoloCookie = await cookies();
  // Un anno: la scelta resta fra un'apertura e l'altra della finestra, come un
  // qualunque browser ricorderebbe.
  barattoloCookie.set(NOME_COOKIE_LINGUA, corpo.lingua, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return NextResponse.json({ impostata: true });
}
