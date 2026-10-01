import { describe, it, expect } from 'vitest';
import { TEMI, TEMA_DI_FABBRICA, temaAttivo, normalizzaTema } from '@/lib/tema';

describe('tema del cruscotto', () => {
  it("i tre valori, nell'ordine mostrato", () => {
    expect(TEMI).toEqual(['light', 'dark', 'system']);
  });
  it("il valore di fabbrica e' \"come il sistema\"", () => {
    expect(TEMA_DI_FABBRICA).toBe('system');
  });
  it("prima del montaggio nessun bottone e' attivo", () => {
    for (const t of TEMI) expect(temaAttivo(false, 'dark', t)).toBe(false);
  });
  it("dopo il montaggio e' attivo solo il valore scelto", () => {
    expect(temaAttivo(true, 'dark', 'dark')).toBe(true);
    expect(temaAttivo(true, 'dark', 'light')).toBe(false);
    expect(temaAttivo(true, 'dark', 'system')).toBe(false);
  });
  it('senza scelta salvata vale il valore di fabbrica', () => {
    expect(temaAttivo(true, undefined, 'system')).toBe(true);
    expect(temaAttivo(true, undefined, 'dark')).toBe(false);
  });
  it('un valore sconosciuto torna al valore di fabbrica', () => {
    expect(normalizzaTema('viola')).toBe('system');
    expect(normalizzaTema(null)).toBe('system');
    expect(normalizzaTema('light')).toBe('light');
  });
});
