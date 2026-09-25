import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { ambienteFiglio } from './ambiente-figlio';
import { rimuoviCodiciAnsi } from './ansi';
import { rigaDiComando, type NomeComando, type Parametri } from '@/lib/esecuzione';

export interface ProcessoMinimo {
  onRiga(f: (r: string) => void): void;
  onFine(f: (codice: number) => void): void;
  termina(): void;
}
/**
 * Le opzioni viaggiano fino al lanciatore invece di essere costruite dentro,
 * cosi' un caso puo' verificarle: che `shell` non ci sia e che l'ambiente del
 * figlio porti cio' che serve. Prima erano invisibili, e infatti nessun caso
 * si e' accorto che una rotta aveva ancora la shell accesa.
 */
export interface OpzioniLancio {
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export type Lanciatore = (
  eseguibile: string,
  argomenti: string[],
  opzioni: OpzioniLancio
) => ProcessoMinimo;

export interface Esecuzione {
  id: string;
  nome: NomeComando;
  stato: 'in corso' | 'conclusa' | 'fallita' | 'interrotta';
  righe: string[];
  codice?: number;
  avvio: string;
  fine?: string;
}

/** Piu' di cosi' non serve a nessuno, e la memoria non cresce all'infinito. */
const MAX_RIGHE = 500;

/** I comandi che tengono occupata la macchina: uno alla volta. */
const LUNGHI: NomeComando[] = ['registrazione', 'sessione', 'scansione', 'test'];

const esecuzioni = new Map<string, Esecuzione>();
const processi = new Map<string, ProcessoMinimo>();

/** Solo per i test: il registro e' di processo, non globale al sistema. */
export function azzeraPerTest(): void {
  esecuzioni.clear();
  processi.clear();
}

const lanciatoreVero: Lanciatore = (eseguibile, argomenti, opzioni) => {
  // Niente `shell`, ed e' il punto.
  //
  // Serviva perche' su Windows `npx` e' uno script e senza shell non parte. Ma
  // una shell non riceve una lista di argomenti: riceve una riga di testo, e
  // qualunque `&` dentro un parametro diventa un secondo comando. Ora la riga
  // chiama Node direttamente sul file di avvio del programma (vedi
  // `esecuzione.ts`), quindi la shell non serve piu' e gli argomenti arrivano
  // come lista: non c'e' piu' niente da interpretare.
  const figlio = spawn(eseguibile, argomenti, opzioni);
  let resto = '';
  return {
    onRiga(f) {
      const pezzo = (d: Buffer) => {
        resto += d.toString('utf-8');
        const righe = resto.split(/\r?\n/);
        resto = righe.pop() ?? '';
        righe.forEach(f);
      };
      figlio.stdout.on('data', pezzo);
      figlio.stderr.on('data', pezzo);
    },
    onFine(f) { figlio.on('close', (c) => f(c ?? 1)); },
    termina() { figlio.kill(); },
  };
};

function salva(e: Esecuzione): void {
  const dir = path.join(REPO_ROOT, 'reports', 'cruscotto');
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${e.id}.json`), JSON.stringify({ ...e, righe: undefined }, null, 2));
  } catch {
    // Lo stato su disco e' un servizio, non un requisito: se non si scrive,
    // l'esecuzione continua.
  }
}

export function avvia(nome: NomeComando, p?: Parametri, lancia: Lanciatore = lanciatoreVero): Esecuzione {
  if (LUNGHI.includes(nome)) {
    const occupato = [...esecuzioni.values()].some(
      (e) => e.stato === 'in corso' && LUNGHI.includes(e.nome)
    );
    if (occupato) throw new Error("c'e' gia' in corso un'operazione che occupa il browser");
  }

  // Il catalogo non tiene occupato il browser (non e' in LUNGHI), ma due
  // rigenerazioni insieme scriverebbero sullo stesso step-catalog.json: non
  // e' il browser il lucchetto che serve qui, e' lui stesso.
  if (nome === 'catalogo' && [...esecuzioni.values()].some((e) => e.nome === 'catalogo' && e.stato === 'in corso')) {
    throw new Error("il catalogo si sta gia' aggiornando");
  }

  // L'id nasce prima della riga di comando: un 'test' senza messaggi esplicito
  // scrive i suoi esiti in reports/cruscotto/<id>.ndjson, cosi' chi conosce
  // solo l'id (la schermata di Esecuzione) puo' ritrovare il file da solo,
  // senza che la finestra debba mai indicare un percorso.
  const id = `${nome}-${Date.now().toString(36)}`;
  const parametri: Parametri | undefined =
    nome === 'test' && !p?.messaggi
      // Barre in avanti, non `path.join`: questo non e' un percorso da aprire,
      // e' un'opzione che viaggia sulla riga di comando. Su Windows `path.join`
      // dava barre rovesciate e la validazione della riga le rifiutava, quindi
      // ogni lancio moriva prima di cominciare. Node apre benissimo un percorso
      // con le barre in avanti anche su Windows.
      ? { ...p, messaggi: `reports/cruscotto/${id}.ndjson` }
      : p;

  const { eseguibile, argomenti } = rigaDiComando(nome, parametri);
  const e: Esecuzione = { id, nome, stato: 'in corso', righe: [], avvio: new Date().toISOString() };
  esecuzioni.set(id, e);

  const processo = lancia(eseguibile, argomenti, { cwd: REPO_ROOT, env: ambienteFiglio() });
  processi.set(id, processo);

  processo.onRiga((r) => {
    // Si ripulisce QUI, dove la riga nasce e dove la radice del progetto si
    // conosce: piu' avanti la riga finisce in una schermata che gira nel
    // browser, e li' quel percorso non e' piu' ricavabile. Cosi' nessun codice
    // colore e nessun percorso assoluto — con dentro il nome di chi usa il
    // computer e quello della cartella — entra nella memoria del registro, nel
    // flusso di eventi o su uno schermo proiettato.
    e.righe.push(rimuoviCodiciAnsi(r, REPO_ROOT));
    if (e.righe.length > MAX_RIGHE) e.righe.splice(0, e.righe.length - MAX_RIGHE);
  });
  processo.onFine((codice) => {
    if (e.stato === 'interrotta') return;
    e.stato = codice === 0 ? 'conclusa' : 'fallita';
    e.codice = codice;
    e.fine = new Date().toISOString();
    salva(e);
  });

  salva(e);
  return e;
}

export function stato(id: string): Esecuzione | undefined {
  return esecuzioni.get(id);
}

/**
 * Quel che una finestra riaperta deve sapere per riagganciarsi a un'operazione
 * che tiene occupato il browser — non un'esecuzione qualunque, solo quelle
 * esclusive elencate in `LUNGHI`. Niente `righe`: chi chiede da fuori (una
 * rotta di sola lettura) non deve vedere cosa il tester sta ancora
 * registrando.
 */
export interface OperazioneLunga {
  id: string;
  nome: NomeComando;
  avvio: string;
}

/**
 * Cosa sta girando adesso, se c'e' qualcosa. Le operazioni lunghe sono
 * esclusive (vedi `avvia`): ce n'e' al piu' una, quindi il primo risultato
 * trovato e' l'unico possibile.
 */
export function operazioneInCorso(): OperazioneLunga | undefined {
  const e = [...esecuzioni.values()].find(
    (x) => x.stato === 'in corso' && LUNGHI.includes(x.nome)
  );
  return e ? { id: e.id, nome: e.nome, avvio: e.avvio } : undefined;
}

export function ferma(id: string): boolean {
  const e = esecuzioni.get(id);
  const processo = processi.get(id);
  if (!e || !processo || e.stato !== 'in corso') return false;
  e.stato = 'interrotta';
  e.fine = new Date().toISOString();
  processo.termina();
  salva(e);
  return true;
}
