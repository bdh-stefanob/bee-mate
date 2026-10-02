import { describe, it, expect } from 'vitest';
import { passoSconosciutoDaProporre, parolaChiaveDiProposta } from '@/lib/passo-sconosciuto';

const CATALOGO = ['the user is logged in', 'the page shows {string}'];

describe('passoSconosciutoDaProporre: il clic su un passo che il catalogo non conosce', () => {
  it('con un gestore delle proposte, un passo sconosciuto si propone, con la sua parola chiave', () => {
    expect(passoSconosciutoDaProporre('    When the user dances', CATALOGO, true)).toEqual({ frase: 'the user dances', parolaChiave: 'When' });
    expect(passoSconosciutoDaProporre('    Given the user dances', CATALOGO, true)?.parolaChiave).toBe('Given');
    expect(passoSconosciutoDaProporre('    Then the user dances', CATALOGO, true)?.parolaChiave).toBe('Then');
  });

  it('senza un gestore il clic NON si intercetta: il campo funziona come sempre (il difetto noto)', () => {
    expect(passoSconosciutoDaProporre('    When the user dances', CATALOGO, false)).toBeNull();
  });

  it('un passo che il catalogo conosce non si propone, con o senza gestore', () => {
    expect(passoSconosciutoDaProporre('    Given the user is logged in', CATALOGO, true)).toBeNull();
    expect(passoSconosciutoDaProporre('    Then the page shows "Done"', CATALOGO, true)).toBeNull();
  });

  it('una riga che non e un passo (titolo, tag, commento, riga vuota) non si intercetta mai', () => {
    for (const riga of ['Feature: F', '  Scenario: S', '@shop @order', '    # un commento', '', '    | a | b |']) {
      expect(passoSconosciutoDaProporre(riga, CATALOGO, true), riga).toBeNull();
    }
  });

  it('con un catalogo vuoto (non ancora arrivato) non si propone niente: non si giudica al buio', () => {
    expect(passoSconosciutoDaProporre('    When the user dances', [], true)).toBeNull();
  });

  it('And e But valgono When (come fa la proposta del catalogo)', () => {
    expect(parolaChiaveDiProposta('And')).toBe('When');
    expect(parolaChiaveDiProposta('but')).toBe('When');
    expect(parolaChiaveDiProposta('given')).toBe('Given');
    expect(parolaChiaveDiProposta('THEN')).toBe('Then');
  });
});
