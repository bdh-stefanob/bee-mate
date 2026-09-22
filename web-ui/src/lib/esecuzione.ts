/**
 * L'elenco CHIUSO dei comandi che la finestra puo' chiedere.
 *
 * La UI manda un nome e dei parametri tipizzati, mai una stringa da eseguire:
 * un'app che esegue cio' che le si chiede e' un terminale travestito.
 *
 * Le opzioni si scrivono in forma nuda (`vedi`, `manifesto=...`): e' la sola
 * forma che arriva intatta in ogni shell — vedi metodo-di-lavoro.md.
 */
export type NomeComando =
  | 'diagnosi' | 'sessione' | 'registrazione' | 'generazione' | 'test' | 'scansione'
  | 'installa-browser' | 'sincronizza-regole';

export interface Parametri {
  bersaglio?: string;
  vedi?: boolean;
  pulito?: boolean;
  manifesto?: string;
  messaggi?: string;
}

/** Un bersaglio e' un nome, non una riga di comando. */
const BERSAGLIO_VALIDO = /^[A-Za-z0-9._-]{1,40}$/;

function bersaglioDi(p?: Parametri): string {
  const b = p?.bersaglio ?? '';
  if (!BERSAGLIO_VALIDO.test(b)) {
    throw new Error(`nome di bersaglio non valido: ${JSON.stringify(b)}`);
  }
  return b;
}

/**
 * Un percorso di artefatto resta dentro reports/, e contiene solo i caratteri
 * di un percorso.
 *
 * Vietare `..` e i percorsi assoluti non basta: serve dire cosa e' ammesso,
 * non cosa e' vietato. Un elenco di cose vietate e' sempre incompleto, e
 * quello di prima lasciava passare spazi, `&`, `|`, virgolette — tutto cio'
 * che una shell interpreta.
 */
const PERCORSO_VALIDO = /^[A-Za-z0-9._\/-]{1,120}$/;

function percorsoDi(valore: string | undefined, etichetta: string): string {
  if (!valore || valore.includes('..') || !PERCORSO_VALIDO.test(valore)) {
    throw new Error(`percorso ${etichetta} non valido: ${JSON.stringify(valore)}`);
  }
  return valore;
}

/**
 * Gli eseguibili si chiamano per percorso, non per nome.
 *
 * Prima la riga era `npx ts-node ...`, e su Windows `npx` e' uno script: per
 * farlo partire serviva `shell: true`, cioe' passare da `cmd.exe`. Ma una
 * shell non riceve una lista di argomenti, riceve una riga di testo: qualunque
 * `&` in un parametro diventava un secondo comando. Era un'iniezione vera, ed
 * e' stata riprodotta.
 *
 * Chiamando direttamente Node sul file di avvio del programma, la shell
 * sparisce: gli argomenti arrivano come lista, e non c'e' piu' niente da
 * interpretare. La validazione dei parametri resta comunque, perche' due
 * difese valgono piu' di una.
 */
const NODE = process.execPath;
const TS_NODE = 'node_modules/ts-node/dist/bin.js';
const PLAYWRIGHT = 'node_modules/playwright/cli.js';

function script(nome: string, ...argomenti: string[]) {
  return { eseguibile: NODE, argomenti: [TS_NODE, `scripts/${nome}`, ...argomenti] };
}

export function rigaDiComando(
  nome: NomeComando,
  p?: Parametri
): { eseguibile: string; argomenti: string[] } {
  switch (nome) {
    case 'diagnosi':
      return script('diagnosi.ts', 'json');
    case 'installa-browser':
      return { eseguibile: NODE, argomenti: [PLAYWRIGHT, 'install', 'chromium'] };
    case 'sincronizza-regole':
      return script('sync-rules.ts');
    case 'sessione':
      return script('session.ts', bersaglioDi(p));
    case 'registrazione':
      return script('record.ts', bersaglioDi(p));
    case 'scansione':
      return script('scout.ts', bersaglioDi(p), 'pause');
    case 'generazione':
      return script('generate.ts', `manifest=${percorsoDi(p?.manifesto, 'manifesto')}`);
    case 'test': {
      const argomenti = [bersaglioDi(p), 'generati'];
      if (p?.vedi) argomenti.push('vedi');
      if (p?.pulito) argomenti.push('pulito');
      if (p?.messaggi) argomenti.push(`messaggi=${percorsoDi(p.messaggi, 'messaggi')}`);
      return script('test-bersaglio.ts', ...argomenti);
    }
    default:
      throw new Error(`${String(nome)} non e' un comando previsto`);
  }
}
