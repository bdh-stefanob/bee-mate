import * as fs from 'fs';
import { haParametri } from './riscrittura-step';
import { estraiDefinizione } from './fusione-step';
import { percorsoDefinizione } from './percorso-definizione';
import { firmaDi, improntaDiElenco } from './cache-file';
import type { CatalogStep } from './types';

/**
 * descrizione-step.ts
 * --------------------
 * Dal catalogo si vede la frase, i componenti, quanti scenari la usano — ma
 * non COSA succede quando quello step gira. E' la stessa informazione che
 * gia' serve alla fusione (`estraiDefinizione` in `fusione-step.ts`, che legge
 * il corpo di una definizione senza scriverci sopra): qui la si riusa per
 * mostrarla, non per confrontarla.
 *
 * NON SI INVENTA NIENTE: si prova a derivare una frase leggibile (le chiamate
 * ai metodi delle Page Object, in ordine — lo stile che `generate-emit.ts`
 * produce sempre: `await paginaX.metodoY(...)`). Se il corpo non si presta
 * (zero chiamate riconosciute — codice scritto a mano in un altro stile,
 * assegnazioni, logica di controllo...) non si prova a raccontarlo lo stesso:
 * resta solo il codice, cosi' com'e' (`corpo`), ed e' la schermata a decidere
 * se mostrarlo.
 *
 * STESSO LIMITE EREDITATO da `fusione-step.ts`: solo frasi senza parametri
 * ({string}/{int}/...) — `estraiDefinizione` rifiuta le altre. Per quelle non
 * si tenta nulla: quelle poche righe restano senza "cosa fa" nel catalogo,
 * piuttosto che rischiare un match sbagliato sul segnaposto letterale.
 */

const OGGETTI_NON_PAGE_OBJECT = new Set(['this', 'process', 'console', 'Promise', 'Math', 'JSON']);

/**
 * Le chiamate `oggetto.metodo(...)`, nell'ordine in cui compaiono nel corpo,
 * con gli argomenti tolti (possono contenere email/password di test — non e'
 * questa la sede per mostrarli, il codice grezzo in `corpo` li ha gia' se
 * servono). `null` se non se ne trova nessuna: e' il segnale "non interpretabile".
 */
export function estraiChiamatePageObject(corpo: string): string[] | null {
  const pattern = /([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g;
  const chiamate: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(corpo))) {
    const [, oggetto, metodo] = m;
    if (OGGETTI_NON_PAGE_OBJECT.has(oggetto)) continue;
    chiamate.push(`${oggetto}.${metodo}()`);
  }
  return chiamate.length > 0 ? chiamate : null;
}

export interface ComportamentoStep {
  /** Le chiamate alle Page Object, in ordine — assente se il corpo non e' interpretabile. */
  chiamate?: string[];
  /** Il corpo grezzo del gestore, sempre presente quando la definizione si legge. */
  corpo: string;
}

/**
 * Legge il "cosa fa" di uno step per l'intero catalogo, in un solo passaggio
 * per file (un file di step ne definisce tipicamente molti: aprirlo una volta
 * sola per ciascuno, non una volta per step).
 *
 * Di sola lettura: nessuna scrittura, nessuna modifica allo step-catalog.
 */
export function leggiComportamenti(
  cartellaSrc: string,
  steps: readonly Pick<CatalogStep, 'expression' | 'sourceRef'>[]
): Map<string, ComportamentoStep> {
  // Con 2000 voci il conto (cercare ogni definizione nel suo file) costa piu'
  // di mezzo secondo, e il catalogo lo chiede a ogni apertura. Il risultato
  // dipende solo dall'elenco degli step e dal contenuto dei file che li
  // definiscono: finche' nessuno dei due cambia, e' lo stesso. Un file toccato
  // da poco non si da' mai per buono (vedi `cache-file.ts`).
  const senzaParametri = steps.filter((s) => !haParametri(s.expression));
  const firmeFile = firmeDeiFileDefinizione(cartellaSrc, senzaParametri);
  const chiave =
    firmeFile === null
      ? null
      : improntaDiElenco([...senzaParametri.flatMap((s) => [s.expression, s.sourceRef]), ...firmeFile]);
  const nota = memoComportamenti.get(cartellaSrc);
  if (chiave !== null && nota && nota.chiave === chiave) return new Map(nota.risultato);

  const risultato = calcolaComportamenti(cartellaSrc, steps);
  if (chiave !== null) memoComportamenti.set(cartellaSrc, { chiave, risultato });
  else memoComportamenti.delete(cartellaSrc);
  return new Map(risultato);
}

const memoComportamenti = new Map<string, { chiave: string; risultato: Map<string, ComportamentoStep> }>();

/**
 * Le firme dei file che definiscono gli step (uno per file, non per step), o
 * `null` se qualcuno e' stato toccato da pochissimo: in quel caso non si ricorda nulla.
 */
function firmeDeiFileDefinizione(
  cartellaSrc: string,
  steps: readonly Pick<CatalogStep, 'sourceRef'>[]
): string[] | null {
  const riferimenti = [...new Set(steps.map((s) => s.sourceRef.replace(/:\d+$/, '')))].sort();
  const firme: string[] = [];
  for (const rif of riferimenti) {
    const percorso = percorsoDefinizione(cartellaSrc, rif);
    if (!percorso) {
      firme.push(`${rif}=fuori`);
      continue;
    }
    const f = firmaDi(percorso);
    if (f?.recente) return null;
    firme.push(`${percorso}=${f ? f.firma : 'assente'}`);
  }
  return firme;
}

function calcolaComportamenti(
  cartellaSrc: string,
  steps: readonly Pick<CatalogStep, 'expression' | 'sourceRef'>[]
): Map<string, ComportamentoStep> {
  const risultato = new Map<string, ComportamentoStep>();
  const cacheFile = new Map<string, string | null>();
  const percorsi = new Map<string, string | null>();

  for (const step of steps) {
    if (haParametri(step.expression)) continue; // vedi il limite ereditato in testa al file

    // Il percorso si risolve (con la guardia sui collegamenti, che tocca il
    // disco) una volta per file, non una volta per step.
    const rif = step.sourceRef.replace(/:\d+$/, '');
    let percorso = percorsi.get(rif);
    if (percorso === undefined) {
      percorso = percorsoDefinizione(cartellaSrc, rif);
      percorsi.set(rif, percorso);
    }
    if (!percorso) continue;

    let testo = cacheFile.get(percorso);
    if (testo === undefined) {
      try {
        testo = fs.readFileSync(percorso, 'utf-8');
      } catch {
        testo = null;
      }
      cacheFile.set(percorso, testo);
    }
    if (testo === null) continue;

    const definizione = estraiDefinizione(testo, step.expression);
    if (definizione.trovate !== 1 || definizione.corpoFunzione === undefined) continue;

    const corpo = definizione.corpoFunzione.trim();
    risultato.set(step.expression, {
      corpo,
      chiamate: estraiChiamatePageObject(corpo) ?? undefined,
    });
  }

  return risultato;
}
