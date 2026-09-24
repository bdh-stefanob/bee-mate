import { describe, it, expect } from 'vitest';
import { ambienteValido } from '@/lib/ambiente-corrente';

describe('ambienteValido', () => {
  it('accetta un nome fatto di lettere, cifre, punto, trattino e underscore', () => {
    expect(ambienteValido('app-a')).toBe(true);
    expect(ambienteValido('app_b.2')).toBe(true);
  });

  it('rifiuta valori non testuali', () => {
    expect(ambienteValido(42)).toBe(false);
    expect(ambienteValido(undefined)).toBe(false);
    expect(ambienteValido(null)).toBe(false);
  });

  it('rifiuta una stringa vuota', () => {
    expect(ambienteValido('')).toBe(false);
  });

  it('rifiuta spazi o caratteri che farebbero uscire da un nome', () => {
    expect(ambienteValido('con spazi')).toBe(false);
    expect(ambienteValido('rm -rf /')).toBe(false);
  });
});
