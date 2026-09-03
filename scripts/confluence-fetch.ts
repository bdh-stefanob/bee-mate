/**
 * confluence-fetch.ts
 * -------------------
 * Legge pagine da Confluence e ne estrae il testo, marcando quelle che
 * contengono Gherkin (o simil-Gherkin). E' il primo stadio dell'Osservatorio:
 * misurare la baseline di entropia PRIMA di proporre qualunque regola.
 *
 * Read-only: non scrive mai su Confluence.
 *
 * A differenza di Jira, Confluence ha un albero vero — space → pagina → figlie —
 * quindi la "master folder" e' indirizzabile davvero: `ancestor = <pageId>`
 * restituisce l'intero sottoalbero. Il percorso di ogni pagina viene conservato
 * nell'output, cosi' l'entropia si puo' misurare per cartella/area, non solo in
 * aggregato.
 *
 * Prerequisiti — variabili in .env (mai commit in repo).
 * Su Cloud lo stesso API token vale per Jira e Confluence, quindi le variabili
 * JIRA_* funzionano da fallback:
 *   CONFLUENCE_URL    https://<tenant>.atlassian.net      (fallback: JIRA_URL)
 *   CONFLUENCE_EMAIL  nome@azienda.com                    (fallback: JIRA_EMAIL)
 *                     lasciare VUOTO su Server/DC → auth Bearer
 *   CONFLUENCE_TOKEN  API token o PAT                     (fallback: JIRA_TOKEN)
 *   CONFLUENCE_SPACE  chiave dello space, es. QA
 *   CONFLUENCE_ROOT   (opz.) id della pagina radice da cui scendere
 *   CONFLUENCE_CQL    (opz.) CQL esplicito, ha precedenza su SPACE/ROOT
 *
 * Flusso previsto — discover, poi probe, poi fetch:
 *
 *   npm run confluence:discover                 # quali space vedo?
 *   npm run confluence:discover -- --space QA   # com'e' fatto l'albero, e dove
 *                                               # sono le pagine con Gherkin?
 *   npm run confluence:probe -- --root 123456   # una pagina: cosa ci estraggo?
 *   npm run confluence:fetch -- --root 123456   # tutto il sottoalbero → JSON
 *
 * Flag:
 *   --discover       elenca gli space; con --space stampa l'albero delle pagine
 *   --probe          scarica 1 pagina e mostra testo estratto + punteggio
 *   --space KEY      tutte le pagine dello space
 *   --root PAGEID    la pagina e tutto il suo sottoalbero  (la "master folder")
 *   --cql "..."      CQL esplicito, per i casi che gli altri flag non coprono
 *   --limit N        numero massimo di pagine (default 2000)
 *   --out PATH       file di output (default reports/confluence-export/<ts>.json)
 *   --all-pages      tiene anche le pagine senza traccia di Gherkin
 *
 * ATTENZIONE: l'output contiene dati aziendali reali. Finisce sotto reports/,
 * che e' gitignorato. Non spostarlo altrove e non committarlo.
 */

import * as fs from "fs";
import * as path from "path";
import {
  loadEnv, authHeader, scoreGherkin, looksLikeTestCase,
  storageToText, preview, pct,
} from "./lib/atlassian";

loadEnv();

const BASE_URL = (process.env["CONFLUENCE_URL"] ?? process.env["JIRA_URL"] ?? "").replace(/\/+$/, "");
const EMAIL = process.env["CONFLUENCE_EMAIL"] ?? process.env["JIRA_EMAIL"] ?? "";
const TOKEN = process.env["CONFLUENCE_TOKEN"] ?? process.env["JIRA_TOKEN"] ?? "";
const ENV_SPACE = process.env["CONFLUENCE_SPACE"] ?? "";
const ENV_ROOT = process.env["CONFLUENCE_ROOT"] ?? "";
const ENV_CQL = process.env["CONFLUENCE_CQL"] ?? "";

// ---------------------------------------------------------------------------
// Trasporto
// ---------------------------------------------------------------------------

/** Radice API rilevata: Cloud sta sotto /wiki, Server/DC no. */
let apiRoot = "";

async function get(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Authorization: authHeader(EMAIL, TOKEN), Accept: "application/json" },
  });
}

async function getJson(url: string): Promise<Record<string, unknown>> {
  const res = await get(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}`),
      { status: res.status }
    );
  }
  return (await res.json()) as Record<string, unknown>;
}

/** Prova /wiki/rest/api (Cloud) e /rest/api (Server/DC), tiene il primo che risponde. */
async function detectApiRoot(): Promise<string> {
  const candidates = [`${BASE_URL}/wiki/rest/api`, `${BASE_URL}/rest/api`];
  const errors: string[] = [];

  for (const root of candidates) {
    try {
      await getJson(`${root}/space?limit=1`);
      return root;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        throw new Error(
          `Autenticazione rifiutata (${status}).\n` +
            `  - Cloud: CONFLUENCE_EMAIL = email dell'account, CONFLUENCE_TOKEN = API token\n` +
            `    da id.atlassian.com/manage-profile/security/api-tokens\n` +
            `  - Server/DC: lascia CONFLUENCE_EMAIL vuoto e usa un Personal Access Token`
        );
      }
      errors.push(`${root} → ${(err as Error).message}`);
    }
  }
  throw new Error(
    `Nessuna radice API Confluence ha risposto su ${BASE_URL}:\n  ${errors.join("\n  ")}\n\n` +
      `  Se l'URL corretto include gia' un percorso (es. https://host/confluence),\n` +
      `  mettilo per intero in CONFLUENCE_URL.`
  );
}

/** Il link "next" di Confluence e' relativo: va riattaccato al pezzo giusto. */
function resolveNext(next: string): string {
  if (/^https?:\/\//i.test(next)) return next;
  const siteRoot = apiRoot.replace(/\/rest\/api$/, "");
  const origin = apiRoot.replace(/\/(wiki\/)?rest\/api$/, "");
  return next.startsWith("/wiki") ? origin + next : siteRoot + next;
}

interface PagedResult {
  results: Array<Record<string, unknown>>;
  next?: string;
}

async function getPage(url: string): Promise<PagedResult> {
  const json = await getJson(url);
  const links = (json["_links"] ?? {}) as Record<string, unknown>;
  return {
    results: (json["results"] as Array<Record<string, unknown>>) ?? [],
    next: typeof links["next"] === "string" ? (links["next"] as string) : undefined,
  };
}

/** Segue _links.next finche' c'e', fermandosi a `limit`. */
async function getAll(firstUrl: string, limit: number, label: string): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  let url: string | undefined = firstUrl;

  while (url && out.length < limit) {
    const page: PagedResult = await getPage(url);
    out.push(...page.results);
    process.stdout.write(`\r  ${label}: ${out.length}…`);
    if (page.results.length === 0) break;
    url = page.next ? resolveNext(page.next) : undefined;
  }

  process.stdout.write("\r".padEnd(50) + "\r");
  return out.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Selezione del bersaglio
// ---------------------------------------------------------------------------

function buildCql(args: string[]): { cql: string; label: string } {
  const explicit = argValue(args, "--cql") ?? ENV_CQL;
  if (explicit) return { cql: explicit, label: "CQL esplicito" };

  const root = argValue(args, "--root") ?? ENV_ROOT;
  if (root) return { cql: `ancestor = ${root} and type = page`, label: `sottoalbero di ${root}` };

  const space = argValue(args, "--space") ?? ENV_SPACE;
  if (space) return { cql: `space = "${space}" and type = page`, label: `space ${space}` };

  throw new Error(
    "Nessun bersaglio. Indica dove guardare con uno di:\n" +
      '  --space QA            tutte le pagine dello space\n' +
      '  --root 123456         la pagina e tutto il suo sottoalbero\n' +
      '  --cql "..."           CQL esplicito\n' +
      "  oppure CONFLUENCE_SPACE / CONFLUENCE_ROOT / CONFLUENCE_CQL in .env\n\n" +
      "  Se non sai da dove partire:  npm run confluence:discover"
  );
}

function searchUrl(cql: string, expand: string, pageSize = 50): string {
  const exp = expand ? `&expand=${expand}` : "";
  return `${apiRoot}/content/search?cql=${encodeURIComponent(cql)}${exp}&limit=${pageSize}`;
}

// ---------------------------------------------------------------------------
// Estrazione
// ---------------------------------------------------------------------------

interface ExtractedPage {
  id: string;
  title: string;
  spaceKey: string;
  /** Percorso degli antenati, dalla radice alla pagina padre. */
  pathTitles: string[];
  /** Primo antenato: la "cartella" di primo livello. Serve a raggruppare. */
  branch: string;
  url: string;
  version: number;
  stepLines: number;
  structureLines: number;
  hasFullTriplet: boolean;
  textLength: number;
  text: string;
}

function str(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

function extractPage(raw: Record<string, unknown>): ExtractedPage {
  const id = str(raw, "id");
  const title = str(raw, "title");

  const space = (raw["space"] ?? {}) as Record<string, unknown>;
  const version = (raw["version"] ?? {}) as Record<string, unknown>;
  const ancestors = (raw["ancestors"] as Array<Record<string, unknown>>) ?? [];
  const pathTitles = ancestors.map((a) => str(a, "title")).filter(Boolean);

  const body = (raw["body"] ?? {}) as Record<string, unknown>;
  const storage = (body["storage"] ?? {}) as Record<string, unknown>;
  const text = storageToText(str(storage, "value"));

  const score = scoreGherkin(text);
  const links = (raw["_links"] ?? {}) as Record<string, unknown>;
  const webui = typeof links["webui"] === "string" ? (links["webui"] as string) : "";

  return {
    id,
    title,
    spaceKey: str(space, "key"),
    pathTitles,
    // La radice dello space e' spesso la home: la seconda voce e' la cartella vera.
    branch: pathTitles.length > 1 ? pathTitles[1]! : (pathTitles[0] ?? "(radice)"),
    url: webui ? apiRoot.replace(/\/rest\/api$/, "") + webui : "",
    version: typeof version["number"] === "number" ? (version["number"] as number) : 0,
    stepLines: score.stepLines,
    structureLines: score.structureLines,
    hasFullTriplet: score.hasFullTriplet,
    textLength: text.length,
    text,
  };
}

// ---------------------------------------------------------------------------
// Modo: discover
// ---------------------------------------------------------------------------

async function runDiscoverSpaces(): Promise<void> {
  console.log(`\nDISCOVER — space accessibili\n`);
  const spaces = await getAll(`${apiRoot}/space?limit=100`, 500, "space trovati");

  if (spaces.length === 0) {
    console.log("  Nessuno space visibile con queste credenziali.");
    return;
  }

  for (const s of spaces) {
    const key = str(s, "key");
    const name = str(s, "name");
    const type = str(s, "type");
    console.log(`  ${key.padEnd(12)} ${name}${type === "personal" ? "  (personale)" : ""}`);
  }

  console.log(
    `\n  ${spaces.length} space.\n\n` +
      `  Prossimo passo — guarda dentro quello che contiene i casi di test:\n` +
      `    npm run confluence:discover -- --space <KEY>`
  );
}

async function runDiscoverTree(space: string): Promise<void> {
  console.log(`\nDISCOVER — contenuti dello space ${space}\n`);

  // Un passo solo, senza body: veloce anche su space grandi. Niente filtro su
  // `type`, perche' la domanda a cui questo comando deve rispondere e' proprio
  // "di che tipo sono le cose qui dentro".
  const raw = await getAll(
    searchUrl(`space = "${space}"`, "ancestors", 100),
    5000,
    "contenuti"
  );

  if (raw.length === 0) {
    console.log(
      `  Nessun contenuto in "${space}".\n` +
        `  Chiave sbagliata o permessi mancanti. La chiave la leggi dall'URL:\n` +
        `  .../wiki/spaces/<CHIAVE>/...`
    );
    return;
  }

  // ── 1. Censimento dei tipi ────────────────────────────────────────────────
  // Confluence ha introdotto le Folder come tipo distinto dalle pagine. L'API v1
  // e' precedente, quindi non diamo per scontato ne' che compaiano ne' che
  // funzionino da antenato: lo guardiamo e basta.
  const byType = new Map<string, number>();
  for (const c of raw) {
    const t = str(c, "type") || "(sconosciuto)";
    byType.set(t, (byType.get(t) ?? 0) + 1);
  }

  console.log(`  ${raw.length} contenuti totali:\n`);
  for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(7)}  ${type}`);
  }

  // ── 2. Le cartelle, con id ────────────────────────────────────────────────
  const folders = raw.filter((c) => str(c, "type").toLowerCase().includes("folder"));
  if (folders.length > 0) {
    console.log(`\n  CARTELLE (usa l'id come --root):\n`);
    console.log(`  ${"ID".padEnd(14)} TITOLO`);
    for (const f of folders) {
      console.log(`  ${str(f, "id").padEnd(14)} ${str(f, "title")}`);
    }
  }

  // ── 3. Albero delle pagine, ricostruito dagli antenati ────────────────────
  const pages = raw.filter((c) => str(c, "type") === "page");
  const withAncestors = pages.filter(
    (p) => ((p["ancestors"] as Array<Record<string, unknown>>) ?? []).length > 0
  );

  if (pages.length > 0 && withAncestors.length === 0) {
    console.log(
      `\n  ATTENZIONE: nessuna delle ${pages.length} pagine espone antenati.\n` +
        `  Vuol dire che questa API non vede la gerarchia (probabile se l'albero\n` +
        `  e' fatto di Folder). Conseguenza pratica: --root potrebbe non filtrare.\n` +
        `  Ripiego che funziona comunque:  npm run confluence:fetch -- --space ${space}\n` +
        `  scarica tutto lo space; poi filtriamo i risultati a valle.`
    );
  } else if (pages.length > 0) {
    interface Branch { title: string; id: string; pages: number; }
    const branches = new Map<string, Branch>();

    for (const p of pages) {
      const ancestors = (p["ancestors"] as Array<Record<string, unknown>>) ?? [];
      // ancestors[0] e' spesso la home dello space: il ramo vero e' il secondo.
      const folder = ancestors[1] ?? ancestors[0];
      const key = folder ? str(folder, "id") : "(root)";
      const existing = branches.get(key);
      if (existing) existing.pages++;
      else branches.set(key, {
        title: folder ? str(folder, "title") : "(pagine di primo livello)",
        id: key,
        pages: 1,
      });
    }

    const sorted = [...branches.values()].sort((a, b) => b.pages - a.pages);
    console.log(`\n  RAMI (${sorted.length}), per numero di pagine:\n`);
    console.log(`  ${"PAGINE".padStart(7)}  ${"ID".padEnd(14)} RAMO`);
    for (const b of sorted) {
      console.log(`  ${String(b.pages).padStart(7)}  ${b.id.padEnd(14)} ${b.title}`);
    }
  }

  console.log(
    `\n  Prossimo passo — verifica che il testo si estragga bene da una pagina\n` +
      `  del ramo che contiene i casi di test:\n` +
      `    npm run confluence:probe -- --root <ID>\n` +
      `  Se --root non restituisce niente, ripiega sullo space intero:\n` +
      `    npm run confluence:probe -- --space ${space}`
  );
}

// ---------------------------------------------------------------------------
// Modo: probe
// ---------------------------------------------------------------------------

async function runProbe(cql: string, label: string): Promise<void> {
  console.log(`\nPROBE — 1 pagina\n  Bersaglio: ${label}\n  CQL: ${cql}\n`);

  const raw = await getAll(searchUrl(cql, "body.storage,ancestors,space,version", 1), 1, "pagine");
  if (raw.length === 0) {
    console.log(
      "  Nessuna pagina restituita.\n\n" +
        "  Se hai usato --root con l'id di una Folder, e' il caso piu' probabile:\n" +
        "  questa API potrebbe non riconoscere le Folder come antenati, quindi\n" +
        "  `ancestor = <id>` non trova nulla anche se l'id e' corretto.\n" +
        "  Ripiego che funziona comunque:\n" +
        "    npm run confluence:probe -- --space <CHIAVE>\n\n" +
        "  Altrimenti: id sbagliato, CQL sbagliato o permessi mancanti."
    );
    return;
  }

  const p = extractPage(raw[0]!);
  const verdict = looksLikeTestCase(p)
    ? `>>> CANDIDATO (${p.stepLines} passi, ${p.structureLines} keyword struttura${p.hasFullTriplet ? ", tripletta completa" : ""})`
    : `    nessuna traccia di Gherkin`;

  console.log(`  Titolo   : ${p.title}`);
  console.log(`  Id       : ${p.id}   (usalo come --root per prendere il sottoalbero)`);
  console.log(`  Percorso : ${[p.spaceKey, ...p.pathTitles].join(" / ") || "(radice)"}`);
  console.log(`  Versione : ${p.version}`);
  console.log(`  Testo    : ${p.textLength} caratteri`);
  console.log(`  ${verdict}\n`);
  console.log(preview(p.text, 30));

  console.log(
    `\n  Se il testo qui sopra assomiglia ai vostri casi di test, l'estrazione funziona.\n` +
      `  Se e' vuoto o illeggibile, incollami l'anteprima: vuol dire che il contenuto\n` +
      `  vive in una macro che va gestita a parte.`
  );
}

// ---------------------------------------------------------------------------
// Modo: fetch
// ---------------------------------------------------------------------------

async function runFetch(
  cql: string, label: string, limit: number, outPath: string, keepAll: boolean
): Promise<void> {
  console.log(`\nFETCH\n  Bersaglio: ${label}\n  CQL: ${cql}\n  Limite: ${limit}\n`);

  const raw = await getAll(searchUrl(cql, "body.storage,ancestors,space,version", 50), limit, "pagine");

  if (raw.length === 0) {
    console.log(
      "  Nessuna pagina restituita.\n\n" +
        "  Con --root sull'id di una Folder e' il caso piu' probabile: questa API\n" +
        "  potrebbe non riconoscere le Folder come antenati.\n" +
        "  Ripiego:  npm run confluence:fetch -- --space <CHIAVE>\n"
    );
    return;
  }

  const all = raw.map(extractPage).filter((p) => p.textLength >= 20);
  const pages = keepAll ? all : all.filter(looksLikeTestCase);

  const withTriplet = pages.filter((p) => p.hasFullTriplet).length;
  const totalStepLines = pages.reduce((sum, p) => sum + p.stepLines, 0);

  // Aggregato per ramo: e' quello che permette di dire "l'area X e' piu' entropica
  // dell'area Y" invece di una media unica che non aziona nessuno.
  const byBranch: Record<string, { pages: number; stepLines: number; withTriplet: number }> = {};
  for (const p of pages) {
    const b = (byBranch[p.branch] ??= { pages: 0, stepLines: 0, withTriplet: 0 });
    b.pages++;
    b.stepLines += p.stepLines;
    if (p.hasFullTriplet) b.withTriplet++;
  }

  const output = {
    fetchedAt: new Date().toISOString(),
    source: { baseUrl: BASE_URL, apiRoot, cql, target: label },
    summary: {
      pagesScanned: all.length,
      pagesWithGherkin: pages.length,
      pagesWithFullTriplet: withTriplet,
      estimatedStepLines: totalStepLines,
      byBranch,
    },
    pages,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`  Pagine con testo      : ${all.length}`);
  console.log(`  Con Gherkin plausibile: ${pages.length}  (${pct(pages.length, all.length)})`);
  console.log(`  Con Given+When+Then   : ${withTriplet}  (${pct(withTriplet, all.length)})`);
  console.log(`  Righe-passo stimate   : ${totalStepLines}\n`);

  const branchRows = Object.entries(byBranch).sort((a, b) => b[1].stepLines - a[1].stepLines);
  if (branchRows.length > 1) {
    console.log(`  ${"PASSI".padStart(6)} ${"PAGINE".padStart(7)}  RAMO`);
    for (const [name, b] of branchRows.slice(0, 15)) {
      console.log(`  ${String(b.stepLines).padStart(6)} ${String(b.pages).padStart(7)}  ${name}`);
    }
    console.log("");
  }

  console.log(`  Scritto in: ${outPath}`);
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

  if (!BASE_URL || !TOKEN) {
    console.error(
      "ERRORE: mancano CONFLUENCE_URL e/o CONFLUENCE_TOKEN nel file .env\n\n" +
        "  CONFLUENCE_URL=https://<tenant>.atlassian.net\n" +
        "  CONFLUENCE_EMAIL=nome@azienda.com     # vuoto su Server/DC\n" +
        "  CONFLUENCE_TOKEN=<api token o PAT>\n" +
        "  CONFLUENCE_SPACE=QA\n\n" +
        "  Su Cloud lo stesso token vale per Jira: se hai gia' JIRA_URL/EMAIL/TOKEN\n" +
        "  in .env, vengono usati in automatico come fallback.\n"
    );
    process.exit(1);
  }

  const discover = args.includes("--discover");

  // Il bersaglio si valida prima di toccare la rete: un "manca --space" e' un
  // errore piu' utile di un timeout, e non ha senso farselo nascondere dietro.
  const target = discover ? null : buildCql(args);

  apiRoot = await detectApiRoot();

  if (discover) {
    const space = argValue(args, "--space") ?? ENV_SPACE;
    if (space) await runDiscoverTree(space);
    else await runDiscoverSpaces();
    return;
  }
  if (!target) return;

  if (args.includes("--probe")) {
    await runProbe(target.cql, target.label);
    return;
  }

  const limit = Number(argValue(args, "--limit") ?? 2000);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = argValue(args, "--out") ?? path.join("reports", "confluence-export", `${stamp}.json`);

  await runFetch(target.cql, target.label, limit, outPath, args.includes("--all-pages"));
}

main().catch((err) => {
  console.error(`\nErrore: ${(err as Error).message}\n`);
  process.exit(1);
});
