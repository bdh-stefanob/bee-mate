import { describe, it, expect } from 'vitest';
import en from '../../messages/en.json';
import it_ from '../../messages/it.json';

// (F10) Il tester sente una parola sola: "ambiente". "Bersaglio" / "target" e'
// il nome tecnico interno (`bdd-targets.json`, `resolveTarget`), non una
// parola per chi usa la finestra. Il caso sceglie la schermata Esegui perche'
// e' dove il difetto si vedeva, e vale per tutto il namespace.
describe('la schermata Esegui parla di ambiente, non di bersaglio', () => {
  const testi = (m: { Esecuzione: Record<string, unknown> }) =>
    Object.entries(m.Esecuzione).filter(([, v]) => typeof v === 'string') as Array<[string, string]>;

  it('in inglese non compare "target"', () => {
    const colpevoli = testi(en as never).filter(([, v]) => /\btargets?\b/i.test(v));
    expect(colpevoli).toEqual([]);
  });

  it('in italiano non compare "bersaglio"', () => {
    const colpevoli = testi(it_ as never).filter(([, v]) => /\bbersagli[oi]\b/i.test(v));
    expect(colpevoli).toEqual([]);
  });
});
