import { describe, it, expect } from 'vitest';
import { rigaDiComando } from '@/lib/esecuzione';
import { COMANDI_ESEGUIBILI } from '@/lib/rimedi';

describe('elenco chiuso dei comandi', () => {
  it('rifiuta un comando che non e\' nell\'elenco', () => {
    // @ts-expect-error: e' proprio il caso che deve fallire a runtime
    expect(() => rigaDiComando('rm -rf /')).toThrow(/non e' un comando previsto/);
  });

  it('un test si lancia con le opzioni in forma nuda', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro', vedi: true, pulito: true });
    expect(r.argomenti).toEqual([
      'node_modules/ts-node/dist/bin.js',
      'scripts/test-bersaglio.ts', 'lavoro', 'generati', 'vedi', 'pulito',
    ]);
  });

  it('nessuna opzione con i trattini, mai', () => {
    const tutti: Array<Parameters<typeof rigaDiComando>[0]> =
      ['diagnosi', 'sessione', 'registrazione', 'generazione', 'test', 'scansione',
        'installa-browser', 'sincronizza-regole'];
    for (const nome of tutti) {
      const r = rigaDiComando(nome, { bersaglio: 'x', manifesto: 'reports/m.json', messaggi: 'reports/g.ndjson' });
      expect(r.argomenti.some((a) => a.startsWith('-'))).toBe(false);
    }
  });

  it('installa-browser lancia playwright install chromium', () => {
    const r = rigaDiComando('installa-browser');
    expect(r.argomenti).toEqual(['node_modules/playwright/cli.js', 'install', 'chromium']);
  });

  it('sincronizza-regole lancia lo script di sync', () => {
    const r = rigaDiComando('sincronizza-regole');
    expect(r.argomenti).toEqual(['node_modules/ts-node/dist/bin.js', 'scripts/sync-rules.ts']);
  });

  it('catalogo lancia la rigenerazione, senza parametri', () => {
    const r = rigaDiComando('catalogo');
    expect(r.argomenti).toEqual(['node_modules/ts-node/dist/bin.js', 'scripts/rigenera-catalogo.ts']);
  });

  it('il bersaglio non puo\' iniettare argomenti', () => {
    expect(() => rigaDiComando('test', { bersaglio: 'lavoro && del *' }))
      .toThrow(/nome di bersaglio non valido/);
  });
});

describe('i rimedi che la finestra avvia da sola', () => {
  it('partono tutti senza parametri', () => {
    // Il difetto che questo caso ferma: registrazione e scansione erano
    // nell'elenco dei rimedi avviabili, ma vogliono un bersaglio che la riga
    // di una diagnosi non ha. Il pulsante partiva e falliva sempre.
    for (const nome of COMANDI_ESEGUIBILI) {
      expect(() => rigaDiComando(nome), `${nome} chiede parametri`).not.toThrow();
    }
  });

  it('e i comandi che vogliono un bersaglio non ci sono', () => {
    for (const nome of ['sessione', 'registrazione', 'scansione', 'test'] as const) {
      expect(() => rigaDiComando(nome)).toThrow();
      expect(COMANDI_ESEGUIBILI).not.toContain(nome);
    }
  });
});

describe('niente shell, e niente che una shell potrebbe interpretare', () => {
  it('non chiama mai un programma attraverso npx', () => {
    // `npx` su Windows e' uno script, e farlo partire richiedeva una shell.
    // Una shell non riceve una lista di argomenti: riceve una riga di testo.
    const tutti = [
      'diagnosi', 'sessione', 'registrazione', 'generazione', 'test', 'scansione',
      'installa-browser', 'sincronizza-regole',
    ] as const;
    for (const nome of tutti) {
      const r = rigaDiComando(nome, { bersaglio: 'x', manifesto: 'reports/m.json', messaggi: 'reports/g.ndjson' });
      expect(r.eseguibile).not.toMatch(/npx/);
      expect(r.argomenti).not.toContain('ts-node');
    }
  });

  it('rifiuta un percorso che porta dentro un secondo comando', () => {
    // Il caso riprodotto dalla revisione: con la shell accesa, questo argomento
    // arrivava concatenato e la parte dopo la `&` diventava un comando a se'.
    for (const veleno of [
      'a.ndjson & echo entrato',
      'a.ndjson | tee fuori.txt',
      'a.ndjson; rm -rf .',
      'a nd.json',
      'a.ndjson"',
      '$(comando).ndjson',
      '`comando`.ndjson',
    ]) {
      expect(
        () => rigaDiComando('test', { bersaglio: 'x', messaggi: veleno }),
        `${veleno} e' passato`
      ).toThrow(/non valido/);
    }
  });

  it('e lo stesso vale per il manifesto', () => {
    expect(() =>
      rigaDiComando('generazione', { manifesto: 'reports/m.json & echo entrato' })
    ).toThrow(/non valido/);
  });

  it('un percorso deve stare dentro reports/, non solo evitare i ..', () => {
    // Il charset da solo ammetteva la barra iniziale, quindi un percorso
    // assoluto passava e Cucumber ci avrebbe scritto davvero. Il commento
    // prometteva "resta dentro reports/" e non era vero.
    for (const fuori of ['/Windows/x.ndjson', '.env', 'src/x.ndjson', 'reportsfinti/x.ndjson']) {
      expect(
        () => rigaDiComando('test', { bersaglio: 'x', messaggi: fuori }),
        `${fuori} e' passato`
      ).toThrow(/non valido/);
    }
  });

  it('un percorso normale passa ancora', () => {
    const r = rigaDiComando('test', { bersaglio: 'x', messaggi: 'reports/cruscotto/test-a1.ndjson' });
    expect(r.argomenti).toContain('messaggi=reports/cruscotto/test-a1.ndjson');
  });
});

describe('uno scenario scelto dalla finestra', () => {
  it('un file intero sostituisce "tutti gli scenari registrati"', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro', scenario: 'src/features/app/flusso/ordine.feature' });
    expect(r.argomenti).toEqual([
      'node_modules/ts-node/dist/bin.js',
      'scripts/test-bersaglio.ts', 'lavoro', 'src/features/app/flusso/ordine.feature',
    ]);
  });

  it('uno scenario solo si indica con la sua riga', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro', scenario: 'src/features/generated/x.feature:12', vedi: true });
    expect(r.argomenti).toContain('src/features/generated/x.feature:12');
    expect(r.argomenti).not.toContain('generati');
    expect(r.argomenti).toContain('vedi');
  });

  it('senza scenario resta il comportamento di prima', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro' });
    expect(r.argomenti).toContain('generati');
  });

  it('rifiuta tutto cio\' che non e\' un .feature dentro src/features', () => {
    for (const veleno of [
      '../src/features/x.feature',
      'src/features/../../etc/passwd.feature',
      '/src/features/x.feature',
      'src/steps/x.steps.ts',
      'src/features/x.feature:0',
      'src/features/x.feature:12:3',
      'src/features/x y.feature',
      'src/features/x.feature & del *',
      'src/features/x.feature\n',
      'vedi',
    ]) {
      expect(
        () => rigaDiComando('test', { bersaglio: 'x', scenario: veleno }),
        veleno
      ).toThrow(/scenario non valido/);
    }
  });
});
