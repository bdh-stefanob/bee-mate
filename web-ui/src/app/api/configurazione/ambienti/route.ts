import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { scriviBersaglio, rimuoviBersaglio, percorsoSessionePerEliminazione } from '@/lib/configurazione';
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
 *
 * Scrive anche le CORREZIONI: `scriviBersaglio` aggiorna solo `url` quando il
 * nome esiste gia', lasciando `login` e il resto intatti — e' cosi' che la
 * finestra modifica l'indirizzo di un ambiente. Rinominarlo e' un'altra cosa
 * e questa rotta non lo permette: il nome vive anche nelle sessioni salvate e
 * nelle registrazioni, e la finestra lo dice esplicitamente invece di farlo
 * intuire.
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

/**
 * DELETE /api/configurazione/ambienti
 *
 * Toglie un ambiente da bdd-targets.json (indirizzo e blocco `login`
 * insieme). Cancella anche il suo file di sessione, se esiste — la finestra
 * lo promette esplicitamente nella conferma prima di chiamare questa rotta,
 * quindi qui deve succedere davvero, non restare un file orfano che
 * ricomparirebbe se un ambiente omonimo viene ricreato in seguito.
 *
 * Le variabili in `.env` non vengono toccate: potrebbero servire a un
 * ambiente ricreato con lo stesso nome, o a un altro bersaglio che le
 * referenzia. Cancellarle qui sarebbe un effetto collaterale silenzioso.
 */
export async function DELETE(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { nome?: unknown };
    const { nome } = body;

    if (typeof nome !== 'string') {
      return NextResponse.json({ errore: 'nome deve essere testo' }, { status: 400 });
    }

    const contenutoAttuale = fs.existsSync(TARGETS_PATH) ? fs.readFileSync(TARGETS_PATH, 'utf-8') : '';

    // Risolto PRIMA di togliere l'ambiente dal file: dopo, il campo `session`
    // eventualmente personalizzato non ci sarebbe piu' da leggere.
    let percorsoSessione: string | null = null;
    try {
      percorsoSessione = percorsoSessionePerEliminazione(contenutoAttuale, TARGETS_PATH, nome);
    } catch {
      // Un ambiente sconosciuto lo dira' rimuoviBersaglio subito sotto: qui
      // non e' un guasto, e' solo un percorso che non serve piu' calcolare.
    }

    let nuovoContenuto: string;
    try {
      nuovoContenuto = rimuoviBersaglio(contenutoAttuale, nome);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'errore di validazione';
      return NextResponse.json({ errore: message }, { status: 400 });
    }

    fs.writeFileSync(TARGETS_PATH, nuovoContenuto, 'utf-8');

    if (percorsoSessione && fs.existsSync(percorsoSessione)) {
      try {
        fs.unlinkSync(percorsoSessione);
      } catch {
        // L'ambiente e' comunque tolto da bdd-targets.json: un file di
        // sessione che non si riesce a cancellare (permessi, in uso) non
        // deve far fallire l'intera operazione, resta solo orfano sul disco.
      }
    }

    return NextResponse.json({ eliminato: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ errore: message }, { status: 500 });
  }
}
