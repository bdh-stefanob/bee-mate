/**
 * jira-sync.ts
 * -------------
 * Legge tutti i file .feature nella directory features/, estrae gli scenari
 * collegati a un ticket Jira tramite il tag @ticket:KEY, e pubblica il
 * contenuto Gherkin come commento sull'issue Jira corrispondente.
 *
 * Prerequisiti — variabili in .env (mai commit in repo):
 *   JIRA_URL    https://company.atlassian.net
 *   JIRA_EMAIL  nome@company.com
 *   JIRA_TOKEN  personal access token da id.atlassian.com/manage-profile/security/api-tokens
 *
 * Uso:
 *   npx ts-node scripts/jira-sync.ts                 # tutte le features
 *   npx ts-node scripts/jira-sync.ts features/auth   # solo una subdirectory
 *   npx ts-node scripts/jira-sync.ts --dry-run        # stampa payload, non invia
 *
 * Exit code:
 *   0 se tutti i commenti sono stati inviati (o --dry-run)
 *   1 se almeno un invio è fallito
 */

import * as fs   from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config da .env
// ---------------------------------------------------------------------------

function loadEnv(envPath = ".env"): void {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const JIRA_URL   = process.env["JIRA_URL"]   ?? "";
const JIRA_EMAIL = process.env["JIRA_EMAIL"] ?? "";
const JIRA_TOKEN = process.env["JIRA_TOKEN"] ?? "";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

interface ScenarioBlock {
  featureFile: string;
  title:       string;
  tags:        string[];
  ticketKey:   string;
  rawText:     string;
}

// ---------------------------------------------------------------------------
// Parser .feature
// ---------------------------------------------------------------------------

/** Returns ALL scenarios; ticketKey is empty string when @ticket: is absent. */
function parseFeatureFile(filePath: string): ScenarioBlock[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines   = content.split("\n");
  const results: ScenarioBlock[] = [];

  let pendingTags: string[] = [];
  let title        = "";
  let rawLines:   string[] = [];
  let inScenario   = false;
  let idx          = 0;

  function flush(): void {
    if (!title) return;
    const ticketTag = pendingTags.find((t) => t.startsWith("@ticket:"));
    const ticketKey = ticketTag ? ticketTag.replace("@ticket:", "").trim() : "";
    results.push({
      featureFile: filePath,
      title,
      tags:      pendingTags,
      ticketKey,
      rawText:   rawLines.join("\n").trim(),
    });
    // Reset for next scenario
    pendingTags = [];
    title       = "";
    rawLines    = [];
    inScenario  = false;
    idx++;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^Scenario(\s+Outline)?:/i.test(trimmed)) {
      flush();
      title      = trimmed.replace(/^Scenario(\s+Outline)?:\s*/i, "");
      rawLines   = [line];
      inScenario = true;
    } else if (trimmed.startsWith("@") && !inScenario) {
      pendingTags.push(...trimmed.split(/\s+/).filter((t) => t.startsWith("@")));
    } else if (inScenario) {
      rawLines.push(line);
      if (/^(Feature|Background|Rule):/i.test(trimmed)) {
        flush();
      }
    }
  }

  flush();
  return results;
}

function collectFeatureFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".feature")) {
        results.push(full);
      }
    }
  }

  if (fs.existsSync(rootDir)) {
    const stat = fs.statSync(rootDir);
    if (stat.isFile()) {
      results.push(rootDir);
    } else {
      walk(rootDir);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Jira REST API v3 (Atlassian Document Format)
// ---------------------------------------------------------------------------

function buildAdfComment(scenario: ScenarioBlock): object {
  return {
    body: {
      version: 1,
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Gherkin scenario sincronizzato da Feature Editor BDD:" },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: "cucumber" },
          content: [{ type: "text", text: scenario.rawText }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `Tags: ${scenario.tags.join(" ") || "(nessuno)"} — File: ${path.basename(scenario.featureFile)}`,
              marks: [{ type: "em" }],
            },
          ],
        },
      ],
    },
  };
}

async function postComment(issueKey: string, body: object): Promise<void> {
  const url   = `${JIRA_URL.replace(/\/$/, "")}/rest/api/3/issue/${issueKey}/comment`;
  const creds = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:  `Basic ${creds}`,
      "Content-Type": "application/json",
      Accept:         "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args    = process.argv.slice(2);
  const dryRun  = args.includes("--dry-run");
  const targets = args.filter((a) => !a.startsWith("--"));
  const root    = targets.length > 0 ? targets[0]! : "src/features";

  if (!dryRun && (!JIRA_URL || !JIRA_EMAIL || !JIRA_TOKEN)) {
    console.error(
      "ERRORE: Definisci JIRA_URL, JIRA_EMAIL e JIRA_TOKEN nel file .env\n" +
        "        (vedi .env.example per il formato)\n" +
        "        Oppure usa --dry-run per testare senza inviare."
    );
    process.exit(1);
  }

  const featureFiles = collectFeatureFiles(root);
  if (featureFiles.length === 0) {
    console.warn(`Nessun file .feature trovato in "${root}".`);
    process.exit(0);
  }

  const scenarios: ScenarioBlock[] = [];
  for (const f of featureFiles) {
    scenarios.push(...parseFeatureFile(f));
  }

  const linked   = scenarios.filter((s) => s.ticketKey);
  const noTicket = scenarios.filter((s) => !s.ticketKey);

  console.log(`\nFile .feature trovati : ${featureFiles.length}`);
  console.log(`Scenari totali        : ${scenarios.length}`);
  console.log(`Con @ticket:KEY       : ${linked.length}`);
  console.log(`Senza @ticket:        : ${noTicket.length} (ignorati)\n`);

  if (linked.length === 0) {
    console.log("Nessuno scenario con @ticket: — niente da sincronizzare.");
    process.exit(0);
  }

  if (dryRun) {
    console.log("--- DRY RUN (nessuna chiamata API) ---\n");
    for (const s of linked) {
      const body = buildAdfComment(s);
      console.log(`▶ ${s.ticketKey} ← "${s.title}"`);
      console.log(`  File: ${path.relative(".", s.featureFile)}`);
      console.log(`  Tags: ${s.tags.join(" ")}`);
      console.log(`  Payload: ${JSON.stringify(body).slice(0, 120)}…\n`);
    }
    process.exit(0);
  }

  // Invio reale
  let errors = 0;
  for (const s of linked) {
    const label = `${s.ticketKey} ← "${s.title}"`;
    process.stdout.write(`  Invio ${label}… `);
    try {
      await postComment(s.ticketKey, buildAdfComment(s));
      console.log("✓");
    } catch (err) {
      console.log(`✗ ERRORE: ${(err as Error).message}`);
      errors++;
    }
  }

  console.log(`\nRisultato: ${linked.length - errors}/${linked.length} inviati con successo.`);
  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});
