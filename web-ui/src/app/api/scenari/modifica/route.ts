import { NextResponse } from 'next/server';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { applica, pianifica, ErrorePiano } from '@/lib/piano-modifica';
import { leggiContenuto } from '@/lib/contenuto-scenario';
import { conLaSerratura } from '@/lib/serratura-scenari';
import { operazioneInCorso } from '@/lib/registro';
import { tentaRigenerazioneCatalogo } from '@/lib/rigenerazione-catalogo';
import { leggiOperazione, rispostaErrore } from '@/lib/risposte-scenari';

/**
 * POST /api/scenari/modifica
 *
 * Corpo: `{ operazione: 'testo', file, versione, testo }` oppure
 * `{ operazione: 'rinomina', file, versione, da, a }`. Pianifica, scrive in modo
 * atomico, lancia il controllo vero (la prova a vuoto di Cucumber, letta dai
 * messaggi) e, se boccia o se una scrittura fallisce, ripristina ogni file.
 * Dopo una rinomina rigenera il catalogo (cambia una definizione).
 *
 * Prende la serratura degli scenari e rifiuta se si sta registrando o eseguendo:
 * per qualche secondo il repository ha il contenuto nuovo, e una prova in corso
 * lo leggerebbe a meta'. La `versione` serve a accorgersi che il file e' cambiato
 * sul disco (`conflitto`, con il testo di adesso, cosi' il tester non perde il suo).
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta-non-ammessa' }, { status: 403 });
  }
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta' }, { status: 400 });
  }
  const op = leggiOperazione(corpo);
  if (!op) return NextResponse.json({ errore: 'richiesta' }, { status: 400 });

  if (operazioneInCorso()) {
    return NextResponse.json({ errore: 'operazione-in-corso' }, { status: 409 });
  }

  const radici = { repoRoot: REPO_ROOT, featuresDir: FEATURES_DIR };
  try {
    const esito = await conLaSerratura(async () => applica(radici, pianifica(radici, op)));
    const catalogoRigenerato = esito.rigeneraCatalogo ? await tentaRigenerazioneCatalogo() : null;
    return NextResponse.json({
      ok: true,
      testo: esito.testo,
      versione: esito.versione,
      fileToccati: esito.fileToccati,
      scenari: esito.scenari,
      avvisi: esito.avvisi,
      marcatoreTolto: esito.marcatoreTolto,
      catalogoRigenerato,
    });
  } catch (e) {
    const r = rispostaErrore(e);
    // Un conflitto porta il file com'e' adesso: il tester non perde il suo testo e puo' confrontare.
    if (e instanceof ErrorePiano && e.codice === 'conflitto') {
      try {
        const c = leggiContenuto(radici, op.file);
        r.corpo.attuale = { testo: c.testo, versione: c.versione };
      } catch {
        /* il file non c'e' piu': resta il solo conflitto */
      }
    }
    return NextResponse.json(r.corpo, { status: r.stato });
  }
}
