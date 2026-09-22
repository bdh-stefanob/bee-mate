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
  | 'diagnosi' | 'sessione' | 'registrazione' | 'generazione' | 'test' | 'scansione';

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

/** Un percorso di artefatto resta dentro reports/. */
function percorsoDi(valore: string | undefined, etichetta: string): string {
  if (!valore || valore.includes('..') || /^[a-zA-Z]:|^[\\/]/.test(valore)) {
    throw new Error(`percorso ${etichetta} non valido: ${JSON.stringify(valore)}`);
  }
  return valore;
}

export function rigaDiComando(
  nome: NomeComando,
  p?: Parametri
): { eseguibile: string; argomenti: string[] } {
  const npx = 'npx';
  switch (nome) {
    case 'diagnosi':
      return { eseguibile: npx, argomenti: ['ts-node', 'scripts/diagnosi.ts', 'json'] };
    case 'sessione':
      return { eseguibile: npx, argomenti: ['ts-node', 'scripts/session.ts', bersaglioDi(p)] };
    case 'registrazione':
      return { eseguibile: npx, argomenti: ['ts-node', 'scripts/record.ts', bersaglioDi(p)] };
    case 'scansione':
      return { eseguibile: npx, argomenti: ['ts-node', 'scripts/scout.ts', bersaglioDi(p), 'pause'] };
    case 'generazione':
      return {
        eseguibile: npx,
        argomenti: ['ts-node', 'scripts/generate.ts', `manifest=${percorsoDi(p?.manifesto, 'manifesto')}`],
      };
    case 'test': {
      const argomenti = ['ts-node', 'scripts/test-bersaglio.ts', bersaglioDi(p), 'generati'];
      if (p?.vedi) argomenti.push('vedi');
      if (p?.pulito) argomenti.push('pulito');
      if (p?.messaggi) argomenti.push(`messaggi=${percorsoDi(p.messaggi, 'messaggi')}`);
      return { eseguibile: npx, argomenti };
    }
    default:
      throw new Error(`${String(nome)} non e' un comando previsto`);
  }
}
