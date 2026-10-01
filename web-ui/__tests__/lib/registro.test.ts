import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { avvia, stato, ferma, operazioneInCorso, azzeraPerTest, usaRegistrazioneEsiti, usaPulizia } from '@/lib/registro';
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
    expect(opzione).toMatch(/^messaggi=reports\/cruscotto\/test-[a-z0-9]+-[0-9]+\.ndjson$/);
  });
});

describe("cosa sta girando adesso, per chi torna e vuole riagganciarsi", () => {
  it('niente in corso: niente da riagganciare', () => {
    expect(operazioneInCorso()).toBeUndefined();
  });

  it("un'operazione lunga in corso si fa trovare, con id, nome e avvio", () => {
    const e = avvia('registrazione', { bersaglio: 'x' }, () => processoFinto());
    expect(operazioneInCorso()).toEqual({ id: e.id, nome: 'registrazione', avvio: e.avvio });
  });

  it("le righe non ci sono: chi chiede da fuori non deve vedere cosa il tester sta registrando", () => {
    const finto = processoFinto();
    avvia('registrazione', { bersaglio: 'x' }, () => finto);
    finto.emettiRiga('il tester chiama questo passo "segreto-aziendale"');
    const op = operazioneInCorso();
    expect(op).not.toHaveProperty('righe');
    expect(JSON.stringify(op)).not.toContain('segreto-aziendale');
  });

  it('conclusa, non risulta piu\' in corso', () => {
    const finto = processoFinto();
    avvia('registrazione', { bersaglio: 'x' }, () => finto);
    finto.concludi(0);
    expect(operazioneInCorso()).toBeUndefined();
  });

  it('la generazione non tiene occupato il browser: non e\' fra le operazioni da riagganciare', () => {
    avvia('generazione', { manifesto: 'reports/cruscotto/m.json' }, () => processoFinto());
    expect(operazioneInCorso()).toBeUndefined();
  });

  it('il catalogo non tiene occupato il browser nemmeno lui', () => {
    avvia('catalogo', {}, () => processoFinto());
    expect(operazioneInCorso()).toBeUndefined();
  });

  it('due rigenerazioni del catalogo insieme: la seconda riceve un no chiaro', () => {
    // Non e' il lucchetto del browser (il catalogo non ne ha bisogno): e'
    // il suo, perche' due rigenerazioni scriverebbero insieme sullo stesso
    // step-catalog.json.
    avvia('catalogo', {}, () => processoFinto());
    expect(() => avvia('catalogo', {}, () => processoFinto())).toThrow(/gia' aggiornando/);
  });

  it('conclusa la prima rigenerazione, la seconda puo\' partire', () => {
    const finto = processoFinto();
    avvia('catalogo', {}, () => finto);
    finto.concludi(0);
    expect(() => avvia('catalogo', {}, () => processoFinto())).not.toThrow();
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

describe('il registro e\' uno solo, anche se il server carica il modulo piu\' volte', () => {
  // Il difetto che questo caso ferma (collaudo del 30/9): in sviluppo Next carica
  // `registro.ts` una volta per rotta, e ognuna aveva il suo elenco vuoto. La
  // rotta che avvia la registrazione la vedeva; quella del flusso di eventi no e
  // rispondeva "sconosciuta", che la finestra leggeva come un errore mentre il
  // browser si apriva lo stesso. E la rotta di stop non la trovava.
  it('un\'esecuzione avviata da una copia del modulo si vede dall\'altra', async () => {
    const { vi } = await import('vitest');
    vi.resetModules();
    const prima = await import('@/lib/registro');
    const finto = processoFinto();
    const e = prima.avvia('registrazione', { bersaglio: 'x' }, () => finto);

    vi.resetModules();
    const seconda = await import('@/lib/registro');

    expect(seconda.stato(e.id)?.stato).toBe('in corso');
    expect(seconda.operazioneInCorso()?.id).toBe(e.id);
    expect(seconda.ferma(e.id)).toBe(true);
  });
});

describe('gli id sono unici', () => {
  // Il difetto che questo caso ferma: l'id era <nome>-<tempo in base 36>, quindi
  // due avvii nello stesso millisecondo avevano lo stesso id, e la seconda
  // esecuzione sovrascriveva la prima nel registro e nel suo file su disco.
  afterEach(() => vi.useRealTimers());

  it('due avvii nello stesso millisecondo hanno id diversi', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T10:00:00.000Z'));
    const a = avvia('diagnosi', {}, () => processoFinto());
    const b = avvia('diagnosi', {}, () => processoFinto());
    expect(a.id).not.toBe(b.id);
    expect(stato(a.id)).toBe(a);
    expect(stato(b.id)).toBe(b);
  });

  it("l'id di un test e' un nome di file sicuro (solo lettere, cifre e trattini)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T10:00:00.000Z'));
    const e = avvia('test', { bersaglio: 'demo' }, () => processoFinto());
    expect(e.id).toMatch(/^test-[a-z0-9]+-[0-9]+$/);
  });

  it("l'unicita' vale anche se il server carica il modulo piu' volte", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T10:00:00.000Z'));
    vi.resetModules();
    const prima = await import('@/lib/registro');
    const a = prima.avvia('diagnosi', {}, () => processoFinto());
    vi.resetModules();
    const seconda = await import('@/lib/registro');
    const b = seconda.avvia('diagnosi', {}, () => processoFinto());
    expect(a.id).not.toBe(b.id);
  });
});

describe('gli esiti per scenario a fine prova (la pagina Scenari)', () => {
  // Il doppio dell'estrazione: si guarda cosa riceve e in che stato e' la prova
  // mentre lo riceve. Il lanciatore finto c'e' gia'.
  const chiamate: Array<{ id: string; ambiente: string | null; messaggi: string; statoAllora?: string }> = [];

  beforeEach(() => {
    chiamate.length = 0;
    usaRegistrazioneEsiti((prova) => {
      chiamate.push({ ...prova, statoAllora: stato(prova.id)?.stato });
    });
  });
  afterEach(() => usaRegistrazioneEsiti(undefined));

  it('a fine di un test concluso riceve l\'id, l\'ambiente e i messaggi di quella prova', () => {
    const finto = processoFinto();
    const e = avvia('test', { bersaglio: 'staging' }, () => finto);
    finto.concludi(0);
    expect(chiamate).toHaveLength(1);
    expect(chiamate[0]).toMatchObject({ id: e.id, ambiente: 'staging', messaggi: `reports/cruscotto/${e.id}.ndjson` });
  });

  it('anche un test fallito (rosso) registra: e\' proprio li\' che servono', () => {
    const finto = processoFinto();
    avvia('test', { bersaglio: 'staging' }, () => finto);
    finto.concludi(1);
    expect(chiamate).toHaveLength(1);
  });

  it('a fine di un test interrotto l\'indice non cambia: i messaggi sono tagliati', () => {
    const finto = processoFinto();
    const e = avvia('test', { bersaglio: 'staging' }, () => finto);
    ferma(e.id);
    expect(chiamate).toEqual([]);
  });

  it('quando l\'indice viene scritto, lo stato della prova e\' ancora "in corso"', () => {
    // L'ordine che regge "dopo una prova l'esito nuovo c'e' gia'": l'evento di
    // fine parte appena lo stato non e' piu' "in corso", e la finestra rilegge
    // subito. Se l'indice si scrivesse dopo, la rilettura vedrebbe quello vecchio.
    const finto = processoFinto();
    const e = avvia('test', { bersaglio: 'staging' }, () => finto);
    finto.concludi(0);
    expect(chiamate[0].statoAllora).toBe('in corso');
    expect(stato(e.id)!.stato).toBe('conclusa');
  });

  it('se la registrazione lancia, la prova risulta comunque conclusa o fallita come prima', () => {
    usaRegistrazioneEsiti(() => {
      throw new Error('disco pieno');
    });
    const ok = processoFinto();
    const a = avvia('test', { bersaglio: 'staging' }, () => ok);
    expect(() => ok.concludi(0)).not.toThrow();
    expect(stato(a.id)!.stato).toBe('conclusa');
    expect(stato(a.id)!.fine).toBeDefined();

    const ko = processoFinto();
    const b = avvia('test', { bersaglio: 'staging' }, () => ko);
    ko.concludi(1);
    expect(stato(b.id)!.stato).toBe('fallita');
  });

  it('un comando che non e\' test non tocca l\'indice', () => {
    for (const nome of ['diagnosi', 'catalogo'] as const) {
      const finto = processoFinto();
      avvia(nome, {}, () => finto);
      finto.concludi(0);
    }
    const reg = processoFinto();
    avvia('registrazione', { bersaglio: 'x' }, () => reg);
    reg.concludi(0);
    expect(chiamate).toEqual([]);
  });
});

describe('la pulizia dello storico a fine esecuzione', () => {
  const chiamate: string[][] = [];
  beforeEach(() => {
    chiamate.length = 0;
    usaRegistrazioneEsiti(() => {});
    usaPulizia((inCorso) => {
      chiamate.push(inCorso);
    });
  });
  afterEach(() => {
    usaRegistrazioneEsiti(undefined);
    usaPulizia(undefined);
  });

  it("gira una volta a fine esecuzione, non all'avvio ne' a ogni lettura", () => {
    const finto = processoFinto();
    const e = avvia('test', { bersaglio: 'staging' }, () => finto);
    stato(e.id);
    expect(chiamate).toHaveLength(0);
    finto.concludi(1);
    expect(chiamate).toHaveLength(1);
  });

  it("dice cosa e' ancora in corso, e non include la prova appena finita", () => {
    const lunga = processoFinto();
    const a = avvia('diagnosi', {}, () => lunga);
    const corta = processoFinto();
    const b = avvia('catalogo', {}, () => corta);
    corta.concludi(0);
    expect(chiamate[0]).toEqual([a.id]);
    expect(chiamate[0]).not.toContain(b.id);
  });

  it('se la pulizia lancia, la prova risulta conclusa come prima', () => {
    usaPulizia(() => {
      throw new Error('disco');
    });
    const finto = processoFinto();
    const e = avvia('diagnosi', {}, () => finto);
    expect(() => finto.concludi(0)).not.toThrow();
    expect(stato(e.id)!.stato).toBe('conclusa');
  });
});
