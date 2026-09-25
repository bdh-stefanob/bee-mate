import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import type { CatalogStep } from '@/lib/types';
import { individuaCoppie } from '@/lib/riconciliazione';

/**
 * GET /api/catalogo/riconciliazione
 *
 * Le coppie di step sospette, gia' giudicate: vedi `riconciliazione.ts` per
 * come si distingue un doppione vero da un equivoco di denominazione (due
 * frasi quasi uguali con componenti diversi). Di sola lettura.
 */
export async function GET() {
  try {
    const catalogoPath = path.join(REPO_ROOT, 'step-catalog.json');
    const dati = JSON.parse(fs.readFileSync(catalogoPath, 'utf-8')) as { steps: CatalogStep[] };
    return NextResponse.json({ coppie: individuaCoppie(dati.steps) });
  } catch (err) {
    console.error('riconciliazione non disponibile:', err);
    return NextResponse.json({ errore: 'catalogo_non_disponibile' }, { status: 500 });
  }
}
