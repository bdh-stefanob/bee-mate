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

describe('la velocita\' con cui si guarda il browser', () => {
  // Chi guarda il test vuole vedere cosa succede: senza rallentare, sei secondi
  // di passi verdi passano in un lampo. La velocita' e' un numero, mai una riga.
  it('un test lento porta i millisecondi in forma nuda', () => {
    const r = rigaDiComando('test', { bersaglio: 'demo', vedi: true, rallenta: 500 });
    expect(r.argomenti).toEqual([
      'node_modules/ts-node/dist/bin.js',
      'scripts/test-bersaglio.ts', 'demo', 'generati', 'vedi', 'rallenta=500',
    ]);
  });

  it('senza velocita\' o a zero, non compare niente', () => {
    expect(rigaDiComando('test', { bersaglio: 'demo', vedi: true }).argomenti.join(' ')).not.toMatch(/rallenta/);
    expect(rigaDiComando('test', { bersaglio: 'demo', vedi: true, rallenta: 0 }).argomenti.join(' ')).not.toMatch(/rallenta/);
  });

  it('rifiuta cio\' che non e\' un numero intero ragionevole', () => {
    for (const cattivo of [-1, 1.5, 999999, Number.NaN, '500; rm -rf /' as unknown as number]) {
      expect(() => rigaDiComando('test', { bersaglio: 'demo', vedi: true, rallenta: cattivo })).toThrow(/velocita/);
    }
  });
});

describe('una lista di scenari scelta dalla finestra', () => {
  const A = 'src/features/app/flusso/a.feature';
  const B = 'src/features/app/flusso/b.feature';
  const dopoIlBersaglio = (argomenti: string[]) => argomenti.slice(3); // [ts-node, script, bersaglio, ...]

  it('due scenari sono due argomenti separati, nell\'ordine dato, e nessuno comincia con un trattino', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro', scenari: [B, A] });
    expect(r.argomenti).toEqual([
      'node_modules/ts-node/dist/bin.js', 'scripts/test-bersaglio.ts', 'lavoro', B, A,
    ]);
    expect(r.argomenti.some((x) => x.startsWith('-'))).toBe(false);
    expect(r.argomenti).not.toContain('generati');
  });

  it('un solo scenario in lista e\' come lo scenario singolo di prima', () => {
    const lista = rigaDiComando('test', { bersaglio: 'lavoro', scenari: [A] });
    const singolo = rigaDiComando('test', { bersaglio: 'lavoro', scenario: A });
    expect(lista.argomenti).toEqual(singolo.argomenti);
  });

  it('lo scenario singolo continua a funzionare identico', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro', scenario: A, vedi: true });
    expect(dopoIlBersaglio(r.argomenti)).toEqual([A, 'vedi']);
  });

  it('le opzioni si accodano dopo tutti gli scenari', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro', scenari: [A, B], vedi: true, rallenta: 300, messaggi: 'reports/cruscotto/x.ndjson' });
    expect(dopoIlBersaglio(r.argomenti)).toEqual([A, B, 'vedi', 'rallenta=300', 'messaggi=reports/cruscotto/x.ndjson']);
  });

  it('una lista vuota e\' un errore, non "tutti gli scenari registrati"', () => {
    // Il difetto che questo caso ferma: una lista vuota in silenzio poteva
    // diventare "nessun percorso", cioe' tutti gli scenari — l'opposto di
    // "non ho scelto niente".
    expect(() => rigaDiComando('test', { bersaglio: 'x', scenari: [] })).toThrow(/scenari.*vuota/);
  });

  it('piu\' di cento voci sono un errore, cento passano', () => {
    const voci = (n: number) => Array.from({ length: n }, (_, i) => `src/features/app/f${i}.feature`);
    expect(rigaDiComando('test', { bersaglio: 'x', scenari: voci(100) }).argomenti.length).toBe(3 + 100);
    expect(() => rigaDiComando('test', { bersaglio: 'x', scenari: voci(101) })).toThrow(/al massimo 100/);
  });

  it('una voce non valida rifiuta tutta la lista, e dice quale', () => {
    for (const veleno of [
      'src/features/x.feature;src/features/y.feature',
      'src/features/../../etc/passwd.feature',
      'src/features/x y.feature',
      'src/features/x.feature & del *',
      'src/steps/x.steps.ts',
      'src/features/x.feature:0',
      'vedi',
      '',
    ]) {
      expect(
        () => rigaDiComando('test', { bersaglio: 'x', scenari: [A, veleno] }),
        JSON.stringify(veleno)
      ).toThrow(/scenario non valido/);
    }
  });

  it('una voce che non e\' una stringa e una lista che non e\' una lista sono rifiutate', () => {
    for (const cattivo of [[A, 42], [A, null], [[A]], 'src/features/a.feature', { 0: A }]) {
      expect(
        () => rigaDiComando('test', { bersaglio: 'x', scenari: cattivo as unknown as string[] }),
        JSON.stringify(cattivo)
      ).toThrow(/scenar/);
    }
  });

  it('scenario e scenari insieme sono ambigui: errore', () => {
    expect(() => rigaDiComando('test', { bersaglio: 'x', scenario: A, scenari: [B] })).toThrow(/scenario.*scenari|scenari.*scenario/);
  });

  it('lo stesso scenario due volte e\' un errore che lo nomina', () => {
    expect(() => rigaDiComando('test', { bersaglio: 'x', scenari: [A, B, A] })).toThrow(/doppio.*a\.feature/);
    expect(() => rigaDiComando('test', { bersaglio: 'x', scenari: [`${A}:3`, `${A}:3`] })).toThrow(/doppio/);
  });

  it('due righe dello stesso file restano due voci: Cucumber le esegue una volta ciascuna', () => {
    // Verificato su Cucumber 10.9 (percorsi-cucumber.check.ts): il lanciatore non
    // deve fonderle in `file:3:9`.
    const r = rigaDiComando('test', { bersaglio: 'x', scenari: [`${A}:3`, `${A}:9`] });
    expect(dopoIlBersaglio(r.argomenti)).toEqual([`${A}:3`, `${A}:9`]);
  });

  it('un file intero e una sua riga: resta solo l\'intero', () => {
    // Il difetto che questo caso ferma: Cucumber, dato `a.feature` e `a.feature:3`,
    // esegue SOLO la riga 3 (verificato). Chi sceglie il file intero e ne ha uno
    // scenario non riceve nessun errore: un risultato verde che non e' il suo.
    const r = rigaDiComando('test', { bersaglio: 'x', scenari: [`${A}:3`, B, A, `${A}:9`] });
    expect(dopoIlBersaglio(r.argomenti)).toEqual([B, A]);
  });

  it('l\'intero sostituisce le righe anche quando viene dopo, e le righe di altri file restano', () => {
    const r = rigaDiComando('test', { bersaglio: 'x', scenari: [`${B}:5`, `${A}:3`, A] });
    expect(dopoIlBersaglio(r.argomenti)).toEqual([`${B}:5`, A]);
  });

  it('la lista vale solo per il comando test: gli altri non la leggono', () => {
    const r = rigaDiComando('sessione', { bersaglio: 'x', scenari: [A] });
    expect(r.argomenti.join(' ')).not.toContain('a.feature');
  });
});

describe('la diagnosi non ricontrolla i tipi', () => {
  // Misurato il 30/9: 1,45 s per ogni apertura del Controllo, di cui circa 0,8
  // spesi a ricontrollare i tipi di script che `tsc` e `check:all` controllano
  // gia'. Solo la diagnosi: nei test il controllo dei tipi e' quello che mostra
  // in chiaro un passo generato sbagliato.
  it('la diagnosi parte con ts-node in sola traduzione', () => {
    expect(rigaDiComando('diagnosi').argomenti).toEqual([
      'node_modules/ts-node/dist/bin-transpile.js', 'scripts/diagnosi.ts', 'json',
    ]);
  });

  it('gli altri script restano con il controllo dei tipi', () => {
    expect(rigaDiComando('test', { bersaglio: 'x' }).argomenti[0]).toBe('node_modules/ts-node/dist/bin.js');
  });
});
