import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Il contorno di fuoco deve vedersi (spec del cruscotto: "contorno di focus sempre
 * visibile").
 *
 * Il difetto che questo caso ferma (collaudo V1, 1/10): `outline-none` accanto a
 * `focus-visible:outline-2` sullo stesso elemento. Con Tailwind 4 `outline-none`
 * imposta lo stile del contorno a `none` senza condizioni, e la variante
 * `focus-visible:outline-*` legge lo stesso stile: larghezza e colore ci sono, ma
 * il contorno non compare mai. Nel Catalogo otto elementi raggiungibili con Tab
 * (linguette, caselle in alto, righe degli step) erano senza nessun segno di fuoco.
 *
 * I componenti che mostrano il fuoco con un anello (`focus-visible:ring-*`, cioe'
 * un'ombra) non sono toccati: li' `outline-none` e' giusto.
 */
const SRC = path.resolve(__dirname, '..', '..', 'src');

const SENZA_CONTORNO = /\boutline-none\b/;
const CONTORNO_AL_FUOCO = /focus-visible:outline(-|\b)/;

function sorgenti(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((v) => {
    const pieno = path.join(dir, v.name);
    if (v.isDirectory()) return sorgenti(pieno);
    return /\.(tsx|ts)$/.test(v.name) ? [pieno] : [];
  });
}

/**
 * Le righe in cui le due classi finiscono sullo stesso elemento. Le classi possono
 * stare su piu' righe (un elenco passato a `cn()`): si guarda anche nelle due
 * righe prima e dopo.
 */
export function righeSenzaFuoco(testo: string): number[] {
  const righe = testo.split(/\r?\n/);
  const trovate: number[] = [];
  righe.forEach((riga, i) => {
    if (!SENZA_CONTORNO.test(riga)) return;
    const vicine = righe.slice(Math.max(0, i - 2), i + 3).join(' ');
    if (CONTORNO_AL_FUOCO.test(vicine)) trovate.push(i + 1);
  });
  return trovate;
}

describe('il contorno di fuoco si vede', () => {
  it('il controllo riconosce il difetto, anche quando le classi stanno su due righe', () => {
    expect(righeSenzaFuoco("className=\"p-2 outline-none focus-visible:outline-2\"")).toEqual([1]);
    expect(righeSenzaFuoco("cn(\n  'border px-3 outline-none',\n  'focus-visible:outline-2',\n)")).toEqual([2]);
    // Un anello al posto del contorno e' un altro modo, valido, di mostrare il fuoco.
    expect(righeSenzaFuoco("className=\"outline-none focus-visible:ring-2\"")).toEqual([]);
    expect(righeSenzaFuoco("className=\"focus-visible:outline-2\"")).toEqual([]);
  });

  it('nessun elemento mette insieme outline-none e focus-visible:outline-*', () => {
    const colpevoli: string[] = [];
    for (const file of sorgenti(SRC)) {
      for (const riga of righeSenzaFuoco(fs.readFileSync(file, 'utf-8'))) {
        colpevoli.push(`${path.relative(SRC, file).split(path.sep).join('/')}:${riga}`);
      }
    }
    expect(colpevoli).toEqual([]);
  });
});
