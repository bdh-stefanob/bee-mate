import { NextResponse } from 'next/server';
import { avvia, operazioneInCorso } from '@/lib/registro';
import type { NomeComando, Parametri } from '@/lib/esecuzione';
import { daAltraOrigine } from '@/lib/stessa-origine';

/**
 * Di sola lettura: dice se c'e' un'operazione che tiene occupato il browser,
 * cosi' una schermata appena aperta puo' riagganciarsi invece di far finta di
 * niente. Nessuna guardia sull'origine (non cambia nulla, non fa nulla), e
 * niente righe nella risposta: possono contenere i nomi che il tester sta
 * dando ai passi.
 */
export async function GET() {
  return NextResponse.json({ operazione: operazioneInCorso() ?? null });
}

export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

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
