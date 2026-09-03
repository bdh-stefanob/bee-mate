/**
 * jira-fetch.ts
 * -------------
 * Legge issue da Jira via REST e ne estrae il testo dei campi, marcando quelli
 * che sembrano contenere Gherkin (o simil-Gherkin). E' il primo stadio
 * dell'Osservatorio: serve a misurare la baseline di entropia PRIMA di
 * proporre qualunque regola.
 *
 * Read-only: non scrive mai su Jira. La scrittura vive in `jira-sync.ts`.
 *
 * Prerequisiti — variabili in .env (mai commit in repo):
 *   JIRA_URL     https://<tenant>.atlassian.net       (o base URL Server/DC)
 *   JIRA_EMAIL   nome@azienda.com                     (vuoto su Server/DC → auth Bearer)
 *   JIRA_TOKEN   API token (Cloud) o Personal Access Token (Server/DC)
 *   JIRA_JQL     JQL di default, es. project = ABC AND issuetype = Test
 *   JIRA_FIELDS  (opz.) lista campi separati da virgola; default = tutti
 *
 * Uso:
 *   npm run jira:probe                        # verifica credenziali + mappa i campi
 *   npm run jira:fetch                        # scarica usando JIRA_JQL
 *   npx ts-node scripts/jira-fetch.ts --jql "project = ABC" --limit 50
 *   npx ts-node scripts/jira-fetch.ts --out reports/jira-export/baseline.json
 *
 * Flag:
 *   --probe          scarica 1 sola issue e stampa TUTTI i campi non vuoti,
 *                    con anteprima e punteggio Gherkin. Usalo per scoprire in
 *                    quale campo vivono i test case (description? custom field
 *                    Xray? altro?) senza sapere nulla in anticipo.
 *   --jql "..."      sovrascrive JIRA_JQL
 *   --limit N        numero massimo di issue (default 1000)
 *   --out PATH       file di output (default reports/jira-export/<timestamp>.json)
 *   --all-fields     tiene anche i campi senza traccia di Gherkin
 *
 * Exit code: 0 ok, 1 errore di configurazione o di rete.
 *
 * ATTENZIONE: l'output contiene dati aziendali reali. Finisce sotto reports/,
 * che e' gitignorato. Non spostarlo altrove e non committarlo.
 */

import * as fs from "fs";
import * as path from "path";
import {
  loadEnv, authHeader, scoreGherkin, looksLikeTestCase,
  adfToText, preview, pct,
} from "./lib/atlassian";

loadEnv();

const JIRA_URL = (process.env["JIRA_URL"] ?? "").replace(/\/$/, "");
const JIRA_EMAIL = process.env["JIRA_EMAIL"] ?? "";
const JIRA_TOKEN = process.env["JIRA_TOKEN"] ?? "";
const JIRA_JQL = process.env["JIRA_JQL"] ?? "";
const JIRA_FIELDS = process.env["JIRA_FIELDS"] ?? "";

const auth = (): string => authHeader(JIRA_EMAIL, JIRA_TOKEN);

/**
 * Riduce un valore di campo Jira a testo, qualunque forma abbia:
 * stringa, ADF, array di option, oggetto con .value/.name.
 * Restituisce "" per i campi che non contengono testo utile.
 */
function fieldToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return "";

  if (Array.isArray(value)) {
    // Array di stringhe (labels) o di option: utile solo se e' testo lungo.
    const parts = value.map(fieldToText).filter(Boolean);
    return parts.join("\n");
  }

  const obj = value as Record<string, unknown>;
  // ADF: { type: "doc", version: 1, content: [...] }
  if (obj["type"] === "doc" && obj["content"]) return adfToText(obj).trim();
  // Xray / campi custom espongono spesso .value o .raw
  for (const key of ["value", "raw", "text", "body"]) {
    const v = obj[key];
    if (typeof v === "string") return v;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Jira REST — tre dialetti, provati in ordine
// ---------------------------------------------------------------------------

type SearchMode = "cloud-jql" | "cloud-legacy" | "server-legacy";

const SEARCH_ENDPOINTS: Record<SearchMode, string> = {
  "cloud-jql": "/rest/api/3/search/jql",
  "cloud-legacy": "/rest/api/3/search",
  "server-legacy": "/rest/api/2/search",
};

interface JiraIssue {
  key: string;
  fields: Record<string, unknown>;
}

interface SearchPage {
  issues: JiraIssue[];
  /** Cursore per cloud-jql. */
  nextPageToken?: string;
  /** Totale per gli endpoint legacy (assente su cloud-jql). */
  total?: number;
}

async function post(url: string, body: object): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function searchPage(
  mode: SearchMode,
  jql: string,
  fields: string[],
  pageSize: number,
  cursor: { token?: string; startAt: number }
): Promise<SearchPage> {
  const url = JIRA_URL + SEARCH_ENDPOINTS[mode];

  const body: Record<string, unknown> =
    mode === "cloud-jql"
      ? { jql, maxResults: pageSize, fields, ...(cursor.token ? { nextPageToken: cursor.token } : {}) }
      : { jql, maxResults: pageSize, fields, startAt: cursor.startAt };

  const res = await post(url, body);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 300)}` : ""}`),
      { status: res.status }
    );
  }

  const json = (await res.json()) as Record<string, unknown>;
  return {
    issues: (json["issues"] as JiraIssue[]) ?? [],
    nextPageToken: json["nextPageToken"] as string | undefined,
    total: json["total"] as number | undefined,
  };
}

/** Prova i tre dialetti finche' uno risponde, e restituisce quello che funziona. */
async function detectMode(jql: string, fields: string[]): Promise<SearchMode> {
  const errors: string[] = [];
  for (const mode of ["cloud-jql", "cloud-legacy", "server-legacy"] as SearchMode[]) {
    try {
      await searchPage(mode, jql, fields, 1, { startAt: 0 });
      return mode;
    } catch (err) {
      const status = (err as { status?: number }).status;
      errors.push(`${mode}: ${(err as Error).message}`);
      // 401/403 = credenziali sbagliate: inutile provare gli altri dialetti.
      if (status === 401 || status === 403) {
        throw new Error(
          `Autenticazione rifiutata (${status}).\n` +
            `  - Cloud: JIRA_EMAIL deve essere l'email dell'account e JIRA_TOKEN un API token\n` +
            `    da id.atlassian.com/manage-profile/security/api-tokens\n` +
            `  - Server/DC: lascia JIRA_EMAIL vuoto e metti un Personal Access Token in JIRA_TOKEN`
        );
      }
      // 400 = JQL non valido: idem, il dialetto non c'entra.
      if (status === 400) {
        throw new Error(`JQL rifiutato da Jira:\n  ${(err as Error).message}`);
      }
    }
  }
  throw new Error(`Nessun endpoint di ricerca Jira ha risposto:\n  ${errors.join("\n  ")}`);
}

async function searchAll(jql: string, fields: string[], limit: number): Promise<{ mode: SearchMode; issues: JiraIssue[] }> {
  const mode = await detectMode(jql, fields);
  const issues: JiraIssue[] = [];
  const cursor: { token?: string; startAt: number } = { startAt: 0 };

  while (issues.length < limit) {
    const pageSize = Math.min(100, limit - issues.length);
    const page = await searchPage(mode, jql, fields, pageSize, cursor);
    issues.push(...page.issues);

    process.stdout.write(`\r  scaricate ${issues.length} issue…`);

    if (page.issues.length === 0) break;
    if (mode === "cloud-jql") {
      if (!page.nextPageToken) break;
      cursor.token = page.nextPageToken;
    } else {
      cursor.startAt += page.issues.length;
      if (page.total !== undefined && cursor.startAt >= page.total) break;
    }
  }
  process.stdout.write("\r".padEnd(40) + "\r");
  return { mode, issues };
}

// ---------------------------------------------------------------------------
// Mappa id campo → nome leggibile (per il probe)
// ---------------------------------------------------------------------------

async function fetchFieldNames(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const apiVersion of ["3", "2"]) {
    try {
      const res = await fetch(`${JIRA_URL}/rest/api/${apiVersion}/field`, {
        headers: { Authorization: auth(), Accept: "application/json" },
      });
      if (!res.ok) continue;
      const fields = (await res.json()) as Array<{ id?: string; name?: string }>;
      for (const f of fields) if (f.id && f.name) map[f.id] = f.name;
      return map;
    } catch {
      // silenzioso: i nomi leggibili sono un lusso, non un requisito
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Estrazione
// ---------------------------------------------------------------------------

interface FieldCandidate {
  field: string;
  fieldName: string;
  stepLines: number;
  structureLines: number;
  hasFullTriplet: boolean;
  text: string;
}

interface ExtractedIssue {
  key: string;
  summary: string;
  issueType: string;
  status: string;
  project: string;
  candidates: FieldCandidate[];
}

/** Campi che non contengono mai test case ma sono lunghi: rumore puro. */
const SKIP_FIELDS = new Set(["comment", "worklog", "attachment", "issuelinks", "subtasks", "changelog"]);

function extractIssue(
  issue: JiraIssue,
  fieldNames: Record<string, string>,
  keepAll: boolean
): ExtractedIssue {
  const f = issue.fields ?? {};
  const nested = (key: string, prop: string): string => {
    const v = f[key];
    if (v && typeof v === "object") {
      const p = (v as Record<string, unknown>)[prop];
      if (typeof p === "string") return p;
    }
    return "";
  };

  const candidates: FieldCandidate[] = [];
  for (const [fieldId, value] of Object.entries(f)) {
    if (SKIP_FIELDS.has(fieldId)) continue;
    const text = fieldToText(value).trim();
    if (text.length < 20) continue;

    const score = scoreGherkin(text);
    if (!keepAll && !looksLikeTestCase(score)) continue;

    candidates.push({
      field: fieldId,
      fieldName: fieldNames[fieldId] ?? fieldId,
      stepLines: score.stepLines,
      structureLines: score.structureLines,
      hasFullTriplet: score.hasFullTriplet,
      text,
    });
  }

  // Il campo con piu' passi per primo: e' quasi sempre quello giusto.
  candidates.sort((a, b) => b.stepLines - a.stepLines);

  return {
    key: issue.key,
    summary: typeof f["summary"] === "string" ? (f["summary"] as string) : "",
    issueType: nested("issuetype", "name"),
    status: nested("status", "name"),
    project: nested("project", "key"),
    candidates,
  };
}

// ---------------------------------------------------------------------------
// Modi
// ---------------------------------------------------------------------------

async function runProbe(jql: string): Promise<void> {
  console.log(`\nPROBE — 1 issue, tutti i campi\n  JQL: ${jql}\n`);

  const fieldNames = await fetchFieldNames();
  const { mode, issues } = await searchAll(jql, ["*all"], 1);

  console.log(`  Dialetto REST rilevato : ${mode}`);
  console.log(`  Nomi campo risolti     : ${Object.keys(fieldNames).length || "(non disponibili)"}\n`);

  if (issues.length === 0) {
    console.log("Nessuna issue restituita. Controlla il JQL o i permessi del progetto.");
    return;
  }

  const issue = issues[0]!;
  const extracted = extractIssue(issue, fieldNames, /* keepAll */ true);

  console.log(`  Issue    : ${extracted.key}`);
  console.log(`  Tipo     : ${extracted.issueType || "(n/d)"}`);
  console.log(`  Stato    : ${extracted.status || "(n/d)"}`);
  console.log(`  Summary  : ${extracted.summary}\n`);
  console.log(`  Campi testuali non vuoti: ${extracted.candidates.length}\n`);

  for (const c of extracted.candidates) {
    const verdict = looksLikeTestCase(c)
      ? `>>> CANDIDATO  (${c.stepLines} passi, ${c.structureLines} keyword struttura${c.hasFullTriplet ? ", tripletta completa" : ""})`
      : "    (nessuna traccia di Gherkin)";
    console.log(`  ${c.field}  —  ${c.fieldName}`);
    console.log(`  ${verdict}`);
    console.log(preview(c.text));
    console.log("");
  }

  const best = extracted.candidates.find(looksLikeTestCase);
  console.log(
    best
      ? `Prossimo passo: metti JIRA_FIELDS=${best.field} in .env per scaricare solo quel campo,\n` +
          `oppure lascialo vuoto e usa \`npm run jira:fetch\` che li scandaglia tutti.`
      : `Nessun campo contiene qualcosa di riconoscibile come Gherkin su questa issue.\n` +
          `Prova un JQL diverso, o guarda l'anteprima qui sopra per capire dove vivono davvero i test case.`
  );
}

async function runFetch(jql: string, limit: number, outPath: string, keepAll: boolean): Promise<void> {
  const fields = JIRA_FIELDS ? JIRA_FIELDS.split(",").map((s) => s.trim()).filter(Boolean) : ["*all"];

  console.log(`\nFETCH\n  JQL    : ${jql}\n  Campi  : ${fields.join(", ")}\n  Limite : ${limit}\n`);

  const fieldNames = await fetchFieldNames();
  const { mode, issues } = await searchAll(jql, fields, limit);
  const extracted = issues.map((i) => extractIssue(i, fieldNames, keepAll));

  const withCandidates = extracted.filter((e) => e.candidates.some(looksLikeTestCase));
  const withTriplet = extracted.filter((e) => e.candidates.some((c) => c.hasFullTriplet));
  const totalStepLines = extracted.reduce(
    (sum, e) => sum + (e.candidates[0]?.stepLines ?? 0),
    0
  );

  const output = {
    fetchedAt: new Date().toISOString(),
    source: { baseUrl: JIRA_URL, jql, mode, fields },
    summary: {
      issues: extracted.length,
      withGherkinCandidate: withCandidates.length,
      withFullTriplet: withTriplet.length,
      estimatedStepLines: totalStepLines,
    },
    issues: extracted,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`  Dialetto REST         : ${mode}`);
  console.log(`  Issue scaricate       : ${extracted.length}`);
  console.log(`  Con Gherkin plausibile: ${withCandidates.length}  (${pct(withCandidates.length, extracted.length)})`);
  console.log(`  Con Given+When+Then   : ${withTriplet.length}  (${pct(withTriplet.length, extracted.length)})`);
  console.log(`  Righe-passo stimate   : ${totalStepLines}`);
  console.log(`\n  Scritto in: ${outPath}`);
  console.log(`  ATTENZIONE: contiene dati aziendali reali. reports/ e' gitignorato — non spostarlo.\n`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (!JIRA_URL || !JIRA_TOKEN) {
    console.error(
      "ERRORE: mancano JIRA_URL e/o JIRA_TOKEN nel file .env\n\n" +
        "  JIRA_URL=https://<tenant>.atlassian.net\n" +
        "  JIRA_EMAIL=nome@azienda.com        # vuoto su Jira Server/DC\n" +
        "  JIRA_TOKEN=<api token o PAT>\n" +
        "  JIRA_JQL=project = ABC AND issuetype = Test\n"
    );
    process.exit(1);
  }

  const jql = argValue(args, "--jql") ?? JIRA_JQL;
  if (!jql) {
    console.error(
      'ERRORE: nessun JQL. Definisci JIRA_JQL in .env oppure passa --jql "project = ABC".'
    );
    process.exit(1);
  }

  if (args.includes("--probe")) {
    await runProbe(jql);
    return;
  }

  const limit = Number(argValue(args, "--limit") ?? 1000);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = argValue(args, "--out") ?? path.join("reports", "jira-export", `${stamp}.json`);

  await runFetch(jql, limit, outPath, args.includes("--all-fields"));
}

main().catch((err) => {
  console.error(`\nErrore: ${(err as Error).message}\n`);
  process.exit(1);
});
