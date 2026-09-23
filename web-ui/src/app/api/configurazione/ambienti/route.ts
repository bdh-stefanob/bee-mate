import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { scriviBersaglio } from '@/lib/configurazione';
import { daAltraOrigine } from '@/lib/stessa-origine';

const TARGETS_PATH = path.join(REPO_ROOT, 'bdd-targets.json');

/**
 * POST /api/configurazione/ambienti
 *
 * Scrive (o aggiorna) un ambiente in bdd-targets.json. E' una rotta a parte
 * da POST /api/configurazione — quella scrive una credenziale in .env, questa
 * scrive un nome e un indirizzo in un file diverso, con regole di validazione
 * diverse (schema dell'indirizzo, niente credenziali nell'URL): due file, due
 * forme di errore, meglio due rotte piccole che una con un ramo `if` in mezzo.
 */
export async function POST(request: Request) {
  // Questa rotta scrive nel file degli ambienti: stessa guardia delle altre
  // rotte che scrivono, altrimenti una scheda qualunque aperta nello stesso
  // browser potrebbe aggiungere o correggere un ambiente al posto del tester.
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { nome?: unknown; url?: unknown };
    const { nome, url } = body;

    if (typeof nome !== 'string' || typeof url !== 'string') {
      return NextResponse.json({ errore: 'nome e indirizzo devono essere testo' }, { status: 400 });
    }

    const contenutoAttuale = fs.existsSync(TARGETS_PATH) ? fs.readFileSync(TARGETS_PATH, 'utf-8') : '';

    let nuovoContenuto: string;
    try {
      nuovoContenuto = scriviBersaglio(contenutoAttuale, nome, url);
    } catch (err: unknown) {
      // Il messaggio di scriviBersaglio e' gia' scritto per una persona, e per
      // l'indirizzo con credenziali non le ripete: e' gia' sicuro da restituire.
      const message = err instanceof Error ? err.message : 'errore di validazione';
      return NextResponse.json({ errore: message }, { status: 400 });
    }

    fs.writeFileSync(TARGETS_PATH, nuovoContenuto, 'utf-8');
    return NextResponse.json({ scritto: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ errore: message }, { status: 500 });
  }
}
