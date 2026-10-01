import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tokenizzaGherkin, PREFISSO_VERIFICA } from '@/lib/gherkin-lettura';

const tipi = (testo: string) => tokenizzaGherkin(testo).map((r) => r.tipo);

describe('tokenizzaGherkin: le righe tipizzate', () => {
  it('riconosce tag, Feature, Background, Scenario, Scenario Outline, Examples e i passi', () => {
    const testo = [
      '@shop @order',
      'Feature: Ordini',
      '',
      '  Background:',
      '    Given a',
      '  Scenario: Il cliente completa l\'ordine',
      '    When b',
      '    Then c',
      '    And d',
      '    But e',
      '    * f',
      '  Scenario Outline: Login <utente>',
      '    Given g',
      '  Examples:',
      '    | utente |',
      '    | anna   |',
    ].join('\n');
    expect(tipi(testo)).toEqual([
      'tag', 'intestazione', 'vuota', 'intestazione', 'passo',
      'intestazione', 'passo', 'passo', 'passo', 'passo', 'passo',
      'intestazione', 'passo', 'intestazione', 'tabella', 'tabella',
    ]);
    const righe = tokenizzaGherkin(testo);
    expect(righe[0]).toMatchObject({ tipo: 'tag', tag: ['@shop', '@order'] });
    expect(righe[1]).toMatchObject({ tipo: 'intestazione', parola: 'Feature', titolo: 'Ordini' });
    expect(righe[5]).toMatchObject({ tipo: 'intestazione', parola: 'Scenario', titolo: "Il cliente completa l'ordine" });
    expect(righe[11]).toMatchObject({ parola: 'Scenario Outline', titolo: 'Login <utente>' });
    expect(righe[6]).toMatchObject({ tipo: 'passo', parola: 'When' });
    expect(righe[10]).toMatchObject({ tipo: 'passo', parola: '*' });
  });

  it('ogni riga porta il suo numero, da 1, e il testo originale', () => {
    const r = tokenizzaGherkin('Feature: A\n  Scenario: B\n');
    expect(r.map((x) => x.numero)).toEqual([1, 2]);
    expect(r[1].originale).toBe('  Scenario: B');
  });

  it('il testo fra virgolette dentro un passo diventa un valore a parte, anche con un apostrofo dentro', () => {
    const [passo] = tokenizzaGherkin('    Then the user sees "l\'ordine di Anna" in the list');
    expect(passo).toMatchObject({ tipo: 'passo', parola: 'Then' });
    if (passo.tipo !== 'passo') throw new Error('atteso un passo');
    expect(passo.parti).toEqual([
      { valore: false, testo: 'the user sees ' },
      { valore: true, testo: '"l\'ordine di Anna"' },
      { valore: false, testo: ' in the list' },
    ]);
  });

  it('piu\' valori nello stesso passo, e un passo senza valori e\' una parte sola', () => {
    const [a] = tokenizzaGherkin('Given "x" e "y"');
    if (a.tipo !== 'passo') throw new Error('atteso un passo');
    expect(a.parti.filter((p) => p.valore).map((p) => p.testo)).toEqual(['"x"', '"y"']);
    const [b] = tokenizzaGherkin('Given niente');
    if (b.tipo !== 'passo') throw new Error('atteso un passo');
    expect(b.parti).toEqual([{ valore: false, testo: 'niente' }]);
  });

  it('una virgoletta senza chiusura non spezza il passo: resta testo', () => {
    const [p] = tokenizzaGherkin('Given il cliente dice "ciao');
    if (p.tipo !== 'passo') throw new Error('atteso un passo');
    expect(p.parti.map((x) => x.testo).join('')).toBe('il cliente dice "ciao');
  });

  it('una verifica a meta\' passo diventa una riga a se\', anche se contiene un apostrofo; un altro commento resta commento', () => {
    const testo = [
      'Given a',
      `    # ${PREFISSO_VERIFICA} "il carrello e' vuoto"`,
      '    # una nota qualunque',
    ].join('\n');
    const righe = tokenizzaGherkin(testo);
    expect(righe[1]).toMatchObject({ tipo: 'verifica', testo: "il carrello e' vuoto" });
    expect(righe[2]).toMatchObject({ tipo: 'commento' });
  });

  it('il file con fine riga CRLF da\' lo stesso risultato di LF', () => {
    const lf = '@a\nFeature: X\n  Scenario: Y\n    Given "v"\n    # durante questo passo si verifica: "k"\n';
    const quasi = (r: ReturnType<typeof tokenizzaGherkin>) => r.map(({ originale: _o, ...resto }) => resto);
    expect(quasi(tokenizzaGherkin(lf.replace(/\n/g, '\r\n')))).toEqual(quasi(tokenizzaGherkin(lf)));
  });

  it('una tabella, una descrizione libera e una riga vuota hanno il loro tipo', () => {
    const testo = [
      'Feature: X',
      '  Come cliente',
      '  voglio ordinare',
      '',
      '  Scenario: Y',
      '    Given a',
      '      | col1 | col2 |',
      '      | a    | b    |',
    ].join('\n');
    expect(tipi(testo)).toEqual(['intestazione', 'descrizione', 'descrizione', 'vuota', 'intestazione', 'passo', 'tabella', 'tabella']);
    const tabella = tokenizzaGherkin(testo)[6];
    expect(tabella).toMatchObject({ tipo: 'tabella', celle: ['col1', 'col2'] });
  });

  it('una riga sconosciuta dentro uno scenario e\' testo semplice, non una descrizione', () => {
    expect(tipi('Feature: X\n  Scenario: Y\n    una riga strana\n')).toEqual(['intestazione', 'intestazione', 'semplice']);
  });

  it('il contenuto di un docstring non si interpreta', () => {
    const testo = ['Scenario: Y', '  Given un testo', '    """', '    Given non sono un passo', '    # ne\' un commento', '    """'].join('\n');
    expect(tipi(testo)).toEqual(['intestazione', 'passo', 'semplice', 'semplice', 'semplice', 'semplice']);
  });

  it('# language: it e i passi in italiano restano testo semplice e non lanciano', () => {
    const testo = '# language: it\nFunzionalità: Ordini\n  Scenario: Y\n    Dato che il cliente è collegato\n';
    expect(() => tokenizzaGherkin(testo)).not.toThrow();
    expect(tipi(testo).every((t) => t === 'semplice')).toBe(true);
  });

  it('# language: en si legge normalmente, e passi in italiano senza dichiarazione sono semplici', () => {
    expect(tipi('# language: en\nFeature: X\n')).toEqual(['commento', 'intestazione']);
    expect(tipi('Scenario: Y\n    Dato che x\n')).toEqual(['intestazione', 'semplice']);
  });

  it('un testo vuoto da\' nessuna riga, e l\'ultimo a capo non crea una riga vuota in piu\'', () => {
    expect(tokenizzaGherkin('')).toEqual([]);
    expect(tokenizzaGherkin('Feature: X\n')).toHaveLength(1);
  });

  it('il rientro e\' quello del testo', () => {
    const [a, b] = tokenizzaGherkin('Feature: X\n    Scenario: Y');
    expect(a.rientro).toBe(0);
    expect(b.rientro).toBe(4);
  });
});

describe('contratto con il generatore', () => {
  it('il prefisso che il tokenizzatore riconosce e\' lo stesso che generate-emit.ts scrive', () => {
    // Il generatore scrive in italiano `# durante questo passo si verifica: "..."`.
    // Se uno dei due cambia da solo, le verifiche tornano commenti grigi e
    // nessuno se ne accorge: e' proprio il silenzio che questo caso rompe.
    const sorgente = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'scripts', 'lib', 'generate-emit.ts'), 'utf-8');
    expect(sorgente).toContain(`# ${PREFISSO_VERIFICA} "`);
  });
});
