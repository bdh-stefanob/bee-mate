import { NextResponse } from 'next/server';
import { avvia } from '@/lib/registro';
import type { NomeComando, Parametri } from '@/lib/esecuzione';

export async function POST(request: Request) {
  let corpo: { nome?: string; parametri?: Parametri };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta non leggibile' }, { status: 400 });
  }

  // `null` e' JSON valido, quindi il parse sopra lo lascia passare: senza
  // questo controllo `corpo.nome` lancerebbe, e al tester arriverebbe il
  // messaggio interno del motore JavaScript al posto di una frase.
  if (typeof corpo !== 'object' || corpo === null) {
    return NextResponse.json({ errore: 'richiesta non leggibile' }, { status: 400 });
  }

  try {
    const e = avvia(corpo.nome as NomeComando, corpo.parametri);
    return NextResponse.json({ id: e.id });
  } catch (err) {
    // Il messaggio arriva dall'elenco chiuso o dal lucchetto: e' gia' scritto
    // per una persona, e non contiene percorsi ne' valori.
    return NextResponse.json({ errore: (err as Error).message }, { status: 400 });
  }
}
