import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { leggiTraccia } from '@/lib/artefatti';
import { dentroLaCartellaSuDisco } from '@/lib/percorsi-disco';

const RECORDINGS_DIR = path.resolve(REPO_ROOT, 'reports', 'recordings');
const SCOUT_DIR = path.resolve(REPO_ROOT, 'reports', 'scout');

/**
 * La stessa guardia delle feature, applicata a `reports/recordings/`: dentro la
 * cartella, estensione giusta, e i collegamenti simbolici sciolti prima di
 * fidarsi — un file dentro la cartella puo' puntare fuori.
 */
function percorsoSicuro(rel: string): string | null {
  return dentroLaCartellaSuDisco(RECORDINGS_DIR, rel, '.json');
}

/**
 * Stesso criterio con cui `scripts/record.ts` nomina il dizionario di una
 * pagina: un dizionario per host, non per indirizzo intero. Se l'host non si
 * riesce a leggere dall'URL, niente confronto per quell'intento.
 */
function slugHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, '-');
  } catch {
    return null;
  }
}

interface ElementoGrezzo {
  role?: string;
  name?: string;
}
interface IntentoGrezzo {
  pageUrl?: string;
  steps?: ElementoGrezzo[];
  assertions?: ElementoGrezzo[];
}
interface TracciaGrezzaCompleta {
  startUrl?: string;
  intents?: IntentoGrezzo[];
}
interface ComponenteDizionario {
  role?: string;
  name?: string;
}
interface DizionarioGrezzo {
  components?: ComponenteDizionario[];
}

export interface Buco {
  pagina: string;
  messaggio: string;
}

/**
 * I buchi: elementi usati durante la registrazione che il dizionario della
 * pagina (scritto da `npm run scout`, o gia' in automatico da ogni
 * registrazione) non conosce ancora.
 *
 * Non e' un errore: il gesto o la verifica hanno comunque un ruolo e un nome,
 * quindi il test generato funziona. Ma senza il dizionario l'ancoraggio resta
 * quello grezzo della registrazione — piu' fragile nel tempo di quello
 * rivisto dallo scout. Il rimedio e' sempre lo stesso: scansionare quella
 * pagina.
 */
function calcolaBuchi(percorso: string): Buco[] {
  let grezza: TracciaGrezzaCompleta;
  try {
    grezza = JSON.parse(fs.readFileSync(percorso, 'utf-8')) as TracciaGrezzaCompleta;
  } catch {
    return [];
  }

  const perHost = new Map<string, { mancanti: Set<string>; conosciute: Set<string> | null }>();

  for (const intento of grezza.intents ?? []) {
    const url = intento.pageUrl ?? grezza.startUrl;
    if (!url) continue;
    const host = slugHost(url);
    if (!host) continue;

    if (!perHost.has(host)) {
      let conosciute: Set<string> | null;
      try {
        const dizionario = JSON.parse(
          fs.readFileSync(path.join(SCOUT_DIR, `${host}.json`), 'utf-8')
        ) as DizionarioGrezzo;
        conosciute = new Set(
          (dizionario.components ?? [])
            .filter((c) => c.role && c.name)
            .map((c) => `${c.role}::${c.name}`)
        );
      } catch {
        // Nessun dizionario ancora per questo host: lo si dice, non lo si
        // finge vuoto confrontando ogni elemento come "mancante".
        conosciute = null;
      }
      perHost.set(host, { mancanti: new Set(), conosciute });
    }

    const voce = perHost.get(host)!;
    if (voce.conosciute === null) continue;

    for (const elemento of [...(intento.steps ?? []), ...(intento.assertions ?? [])]) {
      if (!elemento.role || !elemento.name) continue;
      const chiave = `${elemento.role}::${elemento.name}`;
      if (!voce.conosciute.has(chiave)) voce.mancanti.add(chiave);
    }
  }

  const buchi: Buco[] = [];
  for (const [host, voce] of perHost) {
    if (voce.conosciute === null) {
      buchi.push({
        pagina: host,
        messaggio:
          'questa pagina non ha ancora un dizionario: il test funziona lo stesso, ma sara\' piu\' fragile finche\' non la scansioni',
      });
    } else if (voce.mancanti.size > 0) {
      const n = voce.mancanti.size;
      buchi.push({
        pagina: host,
        messaggio:
          n === 1
            ? 'un elemento non era nel dizionario di questa pagina: il test funziona lo stesso, ma potrebbe essere fragile'
            : `${n} elementi non erano nel dizionario di questa pagina: il test funziona lo stesso, ma potrebbe essere fragile`,
      });
    }
  }
  return buchi;
}

/**
 * GET /api/traccia?percorso=<relativo dentro reports/recordings/>
 *
 * Espone `leggiTraccia` alla finestra, con la stessa guardia di percorso gia'
 * usata per le feature: dentro la cartella, estensione giusta, niente `..`
 * ne' percorsi assoluti.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const percorso = searchParams.get('percorso');
  if (!percorso) {
    return NextResponse.json({ errore: 'percorso mancante' }, { status: 400 });
  }

  const assoluto = percorsoSicuro(percorso);
  if (!assoluto) {
    return NextResponse.json({ errore: 'percorso non valido' }, { status: 400 });
  }

  // Senza questo controllo un file sparito darebbe 200 con zero passi, cioe'
  // esattamente cio' che si vede dopo una registrazione in cui non si e'
  // nominato niente: due cause diverse, la stessa schermata, e il tester va a
  // cercare l'errore dalla parte sbagliata.
  if (!fs.existsSync(assoluto)) {
    return NextResponse.json({ errore: "la traccia non c'e' piu'" }, { status: 404 });
  }

  const { passi, durata } = leggiTraccia(assoluto);
  const buchi = calcolaBuchi(assoluto);

  return NextResponse.json({ passi, durata, buchi });
}
