import { SCENARIO_VALIDO } from './percorso-esecuzione';

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
  | 'installa-browser' | 'sincronizza-regole' | 'catalogo';

export interface Parametri {
  bersaglio?: string;
  vedi?: boolean;
  pulito?: boolean;
  manifesto?: string;
  messaggi?: string;
  /**
   * Cosa eseguire, quando non sono "tutti gli scenari registrati": un file
   * `.feature` sotto `src/features/`, oppure uno solo dei suoi scenari con la
   * sua riga (`file.feature:12`, la forma che Cucumber capisce da solo).
   */
  scenario?: string;
  /**
   * Piu' scenari insieme, nell'ordine dato: da 1 a 100 voci, ognuna con la regola
   * di `scenario`. Una lista con una voce sola e `scenario` sono la stessa cosa;
   * i due insieme sono un errore. Cucumber li esegue in quest'ordine.
   */
  scenari?: string[];
  /**
   * Millisecondi di pausa fra un'azione e l'altra, per chi guarda il browser.
   * Un numero intero, mai una riga: vale solo con `vedi`.
   */
  rallenta?: number;
}

/** Piu' di cosi' non e' guardare un test, e' aspettarlo. */
const RALLENTA_MASSIMO = 5000;

function rallentaDi(p?: Parametri): number {
  const v = p?.rallenta;
  if (v === undefined || v === 0) return 0;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > RALLENTA_MASSIMO) {
    throw new Error(`velocita' non valida: ${JSON.stringify(v)}`);
  }
  return v;
}

/**
 * Un bersaglio e' un nome, non una riga di comando.
 *
 * Esportata: e' la stessa regola che la scrittura di un ambiente nuovo deve
 * rispettare (`scriviBersaglio` in `configurazione.ts`) — un nome scritto a
 * mano nel file e uno scritto dalla finestra non possono avere regole diverse.
 */
export const BERSAGLIO_VALIDO = /^[A-Za-z0-9._-]{1,40}$/;

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
  // `startsWith('reports/')` non e' un di piu': il commento qui sopra
  // prometteva "resta dentro reports/" e il charset da solo non lo garantiva —
  // ammetteva la barra iniziale, quindi `/Windows/x.ndjson` passava. Cucumber
  // avrebbe scritto li'. Un commento che dichiara una difesa inesistente e'
  // peggio di nessun commento.
  if (
    !valore ||
    valore.includes('..') ||
    !valore.startsWith('reports/') ||
    !PERCORSO_VALIDO.test(valore)
  ) {
    throw new Error(`percorso ${etichetta} non valido: ${JSON.stringify(valore)}`);
  }
  return valore;
}

/**
 * Uno scenario da eseguire: la regola (`SCENARIO_VALIDO`) e' in
 * `percorso-esecuzione.ts`, una definizione sola.
 */
function scenarioDi(valore: unknown): string {
  if (typeof valore !== 'string' || valore.includes('..') || valore.includes('//') || !SCENARIO_VALIDO.test(valore)) {
    throw new Error(`scenario non valido: ${JSON.stringify(valore)}`);
  }
  return valore;
}

/** Una lista piu' lunga non e' una scelta, e la riga di comando di Windows ha un limite. */
const SCENARI_MASSIMO = 100;

/**
 * La lista di scenari da eseguire, validata e normalizzata. `undefined` se la
 * richiesta non sceglie niente (tutti gli scenari registrati).
 *
 * - vuota, troppo lunga, o con una voce non valida: errore — mai "nessun
 *   percorso", che per Cucumber vuol dire tutti;
 * - la stessa voce due volte: errore che la nomina;
 * - un file intero e una sua riga: resta solo l'intero. Cucumber, dati
 *   `a.feature` e `a.feature:3`, esegue SOLO la riga (verificato in
 *   `percorsi-cucumber.check.ts`): chi ha scelto il file intero otterrebbe uno
 *   scenario e nessun errore;
 * - due righe dello stesso file restano due voci: Cucumber le esegue una volta
 *   ciascuna, nell'ordine del file.
 */
function scenariDi(p?: Parametri): string[] | undefined {
  if (p?.scenari === undefined) {
    return p?.scenario !== undefined ? [scenarioDi(p.scenario)] : undefined;
  }
  if (p.scenario !== undefined) {
    throw new Error('scenario e scenari insieme: se ne sceglie uno solo');
  }
  const lista: unknown = p.scenari;
  if (!Array.isArray(lista)) {
    throw new Error(`scenari non validi: serve una lista, non ${JSON.stringify(lista)}`);
  }
  if (lista.length === 0) throw new Error("scenari: la lista e' vuota, serve almeno uno scenario");
  if (lista.length > SCENARI_MASSIMO) {
    throw new Error(`scenari: al massimo ${SCENARI_MASSIMO} voci, ricevute ${lista.length}`);
  }
  const voci = lista.map(scenarioDi);
  const visti = new Set<string>();
  for (const v of voci) {
    if (visti.has(v)) throw new Error(`scenario doppio nella lista: ${v}`);
    visti.add(v);
  }
  const fileDi = (v: string): string => (v.includes(':') ? v.slice(0, v.lastIndexOf(':')) : v);
  const interi = new Set(voci.filter((v) => !v.includes(':')));
  return voci.filter((v) => !v.includes(':') || !interi.has(fileDi(v)));
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
// Sola traduzione, senza controllo dei tipi: la meta' del tempo. Solo per la
// diagnosi, che gira a ogni apertura del Controllo; i tipi li controllano gia'
// `tsc` e `check:all`.
const TS_NODE_SOLO_TRADUZIONE = 'node_modules/ts-node/dist/bin-transpile.js';
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
      return { eseguibile: NODE, argomenti: [TS_NODE_SOLO_TRADUZIONE, 'scripts/diagnosi.ts', 'json'] };
    case 'installa-browser':
      return { eseguibile: NODE, argomenti: [PLAYWRIGHT, 'install', 'chromium'] };
    case 'sincronizza-regole':
      return script('sync-rules.ts');
    case 'catalogo':
      // Niente parametri: rilegge tutta la suite e riscrive step-catalog.json
      // e STEP_CATALOG.md, o non tocca niente se il dry-run fallisce (vedi
      // rigenera-catalogo.ts).
      return script('rigenera-catalogo.ts');
    case 'sessione':
      return script('session.ts', bersaglioDi(p));
    case 'registrazione':
      return script('record.ts', bersaglioDi(p));
    case 'scansione':
      return script('scout.ts', bersaglioDi(p), 'pause');
    case 'generazione':
      return script('generate.ts', `manifest=${percorsoDi(p?.manifesto, 'manifesto')}`);
    case 'test': {
      // Senza una scelta, gli scenari usciti dalle registrazioni, come prima.
      const argomenti = [bersaglioDi(p), ...(scenariDi(p) ?? ['generati'])];
      if (p?.vedi) argomenti.push('vedi');
      const rallenta = rallentaDi(p);
      if (p?.vedi && rallenta > 0) argomenti.push(`rallenta=${rallenta}`);
      if (p?.pulito) argomenti.push('pulito');
      if (p?.messaggi) argomenti.push(`messaggi=${percorsoDi(p.messaggi, 'messaggi')}`);
      return script('test-bersaglio.ts', ...argomenti);
    }
    default:
      throw new Error(`${String(nome)} non e' un comando previsto`);
  }
}
