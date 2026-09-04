/**
 * lib/cluster.ts
 * --------------
 * Raggruppamento dei passi normalizzati per equivalenza semantica presunta.
 *
 * Questo file e' contemporaneamente la METRICA e il SEME DEL CATALOGO: un
 * cluster di frasi equivalenti e' insieme (a) la misura dell'entropia, (b) il
 * candidato step canonico, (c) l'elenco degli alias da riconoscere quando
 * qualcuno riscrive una variante gia' vista.
 *
 * Perche' NON un embedding, pur essendo la scelta ovvia nel 2026: la garanzia
 * anti-entropia di questo progetto e' deterministica (cfr. `01-analisi` §3.3).
 * Un numero che nessuno sa rifare a mano non regge alla domanda "e come fai a
 * saperlo?" in presentazione, e non e' riproducibile fra due run. Qui ogni
 * fusione e' spiegabile in una riga: quali token condividono, quanto si
 * somigliano le stringhe, quale guardia le ha lasciate passare.
 *
 * Verificato da:  npx ts-node scripts/lib/normalize.check.ts
 */

import {
  hasAntonymConflict,
  hasNegation,
  type NormalizedStep,
  type StepBucket,
} from "./normalize";

// ---------------------------------------------------------------------------
// CONFIGURAZIONE — l'unico posto da toccare per la taratura
// ---------------------------------------------------------------------------
//
// Queste soglie NON sono tarate su dati reali: il corpus vero non e' ancora
// stato scaricato. Sono scelte per stare dal lato prudente — meglio due cluster
// che andavano fusi (l'umano se ne accorge leggendo il report) che un cluster
// che fonde due intenzioni diverse (il numero e' gonfio e nessuno se ne accorge
// finche' qualcuno in sala non legge le frasi).
//
// Ogni run stampa la lista dei "near-miss": le coppie che hanno sfiorato la
// soglia. E' li' che si legge se la taratura e' troppo stretta.

export interface ClusterConfig {
  /**
   * Se true, un Given non puo' mai finire nello stesso cluster di un Then.
   * ALZARE (true) → cluster piu' puliti, ma "the order is confirmed" scritto una
   * volta come premessa e una come verifica resta diviso in due.
   * ABBASSARE (false) → piu' fusioni, e la forma canonica perde la keyword.
   * Consigliato true: nel catalogo v2 la keyword e' un campo dello step.
   */
  separateByKeyword: boolean;

  /**
   * Numero minimo di token di contenuto perche' un passo sia candidabile alla
   * fusione fuzzy. Sotto questa soglia conta solo l'uguaglianza esatta.
   * ALZARE → i passi telegrafici ("Then ok") smettono di attirare fusioni
   * casuali. ABBASSARE → piu' rumore: con 1 token la similarita' e' 0 o 1.
   */
  minTokens: number;

  /**
   * Peso della componente insiemistica (Jaccard pesato IDF) rispetto a quella
   * di stringa (token-set ratio su Levenshtein). Somma a 1 con l'altra.
   * ALZARE → conta di piu' QUALI parole si condividono: separa meglio due frasi
   * che differiscono per il sostantivo chiave ("carrello" vs "lista desideri").
   * ABBASSARE → conta di piu' COME e' scritta la frase: fonde meglio le varianti
   * che aggiungono o tolgono materiale ("... as {string}").
   */
  jaccardWeight: number;

  /**
   * Punteggio combinato minimo per fondere. E' LA manopola principale.
   * ALZARE → meno fusioni, entropia misurata piu' alta, zero falsi accoppiamenti
   * ma il catalogo nasce con troppi step quasi uguali.
   * ABBASSARE → piu' fusioni, metriche piu' lusinghiere e piu' rischio di
   * mettere nello stesso cluster intenzioni diverse. In caso di dubbio, alzare:
   * un cluster mancato e' visibile nel report, uno sbagliato no.
   */
  combinedMin: number;

  /**
   * Ampiezza della fascia sotto `combinedMin` in cui una coppia viene comunque
   * registrata come "near-miss" per la revisione umana.
   * ALZARE → piu' coppie da leggere, piu' possibilita' di scoprire che la soglia
   * e' troppo stretta. ABBASSARE → report piu' corto e piu' cieco.
   */
  nearMissBand: number;

  /**
   * Rapporto minimo fra il numero di token del passo corto e di quello lungo.
   * Impedisce che un passo brevissimo venga assorbito da uno lunghissimo che lo
   * contiene ("the user is logged in" dentro "the user is logged in and has ...").
   * ALZARE → solo varianti di lunghezza simile. ABBASSARE → si fondono anche le
   * versioni verbose, con il rischio di perdere dettagli che erano intenzione.
   */
  lengthRatioMin: number;

  /**
   * Pesa i token per IDF (rarita' nel corpus). E' cio' che rende "carrello"
   * piu' distintivo di "utente" senza doverlo dichiarare a mano.
   * Disattivare solo per capire quanto pesa: senza IDF i falsi accoppiamenti
   * su sostantivi di dominio aumentano parecchio.
   */
  useIdfWeights: boolean;

  /**
   * Sotto questo numero di varianti distinte l'IDF non e' informativo (tutto e'
   * raro) e si ripiega sul Jaccard semplice.
   */
  minCorpusForIdf: number;

  /** Guardia: negazione presente da un lato solo → mai fondere. */
  blockOnNegationMismatch: boolean;

  /** Guardia: lati opposti di una coppia di antonimi → mai fondere. */
  blockOnAntonym: boolean;

  /** Tetto ai near-miss registrati, per non far esplodere il report. */
  maxNearMissPairs: number;
}

export const DEFAULT_CLUSTER_CONFIG: ClusterConfig = {
  separateByKeyword: true,
  minTokens: 2,
  jaccardWeight: 0.4,
  combinedMin: 0.72,
  nearMissBand: 0.15,
  lengthRatioMin: 0.5,
  useIdfWeights: true,
  minCorpusForIdf: 12,
  blockOnNegationMismatch: true,
  blockOnAntonym: true,
  maxNearMissPairs: 200,
};

// ---------------------------------------------------------------------------
// Similarita'
// ---------------------------------------------------------------------------

/** Levenshtein a due righe: la matrice intera non serve e su corpora grandi pesa. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array<number>(b.length + 1);
  let cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    const swap = prev;
    prev = cur;
    cur = swap;
  }
  return prev[b.length]!;
}

export function levenshteinSimilarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/**
 * Token-set ratio: confronta il nucleo condiviso con le due frasi intere.
 *
 * Serve al caso piu' frequente in assoluto nelle pagine reali — la stessa frase
 * con un pezzo in piu' ("... as {string}", "... nella pagina ordini"). Un
 * Levenshtein diretto la punirebbe in proporzione alla lunghezza del pezzo
 * aggiunto, che e' esattamente la differenza che vogliamo tollerare.
 */
export function tokenSetRatio(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const shared: string[] = [];
  const onlyA: string[] = [];
  const onlyB: string[] = [];

  for (const t of setA) (setB.has(t) ? shared : onlyA).push(t);
  for (const t of setB) if (!setA.has(t)) onlyB.push(t);

  const core = shared.sort().join(" ");
  const full1 = [core, onlyA.sort().join(" ")].filter(Boolean).join(" ");
  const full2 = [core, onlyB.sort().join(" ")].filter(Boolean).join(" ");

  return Math.max(
    levenshteinSimilarity(core, full1),
    levenshteinSimilarity(core, full2),
    levenshteinSimilarity(full1, full2)
  );
}

/**
 * Jaccard pesato: ogni token vale il suo IDF, quindi le parole rare contano
 * piu' di "utente" e "pagina". Senza questo, due passi che condividono solo il
 * corredo grammaticale sembrano simili al 60%.
 */
export function weightedJaccard(
  a: readonly string[],
  b: readonly string[],
  weight: (t: string) => number
): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  let union = 0;

  for (const t of setA) {
    const w = weight(t);
    union += w;
    if (setB.has(t)) inter += w;
  }
  for (const t of setB) if (!setA.has(t)) union += weight(t);

  return union === 0 ? 0 : inter / union;
}

// ---------------------------------------------------------------------------
// Ingresso e uscita
// ---------------------------------------------------------------------------

/** Da dove viene una singola occorrenza. Non lascia mai il file "-full". */
export interface StepSource {
  docId: string;
  docTitle: string;
  branch: string;
  line: number;
}

export interface ClusterInput {
  step: NormalizedStep;
  source: StepSource;
}

export interface Variant {
  fingerprint: string;
  /** Testo mascherato con il casing piu' frequente fra le occorrenze. */
  text: string;
  count: number;
  sources: StepSource[];
  paramSignature: string;
}

export interface ParamEnumCandidate {
  token: string;
  /** Valori distinti trovati, dal piu' frequente. Candidati `paramEnums` v2. */
  values: Array<{ value: string; count: number }>;
}

export interface Cluster {
  id: string;
  bucket: StepBucket;
  /** Variante piu' frequente: la forma canonica proposta. */
  canonical: Variant;
  /** Le altre varianti: gli alias da riconoscere. */
  aliases: Variant[];
  /** Occorrenze totali. */
  size: number;
  distinctVariants: number;
  /** Occorrenze per ramo. Un cluster su piu' rami e' il candidato piu' prezioso. */
  branches: Record<string, number>;
  paramEnums: ParamEnumCandidate[];
  /** Motivazione leggibile della fusione, variante per variante. */
  mergeEvidence: Array<{ fingerprint: string; combined: number; jaccard: number; tokenSet: number }>;
}

export interface NearMiss {
  a: string;
  b: string;
  bucket: StepBucket;
  combined: number;
  jaccard: number;
  tokenSet: number;
  countA: number;
  countB: number;
}

export interface ClusterResult {
  clusters: Cluster[];
  nearMisses: NearMiss[];
  config: ClusterConfig;
  /** true se l'IDF e' stato davvero applicato (corpus abbastanza grande). */
  idfApplied: boolean;
}

// ---------------------------------------------------------------------------
// Passata 1 — raggruppamento esatto per impronta
// ---------------------------------------------------------------------------

interface ExactGroup {
  key: string;
  bucket: StepBucket;
  fingerprint: string;
  tokens: string[];
  count: number;
  /** Conteggio delle forme testuali, per scegliere il casing rappresentativo. */
  texts: Map<string, number>;
  sources: StepSource[];
  paramSignature: string;
  paramValues: Map<string, Map<string, number>>;
  negation: boolean;
}

function groupExact(inputs: readonly ClusterInput[], cfg: ClusterConfig): ExactGroup[] {
  const groups = new Map<string, ExactGroup>();

  for (const { step, source } of inputs) {
    const bucket = cfg.separateByKeyword ? step.bucket : "Unknown";
    const key = `${bucket} ${step.fingerprint}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        bucket,
        fingerprint: step.fingerprint,
        tokens: step.tokens,
        count: 0,
        texts: new Map(),
        sources: [],
        paramSignature: step.paramSignature,
        paramValues: new Map(),
        negation: hasNegation(step.tokens),
      };
      groups.set(key, g);
    }
    g.count++;
    g.texts.set(step.body, (g.texts.get(step.body) ?? 0) + 1);
    g.sources.push(source);
    for (const p of step.params) {
      let bag = g.paramValues.get(p.token);
      if (!bag) {
        bag = new Map();
        g.paramValues.set(p.token, bag);
      }
      bag.set(p.value, (bag.get(p.value) ?? 0) + 1);
    }
  }

  return [...groups.values()];
}

function bestText(g: ExactGroup): string {
  let best = g.fingerprint;
  let bestCount = -1;
  for (const [text, count] of g.texts) {
    // A parita' di frequenza vince la forma alfabeticamente minore: serve solo
    // a rendere l'output riproducibile fra due run.
    if (count > bestCount || (count === bestCount && text < best)) {
      best = text;
      bestCount = count;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Passata 2 — fusione dei gruppi simili
// ---------------------------------------------------------------------------
//
// Clustering "a leader": ogni gruppo viene confrontato con il RAPPRESENTANTE dei
// cluster gia' aperti, mai con un membro qualsiasi. E' una scelta precisa, non
// una semplificazione: il single-linkage classico incatena (A~B, B~C, quindi
// A,B,C insieme anche se A e C non si somigliano affatto) ed e' il modo piu'
// rapido per costruire un cluster gigante che fa una bella slide e non
// significa niente.

interface OpenCluster {
  leader: ExactGroup;
  members: ExactGroup[];
  /** Occorrenze accumulate: serve a scegliere fra due cluster entrambi ammissibili. */
  size: number;
  evidence: Array<{ fingerprint: string; combined: number; jaccard: number; tokenSet: number }>;
}

interface Score {
  combined: number;
  jaccard: number;
  tokenSet: number;
}

function score(
  a: ExactGroup,
  b: ExactGroup,
  weight: (t: string) => number,
  cfg: ClusterConfig
): Score {
  const jaccard = weightedJaccard(a.tokens, b.tokens, weight);
  const tokenSet = tokenSetRatio(a.tokens, b.tokens);
  const combined = cfg.jaccardWeight * jaccard + (1 - cfg.jaccardWeight) * tokenSet;
  return { combined, jaccard, tokenSet };
}

/** Guardie dure: se una scatta, il punteggio non viene nemmeno calcolato. */
function blocked(a: ExactGroup, b: ExactGroup, cfg: ClusterConfig): boolean {
  if (cfg.separateByKeyword && a.bucket !== b.bucket) return true;
  if (a.tokens.length < cfg.minTokens || b.tokens.length < cfg.minTokens) return true;

  const lo = Math.min(a.tokens.length, b.tokens.length);
  const hi = Math.max(a.tokens.length, b.tokens.length);
  if (hi === 0 || lo / hi < cfg.lengthRatioMin) return true;

  if (cfg.blockOnNegationMismatch && a.negation !== b.negation) return true;
  if (cfg.blockOnAntonym && hasAntonymConflict(a.tokens, b.tokens)) return true;

  return false;
}

export function clusterSteps(
  inputs: readonly ClusterInput[],
  config: Partial<ClusterConfig> = {}
): ClusterResult {
  const cfg: ClusterConfig = { ...DEFAULT_CLUSTER_CONFIG, ...config };
  const groups = groupExact(inputs, cfg);

  // IDF calcolato sulle VARIANTI DISTINTE, non sulle occorrenze: altrimenti una
  // frase copiaincollata 500 volte renderebbe comuni le sue parole rare e la
  // duplicazione si nasconderebbe da sola.
  const docFreq = new Map<string, number>();
  for (const g of groups) {
    for (const t of new Set(g.tokens)) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
  }
  const n = groups.length;
  const idfApplied = cfg.useIdfWeights && n >= cfg.minCorpusForIdf;
  const weight = idfApplied
    ? (t: string): number => Math.log(1 + n / (docFreq.get(t) ?? 1))
    : (): number => 1;

  // Ordine deterministico: prima i gruppi piu' frequenti, cosi' il leader di
  // ogni cluster e' la forma che il team usa davvero di piu'.
  const ordered = [...groups].sort(
    (a, b) => b.count - a.count || a.fingerprint.localeCompare(b.fingerprint)
  );

  const open: OpenCluster[] = [];
  // Indice invertito token → cluster: senza, il confronto e' quadratico sui
  // gruppi e su decine di migliaia di passi diventa impraticabile.
  const byToken = new Map<string, Set<number>>();
  const nearMisses: NearMiss[] = [];
  const nearMissFloor = cfg.combinedMin - cfg.nearMissBand;

  for (const g of ordered) {
    const candidates = new Set<number>();
    for (const t of new Set(g.tokens)) {
      const ids = byToken.get(t);
      if (ids) for (const id of ids) candidates.add(id);
    }

    // Fra i cluster che superano la soglia si sceglie il PIU' GRANDE, non quello
    // col punteggio piu' alto: se due famiglie sono entrambe ammissibili, la
    // metrica le considera equivalenti, e allora la scelta editoriale giusta e'
    // la forma che il team usa davvero di piu'. Senza questa regola una variante
    // ponte fonda un cluster suo e spacca in due una famiglia gia' formata.
    let acceptedId = -1;
    let acceptedScore: Score = { combined: -1, jaccard: 0, tokenSet: 0 };
    let acceptedSize = -1;
    // Il migliore in assoluto, anche se sotto soglia: serve solo per i near-miss.
    let bestId = -1;
    let bestScore: Score = { combined: -1, jaccard: 0, tokenSet: 0 };

    for (const id of candidates) {
      const oc = open[id]!;
      if (blocked(g, oc.leader, cfg)) continue;
      const s = score(g, oc.leader, weight, cfg);

      if (s.combined > bestScore.combined) {
        bestScore = s;
        bestId = id;
      }
      if (s.combined < cfg.combinedMin) continue;
      if (
        oc.size > acceptedSize ||
        (oc.size === acceptedSize && s.combined > acceptedScore.combined)
      ) {
        acceptedId = id;
        acceptedScore = s;
        acceptedSize = oc.size;
      }
    }

    if (acceptedId >= 0) {
      const target = open[acceptedId]!;
      target.members.push(g);
      target.size += g.count;
      target.evidence.push({
        fingerprint: g.fingerprint,
        combined: round(acceptedScore.combined),
        jaccard: round(acceptedScore.jaccard),
        tokenSet: round(acceptedScore.tokenSet),
      });
      // I token del membro NON entrano nell'indice: solo il leader attira
      // nuovi membri. E' l'altra meta' della difesa contro l'incatenamento.
      continue;
    }

    if (
      bestId >= 0 &&
      bestScore.combined >= nearMissFloor &&
      nearMisses.length < cfg.maxNearMissPairs
    ) {
      const leader = open[bestId]!.leader;
      nearMisses.push({
        a: leader.fingerprint,
        b: g.fingerprint,
        bucket: g.bucket,
        combined: round(bestScore.combined),
        jaccard: round(bestScore.jaccard),
        tokenSet: round(bestScore.tokenSet),
        countA: leader.count,
        countB: g.count,
      });
    }

    const newId = open.length;
    open.push({ leader: g, members: [], size: g.count, evidence: [] });
    for (const t of new Set(g.tokens)) {
      let ids = byToken.get(t);
      if (!ids) {
        ids = new Set();
        byToken.set(t, ids);
      }
      ids.add(newId);
    }
  }

  const clusters = open.map((oc, i) => finalize(oc, i));
  clusters.sort((a, b) => b.size - a.size || a.canonical.fingerprint.localeCompare(b.canonical.fingerprint));
  nearMisses.sort((a, b) => b.combined - a.combined);

  return { clusters, nearMisses, config: cfg, idfApplied };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function toVariant(g: ExactGroup): Variant {
  return {
    fingerprint: g.fingerprint,
    text: bestText(g),
    count: g.count,
    sources: g.sources,
    paramSignature: g.paramSignature,
  };
}

function finalize(oc: OpenCluster, index: number): Cluster {
  const all = [oc.leader, ...oc.members];
  const branches: Record<string, number> = {};
  const paramValues = new Map<string, Map<string, number>>();

  for (const g of all) {
    for (const s of g.sources) branches[s.branch] = (branches[s.branch] ?? 0) + 1;
    for (const [token, bag] of g.paramValues) {
      let merged = paramValues.get(token);
      if (!merged) {
        merged = new Map();
        paramValues.set(token, merged);
      }
      for (const [value, count] of bag) merged.set(value, (merged.get(value) ?? 0) + count);
    }
  }

  const paramEnums: ParamEnumCandidate[] = [...paramValues.entries()].map(([token, bag]) => ({
    token,
    values: [...bag.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
  }));

  const aliases = oc.members
    .map(toVariant)
    .sort((a, b) => b.count - a.count || a.fingerprint.localeCompare(b.fingerprint));

  return {
    id: `c${String(index + 1).padStart(4, "0")}`,
    bucket: oc.leader.bucket,
    canonical: toVariant(oc.leader),
    aliases,
    size: all.reduce((sum, g) => sum + g.count, 0),
    distinctVariants: all.length,
    branches,
    paramEnums,
    mergeEvidence: oc.evidence,
  };
}
