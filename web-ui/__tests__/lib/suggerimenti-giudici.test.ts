import { describe, it, expect } from 'vitest';
import { proveAVuotoConProblemi, validatoreFrasi } from '@/lib/suggerimenti-giudici';

describe('proveAVuotoConProblemi', () => {
  it('la prova a vuoto che trova un passo indefinito e\' un no, anche se esce con 0', () => {
    expect(proveAVuotoConProblemi('1 scenario (1 undefined)\n2 steps (1 undefined, 1 skipped)')).toBe('1 undefined');
  });
  it('un passo ambiguo e\' un no', () => {
    expect(proveAVuotoConProblemi('1 scenario (1 ambiguous)')).toBe('1 ambiguous');
  });
  it('tutto saltato (la prova a vuoto non esegue) e\' un si', () => {
    expect(proveAVuotoConProblemi('1 scenario (1 skipped)\n2 steps (2 skipped)')).toBeNull();
  });
});

describe('validatoreFrasi', () => {
  it('una frase che e\' nel catalogo passa', () => {
    expect(validatoreFrasi(['the user confirms the order'], ['the user confirms the order', 'altro']).ok).toBe(true);
  });
  it('una frase che non e\' nel catalogo no, e dice quale', () => {
    const e = validatoreFrasi(['the user confirms the order'], ['altro']);
    expect(e.ok).toBe(false);
    expect(e.dettaglio).toContain('the user confirms the order');
  });
  it('la maiuscola conta: e\' la frase del catalogo, parola per parola', () => {
    expect(validatoreFrasi(['The user confirms'], ['the user confirms']).ok).toBe(false);
  });
});
