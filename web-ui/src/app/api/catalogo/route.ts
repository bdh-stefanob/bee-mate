import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import type { CatalogStep } from '@/lib/types';
import { costruisciCatalogo } from '@/lib/catalogo';

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
    const dati = JSON.parse(fs.readFileSync(catalogoPath, 'utf-8')) as { steps: CatalogStep[] };
    return NextResponse.json(costruisciCatalogo(dati.steps, FEATURES_DIR));
  } catch (err) {
    console.error('catalogo non disponibile:', err);
    return NextResponse.json({ errore: 'catalogo_non_disponibile' }, { status: 500 });
  }
}
