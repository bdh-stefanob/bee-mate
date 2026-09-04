/**
 * lib/confluence-v2.ts
 * --------------------
 * Accesso alla REST API v2 di Confluence Cloud (`/wiki/api/v2`).
 *
 * PERCHE' ESISTE QUESTO FILE
 * --------------------------
 * L'albero di Confluence Cloud non e' piu' fatto solo di pagine: Atlassian ha
 * introdotto le **Folder** come tipo di contenuto gerarchico distinto (accanto a
 * whiteboard, database, embed). La v1 (`/rest/api/content/search` + CQL) e'
 * precedente a quel cambiamento e ne soffre in due modi:
 *
 *   1. `ancestor = <id>` non e' supportato sui contenuti non-pagina, quindi
 *      `--root <id-di-folder>` restituisce zero risultati anche con l'id giusto;
 *   2. una ricerca CQL non attraversa le folder, quindi le pagine annidate
 *      dentro una folder possono mancare anche partendo da un id di pagina.
 *
 * Il secondo caso e' il piu' insidioso: non fallisce, restituisce meno roba.
 * Per questo il chiamante non usa la v2 solo come ripiego quando la v1 torna
 * vuota, ma anche come controprova quando la v1 torna qualcosa.
 *
 * La v2 esiste SOLO su Cloud. Su Server/Data Center non c'e' (e nemmeno le
 * folder): `detectV2` se ne accorge dalla forma della radice v1 e non prova
 * nemmeno, cosi' il percorso Server/DC resta identico a prima.
 *
 * Riferimenti verificati sulla OpenAPI ufficiale: vedi scripts/CONFLUENCE-API-NOTES.md.
 */

export type Json = Record<string, unknown>;

/** Trasporto iniettato dal chiamante: l'autenticazione resta in un posto solo. */
export type Fetcher = (url: string) => Promise<Json>;

export interface V2Api {
  /** Radice v2, es. https://tenant.atlassian.net/wiki/api/v2 */
  root: string;
  /** Origine del sito senza /wiki: serve a risolvere i link relativi di `_links.next`. */
  origin: string;
  get: Fetcher;
}

/** Un nodo dell'albero, qualunque sia il suo tipo. */
export interface V2Node {
  id: string;
  /** page | folder | whiteboard | database | embed */
  type: string;
  title: string;
  parentId: string | null;
  /** Valorizzato solo dove l'API lo espone (pagine e folder singole). */
  parentType: string | null;
  spaceId: string | null;
}

// ---------------------------------------------------------------------------
// Costanti prese dalla OpenAPI ufficiale, non stimate
// ---------------------------------------------------------------------------

/** `limit` massimo accettato dagli endpoint v2 paginati. */
const MAX_LIMIT = 250;

/** `depth` massimo di /{tipo}/{id}/descendants. Oltre, si ricorre a mano. */
const MAX_DEPTH = 10;

/** `id` di GET /pages accetta fino a 250 valori; stiamo larghi sulla lunghezza URL. */
const ID_CHUNK = 100;

/** Tipi che possono avere figli nell'albero, con il segmento di path v2. */
const HIERARCHY_SEGMENT: Record<string, string> = {
  page: "pages",
  folder: "folders",
  whiteboard: "whiteboards",
  database: "databases",
  embed: "embeds",
};

export function isContainerType(type: string): boolean {
  return type in HIERARCHY_SEGMENT;
}

function segmentFor(type: string): string | undefined {
  return HIERARCHY_SEGMENT[type];
}

function str(obj: Json, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

function strOrNull(obj: Json, key: string): string | null {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function statusOf(err: unknown): number | undefined {
  return (err as { status?: number } | null | undefined)?.status;
}

// ---------------------------------------------------------------------------
// Rilevamento
// ---------------------------------------------------------------------------

export type V2Probe =
  | { available: true; api: V2Api }
  | { available: false; reason: string };

/**
 * Stabilisce se la v2 e' raggiungibile, partendo dalla radice v1 gia' rilevata.
 *
 * Non e' un semplice try/catch: la ragione del fallimento va conservata, perche'
 * "Server/DC" e "il token non ha lo scope giusto" portano a consigli opposti.
 */
export async function detectV2(apiRootV1: string, get: Fetcher): Promise<V2Probe> {
  if (!/\/wiki\/rest\/api$/.test(apiRootV1)) {
    return {
      available: false,
      reason: "istanza Server/Data Center — la v2 e' solo Cloud, e li' le Folder non esistono",
    };
  }

  const origin = apiRootV1.replace(/\/wiki\/rest\/api$/, "");
  const root = `${origin}/wiki/api/v2`;

  try {
    await get(`${root}/spaces?limit=1`);
    return { available: true, api: { root, origin, get } };
  } catch (err) {
    const status = statusOf(err);
    if (status === 401 || status === 403) {
      return {
        available: false,
        reason:
          `accesso negato alla v2 (${status}). Il token autentica ma non ha gli scope ` +
          `read:space:confluence / read:page:confluence / read:hierarchical-content:confluence`,
      };
    }
    if (status === 404) return { available: false, reason: "endpoint v2 assente (404)" };
    return { available: false, reason: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Paginazione a cursore
// ---------------------------------------------------------------------------

/**
 * La v2 pagina con un cursore opaco: `_links.next` e' un URL RELATIVO
 * (`/wiki/api/v2/pages?limit=250&cursor=…`), non un offset. Va riattaccato
 * all'origine del sito, non alla radice v2, altrimenti `/wiki` finisce doppio.
 */
function resolveNext(api: V2Api, next: string): string {
  if (/^https?:\/\//i.test(next)) return next;
  return api.origin + (next.startsWith("/") ? next : `/${next}`);
}

async function collect(
  api: V2Api,
  firstUrl: string,
  cap: number,
  onProgress?: (n: number) => void
): Promise<Json[]> {
  const out: Json[] = [];
  let url: string | undefined = firstUrl;
  // Cintura di sicurezza: un cursore che non avanza non deve girare all'infinito.
  let guard = 0;

  while (url && out.length < cap && guard < 1000) {
    guard++;
    const json: Json = await api.get(url);
    const results = (json["results"] as Json[] | undefined) ?? [];
    out.push(...results);
    onProgress?.(out.length);
    if (results.length === 0) break;

    const links = (json["_links"] ?? {}) as Json;
    const next = str(links, "next");
    url = next ? resolveNext(api, next) : undefined;
  }

  return out.slice(0, cap);
}

// ---------------------------------------------------------------------------
// Space
// ---------------------------------------------------------------------------

export interface V2Space {
  id: string;
  key: string;
  name: string;
  homepageId: string | null;
}

function toSpace(raw: Json): V2Space {
  return {
    id: str(raw, "id"),
    key: str(raw, "key"),
    name: str(raw, "name"),
    homepageId: strOrNull(raw, "homepageId"),
  };
}

/** Space key → space id: la v2 indirizza per id, la CQL per key. */
export async function findSpaceByKey(api: V2Api, key: string): Promise<V2Space | null> {
  const url = `${api.root}/spaces?keys=${encodeURIComponent(key)}&limit=1`;
  const rows = await collect(api, url, 1);
  const first = rows[0];
  return first ? toSpace(first) : null;
}

export async function fetchSpaceById(api: V2Api, spaceId: string): Promise<V2Space | null> {
  try {
    const raw = await api.get(`${api.root}/spaces/${encodeURIComponent(spaceId)}`);
    return toSpace(raw);
  } catch (err) {
    const status = statusOf(err);
    if (status === 404 || status === 403) return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Risoluzione di un id qualsiasi
// ---------------------------------------------------------------------------

export type NodeLookup =
  | { found: true; node: V2Node }
  | { found: false; reason: "not-found" | "forbidden"; detail: string };

function toNode(raw: Json, fallbackType: string): V2Node {
  return {
    id: str(raw, "id"),
    type: str(raw, "type") || fallbackType,
    title: str(raw, "title"),
    parentId: strOrNull(raw, "parentId"),
    parentType: strOrNull(raw, "parentType"),
    spaceId: strOrNull(raw, "spaceId"),
  };
}

/**
 * Che cos'e' questo id? La v2 non ha un endpoint generico "dammi il contenuto X":
 * si prova un tipo alla volta. L'ordine e' quello di probabilita' d'uso reale.
 *
 * La distinzione fra 404 (id inesistente o cestinato) e 403 (esiste ma non lo
 * vedi) va conservata: sono due problemi con due rimedi diversi, e confonderli
 * manda l'utente a cercare nel posto sbagliato.
 */
export async function resolveNode(api: V2Api, id: string): Promise<NodeLookup> {
  const order = ["page", "folder", "whiteboard", "database", "embed"];
  let forbidden = "";

  for (const type of order) {
    const segment = segmentFor(type);
    if (!segment) continue;
    try {
      const raw = await api.get(`${api.root}/${segment}/${encodeURIComponent(id)}`);
      return { found: true, node: toNode(raw, type) };
    } catch (err) {
      const status = statusOf(err);
      // 400 = l'id non e' nemmeno un intero valido per quel tipo: si prova il prossimo.
      if (status === 404 || status === 400) continue;
      if (status === 401 || status === 403) {
        // Il primo rifiuto e' il piu' informativo: e' il tipo piu' probabile.
        if (!forbidden) forbidden = `${segment}/${id} → ${(err as Error).message}`;
        continue;
      }
      throw err;
    }
  }

  if (forbidden) return { found: false, reason: "forbidden", detail: forbidden };
  return {
    found: false,
    reason: "not-found",
    detail: `provati i tipi ${order.join(" / ")}, nessuno risponde per l'id ${id}`,
  };
}

// ---------------------------------------------------------------------------
// Discendenti
// ---------------------------------------------------------------------------

export interface V2Descendant {
  id: string;
  type: string;
  title: string;
  parentId: string | null;
  /** Profondita' RELATIVA alla radice richiesta (1 = figlio diretto). */
  depth: number;
}

/**
 * Tutti i discendenti di un nodo, di qualunque tipo, folder comprese.
 *
 * `depth` dell'endpoint ha un massimo documentato di 10: oltre, l'API non scende.
 * Invece di fingere che 10 bastino sempre, si guarda chi e' rimasto esattamente
 * al bordo e si riparte da li'. `visited` evita di rifare lo stesso ramo e
 * protegge da un albero malformato che si richiuda su se stesso.
 */
export async function fetchDescendants(
  api: V2Api,
  root: { id: string; type: string },
  cap: number,
  onProgress?: (n: number) => void
): Promise<V2Descendant[]> {
  const out: V2Descendant[] = [];
  const visited = new Set<string>([root.id]);
  const queue: Array<{ id: string; type: string; baseDepth: number }> = [
    { id: root.id, type: root.type, baseDepth: 0 },
  ];

  while (queue.length > 0 && out.length < cap) {
    const job = queue.shift();
    if (!job) break;
    const segment = segmentFor(job.type);
    // Un tipo senza gerarchia (o sconosciuto) non ha discendenti: non e' un errore.
    if (!segment) continue;

    const url =
      `${api.root}/${segment}/${encodeURIComponent(job.id)}/descendants` +
      `?depth=${MAX_DEPTH}&limit=${MAX_LIMIT}`;

    let rows: Json[];
    try {
      rows = await collect(api, url, cap - out.length);
    } catch (err) {
      // Un ramo non leggibile non deve azzerare l'intero albero: si salta e si
      // va avanti. Il buco resta visibile nel conteggio finale.
      const status = statusOf(err);
      if (status === 403 || status === 404) continue;
      throw err;
    }

    for (const row of rows) {
      const id = str(row, "id");
      if (!id || visited.has(id)) continue;
      visited.add(id);

      const depth = typeof row["depth"] === "number" ? (row["depth"] as number) : 1;
      const type = str(row, "type");
      out.push({
        id,
        type,
        title: str(row, "title"),
        parentId: strOrNull(row, "parentId"),
        depth: job.baseDepth + depth,
      });
      onProgress?.(out.length);

      // Al bordo dei 10 livelli l'API si e' fermata: da qui in giu' ci pensiamo noi.
      if (depth >= MAX_DEPTH && isContainerType(type)) {
        queue.push({ id, type, baseDepth: job.baseDepth + depth });
      }
    }
  }

  return out.slice(0, cap);
}

// ---------------------------------------------------------------------------
// Pagine
// ---------------------------------------------------------------------------

/**
 * Tutte le pagine di uno space, con `parentId` e `parentType`.
 *
 * E' la sorgente autorevole per ricostruire l'albero: `parentType` dice
 * esplicitamente se il padre e' una folder — informazione che la v1 non da'.
 */
export async function fetchSpacePages(
  api: V2Api,
  spaceId: string,
  cap: number,
  onProgress?: (n: number) => void
): Promise<V2Node[]> {
  const url = `${api.root}/pages?space-id=${encodeURIComponent(spaceId)}&limit=${MAX_LIMIT}`;
  const rows = await collect(api, url, cap, onProgress);
  return rows.map((r) => toNode(r, "page"));
}

/** Una folder per id. `null` se non esiste o non e' visibile. */
export async function fetchFolder(api: V2Api, id: string): Promise<V2Node | null> {
  try {
    const raw = await api.get(`${api.root}/folders/${encodeURIComponent(id)}`);
    return toNode(raw, "folder");
  } catch (err) {
    const status = statusOf(err);
    if (status === 404 || status === 403 || status === 400) return null;
    throw err;
  }
}

/**
 * Corpi delle pagine, a blocchi.
 *
 * `GET /pages?id=…` accetta fino a 250 id per chiamata: una richiesta ogni 100
 * pagine invece di una per pagina. Su un sottoalbero da 2000 pagine e' la
 * differenza fra 20 chiamate e 2000.
 */
export async function fetchPagesByIds(
  api: V2Api,
  ids: string[],
  onProgress?: (n: number) => void
): Promise<Json[]> {
  const out: Json[] = [];

  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    const url =
      `${api.root}/pages?id=${chunk.map(encodeURIComponent).join(",")}` +
      `&body-format=storage&limit=${MAX_LIMIT}`;
    const rows = await collect(api, url, chunk.length);
    out.push(...rows);
    onProgress?.(out.length);
  }

  return out;
}

/** Il valore storage del corpo, nella forma che usa la v2: body.storage.value. */
export function storageValueOf(page: Json): string {
  const body = (page["body"] ?? {}) as Json;
  const storage = (body["storage"] ?? {}) as Json;
  return str(storage, "value");
}

// ---------------------------------------------------------------------------
// Albero e percorsi
// ---------------------------------------------------------------------------

export interface TreeIndex {
  byId: Map<string, V2Node>;
  childrenOf: Map<string, V2Node[]>;
  /** Nodi il cui padre non e' nell'insieme: le radici di quello che abbiamo. */
  roots: V2Node[];
}

export function buildTree(nodes: V2Node[]): TreeIndex {
  const byId = new Map<string, V2Node>();
  for (const n of nodes) byId.set(n.id, n);

  const childrenOf = new Map<string, V2Node[]>();
  const roots: V2Node[] = [];

  for (const n of nodes) {
    if (n.parentId && byId.has(n.parentId)) {
      const siblings = childrenOf.get(n.parentId) ?? [];
      siblings.push(n);
      childrenOf.set(n.parentId, siblings);
    } else {
      roots.push(n);
    }
  }

  // Le folder prima delle pagine, poi per titolo: e' l'ordine con cui Confluence
  // mostra l'albero, quindi l'unico in cui l'utente riconosce il suo space.
  const order = (a: V2Node, b: V2Node): number => {
    const rank = (n: V2Node): number => (n.type === "folder" ? 0 : 1);
    return rank(a) - rank(b) || a.title.localeCompare(b.title);
  };
  for (const list of childrenOf.values()) list.sort(order);
  roots.sort(order);

  return { byId, childrenOf, roots };
}

/**
 * Titoli degli antenati, dalla radice al padre incluso.
 *
 * E' il campo che alimenta `pathTitles` / `branch` nell'export: senza, l'entropia
 * si puo' misurare solo in aggregato e non si sa piu' quale area sia messa peggio.
 * `stopAtId` ferma la risalita alla radice richiesta, cosi' il percorso resta
 * relativo al sottoalbero scaricato invece di annegare negli antenati dello space.
 */
export function pathTitlesOf(index: TreeIndex, id: string, stopAtId?: string): string[] {
  const path: string[] = [];
  const seen = new Set<string>([id]);

  let current = index.byId.get(id);
  while (current && current.parentId) {
    if (seen.has(current.parentId)) break;
    seen.add(current.parentId);
    const parent = index.byId.get(current.parentId);
    if (!parent) break;
    path.unshift(parent.title);
    if (parent.id === stopAtId) break;
    current = parent;
  }

  return path;
}
