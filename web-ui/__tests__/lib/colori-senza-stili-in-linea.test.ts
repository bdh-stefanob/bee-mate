import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * I colori si dicono con le classi (`text-testo`, `border-bordo`, `bg-superficie`), mai con
 * `style={{ color: 'var(--testo)' }}` (S7, audit del 4/10, §1).
 *
 * Il difetto che questo caso ferma: uno stile in linea batte ogni classe, quindi `hover:`,
 * `focus-visible:` e `dark:` sullo stesso elemento non possono mai cambiare quel colore. Ne
 * restavano circa 460, e in tre selettori (lingua, tema, riepilogo degli esiti) il fondo al
 * passaggio del mouse era scritto ma non si vedeva mai.
 *
 * Il controllo cerca `var(--<colore>)` in tutto `src` (stili in linea, costanti che finiscono in
 * uno stile, classi con valore arbitrario). I colori sono quelli della spec, registrati nel
 * blocco `@theme` di `globals.css`, piu' i token di shadcn.
 *
 * Le eccezioni stanno in un elenco esplicito, con il motivo. Un'eccezione e' giustificata solo
 * quando il colore non puo' essere una classe: lo calcola un'altra libreria (CodeMirror) o lo
 * compone `color-mix()` a partire da un'altra variabile.
 */
const SRC = path.resolve(__dirname, '..', '..', 'src');
const GLOBALS = path.join(SRC, 'app', 'globals.css');

/** I colori della spec: ognuno ha una classe (`text-<nome>`, `bg-<nome>`, `border-<nome>`...). */
export const COLORI_SPEC = [
  'testo',
  'testo-tenue',
  'blu',
  'blu-fondo',
  'bordo',
  'superficie',
  'superficie-tenue',
  'verde',
  'rosso',
  'ambra',
] as const;

/** I token di shadcn: nei componenti si usano le loro classi (`text-foreground`, `border-border`). */
const COLORI_SHADCN = [
  'foreground',
  'background',
  'muted-foreground',
  'muted',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'border',
  'input',
  'ring',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
];

const NOMI = [...COLORI_SPEC, ...COLORI_SHADCN].sort((a, b) => b.length - a.length);
const USO_DI_COLORE = new RegExp(`var\\(--(?:${NOMI.join('|')})\\)`, 'g');

/** Le righe (da 1) in cui compare `var(--<colore>)`, una voce per ogni occorrenza. */
export function righeConColoreInLinea(testo: string): number[] {
  const trovate: number[] = [];
  testo.split(/\r?\n/).forEach((riga, i) => {
    for (const _ of riga.matchAll(USO_DI_COLORE)) trovate.push(i + 1);
  });
  return trovate;
}

/**
 * Eccezioni giustificate: file -> motivo. Il numero di occorrenze non e' fissato, ma il file
 * deve avere almeno un caso, altrimenti l'eccezione va tolta.
 */
export const ECCEZIONI: Record<string, string> = {
  'components/GherkinEditor.tsx':
    "Il tema dell'editor CodeMirror e' un oggetto JavaScript (EditorView.theme), non JSX: i colori sono variabili CSS lette dalla libreria e non possono essere classi.",
  'components/ui/button.tsx':
    "Il fondo al passaggio del mouse e' color-mix() calcolato a partire da --primary e --secondary: un colore composto a runtime, che non esiste come classe.",
  'components/ui/badge.tsx':
    "Il fondo al passaggio del mouse e' color-mix() calcolato a partire da --primary: un colore composto a runtime, che non esiste come classe.",
  'components/cruscotto/scenari/modifica/EditorTesto.tsx':
    "Rimappa le variabili di shadcn (--background, --border...) sui colori del cruscotto per l'editor CodeMirror: sono variabili CSS locali, non colori di un elemento, e non hanno una classe.",
};

/**
 * File non ancora convertiti: si svuota un gruppo alla volta. Il controllo fallisce se un file
 * dell'elenco e' gia' pulito (cosi' non resta nessuna riga morta).
 */
export const IN_ATTESA: string[] = [
];

function sorgenti(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((v) => {
    const pieno = path.join(dir, v.name);
    if (v.isDirectory()) return sorgenti(pieno);
    return /\.(tsx|ts)$/.test(v.name) ? [pieno] : [];
  });
}

const relativo = (file: string) => path.relative(SRC, file).split(path.sep).join('/');

describe('i colori si dicono con le classi, non con stili in linea', () => {
  it('il controllo riconosce il difetto, in uno stile, in una costante e in una classe arbitraria', () => {
    expect(righeConColoreInLinea("<p style={{ color: 'var(--testo)' }}>")).toEqual([1]);
    expect(righeConColoreInLinea("const FONDO = { background: 'var(--bordo)' };")).toEqual([1]);
    expect(righeConColoreInLinea('className="text-[var(--blu)] hover:underline"')).toEqual([1]);
    expect(righeConColoreInLinea("a\nstyle={{ color: 'var(--rosso)', borderColor: 'var(--rosso)' }}")).toEqual([2, 2]);
    expect(righeConColoreInLinea("style={{ color: 'var(--foreground)' }}")).toEqual([1]);
  });

  it('non scambia per colori le variabili che non lo sono', () => {
    expect(righeConColoreInLinea("borderRadius: 'var(--radius-dettaglio)'")).toEqual([]);
    expect(righeConColoreInLinea("fontFamily: 'var(--font-mono, monospace)'")).toEqual([]);
    expect(righeConColoreInLinea("color: 'var(--cm-keyword)'")).toEqual([]);
    expect(righeConColoreInLinea('className="text-testo border-bordo bg-superficie"')).toEqual([]);
  });

  it('globals.css registra i colori della spec nel blocco @theme, cosi esistono le classi', () => {
    const css = fs.readFileSync(GLOBALS, 'utf-8');
    const tema = /@theme inline \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    for (const nome of COLORI_SPEC) {
      expect(tema, `manca --color-${nome}`).toMatch(new RegExp(`--color-${nome}:\\s*var\\(--${nome}\\);`));
    }
  });

  it('nessun file ha un colore in linea, salvo le eccezioni e i file ancora in attesa', () => {
    const colpevoli: string[] = [];
    for (const file of sorgenti(SRC)) {
      const nome = relativo(file);
      if (nome in ECCEZIONI || IN_ATTESA.includes(nome)) continue;
      for (const riga of righeConColoreInLinea(fs.readFileSync(file, 'utf-8'))) colpevoli.push(`${nome}:${riga}`);
    }
    expect(colpevoli).toEqual([]);
  });

  it('i file in attesa hanno ancora un caso: appena sono puliti si tolgono dall\'elenco', () => {
    const gia_puliti = IN_ATTESA.filter((nome) => righeConColoreInLinea(fs.readFileSync(path.join(SRC, nome), 'utf-8')).length === 0);
    expect(gia_puliti).toEqual([]);
  });

  it('ogni eccezione ha un motivo e un caso che la giustifica', () => {
    for (const [nome, motivo] of Object.entries(ECCEZIONI)) {
      expect(motivo.length, `${nome}: motivo vuoto`).toBeGreaterThan(15);
      expect(righeConColoreInLinea(fs.readFileSync(path.join(SRC, nome), 'utf-8')).length, `${nome}: l'eccezione non serve piu'`).toBeGreaterThan(0);
    }
  });
});
