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
 *   npm run record -- clinic                (bersaglio configurato in bdd-targets.json)
 *   npm run record -- https://example.com   (url diretto)
 *
 * Con un bersaglio configurato parte gia' autenticato, se prima si e' fatto
 * `npm run session -- clinic`: il login si fa una volta e per giorni non si rifa'.
 *
 * Flag:
 *   --out PATH     file di output (default reports/recordings/<slug>-<ts>.json)
 *   --browser NAME 'chrome' usa il Chrome installato (default), 'chromium' quello di Playwright
 *
 * La sessione finisce quando il tester preme "Fine registrazione" o chiude il
 * browser. L'output sta sotto reports/, gitignorato: una registrazione su
 * un'app aziendale contiene nomi di funzionalita' reali e dati digitati.
 */

import { type Browser, type BrowserContext } from "@playwright/test";
import * as readline from "readline/promises";
import { avviaBrowser, noteRipiego } from "./lib/browser";
import {
  proponiGruppi, descriviGesto, descriviPagina, etichettaProposta,
} from "./lib/labelling";
import * as fs from "fs";
import * as path from "path";
import { DOM_PROBE_SOURCE } from "./lib/dom-probe";
import { RECORDER_OVERLAY_SOURCE } from "./lib/recorder-overlay";
import { judge } from "./lib/stability";
import type { Step, Assertion, Intent, Recording } from "./lib/generation-contract";
import { pageIdentity } from "./lib/generate-core";
import { inventory, mergeInventories } from "./lib/inventory";
import type { ScoutResult } from "./lib/generation-contract";
import { resolveTarget, hasSession, sessionAgeHours, type Target } from "./lib/targets";
import { argValue, hasFlag, positionals } from "./lib/args";

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

// I tipi della traccia NON si dichiarano qui: vengono dal contratto condiviso,
// che li legge anche il generatore. Vedi scripts/lib/generation-contract.ts

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
/**
 * Su quale pagina l'intento e' cominciato e su quale e' finito.
 *
 * Le due coincidono quasi sempre. Quando non coincidono, l'intento ha cambiato
 * pagina — ed e' esattamente il punto in cui il codice generato deve restituire
 * la Page Object successiva invece di `void`. E' un dato osservato, non una
 * regola: chi genera non deve indovinare dove finisce una pagina.
 */
function boundaries(intent: Intent): { pageUrl?: string; endUrl?: string } {
  const urls = [...intent.steps, ...intent.assertions]
    .map((e) => e.url)
    .filter((u): u is string => Boolean(u));
  if (urls.length === 0) return {};

  const first = urls[0]!;
  const last = urls[urls.length - 1]!;
  return { pageUrl: first, ...(last !== first ? { endUrl: last } : {}) };
}

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
    Object.assign(current, boundaries(current));
    intents.push(current);
    current = { label: "", steps: [], assertions: [], notes: [] };
  };

  for (const e of events) {
    switch (e.type) {
      case "action": {
        const step: Step = {
          action: e.action ?? "click",
          role: e.role ?? "",
          name: e.name ?? "",
          ...(e.value !== undefined ? { value: e.value } : {}),
          ...(e.secret ? { secret: true } : {}),
          ...(e.url ? { url: e.url } : {}),
        };
        // Un campo compilato piu' volte nello stesso intento vale per il suo
        // valore FINALE: chi corregge un refuso non vuole ritrovarsi il refuso
        // nello scenario, e chi lo legge non capirebbe perche' lo stesso campo
        // viene riempito due volte. Si sostituisce invece di accodare.
        const previous =
          step.action === "fill"
            ? current.steps.findIndex(
                (s) => s.action === "fill" && s.role === step.role && s.name === step.name
              )
            : -1;
        if (previous >= 0) current.steps[previous] = step;
        else current.steps.push(step);
        break;
      }
      case "assert":
        current.assertions.push({
          role: e.role ?? "",
          name: e.name ?? "",
          ...(e.text ? { text: e.text } : {}),
          ...(e.url ? { url: e.url } : {}),
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
    Object.assign(current, boundaries(current));
    intents.push(current);
    unlabelled = 1;
  }

  return { intents, unlabelled };
}

// ---------------------------------------------------------------------------
// Sessione
// ---------------------------------------------------------------------------

/**
 * Il risultato di una sessione: la traccia E i dizionari delle pagine viste.
 *
 * Vengono insieme perche' nascono insieme, ed e' la scoperta che ha cambiato il
 * metodo: una pagina inventariata a freddo puo' mostrare uno stato diverso da
 * quello attraversato — `/questions/3` dipende dalle risposte date prima, un
 * modale cambia cosa e' raggiungibile, una lista dipende dai dati dell'utente.
 * Il dizionario preso mentre si registra descrive la pagina che il tester ha
 * davvero avuto davanti, e per generare il codice di QUELLA sessione e' l'unico
 * che vale.
 */
interface Sessione {
  recording: Recording;
  dizionari: Map<string, ScoutResult>;
}

async function record(target: Target, browserName: string): Promise<Sessione> {
  const url = target.url;
  const events: RawEvent[] = [];
  const pages = new Set<string>();
  const startedAt = Date.now();

  // Finestra massimizzata: il tester deve vedere l'applicazione come la vede
  // ogni giorno, non in un rettangolo in mezzo allo schermo.
  const launchArgs = { headless: false, args: ["--start-maximized"] };

  // Il ripiego fra i browser disponibili sta in `lib/browser.ts`, che li prova
  // in ordine — a partire da quello chiesto con --browser — e dice quale ha
  // usato. Il tester non deve sapere quale browser sta pilotando, ma non deve
  // nemmeno scoprirlo per caso: un browser diverso in silenzio e' peggio.
  const avvio = await avviaBrowser(launchArgs, browserName);
  const browser: Browser = avvio.browser;
  const nota = noteRipiego(avvio);
  if (nota) console.log(`\n${nota}`);

  // viewport: null fa usare alla pagina la dimensione REALE della finestra.
  // Senza, Playwright impone 1280x720 a prescindere da quanto e' grande la
  // finestra: il contenuto resta in un riquadro con bande vuote intorno, e —
  // molto peggio — a 1280 di larghezza parecchi layout responsive passano alla
  // versione ridotta, con il menu a panino al posto della barra estesa. Il
  // tester registrerebbe componenti che l'utente vero non vede mai.
  // Sessione salvata, se c'e': si evita di rifare il login a ogni registrazione.
  //
  // L'eta' viene detta prima di partire perche' una sessione scaduta si
  // manifesta con l'applicazione che rimanda al login a meta' registrazione —
  // un sintomo che non assomiglia per niente alla causa, e che porterebbe a
  // cercare il problema nel recorder.
  const sessionAge = sessionAgeHours(target);
  const context: BrowserContext = await browser.newContext({
    viewport: null,
    ...(hasSession(target) ? { storageState: target.session } : {}),
  });
  if (sessionAge !== null) {
    console.log(
      `  Sessione salvata ${sessionAge} ore fa.` +
        (sessionAge > 24
          ? `\n  Se l'applicazione ti rimanda al login, rifalla:  npm run session -- ${target.name}`
          : "")
    );
  }
  let stopped = false;

  /**
   * La pagina chiama questa binding per mandarci ogni evento, e riceve indietro
   * i totali correnti.
   *
   * Il ritorno non e' un dettaglio: l'overlay viene reiniettato a ogni
   * navigazione, quindi un contatore tenuto nella pagina ripartirebbe da zero
   * appena si cambia pagina. Il tester farebbe il login, vedrebbe "0 azioni" e
   * concluderebbe che non sta registrando. Il totale vero lo conosce solo questo
   * lato, che accumula per tutta la sessione: glielo rimandiamo indietro.
   */
  const counts = (): { actions: number; intents: number; assertions: number } => ({
    actions: events.filter((e) => e.type === "action").length,
    intents: events.filter((e) => e.type === "intent").length,
    // Mostrato anche questo nella barra: senza, il tester preme "Verifica",
    // vede il click bloccato e non ha modo di sapere se e' stato registrato.
    assertions: events.filter((e) => e.type === "assert").length,
  });

  await context.exposeBinding("__bddEmit", async (source, payload: string) => {
    let event: RawEvent;
    try {
      event = JSON.parse(payload) as RawEvent;
    } catch {
      return counts();
    }
    if (event.type === "ready") {
      // about:blank e' la pagina su cui nasce ogni scheda: non l'ha visitata nessuno.
      if (event.url && event.url !== "about:blank") pages.add(event.url);
      return counts();
    }
    if (event.type === "stop") {
      stopped = true;
      return counts();
    }
    // L'URL lo stampiglia Node, non la pagina: `page.url()` e' vero anche dopo
    // un redirect che la pagina non ha avuto tempo di raccontare. Senza, non si
    // sa a quale Page Object appartiene il gesto, e un intento che attraversa
    // due pagine finirebbe tutto nella prima.
    event.url = source.page.url();
    events.push(event);
    return counts();
  });

  // addInitScript, non evaluate: cosi' l'overlay rinasce a ogni navigazione.
  // Senza, la barra sparirebbe al primo cambio pagina — cioe' subito.
  await context.addInitScript({ content: DOM_PROBE_SOURCE });
  await context.addInitScript({ content: RECORDER_OVERLAY_SOURCE });

  const page = await context.newPage();
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && frame.url() !== "about:blank") pages.add(frame.url());
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });

  // LA BARRA E' COMPARSA DAVVERO?
  //
  // Finora non c'era modo di saperlo, e le due cause davano lo stesso risultato:
  // una registrazione con zero intenti e zero verifiche puo' voler dire che il
  // tester non ha premuto i pulsanti, oppure che i pulsanti non c'erano. La
  // prima si risolve spiegando, la seconda no — e distinguerle a posteriori,
  // guardando il file, e' impossibile.
  //
  // Il montaggio dell'overlay puo' fallire per motivi che non dipendono da noi:
  // una Content-Security-Policy severa, un'applicazione che ripulisce il body,
  // un z-index che la copre. Chiederlo al DOM costa una riga.
  const barraPresente = await page
    .evaluate(() => Boolean(document.getElementById("__bdd_recorder_host")))
    .catch(() => false);

  console.log(
    `\nREGISTRAZIONE IN CORSO\n\n` +
      `  Esegui il test come lo faresti a mano. Nella barra in alto a destra:\n\n` +
      `    Fine intento   dopo ogni passo compiuto ("effettua il login", "aggiunge al carrello")\n` +
      `    Verifica       poi clicca l'elemento che dimostra che e' andata bene\n` +
      `    Nota           per lasciare un'indicazione a chi leggera' lo scenario\n\n` +
      `  Premi "Fine registrazione" quando hai finito, o chiudi il browser.\n`
  );

  if (!barraPresente) {
    console.log(
      `  ATTENZIONE: la barra NON e' comparsa su questa pagina.\n\n` +
        `  I gesti verranno registrati lo stesso, ma senza i pulsanti non puoi\n` +
        `  dichiarare i confini fra un passo e l'altro ne' le verifiche — e sono\n` +
        `  le due sole cose che dai gesti non si deducono.\n\n` +
        `  Cause tipiche: una Content-Security-Policy severa, oppure\n` +
        `  l'applicazione che ripulisce il body al primo caricamento.\n` +
        `  Provala su un'altra pagina della stessa app prima di concludere che\n` +
        `  non funziona: spesso e' solo la pagina di login a essere blindata.\n`
    );
  } else {
    console.log(`  Barra presente. In alto a destra, trascinabile.\n`);
  }

  // ── L'inventario, preso mentre si registra ────────────────────────────────
  //
  // A ogni pagina che si assesta si inventaria cio' che c'e'. Con un ritardo, e
  // annullabile: su un'applicazione a pagina singola le navigazioni arrivano a
  // raffica, e inventariare a ogni cambio di rotta rallenterebbe chi sta
  // lavorando — che e' la cosa da non fare mai, perche' un tester rallentato
  // torna a fare il test senza lo strumento.
  //
  // Ogni errore qui e' silenzioso di proposito: una pagina non inventariata e'
  // un dizionario piu' povero, non una sessione persa. Fermare la registrazione
  // di qualcuno a meta' per un dettaglio tecnico sarebbe sproporzionato.
  const dizionari = new Map<string, ScoutResult>();
  let attesa: NodeJS.Timeout | null = null;

  const inventaria = (): void => {
    if (attesa) clearTimeout(attesa);
    attesa = setTimeout(() => {
      void inventory(page)
        .then((d) => {
          const key = pageIdentity(d.url).key;
          const gia = dizionari.get(key);
          // Unione, non sostituzione: un modale aperto a meta' sessione mostra
          // componenti che dopo non ci sono piu', e sono proprio quelli toccati.
          dizionari.set(key, gia ? mergeInventories(gia, d) : d);
        })
        .catch(() => { /* pagina che naviga mentre si legge: si riprovera' */ });
    }, 1200);
  };

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) inventaria();
  });
  inventaria();

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

  // Un ultimo inventario prima di chiudere: l'ultima pagina e' quella su cui si
  // e' fermato il tester, spesso la conferma — cioe' proprio quella che serve
  // alle verifiche, e l'unica che nessuna navigazione successiva ha catturato.
  if (attesa) clearTimeout(attesa);
  await inventory(page)
    .then((d) => {
      const key = pageIdentity(d.url).key;
      const gia = dizionari.get(key);
      dizionari.set(key, gia ? mergeInventories(gia, d) : d);
    })
    .catch(() => { /* browser gia' chiuso dal tester */ });

  await browser.close().catch(() => { /* gia' chiuso dal tester */ });

  const { intents, unlabelled } = group(events);

  return {
    recording: {
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
    },
    dizionari,
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function report(rec: Recording, outPath: string, dizionari?: Map<string, ScoutResult>): void {
  const s = rec.summary;

  console.log(`\nREGISTRAZIONE CONCLUSA\n`);
  console.log(`  Durata          : ${rec.durationSeconds}s`);
  // DUE CONTEGGI, PERCHE' NON SONO LA STESSA COSA.
  //
  // Su un'applicazione a pagina singola ogni cambio di rotta e' una
  // navigazione: un questionario di venti domande produce venti indirizzi. Ma
  // dopo la normalizzazione — /questions/1 e /questions/3 sono la stessa pagina
  // con dentro una domanda diversa — restano poche pagine vere, e sono quelle
  // che diventeranno Page Object.
  //
  // Vedere solo il primo numero fa pensare di aver cliccato a caso. Non e'
  // detto: 36 indirizzi possono essere 5 pagine attraversate per bene.
  const distinte = new Set(rec.pagesVisited.map((u) => pageIdentity(u).key)).size;
  console.log(
    `  Pagine visitate : ${rec.pagesVisited.length} indirizzi` +
      (distinte !== rec.pagesVisited.length ? `, ${distinte} pagine distinte` : "")
  );
  console.log(`  Intenti         : ${s.intents}`);
  console.log(`  Azioni          : ${s.steps}`);
  console.log(`  Verifiche       : ${s.assertions}\n`);

  for (const [i, intent] of rec.intents.entries()) {
    console.log(`  ${i + 1}. ${intent.label}`);
    console.log(`     ${intent.steps.length} azioni, ${intent.assertions.length} verifiche`);
  }

  // Ancoraggi fragili: il caso visto sul campo e' il badge del carrello, il cui
  // nome accessibile e' "1" — cioe' il conteggio. Come verifica ha senso, come
  // locator si rompe al secondo prodotto. Va detto adesso, mentre il tester ha
  // in mente cosa stava verificando: scoprirlo quando il test fallisce fra un
  // mese costa molto di piu'.
  const fragile: Array<{ where: string; what: string; why: string[] }> = [];
  for (const intent of rec.intents) {
    for (const a of intent.assertions) {
      const { stability, notes } = judge(a.name, 1);
      if (stability !== "stable") fragile.push({ where: intent.label, what: `${a.role} "${a.name}"`, why: notes });
    }
    for (const st of intent.steps) {
      const { stability, notes } = judge(st.name, 1);
      if (stability !== "stable") fragile.push({ where: intent.label, what: `${st.role} "${st.name}"`, why: notes });
    }
  }

  if (fragile.length > 0) {
    console.log(`\n  ANCORAGGI FRAGILI (${fragile.length}) — da rivedere prima di generare:\n`);
    for (const f of fragile) {
      console.log(`  ${f.what}   [${f.where}]`);
      for (const w of f.why) console.log(`      ${w}`);
    }
    console.log(
      `\n  Un nome che contiene un dato cambia a ogni esecuzione: come locator non\n` +
        `  regge. Se stavi verificando IL VALORE (es. "il carrello mostra 1"), va\n` +
        `  espresso come verifica di contenuto su un elemento stabile, non come\n` +
        `  elemento da ritrovare per nome.`
    );
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

function slugify(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/[^a-zA-Z0-9.-]/g, "-");
  } catch {
    return "recording";
  }
}

/**
 * Il passaggio in cui i passi prendono un nome, a registrazione finita.
 *
 * PERCHE' NON DURANTE
 * Perche' chi esegue un test **sta eseguendo un test**: guarda l'applicazione,
 * non la barra. La prima sessione vera su un'app aziendale ha prodotto 38 gesti
 * e zero confini, e sarebbe successo a chiunque. Il giudizio resta umano —
 * cambia solo quando lo si esprime, e alla fine si esprime meglio: si e' appena
 * visto dove il flusso cambiava davvero.
 *
 * I gruppi gia' chiusi con "Fine intento" non si toccano: chi ha usato la barra
 * ha gia' detto quello che serviva, e riproporglielo sarebbe una punizione.
 */
async function nominaIntenti(rec: Recording): Promise<Recording> {
  const daNominare = rec.intents.filter((i) => !i.label || i.label.startsWith("("));
  if (daNominare.length === 0) return rec;

  const sciolti = daNominare.flatMap((i) => i.steps);
  const verifiche = daNominare.flatMap((i) => i.assertions);
  const gruppi = proponiGruppi(sciolti, verifiche);
  if (gruppi.length === 0) return rec;

  // Senza un vero terminale (lanciato dalla finestra dell'app) non arrivera'
  // mai una riga da leggere: e' lo stesso difetto di session.ts, qui sul lato
  // "chiedi il nome del passo". Il tester ha gia' chiuso il browser, o ha
  // premuto "Fine registrazione" senza terminale a disposizione — restare in
  // ascolto su readline lascerebbe il processo appeso a tempo indeterminato.
  // Si accettano le etichette proposte cosi' come sono: sono materiale vero,
  // marcato come non rivisto, non buttato.
  if (!process.stdin.isTTY) {
    console.log(
      `\n  ${sciolti.length} gesti non chiusi con "Fine intento", ma non c'e' un\n` +
        `  terminale da cui chiedere i nomi (lanciato dalla finestra dell'app).\n` +
        `  Tengo le etichette proposte automaticamente: rivedile a mano nel file.\n`
    );
    const nominati: Intent[] = gruppi.map((g) => ({
      label: `(da rivedere) ${etichettaProposta(g) ?? "intento senza nome"}`,
      steps: g.steps,
      assertions: g.assertions,
      notes: [],
      ...(g.pageUrl ? { pageUrl: g.pageUrl } : {}),
      ...(g.endUrl ? { endUrl: g.endUrl } : {}),
    }));
    const gia = rec.intents.filter((i) => i.label && !i.label.startsWith("("));
    const intents = [...gia, ...nominati];
    return {
      ...rec,
      intents,
      summary: {
        ...rec.summary,
        intents: intents.length,
        unlabelled: intents.filter((i) => i.label.startsWith("(")).length,
      },
    };
  }

  console.log(`\nCOME SI CHIAMANO QUESTI PASSI?\n`);
  console.log(
    `  ${sciolti.length} gesti non sono stati chiusi con "Fine intento". Te li ho\n` +
      `  divisi dove cambia pagina: e' il confine giusto quasi sempre, ma un modulo\n` +
      `  lungo su una pagina sola sono tre passi, e due pagine attraversate di corsa\n` +
      `  sono un passo solo. Tu c'eri, quindi decidi tu.\n\n` +
      `  Scrivi il nome del passo, in inglese come il catalogo.\n` +
      `  INVIO da solo tiene quello proposto · "-" unisce al passo precedente\n`
  );

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const nominati: Intent[] = [];
  const esiti = { proposti: gruppi.length, accettati: 0, rinominati: 0, uniti: 0 };

  try {
    for (const [i, g] of gruppi.entries()) {
      console.log(`\n  ── ${i + 1}/${gruppi.length} — ${descriviPagina(g.pageUrl)} ─────────────`);
      for (const s of g.steps) console.log(`     ${descriviGesto(s)}`);
      for (const a of g.assertions) console.log(`     verifica: ${a.role} "${a.name}"`);

      const proposta = etichettaProposta(g);
      const risposta = (await rl.question(`\n  nome${proposta ? ` [${proposta}]` : ""}: `)).trim();

      // Unire e' la correzione piu' frequente, perche' un intento vero attraversa
      // spesso due pagine: si compila un modulo e si atterra sulla conferma.
      if (risposta === "-" && nominati.length > 0) {
        const prec = nominati[nominati.length - 1]!;
        prec.steps.push(...g.steps);
        prec.assertions.push(...g.assertions);
        if (g.endUrl ?? g.pageUrl) prec.endUrl = g.endUrl ?? g.pageUrl;
        esiti.uniti++;
        continue;
      }

      if (!risposta || risposta === proposta) esiti.accettati++;
      else esiti.rinominati++;

      nominati.push({
        label: risposta || proposta || "(intento senza nome)",
        steps: g.steps,
        assertions: g.assertions,
        notes: [],
        ...(g.pageUrl ? { pageUrl: g.pageUrl } : {}),
        ...(g.endUrl ? { endUrl: g.endUrl } : {}),
      });
    }
  } finally {
    rl.close();
  }

  const gia = rec.intents.filter((i) => i.label && !i.label.startsWith("("));
  const intents = [...gia, ...nominati];

  return {
    ...rec,
    intents,
    nominazione: esiti,
    summary: {
      ...rec.summary,
      intents: intents.length,
      unlabelled: intents.filter((i) => i.label.startsWith("(")).length,
    },
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const which = positionals(args, ["senza-etichette"])[0];

  if (!which) {
    console.error(
      "ERRORE: manca il bersaglio.\n\n" +
        "  npm run record -- clinic               (bersaglio configurato)\n" +
        "  npm run record -- https://example.com  (url diretto)\n\n" +
        "  I bersagli si configurano in bdd-targets.json — vedi bdd-targets.example.json.\n"
    );
    process.exit(1);
  }

  const target = resolveTarget(which);
  const url = target.url;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath =
    argValue(args, "--out") ??
    path.join("reports", "recordings", `${slugify(url)}-${stamp}.json`);
  const browserName = argValue(args, "--browser") ?? "chrome";

  const sessione = await record(target, browserName);
  const finale = hasFlag(args, "--senza-etichette")
    ? sessione.recording
    : await nominaIntenti(sessione.recording);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(finale, null, 2), "utf-8");

  // I dizionari finiscono dove il generatore li cerca: cosi' `npm run generate`
  // trova gia' tutto senza che nessuno debba ricordarsi di lanciare lo scout.
  // Se ne esisteva gia' uno per la stessa pagina, si fondono invece di
  // sostituirsi: una scansione precedente puo' aver visto stati che questa
  // sessione non ha attraversato.
  const scoutDir = path.join("reports", "scout");
  fs.mkdirSync(scoutDir, { recursive: true });
  for (const d of sessione.dizionari.values()) {
    const file = path.join(scoutDir, `${slugify(d.url)}.json`);
    const precedente = fs.existsSync(file)
      ? (JSON.parse(fs.readFileSync(file, "utf-8")) as ScoutResult)
      : null;
    const unione = precedente ? mergeInventories(precedente, d) : d;
    fs.writeFileSync(file, JSON.stringify(unione, null, 2), "utf-8");
  }

  report(finale, outPath, sessione.dizionari);
}

main().catch((err) => {
  console.error(`\nRegistrazione fallita: ${(err as Error).message}\n`);
  process.exit(1);
});
