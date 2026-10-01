import { NextResponse } from 'next/server';
import { REPO_ROOT } from '@/lib/repo';
import { stato } from '@/lib/registro';
import { idProvaValido, leggiProvaConclusa, provaEsiste } from '@/lib/prova-conclusa';

/**
 * GET /api/prova?id=<id>[&solo=esiste]
 *
 * Una prova gia' conclusa, per "Vedi la schermata". A differenza di
 * `/api/passi` (che conosce solo cio' che il registro in memoria ha visto
 * partire in questa sessione del server) legge dai file: una prova di ieri, di
 * prima di un riavvio, si apre lo stesso. L'id arriva dall'indirizzo e non e'
 * fidato: solo minuscole, cifre e trattino, e il percorso si costruisce dal
 * solo id dentro `reports/cruscotto/`.
 *
 * `solo=esiste` risponde senza leggere le schermate (che possono pesare): serve
 * a decidere se mostrare il link.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!idProvaValido(id)) {
    return NextResponse.json({ errore: 'id non valido' }, { status: 400 });
  }

  // Una prova che gira ancora non e' conclusa: la si guarda dalla schermata viva.
  if (stato(id)?.stato === 'in corso') {
    return NextResponse.json({ stato: 'in-corso' });
  }

  if (searchParams.get('solo') === 'esiste') {
    return NextResponse.json({ esiste: provaEsiste(REPO_ROOT, id) });
  }

  return NextResponse.json(leggiProvaConclusa(REPO_ROOT, id));
}
