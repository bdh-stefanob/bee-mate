import * as fs from 'fs';
import * as path from 'path';
import type { CatalogStep, StepComponentRef } from './types';
import { walkFeatures } from './features';
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
  let pattern = '';
  let i = 0;
  while (i < espressione.length) {
    const apertura = espressione.indexOf('{', i);
    if (apertura === -1) {
      pattern += escapeRegExp(espressione.slice(i));
      break;
    }
    pattern += escapeRegExp(espressione.slice(i, apertura));
    const chiusura = espressione.indexOf('}', apertura);
    if (chiusura === -1) {
      pattern += escapeRegExp(espressione.slice(apertura));
      break;
    }
    const token = espressione.slice(apertura, chiusura + 1);
    pattern += SEGNAPOSTO[token] ?? escapeRegExp(token);
    i = chiusura + 1;
  }
  return new RegExp(`^${pattern}$`);
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
 * Per ogni step del catalogo, i file e gli scenari che lo usano davvero
 * (scansionando i `.feature`, non fidandosi di un indice che potrebbe non
 * essere aggiornato).
 */
export function trovaUsatoIn(
  steps: readonly CatalogStep[],
  featuresDir: string
): Map<string, UsoScenario[]> {
  const risultato = new Map<string, UsoScenario[]>();
  for (const s of steps) risultato.set(s.expression, []);

  const perStep = steps.map((s) => ({ espressione: s.expression, regex: espressioneInRegex(s.expression) }));

  for (const rel of walkFeatures(featuresDir)) {
    let contenuto = '';
    try {
      contenuto = fs.readFileSync(path.join(featuresDir, rel), 'utf-8');
    } catch {
      continue;
    }
    for (const { riga, testo, scenario } of righeStepDiFile(contenuto)) {
      // Il primo che combacia vince: le espressioni del catalogo sono pensate
      // per non sovrapporsi. Se due ne coprissero la stessa riga, sarebbe
      // proprio il tipo di ambiguita' che la riconciliazione deve segnalare,
      // non qualcosa che questa funzione di sola lettura deve arbitrare.
      for (const { espressione, regex } of perStep) {
        if (regex.test(testo)) {
          risultato.get(espressione)!.push({ file: rel, scenario, riga });
          break;
        }
      }
    }
  }

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
