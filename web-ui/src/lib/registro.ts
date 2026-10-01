import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { ambienteFiglio } from './ambiente-figlio';
import { rimuoviCodiciAnsi } from './ansi';
import { rigaDiComando, type NomeComando, type Parametri } from '@/lib/esecuzione';
import { registraEsitiDiUnaProva, type ProvaConclusa } from './esiti-scenari';
import { ripulisciStorico } from './pulizia-storico';

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

// Su `globalThis`, non in due `const` di modulo. Il server di sviluppo di Next
// carica questo file una volta per rotta: con una `Map` di modulo, la rotta che
// avvia una registrazione la vedeva, mentre quella del flusso di eventi e quella
// di stop no — la finestra leggeva "sconosciuta" come un errore, con il browser
// che si apriva lo stesso. E' il modo documentato di tenere uno stato solo in
// tutto il processo.
interface StatoRegistro {
  esecuzioni: Map<string, Esecuzione>;
  processi: Map<string, ProcessoMinimo>;
  /** Contatore degli avvii: rende unico l'id anche a parita' di millisecondo. */
  avvii: number;
}
const globale = globalThis as unknown as { __bddRegistro?: StatoRegistro };
const registro = (globale.__bddRegistro ??= { esecuzioni: new Map(), processi: new Map(), avvii: 0 });
const esecuzioni = registro.esecuzioni;
const processi = registro.processi;

/** Solo per i test: il registro e' di processo, non globale al sistema. */
export function azzeraPerTest(): void {
  esecuzioni.clear();
  processi.clear();
}

/** Esportato solo perche' un caso possa provare cosa succede ai processi figli alla terminazione. */
export const lanciatoreVero: Lanciatore = (eseguibile, argomenti, opzioni) => {
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

/**
 * Cosa fare, a fine di un test, per ricordare come e' andato ogni scenario
 * (l'indice della pagina Scenari). Si puo' sostituire solo per i test, con
 * `usaRegistrazioneEsiti`: un modulo-level al posto di un parametro di `avvia`,
 * cosi' la firma di `avvia` resta quella di sempre.
 */
let registraEsiti: (prova: ProvaConclusa) => void = registraEsitiDiUnaProva;

/** Solo per i test: senza argomento rimette quella vera. */
export function usaRegistrazioneEsiti(f: ((prova: ProvaConclusa) => void) | undefined): void {
  registraEsiti = f ?? registraEsitiDiUnaProva;
}

/**
 * La pulizia dello storico (`reports/cruscotto/`), a fine di ogni esecuzione e
 * non a ogni lettura. Riceve gli id di cio' che gira ancora: non si cancella.
 * Sostituibile solo dai test, come `registraEsiti`.
 */
let ripulisci: (inCorso: string[]) => void = (inCorso) => {
  ripulisciStorico(REPO_ROOT, { inCorso });
};

/** Solo per i test: senza argomento rimette quella vera. */
export function usaPulizia(f: ((inCorso: string[]) => void) | undefined): void {
  ripulisci = f ?? ((inCorso) => void ripulisciStorico(REPO_ROOT, { inCorso }));
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
  // Il contatore e' nello stato condiviso (non in una `let` di modulo): il server
  // carica questo file piu' volte, e due copie con due contatori darebbero di
  // nuovo lo stesso id. Due avvii nello stesso millisecondo collidevano, e il
  // secondo sovrascriveva il primo nel registro e nel suo file su disco.
  // (`?? 0`: uno stato creato da una versione precedente del modulo, in sviluppo
  // con il ricaricamento a caldo, non ha ancora il contatore.)
  registro.avvii = (registro.avvii ?? 0) + 1;
  const id = `${nome}-${Date.now().toString(36)}-${registro.avvii}`;
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
    // Gli esiti per scenario si scrivono PRIMA di dire che l'esecuzione e'
    // finita: l'evento di fine parte appena lo stato non e' piu' "in corso", e
    // la finestra rilegge subito l'elenco degli scenari. Scritti dopo, la
    // rilettura vedrebbe l'esito vecchio. Un errore qui non cambia l'esito
    // dell'esecuzione: lo stato su disco e' un servizio, non un requisito.
    if (nome === 'test' && parametri?.messaggi) {
      try {
        registraEsiti({ id, ambiente: parametri.bersaglio ?? null, messaggi: parametri.messaggi });
      } catch {
        // Nessun esito registrato: la pagina Scenari lo dira' ("mai eseguito").
      }
    }
    e.stato = codice === 0 ? 'conclusa' : 'fallita';
    e.codice = codice;
    e.fine = new Date().toISOString();
    salva(e);
    // Dopo lo stato e dopo gli esiti: cosi' l'indice che protegge le prove da
    // tenere e' gia' aggiornato. Un errore qui non cambia niente per la prova.
    try {
      ripulisci([...esecuzioni.values()].filter((x) => x.stato === 'in corso').map((x) => x.id));
    } catch {
      // Una cartella un po' piu' piena non e' un guasto.
    }
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
