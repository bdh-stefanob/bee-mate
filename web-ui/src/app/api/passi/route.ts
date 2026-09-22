import { NextResponse } from 'next/server';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { stato } from '@/lib/registro';
import { leggiPassiTest } from '@/lib/artefatti';

/**
 * GET /api/passi?id=<id>
 *
 * Legge i passi di un'esecuzione di test dai messaggi Cucumber che ha
 * prodotto. Il percorso non arriva mai dalla finestra: si costruisce dal
 * solo id, e solo se quell'id e' un'esecuzione conosciuta dal registro —
 * un id a caso non fa leggere niente fuori da reports/cruscotto/.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || !stato(id)) {
    return NextResponse.json({ errore: "esecuzione sconosciuta" }, { status: 404 });
  }

  const percorso = path.join(REPO_ROOT, 'reports', 'cruscotto', `${id}.ndjson`);
  const passi = leggiPassiTest(percorso);
  return NextResponse.json({ passi });
}
