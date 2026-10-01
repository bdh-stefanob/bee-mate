import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  SOGLIA_DUE_COLONNE_PX,
  MEDIA_DUE_COLONNE,
  CLASSE_DUE_COLONNE,
  CLASSE_ELENCO_STICKY,
  CLASSE_ELENCO_ALTEZZA,
  CLASSE_SOLO_DUE_COLONNE,
  CLASSE_AZIONE_FLESSIBILE,
} from '@/components/cruscotto/scenari/layout';

describe('la soglia delle due colonne (O1) sta scritta in un posto solo', () => {
  it('e\' 1100px, la decisione del proprietario', () => {
    expect(SOGLIA_DUE_COLONNE_PX).toBe(1100);
  });

  it('la media query e le classi dicono lo stesso numero', () => {
    expect(MEDIA_DUE_COLONNE).toContain(`${SOGLIA_DUE_COLONNE_PX}px`);
    for (const classe of [CLASSE_DUE_COLONNE, CLASSE_ELENCO_STICKY, CLASSE_ELENCO_ALTEZZA, CLASSE_SOLO_DUE_COLONNE, CLASSE_AZIONE_FLESSIBILE]) {
      const soglie = [...classe.matchAll(/min-\[(\d+)px\]:/g)].map((m) => Number(m[1]));
      expect(soglie.length).toBeGreaterThan(0);
      expect(new Set(soglie)).toEqual(new Set([SOGLIA_DUE_COLONNE_PX]));
    }
  });

  it('nessun altro componente della pagina scrive una soglia a mano', () => {
    // Un `min-[1100px]:` scritto nei componenti e' una seconda copia: se la
    // soglia cambia, la pagina si romperebbe a meta'. Le classi si importano.
    const cartella = path.join(__dirname, '..', '..', 'src', 'components', 'cruscotto', 'scenari');
    const sparse = fs
      .readdirSync(cartella)
      .filter((f) => f.endsWith('.tsx'))
      .filter((f) => /min-\[\d+px\]:/.test(fs.readFileSync(path.join(cartella, f), 'utf-8')));
    expect(sparse).toEqual([]);
  });
});
