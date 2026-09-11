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
 *   npm run scout https://example.com
 *   npm run scout:pausa clinic                   login a mano, poi scansiona
 *   npm run scout https://example.com scope=main headed
 *
 * Opzioni, in forma nuda (valgono anche con i trattini: vedi lib/args.ts):
 *   scope=SEL      limita la scansione a un selettore (default: body)
 *   headed         mostra il browser (default: headless)
 *   out=PATH       file di output (default: reports/scout/<slug>.json)
 *   wait=MS        attesa dopo il caricamento, per SPA lente (default 1500)
 *   pause          apre il browser e ASPETTA che tu prema Invio: serve per le
 *                  pagine dietro autenticazione. Fai login, naviga dove vuoi,
 *                  poi torna al terminale. Implica headed. E' npm run scout:pausa
 *   viewport=WxH   dimensione della finestra (default 1920x1080). Conta: a
 *                  larghezze piccole i layout responsive mostrano i componenti
 *                  mobile, e il dizionario inventarierebbe quelli.
 *
 * L'output va sotto reports/, che e' gitignorato: una scansione di un'app
 * aziendale contiene nomi di funzionalita' reali.
 */

import { type Page } from "@playwright/test";
import { avviaBrowser, noteRipiego } from "./lib/browser";
import * as fs from "fs";
import * as path from "path";
import { inventory } from "./lib/inventory";
import type { Kind, ScoutResult } from "./lib/generation-contract";
import { resolveTarget, hasSession, sessionAgeHours } from "./lib/targets";
import { loadEnv } from "./lib/atlassian";
import { argValue, hasFlag, positionals } from "./lib/args";

// I bersagli possono referenziare gli URL come ${VAR}: vanno risolti prima.
loadEnv();

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

// I tipi NON si dichiarano qui: vengono dal contratto condiviso, che li usa
// anche il generatore. Due copie divergerebbero, e divergendo romperebbero
// l'aggancio fra registrazione e dizionario, che e' il perno del metodo.
// Vedi scripts/lib/generation-contract.ts

// ---------------------------------------------------------------------------
// Estrazione dal DOM
// ---------------------------------------------------------------------------

// RawElement e la costruzione del Component vengono da lib/component-naming.ts:
// li usa anche il generatore, e due copie darebbero nomi di metodo diversi per
// lo stesso elemento.


// ---------------------------------------------------------------------------
// Giudizio sulla stabilita'
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Da elemento a componente
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Scansione
// ---------------------------------------------------------------------------

/**
 * Aspetta che chi sta usando lo strumento prema Invio nel terminale.
 *
 * Serve alle pagine dietro autenticazione, che sono quasi tutte quelle
 * interessanti. L'alternativa sarebbe gestire credenziali e sessioni salvate:
 * piu' codice, piu' cose da configurare e un file di sessione da custodire. Qui
 * invece si apre il browser, la persona fa login e naviga dove vuole con le sue
 * mani, e poi si scansiona quello che ha davanti.
 *
 * Vale anche per i casi che nessuna automazione coprirebbe: un consenso da
 * accettare, una MFA, uno stato raggiungibile solo con certi dati.
 */
async function waitForEnter(): Promise<void> {
  console.log(
    `\n  In pausa.\n\n` +
      `  Nel browser: accedi e portati sulla pagina che vuoi inventariare.\n` +
      `  Poi torna qui e premi INVIO per scansionarla.\n`
  );
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });
}

async function scan(
  page: Page,
  url: string,
  scope: string,
  waitMs: number,
  pause: boolean
): Promise<ScoutResult> {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  if (pause) {
    // Si inventaria la pagina su cui la persona si e' fermata, non quella di
    // partenza: dopo il login e la navigazione l'URL e' quasi sempre un altro.
    await waitForEnter();
  }

  // Le SPA montano dopo il DOMContentLoaded: senza attesa si scansiona uno scheletro.
  await page.waitForTimeout(waitMs);

  // La raccolta vera sta in lib/inventory.ts, usata anche dal recorder mentre
  // registra: una pagina inventariata durante la sessione descrive lo stato che
  // il tester ha davvero attraversato, e due implementazioni divergerebbero.
  return inventory(page, scope);
}

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
  const which = positionals(args, ["pause", "headed"])[0];

  if (!which) {
    console.error(
      "ERRORE: manca il bersaglio.\n\n" +
        "  npm run scout -- clinic               (bersaglio configurato)\n" +
        "  npm run scout -- https://example.com  (url diretto)\n\n" +
        "  I bersagli si configurano in bdd-targets.json — vedi bdd-targets.example.json.\n"
    );
    process.exit(1);
  }

  const target = resolveTarget(which);
  const url = target.url;
  const scope = argValue(args, "--scope") ?? "body";
  const waitMs = Number(argValue(args, "--wait") ?? 1500);
  // Il nome del file si decide DOPO la scansione, dalla pagina su cui si e'
  // finiti davvero: con --pause si parte da /login e si finisce altrove, e un
  // file chiamato come la pagina di partenza direbbe una cosa falsa. Peggio:
  // due scansioni partite dallo stesso indirizzo si sovrascriverebbero a
  // vicenda, e la seconda cancellerebbe la prima senza dire niente.
  const outFlag = argValue(args, "--out");

  // La viewport NON e' un dettaglio estetico: a 1280 di larghezza — il default
  // di Playwright — molti layout responsive passano alla versione ridotta, con
  // il menu a panino al posto della barra estesa. Il dizionario inventarierebbe
  // i componenti mobile invece di quelli che l'utente vede davvero, e non
  // corrisponderebbe piu' a quello che il recorder cattura sulla finestra vera.
  // Esplicita e configurabile, cosi' e' anche riproducibile fra esecuzioni.
  const [vw, vh] = (argValue(args, "--viewport") ?? "1920x1080")
    .split("x")
    .map((n) => Number(n.trim()));
  const viewport = { width: vw || 1920, height: vh || 1080 };

  const pause = hasFlag(args, "--pause");

  // LE OPZIONI SI DICHIARANO PRIMA DI PARTIRE, NON SI DEDUCONO DOPO.
  //
  // Un flag che non arriva allo script non produce un errore: produce una
  // scansione diversa da quella che si voleva, con dei numeri che sembrano
  // buoni. E' successo davvero — un `--pause` non arrivato ha fatto inventariare
  // la pagina pubblica di un sito invece dell'applicazione dietro il login, e i
  // numeri erano credibili. Scritto qui sopra, si vede subito.
  console.log(`
SCANSIONE — ${url}
`);
  console.log(`  Pausa    : ${pause ? "si', aspetto che tu faccia login e navighi" : "NO — scansiono subito questa pagina"}`);
  console.log(`  Scope    : ${scope}`);
  console.log(`  Viewport : ${viewport.width}x${viewport.height}`);
  console.log(`  Attesa   : ${waitMs}ms`);
  if (!pause) {
    console.log(
      `
  Se questa pagina e' dietro autenticazione, quello che segue sara' il
` +
        `  modulo di login. Per fermarti e navigare a mano:
` +
        `      npm run scout:pausa -- ${which}`
    );
  }

  // --pause implica --headed: non si puo' fare login in un browser che non si vede.
  const avvio = await avviaBrowser({ headless: !hasFlag(args, "--headed") && !pause });
  const browser = avvio.browser;
  const nota = noteRipiego(avvio);
  if (nota) console.log(`
${nota}`);
  try {
    // Sessione salvata, se c'e': senza, le pagine interessanti — che sono quasi
    // tutte dietro autenticazione — restituirebbero il modulo di login, e il
    // dizionario inventarierebbe quello.
    const sessionAge = sessionAgeHours(target);
    const context = await browser.newContext({
      viewport,
      ...(hasSession(target) ? { storageState: target.session } : {}),
    });
    if (sessionAge !== null) {
      console.log(`\n  Sessione salvata ${sessionAge} ore fa.`);
    } else if (target.name !== "(url diretto)") {
      console.log(
        `\n  Nessuna sessione salvata per "${target.name}".\n` +
          `  Se la pagina e' dietro login:  npm run session -- ${target.name}\n` +
          `  Oppure usa --pause e accedi a mano.`
      );
    }

    const page = await context.newPage();
    const result = await scan(page, url, scope, waitMs, pause);
    const outPath = outFlag ?? path.join("reports", "scout", `${slugify(result.url)}.json`);

    // Cambiare pagina con --pause e' NORMALE: e' il motivo per cui esiste.
    // Senza pausa e' sospetto: quasi sempre un rimando al login, e il dizionario
    // starebbe inventariando il modulo di accesso credendo di essere altrove.
    //
    // Lo stesso avviso nei due casi addestrerebbe a ignorarlo, che e' il modo
    // piu' sicuro di rendere inutile un avviso che un giorno servira'.
    if (result.url.replace(/\/$/, "") !== url.replace(/\/$/, "")) {
      if (pause) {
        console.log(`
  Hai navigato: inventario ${result.url}`);
      } else {
        console.log(`
  ATTENZIONE: sei finito su un altro indirizzo senza chiederlo.`);
        console.log(`    chiesto      : ${url}`);
        console.log(`    scansionato  : ${result.url}`);
        console.log(`    Quasi sempre e' un rimando al login: la sessione manca o e' scaduta.`);
        console.log(`    Con  npm run scout:pausa  puoi accedere a mano prima di scansionare.`);
      }
    }

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
