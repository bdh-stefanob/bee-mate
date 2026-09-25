import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { dentroLaCartellaSuDisco } from '@/lib/percorsi-disco';
import { walkFeatures } from '@/lib/features';
import { trovaUsatoIn } from '@/lib/catalogo';
import type { CatalogStep } from '@/lib/types';
import { riscriviScenario, haParametri } from '@/lib/riscrittura-step';
import { estraiDefinizione, rimuoviDefinizione, corpiEquivalenti, FusioneNonSupportata } from '@/lib/fusione-step';
import { tentaRigenerazioneCatalogo } from '@/lib/rigenerazione-catalogo';

/**
 * POST /api/catalogo/fondi — GET /api/catalogo/fondi (anteprima)
 * ----------------------------------------------------------------
 * Il gesto che il tester ha chiesto per il doppione: due frasi, stesso
 * componente, una sopravvive. In un colpo solo:
 *
 *   1. la frase perdente (`da`) diventa `a` in ogni scenario che la usa;
 *   2. la DEFINIZIONE di `da` sparisce dal suo file `.steps.ts` — quella di
 *      `a` non si tocca, e' lei che resta;
 *   3. il catalogo si rigenera.
 *
 * TUTTO O NIENTE: ogni riscrittura si calcola in memoria (nessuna funzione qui
 * dentro accede al disco per scrivere: leggono, calcolano, e solo alla fine si
 * scrive) prima di toccare un solo file. Se un passaggio fallisce — ambiguita'
 * nella definizione, corpi diversi senza conferma, un file che sparisce tra la
 * lettura e la scrittura — non si scrive niente.
 *
 * ANNULLAMENTO: prima di scrivere si salva un'istantanea di ogni file
 * coinvolto (il contenuto PRIMA), in `reports/fusioni/ultima-fusione.json`
 * (fuori da git, come il resto di `reports/`). `POST /api/catalogo/fondi/annulla`
 * la rilegge e riscrive quei file cosi' com'erano, poi la consuma: un solo
 * livello di annullamento, l'ultima fusione soltanto. E' la forma piu' semplice
 * che risolve il problema reale ("ho fuso la coppia sbagliata, torna indietro
 * subito") senza tenere una cronologia che nessuno chiede e che invecchierebbe
 * male (i file cambiano anche per altre vie tra una fusione e la successiva).
 *
 * CORPI DIVERSI: la fusione NON sceglie da sola quale comportamento tenere.
 * Se i due gestori non sono equivalenti, la POST rifiuta con `corpi_diversi` e
 * restituisce entrambi i corpi: la finestra li mostra e chiede conferma
 * esplicita (`procediNonostanteDifferenza: true`) prima di fondere comunque —
 * tenendo sempre il comportamento della frase che resta (`a`), mai una scelta
 * a caso tra i due.
 */

function leggiCatalogo(): CatalogStep[] {
  const p = path.join(REPO_ROOT, 'step-catalog.json');
  return (JSON.parse(fs.readFileSync(p, 'utf-8')) as { steps: CatalogStep[] }).steps;
}

const CARTELLA_SRC = path.join(REPO_ROOT, 'src');
const CARTELLA_ANNULLAMENTO = path.join(REPO_ROOT, 'reports', 'fusioni');
const FILE_ANNULLAMENTO = path.join(CARTELLA_ANNULLAMENTO, 'ultima-fusione.json');

/** Stessa risoluzione di `sourceRef` usata da `POST /api/catalogo/riconcilia`. */
function percorsoDefinizione(sourceRef: string): string | null {
  const senzaRiga = sourceRef.replace(/:\d+$/, '');
  const relativoASrc = senzaRiga.replace(/\\/g, '/').replace(/^src\//, '');
  return dentroLaCartellaSuDisco(CARTELLA_SRC, relativoASrc, '.ts');
}

interface CorpoRichiesta {
  da?: unknown;
  a?: unknown;
  procediNonostanteDifferenza?: unknown;
}

interface EsitoValidazione {
  errore: string;
  status: number;
}

interface RichiestaValida {
  da: string;
  a: string;
  procediNonostanteDifferenza: boolean;
}

function validaRichiesta(corpo: CorpoRichiesta): RichiestaValida | EsitoValidazione {
  const { da, a } = corpo;
  if (typeof da !== 'string' || typeof a !== 'string' || da.trim() === '' || a.trim() === '') {
    return { errore: 'servono_due_frasi', status: 400 };
  }
  if (/[\r\n]/.test(da) || /[\r\n]/.test(a)) {
    return { errore: 'frase_non_valida', status: 400 };
  }
  if (da === a) {
    return { errore: 'le_frasi_sono_uguali', status: 400 };
  }
  if (haParametri(da) || haParametri(a)) {
    return { errore: 'step_con_parametri_non_supportato', status: 400 };
  }
  return { da, a, procediNonostanteDifferenza: corpo.procediNonostanteDifferenza === true };
}

function eRisultatoValido(v: RichiestaValida | EsitoValidazione): v is RichiestaValida {
  return !('status' in v);
}

interface EsitoPreparazione {
  ok: true;
  percorsoDa: string;
  percorsoA: string;
  stessoFile: boolean;
  testoDaOriginale: string;
  testoAOriginale: string;
  testoDopoRimozione: string;
  corpoDa: string | null;
  corpoA: string | null;
  equivalenti: boolean;
  scenariCoinvolti: ReturnType<typeof trovaUsatoIn> extends Map<string, infer V> ? V : never;
}

/**
 * Tutto cio' che serve per decidere e mostrare l'anteprima: dove vivono le
 * due definizioni, i loro corpi, se sono equivalenti, e quali file `.feature`
 * cambierebbero. Nessuna scrittura: usata sia dalla GET (anteprima pura) sia
 * come primo passo della POST (che poi, se tutto torna, scrive davvero).
 */
function preparaFusione(da: string, a: string): EsitoPreparazione | EsitoValidazione {
  const steps = leggiCatalogo();
  const stepDa = steps.find((s) => s.expression === da);
  const stepA = steps.find((s) => s.expression === a);
  if (!stepDa || !stepA) {
    return { errore: 'step_non_trovato', status: 404 } as const;
  }

  const percorsoDa = percorsoDefinizione(stepDa.sourceRef);
  const percorsoA = percorsoDefinizione(stepA.sourceRef);
  if (!percorsoDa || !fs.existsSync(percorsoDa) || !percorsoA || !fs.existsSync(percorsoA)) {
    return { errore: 'definizione_non_trovata', status: 500 } as const;
  }

  const stessoFile = percorsoDa === percorsoA;
  const testoDaOriginale = fs.readFileSync(percorsoDa, 'utf-8');
  const testoAOriginale = stessoFile ? testoDaOriginale : fs.readFileSync(percorsoA, 'utf-8');

  const defA = estraiDefinizione(testoAOriginale, a);
  if (defA.trovate !== 1) {
    return { errore: 'definizione_non_trovata', status: 500 } as const;
  }

  let rimozione: ReturnType<typeof rimuoviDefinizione>;
  try {
    rimozione = rimuoviDefinizione(testoDaOriginale, da);
  } catch (err) {
    if (err instanceof FusioneNonSupportata) {
      return { errore: 'step_con_parametri_non_supportato', status: 400 } as const;
    }
    throw err;
  }
  if (rimozione.rimosse !== 1) {
    return { errore: 'definizione_non_trovata', status: 500 } as const;
  }

  const equivalenti =
    rimozione.corpoFunzione !== undefined &&
    defA.corpoFunzione !== undefined &&
    corpiEquivalenti(rimozione.corpoFunzione, defA.corpoFunzione);

  // Anteprima degli scenari coinvolti: la stessa vista che il catalogo usa
  // per "usatoIn", non una riscansione con regole proprie.
  const usi = trovaUsatoIn(steps, FEATURES_DIR).get(da) ?? [];

  return {
    ok: true as const,
    percorsoDa,
    percorsoA,
    stessoFile,
    testoDaOriginale,
    testoAOriginale,
    testoDopoRimozione: rimozione.testo,
    corpoDa: rimozione.corpoFunzione ?? null,
    corpoA: defA.corpoFunzione ?? null,
    equivalenti,
    scenariCoinvolti: usi,
  };
}

function relativoARepo(assoluto: string): string {
  return path.relative(REPO_ROOT, assoluto).replace(/\\/g, '/');
}

/**
 * GET /api/catalogo/fondi?da=...&a=...
 *
 * Anteprima di sola lettura: cosa cambierebbe, senza cambiare niente. E' la
 * base di "prima di confermare si mostra cosa cambiera'": quanti scenari,
 * quante righe, quale definizione sparirebbe, e se i due comportamenti sono
 * uguali o no.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const da = url.searchParams.get('da');
  const a = url.searchParams.get('a');
  if (!da || !a) {
    return NextResponse.json({ errore: 'servono_due_frasi' }, { status: 400 });
  }
  const validazione = validaRichiesta({ da, a });
  if (!eRisultatoValido(validazione)) {
    return NextResponse.json({ errore: validazione.errore }, { status: validazione.status });
  }

  let preparazione: ReturnType<typeof preparaFusione>;
  try {
    preparazione = preparaFusione(validazione.da, validazione.a);
  } catch (err) {
    console.error('anteprima fusione non riuscita:', err);
    return NextResponse.json({ errore: 'catalogo_non_disponibile' }, { status: 500 });
  }
  if (!('ok' in preparazione)) {
    return NextResponse.json({ errore: preparazione.errore }, { status: preparazione.status });
  }

  // Quanti file .feature verrebbero riscritti, e quante righe in ciascuno —
  // calcolo a sola lettura (dry-run: il testo risultante non si scrive).
  let fileFeatureCoinvolti = 0;
  let righeCoinvolte = 0;
  for (const rel of walkFeatures(FEATURES_DIR)) {
    let contenuto: string;
    try {
      contenuto = fs.readFileSync(path.join(FEATURES_DIR, rel), 'utf-8');
    } catch {
      continue;
    }
    const { sostituzioni } = riscriviScenario(contenuto, validazione.da, validazione.a);
    if (sostituzioni > 0) {
      fileFeatureCoinvolti++;
      righeCoinvolte += sostituzioni;
    }
  }

  return NextResponse.json({
    equivalenti: preparazione.equivalenti,
    corpoDa: preparazione.corpoDa,
    corpoA: preparazione.corpoA,
    definizionePersa: relativoARepo(preparazione.percorsoDa),
    fileFeatureCoinvolti,
    righeCoinvolte,
    scenariCoinvolti: preparazione.scenariCoinvolti,
  });
}

/**
 * POST /api/catalogo/fondi
 *
 * Corpo: `{ da, a, procediNonostanteDifferenza? }`. Esegue la fusione vera.
 * Vedi il commento in testa al file per le garanzie (tutto o niente,
 * annullamento, corpi diversi).
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta_non_ammessa' }, { status: 403 });
  }

  let corpoGrezzo: CorpoRichiesta;
  try {
    corpoGrezzo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta_non_leggibile' }, { status: 400 });
  }
  if (typeof corpoGrezzo !== 'object' || corpoGrezzo === null) {
    return NextResponse.json({ errore: 'richiesta_non_leggibile' }, { status: 400 });
  }

  const validazione = validaRichiesta(corpoGrezzo);
  if (!eRisultatoValido(validazione)) {
    return NextResponse.json({ errore: validazione.errore }, { status: validazione.status });
  }
  const { da, a, procediNonostanteDifferenza } = validazione;

  let preparazione: ReturnType<typeof preparaFusione>;
  try {
    preparazione = preparaFusione(da, a);
  } catch (err) {
    console.error('fusione non riuscita in fase di preparazione:', err);
    return NextResponse.json({ errore: 'catalogo_non_disponibile' }, { status: 500 });
  }
  if (!('ok' in preparazione)) {
    return NextResponse.json({ errore: preparazione.errore }, { status: preparazione.status });
  }

  if (!preparazione.equivalenti && !procediNonostanteDifferenza) {
    // Non si decide al posto del tester: si rifiuta con la diagnosi, la
    // finestra la mostra e chiede conferma esplicita per procedere comunque.
    return NextResponse.json(
      {
        errore: 'corpi_diversi',
        corpoDa: preparazione.corpoDa,
        corpoA: preparazione.corpoA,
      },
      { status: 409 }
    );
  }

  // Le riscritture degli scenari, calcolate TUTTE prima di scrivere: uno
  // scenario che restasse a meta' citerebbe uno step sparito.
  const scritture: { percorso: string; testoNuovo: string; testoPrecedente: string }[] = [];

  if (preparazione.stessoFile) {
    scritture.push({
      percorso: preparazione.percorsoDa,
      testoNuovo: preparazione.testoDopoRimozione,
      testoPrecedente: preparazione.testoDaOriginale,
    });
  } else {
    scritture.push({
      percorso: preparazione.percorsoDa,
      testoNuovo: preparazione.testoDopoRimozione,
      testoPrecedente: preparazione.testoDaOriginale,
    });
    // Il file di `a` non cambia (si tiene sempre il suo comportamento), ma
    // entra comunque nell'istantanea di annullamento per simmetria e perche'
    // una fusione futura potrebbe estenderlo: costa poco, protegge di piu'.
  }

  for (const rel of walkFeatures(FEATURES_DIR)) {
    const percorsoAssoluto = path.join(FEATURES_DIR, rel);
    let contenuto: string;
    try {
      contenuto = fs.readFileSync(percorsoAssoluto, 'utf-8');
    } catch {
      continue;
    }
    const { testo, sostituzioni } = riscriviScenario(contenuto, da, a);
    if (sostituzioni > 0) {
      scritture.push({ percorso: percorsoAssoluto, testoNuovo: testo, testoPrecedente: contenuto });
    }
  }

  // Istantanea PRIMA di scrivere: e' quello che "annulla" rimette a posto.
  try {
    fs.mkdirSync(CARTELLA_ANNULLAMENTO, { recursive: true });
    fs.writeFileSync(
      FILE_ANNULLAMENTO,
      JSON.stringify(
        {
          quando: new Date().toISOString(),
          da,
          a,
          file: scritture.map((s) => ({ percorso: s.percorso, testoPrecedente: s.testoPrecedente })),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (err) {
    console.error("impossibile salvare l'istantanea di annullamento, fusione annullata per sicurezza:", err);
    return NextResponse.json({ errore: 'annullamento_non_disponibile' }, { status: 500 });
  }

  // Solo ora si scrive. Se una scrittura fallisse a meta', si ripristina
  // subito quanto gia' scritto usando la stessa istantanea appena salvata:
  // tutto o niente vale anche per un guasto del disco a meta' operazione.
  const gia_scritti: { percorso: string; testoPrecedente: string }[] = [];
  try {
    for (const { percorso, testoNuovo, testoPrecedente } of scritture) {
      fs.writeFileSync(percorso, testoNuovo, 'utf-8');
      gia_scritti.push({ percorso, testoPrecedente });
    }
  } catch (err) {
    console.error('scrittura interrotta a meta\', ripristino i file gia\' toccati:', err);
    for (const { percorso, testoPrecedente } of gia_scritti) {
      try {
        fs.writeFileSync(percorso, testoPrecedente, 'utf-8');
      } catch (erroreRipristino) {
        console.error(`ripristino fallito per ${percorso}:`, erroreRipristino);
      }
    }
    return NextResponse.json({ errore: 'scrittura_fallita_ripristinata' }, { status: 500 });
  }

  const catalogoRigenerato = tentaRigenerazioneCatalogo();

  return NextResponse.json({
    ok: true,
    fileFeatureAggiornati: scritture.length - 1,
    definizioneRimossa: relativoARepo(preparazione.percorsoDa),
    equivalenti: preparazione.equivalenti,
    catalogoRigenerato,
  });
}
