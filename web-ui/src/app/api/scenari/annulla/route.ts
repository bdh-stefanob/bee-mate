import { NextResponse } from 'next/server';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { annulla, statoAnnulla } from '@/lib/piano-modifica';
import { leggiContenuto } from '@/lib/contenuto-scenario';
import { conLaSerratura } from '@/lib/serratura-scenari';
import { operazioneInCorso } from '@/lib/registro';
import { tentaRigenerazioneCatalogo } from '@/lib/rigenerazione-catalogo';
import { togliVoceDalCatalogo } from '@/lib/catalogo-voci';
import { rispostaErrore } from '@/lib/risposte-scenari';

const radici = () => ({ repoRoot: REPO_ROOT, featuresDir: FEATURES_DIR });

/** GET /api/scenari/annulla: c'e' un'ultima modifica che si puo' annullare? Sola lettura. */
export async function GET() {
  return NextResponse.json(statoAnnulla(radici()));
}

/**
 * POST /api/scenari/annulla
 *
 * Annulla l'ultima modifica (un livello solo). Prima controlla che ogni file sia
 * ancora come l'ha lasciato la modifica: se qualcuno l'ha cambiato nel frattempo
 * risponde `cambiato-dopo` e non tocca niente. Annullare due volte non fa niente.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta-non-ammessa' }, { status: 403 });
  }
  if (operazioneInCorso()) {
    return NextResponse.json({ errore: 'operazione-in-corso' }, { status: 409 });
  }
  try {
    const esito = await conLaSerratura(() => annulla(radici()));
    // Annullata una rinomina: la frase nuova non c'e' piu' nel codice (vedi `catalogo-voci.ts`).
    if (esito.catalogoDaTogliere) togliVoceDalCatalogo(REPO_ROOT, esito.catalogoDaTogliere);
    const catalogoRigenerato = esito.rigeneraCatalogo ? await tentaRigenerazioneCatalogo() : null;
    // Lo scenario com'e' adesso, cosi' il pannello riparte dal testo di prima.
    let attuale: { testo: string; versione: string } | null = null;
    try {
      const c = leggiContenuto(radici(), esito.file);
      attuale = { testo: c.testo, versione: c.versione };
    } catch {
      /* lo scenario aperto non c'e' piu' */
    }
    return NextResponse.json({ ok: true, fileToccati: esito.fileToccati, attuale, catalogoRigenerato });
  } catch (e) {
    const r = rispostaErrore(e);
    return NextResponse.json(r.corpo, { status: r.stato });
  }
}
