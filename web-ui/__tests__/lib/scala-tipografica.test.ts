import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  TITOLO_PAGINA,
  TITOLO_SEZIONE,
  TITOLO_GRUPPO,
  TESTO_LETTURA,
  FRASE_DI_PASSO,
} from '../../src/lib/scala-tipografica';

/**
 * La scala dei titoli e la leggibilita' (audit UI del 4/10, §3).
 *
 * I difetti che questi casi fermano: H1 a 20 px e H2 a 16 px in peso 500 (quasi
 * indistinguibili dal testo); nel Catalogo 106 elementi su 170 a 12 px, comprese
 * le frasi dei passi, che sono il contenuto principale; H3 di sezione a 12 px in
 * maiuscolo; il testo dello scenario nel carattere proporzionale con i commenti in
 * corsivo.
 */
const SRC = path.resolve(__dirname, '..', '..', 'src');

function sorgenti(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((v) => {
    const pieno = path.join(dir, v.name);
    if (v.isDirectory()) return sorgenti(pieno);
    return /\.tsx$/.test(v.name) ? [pieno] : [];
  });
}

const rel = (f: string) => path.relative(SRC, f).split(path.sep).join('/');

/** Le aperture `<hN ...>` di un file, con la riga (le classi possono stare su piu' righe). */
export function apertureTitoli(testo: string, livello: number): Array<{ riga: number; tag: string }> {
  const out: Array<{ riga: number; tag: string }> = [];
  const re = new RegExp(`<h${livello}\\b(?:[^>]|=>)*>`, 'g');
  for (const m of testo.matchAll(re)) {
    out.push({ riga: testo.slice(0, m.index).split('\n').length, tag: m[0] });
  }
  return out;
}

function titoliSenza(livello: number, ok: (tag: string) => boolean): string[] {
  const colpevoli: string[] = [];
  for (const file of sorgenti(SRC)) {
    for (const a of apertureTitoli(fs.readFileSync(file, 'utf-8'), livello)) {
      if (!ok(a.tag)) colpevoli.push(`${rel(file)}:${a.riga}`);
    }
  }
  return colpevoli;
}

describe('la scala dei titoli', () => {
  it('le dimensioni sono quelle decise: H1 24 px, H2 18 px in peso 600, H3 non sotto i 14 px', () => {
    expect(TITOLO_PAGINA).toMatch(/\btext-2xl\b/);
    expect(TITOLO_PAGINA).toMatch(/\bfont-semibold\b/);
    expect(TITOLO_SEZIONE).toMatch(/\btext-lg\b/);
    expect(TITOLO_SEZIONE).toMatch(/\bfont-semibold\b/);
    expect(TITOLO_GRUPPO).toMatch(/\btext-sm\b/);
    expect(TITOLO_GRUPPO).not.toMatch(/uppercase/);
    expect(TITOLO_GRUPPO).not.toMatch(/\btext-xs\b/);
  });

  it('ogni H1 usa il titolo di pagina', () => {
    expect(titoliSenza(1, (t) => t.includes('TITOLO_PAGINA'))).toEqual([]);
  });

  it('ogni H2 usa il titolo di sezione', () => {
    expect(titoliSenza(2, (t) => t.includes('TITOLO_SEZIONE'))).toEqual([]);
  });

  it('ogni H3 usa il titolo di gruppo (nessuno a 12 px, nessuno in maiuscolo)', () => {
    expect(titoliSenza(3, (t) => t.includes('TITOLO_GRUPPO'))).toEqual([]);
  });

  it('il controllo riconosce un titolo che non usa la scala, anche su piu\' righe', () => {
    const t = '<h2\n  id="x"\n  className="font-medium"\n  onClick={() => f()}\n>';
    expect(apertureTitoli(t, 2)).toHaveLength(1);
    expect(apertureTitoli(t, 2)[0].tag).not.toContain('TITOLO_SEZIONE');
  });

  it('il testo di lettura e l\'etichetta delle frasi', () => {
    expect(TESTO_LETTURA).toMatch(/max-w-\[80ch\]/);
    expect(FRASE_DI_PASSO).toMatch(/\bfont-mono\b/);
    expect(FRASE_DI_PASSO).toMatch(/\btext-sm\b/);
  });
});

describe('il Catalogo: le frasi a 14 px', () => {
  const dir = path.join(SRC, 'components', 'cruscotto', 'catalogo');

  /** Gli elementi in monospazio (le frasi dei passi e i nomi dei componenti) a 12 px. */
  function frasiPiccole(testo: string): number[] {
    const trovate: number[] = [];
    testo.split(/\r?\n/).forEach((riga, i) => {
      if (/\bfont-mono\b/.test(riga) && /\btext-xs\b/.test(riga)) trovate.push(i + 1);
    });
    return trovate;
  }

  it('il controllo riconosce una frase a 12 px', () => {
    expect(frasiPiccole('<span className="break-words font-mono text-xs">')).toEqual([1]);
    expect(frasiPiccole('<span className="break-words font-mono text-sm">')).toEqual([]);
  });

  it('nessuna frase di passo (o nome di componente) del Catalogo e\' a 12 px', () => {
    const colpevoli: string[] = [];
    for (const file of sorgenti(dir)) {
      for (const riga of frasiPiccole(fs.readFileSync(file, 'utf-8'))) colpevoli.push(`${rel(file)}:${riga}`);
    }
    expect(colpevoli).toEqual([]);
  });

  it('nessun titolo o etichetta di sezione del Catalogo e\' a 12 px in maiuscolo', () => {
    const colpevoli: string[] = [];
    for (const file of sorgenti(dir)) {
      fs.readFileSync(file, 'utf-8').split(/\r?\n/).forEach((riga, i) => {
        if (/\buppercase\b/.test(riga)) colpevoli.push(`${rel(file)}:${i + 1}`);
      });
    }
    expect(colpevoli).toEqual([]);
  });
});

describe('Scenari: il testo dello scenario in monospazio', () => {
  const testo = fs.readFileSync(path.join(SRC, 'components', 'GherkinLeggibile.tsx'), 'utf-8');

  it('il riquadro e\' in Geist Mono, a 14 px', () => {
    const radice = testo.match(/role="region"[\s\S]*?className="([^"]*)"/);
    expect(radice).not.toBeNull();
    expect(radice![1]).toMatch(/\bfont-mono\b/);
    expect(radice![1]).toMatch(/\btext-sm\b/);
  });

  it('i commenti non sono in corsivo (il monospazio non ha un corsivo vero)', () => {
    expect(testo).not.toMatch(/\bitalic\b/);
  });

  it('il testo non e\' in grassetto 700 (la scala dei pesi e\' 400/500/600)', () => {
    expect(testo).not.toMatch(/\bfont-bold\b/);
  });

  it('il rientro si misura in caratteri: con il monospazio e\' esatto', () => {
    expect(testo).toMatch(/paddingLeft: `\$\{r\.rientro\}ch`/);
  });
});

describe('Scenari: nessun titolo di gruppo in maiuscolo a 12 px', () => {
  it('ElencoScenari, PannelloScenario, SchedaEsito, PannelloModifica', () => {
    const colpevoli: string[] = [];
    for (const f of [
      'components/cruscotto/scenari/ElencoScenari.tsx',
      'components/cruscotto/scenari/PannelloScenario.tsx',
      'components/cruscotto/scenari/SchedaEsito.tsx',
      'components/cruscotto/scenari/modifica/PannelloModifica.tsx',
    ]) {
      fs.readFileSync(path.join(SRC, f), 'utf-8').split(/\r?\n/).forEach((riga, i) => {
        if (/\buppercase\b/.test(riga)) colpevoli.push(`${f}:${i + 1}`);
      });
    }
    expect(colpevoli).toEqual([]);
  });
});
