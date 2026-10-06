import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  avvia,
  azzeraPerTest,
  ferma,
  stato,
  operazioneInCorso,
  operazioniInCorso,
  motivoRifiuto,
  usaRegistrazioneEsiti,
  usaPulizia,
  ErroreAvvio,
} from '@/lib/registro';
import { MASSIMO_TEST_CONTEMPORANEI } from '@/lib/corsie';
import type { ProcessoMinimo } from '@/lib/registro';
import type { NomeComando } from '@/lib/esecuzione';

/**
 * Il lucchetto diviso: le operazioni guidate da una persona (registrazione,
 * sessione, scansione) restano una alla volta e non convivono con nient'altro
 * che tenga occupato il browser; i test possono essere fino a due insieme.
 */

function processoFinto(): ProcessoMinimo & { concludi(c: number): void; terminato: boolean } {
  let fine: ((c: number) => void) | null = null;
  const p = {
    terminato: false,
    onRiga() {},
    onFine(f: (c: number) => void) { fine = f; },
    termina() { p.terminato = true; fine?.(130); },
    concludi(c: number) { fine?.(c); },
  };
  return p;
}

const BERSAGLIO = { bersaglio: 'demo' };

beforeEach(() => {
  azzeraPerTest();
  usaRegistrazioneEsiti(() => {});
  usaPulizia(() => {});
});
afterEach(() => {
  usaRegistrazioneEsiti(undefined);
  usaPulizia(undefined);
  vi.useRealTimers();
});

describe('il tetto dei test contemporanei e\' una costante, a due per la demo', () => {
  it('il massimo e\' due (Q3 della spec, prima di una misura)', () => {
    expect(MASSIMO_TEST_CONTEMPORANEI).toBe(2);
  });
});

describe('motivoRifiuto: la regola pura del lucchetto', () => {
  const cases: Array<[NomeComando, NomeComando[], 'ok' | 'occupato' | 'tetto']> = [
    ['test', [], 'ok'],
    ['test', ['test'], 'ok'],
    ['test', ['test', 'test'], 'tetto'],
    ['test', ['registrazione'], 'occupato'],
    ['test', ['sessione'], 'occupato'],
    ['test', ['scansione'], 'occupato'],
    ['registrazione', ['test'], 'occupato'],
    ['registrazione', ['registrazione'], 'occupato'],
    ['sessione', ['registrazione'], 'occupato'],
    ['scansione', ['test', 'test'], 'occupato'],
    // Ne' il catalogo ne' la diagnosi occupano il browser: non entrano nel lucchetto.
    ['diagnosi', ['test', 'test'], 'ok'],
    ['catalogo', ['test', 'test'], 'ok'],
  ];
  for (const [nome, inCorso, atteso] of cases) {
    it(`${nome} con [${inCorso.join(', ')}] in corso: ${atteso}`, () => {
      const motivo = motivoRifiuto(nome, inCorso);
      if (atteso === 'ok') expect(motivo).toBeNull();
      else expect(motivo?.codice).toBe(atteso);
      if (atteso === 'tetto') expect(motivo?.messaggio).toMatch(/2/);
    });
  }
});

describe('due test insieme, il terzo no', () => {
  it('due test partono insieme e risultano entrambi in corso', () => {
    const a = avvia('test', BERSAGLIO, () => processoFinto());
    const b = avvia('test', BERSAGLIO, () => processoFinto());
    expect(stato(a.id)?.stato).toBe('in corso');
    expect(stato(b.id)?.stato).toBe('in corso');
    expect(operazioniInCorso().map((o) => o.id)).toEqual([a.id, b.id]);
  });

  it('il terzo test riceve un no chiaro, con il numero nel messaggio, e non parte', () => {
    avvia('test', BERSAGLIO, () => processoFinto());
    avvia('test', BERSAGLIO, () => processoFinto());
    let avviato = false;
    try {
      avvia('test', BERSAGLIO, () => {
        avviato = true;
        return processoFinto();
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ErroreAvvio);
      expect((err as ErroreAvvio).codice).toBe('tetto');
      expect((err as ErroreAvvio).message).toMatch(/2/);
    }
    expect(avviato).toBe(false);
    expect(operazioniInCorso()).toHaveLength(2);
  });

  it('quando una corsia finisce, un posto si libera', () => {
    const primo = processoFinto();
    avvia('test', BERSAGLIO, () => primo);
    avvia('test', BERSAGLIO, () => processoFinto());
    primo.concludi(0);
    expect(() => avvia('test', BERSAGLIO, () => processoFinto())).not.toThrow();
  });
});

describe('un test e una persona non si contendono lo schermo', () => {
  it('una registrazione mentre c\'e\' un test: no', () => {
    avvia('test', BERSAGLIO, () => processoFinto());
    expect(() => avvia('registrazione', { bersaglio: 'x' }, () => processoFinto())).toThrow(/gia' in corso/);
  });

  it('un test mentre c\'e\' una registrazione: no, e con il codice "occupato"', () => {
    avvia('registrazione', { bersaglio: 'x' }, () => processoFinto());
    try {
      avvia('test', BERSAGLIO, () => processoFinto());
      expect.fail('doveva rifiutare');
    } catch (err) {
      expect((err as ErroreAvvio).codice).toBe('occupato');
    }
  });

  it('due registrazioni insieme: la seconda no', () => {
    avvia('registrazione', { bersaglio: 'x' }, () => processoFinto());
    expect(() => avvia('registrazione', { bersaglio: 'y' }, () => processoFinto())).toThrow(/gia' in corso/);
  });

  it('una sessione mentre c\'e\' un test: no', () => {
    avvia('test', BERSAGLIO, () => processoFinto());
    expect(() => avvia('sessione', { bersaglio: 'x' }, () => processoFinto())).toThrow(/gia' in corso/);
  });
});

describe('operazioniInCorso e operazioneInCorso', () => {
  it('niente in corso: lista vuota', () => {
    expect(operazioniInCorso()).toEqual([]);
    expect(operazioneInCorso()).toBeUndefined();
  });

  it('elenca tutte le corsie in corso, con id, nome e avvio, mai le righe', () => {
    const a = avvia('test', BERSAGLIO, () => processoFinto());
    const b = avvia('test', BERSAGLIO, () => processoFinto());
    const elenco = operazioniInCorso();
    expect(elenco).toEqual([
      { id: a.id, nome: 'test', avvio: a.avvio },
      { id: b.id, nome: 'test', avvio: b.avvio },
    ]);
    for (const o of elenco) expect(o).not.toHaveProperty('righe');
  });

  it('operazioneInCorso restituisce la prima corsia di test (retrocompatibile)', () => {
    const a = avvia('test', BERSAGLIO, () => processoFinto());
    avvia('test', BERSAGLIO, () => processoFinto());
    expect(operazioneInCorso()?.id).toBe(a.id);
  });

  it('le conclusioni tolgono dall\'elenco solo la corsia conclusa', () => {
    const a = processoFinto();
    const x = avvia('test', BERSAGLIO, () => a);
    avvia('test', BERSAGLIO, () => processoFinto());
    a.concludi(0);
    expect(operazioniInCorso().map((o) => o.id)).not.toContain(x.id);
    expect(operazioniInCorso()).toHaveLength(1);
  });
});

describe('ferma su una corsia non tocca l\'altra', () => {
  it('interrompere la prima lascia la seconda in corso e ne ferma solo il processo', () => {
    const pa = processoFinto();
    const pb = processoFinto();
    const a = avvia('test', BERSAGLIO, () => pa);
    const b = avvia('test', BERSAGLIO, () => pb);
    expect(ferma(a.id)).toBe(true);
    expect(pa.terminato).toBe(true);
    expect(pb.terminato).toBe(false);
    expect(stato(a.id)?.stato).toBe('interrotta');
    expect(stato(b.id)?.stato).toBe('in corso');
    expect(operazioniInCorso().map((o) => o.id)).toEqual([b.id]);
  });
});
