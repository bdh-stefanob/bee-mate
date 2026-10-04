import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Un raggio per tipo di elemento (audit del 4/10, §6).
 *
 * Il difetto che questo caso ferma: nel codice convivevano `rounded` (4 px),
 * `rounded-md` (8), `rounded-lg` (10) e `rounded-4xl` (26) scelti caso per caso, e
 * perfino il pulsante blu pieno aveva due raggi (8 px quello fatto a mano, 10 px
 * quello di `ui/button`). I quattro tipi hanno ciascuno il suo token in
 * `globals.css`, costruito sui `--radius-*` della scala; nel codice si usa solo la
 * classe del tipo (`rounded-controllo`, `rounded-scheda`, `rounded-pillola`,
 * `rounded-dettaglio`) e mai un raggio scritto a mano.
 *
 * Chi scrive un componente nuovo sceglie il tipo:
 *  - controllo: tutto cio' che si preme o in cui si scrive (pulsanti, campi, voci di
 *    menu, linguette, suggerimenti al passaggio del mouse);
 *  - scheda: ogni contenitore di contenuto con bordo o fondo (schede, riquadri,
 *    avvisi, dialoghi, blocchi di codice, immagini incorniciate, scheletri di caricamento);
 *  - pillola: etichette e contatori, e le forme tonde (punti, interruttori);
 *  - dettaglio: i segni piccoli dentro una riga di testo (evidenziazioni, frammenti di comando).
 */
const RADICE = path.resolve(__dirname, '..', '..');
const SRC = path.join(RADICE, 'src');

export const CLASSI_AMMESSE = new Set([
  'rounded-controllo',
  'rounded-scheda',
  'rounded-pillola',
  'rounded-dettaglio',
  // Nessun raggio: non e' un raggio da scegliere.
  'rounded-none',
]);

/**
 * File che un altro lavoro sta riscrivendo in parallelo (S6) e che S5 non ha toccato per non
 * fare conflitti. Chi unisce S6 li adatta con la stessa regola (pulsanti e campi -> controllo;
 * schede e riquadri, anche il blocco di testo a spaziatura fissa -> scheda) e toglie la riga
 * da qui: il controllo sotto fallisce se un file in elenco e' gia' a posto.
 */
export const IN_ATTESA = new Set<string>(['app/(cruscotto)/registra/page.tsx']);

// `rounded`, `rounded-md`, `rounded-[min(...)]`, anche dopo una variante (`hover:`, `in-data-[x]:`).
const CLASSE_ROUNDED = /(?<![\w-])rounded(?:-(?:\[[^\]\s]*\]|[a-z0-9]+))?(?![\w-])/g;
// Un `borderRadius` e' ammesso solo se rimanda a un token (`'var(--radius-dettaglio)'`).
const RAGGIO_A_MANO = /\bborderRadius\s*:\s*(?!['"]var\(--radius-)(?=\S)|\bborder-radius\s*:\s*(?!var\(--radius-)(?=\S)/;

function sorgenti(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((v) => {
    const pieno = path.join(dir, v.name);
    if (v.isDirectory()) return sorgenti(pieno);
    return /\.(tsx|ts)$/.test(v.name) ? [pieno] : [];
  });
}

/** Le classi `rounded*` di un sorgente che non sono dei quattro tipi, con la riga. */
export function raggiFuoriRegola(testo: string): { riga: number; classe: string }[] {
  const trovati: { riga: number; classe: string }[] = [];
  testo.split(/\r?\n/).forEach((riga, i) => {
    for (const m of riga.matchAll(CLASSE_ROUNDED)) {
      if (!CLASSI_AMMESSE.has(m[0])) trovati.push({ riga: i + 1, classe: m[0] });
    }
    if (RAGGIO_A_MANO.test(riga)) trovati.push({ riga: i + 1, classe: 'borderRadius scritto a mano' });
  });
  return trovati;
}

describe('un raggio per tipo di elemento', () => {
  it('il controllo riconosce un raggio fuori regola, anche dopo una variante o in forma arbitraria', () => {
    expect(raggiFuoriRegola('className="rounded-md border"')).toEqual([{ riga: 1, classe: 'rounded-md' }]);
    expect(raggiFuoriRegola('className="rounded border"')).toEqual([{ riga: 1, classe: 'rounded' }]);
    expect(raggiFuoriRegola('"in-data-[slot=g]:rounded-lg"')).toEqual([{ riga: 1, classe: 'rounded-lg' }]);
    expect(raggiFuoriRegola('"rounded-[min(var(--radius-md),10px)]"')).toEqual([
      { riga: 1, classe: 'rounded-[min(var(--radius-md),10px)]' },
    ]);
    expect(raggiFuoriRegola('"rounded-full"')).toEqual([{ riga: 1, classe: 'rounded-full' }]);
    expect(raggiFuoriRegola("style={{ borderRadius: '4px' }}")).toEqual([{ riga: 1, classe: 'borderRadius scritto a mano' }]);
    expect(raggiFuoriRegola("borderRadius: 'var(--radius-dettaglio)',")).toEqual([]);
  });

  it('il controllo lascia passare i quattro tipi, anche con una variante, e le parole che non sono classi', () => {
    expect(raggiFuoriRegola('className="rounded-controllo rounded-scheda rounded-pillola rounded-dettaglio rounded-none"')).toEqual([]);
    expect(raggiFuoriRegola('"hover:rounded-controllo in-data-[slot=g]:rounded-scheda"')).toEqual([]);
    expect(raggiFuoriRegola('// angoli arrotondati: nessuna classe')).toEqual([]);
  });

  it('globals.css definisce i quattro tipi sui token --radius-* della scala', () => {
    const css = fs.readFileSync(path.join(SRC, 'app/globals.css'), 'utf-8');
    expect(css).toMatch(/--radius-controllo:\s*var\(--radius-md\)/);
    expect(css).toMatch(/--radius-scheda:\s*var\(--radius-lg\)/);
    expect(css).toMatch(/--radius-dettaglio:\s*var\(--radius-sm\)/);
    expect(css).toMatch(/--radius-pillola:\s*9999px/);
  });

  const relativo = (file: string) => path.relative(SRC, file).split(path.sep).join('/');

  it('nessun componente usa un raggio fuori dai quattro tipi', () => {
    const colpevoli: string[] = [];
    for (const file of sorgenti(SRC)) {
      if (IN_ATTESA.has(relativo(file))) continue;
      for (const { riga, classe } of raggiFuoriRegola(fs.readFileSync(file, 'utf-8'))) {
        colpevoli.push(`${relativo(file)}:${riga} ${classe}`);
      }
    }
    expect(colpevoli).toEqual([]);
  });

  it("un file in attesa deve avere ancora qualcosa da adattare: se e' pulito, toglilo dall'elenco", () => {
    for (const rel of IN_ATTESA) {
      const testo = fs.readFileSync(path.join(SRC, rel), 'utf-8');
      expect(raggiFuoriRegola(testo).length, rel).toBeGreaterThan(0);
    }
  });
});
