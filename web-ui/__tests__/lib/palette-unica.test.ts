import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Una sola palette (audit UI del 4/10, §1, fase 1).
 *
 * Il difetto: in `globals.css` convivevano due serie di colori. La serie B e' quella
 * decisa dalla spec (`--blu`, `--testo`, `--bordo`...); la serie A era il tema
 * predefinito di shadcn (verde petrolio, arancio), mai adattato. Il primo
 * `<Button>` predefinito usciva verde petrolio, con il bianco sopra a 3,7:1.
 *
 * Il controllo legge il CSS, risolve le `var()` e verifica due cose: nessun colore
 * della serie A nei token, e i token di shadcn puntano ai colori della spec.
 */
const CSS = fs
  .readFileSync(path.resolve(__dirname, '..', '..', 'src', 'app', 'globals.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** Le dichiarazioni `--nome: valore;` di un blocco, per selettore (`:root` o `.dark`). */
function dichiarazioni(css: string, selettore: string): Record<string, string> {
  const fuori: Record<string, string> = {};
  const re = new RegExp(`(^|\\n)${selettore.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'g');
  for (const blocco of css.matchAll(re)) {
    for (const d of blocco[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) fuori[d[1]] = d[2].trim();
  }
  return fuori;
}

/** Risolve `var(--x)` ricorsivamente dentro l'insieme di variabili dato. */
function risolvi(valore: string | undefined, vars: Record<string, string>, giri = 0): string {
  if (valore === undefined) return '(assente)';
  if (giri > 10) return valore;
  return valore.replace(/var\((--[\w-]+)\)/g, (_, nome: string) =>
    nome in vars ? risolvi(vars[nome], vars, giri + 1) : `var(${nome})`,
  );
}

const CHIARO = dichiarazioni(CSS, ':root');
const SCURO = { ...CHIARO, ...dichiarazioni(CSS, '.dark') };

/** Tinte della serie A: verde petrolio (hue ~170-200) e arancio (hue ~30-55) in oklch. */
function eDellaSerieA(valore: string): boolean {
  return [...valore.matchAll(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/g)].some((m) => {
    const hue = parseFloat(m[1]);
    return (hue >= 170 && hue <= 200) || (hue >= 30 && hue <= 55);
  });
}

describe('una sola palette', () => {
  it('il riconoscitore distingue la serie A dal resto', () => {
    expect(eDellaSerieA('oklch(0.6 0.118 184.704)')).toBe(true);
    expect(eDellaSerieA('oklch(0.702 0.191 41.116)')).toBe(true);
    expect(eDellaSerieA('oklch(0.985 0 0)')).toBe(false);
    expect(eDellaSerieA('#1A56DB')).toBe(false);
  });

  it('nessun colore della serie A rimane nei token', () => {
    const residui = [
      ...Object.entries(dichiarazioni(CSS, ':root')),
      ...Object.entries(dichiarazioni(CSS, '.dark')),
    ]
      .filter(([nome, v]) => !nome.startsWith('--cm-') && eDellaSerieA(v))
      .map(([nome, v]) => `${nome}: ${v}`);
    expect(residui).toEqual([]);
  });

  it('--primary vale quanto il blu della spec, in chiaro e in scuro', () => {
    expect(risolvi(CHIARO['--primary'], CHIARO).toLowerCase()).toBe('#1a56db');
    expect(risolvi(SCURO['--primary'], SCURO).toLowerCase()).toBe('#1a56db');
    expect(risolvi(CHIARO['--primary-foreground'], CHIARO).toLowerCase()).toMatch(
      /^(#fff(fff)?|oklch\(1 0 0\))$/,
    );
  });

  it.each([
    ['--foreground', '--testo'],
    ['--muted-foreground', '--testo-tenue'],
    ['--border', '--bordo'],
    ['--input', '--bordo'],
    ['--card', '--superficie'],
    ['--destructive', '--rosso'],
    ['--ring', '--blu'],
  ])('%s punta a %s', (token, spec) => {
    for (const vars of [CHIARO, SCURO]) {
      expect(risolvi(vars[token], vars)).toBe(risolvi(`var(${spec})`, vars));
    }
  });
});
