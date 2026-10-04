import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Residui di S2 sulla sezione Ambienti (Controllo). Il progetto non ha test di
 * componenti: i difetti si fermano guardando il sorgente, come
 * `fuoco-visibile.test.ts`.
 */
const RADICE = path.resolve(__dirname, '..', '..');
const sezione = fs.readFileSync(path.join(RADICE, 'src/components/cruscotto/SezioneAmbienti.tsx'), 'utf-8');
const dizionari = ['it', 'en'].map((l) => ({
  lingua: l,
  json: JSON.parse(fs.readFileSync(path.join(RADICE, `messages/${l}.json`), 'utf-8')) as Record<string, Record<string, string>>,
}));

describe('sezione Ambienti', () => {
  it('nessuna conferma passa da window.confirm: la conferma sta dentro la pagina', () => {
    expect(sezione).not.toMatch(/window\.confirm|\bconfirm\(/);
    expect(sezione).toMatch(/DialogoModale/);
  });

  it('"Torna indietro" ha il fuoco iniziale, come per lo scenario', () => {
    expect(sezione).toMatch(/data-iniziale/);
  });

  it("le azioni di un ambiente stanno in una riga sola: \"Registra di nuovo l'accesso\" e' dentro la riga", () => {
    // RegistraAccesso riceve le altre azioni come figli: non e' un blocco a parte sopra la riga.
    expect(sezione).not.toMatch(/<RegistraAccesso[^>]*\/>/);
  });

  it("nel modulo \"aggiungi\" la frase di aiuto non sta sotto il Nome: spingerebbe giu' Indirizzo e pulsante", () => {
    const daNome = sezione.indexOf('htmlFor="ambiente-nome"');
    const daUrl = sezione.indexOf('htmlFor="ambiente-url"');
    expect(daNome).toBeGreaterThan(-1);
    expect(daUrl).toBeGreaterThan(daNome);
    expect(sezione.slice(daNome, daUrl)).not.toMatch(/nomeNonModificabileNota/);
    expect(sezione).toMatch(/nomeNonModificabileNota/);
  });
});

describe('chiavi inutilizzate di Controllo', () => {
  for (const { lingua, json } of dizionari) {
    it(`${lingua}: Controllo.avanzate e Controllo.credenzialeApri non ci sono piu'`, () => {
      expect(json.Controllo).not.toHaveProperty('avanzate');
      expect(json.Controllo).not.toHaveProperty('credenzialeApri');
    });
  }
});
