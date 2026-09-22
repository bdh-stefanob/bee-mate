import { describe, it, expect, beforeEach } from 'vitest';
import { avvia, stato, ferma, azzeraPerTest } from '@/lib/registro';
import type { ProcessoMinimo } from '@/lib/registro';

function processoFinto(): ProcessoMinimo & { emettiRiga(r: string): void; concludi(c: number): void } {
  let righe: ((r: string) => void) | null = null;
  let fine: ((c: number) => void) | null = null;
  return {
    onRiga(f) { righe = f; },
    onFine(f) { fine = f; },
    termina() { fine?.(130); },
    emettiRiga(r) { righe?.(r); },
    concludi(c) { fine?.(c); },
  };
}

beforeEach(() => azzeraPerTest());

describe('registro delle esecuzioni', () => {
  it('raccoglie le righe e conclude con il codice di uscita', () => {
    const finto = processoFinto();
    const e = avvia('diagnosi', {}, () => finto);
    finto.emettiRiga('tutto a posto');
    finto.concludi(0);
    const dopo = stato(e.id)!;
    expect(dopo.righe).toContain('tutto a posto');
    expect(dopo.stato).toBe('conclusa');
    expect(dopo.codice).toBe(0);
  });

  it('un codice diverso da zero è un fallimento, non una conclusione', () => {
    const finto = processoFinto();
    const e = avvia('diagnosi', {}, () => finto);
    finto.concludi(1);
    expect(stato(e.id)!.stato).toBe('fallita');
  });

  it('un comando lungo alla volta: il secondo riceve un no chiaro', () => {
    avvia('registrazione', { bersaglio: 'x' }, () => processoFinto());
    expect(() => avvia('registrazione', { bersaglio: 'y' }, () => processoFinto()))
      .toThrow(/gia' in corso/);
  });

  it('fermare un\'esecuzione la segna interrotta', () => {
    const finto = processoFinto();
    const e = avvia('registrazione', { bersaglio: 'x' }, () => finto);
    expect(ferma(e.id)).toBe(true);
    expect(stato(e.id)!.stato).toBe('interrotta');
  });

  it('tiene al massimo 500 righe, le ultime', () => {
    const finto = processoFinto();
    const e = avvia('diagnosi', {}, () => finto);
    for (let i = 0; i < 600; i++) finto.emettiRiga(`riga ${i}`);
    const righe = stato(e.id)!.righe;
    expect(righe.length).toBe(500);
    expect(righe[righe.length - 1]).toBe('riga 599');
  });
});

describe('la riga di comando che il registro costruisce davvero', () => {
  it('un test parte, e il percorso dei messaggi supera la sua validazione', () => {
    // Il difetto che questo caso ferma: il percorso veniva composto con
    // `path.join`, che su Windows da' barre rovesciate, mentre la validazione
    // della riga accetta solo barre in avanti. Ogni lancio moriva prima di
    // cominciare — e nessun caso se n'era accorto, perche' provavano la riga
    // di comando da sola, con percorsi scritti a mano.
    let argomenti: string[] = [];
    const finto = processoFinto();
    expect(() =>
      avvia('test', { bersaglio: 'demo' }, (_e, a) => {
        argomenti = a;
        return finto;
      })
    ).not.toThrow();
    const opzione = argomenti.find((a) => a.startsWith('messaggi='));
    expect(opzione).toBeDefined();
    expect(opzione).not.toContain('\\');
    expect(opzione).toMatch(/^messaggi=reports\/cruscotto\/test-[a-z0-9]+\.ndjson$/);
  });
});

describe('come viene avviato il processo figlio', () => {
  it('senza shell, e con l\'ambiente che serve nell\'eseguibile impacchettato', () => {
    // Nessun caso guardava le opzioni del lancio, e infatti una rotta aveva
    // ancora la shell accesa mentre tutti i 113 erano verdi. Il difetto non si
    // vedeva in sviluppo: `process.execPath` e' Node solo li'. Dentro
    // l'eseguibile e' l'applicazione stessa, e ogni comando avrebbe aperto una
    // seconda copia della finestra invece di eseguire uno script.
    let opzioni: Record<string, unknown> = {};
    const finto = processoFinto();
    avvia('diagnosi', {}, (_e, _a, o) => {
      opzioni = o as unknown as Record<string, unknown>;
      return finto;
    });
    expect(opzioni).not.toHaveProperty('shell');
    expect((opzioni.env as NodeJS.ProcessEnv).ELECTRON_RUN_AS_NODE).toBe('1');
  });
});
