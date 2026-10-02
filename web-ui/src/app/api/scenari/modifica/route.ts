import { NextResponse } from 'next/server';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { applica, pianifica, ErrorePiano } from '@/lib/piano-modifica';
import { leggiContenuto } from '@/lib/contenuto-scenario';
import { conLaSerratura } from '@/lib/serratura-scenari';
import { operazioneInCorso } from '@/lib/registro';
import { tentaRigenerazioneCatalogo } from '@/lib/rigenerazione-catalogo';
import { togliVoceDalCatalogo } from '@/lib/catalogo-voci';
import { percorsoIndice, spostaEsiti } from '@/lib/esiti-scenari';
import { leggiOperazione, rispostaErrore } from '@/lib/risposte-scenari';

/**
 * POST /api/scenari/modifica
 *
 * Corpo: `{ operazione: 'testo', file, versione, testo }`,
 * `{ operazione: 'rinomina', file, versione, da, a }`,
 * `{ operazione: 'sposta', file, versione, flusso }` o `{ operazione: 'elimina', file, versione }`.
 * Pianifica, scrive in modo atomico, lancia il controllo vero (la prova a vuoto di
 * Cucumber, letta dai messaggi) e, se boccia o se una scrittura fallisce, ripristina
 * ogni file. Dopo una rinomina, uno spostamento o un'eliminazione che toccano delle
 * definizioni rigenera il catalogo. Risponde con `file` (lo scenario dopo la modifica:
 * nuovo se si e' spostato, `null` se si e' eliminato).
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
    // Le frasi che non ci sono piu' nel codice (la vecchia di una rinomina, i passi di uno scenario eliminato):
    // la rigenerazione conserva le voci `wanted`, e senza questo resterebbero nel catalogo come fantasmi.
    // Una voce `implemented` non si tocca: la rigenerazione la rifa' dal codice.
    for (const frase of [...(esito.catalogoDaTogliere ? [esito.catalogoDaTogliere] : []), ...(esito.passi?.vanno ?? [])]) {
      togliVoceDalCatalogo(REPO_ROOT, frase);
    }
    const catalogoRigenerato = esito.rigeneraCatalogo ? await tentaRigenerazioneCatalogo(undefined, { soloTraduzione: true }) : null;
    // Uno scenario spostato porta con se' l'esito dell'ultima prova (risultera' "modificato dopo").
    if (esito.spostamento) {
      spostaEsiti(percorsoIndice(REPO_ROOT), esito.spostamento.da, esito.spostamento.a, FEATURES_DIR);
    }
    return NextResponse.json({
      ok: true,
      testo: esito.testo,
      versione: esito.versione,
      fileToccati: esito.fileToccati,
      scenari: esito.scenari,
      avvisi: esito.avvisi,
      marcatoreTolto: esito.marcatoreTolto,
      catalogoRigenerato,
      // Lo scenario dopo la modifica: cambia se si e' spostato, `null` se si e' eliminato.
      file: esito.fileDopo,
      eliminato: esito.fileDopo === null,
      ...(esito.passi ? { passi: esito.passi } : {}),
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
