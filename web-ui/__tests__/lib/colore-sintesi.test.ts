import { describe, it, expect } from 'vitest';
import { coloreSintesi } from '@/lib/colore-sintesi';

/**
 * Il riquadro in cima al Check-up prende il colore dell'esito PEGGIORE.
 *
 * Il difetto (audit del 4/10): "Ready — 1 thing worth a look" usciva con il
 * colore e l'icona del successo mentre la voce Ambienti diceva "Attention": il
 * colore guardava solo `pronto`, non gli avvisi.
 */
describe('coloreSintesi', () => {
  it('una mancanza vera vince su tutto: rosso', () => {
    expect(coloreSintesi({ mancanti: 1, daGuardare: 2, perIniziare: true })).toBe('rosso');
  });
  it("un avviso senza mancanze e' ambra, anche se il verdetto e' \"pronto\"", () => {
    expect(coloreSintesi({ mancanti: 0, daGuardare: 1, perIniziare: false })).toBe('ambra');
  });
  it("un avviso vince su \"per iniziare\": e' ambra, non blu", () => {
    expect(coloreSintesi({ mancanti: 0, daGuardare: 1, perIniziare: true })).toBe('ambra');
  });
  it("solo cio' che nasce usando l'app (nessun guasto): blu", () => {
    expect(coloreSintesi({ mancanti: 0, daGuardare: 0, perIniziare: true })).toBe('blu');
  });
  it('tutto a posto: verde', () => {
    expect(coloreSintesi({ mancanti: 0, daGuardare: 0, perIniziare: false })).toBe('verde');
  });
});
