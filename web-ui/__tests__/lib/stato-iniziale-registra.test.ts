import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { statoInizialeRegistra, PASSI_REGISTRA } from '@/lib/stato-iniziale-registra';

/**
 * Registra, stato iniziale (audit UI del 4/10, fase 6, con F14).
 *
 * Il difetto: con un ambiente pronto la pagina era un titolo, una riga e un
 * pulsante, senza dire cosa succede dopo il clic; senza ambiente c'era solo una
 * riga e un pulsante spento, senza una strada per risolvere (F14).
 *
 * La scelta di quale stato mostrare sta in una funzione pura: la pagina non
 * decide da sola.
 */
describe('statoInizialeRegistra', () => {
  it('ambiente scelto: stato "pronto", con il nome dell\'ambiente', () => {
    expect(statoInizialeRegistra('demo')).toEqual({ tipo: 'pronto', ambiente: 'demo' });
  });
  it('nessun ambiente (stringa vuota): porta al Check-up', () => {
    expect(statoInizialeRegistra('')).toEqual({ tipo: 'senza-ambiente' });
  });
  it('solo spazi: e\' come nessun ambiente', () => {
    expect(statoInizialeRegistra('   ')).toEqual({ tipo: 'senza-ambiente' });
  });
});

describe('i tre passi', () => {
  it('sono accedi, registra, salva, in questo ordine', () => {
    expect([...PASSI_REGISTRA]).toEqual(['accedi', 'registra', 'salva']);
  });
});

describe('testi dello stato iniziale (it e en)', () => {
  const dizionari = {
    it: JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'messages', 'it.json'), 'utf8')),
    en: JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'messages', 'en.json'), 'utf8')),
  };
  const chiavi = [
    'iniziaTitolo',
    ...PASSI_REGISTRA.flatMap((p) => [`passo_${p}_titolo`, `passo_${p}_testo`]),
    'senzaAmbienteSpiega',
  ];

  for (const lingua of ['it', 'en'] as const) {
    for (const chiave of chiavi) {
      it(`${lingua}: Registra.${chiave} esiste e non e' vuota`, () => {
        const valore = dizionari[lingua].Registra[chiave];
        expect(typeof valore).toBe('string');
        expect(valore.trim().length).toBeGreaterThan(0);
      });
    }
    it(`${lingua}: nessuna parola da sviluppatore nei testi nuovi`, () => {
      const testo = chiavi.map((c) => String(dizionari[lingua].Registra[c] ?? '')).join(' ');
      expect(testo).not.toMatch(/gherkin|feature|step|selector|selettor|\.ts\b|npm /i);
    });
  }
});
