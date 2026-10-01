import { describe, it, expect } from 'vitest';
import en from '../../messages/en.json';
import it_ from '../../messages/it.json';

/** Il nome dei segnaposto `{nome}` di un messaggio, anche dentro un `plural`. */
function segnaposto(testo: string): string[] {
  const nomi = new Set<string>();
  for (const m of testo.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/g)) nomi.add(m[1]);
  return [...nomi].sort();
}

const scenariIt = (it_ as unknown as { Scenari: Record<string, string> }).Scenari;
const scenariEn = (en as unknown as { Scenari: Record<string, string> }).Scenari;

describe('i testi della pagina Scenari', () => {
  it('Scenari ha le stesse chiavi in italiano e in inglese', () => {
    expect(Object.keys(scenariEn).sort()).toEqual(Object.keys(scenariIt).sort());
  });

  it('Cruscotto.navScenari c\'e\' in tutt\'e due le lingue', () => {
    const c = (m: unknown) => (m as { Cruscotto: Record<string, string> }).Cruscotto;
    expect(c(it_).navScenari).toBeTruthy();
    expect(c(en).navScenari).toBeTruthy();
  });

  it('ogni segnaposto di una lingua c\'e\' anche nell\'altra', () => {
    for (const chiave of Object.keys(scenariIt)) {
      expect(segnaposto(scenariEn[chiave]), `segnaposto di ${chiave}`).toEqual(segnaposto(scenariIt[chiave]));
    }
  });

  it('nessun testo e\' vuoto', () => {
    for (const [chiave, valore] of Object.entries({ ...scenariIt })) expect(valore.trim(), chiave).not.toBe('');
    for (const [chiave, valore] of Object.entries({ ...scenariEn })) expect(valore.trim(), chiave).not.toBe('');
  });

  it('il tester non vede mai un comando ne\' un percorso di file', () => {
    const tutti = [...Object.values(scenariIt), ...Object.values(scenariEn)];
    for (const testo of tutti) {
      expect(testo).not.toMatch(/npm |npx |\.feature|src\/|reports\/|\.json/);
    }
  });

  it('parla di ambiente, non di bersaglio, e di prova, non di run', () => {
    for (const testo of Object.values(scenariIt)) {
      expect(testo).not.toMatch(/\bbersagli[oi]\b/i);
      expect(testo).not.toMatch(/\bpickle\b|\bGherkin\b/i);
    }
    for (const testo of Object.values(scenariEn)) {
      expect(testo).not.toMatch(/\btargets?\b/i);
      expect(testo).not.toMatch(/\bpickle\b|\bGherkin\b/i);
    }
  });
});
