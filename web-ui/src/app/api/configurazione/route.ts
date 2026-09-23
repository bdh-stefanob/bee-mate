import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { scriviVariabile, bersagliDaFile, ambientiConCredenziali } from '@/lib/configurazione';
import { daAltraOrigine } from '@/lib/stessa-origine';

const ENV_PATH = path.join(REPO_ROOT, '.env');
const TARGETS_PATH = path.join(REPO_ROOT, 'bdd-targets.json');

/**
 * POST /api/configurazione
 *
 * Scrive una variabile in .env, creandolo se non esiste, senza mai
 * rileggerne il valore verso la finestra: un campo credenziale si scrive,
 * non si rilegge. Rifiuta chiavi non valide e valori con un a capo — in
 * quel caso il messaggio d'errore non contiene il valore ricevuto.
 */
export async function POST(request: Request) {
  // Questa rotta scrive le variabili d'ambiente: senza guardia, una scheda
  // qualunque aperta nello stesso browser potrebbe sovrascriverle.
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  try {
    const body = await request.json() as { chiave?: unknown; valore?: unknown };
    const { chiave, valore } = body;

    if (typeof chiave !== 'string' || typeof valore !== 'string') {
      return NextResponse.json({ error: 'chiave e valore devono essere stringhe' }, { status: 400 });
    }

    const contenutoAttuale = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';

    let nuovoContenuto: string;
    try {
      nuovoContenuto = scriviVariabile(contenutoAttuale, chiave, valore);
    } catch (err: unknown) {
      // Il messaggio di scriviVariabile per una chiave non valida include la
      // chiave (mai il valore): e' gia' sicuro da restituire.
      const message = err instanceof Error ? err.message : 'errore di validazione';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    fs.writeFileSync(ENV_PATH, nuovoContenuto, 'utf-8');
    return NextResponse.json({ scritta: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/configurazione
 *
 * Restituisce i nomi dei bersagli (`bersagli`, invariato: lo usano già Registra
 * ed Esecuzione) e, per la sezione Ambienti della schermata di controllo, anche
 * il loro indirizzo, le variabili che ciascuno richiede e quelle che ancora
 * mancano (`ambienti`) — mai le credenziali: quelle non stanno in questo file,
 * ci stanno come `${VARIABILE}` risolte da .env, e da questa rotta viaggiano
 * solo i loro nomi. Se bdd-targets.json non esiste, elenchi vuoti — non un errore.
 */
export async function GET() {
  try {
    if (!fs.existsSync(TARGETS_PATH)) {
      return NextResponse.json({ bersagli: [], ambienti: [] });
    }
    const json = fs.readFileSync(TARGETS_PATH, 'utf-8');
    const bersagli = bersagliDaFile(json);
    const ambienti = ambientiConCredenziali(json, TARGETS_PATH, ENV_PATH);
    return NextResponse.json({ bersagli, ambienti });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
