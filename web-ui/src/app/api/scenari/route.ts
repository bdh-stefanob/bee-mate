import { NextResponse } from 'next/server';
import { FEATURES_DIR } from '@/lib/repo';
import { elencaScenari } from '@/lib/scenari';

/**
 * GET /api/scenari
 *
 * Gli scenari che la schermata Esecuzione puo' offrire: file sotto
 * `src/features/`, ciascuno con i suoi scenari eseguibili e la loro riga.
 * Di sola lettura, e dice solo cio' che c'e' gia' scritto nei file.
 */
export async function GET() {
  return NextResponse.json({ file: elencaScenari(FEATURES_DIR) });
}
