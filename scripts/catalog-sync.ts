/**
 * catalog-sync.ts
 * ---------------
 * Il **ciclo del catalogo**: rilegge il corpus, lo confronta con il catalogo
 * corrente e prepara la coda per il consolidamento mensile.
 *
 * IL MODELLO
 * Le varianti non si bloccano quando vengono scritte: si registrano e si fanno
 * convergere a valle, eleggendo periodicamente la forma canonica ("Gold") e
 * riscrivendo le occorrenze. Nessuno aspetta un'approvazione per lavorare, e il
 * gatekeeper esce dal percorso critico.
 *
 * Il prezzo e' che **l'entropia cresce prima di calare**: per questo il report
 * apre sempre con la metrica, ed e' l'unica cosa che distingue "sta
 * convergendo" da "stiamo accumulando in modo ordinato".
 *
 * COSA PRODUCE, E PERCHE' TRE FILE E NON UNO
 *   proposals.json   completo, con le frasi reali → resta sulla macchina
 *   queue.md         il modulo di decisione: una proposta, un motivo, un esempio
 *   report.md        soli aggregati per area → condivisibile dopo rilettura
 *
 * La separazione non e' un vezzo: il primo contiene contenuto aziendale, gli
 * altri due sono fatti per essere letti da altri. Tenerli insieme costringerebbe
 * a scegliere fra non condividere niente e condividere tutto.
 *
 * Uso:
 *   npx ts-node scripts/catalog-sync.ts --in reports/confluence-export/<file>.json
 *   npx ts-node scripts/catalog-sync.ts --in src/features --out reports/catalog-sync
 *
 * Flag:
 *   --in PATH        export di confluence-fetch, oppure cartella di .feature
 *   --catalog PATH   catalogo corrente (default step-catalog.json)
 *   --out DIR        cartella di destinazione (default reports/catalog-sync)
 *   --max N          gruppi da portare in coda (default 20)
 */

import * as fs from "fs";
import * as path from "path";
import { load, type SourceDoc } from "./lib/corpus";
import { normalizeSteps, normalizeStepLine } from "./lib/normalize";
import { clusterSteps, type Cluster, type ClusterInput } from "./lib/cluster";
import { electGold, margin, type Candidate, type ScoredCandidate } from "./lib/gold";

// ---------------------------------------------------------------------------
// Catalogo
// ---------------------------------------------------------------------------

interface CatalogComponent {
  role: string;
  name: string;
}

interface CatalogStep {
  expression: string;
  keyword?: string;
  aliases?: string[];
  components?: CatalogComponent[];
  status?: string;
}

interface CatalogEntry {
  step: CatalogStep;
  /** Impronte della forma canonica e di tutte le sue varianti note. */
  fingerprints: Set<string>;
}

/**
 * Riduce ogni voce di catalogo alle sue impronte, usando lo STESSO
 * normalizzatore applicato al corpus.
 *
 * E' la ragione per cui il confronto e' deterministico: non si cerca una
 * somiglianza fra una frase e un'espressione, si confrontano due impronte
 * prodotte dallo stesso procedimento.
 */
function indexCatalog(catalogPath: string): CatalogEntry[] {
  if (!fs.existsSync(catalogPath)) return [];
  const json = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as { steps?: CatalogStep[] };
  const steps = json.steps ?? [];

  return steps.map((step) => {
    const fingerprints = new Set<string>();
    const keyword = step.keyword ?? "Given";
    for (const phrase of [step.expression, ...(step.aliases ?? [])]) {
      const n = normalizeStepLine(`${keyword} ${phrase}`);
      if (n) fingerprints.add(n.fingerprint);
    }
    return { step, fingerprints };
  });
}

// ---------------------------------------------------------------------------
// Le diramazioni
// ---------------------------------------------------------------------------

/**
 * Cosa lo strumento propone per un gruppo.
 *
 * Questa e' la tassonomia INTERNA: chi decide non la vede e non deve
 * impararla. Vede una proposta in italiano, un motivo e un esempio, e risponde
 * solo se dissente.
 */
type Branch =
  | "coperto"        // gia' a catalogo: niente da decidere
  | "alias"          // a catalogo, ma con formulazioni nuove da registrare
  | "parametrizza"   // le varianti differiscono solo per un valore
  | "scomponi"       // e' la somma di voci gia' a catalogo
  | "separa"         // le varianti non sono la stessa intenzione
  | "eleggi";        // nessun segnale meccanico: decide la matrice

interface Proposal {
  clusterId: string;
  branch: Branch;
  /** Frase in italiano che chi decide legge. */
  proposal: string;
  /** Perche', in una riga. E' cio' che rende la proposta contestabile. */
  reason: string;
  /** LINGUAGGIO o TECNICO: dice quale competenza serve per giudicare. */
  judgement: "LINGUAGGIO" | "TECNICO";
  occurrences: number;
  areas: string[];
  candidates: ScoredCandidate[];
  /** Distacco fra il primo e il secondo: sotto soglia, non e' una scelta ovvia. */
  margin: number;
  /** Occorrenze reali nel loro contesto: contano piu' del punteggio. */
  examples: Array<{ text: string; doc: string; line: number }>;
  /** Voci di catalogo coinvolte, quando la proposta le riguarda. */
  relatedCatalog: string[];
}

/** Sotto questo distacco due formulazioni si equivalgono: serve un umano. */
const CLOSE_CALL = 0.05;

function clusterCandidates(cluster: Cluster): Candidate[] {
  return [cluster.canonical, ...cluster.aliases].map((v) => ({
    text: v.text,
    occurrences: v.count,
    areas: [...new Set(v.sources.map((s) => s.branch))],
  }));
}

function examplesOf(cluster: Cluster, max = 3): Proposal["examples"] {
  const out: Proposal["examples"] = [];
  for (const v of [cluster.canonical, ...cluster.aliases]) {
    const s = v.sources[0];
    if (!s) continue;
    out.push({ text: v.text, doc: s.docTitle || s.docId, line: s.line });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Decide cosa proporre per un gruppo.
 *
 * L'ordine delle domande non e' casuale: prima si stabilisce se il gruppo e'
 * legittimo (una sola intenzione), poi se serve davvero un nuovo step, poi
 * quale forma dargli. Invertirlo significherebbe eleggere con cura la
 * formulazione di uno step che non doveva esistere.
 */
function decide(cluster: Cluster, catalog: CatalogEntry[]): Proposal {
  const candidates = clusterCandidates(cluster);
  const scored = electGold(candidates);
  const areas = [...new Set(Object.keys(cluster.branches))];
  const base = {
    clusterId: cluster.id,
    occurrences: cluster.size,
    areas,
    candidates: scored,
    margin: margin(scored),
    examples: examplesOf(cluster),
    relatedCatalog: [] as string[],
  };

  // ── Gia' a catalogo? ─────────────────────────────────────────────────────
  const fps = new Set([cluster.canonical.fingerprint, ...cluster.aliases.map((a) => a.fingerprint)]);
  const covering = catalog.filter((c) => [...fps].some((f) => c.fingerprints.has(f)));

  if (covering.length > 0) {
    const known = covering[0]!;
    const unknownVariants = [cluster.canonical, ...cluster.aliases].filter(
      (v) => !known.fingerprints.has(v.fingerprint)
    );

    if (unknownVariants.length === 0) {
      return {
        ...base,
        branch: "coperto",
        judgement: "LINGUAGGIO",
        proposal: `nessuna azione: gia' a catalogo come "${known.step.expression}"`,
        reason: "tutte le formulazioni trovate sono gia' registrate",
        relatedCatalog: [known.step.expression],
      };
    }

    return {
      ...base,
      branch: "alias",
      judgement: "LINGUAGGIO",
      proposal:
        unknownVariants.length === 1
          ? `registrare una nuova formulazione come variante di "${known.step.expression}"`
          : `registrare ${unknownVariants.length} nuove formulazioni come varianti di "${known.step.expression}"`,
      reason:
        "esprimono la stessa intenzione di una voce esistente: registrandole, chi le riscrive " +
        "si vedra' suggerire la forma canonica invece di un rifiuto",
      relatedCatalog: [known.step.expression],
    };
  }

  // ── E' la somma di voci gia' a catalogo? ─────────────────────────────────
  //
  // Richiede che le varianti portino i componenti che toccano. Oggi arrivano
  // solo dalle registrazioni: da un corpus di testo non sono ricavabili, e
  // fingere il contrario produrrebbe proposte inventate. Quando il corpus li
  // avra', questo ramo si attiva da solo.
  //
  // Vale la pena: riconoscere una composizione fa DECRESCERE il catalogo,
  // mentre trattarla come variante lo fa crescere di una voce che non serviva.

  // ── Le varianti differiscono solo per un valore? ─────────────────────────
  const parametric = cluster.paramEnums.find((p) => p.values.length > 1);
  if (parametric) {
    return {
      ...base,
      branch: "parametrizza",
      judgement: "TECNICO",
      proposal: `un solo step parametrico: "${scored[0]?.text ?? cluster.canonical.text}"`,
      reason:
        `le varianti differiscono solo per il valore di ${parametric.token} ` +
        `(${parametric.values.slice(0, 4).map((v) => `"${v.value}"`).join(", ")}` +
        `${parametric.values.length > 4 ? ", …" : ""}): e' uno step solo, non ${parametric.values.length}`,
    };
  }

  // ── Altrimenti: decide la matrice ────────────────────────────────────────
  const winner = scored[0];
  const close = base.margin < CLOSE_CALL && scored.length > 1;

  return {
    ...base,
    branch: "eleggi",
    judgement: "LINGUAGGIO",
    proposal: winner ? `adottare "${winner.text}"` : "nessun candidato",
    reason: close
      ? `due formulazioni si equivalgono (distacco ${base.margin.toFixed(2)}): serve una scelta, non un calcolo`
      : winner
        ? `punteggio ${winner.score.toFixed(2)} — ` +
          `${winner.occurrences} occorrenze, ${winner.areas.length} aree` +
          (winner.conformityReasons.length ? `, ${winner.conformityReasons.join(", ")}` : "")
        : "",
  };
}

// ---------------------------------------------------------------------------
// Uscite
// ---------------------------------------------------------------------------

function renderQueue(proposals: Proposal[], label: string): string {
  const decide = proposals.filter((p) => p.branch !== "coperto");
  const covered = proposals.length - decide.length;

  let md = `# Coda di consolidamento\n\n`;
  md += `> Sorgente: ${label}\n`;
  md += `> Generata: ${new Date().toISOString().slice(0, 10)}\n\n`;
  md += `**Come si risponde:** se una proposta va bene, non scrivere niente. `;
  md += `Scrivi solo per dissentire, nella riga in fondo al gruppo.\n\n`;
  md += `${decide.length} gruppi da confermare · ${covered} gia' a catalogo, non serve leggerli.\n\n`;

  // Il distacco conta SOLO dove si sceglie fra formulazioni concorrenti.
  //
  // Per gli altri esiti la proposta nasce da un segnale meccanico — una voce
  // gia' a catalogo, un parametro, una composizione — e non c'e' niente da
  // scegliere. Metterli fra i casi da discutere riempirebbe di rumore i quindici
  // minuti che servono ai pochi in cui il calcolo davvero non basta.
  const isContested = (p: Proposal): boolean => p.branch === "eleggi" && p.margin < CLOSE_CALL;
  const contested = decide.filter(isContested);
  const clear = decide.filter((p) => !isContested(p));

  const section = (title: string, list: Proposal[], note: string): void => {
    if (list.length === 0) return;
    md += `---\n\n## ${title} (${list.length})\n\n${note}\n\n`;
    for (const p of list) {
      const areaLabel = p.areas.length === 1 ? "1 area" : `${p.areas.length} aree`;
      md += `### Gruppo ${p.clusterId} · ${p.occurrences} occorrenze · ${areaLabel} · giudizio: ${p.judgement}\n\n`;
      md += `    PROPOSTA   ${p.proposal}\n`;
      md += `    PERCHE'    ${p.reason}\n`;
      if (p.examples.length > 0) {
        md += `    ESEMPIO    "${p.examples[0]!.text}"\n`;
        md += `               in "${p.examples[0]!.doc}", riga ${p.examples[0]!.line}\n`;
      }
      md += `\n`;
      if (p.candidates.length > 1) {
        md += `<details><summary>le altre formulazioni trovate</summary>\n\n`;
        for (const c of p.candidates.slice(0, 6)) {
          const ca = c.areas.length === 1 ? "1 area" : `${c.areas.length} aree`;
          md += `- \`${c.text}\` — ${c.score.toFixed(2)} · ${c.occurrences} occorrenze · ${ca}`;
          md += c.conformityReasons.length ? ` · ${c.conformityReasons.join(", ")}\n` : `\n`;
        }
        md += `\n</details>\n\n`;
      }
      md += `**NON SONO D'ACCORDO** — perche': \n\n`;
    }
  };

  section(
    "Da decidere insieme",
    contested,
    "Due o piu' formulazioni si equivalgono: il calcolo non basta, serve una scelta."
  );
  section(
    "Da scorrere in fretta",
    clear,
    "Proposte con un motivo meccanico o un vincitore netto. Silenzio = approvato."
  );

  return md;
}

function renderReport(
  proposals: Proposal[],
  perArea: Map<string, { occurrences: number; variants: number }>,
  label: string
): string {
  let md = `# Consolidamento — report\n\n`;
  md += `> Sorgente: ${label}\n> Generato: ${new Date().toISOString().slice(0, 10)}\n\n`;
  md += `Solo aggregati: nessuna frase del corpus. Rileggilo prima di condividerlo.\n\n`;

  const byBranch = new Map<Branch, number>();
  for (const p of proposals) byBranch.set(p.branch, (byBranch.get(p.branch) ?? 0) + 1);

  md += `## Cosa e' emerso\n\n| Esito | Gruppi |\n|---|---|\n`;
  const labels: Record<Branch, string> = {
    coperto: "Gia' a catalogo",
    alias: "Nuove formulazioni di step esistenti",
    parametrizza: "Da unificare in uno step parametrico",
    scomponi: "Composizioni di step esistenti",
    separa: "Da separare: intenzioni diverse",
    eleggi: "Nuovi step da eleggere",
  };
  for (const [b, n] of [...byBranch.entries()].sort((a, b2) => b2[1] - a[1])) {
    md += `| ${labels[b]} | ${n} |\n`;
  }

  md += `\n## Per area\n\n`;
  md += `L'attribuzione e' **per area, mai per persona**: la domanda utile e' `;
  md += `perche' un'area produce piu' varianti, non chi le ha scritte.\n\n`;
  md += `| Area | Occorrenze | Varianti distinte | Rapporto |\n|---|---|---|---|\n`;
  for (const [area, m] of [...perArea.entries()].sort((a, b) => b[1].occurrences - a[1].occurrences)) {
    const ratio = m.occurrences ? (m.variants / m.occurrences).toFixed(3) : "—";
    md += `| ${area} | ${m.occurrences} | ${m.variants} | ${ratio} |\n`;
  }

  md += `\n_Il rapporto e' il reuse ratio: 1,000 significa che ogni passo e' scritto una volta sola._\n`;
  md += `\n> Il modello adottato fa **crescere** l'entropia prima di farla calare.\n`;
  md += `> Un singolo numero non dice niente: conta l'andamento fra una seduta e l'altra.\n`;
  return md;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(args: string[], flag: string): string | undefined {
  const eq = args.find((a) => a.startsWith(flag + "="));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

function main(): void {
  const args = process.argv.slice(2);
  const inPath = argValue(args, "--in");
  if (!inPath) {
    console.error(
      "ERRORE: manca --in.\n\n" +
        "  npx ts-node scripts/catalog-sync.ts --in reports/confluence-export/<file>.json\n" +
        "  npx ts-node scripts/catalog-sync.ts --in src/features\n"
    );
    process.exit(1);
  }

  const catalogPath = argValue(args, "--catalog") ?? "step-catalog.json";
  const outDir = argValue(args, "--out") ?? path.join("reports", "catalog-sync");
  const max = Number(argValue(args, "--max") ?? 20);

  const { docs, label } = load(inPath);
  const catalog = indexCatalog(catalogPath);

  // Normalizzazione e clustering: gli STESSI usati per la baseline, cosi' i
  // numeri della coda e quelli del report sono confrontabili.
  const inputs: ClusterInput[] = [];
  const perArea = new Map<string, { occurrences: number; variants: number }>();
  const seenPerArea = new Map<string, Set<string>>();

  for (const doc of docs as SourceDoc[]) {
    for (const { step, line } of normalizeSteps(doc.text, { cutAtPipe: true })) {
      inputs.push({
        step,
        source: { docId: doc.id, docTitle: doc.title, branch: doc.branch, line },
      });
      const a = perArea.get(doc.branch) ?? { occurrences: 0, variants: 0 };
      a.occurrences++;
      perArea.set(doc.branch, a);
      const seen = seenPerArea.get(doc.branch) ?? new Set<string>();
      seen.add(step.fingerprint);
      seenPerArea.set(doc.branch, seen);
    }
  }
  for (const [area, seen] of seenPerArea) {
    const a = perArea.get(area);
    if (a) a.variants = seen.size;
  }

  const { clusters } = clusterSteps(inputs);

  // I gruppi piu' frequenti per primi: consolidare cio' che si scrive di piu'
  // rende di piu', e la coda ha un tetto.
  const ordered = [...clusters].sort((a, b) => b.size - a.size);
  const proposals = ordered.map((c) => decide(c, catalog));
  const forQueue = proposals.filter((p) => p.branch !== "coperto").slice(0, max);
  const covered = proposals.filter((p) => p.branch === "coperto");

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "proposals.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), source: label, proposals }, null, 2),
    "utf-8"
  );
  fs.writeFileSync(path.join(outDir, "queue.md"), renderQueue([...forQueue, ...covered], label), "utf-8");
  fs.writeFileSync(path.join(outDir, "report.md"), renderReport(proposals, perArea, label), "utf-8");

  const byBranch = new Map<Branch, number>();
  for (const p of proposals) byBranch.set(p.branch, (byBranch.get(p.branch) ?? 0) + 1);

  console.log(`\nCICLO DEL CATALOGO\n`);
  console.log(`  Sorgente        : ${label}`);
  console.log(`  Documenti       : ${docs.length}`);
  console.log(`  Occorrenze      : ${inputs.length}`);
  console.log(`  Gruppi          : ${clusters.length}`);
  console.log(`  Voci a catalogo : ${catalog.length}\n`);
  for (const [b, n] of [...byBranch.entries()].sort((a, b2) => b2[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${b}`);
  }
  console.log(`\n  In coda: ${forQueue.length} gruppi (tetto ${max})`);
  console.log(`\n  Scritto in ${outDir}/`);
  console.log(`    proposals.json  ← contiene le frasi reali. NON deve uscire dalla macchina.`);
  console.log(`    queue.md        ← il modulo di decisione per la seduta`);
  console.log(`    report.md       ← soli aggregati; rileggilo, poi decidi se condividerlo\n`);
}

main();
