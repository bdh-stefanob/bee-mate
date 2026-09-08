/**
 * confluence-publish.ts
 * ---------------------
 * Pubblica un documento generato come pagina Confluence, accanto a quelle degli
 * scenari.
 *
 * PERCHE' PUBBLICARE E NON LASCIARE UN FILE
 * Il catalogo, la coda e il report servono a persone che non hanno il
 * repository e non useranno mai un terminale. Se vivono solo su disco, non
 * esistono. La pagina Confluence e' una **proiezione**: si rigenera e si
 * sovrascrive, non si modifica a mano.
 *
 * LA REGOLA DI SICUREZZA, CHE E' IL MOTIVO PER CUI QUESTO FILE E' LUNGO
 * Lo strumento scrive **solo su pagine che ha creato lui**, riconoscibili da un
 * marcatore nel corpo. Puntato a una pagina che non lo porta, si ferma.
 *
 * Serve contro l'errore banale e irreversibile: un id copiato male, e si
 * sovrascrivono i casi di test di qualcun altro. Una volta sola basta a chiudere
 * l'iniziativa, a prescindere da quanto funzioni tutto il resto. Per lo stesso
 * motivo **non scrive niente senza `--apply`**: senza, mostra cosa farebbe.
 *
 * Uso:
 *   npx ts-node scripts/confluence-publish.ts \
 *     --file reports/catalog-sync/queue.md \
 *     --title "Coda di consolidamento — 2026-09" \
 *     --parent 123456 --space SEDT
 *
 *   ...e poi, dopo aver letto cosa farebbe:  --apply
 *
 * Flag:
 *   --file PATH     il Markdown da pubblicare
 *   --title T       titolo della pagina
 *   --parent ID     pagina madre sotto cui crearla
 *   --space KEY     chiave dello space (serve alla creazione)
 *   --apply         scrive davvero. Senza, e' una prova a vuoto
 */

import * as fs from "fs";
import { loadEnv, authHeader, validateBaseUrl } from "./lib/atlassian";
import { markdownToStorage } from "./lib/markdown-storage";

loadEnv();

const BASE_URL = (process.env["CONFLUENCE_URL"] ?? process.env["JIRA_URL"] ?? "").replace(/\/+$/, "");
const EMAIL = process.env["CONFLUENCE_EMAIL"] ?? process.env["JIRA_EMAIL"] ?? "";
const TOKEN = process.env["CONFLUENCE_TOKEN"] ?? process.env["JIRA_TOKEN"] ?? "";

/**
 * Il marcatore che rende una pagina "nostra".
 *
 * E' un commento XHTML: invisibile a chi legge, presente nel corpo, e
 * sopravvive alle modifiche dell'editor di Confluence. Se qualcuno lo toglie a
 * mano, lo strumento smette di considerare sua quella pagina e si ferma — che
 * e' il comportamento giusto: significa che qualcuno l'ha adottata.
 */
const MARKER = "<!-- generato-da: bdd-catalog-tool · non modificare a mano: si rigenera -->";

// ---------------------------------------------------------------------------
// Trasporto
// ---------------------------------------------------------------------------

let apiRoot = "";

async function call(
  method: "GET" | "POST" | "PUT",
  url: string,
  body?: unknown
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: authHeader(EMAIL, TOKEN),
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 300)}` : ""}`),
      { status: res.status }
    );
  }
  return (await res.json()) as Record<string, unknown>;
}

/** Cloud sta sotto /wiki, Server/DC no. Stessa scelta di confluence-fetch. */
async function detectApiRoot(): Promise<string> {
  for (const root of [`${BASE_URL}/wiki/rest/api`, `${BASE_URL}/rest/api`]) {
    try {
      await call("GET", `${root}/space?limit=1`);
      return root;
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        throw new Error(
          `Autenticazione rifiutata (${status}). Un token con ambito richiede il\n` +
            `  gateway api.atlassian.com: per questo strumento serve un token classico.`
        );
      }
    }
  }
  throw new Error(`Nessuna radice API Confluence ha risposto su ${BASE_URL}`);
}

// ---------------------------------------------------------------------------
// Pagine
// ---------------------------------------------------------------------------

interface ExistingPage {
  id: string;
  version: number;
  hasMarker: boolean;
  title: string;
}

function str(o: Record<string, unknown>, k: string): string {
  const v = o[k];
  return typeof v === "string" ? v : "";
}

/** Cerca una pagina figlia con quel titolo. Null se non esiste. */
async function findByTitle(space: string, title: string): Promise<ExistingPage | null> {
  const url =
    `${apiRoot}/content?spaceKey=${encodeURIComponent(space)}` +
    `&title=${encodeURIComponent(title)}&expand=version,body.storage&limit=1`;
  const json = await call("GET", url);
  const results = (json["results"] as Array<Record<string, unknown>>) ?? [];
  const page = results[0];
  if (!page) return null;

  const version = (page["version"] ?? {}) as Record<string, unknown>;
  const body = (page["body"] ?? {}) as Record<string, unknown>;
  const storage = (body["storage"] ?? {}) as Record<string, unknown>;

  return {
    id: str(page, "id"),
    title: str(page, "title"),
    version: typeof version["number"] === "number" ? (version["number"] as number) : 1,
    hasMarker: str(storage, "value").includes("bdd-catalog-tool"),
  };
}

async function createPage(
  space: string,
  parentId: string,
  title: string,
  storage: string
): Promise<string> {
  const json = await call("POST", `${apiRoot}/content`, {
    type: "page",
    title,
    space: { key: space },
    ancestors: [{ id: parentId }],
    body: { storage: { value: storage, representation: "storage" } },
  });
  return str(json, "id");
}

async function updatePage(
  page: ExistingPage,
  title: string,
  storage: string
): Promise<void> {
  await call("PUT", `${apiRoot}/content/${page.id}`, {
    id: page.id,
    type: "page",
    title,
    version: { number: page.version + 1 },
    body: { storage: { value: storage, representation: "storage" } },
  });
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = argValue(args, "--file");
  const title = argValue(args, "--title");
  const parent = argValue(args, "--parent") ?? process.env["CONFLUENCE_PARENT"] ?? "";
  const space = argValue(args, "--space") ?? process.env["CONFLUENCE_SPACE"] ?? "";
  const apply = args.includes("--apply");

  if (!file || !title || !parent || !space) {
    console.error(
      "ERRORE: servono --file, --title, --parent e --space.\n\n" +
        "  npx ts-node scripts/confluence-publish.ts \\\n" +
        '    --file reports/catalog-sync/queue.md \\\n' +
        '    --title "Coda di consolidamento — 2026-09" \\\n' +
        "    --parent <id-pagina-madre> --space <CHIAVE>\n\n" +
        "  --parent e --space si possono mettere in .env come\n" +
        "  CONFLUENCE_PARENT e CONFLUENCE_SPACE.\n"
    );
    process.exit(1);
  }
  if (!BASE_URL || !TOKEN) {
    console.error("ERRORE: mancano CONFLUENCE_URL e/o CONFLUENCE_TOKEN in .env");
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`ERRORE: file inesistente: ${file}`);
    process.exit(1);
  }

  validateBaseUrl(BASE_URL, "CONFLUENCE_URL");

  const md = fs.readFileSync(file, "utf-8");
  const storage = `${MARKER}\n${markdownToStorage(md)}`;

  apiRoot = await detectApiRoot();
  const existing = await findByTitle(space, title);

  console.log(`\nPUBBLICAZIONE\n`);
  console.log(`  Sorgente : ${file}  (${md.split("\n").length} righe)`);
  console.log(`  Titolo   : ${title}`);
  console.log(`  Space    : ${space}`);
  console.log(`  Sotto    : ${parent}\n`);

  // ── La regola di sicurezza ───────────────────────────────────────────────
  if (existing && !existing.hasMarker) {
    console.error(
      `  RIFIUTO DI SCRIVERE.\n\n` +
        `  Esiste gia' una pagina "${existing.title}" (id ${existing.id}) con questo\n` +
        `  titolo, ma NON porta il marcatore di questo strumento: non l'ha creata lui.\n\n` +
        `  Sovrascriverla cancellerebbe il lavoro di qualcun altro. Se la pagina e'\n` +
        `  davvero da rigenerare, cambiale titolo o cancellala a mano — e' una\n` +
        `  decisione che deve prendere una persona, non uno script.\n`
    );
    process.exit(1);
  }

  const action = existing ? `AGGIORNA la pagina ${existing.id} (versione ${existing.version} → ${existing.version + 1})` : `CREA una pagina nuova sotto ${parent}`;

  if (!apply) {
    console.log(`  Cosa farebbe: ${action}`);
    console.log(`\n  Prova a vuoto: non e' stato scritto niente.`);
    console.log(`  Rilancia con --apply per scrivere davvero.\n`);
    return;
  }

  if (existing) {
    await updatePage(existing, title, storage);
    console.log(`  Aggiornata la pagina ${existing.id} → versione ${existing.version + 1}`);
  } else {
    const id = await createPage(space, parent, title, storage);
    console.log(`  Creata la pagina ${id}`);
  }

  const site = apiRoot.replace(/\/rest\/api$/, "");
  console.log(`\n  ${site}/spaces/${space}\n`);
}

main().catch((err) => {
  console.error(`\nPubblicazione fallita: ${(err as Error).message}\n`);
  process.exit(1);
});
