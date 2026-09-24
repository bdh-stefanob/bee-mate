import * as fs from 'fs';
import * as path from 'path';
import { walkFeatures } from './features';

/**
 * Gli scenari che la schermata Esecuzione puo' offrire.
 *
 * Si offre solo cio' che si puo' eseguire: uno scenario marcato
 * `@non-automatizzato` e' un caso di test scritto e mai automatizzato, che il
 * repository conserva come documento. Cucumber lo salta comunque (vedi
 * `cucumber.js`): offrirlo significherebbe lasciar premere "Lancia" su
 * qualcosa che non parte, e poi mostrare zero passi senza un perche'.
 */

export interface ScenarioEseguibile {
  nome: string;
  /** La riga di `Scenario:` nel file, 1-based: e' cio' che Cucumber accetta dopo i due punti. */
  riga: number;
}

export interface FileScenari {
  /** Percorso relativo a `src/features/`, con separatori `/`. */
  file: string;
  nome: string;
  /** Uscito da una registrazione (`src/features/generated/`). */
  generato: boolean;
  scenari: ScenarioEseguibile[];
  /** Scenari presenti ma solo documentati: non si offrono, si contano. */
  nonAutomatizzati: number;
}

const TAG_DOCUMENTO = '@non-automatizzato';
const CARTELLA_GENERATI = 'generated/';

/** Legge un solo file: nome della Feature e scenari eseguibili, con la loro riga. */
export function leggiScenari(testo: string, file: string): FileScenari {
  const righe = testo.split(/\r?\n/);
  let nome = '';
  let tagFeature: string[] = [];
  let tagInAttesa: string[] = [];
  const scenari: ScenarioEseguibile[] = [];
  let nonAutomatizzati = 0;

  righe.forEach((grezza, i) => {
    const riga = grezza.trim();
    if (riga.startsWith('@')) {
      tagInAttesa.push(...riga.split(/\s+/).filter((t) => t.startsWith('@')));
      return;
    }
    const feature = riga.match(/^Feature:\s*(.*)$/);
    if (feature) {
      nome = feature[1].trim();
      tagFeature = tagInAttesa;
      tagInAttesa = [];
      return;
    }
    const scenario = riga.match(/^Scenario(?: Outline| Template)?:\s*(.*)$/);
    if (scenario) {
      const tag = [...tagFeature, ...tagInAttesa];
      tagInAttesa = [];
      if (tag.includes(TAG_DOCUMENTO)) nonAutomatizzati++;
      else scenari.push({ nome: scenario[1].trim(), riga: i + 1 });
      return;
    }
    // Un tag vale solo per la riga di intestazione che lo segue subito:
    // qualunque altra riga non vuota e non commento lo fa cadere.
    if (riga !== '' && !riga.startsWith('#')) tagInAttesa = [];
  });

  return {
    file,
    nome: nome || path.basename(file, '.feature'),
    generato: file.startsWith(CARTELLA_GENERATI),
    scenari,
    nonAutomatizzati,
  };
}

/**
 * Tutti i file con almeno uno scenario eseguibile. I registrati vengono per
 * primi: sono quelli che il tester ha appena prodotto, ed e' li' che guarda.
 */
export function elencaScenari(cartella: string): FileScenari[] {
  const elenco: FileScenari[] = [];
  for (const rel of walkFeatures(cartella)) {
    let testo = '';
    try {
      testo = fs.readFileSync(path.join(cartella, rel), 'utf-8');
    } catch {
      continue;
    }
    const f = leggiScenari(testo, rel);
    if (f.scenari.length > 0) elenco.push(f);
  }
  return elenco.sort(
    (a, b) => Number(b.generato) - Number(a.generato) || a.file.localeCompare(b.file)
  );
}
