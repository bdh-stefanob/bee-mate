/**
 * lib/atlassian.ts
 * ----------------
 * Codice condiviso fra i lettori Atlassian (`jira-fetch.ts`, `confluence-fetch.ts`).
 *
 * Il pezzo che DEVE stare qui e non essere duplicato e' `scoreGherkin`: se le due
 * sorgenti contassero i passi con criteri diversi, le metriche di entropia non
 * sarebbero confrontabili fra loro.
 */

import * as fs from "fs";

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

/** Carica .env senza dipendenze. Le variabili gia' presenti nell'ambiente vincono. */
export function loadEnv(envPath = ".env"): void {
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

/**
 * Cloud usa Basic con email + API token; Server/DC usa Bearer con un PAT.
 * La presenza dell'email e' il discriminante.
 */
export function authHeader(email: string, token: string): string {
  if (email) return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
  return `Bearer ${token}`;
}

// ---------------------------------------------------------------------------
// Riconoscimento Gherkin — tollerante per definizione
// ---------------------------------------------------------------------------
//
// Il testo reale non e' Gherkin valido: e' prosa scritta a mano dentro un wiki o
// un ticket, con bullet, numerazione, grassetti e keyword miste EN/IT. Un parser
// Gherkin ufficiale qui fallisce sempre. Questo scorer non valida: stima.

const STEP_KEYWORDS = [
  "given", "when", "then", "and", "but",
  "dato", "dati", "data", "date", "quando", "allora", "ma",
];

const STRUCTURE_KEYWORDS = [
  "feature", "scenario", "scenario outline", "background", "examples",
  "funzionalita", "funzionalità", "contesto", "esempi", "schema dello scenario",
];

export interface GherkinScore {
  stepLines: number;
  structureLines: number;
  /** true se compaiono un passo di premessa, uno di azione e uno di verifica. */
  hasFullTriplet: boolean;
}

export function scoreGherkin(text: string): GherkinScore {
  let stepLines = 0;
  let structureLines = 0;
  let sawPremise = false;
  let sawAction = false;
  let sawOutcome = false;

  for (const rawLine of text.split("\n")) {
    // Togli bullet, numerazione, markup e citazioni prima di guardare la keyword.
    const line = rawLine
      .replace(/^[\s>*\-–—•\d.)\]]+/, "")
      .replace(/[*_`]/g, "")
      .trim()
      .toLowerCase();
    if (!line) continue;

    if (STRUCTURE_KEYWORDS.some((k) => line.startsWith(k + ":"))) {
      structureLines++;
      continue;
    }

    // Un passo e': <keyword> + almeno una parola dopo.
    const stepHit = STEP_KEYWORDS.find(
      (k) => line.startsWith(k + " ") && line.length > k.length + 2
    );
    if (!stepHit) continue;

    stepLines++;
    if (stepHit === "given" || stepHit.startsWith("dat")) sawPremise = true;
    if (stepHit === "when" || stepHit === "quando") sawAction = true;
    if (stepHit === "then" || stepHit === "allora") sawOutcome = true;
  }

  return { stepLines, structureLines, hasFullTriplet: sawPremise && sawAction && sawOutcome };
}

/** Soglia minima per considerare un blocco di testo un candidato caso di test. */
export function looksLikeTestCase(score: GherkinScore): boolean {
  return score.stepLines >= 2 || score.structureLines >= 1;
}

// ---------------------------------------------------------------------------
// Atlassian Document Format (Jira Cloud) → testo piatto
// ---------------------------------------------------------------------------

const ADF_BLOCK_NODES = new Set([
  "paragraph", "heading", "codeBlock", "listItem", "blockquote", "rule", "tableRow",
]);

export function adfToText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(adfToText).join("");
  if (typeof node !== "object") return String(node);

  const n = node as Record<string, unknown>;
  const type = typeof n["type"] === "string" ? (n["type"] as string) : "";

  if (type === "text") return typeof n["text"] === "string" ? (n["text"] as string) : "";
  if (type === "hardBreak") return "\n";

  const inner = adfToText(n["content"]);
  // Senza separatore le celle si incollano: "GivenX" + "WhenY" → "GivenXWhenY".
  if (type === "tableCell" || type === "tableHeader") return inner.trim() + " | ";
  if (ADF_BLOCK_NODES.has(type)) return inner + "\n";
  return inner;
}

// ---------------------------------------------------------------------------
// Confluence storage format (XHTML + macro) → testo piatto
// ---------------------------------------------------------------------------

/**
 * Entita' nominate che compaiono davvero nel contenuto wiki.
 * Le accentate contano quanto le altre: su pagine italiane `&egrave;` e `&agrave;`
 * sono ovunque, e lasciarle passare sporca sia il testo estratto sia il clustering
 * (la stessa frase scritta con e senza entita' finirebbe in due cluster diversi).
 */
const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  mdash: "—", ndash: "–", hellip: "…", laquo: "«", raquo: "»",
  lsquo: "'", rsquo: "'", ldquo: "“", rdquo: "”", bull: "•", middot: "·",
  agrave: "à", aacute: "á", egrave: "è", eacute: "é", igrave: "ì", iacute: "í",
  ograve: "ò", oacute: "ó", ugrave: "ù", uacute: "ú", ccedil: "ç", ntilde: "ñ",
  auml: "ä", ouml: "ö", uuml: "ü", euro: "€", pound: "£", deg: "°",
  Agrave: "À", Egrave: "È", Eacute: "É", Igrave: "Ì", Ograve: "Ò", Ugrave: "Ù",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    const code =
      body.startsWith("#x") || body.startsWith("#X") ? parseInt(body.slice(2), 16)
      : body.startsWith("#") ? Number(body.slice(1))
      : NaN;

    if (Number.isFinite(code)) {
      // Un code point fuori range farebbe eccezione: meglio lasciare l'originale.
      try { return String.fromCodePoint(code); } catch { return match; }
    }
    return ENTITIES[body] ?? match;
  });
}

/**
 * Riduce lo storage format di Confluence a testo con i newline nei posti giusti.
 *
 * Il caso che conta di piu': il Gherkin scritto dentro una macro "code" finisce in
 * <ac:plain-text-body><![CDATA[...]]></ac:plain-text-body>. Il CDATA va estratto
 * PRIMA di rimuovere i tag, altrimenti si perde tutto il contenuto piu' strutturato
 * della pagina — che e' proprio quello che stiamo cercando.
 */
export function storageToText(html: string): string {
  if (!html) return "";
  let s = html;

  // 1. CDATA (macro di codice) → testo, preservando i newline interni.
  s = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, body: string) => `\n${body}\n`);

  // 2. Elementi che non contengono testo utile.
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  // I parametri di macro (<ac:parameter>) sono metadati, non contenuto.
  s = s.replace(/<ac:parameter[\s\S]*?<\/ac:parameter>/gi, "");

  // 3. Confini di blocco → newline; celle → separatore.
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|pre|blockquote)>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(td|th)>/gi, " | ");

  // 4. Via i tag rimasti, incluso il namespace ac:/ri: delle macro.
  s = s.replace(/<[^>]+>/g, "");

  s = decodeEntities(s);

  // 5. Normalizza: niente spazi in coda, niente muri di righe vuote.
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, "").replace(/^[ \t]+/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export function preview(text: string, lines = 12, width = 110): string {
  return text
    .split("\n")
    .slice(0, lines)
    .map((l) => "      | " + l.slice(0, width))
    .join("\n");
}

export function pct(n: number, total: number): string {
  return total ? `${Math.round((n / total) * 100)}%` : "—";
}
