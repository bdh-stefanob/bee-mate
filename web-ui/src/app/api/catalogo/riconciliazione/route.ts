import { NextResponse } from 'next/server';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import type { CatalogStep } from '@/lib/types';
import { individuaCoppieConTetto } from '@/lib/riconciliazione';
import { leggiJson, senzaBom } from '@/lib/file-json';
import { CachePerFile } from '@/lib/cache-file';

/**
 * Il conto dipende solo dal contenuto del catalogo: finche' il file non cambia
 * (anche se lo cambia qualcuno da fuori) non si rifa'. Pesava ~190 ms a 2000
 * voci a ogni apertura del Catalogo, e in quel tempo il server non serviva
 * nient'altro (la barra laterale compresa).
 */
const coppiePerCatalogo = new CachePerFile<ReturnType<typeof individuaCoppieConTetto>>();

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
    // Con un catalogo "sporco" le coppie sono quadratiche: se ne restituiscono
    // al massimo TETTO_COPPIE (le piu' forti) e si dice quante ce ne sono davvero.
    const risposta = coppiePerCatalogo.ottieni(catalogoPath, '', (testo) =>
      individuaCoppieConTetto((JSON.parse(senzaBom(testo)) as { steps: CatalogStep[] }).steps)
    );
    if (risposta === null) {
      // Il file non si legge: si lascia che lo dica la lettura di sempre (e il suo messaggio).
      const dati = leggiJson(catalogoPath) as { steps: CatalogStep[] };
      return NextResponse.json(individuaCoppieConTetto(dati.steps));
    }
    return NextResponse.json(risposta);
  } catch (err) {
    console.error('riconciliazione non disponibile:', err);
    return NextResponse.json({ errore: 'catalogo_non_disponibile' }, { status: 500 });
  }
}
