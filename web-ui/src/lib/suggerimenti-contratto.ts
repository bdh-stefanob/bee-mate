/**
 * suggerimenti-contratto.ts
 * -------------------------
 * Il contratto dei suggerimenti: due file (il compito, la proposta) e il
 * validatore che decide cosa se ne puo' usare. Funzioni pure, nessun disco, nessuna
 * rete: serve sia al server (che scrive e rilegge i file) sia alla finestra (solo
 * i tipi).
 *
 * LA REGOLA CHE REGGE TUTTO (D41)
 * Chi propone — le regole del catalogo oggi, un assistente domani — puo' solo
 * SCEGLIERE fra opzioni elencate nel compito, oppure dire "nessuna". Una voce e'
 * ammessa solo se e' uguale, byte per byte, a un candidato DI QUEL PASSO. Cosi'
 * l'unico errore possibile e' di significato (la frase del catalogo vuol dire
 * un'altra cosa), che la persona e la misura sorvegliano; un errore di forma, che
 * passerebbe in silenzio, non esiste.
 *
 * DUE LIVELLI, E UNO NON RIMEDIA ALL'ALTRO
 *  1. Il FILE: schema, compito e impronta, nessun campo sconosciuto, al massimo
 *     64 KB, una sola proposta per passo, passo esistente. Se non passa, e'
 *     rifiutato per intero e non lascia nessuna riga applicabile.
 *  2. La RIGA: scelta ammessa, voce fra i candidati di quel passo, "perche" di
 *     testo semplice e corto. Se non passa, la riga e' scartata da sola e le altre
 *     restano.
 *
 * "perche", "strumento" e "modello" sono dati NON attendibili: si mostrano come
 * testo, mai come markup ne' collegamento, e non decidono niente. La certezza
 * dichiarata da un modello non e' un campo: un campo in piu' e' un campo
 * sconosciuto, e il file e' rifiutato.
 *
 * Origin: per file (`deterministico` = le regole del catalogo, `assistito` = un
 * assistente) e per riga (la riga eredita quella del file). La terza origine,
 * `persona` (tenuta la frase del tester), esiste solo nell'esito.
 */

export const SCHEMA = 1;
export const MAX_BYTE_PROPOSTA = 64 * 1024;
export const MAX_PERCHE = 200;
export const MAX_CANDIDATI = 5;

export type Origin = 'deterministico' | 'assistito';
/** Nell'esito, ogni riga ha la sua: chi ha scelto quella frase. */
export type OrigineRiga = Origin | 'persona';

export type ClasseCandidato = 'stessi-componenti' | 'formulazione-simile';
export type StatoVoce = 'wanted' | 'implemented' | 'deprecated';
export type Parola = 'Given' | 'When' | 'Then' | 'And' | 'But';

export interface CandidatoCompito {
  /** L'espressione del catalogo, esatta. */
  voce: string;
  /** Una prova (identita' di componente) o una stima (somiglianza di frase). */
  classe: ClasseCandidato;
  stato: StatoVoce;
  /** L'espressione ha segnaposto `{string}`/`{int}`: non si applica (limite dichiarato). */
  parametri: boolean;
  /** Somiglianza di frase in punti percentuali, quando e' stata calcolata. */
  somiglianza?: number;
}

export interface PassoCompito {
  /** Numero d'ordine, da 1: il primo passo in cui compare questa frase. */
  n: number;
  parola: Parola;
  /** La frase del tester, com'e' scritta nel `.feature`. */
  etichetta: string;
  /** Gli altri passi che portano la stessa frase: si riscrivono insieme. */
  anche: number[];
  candidati: CandidatoCompito[];
}

export interface Compito {
  schema: 1;
  id: string;
  funzione: 'frasi';
  sorgente: 'registrazione';
  variante: 'A';
  catalogo: { impronta: string; voci: number };
  passi: PassoCompito[];
}

export type RigaProposta =
  | { passo: number; scelta: 'voce'; voce: string; perche?: string; origin?: Origin }
  | { passo: number; scelta: 'nessuna'; perche?: string; origin?: Origin };

export type NomeStrumento = 'regole' | 'kiro-ide' | 'kiro-cli' | 'amazonq' | 'altro';

export interface Strumento {
  nome: NomeStrumento;
  modello?: string;
  modelloFissato?: boolean;
}

export interface Proposta {
  schema: 1;
  compito: string;
  impronta: string;
  origin: Origin;
  strumento: Strumento;
  proposte: RigaProposta[];
}

/** Una riga che ha passato il livello 2: porta la sua origine. */
export interface RigaValidata {
  passo: number;
  scelta: 'voce' | 'nessuna';
  voce?: string;
  perche?: string;
  origin: Origin;
}

export type MotivoRifiuto =
  | 'troppo-grande' | 'non-json' | 'blocchi-multipli' | 'testo-attorno' | 'non-oggetto'
  | 'schema' | 'campo-sconosciuto' | 'strumento' | 'origin' | 'proposte'
  | 'passo-inesistente' | 'passo-doppio';

export type MotivoScarto =
  | 'riga-non-oggetto' | 'campo-sconosciuto' | 'passo' | 'scelta' | 'voce-mancante'
  | 'voce-non-candidata' | 'perche' | 'origin';

export interface Scarto {
  /** Il passo della riga, se si e' riusciti a leggerlo. */
  passo?: number;
  motivo: MotivoScarto;
}

export type EsitoProposta =
  | { tipo: 'rifiutata'; motivo: MotivoRifiuto }
  | { tipo: 'scaduta' }
  | { tipo: 'valida'; origin: Origin; strumento: Strumento; righe: RigaValidata[]; scartate: Scarto[] };

// ---------------------------------------------------------------------------
// Applicabilita' di un candidato
// ---------------------------------------------------------------------------

export type MotivoNonApplicabile = 'gia-realizzata' | 'parametri' | 'non-wanted' | 'caratteri';

/**
 * Una voce di catalogo si puo' mettere al posto della frase del tester?
 *
 *  - `gia-realizzata`: un altro scenario salvato la definisce, e Cucumber
 *    rifiuterebbe due definizioni della stessa frase. Fino a quando il riuso di
 *    una definizione esistente non e' costruito (ROADMAP §4, punto 3).
 *  - `parametri`: `riscrittura-step` rifiuta per costruzione le frasi con `{...}`.
 *  - `caratteri`: virgolette, barre rovesciate, `$` e accenti gravi: la frase
 *    finisce dentro una stringa del codice, e una virgoletta in piu' la spezza.
 *  - `non-wanted`: qualunque altro stato (deprecata).
 */
export function motivoNonApplicabile(c: CandidatoCompito): MotivoNonApplicabile | null {
  if (c.stato === 'implemented') return 'gia-realizzata';
  if (c.stato !== 'wanted') return 'non-wanted';
  if (c.parametri || /\{[a-zA-Z]+\}/.test(c.voce)) return 'parametri';
  if (/["'\\`$\r\n]/.test(c.voce)) return 'caratteri';
  return null;
}

export function applicabile(c: CandidatoCompito): boolean {
  return motivoNonApplicabile(c) === null;
}

// ---------------------------------------------------------------------------
// Il compito
// ---------------------------------------------------------------------------

export type EsitoCompito = { ok: true; compito: Compito } | { ok: false; motivo: string };

const ID_VALIDO = /^[0-9]{8}-[0-9]{6}-[0-9a-f]{4}$/;
const PAROLE: readonly string[] = ['Given', 'When', 'Then', 'And', 'But'];
const CLASSI: readonly string[] = ['stessi-componenti', 'formulazione-simile'];
const STATI: readonly string[] = ['wanted', 'implemented', 'deprecated'];

function oggetto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function soloChiavi(x: Record<string, unknown>, ammesse: readonly string[]): boolean {
  return Object.keys(x).every((k) => ammesse.includes(k));
}

function intero(x: unknown): x is number {
  return typeof x === 'number' && Number.isInteger(x) && x >= 1;
}

export function validaCompito(x: unknown): EsitoCompito {
  const no = (motivo: string): EsitoCompito => ({ ok: false, motivo });
  if (!oggetto(x)) return no('non-oggetto');
  if (!soloChiavi(x, ['schema', 'id', 'funzione', 'sorgente', 'variante', 'catalogo', 'passi'])) return no('campo-sconosciuto');
  if (x.schema !== SCHEMA) return no('schema');
  if (typeof x.id !== 'string' || !ID_VALIDO.test(x.id)) return no('id');
  if (x.funzione !== 'frasi' || x.sorgente !== 'registrazione' || x.variante !== 'A') return no('forma');

  const cat = x.catalogo;
  if (!oggetto(cat) || !soloChiavi(cat, ['impronta', 'voci'])) return no('catalogo');
  if (typeof cat.impronta !== 'string' || !/^sha256:[0-9a-f]+$/.test(cat.impronta)) return no('impronta');
  if (typeof cat.voci !== 'number' || !Number.isInteger(cat.voci) || cat.voci < 0) return no('catalogo');

  if (!Array.isArray(x.passi)) return no('passi');
  const visti = new Set<number>();
  const passi: PassoCompito[] = [];
  for (const p of x.passi) {
    if (!oggetto(p) || !soloChiavi(p, ['n', 'parola', 'etichetta', 'anche', 'candidati'])) return no('passo');
    if (!intero(p.n) || visti.has(p.n)) return no('passo');
    visti.add(p.n);
    if (typeof p.parola !== 'string' || !PAROLE.includes(p.parola)) return no('passo');
    if (typeof p.etichetta !== 'string') return no('passo');
    if (!Array.isArray(p.anche) || !p.anche.every(intero)) return no('passo');
    if (!Array.isArray(p.candidati) || p.candidati.length > MAX_CANDIDATI) return no('candidati');
    const candidati: CandidatoCompito[] = [];
    for (const c of p.candidati) {
      if (!oggetto(c) || !soloChiavi(c, ['voce', 'classe', 'stato', 'parametri', 'somiglianza'])) return no('candidato');
      if (typeof c.voce !== 'string' || c.voce.length === 0) return no('candidato');
      if (typeof c.classe !== 'string' || !CLASSI.includes(c.classe)) return no('candidato');
      if (typeof c.stato !== 'string' || !STATI.includes(c.stato)) return no('candidato');
      if (typeof c.parametri !== 'boolean') return no('candidato');
      if (c.somiglianza !== undefined && (typeof c.somiglianza !== 'number' || c.somiglianza < 0 || c.somiglianza > 100)) {
        return no('candidato');
      }
      candidati.push({
        voce: c.voce,
        classe: c.classe as ClasseCandidato,
        stato: c.stato as StatoVoce,
        parametri: c.parametri,
        ...(c.somiglianza !== undefined ? { somiglianza: c.somiglianza } : {}),
      });
    }
    passi.push({
      n: p.n,
      parola: p.parola as Parola,
      etichetta: p.etichetta,
      anche: p.anche as number[],
      candidati,
    });
  }

  return {
    ok: true,
    compito: {
      schema: SCHEMA,
      id: x.id,
      funzione: 'frasi',
      sorgente: 'registrazione',
      variante: 'A',
      catalogo: { impronta: cat.impronta, voci: cat.voci },
      passi,
    },
  };
}

// ---------------------------------------------------------------------------
// La proposta
// ---------------------------------------------------------------------------

const NOMI_STRUMENTO: readonly string[] = ['regole', 'kiro-ide', 'kiro-cli', 'amazonq', 'altro'];
// Qualunque carattere di controllo, a capo e tabulazione compresi: "perche" e' una riga.
const CONTROLLO = /[\u0000-\u001f\u007f]/;

function leggiStrumento(x: unknown): Strumento | null {
  if (!oggetto(x) || !soloChiavi(x, ['nome', 'modello', 'modelloFissato'])) return null;
  if (typeof x.nome !== 'string' || !NOMI_STRUMENTO.includes(x.nome)) return null;
  if (x.modello !== undefined && (typeof x.modello !== 'string' || x.modello.length > 80 || CONTROLLO.test(x.modello))) return null;
  if (x.modelloFissato !== undefined && typeof x.modelloFissato !== 'boolean') return null;
  return {
    nome: x.nome as NomeStrumento,
    ...(x.modello !== undefined ? { modello: x.modello } : {}),
    ...(x.modelloFissato !== undefined ? { modelloFissato: x.modelloFissato } : {}),
  };
}

/** Livello 1 e 2 su un oggetto gia' letto. */
export function validaPropostaOggetto(x: unknown, compito: Compito): EsitoProposta {
  const rifiuta = (motivo: MotivoRifiuto): EsitoProposta => ({ tipo: 'rifiutata', motivo });
  if (!oggetto(x)) return rifiuta('non-oggetto');

  // ── Livello 1: il file ──────────────────────────────────────────────────
  if (!soloChiavi(x, ['schema', 'compito', 'impronta', 'origin', 'strumento', 'proposte'])) return rifiuta('campo-sconosciuto');
  if (x.schema !== SCHEMA) return rifiuta('schema');
  if (x.origin !== 'deterministico' && x.origin !== 'assistito') return rifiuta('origin');
  const strumento = leggiStrumento(x.strumento);
  if (!strumento) return rifiuta('strumento');
  // Le regole sono l'unico strumento deterministico, e viceversa: un file che si
  // dichiara "regole" ma assistito (o l'inverso) mente su chi ha deciso.
  if ((strumento.nome === 'regole') !== (x.origin === 'deterministico')) return rifiuta('origin');
  if (typeof x.compito !== 'string' || typeof x.impronta !== 'string') return rifiuta('schema');
  if (!Array.isArray(x.proposte)) return rifiuta('proposte');

  // Scaduta: fatta su un altro compito, o sullo stesso con un catalogo diverso.
  if (x.compito !== compito.id || x.impronta !== compito.catalogo.impronta) return { tipo: 'scaduta' };

  const esistenti = new Set(compito.passi.map((p) => p.n));
  const visti = new Set<number>();
  for (const r of x.proposte) {
    if (!oggetto(r) || !intero(r.passo)) continue; // lo giudica il livello 2
    if (!esistenti.has(r.passo)) return rifiuta('passo-inesistente');
    if (visti.has(r.passo)) return rifiuta('passo-doppio');
    visti.add(r.passo);
  }

  // ── Livello 2: ogni riga ────────────────────────────────────────────────
  const righe: RigaValidata[] = [];
  const scartate: Scarto[] = [];
  for (const r of x.proposte) {
    if (!oggetto(r)) {
      scartate.push({ motivo: 'riga-non-oggetto' });
      continue;
    }
    const passo = intero(r.passo) ? r.passo : undefined;
    const scarta = (motivo: MotivoScarto): void => {
      scartate.push({ ...(passo !== undefined ? { passo } : {}), motivo });
    };
    if (!soloChiavi(r, ['passo', 'scelta', 'voce', 'perche', 'origin'])) { scarta('campo-sconosciuto'); continue; }
    if (passo === undefined) { scarta('passo'); continue; }
    if (r.origin !== undefined && r.origin !== x.origin) { scarta('origin'); continue; }
    if (r.perche !== undefined) {
      if (typeof r.perche !== 'string' || r.perche.length > MAX_PERCHE || CONTROLLO.test(r.perche)) { scarta('perche'); continue; }
    }
    const perche = typeof r.perche === 'string' ? { perche: r.perche } : {};

    if (r.scelta === 'nessuna') {
      if (r.voce !== undefined) { scarta('campo-sconosciuto'); continue; }
      righe.push({ passo, scelta: 'nessuna', ...perche, origin: x.origin });
    } else if (r.scelta === 'voce') {
      if (typeof r.voce !== 'string') { scarta('voce-mancante'); continue; }
      const passoCompito = compito.passi.find((p) => p.n === passo);
      // Byte per byte, e fra i candidati di QUESTO passo: non "e' nel catalogo".
      if (!passoCompito?.candidati.some((c) => c.voce === r.voce)) { scarta('voce-non-candidata'); continue; }
      righe.push({ passo, scelta: 'voce', voce: r.voce, ...perche, origin: x.origin });
    } else {
      scarta('scelta');
    }
  }

  return { tipo: 'valida', origin: x.origin, strumento, righe, scartate };
}

/**
 * Da un testo (file letto, o risposta incollata) a un esito.
 *
 * Una risposta incollata puo' essere racchiusa in UN solo blocco di codice. Con
 * del testo attorno si rifiuta, invece di scartare il testo: e' il punto in cui un
 * testo che imita istruzioni cercherebbe di entrare, e rifiutare e' piu' semplice
 * da verificare che filtrare.
 */
export function validaPropostaTesto(testo: string, compito: Compito): EsitoProposta {
  if (new TextEncoder().encode(testo).length > MAX_BYTE_PROPOSTA) return { tipo: 'rifiutata', motivo: 'troppo-grande' };

  let corpo = testo.trim();
  if (!corpo.startsWith('{') && !corpo.startsWith('[')) {
    const blocchi = [...corpo.matchAll(/```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)```/g)];
    if (blocchi.length === 0) return { tipo: 'rifiutata', motivo: 'non-json' };
    if (blocchi.length > 1) return { tipo: 'rifiutata', motivo: 'blocchi-multipli' };
    const fuori = (corpo.slice(0, blocchi[0].index) + corpo.slice((blocchi[0].index ?? 0) + blocchi[0][0].length)).trim();
    if (fuori.length > 0) return { tipo: 'rifiutata', motivo: 'testo-attorno' };
    corpo = blocchi[0][1].trim();
  }

  let letto: unknown;
  try {
    letto = JSON.parse(corpo);
  } catch {
    return { tipo: 'rifiutata', motivo: 'non-json' };
  }
  return validaPropostaOggetto(letto, compito);
}
