import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { larghezzaPagina, CLASSE_CONTENITORE } from '@/lib/larghezza-pagina';

/**
 * Una sola regola di larghezza e allineamento, nel layout di `(cruscotto)`.
 *
 * Il difetto (audit del 4/10): Controllo, Esecuzione e Registra avevano
 * `max-w-3xl` ancorato a sinistra; Scenari e Catalogo `max-w-screen-xl` centrato.
 * A 1920 px oltre meta' dello schermo restava vuota da un lato solo.
 */
describe('larghezzaPagina', () => {
  it('Scenari e Catalogo (due colonne) tengono la larghezza grande', () => {
    expect(larghezzaPagina('/scenari')).toBe('due-colonne');
    expect(larghezzaPagina('/catalogo')).toBe('due-colonne');
    expect(larghezzaPagina('/catalogo/')).toBe('due-colonne');
  });
  it('le pagine a una colonna restano strette', () => {
    for (const p of ['/controllo', '/registra', '/esecuzione']) {
      expect(larghezzaPagina(p)).toBe('una-colonna');
    }
  });
  it("una rotta sconosciuta e' a una colonna (la scelta prudente)", () => {
    expect(larghezzaPagina('/boh')).toBe('una-colonna');
    expect(larghezzaPagina(null)).toBe('una-colonna');
  });
  it('tutte le larghezze sono centrate e senza sforare', () => {
    for (const v of ['una-colonna', 'due-colonne'] as const) {
      expect(CLASSE_CONTENITORE[v]).toMatch(/\bmx-auto\b/);
      expect(CLASSE_CONTENITORE[v]).toMatch(/\bmin-w-0\b/);
      expect(CLASSE_CONTENITORE[v]).toMatch(/\bmax-w-/);
    }
  });
});

describe('le pagine non ridefiniscono la larghezza', () => {
  const radice = path.resolve(__dirname, '..', '..', 'src', 'app', '(cruscotto)');
  const pagine = ['controllo', 'registra', 'esecuzione', 'scenari', 'catalogo'];
  for (const pagina of pagine) {
    it(`${pagina}/page.tsx non ha max-w-3xl, max-w-screen-* ne' mx-auto`, () => {
      const testo = fs.readFileSync(path.join(radice, pagina, 'page.tsx'), 'utf8');
      expect(testo).not.toMatch(/\bmax-w-3xl\b/);
      expect(testo).not.toMatch(/\bmax-w-screen-/);
      expect(testo).not.toMatch(/\bmx-auto\b/);
    });
  }
});

describe('ordine del Check-up (F15)', () => {
  const testo = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'app', '(cruscotto)', 'controllo', 'page.tsx'),
    'utf8',
  );
  it('un solo blocco "Avanzate"', () => {
    expect(testo.match(/<details\b/g)?.length).toBe(1);
  });
  it('lo stato (le voci essenziali) sta prima di Ambienti', () => {
    expect(testo.indexOf('essenziali.map')).toBeGreaterThan(-1);
    expect(testo.indexOf('essenziali.map')).toBeLessThan(testo.indexOf('<SezioneAmbienti'));
  });
  it('Ambienti sta prima del blocco Avanzate', () => {
    expect(testo.indexOf('<SezioneAmbienti')).toBeGreaterThan(-1);
    expect(testo.indexOf('<SezioneAmbienti')).toBeLessThan(testo.indexOf('<details'));
  });
  it('"Altre variabili" sta dentro il blocco Avanzate', () => {
    const dentro = testo.slice(testo.indexOf('<details'), testo.indexOf('</details>'));
    expect(dentro).toContain('<ConfiguraCredenziale');
  });
});

describe('azioni sugli ambienti', () => {
  const testo = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'components', 'cruscotto', 'SezioneAmbienti.tsx'),
    'utf8',
  );
  it('Elimina non porta piu\' il bordo pieno rosso accanto a "Modifica indirizzo"', () => {
    const bottone = testo.slice(testo.indexOf("t('elimina')") - 900, testo.indexOf("t('elimina')"));
    expect(bottone).not.toMatch(/borderColor: 'var\(--rosso\)'/);
  });
  it('"Accedi adesso" sta nel corpo dell\'ambiente, non a destra fuori dal flusso', () => {
    // la riga non e' piu' una coppia sinistra/destra con il pulsante staccato
    expect(testo).not.toMatch(/sm:flex-row sm:items-center sm:justify-between/);
  });
});
