import { describe, it, expect } from 'vitest';
import en from '../../messages/en.json';
import it_ from '../../messages/it.json';

/** Il nome dei segnaposto `{nome}` di un messaggio, anche dentro un `plural`. */
function segnaposto(testo: string): string[] {
  const nomi = new Set<string>();
  for (const m of testo.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*[,}]/g)) nomi.add(m[1]);
  return [...nomi].sort();
}

const mIt = (it_ as unknown as { ModificaScenario: Record<string, string> }).ModificaScenario;
const mEn = (en as unknown as { ModificaScenario: Record<string, string> }).ModificaScenario;

describe('i testi della modifica degli scenari', () => {
  it('ModificaScenario ha le stesse chiavi in italiano e in inglese', () => {
    expect(Object.keys(mEn).sort()).toEqual(Object.keys(mIt).sort());
  });

  it('ogni segnaposto di una lingua c\'e\' anche nell\'altra', () => {
    for (const chiave of Object.keys(mIt)) {
      expect(segnaposto(mEn[chiave]), `segnaposto di ${chiave}`).toEqual(segnaposto(mIt[chiave]));
    }
  });

  it('nessun testo e\' vuoto', () => {
    for (const [chiave, valore] of [...Object.entries(mIt), ...Object.entries(mEn)]) {
      expect(valore.trim(), chiave).not.toBe('');
    }
  });

  it('il tester non vede mai un comando, un percorso di file o la parola Gherkin', () => {
    for (const testo of [...Object.values(mIt), ...Object.values(mEn)]) {
      expect(testo).not.toMatch(/npm |npx |\.feature|\.ts\b|src\/|reports\/|\.json|Gherkin/);
    }
  });

  it('parla di ambiente e di scenario, non di bersaglio ne\' di pickle', () => {
    for (const testo of Object.values(mIt)) expect(testo).not.toMatch(/\bbersagli[oi]\b|\bpickle\b/i);
    for (const testo of Object.values(mEn)) expect(testo).not.toMatch(/\btargets?\b|\bpickle\b/i);
  });

  it('i testi che dicono la regola del marcatore ci sono, nelle due lingue', () => {
    expect(mIt.diventaTuo).toContain('diventa tuo');
    expect(mEn.diventaTuo).toContain('it\'s yours');
  });

  it('ogni codice di errore che le rotte possono restituire ha un testo', () => {
    // I codici di `ErrorePiano` che la finestra deve poter dire (vedi `errore-piano.ts`).
    for (const chiave of [
      'nonModificabileRegistrato', 'nonModificabileDocumento', 'nonModificabileComplesso', 'richiestaNonAmmessa',
      'operazioneInCorso', 'erroreCatalogo', 'erroreRipristino', 'erroreCambiatoDopo', 'erroreNienteDaAnnullare',
      'erroreGenerico', 'erroreRete', 'conflittoTitolo', 'bloccoFraseEsiste', 'bloccoNonRinominabile',
      'bocciatoTitolo', 'bocciatoIndefinito', 'bocciatoAmbiguo', 'bocciatoCompilazione', 'bocciatoTempo',
      'bocciatoNessunaProva', 'bocciatoFallito',
    ]) {
      expect(mIt[chiave], `it ${chiave}`).toBeTruthy();
      expect(mEn[chiave], `en ${chiave}`).toBeTruthy();
    }
  });
});
