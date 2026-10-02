import * as path from 'path';
import type { CatalogStep, StepComponentRef } from './types';
import { walkFeatures } from './features';
import { CachePerFile, improntaDiElenco } from './cache-file';
import { computeComponentImpact } from './component-impact';
import { leggiComportamenti, type ComportamentoStep } from './descrizione-step';

/**
 * catalogo.ts
 * -----------
 * Cio' che serve alla schermata Catalogo in un'unica chiamata: gli step, i
 * componenti che toccano, e — la parte che non sta gia' nel catalogo — GLI
 * SCENARI CHE USANO OGNUNO. Il catalogo dice solo "questo step esiste"; qui si
 * risponde a "e se lo tolgo, cosa smette di girare".
 *
 * PERCHE' UN MATCH A ESPRESSIONE-REGOLARE E NON UN CONFRONTO LETTERALE
 * Uno step del catalogo e' un'espressione Cucumber (`the page shows {string}`),
 * mentre la riga nel file `.feature` ha il parametro gia' sostituito
 * (`Then the page shows "buongiorno"`). Un confronto per uguaglianza letterale
 * non troverebbe mai quello step in uso. Si traduce percio' l'espressione in
 * un'espressione regolare che riconosce {string}/{int}/{float}/{word} — i
 * segnaposto che genera davvero questo progetto — e si lascia letterale tutto
 * il resto. Non e' un motore di Cucumber Expressions completo: copre cio' che
 * il generatore produce oggi, non ogni sintassi possibile.
 */

export interface UsoScenario {
  /** Percorso relativo a `src/features/`, con separatori `/`. */
  file: string;
  scenario: string;
  /** Riga della frase nel file, 1-based. */
  riga: number;
}

export interface StepCatalogo {
  espressione: string;
  documentato: boolean;
  /** Lo stato nel catalogo (`implemented`/`wanted`/...): serve ai filtri e ai numeri della pagina. */
  stato: CatalogStep['status'];
  /** La frase per il tester (`doc.intent`); assente se lo step non e' documentato. */
  intento?: string;
  /** L'applicazione a cui appartiene (`common`/`generated` compresi): vedi `riconciliazione.ts`. */
  app: string;
  componenti: StepComponentRef[];
  usatoIn: UsoScenario[];
  /** Cosa fa quando gira, se il corpo si riesce a leggere: vedi `descrizione-step.ts`. Assente per step con parametri o la cui definizione non si trova/e' ambigua. */
  comportamento?: ComportamentoStep;
}

export interface ComponenteCatalogo {
  role: string;
  name: string;
  page?: string;
  /** Presente solo quando le occorrenze dichiarano pagine diverse: vedi component-impact.ts. */
  pagineAmbigue?: string[];
  step: string[];
  /** Le applicazioni degli step che dichiarano questo componente, senza duplicati, in ordine alfabetico. */
  apps: string[];
}

export interface DatiCatalogo {
  step: StepCatalogo[];
  componenti: ComponenteCatalogo[];
}

function escapeRegExp(testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SEGNAPOSTO: Record<string, string> = {
  '{string}': '"([^"]*)"',
  '{int}': '(-?\\d+)',
  '{float}': '(-?\\d+(?:\\.\\d+)?)',
  '{word}': '(\\S+)',
};

/**
 * Traduce un'espressione del catalogo in un'espressione regolare che
 * riconosce la stessa frase con i parametri gia' sostituiti. Esportata: la
 * riconciliazione la riusa per sapere se una riscrittura "vede" davvero le
 * righe che promette di aggiornare.
 */
export function espressioneInRegex(espressione: string): RegExp {
  return compilaEspressione(espressione).regex;
}

interface EspressioneCompilata {
  regex: RegExp;
  /** Il testo fisso prima del primo segnaposto vero: ogni frase che la regex riconosce comincia cosi'. */
  prefisso: string;
  /** Nessun segnaposto vero: la regex riconosce una sola frase, l'espressione stessa. */
  letterale: boolean;
}

/** Il lavoro di `espressioneInRegex`, piu' cio' che serve a cercarla in fretta (vedi `creaCercatore`). */
function compilaEspressione(espressione: string): EspressioneCompilata {
  let pattern = '';
  let prefisso = '';
  let letterale = true;
  const aggiungiTesto = (testo: string): void => {
    pattern += escapeRegExp(testo);
    if (letterale) prefisso += testo;
  };
  let i = 0;
  while (i < espressione.length) {
    const apertura = espressione.indexOf('{', i);
    if (apertura === -1) {
      aggiungiTesto(espressione.slice(i));
      break;
    }
    aggiungiTesto(espressione.slice(i, apertura));
    const chiusura = espressione.indexOf('}', apertura);
    if (chiusura === -1) {
      aggiungiTesto(espressione.slice(apertura));
      break;
    }
    const token = espressione.slice(apertura, chiusura + 1);
    const segnaposto = SEGNAPOSTO[token];
    if (segnaposto === undefined) {
      aggiungiTesto(token);
    } else {
      pattern += segnaposto;
      letterale = false;
    }
    i = chiusura + 1;
  }
  return { regex: new RegExp(`^${pattern}$`), prefisso, letterale };
}

interface RigaStep {
  riga: number;
  testo: string;
  scenario: string;
}

/** Le righe Given/When/Then/And/But di un file, ciascuna con lo scenario a cui appartiene. */
function righeStepDiFile(contenuto: string): RigaStep[] {
  const righe = contenuto.split(/\r?\n/);
  let scenarioCorrente = '';
  const risultato: RigaStep[] = [];
  righe.forEach((grezza, i) => {
    const riga = grezza.trim();
    const scenario = riga.match(/^Scenario(?: Outline| Template)?:\s*(.*)$/);
    if (scenario) {
      scenarioCorrente = scenario[1].trim();
      return;
    }
    const step = riga.match(/^(?:Given|When|Then|And|But)\s+(.*)$/);
    if (step) {
      risultato.push({ riga: i + 1, testo: step[1].trim(), scenario: scenarioCorrente });
    }
  });
  return risultato;
}

/**
 * Le espressioni regolari si compilano una volta, non a ogni chiamata: un
 * catalogo da 2000 voci le ricostruiva tutte ogni volta. L'espressione e' la
 * chiave e la regex non ha stato (niente flag `g`), quindi si condivide.
 */
const compilatePerEspressione = new Map<string, EspressioneCompilata>();
const MAX_COMPILATE_IN_MEMORIA = 20000;

function compilataDi(espressione: string): EspressioneCompilata {
  let c = compilatePerEspressione.get(espressione);
  if (!c) {
    if (compilatePerEspressione.size >= MAX_COMPILATE_IN_MEMORIA) compilatePerEspressione.clear();
    c = compilaEspressione(espressione);
    compilatePerEspressione.set(espressione, c);
  }
  return c;
}

/**
 * Dato il testo di una riga, la prima espressione del catalogo (nell'ordine del
 * catalogo) che la riconosce, o `null`. Stessa risposta di provarle tutte in
 * ordine, ma senza provarle tutte: con 2000 voci e centinaia di scenari quello
 * era il grosso del conto (~0,5 s a freddo).
 *   - Un'espressione senza segnaposto riconosce una frase sola, se stessa: basta
 *     una tabella da testo a posizione.
 *   - Una con segnaposto riconosce solo frasi che cominciano con il suo testo
 *     fisso: si prova la regex solo se la riga comincia cosi'.
 */
function creaCercatore(espressioni: readonly string[]): (testo: string) => string | null {
  const esatte = new Map<string, number>();
  const conSegnaposto: Array<{ indice: number; prefisso: string; regex: RegExp }> = [];
  espressioni.forEach((e, indice) => {
    const c = compilataDi(e);
    if (c.letterale) {
      if (!esatte.has(e)) esatte.set(e, indice);
    } else {
      conSegnaposto.push({ indice, prefisso: c.prefisso, regex: c.regex });
    }
  });
  return (testo) => {
    let migliore = esatte.get(testo) ?? Infinity;
    for (const c of conSegnaposto) {
      if (c.indice >= migliore) break;
      if (testo.startsWith(c.prefisso) && c.regex.test(testo)) {
        migliore = c.indice;
        break;
      }
    }
    return migliore === Infinity ? null : espressioni[migliore];
  };
}

let ultimoCercatore: { chiave: string; cerca: (testo: string) => string | null } | null = null;

function cercatoreDi(chiave: string, espressioni: readonly string[]): (testo: string) => string | null {
  if (ultimoCercatore?.chiave !== chiave) ultimoCercatore = { chiave, cerca: creaCercatore(espressioni) };
  return ultimoCercatore.cerca;
}

/**
 * Di ogni file: le righe di step (dipendono solo dal file) e, accanto, gli usi
 * che ne risultano per l'ultimo catalogo visto (la "chiave"). Cambiare catalogo
 * rifa' il confronto delle righe, non rilegge il file.
 */
interface FileAnalizzato {
  righe: RigaStep[];
  usi?: { chiave: string; trovati: Array<[string, UsoScenario]> };
}
const cacheUsi = new CachePerFile<FileAnalizzato>();

/**
 * Per ogni step del catalogo, i file e gli scenari che lo usano davvero
 * (scansionando i `.feature`, non fidandosi di un indice che potrebbe non
 * essere aggiornato).
 *
 * "Scansionando" non vuol dire rileggere tutto a ogni chiamata: per ogni file
 * si ricorda cio' che ha trovato finche' il file non cambia e finche' il
 * catalogo e' lo stesso (vedi `cache-file.ts`). A 2000 voci e 300 scenari
 * erano ~1,5 s a chiamata, in cui il server non serviva nient'altro.
 */
export function trovaUsatoIn(
  steps: readonly CatalogStep[],
  featuresDir: string
): Map<string, UsoScenario[]> {
  const risultato = new Map<string, UsoScenario[]>();
  for (const s of steps) risultato.set(s.expression, []);

  const espressioni = steps.map((s) => s.expression);
  const chiave = improntaDiElenco(espressioni);
  const vivi = new Set<string>();

  for (const rel of walkFeatures(featuresDir)) {
    const percorso = path.join(featuresDir, rel);
    vivi.add(percorso);
    const file = cacheUsi.ottieni(percorso, '', (contenuto) => ({ righe: righeStepDiFile(contenuto) }));
    if (!file) continue;
    if (file.usi?.chiave !== chiave) {
      const cerca = cercatoreDi(chiave, espressioni);
      const trovati: Array<[string, UsoScenario]> = [];
      for (const { riga, testo, scenario } of file.righe) {
        // Il primo che combacia vince: le espressioni del catalogo sono pensate
        // per non sovrapporsi. Se due ne coprissero la stessa riga, sarebbe
        // proprio il tipo di ambiguita' che la riconciliazione deve segnalare,
        // non qualcosa che questa funzione di sola lettura deve arbitrare.
        const espressione = cerca(testo);
        if (espressione !== null) trovati.push([espressione, { file: rel, scenario, riga }]);
      }
      file.usi = { chiave, trovati };
    }
    // Copie: chi riceve la mappa non deve poter sporcare la cache.
    for (const [espressione, uso] of file.usi.trovati) risultato.get(espressione)!.push({ ...uso });
  }
  cacheUsi.pota(featuresDir + path.sep, vivi);

  return risultato;
}

/**
 * I dati per la schermata Catalogo: step con i loro usi, e la mappa al
 * contrario dei componenti.
 *
 * `cartellaSrc` e' opzionale e attiva il "cosa fa" di ogni step
 * (`comportamento`, vedi `descrizione-step.ts`): serve il percorso vero di
 * `src/` per leggere le definizioni. Senza (i test che passano un catalogo
 * finto, o una radice inventata) gli step restano senza `comportamento` —
 * stato onesto, non un errore.
 */
export function costruisciCatalogo(
  steps: readonly CatalogStep[],
  featuresDir: string,
  cartellaSrc?: string
): DatiCatalogo {
  const usi = trovaUsatoIn(steps, featuresDir);
  const comportamenti = cartellaSrc ? leggiComportamenti(cartellaSrc, steps) : new Map<string, ComportamentoStep>();

  const step: StepCatalogo[] = steps.map((s) => ({
    espressione: s.expression,
    documentato: s.documented,
    stato: s.status,
    intento: s.doc?.intent,
    app: s.app,
    componenti: s.components ?? [],
    usatoIn: usi.get(s.expression) ?? [],
    comportamento: comportamenti.get(s.expression),
  }));

  const impatto = computeComponentImpact(steps);
  const componenti: ComponenteCatalogo[] = impatto.map((c) => ({
    role: c.role,
    name: c.name,
    page: c.page,
    pagineAmbigue: c.pagineAmbigue,
    step: c.steps.map((s) => s.expression),
    apps: [...new Set(c.steps.map((s) => s.app))].sort(),
  }));

  return { step, componenti };
}
