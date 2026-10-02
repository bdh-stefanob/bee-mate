/**
 * app-finta.check.ts
 * ------------------
 * La catena intera — **registra, genera, esegui** — contro un'applicazione finta
 * ma con un browser vero.
 *
 * PERCHE' ESISTE
 * Uno scenario registrato su un'applicazione aziendale non passava, e la causa
 * non era una: la generazione perde pezzi in sei punti diversi. Da qui quei
 * punti non si potevano misurare — l'ambiente vero non e' raggiungibile, e una
 * pagina simulata a mano direbbe solo che il codice fa cio' che ho scritto.
 *
 * `bdd-app-finta` contiene gli stessi casi difficili, con dati inventati. Questo
 * controllo guida da codice gli stessi gesti che un tester farebbe a mano, con
 * lo **stesso cablaggio** del recorder (`lib/registrazione.ts`): quindi misura
 * il recorder, non una sua imitazione. Poi genera, poi esegue, e sulle perdite
 * non si limita a guardare se lo scenario passa: guarda **dove** si perde.
 *
 * DUE COSE VENGONO DICHIARATE, NON SIMULATE
 * I confini fra i passi e le verifiche sono le due informazioni che dai gesti
 * non si deducono: le dichiara il tester con la barra, e qui le dichiara il
 * controllo emettendo gli stessi eventi. Tutto il resto passa da click e
 * digitazioni veri, perche' e' esattamente la parte che si vuole misurare.
 *
 * LA FOTOCAMERA FINTA STA DA UN LATO SOLO, E NON E' UNA DIMENTICANZA
 * Qui, che registra, la fotocamera finta e' accesa: sta al posto della
 * fotocamera vera che il tester ha sul suo portatile. Nell'esecuzione dello
 * scenario no — ci pensa `world.ts`, ed e' proprio li' che manca. Accenderla
 * anche da questo lato nasconderebbe il difetto che il controllo deve mostrare.
 *
 * SE L'APPLICAZIONE FINTA NON C'E', IL CONTROLLO SI SALTA
 * Sta in un repository suo, fuori da questo. Chi clona solo questo repository
 * non deve vedere un controllo rosso per qualcosa che non ha.
 *
 * Uso:  npm run check:app-finta
 *       BDD_APP_FINTA=<cartella>  npm run check:app-finta
 */

import * as fs from "fs";
import * as net from "net";
import * as path from "path";
import * as http from "http";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import type { Browser, Page } from "@playwright/test";
import { avviaBrowser, MEDIA_FINTI } from "./browser";
import { apriRegistrazione, type RawEvent } from "./registrazione";
import { group } from "../record";
import type { Recording, ScoutResult, Step } from "./generation-contract";

// ---------------------------------------------------------------------------
// Esito
// ---------------------------------------------------------------------------

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};

/** La radice del repository, da `scripts/lib/`. */
const RADICE = path.resolve(__dirname, "..", "..");

/**
 * Dove cercarla, se nessuno lo dice.
 *
 * Accanto al repository, e un livello piu' su: su questa macchina il repository
 * sta in una sottocartella di progetto, e l'app finta e' fratella di quella.
 * Due posti e basta: oltre, si passa da `BDD_APP_FINTA` — cercarla a tentoni
 * nel disco troverebbe prima o poi la cartella sbagliata.
 */
const DOVE_CERCARLA = ["..", path.join("..", "..")];

function trovaAppFinta(): string | null {
  const indicato = process.env["BDD_APP_FINTA"];
  const candidati = indicato
    ? [indicato]
    : DOVE_CERCARLA.map((d) => path.resolve(RADICE, d, "bdd-app-finta"));
  for (const c of candidati) {
    if (fs.existsSync(path.join(c, "server.js"))) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Il server dell'applicazione finta
// ---------------------------------------------------------------------------

async function portaLibera(): Promise<number> {
  return new Promise((risolvi, rifiuta) => {
    const s = net.createServer();
    s.once("error", rifiuta);
    s.listen(0, "127.0.0.1", () => {
      const porta = (s.address() as net.AddressInfo).port;
      s.close(() => risolvi(porta));
    });
  });
}

async function rispondeSu(url: string, entroMs: number): Promise<boolean> {
  const scadenza = Date.now() + entroMs;
  while (Date.now() < scadenza) {
    const risponde = await new Promise<boolean>((risolvi) => {
      const req = http.get(url, (res) => {
        res.resume();
        risolvi((res.statusCode ?? 0) < 500);
      });
      req.on("error", () => risolvi(false));
      req.setTimeout(1000, () => {
        req.destroy();
        risolvi(false);
      });
    });
    if (risponde) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

// ---------------------------------------------------------------------------
// La registrazione, guidata da codice
// ---------------------------------------------------------------------------

/**
 * Un gesto del percorso.
 *
 * I nomi sono quelli che l'utente vede: nessun selettore, nessun id — lo stesso
 * vincolo che vale per gli step del progetto. Serve anche a una seconda cosa: se
 * un giorno l'applicazione finta cambia una parola, questo elenco e' il posto in
 * cui si legge.
 */
interface Gesto {
  /** Cosa fa, in una frase: compare nel referto quando qualcosa va storto. */
  cosa: string;
  fai: (page: Page) => Promise<void>;
}

const ATTESA = 5000;

/**
 * Le etichette dei passi, distinte da quelle di qualunque scenario del repository.
 *
 * Un tester scriverebbe "the user complete the order", ed e' proprio la frase che
 * uno scenario gia' salvato usa: Cucumber trova due definizioni e si rifiuta di
 * partire, quindi il controllo misurerebbe la collisione invece delle perdite.
 * Nominare l'app finta rende la frase inconfondibile senza cambiare cosa descrive.
 */
const ETICHETTE = {
  vetrina: "the user starts from the demo brochure",
  ordine: "the user orders a demo plan and picks it up in a pharmacy",
};

function percorso(base: string): Array<{ etichetta: string; gesti: Gesto[] }> {
  const premi = (nome: string, cosa?: string): Gesto => ({
    cosa: cosa ?? `premi "${nome}"`,
    fai: async (page) => {
      const pulsante = page.getByRole("button", { name: nome, exact: true }).first();
      if (await pulsante.count()) {
        await pulsante.click({ timeout: ATTESA });
        return;
      }
      await page.getByRole("link", { name: nome, exact: true }).first().click({ timeout: ATTESA });
    },
  });

  return [
    {
      etichetta: ETICHETTE.vetrina,
      gesti: [
        {
          cosa: "apre la vetrina",
          fai: async (page) => {
            await page.goto(base, { waitUntil: "domcontentloaded" });
          },
        },
        // Il banner dei cookie: un gesto che il tester fa perche' c'e', non
        // perche' faccia parte del test. Si registra — e' un click vero — ed e'
        // il generatore che non deve farne un passo.
        premi("Accept All"),
        premi("Weight Loss"),
      ],
    },
    {
      etichetta: ETICHETTE.ordine,
      gesti: [
        premi("Get started"),
        premi("With Coaching £121"),
        {
          cosa: "accetta le informazioni importanti",
          fai: async (page) => {
            await page.getByRole("checkbox").first().check({ timeout: ATTESA });
          },
        },
        premi("Continue"),
        premi("Start of the Questionnaire Section - Move along"),
        premi("No GP"),
        {
          // Il campo il cui nome accessibile e' il suo valore ("0"): la domanda
          // sta nel titolo della pagina, non nel campo.
          cosa: "risponde al peso",
          fai: async (page) => {
            const campo = page.getByRole("spinbutton").first();
            await campo.fill("100", { timeout: ATTESA });
            await campo.blur();
          },
        },
        premi("Next"),
        premi("Yes, pick up in store"),
        {
          cosa: "cerca le farmacie per postcode",
          fai: async (page) => {
            const campo = page.getByPlaceholder("Search by postcode");
            await campo.fill("NG1 1AA", { timeout: ATTESA });
            // Invio: i pin compaiono solo dopo. Il recorder non registra i tasti
            // premuti, ed e' uno dei pezzi che si perdono.
            await campo.press("Enter");
          },
        },
        {
          cosa: "scegle un pin sulla mappa",
          fai: async (page) => {
            const pin = page.locator(".custom-marker").first();
            await pin.waitFor({ state: "visible", timeout: ATTESA });
            await pin.click({ timeout: ATTESA });
          },
        },
        premi("Select Pharmacy"),
        premi("Place Order"),
        premi("Open camera"),
        // Foto, salva, conferma: due volte. Lo stesso gesto ripetuto su una
        // pagina che non naviga mai.
        premi("Take Picture", "prima foto"),
        premi("Save", "salva la prima foto"),
        premi("That's me", "conferma la prima foto"),
        premi("Take Picture", "seconda foto"),
        premi("Save", "salva la seconda foto"),
        premi("That's me", "conferma la seconda foto"),
        premi("Submit"),
        premi("2 Secure messages"),
      ],
    },
  ];
}

interface EsitoRegistrazione {
  recording: Recording;
  dizionari: Map<string, ScoutResult>;
  /** I gesti che non e' stato possibile compiere: l'app finta non e' come credevamo. */
  nonRiusciti: string[];
}

async function registra(base: string, browser: Browser): Promise<EsitoRegistrazione> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: [...MEDIA_FINTI.permissions],
  });
  const sessione = await apriRegistrazione(context, { attesaInventarioMs: 300 });
  const page = sessione.page;
  const nonRiusciti: string[] = [];
  const inizio = Date.now();

  /** Gli eventi che la barra manda quando il tester preme i suoi pulsanti. */
  const dichiara = async (evento: Omit<RawEvent, "at">): Promise<void> => {
    await page.evaluate(
      (payload: string) =>
        (window as unknown as { __bddEmit(p: string): Promise<unknown> }).__bddEmit(payload),
      JSON.stringify({ ...evento, at: Date.now() })
    );
  };

  for (const intento of percorso(base)) {
    for (const gesto of intento.gesti) {
      try {
        await gesto.fai(page);
      } catch (err) {
        nonRiusciti.push(`${gesto.cosa}: ${(err as Error).message.split("\n")[0]}`);
      }
      // Il tempo che passa fra un gesto e l'altro quando lo fa una persona:
      // senza, l'inventario non fa in tempo a vedere nessuna pagina, e il
      // controllo misurerebbe la propria fretta invece dello strumento.
      await page.waitForTimeout(450);
    }
    await dichiara({ type: "intent", label: intento.etichetta });
  }

  // La verifica: l'elemento che prova che e' andata bene.
  await dichiara({ type: "assert", role: "heading", name: "Secure messages", text: "Secure messages" });

  sessione.ferma();
  await sessione.inventariaOra();
  await context.close();

  const { intents, unlabelled } = group(sessione.eventi);
  return {
    recording: {
      startUrl: base,
      recordedAt: new Date(inizio).toISOString(),
      durationSeconds: Math.round((Date.now() - inizio) / 1000),
      pagesVisited: [...sessione.pagine],
      summary: {
        intents: intents.length,
        steps: intents.reduce((n, i) => n + i.steps.length, 0),
        assertions: intents.reduce((n, i) => n + i.assertions.length, 0),
        unlabelled,
      },
      intents,
    },
    dizionari: sessione.dizionari,
    nonRiusciti,
  };
}

// ---------------------------------------------------------------------------
// Generazione ed esecuzione
// ---------------------------------------------------------------------------

const SLUG = "app-finta";
const LAVORO = path.join("reports", "check-app-finta");

function tsNode(script: string, args: string[]): { status: number | null; out: string } {
  const esito = spawnSync(
    process.execPath,
    [path.join("node_modules", "ts-node", "dist", "bin.js"), script, ...args],
    { encoding: "utf-8", cwd: RADICE }
  );
  return { status: esito.status, out: `${esito.stdout ?? ""}${esito.stderr ?? ""}` };
}

interface Manifesto {
  files: Array<{ path: string }>;
  gaps: Array<{ kind: string; where: string; detail: string }>;
  /** I gesti su un avviso noto, che il generatore non ha fatto diventare passi. */
  avvisi?: Array<{ where: string; role: string; name: string; avviso: string }>;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const app = trovaAppFinta();
  if (!app) {
    console.log(
      `\nSALTATO: app finta non trovata.\n\n` +
        `  La cerco in ${path.resolve(RADICE, "..", "bdd-app-finta")}, oppure dove dice BDD_APP_FINTA.\n` +
        `  Sta in un repository suo, fuori da questo. Senza, questo controllo non ha\n` +
        `  niente da provare — e non e' un fallimento.\n`
    );
    return;
  }

  const porta = await portaLibera();
  const base = `http://127.0.0.1:${porta}`;
  console.log(`\n--- app finta: ${app} su ${base} ---\n`);

  let server: ChildProcess | null = null;
  try {
    server = spawn(process.execPath, [path.join(app, "server.js"), String(porta)], {
      cwd: app,
      stdio: "ignore",
    });
    if (!(await rispondeSu(`${base}/`, 10_000))) {
      fail("l'app finta risponde", `nessuna risposta su ${base}/ entro 10 s`);
      return;
    }
    ok("l'app finta risponde");

    // ── 1. REGISTRA ────────────────────────────────────────────────────────
    const { browser } = await avviaBrowser({
      headless: true,
      // La fotocamera finta, da questo lato solo: vedi la nota in testa al file.
      args: [...MEDIA_FINTI.args],
    });
    let esito: EsitoRegistrazione;
    try {
      esito = await registra(base, browser);
    } finally {
      await browser.close().catch(() => { /* gia' chiuso */ });
    }

    console.log(
      `  ${esito.recording.summary.steps} gesti registrati in ${esito.recording.intents.length} intenti, ` +
        `${esito.dizionari.size} pagine inventariate\n`
    );
    if (esito.nonRiusciti.length > 0) {
      fail(
        `${esito.nonRiusciti.length} gesti non compiuti: il percorso non e' quello che credevo`,
        esito.nonRiusciti.join("\n       ")
      );
    } else {
      ok("tutti i gesti del percorso sono stati compiuti");
    }

    // I file di lavoro stanno sotto reports/, gitignorato.
    const dirLavoro = path.join(RADICE, LAVORO);
    fs.rmSync(dirLavoro, { recursive: true, force: true });
    const dirScout = path.join(dirLavoro, "scout");
    fs.mkdirSync(dirScout, { recursive: true });
    const fileRegistrazione = path.join(dirLavoro, "registrazione.json");
    fs.writeFileSync(fileRegistrazione, JSON.stringify(esito.recording, null, 2), "utf-8");
    for (const [chiave, d] of esito.dizionari) {
      const nome = chiave.replace(/[^a-zA-Z0-9.-]+/g, "-").replace(/^-|-$/g, "");
      fs.writeFileSync(path.join(dirScout, `${nome}.json`), JSON.stringify(d, null, 2), "utf-8");
    }

    console.log("\n--- cosa la registrazione ha visto ---\n");
    verificaRegistrazione(esito);

    // ── 2. GENERA ──────────────────────────────────────────────────────────
    const manifestoPath = path.join(dirLavoro, "manifesto.json");
    const generazione = tsNode(path.join("scripts", "generate.ts"), [
      path.relative(RADICE, fileRegistrazione),
      `name=${SLUG}`,
      `scout=${path.relative(RADICE, dirScout)}`,
      `manifest=${path.relative(RADICE, manifestoPath)}`,
      "no-catalog",
    ]);
    if (generazione.status !== 0 || !fs.existsSync(manifestoPath)) {
      fail("la generazione riesce", generazione.out.split("\n").slice(-12).join("\n       "));
      return;
    }
    ok("la generazione riesce");
    const manifesto = JSON.parse(fs.readFileSync(manifestoPath, "utf-8")) as Manifesto;

    console.log("\n--- cosa il generatore ha prodotto ---\n");
    verificaGenerazione(manifesto, esito.recording);

    console.log("\n--- la fotocamera del browser che esegue ---\n");
    await verificaFotocamera(base);

    // ── 3. ESEGUI ──────────────────────────────────────────────────────────
    console.log("\n--- lo scenario generato, eseguito ---\n");
    const feature = `src/features/generated/${SLUG}.feature`;
    if (!fs.existsSync(path.join(RADICE, feature))) {
      fail("lo scenario generato esiste", `${feature} non c'e'`);
      return;
    }
    const esecuzione = spawnSync(
      process.execPath,
      [path.join("node_modules", "@cucumber", "cucumber", "bin", "cucumber.js")],
      {
        encoding: "utf-8",
        cwd: RADICE,
        env: {
          ...process.env,
          BASE_URL: base,
          BDD_PATHS: feature,
          BDD_TAGS: "",
          // La suite non compila per un file generato da una versione vecchia del
          // generatore, che non e' di questa registrazione: si traspila senza
          // controllare i tipi. `tsc` resta il giudice dei tipi, qui si misura
          // l'esecuzione.
          TS_NODE_TRANSPILE_ONLY: "1",
          BDD_HTML: path.join(LAVORO, "cucumber.html"),
        },
      }
    );
    const uscita = `${esecuzione.stdout ?? ""}${esecuzione.stderr ?? ""}`;
    fs.writeFileSync(path.join(dirLavoro, "esecuzione.txt"), uscita, "utf-8");
    if (esecuzione.status === 0) {
      ok("lo scenario generato passa contro l'app finta");
    } else {
      fail(
        "lo scenario generato passa contro l'app finta",
        righeUtili(uscita).join("\n       ") +
          `\n       (per intero: ${path.join(LAVORO, "esecuzione.txt")})`
      );
    }

    // I file generati non restano in src: li' li rigenera il tester, e uno
    // scenario che punta a un server spento farebbe fallire `npm test` a chi non
    // c'entra niente. Se servono, stanno nella cartella di lavoro.
    conservaEPulisci(manifesto, dirLavoro);
  } finally {
    if (server && !server.killed) server.kill();
  }
}

/**
 * Il punto in cui lo scenario si e' rotto.
 *
 * Cucumber mette il riepilogo in fondo, e il riepilogo ("1 scenario, 1 failed")
 * non dice niente: cio' che serve e' il passo che e' caduto e il locator che
 * aspettava. Si parte da "Failures:" e si tagliano i codici di colore, che in un
 * referto diventano caratteri illeggibili.
 */
function righeUtili(uscita: string): string[] {
  const righe = uscita
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split(/\r?\n/)
    .map((r) => r.trimEnd())
    .filter((r) => r.trim());
  const primo = righe.findIndex((r) => /^Failures:/.test(r));
  const utili = primo >= 0 ? righe.slice(primo + 1) : righe;
  const fine = utili.findIndex((r) => /^\d+ scenario/.test(r));
  return (fine > 0 ? utili.slice(0, fine) : utili).slice(0, 18);
}

// ---------------------------------------------------------------------------
// La fotocamera (perdita n. 5)
// ---------------------------------------------------------------------------

/**
 * Una pagina che chiede `getUserMedia` non si automatizza senza una fotocamera.
 *
 * In un browser senza telecamera `getUserMedia` rifiuta, e la pagina resta a
 * guardare: non compare ne' "Take Picture" ne' niente da cliccare. Il test
 * fallisce con "elemento non trovato", che e' il sintomo piu' lontano dalla
 * causa che si possa immaginare.
 *
 * Due casi, perche' uno solo non dimostrerebbe niente: con i media finti la
 * fotocamera si apre, senza non si apre. Il secondo e' quello che rende il
 * primo una misura invece di un'affermazione.
 *
 * E un terzo caso, statico: che sia `world.ts` — il browser con cui girano
 * davvero gli scenari — a chiederli. Avere la costante giusta e non usarla
 * la' e' esattamente il difetto.
 */
async function verificaFotocamera(base: string): Promise<void> {
  const apre = async (conMediaFinti: boolean): Promise<string> => {
    const { browser } = await avviaBrowser({
      headless: true,
      ...(conMediaFinti ? { args: [...MEDIA_FINTI.args] } : {}),
    });
    try {
      const context = await browser.newContext(
        conMediaFinti ? { permissions: [...MEDIA_FINTI.permissions] } : {}
      );
      const page = await context.newPage();
      await page.goto(`${base}/camera/visit/`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Open camera" }).click({ timeout: ATTESA });
      const aperta = await page
        .getByRole("button", { name: "Take Picture" })
        .waitFor({ state: "visible", timeout: 3000 })
        .then(() => true, () => false);
      if (aperta) return "";
      const avviso = (await page.getByRole("alert").textContent().catch(() => ""))?.trim();
      return avviso || "la fotocamera non si e' aperta, e la pagina non dice perche'";
    } finally {
      await browser.close().catch(() => { /* gia' chiuso */ });
    }
  };

  const con = await apre(true);
  if (con === "") ok("con i media finti la fotocamera si apre");
  else fail("con i media finti la fotocamera si apre", con);

  const senza = await apre(false);
  if (senza !== "") ok(`senza i media finti non si apre: la prova misura qualcosa (${senza})`);
  else fail("senza i media finti non si apre", "si e' aperta comunque: questa prova non misura niente");

  // Il browser degli scenari lo apre world.ts: se non chiede i media finti, la
  // costante giusta non serve a nessuno.
  const world = fs.readFileSync(path.join(RADICE, "src", "support", "world.ts"), "utf-8");
  if (/MEDIA_FINTI/.test(world)) {
    ok("world.ts apre il browser degli scenari con i media finti");
  } else {
    fail(
      "world.ts apre il browser degli scenari con i media finti",
      `src/support/world.ts non nomina MEDIA_FINTI: gli scenari girano in un browser senza ` +
        `fotocamera, e una pagina che chiede getUserMedia non arriva da nessuna parte.`
    );
  }
}

// ---------------------------------------------------------------------------
// Le perdite, una per una
// ---------------------------------------------------------------------------

function verificaRegistrazione(esito: EsitoRegistrazione): void {
  const gesti: Step[] = esito.recording.intents.flatMap((i) => i.steps);
  const su = (frammento: string): Step[] => gesti.filter((s) => (s.url ?? "").includes(frammento));
  const nomiDi = (chiave: string): Set<string> => {
    const voce = [...esito.dizionari.entries()].find(([k]) => k.includes(chiave));
    return new Set((voce?.[1].components ?? []).map((c) => c.name));
  };

  // n. 1 — il click senza ruolo interattivo: il pin della mappa.
  const sullaMappa = su("/pharmacy-map-selection");
  const pin = sullaMappa.filter((s) => s.action === "click");
  const soloSelect = pin.every((s) => s.name === "Select Pharmacy");
  if (pin.length > 0 && !soloSelect) {
    ok(`il click sul pin della mappa e' registrato (${pin.map((p) => `${p.role} "${p.name}"`).join(", ")})`);
  } else {
    fail(
      "il click sul pin della mappa e' registrato",
      `sulla mappa ho registrato solo ${JSON.stringify(sullaMappa.map((s) => `${s.action} ${s.role} "${s.name}"`))}. ` +
        `Il pin e' un div senza ruolo: closestInteractive lo scarta, e senza di lui ` +
        `"Select Pharmacy" non esisterebbe nemmeno.`
    );
  }

  // Il contesto: la domanda a cui si risponde, e l'essere dentro un dialog.
  // Un campo il cui nome accessibile e' il suo valore ("0") non dice niente, e
  // senza la domanda il passo generato non si lascia leggere da nessuno.
  const campo = gesti.find((s) => s.action === "fill" && (s.url ?? "").includes("/questions/"));
  if (campo?.contesto?.intestazione) {
    ok(`il campo numerico porta la domanda a cui risponde («${campo.contesto.intestazione}»)`);
  } else {
    fail(
      "il campo numerico porta la domanda a cui risponde",
      `il gesto registrato e' ${JSON.stringify(campo)}: il nome accessibile e' il valore, ` +
        `e senza la domanda non si capisce cosa si sta compilando.`
    );
  }

  const cookie = gesti.find((s) => s.name === "Accept All");
  if (cookie?.contesto?.dialog) ok(`il gesto dentro un dialog lo dichiara («${cookie.contesto.dialog}»)`);
  else fail("il gesto dentro un dialog lo dichiara", `${JSON.stringify(cookie)}`);

  // n. 2 — lo scout dopo ogni azione: i componenti che compaiono senza navigare.
  const nomiFotocamera = nomiDi("/camera/");
  const mancanti = ["Take Picture", "Save", "That's me"].filter((n) => !nomiFotocamera.has(n));
  if (mancanti.length === 0) {
    ok("il dizionario della fotocamera contiene i componenti comparsi senza navigazione");
  } else {
    fail(
      "il dizionario della fotocamera contiene i componenti comparsi senza navigazione",
      `mancano ${JSON.stringify(mancanti)}; nel dizionario ci sono ${JSON.stringify([...nomiFotocamera])}. ` +
        `L'inventario parte solo su framenavigated, e dopo "Open camera" la pagina non naviga.`
    );
  }

  const nomiMappa = nomiDi("/pharmacy-map-selection");
  if (nomiMappa.has("Select Pharmacy")) {
    ok("il dizionario della mappa contiene «Select Pharmacy»");
  } else {
    fail(
      "il dizionario della mappa contiene «Select Pharmacy»",
      `nel dizionario ci sono ${JSON.stringify([...nomiMappa])}: il pulsante esiste solo dopo aver ` +
        `scelto un pin, e nessuna navigazione lo fa inventariare.`
    );
  }
}

function verificaGenerazione(manifesto: Manifesto, recording: Recording): void {
  const percorsi = manifesto.files.map((f) => f.path.replace(/\\/g, "/"));
  const leggi = (p: string | undefined): string =>
    p && fs.existsSync(path.join(RADICE, p)) ? fs.readFileSync(path.join(RADICE, p), "utf-8") : "";

  const pagine = percorsi.filter((p) => p.includes("/pages/generated/"));
  const glue = leggi(percorsi.find((p) => p.includes("/steps/generated/")));
  const gherkin = leggi(percorsi.find((p) => p.endsWith(".feature")));

  // n. 3 — le tre domande non si fondono in una Page Object sola.
  const indirizziDomande = new Set(
    recording.intents
      .flatMap((i) => i.steps)
      .map((s) => s.url ?? "")
      .filter((u) => u.includes("/questions/"))
      .map((u) => new URL(u).pathname)
  );
  const domande = pagine.filter((p) => /question/i.test(p));
  if (indirizziDomande.size > 1 && domande.length >= indirizziDomande.size) {
    ok(`le ${indirizziDomande.size} domande restano ${domande.length} Page Object`);
  } else {
    fail(
      `le ${indirizziDomande.size} domande restano Page Object distinte`,
      `${indirizziDomande.size} indirizzi (${[...indirizziDomande].join(", ")}) sono diventati ` +
        `${domande.length} Page Object (${domande.join(", ") || "nessuna"}). Il segmento numerico e' ` +
        `letto come identificativo: una pagina sola prende l'unione dei componenti di tutte.`
    );
  }

  // n. 4 — il cookie banner non e' un passo dello scenario.
  if (/acceptall/i.test(glue)) {
    fail(
      "il banner dei cookie non diventa un passo",
      `la glue generata chiama un metodo per «Accept All». Il banner compare quando vuole: un passo ` +
        `che lo clicca fallisce ogni volta che non c'e'. Va fra gli AVVISI (src/support/avvisi.ts), ` +
        `non fra i gesti.`
    );
  } else {
    ok("il banner dei cookie non diventa un passo");
  }

  // E non si perde in silenzio: un gesto scartato che nessuno dichiara e' un
  // gesto che, il giorno in cui serviva, non si sa dove sia finito.
  const dichiarati = manifesto.avvisi ?? [];
  if (dichiarati.some((a) => /accept all/i.test(a.name))) {
    ok("il gesto sull'avviso e' dichiarato, non perso in silenzio");
  } else {
    fail(
      "il gesto sull'avviso e' dichiarato, non perso in silenzio",
      `il manifesto non nomina nessun gesto scartato perche' era un avviso: ${JSON.stringify(dichiarati)}`
    );
  }

  // n. 3b — la risposta del questionario non e' murata nello step.
  if (/\("100"\)/.test(glue)) {
    fail(
      "la risposta al questionario non e' scritta dentro lo step",
      `nella glue c'e' il valore "100". Una risposta e' un dato del caso di prova: va in un parametro ` +
        `dello step o in una ricetta, non murata nel codice.`
    );
  } else {
    ok("la risposta al questionario non e' scritta dentro lo step");
  }

  // Il contesto registrato serve a chi scrive la frase Gherkin: se non arriva
  // fino al codice generato, e' un dato raccolto e buttato.
  if (glue.includes("What is your weight in kg?")) {
    ok("la domanda del questionario arriva nel codice generato");
  } else {
    fail(
      "la domanda del questionario arriva nel codice generato",
      `la glue non nomina la domanda: il passo compila un campo che si chiama "0", e chi deve ` +
        `scrivere la frase Gherkin non ha modo di sapere cosa sia.`
    );
  }

  if (gherkin.includes(ETICHETTE.ordine)) {
    ok("lo scenario porta le parole del tester");
  } else {
    fail("lo scenario porta le parole del tester", "nel feature non trovo l'etichetta dell'intento");
  }

  if (manifesto.gaps.length > 0) {
    console.log(`\n  il generatore dichiara ${manifesto.gaps.length} buchi:`);
    const perTipo = new Map<string, number>();
    for (const g of manifesto.gaps) perTipo.set(g.kind, (perTipo.get(g.kind) ?? 0) + 1);
    for (const [tipo, n] of perTipo) console.log(`    ${tipo}: ${n}`);
  }
}

/** I file generati si conservano nella cartella di lavoro e si togliono da src. */
function conservaEPulisci(manifesto: Manifesto, dirLavoro: string): void {
  const destinazione = path.join(dirLavoro, "generato");
  for (const f of manifesto.files) {
    const assoluto = path.join(RADICE, f.path);
    if (!fs.existsSync(assoluto)) continue;
    const dove = path.join(destinazione, f.path.replace(/\\/g, "/").replace(/^src\//, ""));
    fs.mkdirSync(path.dirname(dove), { recursive: true });
    fs.copyFileSync(assoluto, dove);
    fs.rmSync(assoluto);
  }
  // Una cartella rimasta vuota (`pages/generated/127.0.0.1`) non da' fastidio, ma
  // si toglie: cosi' `npm test` non trova niente di questo controllo.
  for (const f of manifesto.files) {
    const dir = path.dirname(path.join(RADICE, f.path));
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  }
  console.log(`\n  i file generati sono in ${path.relative(RADICE, destinazione)} (fuori da src, fuori da git)`);
}

main()
  .then(() => {
    console.log(failures === 0 ? `\nTutti i controlli OK.\n` : `\n${failures} controlli FALLITI\n`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error(`\nIl controllo non e' riuscito a girare: ${(err as Error).message}\n`);
    process.exit(1);
  });
