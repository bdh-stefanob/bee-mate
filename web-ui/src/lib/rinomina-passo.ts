import * as fs from 'fs';
import * as path from 'path';
import { dentroLaCartellaSuDisco } from './percorsi-disco';
import { walkFeatures } from './features';
import type { CatalogStep } from './types';
import { riscriviScenario, riscriviDefinizione, haParametri, RiscritturaNonSupportata } from './riscrittura-step';

/**
 * rinomina-passo.ts
 * -----------------
 * Il piano di rinomina di una frase di step: cosa si dovrebbe scrivere,
 * senza scriverlo. Estratto da `POST /api/catalogo/riconcilia` perche' la
 * stessa operazione serve anche alla modifica degli scenari
 * (docs/superpowers/specs/2026-10-01-modifica-scenari-e-dismissione-portale-design.md,
 * A3): una sola copia della logica.
 *
 * Rinomina quella frase OVUNQUE — negli scenari `.feature` e nella
 * definizione dello step — oppure non tocca niente. Regole non negoziabili:
 *
 * - Se `a` esiste gia' come step diverso, si rifiuta: fondere due definizioni
 *   e' un'altra operazione, non questa.
 * - Le due riscritture (scenari + definizione) si CALCOLANO entrambe prima di
 *   scrivere anche un solo file: una riscrittura a meta' lascerebbe uno
 *   scenario che cita uno step inesistente, che e' peggio del doppione che si
 *   voleva togliere. Per questo la funzione restituisce le scritture e le
 *   lascia eseguire a chi la chiama.
 * - Frasi con un parametro (`{string}`, `{int}`, ...) non sono supportate:
 *   vedi `riscrittura-step.ts` per il perche'.
 */

/** Le cartelle da cui si legge. Parametri, non costanti: la funzione non conosce il repository. */
export interface RadiciRinomina {
  /** Radice del repository (vi sta `step-catalog.json`). */
  repoRoot: string;
  /** `src/features/` */
  featuresDir: string;
}

export interface Scrittura {
  percorso: string;
  testo: string;
}

export type PianoRinomina =
  | {
      ok: true;
      /** La definizione per prima, poi gli scenari. */
      scritture: Scrittura[];
      /** Quanti `.feature` cambiano (le scritture meno la definizione). */
      fileFeatureAggiornati: number;
    }
  | {
      ok: false;
      /** Stato HTTP con cui la rotta risponde. */
      stato: number;
      /** Codice stabile dell'errore. */
      errore: string;
    };

function rifiuto(stato: number, errore: string): PianoRinomina {
  return { ok: false, stato, errore };
}

function leggiCatalogo(repoRoot: string): CatalogStep[] {
  const p = path.join(repoRoot, 'step-catalog.json');
  return (JSON.parse(fs.readFileSync(p, 'utf-8')) as { steps: CatalogStep[] }).steps;
}

/**
 * Il `sourceRef` del catalogo e' un percorso col separatore di Windows,
 * relativo alla radice del repository, con `:riga` in coda
 * (`src\steps\...\x.steps.ts:102`). Si toglie la riga e si valida che resti
 * dentro `src/`, collegamenti simbolici compresi: e' la definizione dello
 * step, il file che la riscrittura modifica davvero.
 */
export function percorsoDefinizione(repoRoot: string, sourceRef: string): string | null {
  const senzaRiga = sourceRef.replace(/:\d+$/, '');
  const relativoASrc = senzaRiga.replace(/\\/g, '/').replace(/^src\//, '');
  return dentroLaCartellaSuDisco(path.join(repoRoot, 'src'), relativoASrc, '.ts');
}

/** Calcola le scritture di una rinomina da `da` ad `a`. Non scrive niente. */
export function pianificaRinomina(radici: RadiciRinomina, da: string, a: string): PianoRinomina {
  if (/[\r\n]/.test(da) || /[\r\n]/.test(a)) return rifiuto(400, 'frase_non_valida');
  if (da === a) return rifiuto(400, 'le_frasi_sono_uguali');
  if (haParametri(da) || haParametri(a)) return rifiuto(400, 'step_con_parametri_non_supportato');

  let steps: CatalogStep[];
  try {
    steps = leggiCatalogo(radici.repoRoot);
  } catch (err) {
    console.error('catalogo non leggibile:', err);
    return rifiuto(500, 'catalogo_non_disponibile');
  }

  const stepDa = steps.find((s) => s.expression === da);
  if (!stepDa) return rifiuto(404, 'step_non_trovato');
  // La fusione di due definizioni e' un'altra operazione: qui si rifiuta con
  // un no chiaro, come dice il contratto.
  if (steps.some((s) => s.expression === a)) return rifiuto(409, 'bersaglio_gia_esistente');

  const percorsoDef = percorsoDefinizione(radici.repoRoot, stepDa.sourceRef);
  if (!percorsoDef || !fs.existsSync(percorsoDef)) return rifiuto(500, 'definizione_non_trovata');

  let nuovaDefinizione: { testo: string; sostituzioni: number };
  try {
    nuovaDefinizione = riscriviDefinizione(fs.readFileSync(percorsoDef, 'utf-8'), da, a);
  } catch (err) {
    if (err instanceof RiscritturaNonSupportata) return rifiuto(400, 'step_con_parametri_non_supportato');
    throw err;
  }
  if (nuovaDefinizione.sostituzioni !== 1) {
    // Zero: la frase non e' scritta li' come ci si aspettava. Piu' di una:
    // stessa frase dichiarata due volte nello stesso file — un'ambiguita' che
    // questa operazione non arbitra. In entrambi i casi non si scrive niente.
    return rifiuto(500, 'definizione_non_trovata');
  }

  const scritture: Scrittura[] = [{ percorso: percorsoDef, testo: nuovaDefinizione.testo }];

  for (const rel of walkFeatures(radici.featuresDir)) {
    const percorsoAssoluto = path.join(radici.featuresDir, rel);
    let contenuto: string;
    try {
      contenuto = fs.readFileSync(percorsoAssoluto, 'utf-8');
    } catch {
      continue;
    }
    const { testo, sostituzioni } = riscriviScenario(contenuto, da, a);
    if (sostituzioni > 0) scritture.push({ percorso: percorsoAssoluto, testo });
  }

  return { ok: true, scritture, fileFeatureAggiornati: scritture.length - 1 };
}
