import { describe, it, expect } from 'vitest';
import {
  valutaSemplicita,
  leggiPassi,
  titoloDi,
  rigaScenario,
  cambiaTitolo,
  sostituisciPasso,
  rimuoviPasso,
  aggiungiVerifica,
  togliMarcatore,
  spostaTesto,
  tuttiIPassi,
  ErroreModifica,
} from '@/lib/modifica-scenario';
import { MARCATORE } from '@/lib/salva-scenario';

const BASE = [
  '# generato-da: bdd-generate · rigenerabile',
  '# src/features/shop/order/pagamento.feature',
  '',
  '@shop @order @generato @da-rivedere',
  'Feature: Pagamento con carta',
  '',
  '  Descrizione libera.',
  '',
  '  Scenario: Pagamento con carta',
  '    Given the user is logged in',
  '    When the user adds the item',
  '    # durante questo passo si verifica: "Cart, 1 items"',
  '    And the user pays by card',
  '    # durante questo passo si verifica: "Thank you"',
  '    Then the page shows "Order placed"',
  '',
].join('\n');

const righe = (t: string) => t.split('\n');
const conCrlf = (t: string) => t.replace(/\n/g, '\r\n');

describe('valutaSemplicita', () => {
  it('un solo scenario e nessun costrutto complesso: semplice', () => {
    expect(valutaSemplicita(BASE)).toEqual({ semplice: true });
  });

  it.each([
    ['Scenario Outline', 'Feature: F\n  Scenario Outline: S\n    Given x <a>\n    Examples:\n      | a |\n      | 1 |\n'],
    ['Background', 'Feature: F\n  Background:\n    Given x\n  Scenario: S\n    Given y\n'],
    ['Rule', 'Feature: F\n  Rule: R\n    Scenario: S\n      Given y\n'],
    ['tabella', 'Feature: F\n  Scenario: S\n    Given x:\n      | a | b |\n'],
    ['DocString', 'Feature: F\n  Scenario: S\n    Given x:\n      """\n      testo\n      """\n'],
    ['due scenari', 'Feature: F\n  Scenario: A\n    Given x\n  Scenario: B\n    Given y\n'],
    ['nessuno scenario', 'Feature: F\n'],
  ])('%s: non e semplice, ragione "complesso"', (_nome, testo) => {
    expect(valutaSemplicita(testo)).toEqual({ semplice: false, ragione: 'complesso' });
  });

  it('un documento @non-automatizzato non si modifica', () => {
    const t = '@shop @non-automatizzato\nFeature: F\n  Scenario: S\n    Given x\n';
    expect(valutaSemplicita(t)).toEqual({ semplice: false, ragione: 'documento' });
  });

  it('un file in un\'altra lingua non si interpreta', () => {
    const t = '# language: it\nFunzionalità: F\n  Scenario: S\n    Dato x\n';
    expect(valutaSemplicita(t).semplice).toBe(false);
  });
});

describe('leggiPassi', () => {
  it('dice riga, parola chiave, frase e le verifiche a meta passo', () => {
    const passi = leggiPassi(BASE);
    expect(passi.map((p) => [p.riga, p.parolaChiave, p.frase])).toEqual([
      [10, 'Given', 'the user is logged in'],
      [11, 'When', 'the user adds the item'],
      [13, 'And', 'the user pays by card'],
      [15, 'Then', 'the page shows "Order placed"'],
    ]);
    expect(passi[1].verifiche).toEqual(['Cart, 1 items']);
    expect(passi[0].verifiche).toEqual([]);
  });

  it('con i fine riga di Windows da gli stessi numeri', () => {
    expect(leggiPassi(conCrlf(BASE)).map((p) => p.riga)).toEqual([10, 11, 13, 15]);
  });
});

describe('cambiaTitolo', () => {
  it('cambia Feature e Scenario insieme quando erano uguali', () => {
    const r = righe(cambiaTitolo(BASE, 'Pagamento rifiutato'));
    expect(r[4]).toBe('Feature: Pagamento rifiutato');
    expect(r[8]).toBe('  Scenario: Pagamento rifiutato');
  });

  it('uno scenario gia rinominato a mano resta com e', () => {
    const t = BASE.replace('Scenario: Pagamento con carta', 'Scenario: Altro nome');
    const r = righe(cambiaTitolo(t, 'Nuovo'));
    expect(r[4]).toBe('Feature: Nuovo');
    expect(r[8]).toBe('  Scenario: Altro nome');
  });

  it('mantiene i tag e il commento di testa', () => {
    const r = righe(cambiaTitolo(BASE, 'Nuovo'));
    expect(r[0]).toBe('# generato-da: bdd-generate · rigenerabile');
    expect(r[3]).toBe('@shop @order @generato @da-rivedere');
  });

  it('tiene i fine riga di Windows', () => {
    const out = cambiaTitolo(conCrlf(BASE), 'Nuovo');
    expect(out).not.toMatch(/[^\r]\n/);
    expect(out).toContain('Feature: Nuovo\r\n');
  });

  it.each([
    ['vuoto', ''],
    ['solo spazi', '   '],
    ['due righe', 'a\nb'],
    ['oltre 80 caratteri', 'x'.repeat(81)],
  ])('rifiuta un titolo %s', (_n, titolo) => {
    expect(() => cambiaTitolo(BASE, titolo)).toThrow(ErroreModifica);
    try {
      cambiaTitolo(BASE, titolo);
    } catch (e) {
      expect((e as ErroreModifica).codice).toBe('titolo');
    }
  });

  it('il titolo senza cambiamenti restituisce lo stesso testo', () => {
    expect(cambiaTitolo(BASE, 'Pagamento con carta')).toBe(BASE);
  });
});

describe('rigaScenario', () => {
  it('da la riga dello Scenario, anche dopo che il marcatore e stato tolto', () => {
    expect(rigaScenario(BASE)).toBe(9);
    expect(rigaScenario(togliMarcatore(BASE))).toBe(8);
    expect(rigaScenario('Feature: F\n')).toBe(1);
  });
});

describe('titoloDi', () => {
  it('legge il titolo dello scenario', () => {
    expect(titoloDi(BASE)).toBe('Pagamento con carta');
  });
});

describe('sostituisciPasso', () => {
  it('cambia la frase e conserva indentazione e parola chiave', () => {
    const r = righe(sostituisciPasso(BASE, 11, 'the user removes the item'));
    expect(r[10]).toBe('    When the user removes the item');
  });

  it('le verifiche a meta passo del passo sostituito vanno via (descrivevano il vecchio codice)', () => {
    const t = sostituisciPasso(BASE, 11, 'the user removes the item');
    expect(t).not.toContain('Cart, 1 items');
    // ...ma non quelle del passo dopo
    expect(t).toContain('# durante questo passo si verifica: "Thank you"');
  });

  it('tiene i fine riga di Windows', () => {
    const out = sostituisciPasso(conCrlf(BASE), 10, 'the user is in');
    expect(out).toContain('    Given the user is in\r\n');
    expect(out).not.toMatch(/[^\r]\n/);
  });

  it('rifiuta una riga che non e un passo', () => {
    expect(() => sostituisciPasso(BASE, 5, 'x')).toThrow(ErroreModifica);
    expect(() => sostituisciPasso(BASE, 999, 'x')).toThrow(ErroreModifica);
  });

  it('rifiuta una frase vuota o su piu righe', () => {
    expect(() => sostituisciPasso(BASE, 10, '  ')).toThrow(ErroreModifica);
    expect(() => sostituisciPasso(BASE, 10, 'a\nb')).toThrow(ErroreModifica);
  });
});

describe('rimuoviPasso', () => {
  it('toglie il passo e le sue verifiche a meta passo, e solo quelle', () => {
    const t = rimuoviPasso(BASE, 11);
    expect(t).not.toContain('the user adds the item');
    expect(t).not.toContain('Cart, 1 items');
    expect(t).toContain('# durante questo passo si verifica: "Thank you"');
    // l'And che seguiva prende la parola chiave del When tolto
    expect(t).toContain('    When the user pays by card');
  });

  it('se era un Given e segue un And, l And diventa Given', () => {
    const t = ['Feature: F', '  Scenario: S', '    Given a', '    And b', '    Then c', ''].join('\n');
    expect(righe(rimuoviPasso(t, 3))).toEqual(['Feature: F', '  Scenario: S', '    Given b', '    Then c', '']);
  });

  it('se era un When e segue un But, il But diventa When', () => {
    const t = ['Feature: F', '  Scenario: S', '    When a', '    But b', ''].join('\n');
    expect(righe(rimuoviPasso(t, 3))[2]).toBe('    When b');
  });

  it('se era un And, niente da promuovere', () => {
    const t = ['Feature: F', '  Scenario: S', '    Given a', '    And b', '    And c', ''].join('\n');
    expect(righe(rimuoviPasso(t, 4))).toEqual(['Feature: F', '  Scenario: S', '    Given a', '    And c', '']);
  });

  it('se segue un altro Given/When/Then non tocca niente', () => {
    const t = ['Feature: F', '  Scenario: S', '    Given a', '    When b', ''].join('\n');
    expect(righe(rimuoviPasso(t, 3))[2]).toBe('    When b');
  });

  it('toglie anche il commento "frase del tester" che sta sopra il passo', () => {
    const t = ['Feature: F', '  Scenario: S', '    # frase del tester: foo', '    Given a', '    When b', ''].join('\n');
    expect(righe(rimuoviPasso(t, 4))).toEqual(['Feature: F', '  Scenario: S', '    When b', '']);
  });

  it('tiene i fine riga di Windows', () => {
    const out = rimuoviPasso(conCrlf(BASE), 11);
    expect(out).not.toMatch(/[^\r]\n/);
  });

  it('rifiuta una riga che non e un passo', () => {
    expect(() => rimuoviPasso(BASE, 5)).toThrow(ErroreModifica);
  });
});

describe('aggiungiVerifica', () => {
  it('accoda un And quando l ultimo passo e gia un Then', () => {
    const r = righe(aggiungiVerifica(BASE, 'Done'));
    expect(r.filter((x) => x !== '')).toContain('    And the page shows "Done"');
    expect(r.indexOf('    And the page shows "Done"')).toBeGreaterThan(r.indexOf('    Then the page shows "Order placed"'));
  });

  it('accoda un Then quando l ultimo passo non e una verifica', () => {
    const t = ['Feature: F', '  Scenario: S', '    Given a', '    When b', ''].join('\n');
    expect(righe(aggiungiVerifica(t, 'Done'))).toEqual([
      'Feature: F', '  Scenario: S', '    Given a', '    When b', '    Then the page shows "Done"', '',
    ]);
  });

  it('se l ultimo e un And dopo un Then, accoda un And', () => {
    const t = ['Feature: F', '  Scenario: S', '    Then a', '    And b', ''].join('\n');
    expect(righe(aggiungiVerifica(t, 'Done'))[4]).toBe('    And the page shows "Done"');
  });

  it('se l ultimo e un And dopo un When, accoda un Then', () => {
    const t = ['Feature: F', '  Scenario: S', '    When a', '    And b', ''].join('\n');
    expect(righe(aggiungiVerifica(t, 'Done'))[4]).toBe('    Then the page shows "Done"');
  });

  it('va dopo le verifiche a meta passo dell ultimo passo', () => {
    const t = ['Feature: F', '  Scenario: S', '    When b', '    # durante questo passo si verifica: "X"', ''].join('\n');
    expect(righe(aggiungiVerifica(t, 'Done'))).toEqual([
      'Feature: F', '  Scenario: S', '    When b', '    # durante questo passo si verifica: "X"',
      '    Then the page shows "Done"', '',
    ]);
  });

  it('un valore con virgolette doppie diventa con virgolette singole, come fa il generatore', () => {
    expect(aggiungiVerifica(BASE, 'say "hi"')).toContain('And the page shows "say \'hi\'"');
  });

  it('rifiuta un valore con un a capo o vuoto', () => {
    expect(() => aggiungiVerifica(BASE, 'a\nb')).toThrow(ErroreModifica);
    expect(() => aggiungiVerifica(BASE, '   ')).toThrow(ErroreModifica);
  });

  it('tiene i fine riga di Windows', () => {
    const out = aggiungiVerifica(conCrlf(BASE), 'Done');
    expect(out).not.toMatch(/[^\r]\n/);
    expect(out).toContain('And the page shows "Done"\r\n');
  });

  it('senza passi non sa dove accodare: rifiuta', () => {
    expect(() => aggiungiVerifica('Feature: F\n  Scenario: S\n', 'x')).toThrow(ErroreModifica);
  });
});

describe('togliMarcatore', () => {
  it('dopo non c e piu il marcatore e i tag, compreso @generato, restano', () => {
    const t = togliMarcatore(BASE);
    expect(t.includes(MARCATORE)).toBe(false);
    expect(t).toContain('@shop @order @generato @da-rivedere');
  });

  it('un testo senza marcatore resta identico', () => {
    const senza = togliMarcatore(BASE);
    expect(togliMarcatore(senza)).toBe(senza);
  });

  it('non si perde nessun\'altra riga e si mantiene il fine riga', () => {
    const out = togliMarcatore(conCrlf(BASE));
    expect(out.split('\r\n').length).toBe(BASE.split('\n').length - 1);
    expect(out).not.toMatch(/[^\r]\n/);
  });
});

describe('spostaTesto: il file nel suo nuovo flusso', () => {
  const DEST = 'shop/account/pagamento.feature';

  it('cambia il tag del flusso e la riga del percorso; gli altri tag restano (il difetto dei tag)', () => {
    const nuovo = spostaTesto(BASE, DEST);
    expect(nuovo).toContain('@shop @account @generato @da-rivedere');
    expect(nuovo).toContain('# src/features/shop/account/pagamento.feature');
    expect(nuovo).not.toContain('# src/features/shop/order/');
  });

  it('non duplica la riga dei tag quando il file comincia con il commento del marcatore', () => {
    const nuovo = spostaTesto(BASE, DEST);
    expect(righe(nuovo).filter((r) => r.startsWith('@'))).toHaveLength(1);
  });

  it('@non-automatizzato e @generato sopravvivono anche se sono prima dei due tag di posizione', () => {
    const t = BASE.replace('@shop @order @generato @da-rivedere', '@generato @shop @order @non-automatizzato');
    const nuovo = spostaTesto(t, DEST);
    expect(nuovo).toContain('@shop @account @generato @non-automatizzato');
  });

  it('non tocca passi, titolo e verifiche', () => {
    const nuovo = spostaTesto(BASE, DEST);
    const solo = (t: string) => righe(t).filter((r) => /^\s+(Given|When|Then|And)|durante questo passo/.test(r));
    expect(solo(nuovo)).toEqual(solo(BASE));
    expect(titoloDi(nuovo)).toBe('Pagamento con carta');
  });

  it('conserva i fine riga CRLF, anche sulla riga dei tag inserita da zero', () => {
    const senzaTag = BASE.replace('@shop @order @generato @da-rivedere\n', '');
    const nuovo = spostaTesto(conCrlf(senzaTag), DEST);
    expect(nuovo).toContain('@shop @account');
    expect(nuovo).not.toMatch(/[^\r]\n/);
  });

  it('senza riga dei tag la mette sopra Feature', () => {
    const senzaTag = BASE.replace('@shop @order @generato @da-rivedere\n', '');
    const nuovo = righe(spostaTesto(senzaTag, DEST));
    expect(nuovo.findIndex((r) => r === '@shop @account')).toBeGreaterThan(-1);
    expect(nuovo.findIndex((r) => r === '@shop @account')).toBeLessThan(nuovo.findIndex((r) => r.startsWith('Feature:')));
  });

  it('un testo senza la riga del percorso non ne guadagna una', () => {
    const senza = BASE.replace('# src/features/shop/order/pagamento.feature\n', '');
    expect(spostaTesto(senza, DEST)).not.toContain('# src/features');
  });

  it('rifiuta una destinazione che non e app/flusso/nome.feature', () => {
    expect(() => spostaTesto(BASE, 'shop/pagamento.feature')).toThrow(ErroreModifica);
    expect(() => spostaTesto(BASE, '../x/y/z.feature')).toThrow(ErroreModifica);
  });
});

describe('tuttiIPassi: ogni riga di passo, in qualunque scenario', () => {
  it('per uno scenario semplice coincide con i passi letti', () => {
    expect(tuttiIPassi(BASE).map((p) => [p.riga, p.frase])).toEqual(leggiPassi(BASE).map((p) => [p.riga, p.frase]));
  });

  it('vede anche i passi del secondo scenario, del Background e di un Scenario Outline', () => {
    const t = [
      'Feature: F',
      '  Background:',
      '    Given the user opens the shop',
      '  Scenario: Uno',
      '    When a',
      '  Scenario Outline: Due',
      '    Then b <x>',
      '    Examples:',
      '      | x |',
      '      | 1 |',
      '',
    ].join('\n');
    expect(tuttiIPassi(t).map((p) => p.frase)).toEqual(['the user opens the shop', 'a', 'b <x>']);
  });
});
