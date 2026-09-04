/**
 * analyze-corpus.ts
 * -----------------
 * Terzo stadio dell'Osservatorio: dall'export grezzo alle metriche di entropia
 * e ai candidati step del catalogo.
 *
 * Il principio che governa questo script: misurare l'entropia e seminare il
 * catalogo sono la STESSA operazione. Un cluster di frasi equivalenti e'
 * contemporaneamente (a) la metrica "quanti modi diversi di dire la stessa
 * cosa", (b) il candidato step canonico, (c) l'elenco degli alias da
 * riconoscere per suggerire la forma giusta a chi ne riscrive una variante.
 * Per questo non ci sono due comandi: ce n'e' uno, con due uscite.
 *
 * DUE FILE, E NON E' UN VEZZO:
 *
 *   <out>-full.json      cluster con TUTTE le frasi reali, i titoli delle pagine
 *                        e i riferimenti di riga. Contiene contenuto aziendale.
 *                        Resta sulla macchina. Sotto reports/, che e' gitignorato.
 *                        Non va spostato, non va allegato, non va dato in pasto
 *                        a un tool AI senza un passo di sanitizzazione esplicito.
 *
 *   <out>-summary.json   solo aggregati e conteggi. Nessuna frase, nessun titolo
 *   <out>-summary.md     di pagina. E' il file pensato per essere letto,
 *                        rivisto dall'utente e poi condiviso o messo in slide.
 *
 * Le frasi entrano nel summary SOLO con `--with-phrases`, cioe' con una
 * decisione consapevole di chi lancia il comando. Il default e' negare: un file
 * che nasce condivisibile e diventa sensibile per distrazione e' peggio di un
 * file che nasce chiuso.
 *
 * Uso:
 *   npx ts-node scripts/analyze-corpus.ts --in reports/confluence-export/<ts>.json
 *   npx ts-node scripts/analyze-corpus.ts --in src/features
 *
 * Flag:
 *   --in PATH             export JSON di `confluence-fetch.ts`, oppure una
 *                         cartella di file .feature
 *   --out PREFIX          prefisso dei file prodotti
 *                         (default reports/corpus-analysis/<ts>)
 *   --top N               quanti cluster mostrare nelle classifiche (default 25)
 *   --seed-min N          occorrenze minime per proporre un candidato step
 *                         (default 2: una frase vista una volta sola non e'
 *                         ancora un pezzo di linguaggio condiviso)
 *   --with-phrases        include le frasi nel summary. Da usare solo dopo aver
 *                         letto il full e deciso che si possono mostrare.
 *   --anonymize-branches  sostituisce i nomi dei rami con "Ramo A/B/C…" nel
 *                         summary. I nomi veri restano solo nel full.
 *   --threshold N         sovrascrive `combinedMin` del clustering (0-1)
 *   --no-fuzzy            solo raggruppamento esatto per impronta. Serve a
 *                         misurare quanto pesa la parte fuzzy: la differenza fra
 *                         i due numeri e' l'effetto del clustering, in chiaro.
 */

import * as fs from "fs";
import * as path from "path";
import { pct } from "./lib/atlassian";
import { normalizeSteps, type StepBucket } from "./lib/normalize";
import {
  clusterSteps,
  DEFAULT_CLUSTER_CONFIG,
  type Cluster,
  type ClusterInput,
  type ClusterResult,
} from "./lib/cluster";

// ---------------------------------------------------------------------------
// Ingresso
// ---------------------------------------------------------------------------

interface SourceDoc {
  id: string;
  title: string;
  branch: string;
  text: string;
}

function str(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

/** Export di `confluence-fetch.ts`: l'oggetto `pages` con testo gia' estratto. */
function loadExport(file: string): { docs: SourceDoc[]; label: string } {
  const json = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
  const pages = (json["pages"] as Array<Record<string, unknown>>) ?? [];
  if (pages.length === 0) {
    throw new Error(
      `Nessuna pagina in ${file}.\n` +
        "  Se il file viene da confluence-fetch, prova a rilanciarlo con --all-pages:\n" +
        "  potrebbe aver scartato tutto perche' nessuna pagina superava la soglia Gherkin."
    );
  }
  const source = (json["source"] ?? {}) as Record<string, unknown>;
  return {
    docs: pages.map((p) => ({
      id: str(p, "id"),
      title: str(p, "title"),
      branch: str(p, "branch") || "(radice)",
      text: str(p, "text"),
    })),
    label: `export Confluence — ${str(source, "target") || file}`,
  };
}

function walkFeatures(dir: string, root: string, out: SourceDoc[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFeatures(full, root, out);
      continue;
    }
    if (!entry.name.endsWith(".feature")) continue;
    const rel = path.relative(root, full).split(path.sep);
    out.push({
      id: path.relative(root, full),
      title: entry.name,
      // Il primo livello di cartella e' l'equivalente del "ramo" di Confluence.
      branch: rel.length > 1 ? rel[0]! : "(radice)",
      text: fs.readFileSync(full, "utf-8"),
    });
  }
}

function loadFeatures(dir: string): { docs: SourceDoc[]; label: string } {
  const docs: SourceDoc[] = [];
  walkFeatures(dir, dir, docs);
  if (docs.length === 0) throw new Error(`Nessun file .feature sotto ${dir}`);
  return { docs, label: `cartella .feature — ${dir}` };
}

function load(inPath: string): { docs: SourceDoc[]; label: string } {
  if (!fs.existsSync(inPath)) throw new Error(`Percorso inesistente: ${inPath}`);
  return fs.statSync(inPath).isDirectory() ? loadFeatures(inPath) : loadExport(inPath);
}

// ---------------------------------------------------------------------------
// Metriche
// ---------------------------------------------------------------------------

interface BranchMetrics {
  docs: number;
  occurrences: number;
  distinctVariants: number;
  reuseRatio: number;
  clusters: number;
}

interface Metrics {
  docs: {
    total: number;
    withSteps: number;
    withFullTriplet: number;
    /** % di documenti in cui si riconosce almeno un passo. */
    conformity: number;
    /** % di documenti con premessa + azione + verifica. */
    tripletConformity: number;
  };
  lines: {
    nonEmpty: number;
    recognizedSteps: number;
    /** % di righe interpretabili come passo dentro i documenti candidati. */
    conformity: number;
  };
  steps: {
    occurrences: number;
    distinctVariants: number;
    /** Definizione §3.1: passi distinti / passi totali. 1 = nessun riuso. */
    reuseRatio: number;
    clusters: number;
    /** Cluster / occorrenze: il reuse ratio che si otterrebbe col catalogo. */
    reuseRatioAfterClustering: number;
    /** Quanta varieta' il clustering assorbe: 1 - cluster/varianti distinte. */
    varietyAbsorbed: number;
    byBucket: Record<StepBucket, number>;
    /** Passi "And" senza un Given/When/Then a monte: sintomo di copia parziale. */
    orphanAnd: number;
  };
  nearDuplicates: {
    clustersWithVariants: number;
    variantsInsideClusters: number;
    largestClusterVariants: number;
    largestClusterOccurrences: number;
    /** Quante varianti distinte hanno i cluster: 1, 2, 3, 4-6, 7+. */
    sizeHistogram: Record<string, number>;
    crossBranchClusters: number;
    nearMisses: number;
  };
  byBranch: Record<string, BranchMetrics>;
}

function computeMetrics(
  docs: readonly SourceDoc[],
  inputs: readonly ClusterInput[],
  result: ClusterResult,
  perDoc: ReadonlyMap<string, { steps: number; buckets: Set<StepBucket>; nonEmptyLines: number }>
): Metrics {
  const withSteps = [...perDoc.values()].filter((d) => d.steps > 0).length;
  const withTriplet = [...perDoc.values()].filter(
    (d) => d.buckets.has("Given") && d.buckets.has("When") && d.buckets.has("Then")
  ).length;

  let nonEmpty = 0;
  for (const d of perDoc.values()) if (d.steps > 0) nonEmpty += d.nonEmptyLines;

  const occurrences = inputs.length;
  const distinctKeys = new Set(inputs.map((i) => `${i.step.bucket} ${i.step.fingerprint}`));
  const distinct = distinctKeys.size;
  const clusters = result.clusters.length;

  const byBucket: Record<StepBucket, number> = { Given: 0, When: 0, Then: 0, Unknown: 0 };
  for (const i of inputs) byBucket[i.step.bucket]++;

  const orphanAnd = inputs.filter(
    (i) => (i.step.keyword === "And" || i.step.keyword === "But") && i.step.bucket === "Unknown"
  ).length;

  // Per ramo: e' la differenza fra "abbiamo entropia" (media che non aziona
  // nessuno) e "l'area X ha un problema che l'area Y non ha".
  const byBranch: Record<string, BranchMetrics> = {};
  const branchDocs = new Map<string, Set<string>>();
  const branchVariants = new Map<string, Set<string>>();
  const branchClusters = new Map<string, Set<string>>();

  for (const i of inputs) {
    const b = i.source.branch;
    const m = (byBranch[b] ??= {
      docs: 0,
      occurrences: 0,
      distinctVariants: 0,
      reuseRatio: 0,
      clusters: 0,
    });
    m.occurrences++;
    if (!branchDocs.has(b)) branchDocs.set(b, new Set());
    branchDocs.get(b)!.add(i.source.docId);
    if (!branchVariants.has(b)) branchVariants.set(b, new Set());
    branchVariants.get(b)!.add(`${i.step.bucket} ${i.step.fingerprint}`);
  }
  for (const c of result.clusters) {
    for (const b of Object.keys(c.branches)) {
      if (!branchClusters.has(b)) branchClusters.set(b, new Set());
      branchClusters.get(b)!.add(c.id);
    }
  }
  for (const [b, m] of Object.entries(byBranch)) {
    m.docs = branchDocs.get(b)?.size ?? 0;
    m.distinctVariants = branchVariants.get(b)?.size ?? 0;
    m.reuseRatio = m.occurrences ? m.distinctVariants / m.occurrences : 0;
    m.clusters = branchClusters.get(b)?.size ?? 0;
  }

  const histogram: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4-6": 0, "7+": 0 };
  for (const c of result.clusters) {
    const v = c.distinctVariants;
    const key = v === 1 ? "1" : v === 2 ? "2" : v === 3 ? "3" : v <= 6 ? "4-6" : "7+";
    histogram[key] = (histogram[key] ?? 0) + 1;
  }

  const multi = result.clusters.filter((c) => c.distinctVariants > 1);
  const largest = result.clusters.reduce<Cluster | null>(
    (best, c) => (best === null || c.distinctVariants > best.distinctVariants ? c : best),
    null
  );

  return {
    docs: {
      total: docs.length,
      withSteps,
      withFullTriplet: withTriplet,
      conformity: docs.length ? withSteps / docs.length : 0,
      tripletConformity: docs.length ? withTriplet / docs.length : 0,
    },
    lines: {
      nonEmpty,
      recognizedSteps: occurrences,
      conformity: nonEmpty ? occurrences / nonEmpty : 0,
    },
    steps: {
      occurrences,
      distinctVariants: distinct,
      reuseRatio: occurrences ? distinct / occurrences : 0,
      clusters,
      reuseRatioAfterClustering: occurrences ? clusters / occurrences : 0,
      varietyAbsorbed: distinct ? 1 - clusters / distinct : 0,
      byBucket,
      orphanAnd,
    },
    nearDuplicates: {
      clustersWithVariants: multi.length,
      variantsInsideClusters: multi.reduce((s, c) => s + c.distinctVariants, 0),
      largestClusterVariants: largest?.distinctVariants ?? 0,
      largestClusterOccurrences: largest?.size ?? 0,
      sizeHistogram: histogram,
      crossBranchClusters: result.clusters.filter((c) => Object.keys(c.branches).length > 1).length,
      nearMisses: result.nearMisses.length,
    },
    byBranch,
  };
}

// ---------------------------------------------------------------------------
// Candidati per il catalogo (schema v2)
// ---------------------------------------------------------------------------
//
// Un cluster diventa una voce di catalogo `@wanted`: forma canonica = variante
// piu' frequente, alias = le altre. Nasce gia' `wanted` e non `implemented`
// perche' nessuno l'ha ancora approvata: la curation resta un atto umano.

/** Oltre questa cardinalita' un parametro e' testo libero, non un enum. */
const MAX_ENUM_VALUES = 12;

interface CatalogCandidate {
  expression: string;
  parameters: string[];
  keyword: StepBucket;
  status: "wanted";
  sourceRef: string;
  occurrences: number;
  distinctVariants: number;
  branches: string[];
  aliases: string[];
  paramEnums?: Array<{ token: string; label: string; values: string[] }>;
}

function toCatalogCandidates(clusters: readonly Cluster[], minOccurrences: number): CatalogCandidate[] {
  return clusters
    .filter((c) => c.size >= minOccurrences)
    .map((c) => {
      const enums = c.paramEnums
        .filter((p) => p.values.length > 0 && p.values.length <= MAX_ENUM_VALUES)
        .map((p) => ({
          token: p.token,
          label: "", // lo mette il gatekeeper: e' una scelta di vocabolario
          values: p.values.map((v) => v.value),
        }));

      const candidate: CatalogCandidate = {
        expression: c.canonical.text,
        parameters: c.canonical.paramSignature ? c.canonical.paramSignature.split("|") : [],
        keyword: c.bucket,
        status: "wanted",
        sourceRef: `osservatorio:${c.id}`,
        occurrences: c.size,
        distinctVariants: c.distinctVariants,
        branches: Object.keys(c.branches).sort(),
        aliases: c.aliases.map((a) => a.text),
      };
      if (enums.length > 0) candidate.paramEnums = enums;
      return candidate;
    });
}

// ---------------------------------------------------------------------------
// Summary — la parte che puo' uscire dalla macchina
// ---------------------------------------------------------------------------

interface SummaryCluster {
  id: string;
  keyword: StepBucket;
  occurrences: number;
  distinctVariants: number;
  branches: number;
  /** Presenti solo con --with-phrases. */
  canonical?: string;
  aliases?: string[];
}

function anonymizer(branches: readonly string[], enabled: boolean): (b: string) => string {
  if (!enabled) return (b) => b;
  const map = new Map<string, string>();
  const sorted = [...new Set(branches)].sort();
  sorted.forEach((b, i) => {
    const letter =
      i < 26 ? String.fromCharCode(65 + i) : `${Math.floor(i / 26)}${String.fromCharCode(65 + (i % 26))}`;
    map.set(b, `Ramo ${letter}`);
  });
  return (b) => map.get(b) ?? "Ramo ?";
}

function pctNum(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

function buildSummaryMarkdown(
  meta: { generatedAt: string; label: string; withPhrases: boolean; anonymized: boolean },
  m: Metrics,
  top: SummaryCluster[],
  cfg: typeof DEFAULT_CLUSTER_CONFIG,
  branchName: (b: string) => string
): string {
  const L: string[] = [];

  L.push("# Osservatorio — baseline di entropia del linguaggio BDD");
  L.push("");
  L.push(`> Generato il ${meta.generatedAt} da \`scripts/analyze-corpus.ts\`.`);
  L.push(`> Sorgente: ${meta.label}.`);
  L.push(">");
  L.push(
    meta.withPhrases
      ? "> **Contiene frasi estratte dal corpus** (`--with-phrases`). Rileggilo prima di condividerlo."
      : "> Contiene solo aggregati: nessuna frase, nessun titolo di pagina. Le frasi stanno nel file `-full.json`, che non deve uscire dalla macchina."
  );
  if (meta.anonymized) L.push("> I nomi dei rami sono stati sostituiti con etichette neutre.");
  L.push("");

  L.push("## 1. Conformita' — quanto del materiale e' gia' leggibile come Gherkin");
  L.push("");
  L.push("| Metrica | Valore |");
  L.push("|---|---|");
  L.push(`| Documenti analizzati | ${m.docs.total} |`);
  L.push(`| Documenti con almeno un passo riconosciuto | ${m.docs.withSteps} (${pctNum(m.docs.conformity)}) |`);
  L.push(`| Documenti con premessa + azione + verifica | ${m.docs.withFullTriplet} (${pctNum(m.docs.tripletConformity)}) |`);
  L.push(`| Righe non vuote nei documenti candidati | ${m.lines.nonEmpty} |`);
  L.push(`| Righe interpretabili come passo | ${m.lines.recognizedSteps} (${pctNum(m.lines.conformity)}) |`);
  L.push(`| Passi "And/But" senza premessa a monte | ${m.steps.orphanAnd} |`);
  L.push("");
  // La frase cambia col dato: un commento fisso che parla di "conformita' bassa"
  // sopra un 90% e' il modo piu' rapido per far perdere fiducia in tutto il resto.
  L.push(
    m.docs.tripletConformity < 0.6
      ? "La conformita' bassa non e' una colpa dei tester: e' la conseguenza di scrivere " +
          "in pagine libere senza uno schema. E' il numero che giustifica l'iniziativa da solo."
      : "La struttura Given/When/Then e' gia' largamente presente: il problema non e' la " +
          "forma dei casi di test, e' il vocabolario con cui sono scritti. Vedi la sezione 3."
  );
  L.push("");

  L.push("## 2. Riuso — quante volte si riscrive la stessa cosa");
  L.push("");
  L.push("| Metrica | Valore | Lettura |");
  L.push("|---|---|---|");
  L.push(`| Occorrenze di passo | ${m.steps.occurrences} | il totale scritto a mano |`);
  L.push(`| Varianti distinte (testo identico) | ${m.steps.distinctVariants} | |`);
  L.push(`| **Reuse ratio** (distinti / totali) | **${m.steps.reuseRatio.toFixed(3)}** | 1.000 = nessun riuso |`);
  L.push(`| Cluster di intenzione | ${m.steps.clusters} | quanti passi servirebbero davvero |`);
  L.push(`| Reuse ratio con il catalogo | ${m.steps.reuseRatioAfterClustering.toFixed(3)} | il "dopo" raggiungibile |`);
  L.push(`| Varieta' assorbita dal clustering | ${pctNum(m.steps.varietyAbsorbed)} | varianti che collassano su una forma |`);
  L.push("");
  L.push("| Keyword | Occorrenze |");
  L.push("|---|---|");
  for (const k of ["Given", "When", "Then", "Unknown"] as StepBucket[]) {
    L.push(`| ${k} | ${m.steps.byBucket[k]} |`);
  }
  L.push("");

  L.push("## 3. Near-duplicate — i modi diversi di dire la stessa cosa");
  L.push("");
  L.push("| Metrica | Valore |");
  L.push("|---|---|");
  L.push(`| Cluster con piu' di una variante | ${m.nearDuplicates.clustersWithVariants} |`);
  L.push(`| Varianti coinvolte | ${m.nearDuplicates.variantsInsideClusters} |`);
  L.push(`| Cluster piu' affollato | ${m.nearDuplicates.largestClusterVariants} varianti, ${m.nearDuplicates.largestClusterOccurrences} occorrenze |`);
  L.push(`| Cluster presenti su piu' rami | ${m.nearDuplicates.crossBranchClusters} |`);
  L.push(`| Coppie "near-miss" da rivedere a mano | ${m.nearDuplicates.nearMisses} |`);
  L.push("");
  L.push("Distribuzione dei cluster per numero di varianti:");
  L.push("");
  L.push("| Varianti | Cluster |");
  L.push("|---|---|");
  for (const [k, v] of Object.entries(m.nearDuplicates.sizeHistogram)) L.push(`| ${k} | ${v} |`);
  L.push("");
  L.push(
    "I cluster presenti su piu' rami sono i candidati di catalogo piu' preziosi: " +
      "dimostrano che due aree diverse stanno gia' descrivendo lo stesso comportamento, " +
      "ognuna con parole sue."
  );
  L.push("");

  L.push("## 4. Distribuzione per ramo");
  L.push("");
  L.push("| Ramo | Documenti | Passi | Varianti | Reuse ratio | Cluster |");
  L.push("|---|---|---|---|---|---|");
  const rows = Object.entries(m.byBranch).sort((a, b) => b[1].occurrences - a[1].occurrences);
  for (const [branch, b] of rows) {
    L.push(
      `| ${branchName(branch)} | ${b.docs} | ${b.occurrences} | ${b.distinctVariants} | ` +
        `${b.reuseRatio.toFixed(3)} | ${b.clusters} |`
    );
  }
  L.push("");

  L.push(`## 5. Cluster piu' affollati (primi ${top.length})`);
  L.push("");
  if (meta.withPhrases) {
    L.push("| # | Keyword | Occ. | Varianti | Rami | Forma canonica proposta |");
    L.push("|---|---|---|---|---|---|");
    for (const c of top) {
      L.push(
        `| ${c.id} | ${c.keyword} | ${c.occurrences} | ${c.distinctVariants} | ${c.branches} | ` +
          `\`${(c.canonical ?? "").replace(/\|/g, "\\|")}\` |`
      );
    }
    L.push("");
    const withAliases = top.filter((c) => (c.aliases?.length ?? 0) > 0);
    if (withAliases.length > 0) {
      L.push("### Alias per cluster");
      L.push("");
      for (const c of withAliases) {
        L.push(`**${c.id}** — canonica: \`${c.canonical}\``);
        L.push("");
        for (const a of c.aliases ?? []) L.push(`- \`${a}\``);
        L.push("");
      }
    }
  } else {
    L.push("| # | Keyword | Occorrenze | Varianti | Rami |");
    L.push("|---|---|---|---|---|");
    for (const c of top) {
      L.push(`| ${c.id} | ${c.keyword} | ${c.occurrences} | ${c.distinctVariants} | ${c.branches} |`);
    }
    L.push("");
    L.push(
      "Le frasi non compaiono qui per scelta. Aprire il file `-full.json` per leggerle, " +
        "e rilanciare con `--with-phrases` solo dopo aver deciso che si possono mostrare."
    );
  }
  L.push("");

  L.push("## 6. Come sono stati ottenuti questi numeri");
  L.push("");
  L.push(
    "Nessun modello, nessun embedding: solo regole ispezionabili. Due passi normalizzati " +
      "finiscono insieme se hanno la stessa impronta (minuscole, accenti tolti, spazi " +
      "collassati, valori sostituiti da `{string}` / `{int}` / `{float}` / `{date}`), " +
      "oppure se superano una soglia di similarita' calcolata su due componenti: " +
      "quante parole di contenuto condividono (pesate per rarita') e quanto si somigliano " +
      "come stringhe."
  );
  L.push("");
  L.push("| Soglia | Valore | Effetto se la si alza |");
  L.push("|---|---|---|");
  L.push(`| Similarita' minima per fondere | ${cfg.combinedMin} | meno fusioni, entropia misurata piu' alta, zero falsi accoppiamenti |`);
  L.push(`| Peso della componente lessicale | ${cfg.jaccardWeight} | contano di piu' QUALI parole si condividono |`);
  L.push(`| Rapporto minimo di lunghezza | ${cfg.lengthRatioMin} | non si fondono frasi di lunghezza molto diversa |`);
  L.push(`| Fascia di segnalazione near-miss | ${cfg.nearMissBand} | piu' coppie da rivedere a mano |`);
  L.push(`| Keyword separate | ${cfg.separateByKeyword} | una premessa non finisce mai col suo omologo di verifica |`);
  L.push("");
  L.push(
    "Guardie sempre attive, indipendenti dalle soglie: due frasi non vengono mai fuse se " +
      "una contiene una negazione e l'altra no, o se contengono i due lati di una coppia di " +
      "antonimi (`logged in` / `logged out`, `aggiunge` / `rimuove`, `valido` / `non valido`). " +
      "E' la difesa contro il falso accoppiamento tipico: una parola di differenza, significato opposto."
  );
  L.push("");
  L.push(
    "**Limite noto:** il metodo e' lessicale, quindi non riconosce come equivalenti due frasi " +
      "scritte in lingue diverse (`the user is logged in` e `l'utente e' autenticato` restano " +
      "due cluster). E' una scelta, non un difetto da nascondere: fonderle richiederebbe un " +
      "modello semantico, cioe' rinunciare alla riproducibilita' del numero. La corrispondenza " +
      "fra le due lingue si fa a mano, una volta, in fase di curation del catalogo."
  );
  L.push("");

  L.push("## 7. Cosa farne");
  L.push("");
  L.push("1. Leggere i cluster piu' affollati: sono i candidati step del catalogo, gia' ordinati per impatto.");
  L.push("2. Per ognuno, il gatekeeper sceglie la forma canonica e registra le altre come alias.");
  L.push("3. Le coppie near-miss vanno decise a mano: sono i casi in cui il metodo si e' fermato apposta.");
  L.push("4. Ripubblicare il catalogo, poi rilanciare questo comando fra qualche settimana.");
  L.push("   La riduzione di entropia diventa la differenza fra due esecuzioni, non un'opinione.");
  L.push("");

  return L.join("\n");
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const inPath = argValue(args, "--in");

  if (!inPath) {
    console.error(
      "ERRORE: manca --in\n\n" +
        "  npx ts-node scripts/analyze-corpus.ts --in reports/confluence-export/<ts>.json\n" +
        "  npx ts-node scripts/analyze-corpus.ts --in src/features\n\n" +
        "  L'export lo produce:  npm run confluence:fetch -- --root <ID>\n"
    );
    process.exit(1);
  }

  const { docs, label } = load(inPath);

  const topN = Number(argValue(args, "--top") ?? 25);
  const seedMin = Number(argValue(args, "--seed-min") ?? 2);
  const withPhrases = args.includes("--with-phrases");
  const anonymize = args.includes("--anonymize-branches");
  const thresholdArg = argValue(args, "--threshold");

  const config = { ...DEFAULT_CLUSTER_CONFIG };
  if (thresholdArg !== undefined) config.combinedMin = Number(thresholdArg);
  if (args.includes("--no-fuzzy")) config.combinedMin = 1.01; // nessuna coppia puo' superarla

  // ── Normalizzazione ─────────────────────────────────────────────────────
  const inputs: ClusterInput[] = [];
  const perDoc = new Map<string, { steps: number; buckets: Set<StepBucket>; nonEmptyLines: number }>();

  for (const doc of docs) {
    const entry = { steps: 0, buckets: new Set<StepBucket>(), nonEmptyLines: 0 };
    for (const line of doc.text.split("\n")) if (line.trim()) entry.nonEmptyLines++;

    for (const n of normalizeSteps(doc.text)) {
      entry.steps++;
      entry.buckets.add(n.step.bucket);
      inputs.push({
        step: n.step,
        source: { docId: doc.id, docTitle: doc.title, branch: doc.branch, line: n.line },
      });
    }
    perDoc.set(doc.id, entry);
  }

  if (inputs.length === 0) {
    console.error(
      "\nNessun passo riconosciuto nel corpus.\n" +
        "  Verifica prima l'estrazione:  npm run confluence:probe -- --root <ID>\n"
    );
    process.exit(1);
  }

  // ── Clustering ──────────────────────────────────────────────────────────
  const result = clusterSteps(inputs, config);
  const metrics = computeMetrics(docs, inputs, result, perDoc);
  const candidates = toCatalogCandidates(result.clusters, seedMin);

  const branchName = anonymizer(docs.map((d) => d.branch), anonymize);
  const generatedAt = new Date().toISOString();

  // ── Scrittura ───────────────────────────────────────────────────────────
  const stamp = generatedAt.replace(/[:.]/g, "-");
  const outPrefix = argValue(args, "--out") ?? path.join("reports", "corpus-analysis", stamp);
  fs.mkdirSync(path.dirname(outPrefix), { recursive: true });

  const fullPath = `${outPrefix}-full.json`;
  const summaryJsonPath = `${outPrefix}-summary.json`;
  const summaryMdPath = `${outPrefix}-summary.md`;

  fs.writeFileSync(
    fullPath,
    JSON.stringify(
      {
        generatedAt,
        source: { input: inPath, label, documents: docs.length },
        config: result.config,
        idfApplied: result.idfApplied,
        metrics,
        clusters: result.clusters,
        nearMisses: result.nearMisses,
        catalogCandidates: candidates,
      },
      null,
      2
    ),
    "utf-8"
  );

  const top: SummaryCluster[] = result.clusters.slice(0, topN).map((c) => {
    const row: SummaryCluster = {
      id: c.id,
      keyword: c.bucket,
      occurrences: c.size,
      distinctVariants: c.distinctVariants,
      branches: Object.keys(c.branches).length,
    };
    if (withPhrases) {
      row.canonical = c.canonical.text;
      row.aliases = c.aliases.map((a) => a.text);
    }
    return row;
  });

  const summaryBranches: Record<string, BranchMetrics> = {};
  for (const [b, v] of Object.entries(metrics.byBranch)) summaryBranches[branchName(b)] = v;

  fs.writeFileSync(
    summaryJsonPath,
    JSON.stringify(
      {
        generatedAt,
        source: { label, documents: docs.length },
        containsPhrases: withPhrases,
        branchesAnonymized: anonymize,
        config: result.config,
        metrics: { ...metrics, byBranch: summaryBranches },
        topClusters: top,
        catalogCandidatesCount: candidates.length,
      },
      null,
      2
    ),
    "utf-8"
  );

  fs.writeFileSync(
    summaryMdPath,
    buildSummaryMarkdown(
      { generatedAt, label, withPhrases, anonymized: anonymize },
      { ...metrics, byBranch: metrics.byBranch },
      top,
      result.config,
      branchName
    ),
    "utf-8"
  );

  // ── Riepilogo a schermo ─────────────────────────────────────────────────
  console.log(`\nANALISI CORPUS\n  Sorgente: ${label}\n`);
  console.log(`  Documenti                 : ${metrics.docs.total}`);
  console.log(
    `  Con passi riconosciuti    : ${metrics.docs.withSteps}  (${pct(metrics.docs.withSteps, metrics.docs.total)})`
  );
  console.log(
    `  Con Given+When+Then       : ${metrics.docs.withFullTriplet}  (${pct(metrics.docs.withFullTriplet, metrics.docs.total)})`
  );
  console.log(`  Occorrenze di passo       : ${metrics.steps.occurrences}`);
  console.log(`  Varianti distinte         : ${metrics.steps.distinctVariants}`);
  console.log(`  Reuse ratio (distinti/tot): ${metrics.steps.reuseRatio.toFixed(3)}`);
  console.log(`  Cluster di intenzione     : ${metrics.steps.clusters}`);
  console.log(`  Reuse ratio col catalogo  : ${metrics.steps.reuseRatioAfterClustering.toFixed(3)}`);
  console.log(`  Cluster near-duplicate    : ${metrics.nearDuplicates.clustersWithVariants}`);
  console.log(`  Cluster su piu' rami      : ${metrics.nearDuplicates.crossBranchClusters}`);
  console.log(`  Near-miss da rivedere     : ${metrics.nearDuplicates.nearMisses}`);
  console.log(`  Candidati per il catalogo : ${candidates.length}  (>= ${seedMin} occorrenze)\n`);

  console.log(`  Scritto:`);
  console.log(`    ${fullPath}      ← contiene le frasi reali. NON deve uscire dalla macchina.`);
  console.log(`    ${summaryJsonPath}`);
  console.log(`    ${summaryMdPath}   ← rileggilo, poi decidi se condividerlo.\n`);

  if (!withPhrases) {
    console.log(
      `  Il summary non contiene frasi. Se dopo averlo letto vuoi metterci le forme\n` +
        `  canoniche e gli alias, rilancia con --with-phrases.\n`
    );
  }
}

try {
  main();
} catch (err) {
  console.error(`\nErrore: ${(err as Error).message}\n`);
  process.exit(1);
}
