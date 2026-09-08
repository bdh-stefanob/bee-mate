/**
 * render-markdown.ts
 * ------------------
 * PROIEZIONE del catalogo in Markdown cercabile, raggruppato per dominio,
 * con la documentazione accessoria (@intent) accanto a ogni step.
 *
 * SOLA LETTURA: rigenerato a ogni build. Non modificare a mano.
 *
 * Uso:  npx ts-node scripts/render-markdown.ts
 */

import * as fs from "fs";

interface StepDoc {
  intent?: string;
  params: Record<string, string>;
  pre?: string;
  post?: string;
}
/**
 * Componente di frontend che uno step tocca davvero.
 *
 * Non e' solo un dato per il matching interno: reso nel catalogo dice a chi
 * legge **su cosa agisce** quello step, che e' spesso l'unico modo per capire
 * in dieci secondi se e' quello che serve. E rende il catalogo verificabile:
 * se lo scout non trova piu' quei componenti sulla pagina, lo step e' scaduto
 * perche' la UI e' cambiata sotto.
 */
interface StepComponent {
  role: string;
  name: string;
  /** Pagina su cui vive, se lo step ne tocca piu' di una. */
  page?: string;
}

interface CatalogStep {
  expression: string;
  parameters: string[];
  /** Componenti toccati. Assente = step non ancora ancorato alla UI. */
  components?: StepComponent[];
  /** Ultima volta che lo scout ha confermato che esistono ancora. */
  componentsVerifiedAt?: string;
  app?: string;
  area?: string;
  domain: string;
  status?: 'implemented' | 'wanted' | 'deprecated';
  replacedBy?: string;
  requester?: string;
  assignee?: string;
  sourceRef: string;
  doc: StepDoc;
  documented: boolean;
}

const catalog = JSON.parse(fs.readFileSync("step-catalog.json", "utf-8"));
const steps: CatalogStep[] = catalog.steps;

const byDomain = new Map<string, CatalogStep[]>();
for (const s of steps) {
  if (!byDomain.has(s.domain)) byDomain.set(s.domain, []);
  byDomain.get(s.domain)!.push(s);
}

let md = `# Step Catalog\n\n`;
md += `> **Auto-generated — do not edit by hand.**\n`;
md += `> Source of truth: the step definitions in the code. Regenerated on\n`;
md += `> every build. To change a step, change the code.\n\n`;
md += `Last update: ${catalog.generatedAt}\n`;
const impl = steps.filter((s) => !s.status || s.status === 'implemented').length;
const want = steps.filter((s) => s.status === 'wanted').length;
const depr = steps.filter((s) => s.status === 'deprecated').length;
md += `Total: **${catalog.totalSteps}** steps `;
md += `(${impl} implemented, ${want} wanted, ${depr} deprecated)\n\n`;

// Quanto del catalogo e' agganciato a componenti reali. E' una misura di
// completezza: uno step senza componenti o e' puramente di business, o non e'
// mai passato dal recorder — e finche' non lo fa, nessun confronto meccanico
// puo' proporlo a partire da una registrazione.
const anchored = steps.filter((s) => (s.components?.length ?? 0) > 0).length;
if (anchored > 0) {
  const pct = Math.round((anchored / steps.length) * 100);
  md += `Ancorati a componenti di frontend: **${anchored}/${steps.length}** (${pct}%)\n\n`;
}

md += `## How to use\n\n`;
md += `Before writing a new step in a \`.feature\`, **search here** (Ctrl+F) for\n`;
md += `an existing step that matches the intent. If it exists, reuse the exact\n`;
md += `expression. If it does not, flag it to the step gatekeeper.\n\n`;
md += `---\n\n`;

for (const domain of [...byDomain.keys()].sort()) {
  const list = byDomain.get(domain)!;
  md += `## Domain: \`${domain}\` (${list.length} steps)\n\n`;
  for (const s of list) {
    const statusBadge =
      s.status === 'wanted' ? '🔧 ' :
      s.status === 'deprecated' ? '⛔ ' : '';
    const undocFlag = s.documented ? "" : " ⚠️ _undocumented_";
    md += `### ${statusBadge}\`${s.expression}\`${undocFlag}\n\n`;
    if (s.doc?.intent) md += `${s.doc.intent}\n\n`;
    if (s.status === 'wanted' && (s.requester || s.assignee)) {
      md += `_Requester: ${s.requester ?? '—'} — Assignee: ${s.assignee ?? '—'}_\n\n`;
    }
    if (s.status === 'deprecated' && s.replacedBy) {
      md += `**Sostituito da:** \`${s.replacedBy}\`\n\n`;
    }
    if (Object.keys(s.doc?.params ?? {}).length) {
      md += `**Parameters:**\n`;
      for (const [name, desc] of Object.entries(s.doc!.params)) {
        md += `- \`${name}\` — ${desc}\n`;
      }
      md += `\n`;
    }
    // I componenti sono documentazione, non solo dati per il matching: dicono a
    // chi legge su cosa agisce lo step, che e' spesso il modo piu' rapido per
    // capire se e' quello giusto.
    if (s.components?.length) {
      const verified = s.componentsVerifiedAt
        ? ` _(confermati sulla pagina il ${s.componentsVerifiedAt.slice(0, 10)})_`
        : ` _(mai confermati sulla pagina)_`;
      md += `**Componenti di frontend:**${verified}\n`;
      for (const c of s.components) {
        md += `- \`${c.role}\` "${c.name}"${c.page ? ` — pagina \`${c.page}\`` : ""}\n`;
      }
      md += `\n`;
    }
    if (s.doc?.pre) md += `**Pre:** ${s.doc.pre}\n\n`;
    if (s.doc?.post) md += `**Post:** ${s.doc.post}\n\n`;
    md += `_Source:_ \`${s.sourceRef}\`\n\n`;
  }
}

fs.writeFileSync("STEP_CATALOG.md", md);
console.log("Catalogo Markdown generato: STEP_CATALOG.md");
