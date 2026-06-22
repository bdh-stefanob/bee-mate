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
interface CatalogStep {
  expression: string;
  parameters: string[];
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
    if (s.doc?.pre) md += `**Pre:** ${s.doc.pre}\n\n`;
    if (s.doc?.post) md += `**Post:** ${s.doc.post}\n\n`;
    md += `_Source:_ \`${s.sourceRef}\`\n\n`;
  }
}

fs.writeFileSync("STEP_CATALOG.md", md);
console.log("Catalogo Markdown generato: STEP_CATALOG.md");
