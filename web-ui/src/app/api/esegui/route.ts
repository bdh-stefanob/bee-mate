import { NextResponse } from 'next/server';
import { avvia, ErroreAvvio, operazioneInCorso, operazioniInCorso } from '@/lib/registro';
import type { NomeComando, Parametri } from '@/lib/esecuzione';
import { daAltraOrigine } from '@/lib/stessa-origine';

/**
 * Di sola lettura: dice quali operazioni tengono occupato il browser (tutte le
 * corsie di test, non una sola), cosi' una schermata appena aperta puo'
 * riagganciarle tutte invece di far finta di niente. `operazione` resta per chi
 * legge ancora il campo singolo. Nessuna guardia sull'origine (non cambia nulla,
 * non fa nulla), e niente righe nella risposta: possono contenere i nomi che il
 * tester sta dando ai passi.
 */
export async function GET() {
  return NextResponse.json({
    operazione: operazioneInCorso() ?? null,
    operazioni: operazioniInCorso(),
  });
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
    // per una persona, e non contiene percorsi ne' valori. Il codice e il numero
    // servono alla schermata per dire la stessa cosa nella lingua scelta.
    if (err instanceof ErroreAvvio) {
      return NextResponse.json({ errore: err.message, codice: err.codice, n: err.n }, { status: 400 });
    }
    return NextResponse.json({ errore: (err as Error).message }, { status: 400 });
  }
}
