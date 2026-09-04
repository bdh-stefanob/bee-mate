/**
 * scout.ts
 * --------
 * Scansiona una pagina e produce il **dizionario dei componenti**: per ogni
 * elemento interattivo, il suo ruolo ARIA, il nome accessibile, il locator
 * Playwright e un giudizio sulla sua stabilita'.
 *
 * COSA NON FA, ED E' UNA DECISIONE DI PROGETTO
 * -------------------------------------------
 * Non genera step Gherkin. Mai.
 *
 * La tentazione e' forte — da 40 elementi escono 40 "When the user clicks X" in
 * un secondo — ed e' esattamente l'errore che questo progetto esiste per evitare.
 * Uno step per elemento produce Gherkin imperativo: fragile, illeggibile per il
 * business, e moltiplicato per venti pagine fabbrica piu' entropia di quanta ne
 * tolga. La mappatura corretta e' asimmetrica:
 *
 *     componente UI    →  metodo POM      1:1   MECCANICO, generabile (qui)
 *     intento business →  step Gherkin    1:N   SEMANTICO, curato (altrove)
 *
 * Quindi questo script popola il layer `pages/` e fornisce il **contesto reale**
 * su cui un assistente propone step che esistono davvero sulla pagina, invece di
 * inventarli. Il passaggio da inventario a step richiede giudizio umano.
 *
 * IL SOTTOPRODOTTO CHE VALE
 * -------------------------
 * La qualita' del dizionario e' un **proxy di accessibilita'**. Se un componente
 * non ha un nome accessibile stabile, non e' solo scomodo da automatizzare: e'
 * probabilmente inaccessibile anche a chi usa uno screen reader. Il report finale
 * lo dice esplicitamente, ed e' l'argomento migliore per coinvolgere gli
 * sviluppatori — che dell'automazione dei test potrebbero non curarsi, ma di un
 * problema di accessibilita' si'.
 *
 * Uso:
 *   npm run scout -- https://example.com
 *   npx ts-node scripts/scout.ts https://example.com --scope "main" --headed
 *
 * Flag:
 *   --scope SEL    limita la scansione a un selettore (default: body)
 *   --headed       mostra il browser (default: headless)
 *   --out PATH     file di output (default: reports/scout/<slug>.json)
 *   --wait MS      attesa dopo il caricamento, per SPA lente (default 1500)
 *
 * L'output va sotto reports/, che e' gitignorato: una scansione di un'app
 * aziendale contiene nomi di funzionalita' reali.
 */

import { chromium, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { DOM_PROBE_SOURCE } from "./lib/dom-probe";

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

/** Quanto ci si puo' fidare del locator per questo componente. */
type Stability = "stable" | "ambiguous" | "unstable" | "unnamed";

/** A che serve il componente: guida il nome del metodo POM. */
type Kind = "action" | "input" | "navigation" | "choice";

interface Component {
  role: string;
  name: string;
  kind: Kind;
  /** Espressione Playwright pronta da incollare in una Page Object. */
  locator: string;
  /** Nome di metodo suggerito per la Page Object. */
  method: string;
  /** Quante volte lo stesso role+name compare nella pagina. */
  occurrences: number;
  stability: Stability;
  /** Perche' e' stato giudicato cosi'. Vuoto se stabile. */
  notes: string[];
  href?: string;
  disabled?: boolean;
}

interface ScoutResult {
  url: string;
  scope: string;
  scoutedAt: string;
  quality: {
    interactiveFound: number;
    usable: number;
    unnamed: number;
    ambiguous: number;
    unstable: number;
    /** % di elementi con un nome accessibile stabile e univoco. */
    accessibleScore: number;
  };
  components: Component[];
}

// ---------------------------------------------------------------------------
// Estrazione dal DOM
// ---------------------------------------------------------------------------

/** Elemento grezzo raccolto nel browser, prima del giudizio. */
interface RawElement {
  role: string;
  name: string;
  href: string;
  disabled: boolean;
}

/**
 * Raccoglie gli elementi interattivi usando il probe condiviso.
 *
 * La descrizione (ruolo + nome accessibile) NON e' reimplementata qui: arriva da
 * `DOM_PROBE_SOURCE`, lo stesso codice che usa il recorder. Due implementazioni
 * diverse divergerebbero, e divergendo romperebbero l'aggancio fra "cosa ha
 * toccato il tester" e "quale componente e' quello" — che e' il perno del metodo.
 */
function collectWithProbe(scopeSelector: string): RawElement[] {
  const probe = (window as unknown as { __bddProbe: {
    describe(el: Element): { role: string; name: string } | null;
    isVisible(el: Element): boolean;
    roles: string[];
  } }).__bddProbe;

  const selector = [
    "a[href]", "button", 'input:not([type="hidden"])', "select", "textarea",
    '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
    '[role="checkbox"]', '[role="radio"]', '[role="combobox"]',
    '[role="textbox"]', '[role="searchbox"]', '[role="switch"]',
  ].join(", ");

  const root = document.querySelector(scopeSelector) ?? document.body;
  const out: RawElement[] = [];

  root.querySelectorAll(selector).forEach((el) => {
    if (!probe.isVisible(el)) return;
    const described = probe.describe(el);
    if (!described) return;

    const input = el as HTMLInputElement;
    out.push({
      role: described.role,
      name: described.name,
      href: (el as HTMLAnchorElement).href ?? "",
      disabled: Boolean(input.disabled || input.readOnly),
    });
  });

  return out;
}

// ---------------------------------------------------------------------------
// Giudizio sulla stabilita'
// ---------------------------------------------------------------------------

/**
 * Nomi che cambiano da esecuzione a esecuzione: un locator costruito su questi
 * si rompe al primo dato diverso. Vanno segnalati, non scartati — il componente
 * esiste, e' il modo di raggiungerlo che va scelto a mano.
 */
const UNSTABLE_PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /\d{2}[\/.-]\w{2,3}[\/.-]\d{2,4}/, why: "contiene una data" },
  { re: /\b\d{4,}\b/, why: "contiene un identificativo numerico" },
  { re: /[\w.+-]+@[\w-]+\.\w+/, why: "contiene un indirizzo email" },
  { re: /^\s*[£$€]\s?[\d.,]+/, why: "contiene un importo" },
  { re: /^\d+\s*(items?|risultati|results?)/i, why: "contiene un conteggio" },
];

function judge(name: string, occurrences: number): { stability: Stability; notes: string[] } {
  const notes: string[] = [];

  if (!name) {
    return {
      stability: "unnamed",
      notes: ["nessun nome accessibile: non raggiungibile per ruolo+nome, e probabilmente invisibile a uno screen reader"],
    };
  }
  if (name.length > 80) {
    notes.push("nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo");
  }
  for (const { re, why } of UNSTABLE_PATTERNS) {
    if (re.test(name)) notes.push(why);
  }
  if (occurrences > 1) {
    notes.push(`${occurrences} elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro`);
    return { stability: "ambiguous", notes };
  }
  if (notes.length > 0) return { stability: "unstable", notes };
  return { stability: "stable", notes: [] };
}

// ---------------------------------------------------------------------------
// Da elemento a componente
// ---------------------------------------------------------------------------

function kindOf(role: string, href: string): Kind {
  if (role === "textbox" || role === "searchbox" || role === "spinbutton") return "input";
  if (role === "checkbox" || role === "radio" || role === "switch" || role === "option") return "choice";
  if (role === "link" && href) return "navigation";
  return "action";
}

function toPascalCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5) // nomi lunghi producono metodi illeggibili
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function methodName(kind: Kind, name: string): string {
  const base = toPascalCase(name) || "Unnamed";
  if (kind === "input") return `fill${base}`;
  if (kind === "choice") return `set${base}`;
  if (kind === "navigation") return `goTo${base}`;
  return `click${base}`;
}

function escapeForLocator(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function toComponent(raw: RawElement, occurrences: number): Component {
  const kind = kindOf(raw.role, raw.href);
  const { stability, notes } = judge(raw.name, occurrences);

  const base = `getByRole('${raw.role}', { name: '${escapeForLocator(raw.name)}' })`;
  const locator = occurrences > 1 ? `${base}.first()` : base;

  return {
    role: raw.role,
    name: raw.name,
    kind,
    locator,
    method: methodName(kind, raw.name),
    occurrences,
    stability,
    notes,
    ...(raw.href ? { href: raw.href } : {}),
    ...(raw.disabled ? { disabled: true } : {}),
  };
}

// ---------------------------------------------------------------------------
// Scansione
// ---------------------------------------------------------------------------

async function scan(page: Page, url: string, scope: string, waitMs: number): Promise<ScoutResult> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // Le SPA montano dopo il DOMContentLoaded: senza attesa si scansiona uno scheletro.
  await page.waitForTimeout(waitMs);

  // Il probe va iniettato prima di usarlo: la pagina e' gia' caricata, quindi
  // evaluate e non addInitScript.
  await page.evaluate(DOM_PROBE_SOURCE);
  const raw = await page.evaluate(collectWithProbe, scope);

  // Conta le occorrenze PRIMA di deduplicare: e' il dato che rende un locator
  // ambiguo, e si perde se si deduplica per primo.
  const counts = new Map<string, number>();
  for (const el of raw) {
    const key = `${el.role} ${el.name}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const components: Component[] = [];
  for (const el of raw) {
    const key = `${el.role} ${el.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    components.push(toComponent(el, counts.get(key) ?? 1));
  }

  components.sort((a, b) =>
    a.role === b.role ? a.name.localeCompare(b.name) : a.role.localeCompare(b.role)
  );

  const unnamed = components.filter((c) => c.stability === "unnamed").length;
  const ambiguous = components.filter((c) => c.stability === "ambiguous").length;
  const unstable = components.filter((c) => c.stability === "unstable").length;
  const usable = components.filter((c) => c.stability === "stable").length;

  return {
    url,
    scope,
    scoutedAt: new Date().toISOString(),
    quality: {
      interactiveFound: raw.length,
      usable,
      unnamed,
      ambiguous,
      unstable,
      accessibleScore: components.length ? Math.round((usable / components.length) * 100) : 0,
    },
    components,
  };
}

// ---------------------------------------------------------------------------
// Report a schermo
// ---------------------------------------------------------------------------

function report(result: ScoutResult, outPath: string): void {
  const q = result.quality;

  console.log(`\nSCOUT — ${result.url}\n`);
  console.log(`  Elementi interattivi visibili : ${q.interactiveFound}`);
  console.log(`  Componenti distinti           : ${result.components.length}`);
  console.log(`  Direttamente utilizzabili     : ${q.usable}`);
  console.log(`  Senza nome accessibile        : ${q.unnamed}`);
  console.log(`  Nome ambiguo (non univoco)    : ${q.ambiguous}`);
  console.log(`  Nome instabile (dati dentro)  : ${q.unstable}`);
  console.log(`\n  Indice di accessibilita'     : ${q.accessibleScore}%`);
  console.log(
    q.accessibleScore >= 80
      ? `  La pagina e' ben etichettata: l'automazione per ruolo+nome regge.`
      : q.accessibleScore >= 50
        ? `  Meta' dei componenti richiede locator scritti a mano.`
        : `  Molti componenti non sono raggiungibili per ruolo+nome. Non e' solo un\n` +
          `  problema di automazione: e' un segnale di accessibilita' da girare al team.`
  );

  const byKind = new Map<Kind, number>();
  for (const c of result.components) byKind.set(c.kind, (byKind.get(c.kind) ?? 0) + 1);
  console.log(`\n  Per tipo: ${[...byKind.entries()].map(([k, n]) => `${n} ${k}`).join(", ")}`);

  const problems = result.components.filter((c) => c.stability !== "stable");
  if (problems.length > 0) {
    console.log(`\n  DA RIVEDERE A MANO (${problems.length}):\n`);
    for (const c of problems.slice(0, 15)) {
      console.log(`  [${c.stability}] ${c.role} "${c.name.slice(0, 60) || "(senza nome)"}"`);
      for (const n of c.notes) console.log(`      ${n}`);
    }
    if (problems.length > 15) console.log(`  … e altri ${problems.length - 15}.`);
  }

  console.log(`\n  Scritto in: ${outPath}`);
  console.log(
    `\n  Questo file e' il dizionario dei componenti: alimenta le Page Object e\n` +
      `  fornisce il contesto reale su cui proporre step. NON contiene ne' genera\n` +
      `  step Gherkin — quel passaggio richiede giudizio, non scansione.\n`
  );
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function argValue(args: string[], flag: string): string | undefined {
  const withEquals = args.find((a) => a.startsWith(flag + "="));
  if (withEquals) return withEquals.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

function slugify(url: string): string {
  try {
    const u = new URL(url);
    const p = u.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-");
    return `${u.hostname}${p ? "-" + p : ""}`.replace(/[^a-zA-Z0-9.-]/g, "-");
  } catch {
    return "scout";
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const url = args.find((a) => /^https?:\/\//i.test(a));

  if (!url) {
    console.error(
      "ERRORE: manca l'URL da scansionare.\n\n" +
        "  npm run scout -- https://example.com\n" +
        "  npx ts-node scripts/scout.ts https://example.com --scope main --headed\n"
    );
    process.exit(1);
  }

  const scope = argValue(args, "--scope") ?? "body";
  const waitMs = Number(argValue(args, "--wait") ?? 1500);
  const outPath = argValue(args, "--out") ?? path.join("reports", "scout", `${slugify(url)}.json`);

  const browser = await chromium.launch({ headless: !args.includes("--headed") });
  try {
    const page = await browser.newPage();
    const result = await scan(page, url, scope, waitMs);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8");
    report(result, outPath);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(`\nScout fallito: ${(err as Error).message}\n`);
  process.exit(1);
});
