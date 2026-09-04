/**
 * record.ts
 * ---------
 * Registra un test eseguito a mano da un tester esperto di business, e ne
 * produce una **traccia semantica**: non "click su #login-btn", ma
 * `{ role: "button", name: "Login" }`.
 *
 * L'IDEA
 * L'esecuzione manuale e' gia' l'atto di specifica. Il tester fa quello che
 * farebbe comunque; da quella sessione si derivano lo scenario e, dopo, il
 * codice di automazione. Chi conosce il business non deve imparare Gherkin per
 * contribuire al catalogo.
 *
 * PERCHE' NON E' RECORD-AND-PLAYBACK
 * Quello produceva script imperativi legati ai selettori, che si rompevano al
 * primo ritocco della UI. Qui la traccia esce nello **stesso vocabolario del
 * dizionario dello scout** (`role` + `name`), quindi il collegamento
 * traccia -> componente -> step di catalogo non va inferito: coincide. La
 * meccanica la da' la registrazione, il linguaggio lo da' il catalogo, e
 * l'assistente fa solo il ponte fra i due — senza poter inventare frasi.
 *
 * COSA CHIEDE AL TESTER, E PERCHE'
 * Due cose che dai gesti non si deducono, e senza le quali si generano scenari
 * che sembrano test senza esserlo:
 *   - "Fine intento": dove finisce un passo. Senza, si spezza a ogni click.
 *   - "Verifica": cosa prova che il flusso e' riuscito. Senza, niente `Then`.
 *
 * Uso:
 *   npm run record -- https://example.com
 *   npx ts-node scripts/record.ts https://example.com --out reports/recordings/login.json
 *
 * Flag:
 *   --out PATH     file di output (default reports/recordings/<slug>-<ts>.json)
 *   --browser NAME 'chrome' usa il Chrome installato (default), 'chromium' quello di Playwright
 *
 * La sessione finisce quando il tester preme "Fine registrazione" o chiude il
 * browser. L'output sta sotto reports/, gitignorato: una registrazione su
 * un'app aziendale contiene nomi di funzionalita' reali e dati digitati.
 */

import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { DOM_PROBE_SOURCE } from "./lib/dom-probe";
import { RECORDER_OVERLAY_SOURCE } from "./lib/recorder-overlay";

// ---------------------------------------------------------------------------
// Tipi della traccia
// ---------------------------------------------------------------------------

interface RawEvent {
  type: "ready" | "action" | "assert" | "intent" | "note" | "stop";
  at: number;
  url?: string;
  action?: "click" | "fill" | "set";
  role?: string;
  name?: string;
  value?: string;
  secret?: boolean;
  text?: string;
  label?: string;
}

interface Step {
  action: "click" | "fill" | "set";
  role: string;
  name: string;
  value?: string;
  secret?: boolean;
}

interface Assertion {
  role: string;
  name: string;
  text?: string;
}

/** Un intento = un gruppo di gesti che il tester ha dichiarato essere un passo. */
interface Intent {
  label: string;
  steps: Step[];
  assertions: Assertion[];
  notes: string[];
}

interface Recording {
  startUrl: string;
  recordedAt: string;
  durationSeconds: number;
  /** Pagine visitate, nell'ordine. Serve a sapere quali dizionari servono. */
  pagesVisited: string[];
  summary: {
    intents: number;
    steps: number;
    assertions: number;
    unlabelled: number;
  };
  intents: Intent[];
}

// ---------------------------------------------------------------------------
// Da eventi grezzi a intenti
// ---------------------------------------------------------------------------

/**
 * Raggruppa gli eventi nei confini dichiarati dal tester.
 *
 * I gesti fatti dopo l'ultimo "Fine intento" finiscono in un gruppo senza
 * etichetta: non si buttano — e' materiale vero, e' solo che il tester non l'ha
 * chiuso. Va segnalato, non nascosto: uno scenario a cui manca l'ultimo passo e'
 * peggio di uno che dichiara di essere incompleto.
 */
function group(events: RawEvent[]): { intents: Intent[]; unlabelled: number } {
  const intents: Intent[] = [];
  let current: Intent = { label: "", steps: [], assertions: [], notes: [] };
  let unlabelled = 0;

  const flush = (label: string): void => {
    const empty =
      current.steps.length === 0 && current.assertions.length === 0 && current.notes.length === 0;
    if (empty) {
      current.label = label;
      return;
    }
    current.label = label;
    intents.push(current);
    current = { label: "", steps: [], assertions: [], notes: [] };
  };

  for (const e of events) {
    switch (e.type) {
      case "action":
        current.steps.push({
          action: e.action ?? "click",
          role: e.role ?? "",
          name: e.name ?? "",
          ...(e.value !== undefined ? { value: e.value } : {}),
          ...(e.secret ? { secret: true } : {}),
        });
        break;
      case "assert":
        current.assertions.push({
          role: e.role ?? "",
          name: e.name ?? "",
          ...(e.text ? { text: e.text } : {}),
        });
        break;
      case "note":
        if (e.text) current.notes.push(e.text);
        break;
      case "intent":
        flush(e.label?.trim() || "(intento senza nome)");
        break;
      default:
        break;
    }
  }

  const leftover =
    current.steps.length > 0 || current.assertions.length > 0 || current.notes.length > 0;
  if (leftover) {
    current.label = "(non chiuso — il tester non ha premuto Fine intento)";
    intents.push(current);
    unlabelled = 1;
  }

  return { intents, unlabelled };
}

// ---------------------------------------------------------------------------
// Sessione
// ---------------------------------------------------------------------------

async function record(url: string, browserName: string): Promise<Recording> {
  const events: RawEvent[] = [];
  const pages = new Set<string>();
  const startedAt = Date.now();

  let browser: Browser;
  try {
    browser = await chromium.launch({
      headless: false,
      ...(browserName === "chromium" ? {} : { channel: browserName }),
    });
  } catch {
    // Chrome non installato: si ripiega sul Chromium di Playwright invece di
    // fermarsi. Il tester non deve sapere quale browser sta usando.
    console.log(`  ${browserName} non disponibile, uso il Chromium di Playwright.\n`);
    browser = await chromium.launch({ headless: false });
  }

  const context: BrowserContext = await browser.newContext();
  let stopped = false;

  // La pagina chiama questa binding per mandarci ogni evento.
  await context.exposeBinding("__bddEmit", async (_source, payload: string) => {
    let event: RawEvent;
    try {
      event = JSON.parse(payload) as RawEvent;
    } catch {
      return;
    }
    if (event.type === "ready") {
      if (event.url) pages.add(event.url);
      return;
    }
    if (event.type === "stop") {
      stopped = true;
      return;
    }
    events.push(event);
  });

  // addInitScript, non evaluate: cosi' l'overlay rinasce a ogni navigazione.
  // Senza, la barra sparirebbe al primo cambio pagina — cioe' subito.
  await context.addInitScript({ content: DOM_PROBE_SOURCE });
  await context.addInitScript({ content: RECORDER_OVERLAY_SOURCE });

  const page = await context.newPage();
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) pages.add(frame.url());
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });

  console.log(
    `\nREGISTRAZIONE IN CORSO\n\n` +
      `  Esegui il test come lo faresti a mano. Nella barra in alto a destra:\n\n` +
      `    Fine intento   dopo ogni passo compiuto ("effettua il login", "aggiunge al carrello")\n` +
      `    Verifica       poi clicca l'elemento che dimostra che e' andata bene\n` +
      `    Nota           per lasciare un'indicazione a chi leggera' lo scenario\n\n` +
      `  Premi "Fine registrazione" quando hai finito, o chiudi il browser.\n`
  );

  // Si aspetta il pulsante di stop oppure la chiusura del browser.
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (stopped) {
        clearInterval(timer);
        resolve();
      }
    }, 300);
    browser.on("disconnected", () => {
      clearInterval(timer);
      resolve();
    });
  });

  await browser.close().catch(() => { /* gia' chiuso dal tester */ });

  const { intents, unlabelled } = group(events);

  return {
    startUrl: url,
    recordedAt: new Date(startedAt).toISOString(),
    durationSeconds: Math.round((Date.now() - startedAt) / 1000),
    pagesVisited: [...pages],
    summary: {
      intents: intents.length,
      steps: intents.reduce((n, i) => n + i.steps.length, 0),
      assertions: intents.reduce((n, i) => n + i.assertions.length, 0),
      unlabelled,
    },
    intents,
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function report(rec: Recording, outPath: string): void {
  const s = rec.summary;

  console.log(`\nREGISTRAZIONE CONCLUSA\n`);
  console.log(`  Durata          : ${rec.durationSeconds}s`);
  console.log(`  Pagine visitate : ${rec.pagesVisited.length}`);
  console.log(`  Intenti         : ${s.intents}`);
  console.log(`  Azioni          : ${s.steps}`);
  console.log(`  Verifiche       : ${s.assertions}\n`);

  for (const [i, intent] of rec.intents.entries()) {
    console.log(`  ${i + 1}. ${intent.label}`);
    console.log(`     ${intent.steps.length} azioni, ${intent.assertions.length} verifiche`);
  }

  if (s.assertions === 0) {
    console.log(
      `\n  ATTENZIONE: nessuna verifica registrata.\n` +
        `  Senza, lo scenario generato avra' solo Given e When: descrivera' cosa si fa,\n` +
        `  non cosa deve succedere. Vale la pena rifare la registrazione usando "Verifica".`
    );
  }
  if (s.unlabelled > 0) {
    console.log(
      `\n  NOTA: gli ultimi gesti non sono stati chiusi con "Fine intento".\n` +
        `  Sono conservati in un gruppo marcato come non chiuso, non buttati.`
    );
  }

  console.log(`\n  Scritto in: ${outPath}`);
  console.log(
    `\n  Passo successivo: questa traccia, piu' il dizionario della pagina\n` +
      `  (npm run scout) e il catalogo, sono l'input per generare lo scenario.\n` +
      `  La traccia contiene i valori digitati: reports/ e' gitignorato, tienilo li'.\n`
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
    return u.hostname.replace(/[^a-zA-Z0-9.-]/g, "-");
  } catch {
    return "recording";
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const url = args.find((a) => /^https?:\/\//i.test(a));

  if (!url) {
    console.error(
      "ERRORE: manca l'URL da cui partire.\n\n" +
        "  npm run record -- https://example.com\n" +
        "  npx ts-node scripts/record.ts https://example.com --out reports/recordings/login.json\n"
    );
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath =
    argValue(args, "--out") ??
    path.join("reports", "recordings", `${slugify(url)}-${stamp}.json`);
  const browserName = argValue(args, "--browser") ?? "chrome";

  const rec = await record(url, browserName);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(rec, null, 2), "utf-8");
  report(rec, outPath);
}

main().catch((err) => {
  console.error(`\nRegistrazione fallita: ${(err as Error).message}\n`);
  process.exit(1);
});
