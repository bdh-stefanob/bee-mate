/**
 * confluence-fetch.ts
 * -------------------
 * Legge pagine da Confluence e ne estrae il testo, marcando quelle che
 * contengono Gherkin (o simil-Gherkin). E' il primo stadio dell'Osservatorio:
 * misurare la baseline di entropia PRIMA di proporre qualunque regola.
 *
 * Read-only: non scrive mai su Confluence.
 *
 * Confluence ha un albero vero — space → cartella/pagina → figlie — quindi la
 * "master folder" e' indirizzabile davvero e il percorso di ogni pagina viene
 * conservato nell'output: l'entropia si misura per cartella/area, non solo in
 * aggregato.
 *
 * DUE STRADE PER LEGGERE L'ALBERO
 * -------------------------------
 * Questo script ne conosce due e sceglie da solo, dichiarando a schermo quale
 * ha usato:
 *
 *   v1 + CQL   `/rest/api/content/search?cql=ancestor = <id>`
 *              Funziona ovunque (Cloud e Server/DC) ma e' precedente alle
 *              **Folder**, il tipo di contenuto con cui Atlassian ha sostituito
 *              le pagine-contenitore su Cloud. Conseguenza: con l'id di una
 *              folder non trova nulla, e anche partendo da una pagina puo'
 *              perdere le pagine annidate dentro una folder.
 *
 *   v2 gerarchia  `/wiki/api/v2/{tipo}/{id}/descendants` + `/pages?id=…`
 *              Solo Cloud. Vede folder e pagine insieme, con `parentId` /
 *              `parentType`, quindi l'albero si ricostruisce per intero.
 *
 * Regola: si prova la v1; se non restituisce nulla, oppure se la v2 dimostra che
 * la v1 ha visto MENO pagine di quante ce ne sono, si passa alla v2 e lo si
 * scrive a schermo. Mai in silenzio: un export incompleto che sembra completo
 * falsa tutte le metriche a valle.
 *
 * Prerequisiti — variabili in .env (mai commit in repo).
 * Su Cloud lo stesso API token vale per Jira e Confluence, quindi le variabili
 * JIRA_* funzionano da fallback:
 *   CONFLUENCE_URL    https://<tenant>.atlassian.net      (fallback: JIRA_URL)
 *   CONFLUENCE_EMAIL  nome@azienda.com                    (fallback: JIRA_EMAIL)
 *                     lasciare VUOTO su Server/DC → auth Bearer
 *   CONFLUENCE_TOKEN  API token o PAT                     (fallback: JIRA_TOKEN)
 *   CONFLUENCE_SPACE  chiave dello space, es. QA
 *   CONFLUENCE_ROOT   (opz.) id della pagina o folder radice da cui scendere
 *   CONFLUENCE_CQL    (opz.) CQL esplicito, ha precedenza su SPACE/ROOT
 *
 * Flusso previsto — discover, poi probe, poi fetch:
 *
 *   npm run confluence:discover          # quali space vedo?
 *   npm run confluence:discover -- QA    # albero dello space, con gli id
 *   npm run confluence:probe    -- 123456   # una pagina: cosa ci estraggo?
 *   npm run confluence:fetch    -- 123456   # tutto il sottoalbero → JSON
 *
 * ARGOMENTO NUDO, non `--root 123456`: npm riconosce `space` e `root` come
 * proprie opzioni di configurazione e se le mangia anche dopo il `--`, sia
 * nella forma separata sia con l'uguale. Allo script non arriva nulla, e il
 * comando non fallisce: ignora il bersaglio. Cifre = id, non-cifre = chiave.
 *   Con npx     →  qualsiasi forma: npx ts-node scripts/confluence-fetch.ts --probe --root 123456
 *   Sempre      →  CONFLUENCE_ROOT / CONFLUENCE_SPACE in .env, zero argomenti.
 *
 * Flag:
 *   --discover       elenca gli space; con --space stampa l'albero reale
 *   --all-spaces     nel discover, mostra anche gli space personali (nascosti
 *                    per default: sono centinaia e sono la rubrica del personale)
 *   --probe          scarica 1 pagina e mostra testo estratto + punteggio
 *   --space KEY      tutte le pagine dello space
 *   --root ID        la pagina O LA FOLDER e tutto il suo sottoalbero
 *   --cql "..."      CQL esplicito, per i casi che gli altri flag non coprono
 *   --limit N        numero massimo di pagine (default 2000)
 *   --out PATH       file di output (default reports/confluence-export/<ts>.json)
 *   --all-pages      tiene anche le pagine senza traccia di Gherkin
 *   --no-v2          disattiva la strada v2 (per riprodurre il comportamento v1 puro)
 *
 * ATTENZIONE: l'output contiene dati aziendali reali. Finisce sotto reports/,
 * che e' gitignorato. Non spostarlo altrove e non committarlo.
 */

import * as fs from "fs";
import * as path from "path";
import {
  loadEnv, authHeader, scoreGherkin, looksLikeTestCase,
  storageToText, preview, pct, validateBaseUrl,
} from "./lib/atlassian";
import {
  detectV2, resolveNode, fetchDescendants, fetchSpacePages, fetchFolder,
  fetchPagesByIds, findSpaceByKey, fetchSpaceById, buildTree, pathTitlesOf,
  isContainerType, storageValueOf,
  type V2Api, type V2Node, type TreeIndex, type Json,
} from "./lib/confluence-v2";

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

  clearProgress();
  return out.slice(0, limit);
}

function progress(label: string): (n: number) => void {
  return (n: number) => process.stdout.write(`\r  ${label}: ${n}…`);
}

function clearProgress(): void {
  process.stdout.write("\r".padEnd(60) + "\r");
}

// ---------------------------------------------------------------------------
// API v2 — rilevata una volta sola, alla prima richiesta
// ---------------------------------------------------------------------------

/** `--no-v2` esiste per poter riprodurre il comportamento v1 puro in caso di dubbio. */
let v2Disabled = false;
let v2Api: V2Api | null = null;
let v2Reason = "";
let v2Probed = false;

async function ensureV2(): Promise<V2Api | null> {
  if (v2Disabled) {
    v2Reason = "disattivata da --no-v2";
    return null;
  }
  if (v2Probed) return v2Api;
  v2Probed = true;

  const probe = await detectV2(apiRoot, getJson);
  if (probe.available) {
    v2Api = probe.api;
    v2Reason = "";
  } else {
    v2Api = null;
    v2Reason = probe.reason;
  }
  return v2Api;
}

// ---------------------------------------------------------------------------
// Selezione del bersaglio
// ---------------------------------------------------------------------------

interface Target {
  cql: string;
  label: string;
  /** Valorizzato solo con --root: abilita la ricostruzione dell'albero via v2. */
  rootId?: string;
  /** Valorizzato solo con --space: abilita la verifica di completezza via v2. */
  spaceKey?: string;
}

function buildCql(args: string[]): Target {
  const explicit = argValue(args, "--cql") ?? ENV_CQL;
  if (explicit) return { cql: explicit, label: "CQL esplicito" };

  const bare = positional(args);

  const root = argValue(args, "--root") ?? bare.root ?? ENV_ROOT;
  if (root) {
    return { cql: `ancestor = ${root} and type = page`, label: `sottoalbero di ${root}`, rootId: root };
  }

  const space = argValue(args, "--space") ?? bare.space ?? ENV_SPACE;
  if (space) {
    return { cql: `space = "${space}" and type = page`, label: `space ${space}`, spaceKey: space };
  }

  throw new Error(
    "Nessun bersaglio. Indica dove guardare.\n\n" +
      "  Con npm run — usa l'argomento NUDO, senza nome di flag:\n" +
      "    npm run confluence:probe -- 1234567      (cifre = id di pagina o folder)\n" +
      "    npm run confluence:probe -- QA           (non-cifre = chiave di space)\n\n" +
      "  Con npx — qualsiasi forma:\n" +
      "    npx ts-node scripts/confluence-fetch.ts --probe --root 1234567\n" +
      "    npx ts-node scripts/confluence-fetch.ts --probe --space QA\n" +
      '    npx ts-node scripts/confluence-fetch.ts --probe --cql "..."\n\n' +
      "  Oppure, sempre valido: CONFLUENCE_ROOT / CONFLUENCE_SPACE / CONFLUENCE_CQL\n" +
      "  in .env, e poi il comando senza argomenti.\n\n" +
      "  PERCHE' l'argomento nudo: npm riconosce `space` e `root` come proprie\n" +
      "  opzioni di configurazione e se le mangia anche dopo il `--`, sia nella\n" +
      "  forma `--root 123` sia in `--root=123`. Allo script non arriva nulla.\n\n" +
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

/**
 * Adatta una pagina v2 alla forma che `extractPage` gia' sa leggere.
 *
 * Serve a tenere UNA sola implementazione dello scoring e dell'estrazione del
 * testo: se le due strade estraessero diversamente, le metriche di entropia non
 * sarebbero confrontabili fra un export e l'altro — che e' esattamente il tipo
 * di errore silenzioso che questo strumento deve evitare.
 */
function v2PageToV1Shape(page: Json, spaceKey: string, pathTitles: string[]): Record<string, unknown> {
  return {
    id: page["id"],
    title: page["title"],
    space: { key: spaceKey },
    version: page["version"],
    ancestors: pathTitles.map((t) => ({ title: t })),
    body: { storage: { value: storageValueOf(page) } },
    _links: page["_links"],
  };
}

// ---------------------------------------------------------------------------
// Ricostruzione del sottoalbero via v2
// ---------------------------------------------------------------------------

interface V2Subtree {
  root: V2Node;
  index: TreeIndex;
  /** Id delle sole pagine: sono le uniche che hanno un corpo da analizzare. */
  pageIds: string[];
  spaceKey: string;
  /** Conteggio per tipo, per dire a schermo com'e' fatto l'albero. */
  byType: Map<string, number>;
}

/**
 * Diagnosi leggibile invece di uno status HTTP nudo. Distinguere le cause e'
 * la differenza fra "cambio id" e "chiedo i permessi all'admin".
 */
function describeRootFailure(reason: "not-found" | "forbidden", detail: string, rootId: string): string {
  if (reason === "forbidden") {
    return (
      `  PERMESSI: l'id ${rootId} esiste ma non e' leggibile con queste credenziali.\n` +
      `    ${detail}\n` +
      `  Cause tipiche: permessi di spazio mancanti, oppure un API token con scope\n` +
      `  ristretti (servono read:page:confluence, read:folder:confluence,\n` +
      `  read:hierarchical-content:confluence).`
    );
  }
  return (
    `  ID INESISTENTE: nessun contenuto con id ${rootId}.\n` +
    `    ${detail}\n` +
    `  Cause tipiche: id copiato male, contenuto nel cestino, oppure id preso da\n` +
    `  un URL "tiny" (.../x/AbCd) che NON e' l'id numerico.\n` +
    `  L'id numerico si legge dall'URL .../pages/<ID>/... o da:\n` +
    `    npm run confluence:discover -- <CHIAVE>`
  );
}

async function buildV2Subtree(
  api: V2Api,
  rootId: string,
  cap: number
): Promise<{ ok: true; subtree: V2Subtree } | { ok: false; message: string }> {
  const lookup = await resolveNode(api, rootId);
  if (!lookup.found) {
    return { ok: false, message: describeRootFailure(lookup.reason, lookup.detail, rootId) };
  }

  const root = lookup.node;
  if (!isContainerType(root.type)) {
    return {
      ok: false,
      message:
        `  L'id ${rootId} e' di tipo "${root.type}", che non ha una gerarchia di figli.\n` +
        `  Usa l'id di una pagina o di una folder.`,
    };
  }

  const descendants = await fetchDescendants(api, root, cap, progress("albero (v2)"));
  clearProgress();

  const nodes: V2Node[] = [
    root,
    ...descendants.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      parentId: d.parentId,
      parentType: null,
      spaceId: root.spaceId,
    })),
  ];

  const byType = new Map<string, number>();
  for (const d of descendants) byType.set(d.type, (byType.get(d.type) ?? 0) + 1);

  const index = buildTree(nodes);
  const pageIds = descendants.filter((d) => d.type === "page").map((d) => d.id);
  // Una folder non ha corpo; una pagina usata come radice invece va analizzata.
  if (root.type === "page") pageIds.unshift(root.id);

  let spaceKey = "";
  if (root.spaceId) {
    const space = await fetchSpaceById(api, root.spaceId);
    spaceKey = space?.key ?? "";
  }

  return { ok: true, subtree: { root, index, pageIds, spaceKey, byType } };
}

/** Scarica i corpi e li riporta nella forma v1, con il percorso gia' calcolato. */
async function fetchV2Pages(api: V2Api, subtree: V2Subtree): Promise<Array<Record<string, unknown>>> {
  const raw = await fetchPagesByIds(api, subtree.pageIds, progress("pagine (v2)"));
  clearProgress();

  return raw.map((p) => {
    const id = typeof p["id"] === "string" ? (p["id"] as string) : "";
    const pathTitles = pathTitlesOf(subtree.index, id, subtree.root.id);
    return v2PageToV1Shape(p, subtree.spaceKey, pathTitles);
  });
}

// ---------------------------------------------------------------------------
// Modo: discover
// ---------------------------------------------------------------------------

/**
 * Elenca gli space, nascondendo per default quelli personali.
 *
 * In un'installazione aziendale ogni dipendente ha il suo spazio personale: su
 * centinaia di righe, quelle che servono sono qualche decina e finiscono sepolte.
 * Peggio, l'elenco completo e' di fatto la rubrica del personale — roba che non
 * ha motivo di passare per un terminale, tantomeno di finire incollata altrove.
 * Restano disponibili con --all-spaces.
 */
async function runDiscoverSpaces(showPersonal: boolean): Promise<void> {
  console.log(`\nDISCOVER — space accessibili\n`);
  const spaces = await getAll(`${apiRoot}/space?limit=100`, 2000, "space trovati");

  if (spaces.length === 0) {
    console.log("  Nessuno space visibile con queste credenziali.");
    return;
  }

  const isPersonal = (s: Record<string, unknown>): boolean =>
    str(s, "type") === "personal" || str(s, "key").startsWith("~");

  const shown = showPersonal ? spaces : spaces.filter((s) => !isPersonal(s));
  const hidden = spaces.length - shown.length;

  const rows = shown
    .map((s) => ({ key: str(s, "key"), name: str(s, "name"), personal: isPersonal(s) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const width = Math.min(14, Math.max(6, ...rows.map((r) => r.key.length)));
  for (const r of rows) {
    console.log(`  ${r.key.padEnd(width)}  ${r.name}${r.personal ? "  (personale)" : ""}`);
  }

  console.log(
    `\n  ${shown.length} space` +
      (hidden > 0 ? ` (piu' ${hidden} personali, nascosti — usa --all-spaces per vederli)` : "") +
      `.\n\n` +
      `  Prossimo passo — guarda dentro quello che contiene i casi di test:\n` +
      `    npm run confluence:discover -- <KEY>`
  );
}

/** Quante righe di albero stampare al massimo, e quanti figli per nodo. */
const TREE_MAX_LINES = 600;
const TREE_MAX_CHILDREN = 30;

/**
 * Stampa l'albero vero: folder e pagine insieme, con l'annidatura.
 *
 * Come viene costruito, e perche' cosi':
 *   - le PAGINE arrivano da `GET /pages?space-id=…`, che le da' tutte con
 *     `parentId` e `parentType` — quindi si sa gia' quali stanno dentro folder;
 *   - le FOLDER si risolvono risalendo: ogni `parentId` con `parentType=folder`
 *     viene chiesto a `GET /folders/{id}`, che restituisce a sua volta il proprio
 *     padre. Si ripete finche' la chiusura e' completa.
 *
 * Limite dichiarato: una folder VUOTA (o che contiene solo whiteboard/database)
 * non compare, perche' nessuna pagina la nomina come antenato. Non e' un bug:
 * e' il prezzo di non fare una visita completa dell'albero, che costerebbe una
 * chiamata per nodo. Per l'analisi di entropia le folder senza pagine non
 * servono comunque.
 */
async function renderSpaceTreeV2(api: V2Api, spaceKeyWanted: string): Promise<boolean> {
  const space = await findSpaceByKey(api, spaceKeyWanted);
  if (!space) {
    console.log(
      `\n  ALBERO REALE (v2): la v2 non trova nessuno space con chiave "${spaceKeyWanted}".\n` +
        `  La chiave e' sensibile alle maiuscole. Ricontrollala con:\n` +
        `    npm run confluence:discover`
    );
    return false;
  }

  const pages = await fetchSpacePages(api, space.id, 20000, progress("pagine (v2)"));
  clearProgress();

  const nodes = new Map<string, V2Node>();
  for (const p of pages) nodes.set(p.id, p);

  // Chiusura sui contenitori: risalgo finche' ogni padre citato e' noto.
  const MAX_CONTAINER_LOOKUPS = 500;
  let lookups = 0;
  let truncated = false;

  const pendingParents = (): string[] => {
    const wanted = new Set<string>();
    for (const n of nodes.values()) {
      if (n.parentId && !nodes.has(n.parentId)) wanted.add(n.parentId);
    }
    return [...wanted];
  };

  for (let round = 0; round < 20; round++) {
    const wanted = pendingParents();
    if (wanted.length === 0) break;

    let resolvedAny = false;
    for (const parentId of wanted) {
      if (lookups >= MAX_CONTAINER_LOOKUPS) { truncated = true; break; }
      lookups++;
      process.stdout.write(`\r  contenitori (v2): ${lookups}…`);
      const folder = await fetchFolder(api, parentId);
      // Se non e' una folder (o non e' visibile) resta un antenato ignoto: il
      // nodo diventa una radice dell'albero parziale, che e' il comportamento
      // corretto — meglio un ramo staccato che un ramo inventato.
      if (folder) { nodes.set(folder.id, folder); resolvedAny = true; }
      else nodes.set(parentId, {
        id: parentId, type: "(non leggibile)", title: `(id ${parentId})`,
        parentId: null, parentType: null, spaceId: space.id,
      });
    }
    if (truncated || !resolvedAny) break;
  }
  clearProgress();

  const index = buildTree([...nodes.values()]);
  const folders = [...nodes.values()].filter((n) => n.type === "folder");

  console.log(`\n  ALBERO REALE (API v2) — space ${space.key} · ${space.name}\n`);
  console.log(
    `  ${pages.length} pagine, ${folders.length} folder con contenuto` +
      `${truncated ? `  (fermato a ${MAX_CONTAINER_LOOKUPS} contenitori)` : ""}\n`
  );

  let lines = 0;
  const walk = (node: V2Node, prefix: string, isLast: boolean, depth: number): void => {
    if (lines >= TREE_MAX_LINES) return;
    lines++;

    const children = index.childrenOf.get(node.id) ?? [];
    const marker = depth === 0 ? "" : isLast ? "`- " : "|- ";
    const kind = node.type === "folder" ? "[folder]" : node.type === "page" ? "        " : `[${node.type}]`;
    const idCol = node.type === "folder" || depth <= 1 ? ` ${node.id}` : "";
    console.log(`  ${kind} ${prefix}${marker}${node.title}${idCol}`);

    const nextPrefix = depth === 0 ? "" : prefix + (isLast ? "   " : "|  ");
    const shown = children.slice(0, TREE_MAX_CHILDREN);
    shown.forEach((c, i) => walk(c, nextPrefix, i === shown.length - 1, depth + 1));
    if (children.length > shown.length && lines < TREE_MAX_LINES) {
      lines++;
      console.log(`  ${" ".repeat(8)} ${nextPrefix}   … e altre ${children.length - shown.length}`);
    }
  };

  index.roots.forEach((r, i) => walk(r, "", i === index.roots.length - 1, 0));
  if (lines >= TREE_MAX_LINES) {
    console.log(`\n  … output troncato a ${TREE_MAX_LINES} righe.`);
  }

  if (folders.length > 0) {
    console.log(`\n  FOLDER (l'id funziona come --root grazie alla strada v2):\n`);
    console.log(`  ${"PAGINE".padStart(7)}  ${"ID".padEnd(14)} FOLDER`);

    const countPages = (id: string): number => {
      let n = 0;
      const stack = [...(index.childrenOf.get(id) ?? [])];
      while (stack.length > 0) {
        const cur = stack.pop();
        if (!cur) break;
        if (cur.type === "page") n++;
        stack.push(...(index.childrenOf.get(cur.id) ?? []));
      }
      return n;
    };

    const rows = folders
      .map((f) => ({ f, n: countPages(f.id) }))
      .sort((a, b) => b.n - a.n);
    for (const { f, n } of rows) {
      console.log(`  ${String(n).padStart(7)}  ${f.id.padEnd(14)} ${f.title}`);
    }
  }

  console.log(
    `\n  Nota: le folder vuote non compaiono — l'albero e' ricostruito dai padri\n` +
      `  citati dalle pagine, quindi una folder senza pagine non viene nominata.`
  );
  return true;
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
      `  Nessun contenuto in "${space}" secondo la ricerca v1.\n` +
        `  Chiave sbagliata o permessi mancanti. La chiave la leggi dall'URL:\n` +
        `  .../wiki/spaces/<CHIAVE>/...`
    );
  } else {
    // ── 1. Censimento dei tipi ──────────────────────────────────────────────
    // Le Folder sono un tipo distinto dalle pagine e la v1 e' precedente: non
    // diamo per scontato ne' che compaiano ne' che funzionino da antenato.
    const byType = new Map<string, number>();
    for (const c of raw) {
      const t = str(c, "type") || "(sconosciuto)";
      byType.set(t, (byType.get(t) ?? 0) + 1);
    }

    console.log(`  ${raw.length} contenuti visti dalla ricerca v1:\n`);
    for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(7)}  ${type}`);
    }
  }

  // ── 2. L'albero vero, dalla v2 ────────────────────────────────────────────
  const api = await ensureV2();
  let treePrinted = false;
  if (api) {
    try {
      treePrinted = await renderSpaceTreeV2(api, space);
    } catch (err) {
      clearProgress();
      console.log(`\n  ALBERO REALE (v2) non ricostruibile: ${(err as Error).message}`);
    }
  } else {
    console.log(`\n  API v2 non disponibile: ${v2Reason}`);
  }

  // ── 3. Ripiego v1: rami di primo livello dagli antenati ───────────────────
  if (!treePrinted && raw.length > 0) {
    const pages = raw.filter((c) => str(c, "type") === "page");
    const withAncestors = pages.filter(
      (p) => ((p["ancestors"] as Array<Record<string, unknown>>) ?? []).length > 0
    );

    if (pages.length > 0 && withAncestors.length === 0) {
      console.log(
        `\n  ATTENZIONE: nessuna delle ${pages.length} pagine espone antenati nella v1.\n` +
          `  Vuol dire che questa API non vede la gerarchia (tipico se l'albero e'\n` +
          `  fatto di Folder). Conseguenza pratica: --root potrebbe non filtrare.\n` +
          `  Ripiego che funziona comunque:  npm run confluence:fetch -- ${space}\n` +
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
      console.log(`\n  RAMI visti dalla v1 (${sorted.length}), per numero di pagine:\n`);
      console.log(`  ${"PAGINE".padStart(7)}  ${"ID".padEnd(14)} RAMO`);
      for (const b of sorted) {
        console.log(`  ${String(b.pages).padStart(7)}  ${b.id.padEnd(14)} ${b.title}`);
      }
    }
  }

  console.log(
    `\n  Prossimo passo — verifica che il testo si estragga bene da una pagina\n` +
      `  del ramo che contiene i casi di test:\n` +
      `    npm run confluence:probe -- <ID>\n` +
      `  Se --root non restituisce niente, ripiega sullo space intero:\n` +
      `    npm run confluence:probe -- ${space}`
  );
}

// ---------------------------------------------------------------------------
// Modo: probe
// ---------------------------------------------------------------------------

function printProbe(p: ExtractedPage, route: string): void {
  const verdict = looksLikeTestCase(p)
    ? `>>> CANDIDATO (${p.stepLines} passi, ${p.structureLines} keyword struttura${p.hasFullTriplet ? ", tripletta completa" : ""})`
    : `    nessuna traccia di Gherkin`;

  console.log(`  Strada   : ${route}`);
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

async function runProbe(target: Target): Promise<void> {
  console.log(`\nPROBE — 1 pagina\n  Bersaglio: ${target.label}\n  CQL: ${target.cql}\n`);

  const raw = await getAll(searchUrl(target.cql, "body.storage,ancestors,space,version", 1), 1, "pagine");
  if (raw.length > 0) {
    printProbe(extractPage(raw[0]!), "v1 + CQL");
    return;
  }

  // ── Ripiego v2 ────────────────────────────────────────────────────────────
  if (!target.rootId) {
    console.log(
      "  Nessuna pagina restituita.\n\n" +
        "  La ricostruzione dell'albero via v2 si applica solo a --root.\n" +
        "  Con --cql o --space: CQL sbagliato, space sbagliato o permessi mancanti."
    );
    return;
  }

  const api = await ensureV2();
  if (!api) {
    console.log(
      `  Nessuna pagina restituita, e la strada v2 non e' percorribile: ${v2Reason}\n\n` +
        `  Se l'id e' quello di una Folder, la ricerca v1 non puo' trovarla:\n` +
        `  \`ancestor = <id>\` non e' supportato sui contenuti non-pagina.\n` +
        `  Ripiego:  npm run confluence:probe -- <CHIAVE>`
    );
    return;
  }

  console.log(
    "  La v1 non ha restituito nulla → provo a ricostruire l'albero con l'API v2\n" +
      "  (e' il caso tipico quando --root e' l'id di una Folder).\n"
  );

  const built = await buildV2Subtree(api, target.rootId, 500);
  if (!built.ok) {
    console.log(built.message);
    return;
  }

  const { subtree } = built;
  if (subtree.pageIds.length === 0) {
    const types = [...subtree.byType.entries()].map(([t, n]) => `${n} ${t}`).join(", ");
    console.log(
      `  L'albero sotto ${subtree.root.title} (${subtree.root.type}, id ${subtree.root.id})\n` +
        `  esiste ma non contiene pagine${types ? `: ${types}` : " ne' altri contenuti"}.\n` +
        `  Scendi su una folder piu' interna, oppure usa --space.`
    );
    return;
  }

  const pages = await fetchV2Pages(api, { ...subtree, pageIds: subtree.pageIds.slice(0, 1) });
  if (pages.length === 0) {
    console.log("  L'albero contiene pagine ma nessun corpo e' stato restituito (permessi?).");
    return;
  }

  console.log(
    `  Radice: ${subtree.root.title}  (tipo ${subtree.root.type})\n` +
      `  Pagine nel sottoalbero: ${subtree.pageIds.length}\n`
  );
  printProbe(extractPage(pages[0]!), "v2 gerarchia (fallback automatico)");
}

// ---------------------------------------------------------------------------
// Modo: fetch
// ---------------------------------------------------------------------------

/**
 * Verifica che l'export di uno space intero sia completo, e lo ripara se non lo e'.
 *
 * A differenza di --root qui NON si sostituisce la v1 con la v2: si fa l'unione.
 * Motivo: l'albero v2 parte dalla home dello space, quindi eventuali pagine
 * "orfane" fuori da quell'albero esistono per la v1 ma non per la v2. Sostituire
 * perderebbe proprio quelle. L'unione non perde niente da nessuna delle due parti,
 * e il costo e' qualche chiamata in piu' solo quando c'e' davvero una discrepanza.
 */
async function crossCheckSpace(
  spaceKey: string,
  v1Raw: Array<Record<string, unknown>>,
  limit: number
): Promise<{ raw: Array<Record<string, unknown>>; route: string }> {
  const v1 = { raw: v1Raw, route: "v1 + CQL" };

  const api = await ensureV2();
  if (!api) {
    console.log(`  Completezza non verificabile (${v2Reason}): se l'albero contiene
` +
      `  delle Folder, questo export potrebbe essere incompleto.
`);
    return v1;
  }

  const space = await findSpaceByKey(api, spaceKey);
  if (!space?.homepageId) {
    console.log(`  Completezza non verificabile: la v2 non espone la home dello space "${spaceKey}".
`);
    return v1;
  }

  const built = await buildV2Subtree(api, space.homepageId, limit);
  if (!built.ok) {
    console.log(`  Completezza non verificabile: la v2 non ha saputo ricostruire l'albero.
`);
    return v1;
  }

  const v2Count = built.subtree.pageIds.length;

  // Tagliata da --limit: il confronto direbbe una cosa falsa.
  if (v1Raw.length >= limit) return v1;
  // La v2 non vede piu' della v1: niente da riparare. Il caso inverso e' normale
  // (pagine fuori dall'albero della home) e non e' un problema.
  if (v2Count <= v1Raw.length) return v1;

  console.log(
    `  ATTENZIONE: la ricerca v1 ha visto ${v1Raw.length} pagine, la gerarchia v2
` +
      `  ne conta ${v2Count} sotto la home dello space. La CQL non attraversa le Folder:
` +
      `  l'export sarebbe stato incompleto senza fallire.
` +
      `  → unisco le due sorgenti.
`
  );

  const v2Raw = await fetchV2Pages(api, built.subtree);
  const seen = new Set(v2Raw.map((p) => str(p, "id")).filter(Boolean));
  const merged = [...v2Raw, ...v1Raw.filter((p) => !seen.has(str(p, "id")))];

  return { raw: merged, route: `v1 + v2 unite (${v2Raw.length} + ${merged.length - v2Raw.length})` };
}

/**
 * Decide quale delle due strade usare, e lo dice.
 *
 * Tre casi:
 *   - la v1 non ha trovato nulla       → v2, se disponibile (fallback dichiarato);
 *   - la v1 ha trovato meno della v2   → v2, con avviso: la v1 non attraversa le
 *                                        folder e stava per produrre un export
 *                                        incompleto che sembrava completo;
 *   - la v1 ha trovato tutto           → v1, nessun costo aggiuntivo.
 */
async function chooseFetchSource(
  target: Target,
  v1Raw: Array<Record<string, unknown>>,
  limit: number
): Promise<{ raw: Array<Record<string, unknown>>; route: string }> {
  const v1 = { raw: v1Raw, route: "v1 + CQL" };

  // --space non ha una radice da ricostruire, ma ha lo stesso identico rischio:
  // se la CQL non attraversa le folder, restituisce meno pagine senza fallire.
  // Era l'unica strada rimasta senza verifica, ed e' quella suggerita ovunque
  // come ripiego sicuro — cioe' il posto peggiore dove lasciare un buco.
  if (!target.rootId) {
    if (!target.spaceKey) return v1;   // --cql esplicito: non sappiamo cosa confrontare
    return await crossCheckSpace(target.spaceKey, v1Raw, limit);
  }

  const api = await ensureV2();
  if (!api) {
    if (v1Raw.length === 0) {
      console.log(
        `  La v1 non ha restituito nulla e la strada v2 non e' percorribile: ${v2Reason}\n` +
          `  Se --root e' l'id di una Folder, la v1 non puo' trovarla.\n` +
          `  Ripiego:  npm run confluence:fetch -- <CHIAVE>\n`
      );
    }
    return v1;
  }

  const built = await buildV2Subtree(api, target.rootId, limit);
  if (!built.ok) {
    if (v1Raw.length === 0) console.log(built.message + "\n");
    return v1;
  }

  const { subtree } = built;
  const v2Count = subtree.pageIds.length;

  // La v1 e' stata tagliata da --limit: il confronto non direbbe niente di vero.
  const v1Capped = v1Raw.length >= limit;

  if (v1Raw.length === 0) {
    console.log(
      `  La v1 non ha restituito nulla → uso l'API v2 per ricostruire l'albero.\n` +
        `  Radice: "${subtree.root.title}" (tipo ${subtree.root.type}) — ${v2Count} pagine nel sottoalbero.\n`
    );
  } else if (!v1Capped && v2Count > v1Raw.length) {
    console.log(
      `  ATTENZIONE: la ricerca v1 ha visto ${v1Raw.length} pagine, la gerarchia v2 ne conta ${v2Count}.\n` +
        `  La CQL non attraversa le Folder: l'export v1 sarebbe stato incompleto.\n` +
        `  → passo alla strada v2.\n`
    );
  } else {
    return v1;
  }

  const raw = await fetchV2Pages(api, subtree);
  return { raw, route: "v2 gerarchia" };
}

async function runFetch(
  target: Target, limit: number, outPath: string, keepAll: boolean
): Promise<void> {
  console.log(`\nFETCH\n  Bersaglio: ${target.label}\n  CQL: ${target.cql}\n  Limite: ${limit}\n`);

  const v1Raw = await getAll(searchUrl(target.cql, "body.storage,ancestors,space,version", 50), limit, "pagine");
  const { raw, route } = await chooseFetchSource(target, v1Raw, limit);

  if (raw.length === 0) {
    console.log(
      "  Nessuna pagina restituita da nessuna delle due strade.\n\n" +
        "  Cause tipiche: id o CQL sbagliati, contenuto nel cestino, permessi mancanti.\n" +
        "  Ripiego che funziona comunque:  npm run confluence:fetch -- <CHIAVE>\n"
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
    source: { baseUrl: BASE_URL, apiRoot, cql: target.cql, target: target.label, route },
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

  console.log(`  Strada usata          : ${route}`);
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

/**
 * Legge il valore di un flag, accettando sia `--x v` sia `--x=v`.
 *
 * La forma con l'uguale non e' un vezzo: lanciando via `npm run ... -- --space QA`,
 * npm intercetta `--space` come propria opzione di configurazione e allo script
 * arriva solo `QA`. Il sintomo e' subdolo — il comando "funziona" ma ignora il
 * bersaglio — quindi accettiamo anche `--space=QA`, che npm lascia passare intatto.
 */
function argValue(args: string[], flag: string): string | undefined {
  const withEquals = args.find((a) => a.startsWith(flag + "="));
  if (withEquals) return withEquals.slice(flag.length + 1);

  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

/**
 * Argomento libero, senza flag: `... --discover SEDT` o `... --probe 123456`.
 * Ultima rete di sicurezza per quando npm ha divorato il nome del flag.
 * Tutto cifre → id di pagina/folder; altrimenti → chiave di space.
 */
function positional(args: string[]): { space?: string; root?: string } {
  const KNOWN_FLAGS = ["--space", "--root", "--cql", "--limit", "--out"];
  const bare: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("-")) {
      // Salta anche il valore, se il flag lo prende nella forma separata.
      if (KNOWN_FLAGS.includes(a)) i++;
      continue;
    }
    bare.push(a);
  }

  const first = bare[0];
  if (!first) return {};
  return /^\d+$/.test(first) ? { root: first } : { space: first };
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

  v2Disabled = args.includes("--no-v2");
  // Prima di qualunque chiamata: un URL incollato male resta sintatticamente
  // valido e fallisce come se fosse un problema di rete. Meglio dirlo subito.
  validateBaseUrl(BASE_URL, process.env["CONFLUENCE_URL"] ? "CONFLUENCE_URL" : "JIRA_URL");

  const discover = args.includes("--discover");

  // Il bersaglio si valida prima di toccare la rete: un "manca --space" e' un
  // errore piu' utile di un timeout, e non ha senso farselo nascondere dietro.
  const target = discover ? null : buildCql(args);

  apiRoot = await detectApiRoot();

  if (discover) {
    const space = argValue(args, "--space") ?? positional(args).space ?? ENV_SPACE;
    if (space) await runDiscoverTree(space);
    else await runDiscoverSpaces(args.includes("--all-spaces"));
    return;
  }
  if (!target) return;

  if (args.includes("--probe")) {
    await runProbe(target);
    return;
  }

  const limit = Number(argValue(args, "--limit") ?? 2000);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = argValue(args, "--out") ?? path.join("reports", "confluence-export", `${stamp}.json`);

  await runFetch(target, limit, outPath, args.includes("--all-pages"));
}

main().catch((err) => {
  clearProgress();
  console.error(`\nErrore: ${(err as Error).message}\n`);
  process.exit(1);
});
