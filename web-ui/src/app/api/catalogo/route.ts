import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import type { CatalogStep } from '@/lib/types';
import { costruisciCatalogo } from '@/lib/catalogo';
import { cartellaSrcDiRepo } from '@/lib/percorso-definizione';
import { leggiJson } from '@/lib/file-json';
import { precaricaFeatures } from '@/lib/cache-file';

/**
 * GET /api/catalogo
 *
 * Tutto cio' che serve alla schermata Catalogo in una sola chiamata: gli step
 * con i componenti che toccano e gli scenari che li usano, piu' la mappa al
 * contrario dei componenti. Di sola lettura.
 */
export async function GET() {
  try {
    const catalogoPath = path.join(REPO_ROOT, 'step-catalog.json');
    const dati = leggiJson(catalogoPath) as { steps: CatalogStep[] };
    // I .feature si leggono prima, in modo asincrono (vedi `precaricaFeatures`).
    await precaricaFeatures(FEATURES_DIR);
    return NextResponse.json(costruisciCatalogo(dati.steps, FEATURES_DIR, cartellaSrcDiRepo(REPO_ROOT)));
  } catch (err) {
    console.error('catalogo non disponibile:', err);
    return NextResponse.json({ errore: 'catalogo_non_disponibile' }, { status: 500 });
  }
}
