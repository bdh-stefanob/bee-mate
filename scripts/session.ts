/**
 * session.ts
 * ----------
 * Apre un bersaglio, aspetta che tu faccia login, e salva la sessione.
 *
 * Dopo, `record` e `scout` partono gia' autenticati: il login si fa una volta
 * e per giorni non si rifa'.
 *
 * IL LOGIN: AUTOMATICO DOVE SI PUO', MANUALE DOVE SERVE
 * Se il bersaglio dichiara i suoi passi di login, vengono eseguiti. Se non li
 * dichiara, o se qualcosa non riesce, si finisce a mano nello stesso browser.
 *
 * I due modi convivono di proposito, ed e' la lezione del POC aziendale: la'
 * il login automatico funziona sul caso semplice e **si ferma davanti alla
 * MFA**, e per una delle applicazioni e' gia' interamente manuale perche' i
 * selettori "non sono ancora mappati". Un automatismo che fallisse in modo
 * netto sarebbe peggio di nessun automatismo: qui ogni passo che non riesce e'
 * un avviso, non un errore.
 *
 * I selettori vivono in bdd-targets.json, che e' gitignorato. Le credenziali
 * nemmeno li': si scrivono come ${VAR} e si risolvono da .env.
 *
 * Uso:
 *   npx ts-node scripts/session.ts clinic
 *   npx ts-node scripts/session.ts https://example.com --out reports/sessions/x.json
 *
 * ATTENZIONE: il file prodotto **equivale a delle credenziali**. Vive sotto
 * reports/, che e' gitignorato. Non va condiviso, non va allegato, non va
 * copiato su altre macchine.
 */

import { avviaBrowser, noteRipiego } from "./lib/browser";
import * as fs from "fs";
import * as path from "path";
import { loadEnv } from "./lib/atlassian";
import {
  resolveTarget, sessionAgeHours, expand,
  type Target, type LoginLocator, type LoginRecipe,
} from "./lib/targets";
import { argValue, positionals } from "./lib/args";

loadEnv();

/** Costruisce il locator dai dati del bersaglio. Ruolo+nome per primo. */
function locate(
  page: import("@playwright/test").Page,
  l: LoginLocator
): import("@playwright/test").Locator {
  if (l.role && l.name) {
    return page.getByRole(l.role as Parameters<typeof page.getByRole>[0], { name: l.name });
  }
  if (l.selector) return page.locator(l.selector);
  if (l.name) return page.getByText(l.name);
  throw new Error(`Locator incompleto: ${JSON.stringify(l)}`);
}

function describe(l: LoginLocator): string {
  if (l.role && l.name) return `${l.role} "${l.name}"`;
  return l.selector ?? l.name ?? "?";
}

/**
 * Esegue i passi di login dichiarati, **senza mai fermare tutto**.
 *
 * Ogni fallimento e' un avviso, non un errore: il browser resta aperto e chi
 * sta usando lo strumento finisce a mano. E' la differenza fra un automatismo
 * utile e uno che, il giorno in cui un selettore cambia, blocca il lavoro
 * invece di risparmiare tempo.
 *
 * Restituisce quanti passi hanno funzionato, perche' "ne sono passati 2 su 3"
 * dice a colpo d'occhio dov'e' il problema.
 */
async function runLogin(
  page: import("@playwright/test").Page,
  recipe: LoginRecipe
): Promise<{ done: number; total: number }> {
  // I banner di consenso sono tolleranti per definizione: spesso non ci sono,
  // e la loro assenza non e' un problema da segnalare.
  for (const d of recipe.dismiss ?? []) {
    await locate(page, d)
      .click({ timeout: 4000 })
      .then(() => console.log(`    chiuso: ${describe(d)}`))
      .catch(() => { /* non c'era */ });
  }

  let done = 0;
  for (const [i, step] of recipe.steps.entries()) {
    const n = `${i + 1}/${recipe.steps.length}`;
    try {
      if (step.fill) {
        const value = expand(step.value ?? "");
        if (!value) {
          console.log(`    ${n} SALTATO ${describe(step.fill)}: il valore e' vuoto.`);
          console.log(`       Se usa \${VARIABILE}, controlla che sia in .env`);
          continue;
        }
        await locate(page, step.fill).fill(value, { timeout: 10000 });
        // Mai stampare il valore: sono credenziali.
        console.log(`    ${n} compilato ${describe(step.fill)}`);
        done++;
      } else if (step.click) {
        await locate(page, step.click).click({ timeout: 10000 });
        console.log(`    ${n} premuto ${describe(step.click)}`);
        done++;
      }
    } catch (err) {
      console.log(`    ${n} NON RIUSCITO su ${describe(step.fill ?? step.click ?? {})}`);
      console.log(`       ${(err as Error).message.split("\n")[0]}`);
      console.log(`       Prosegui a mano nel browser: da qui in poi fa lo stesso.`);
    }
  }
  return { done, total: recipe.steps.length };
}

type Esito = "url" | "invio" | "chiuso" | "timeout";

/**
 * Aspetta che il login sia finito: l'URL di conferma, l'Invio da terminale, o
 * la chiusura del browser — chi arriva prima.
 *
 * LA CHIUSURA DEL BROWSER E' UN'USCITA VERA, NON UN INCIDENTE
 * Il messaggio a schermo dice "poi chiudi il browser": deve essere un'uscita
 * dichiarata, non un effetto collaterale del fatto che waitForURL rifiuta
 * quando la pagina sparisce. Da una finestra senza terminale, inoltre, non
 * arriva mai un Invio — quindi senza questo segnale esplicito un bersaglio
 * senza `readyWhen` non finirebbe mai.
 *
 * Si ascoltano sia la pagina che il browser: a seconda di come il processo
 * reagisce alla chiusura (a volte muore sul colpo, a volte resta vivo un
 * istante) il primo dei due segnali che arriva basta per svegliarci.
 */
async function waitUntilReady(
  page: import("@playwright/test").Page,
  browser: import("@playwright/test").Browser,
  target: Target
): Promise<Esito> {
  if (target.readyWhen) {
    console.log(
      `  Fai login nel browser.\n` +
        `  La sessione si salva da sola appena l'indirizzo contiene "${target.readyWhen}".\n` +
        `  (oppure premi INVIO qui, oppure chiudi il browser quando hai finito)\n`
    );
  } else {
    console.log(`  Fai login nel browser, poi premi INVIO qui, oppure chiudi il browser.\n`);
  }
  if (target.hint) console.log(`  Nota: ${target.hint}\n`);

  // Senza readyWhen questa non si risolve mai da sola: e' voluto, restano gli
  // altri due segnali. Con readyWhen, se il browser chiude prima di arrivarci
  // questa promessa RIFIUTA (pagina sparita) — e' il comportamento che gia'
  // c'era per caso, qui diventa un segnale distinto invece di un "timeout"
  // travestito.
  const byUrl = target.readyWhen
    ? page.waitForURL(`**${target.readyWhen}**`, { timeout: 300_000 }).then((): Esito => "url")
    : new Promise<Esito>(() => { /* nessun readyWhen: non si risolve mai da sola */ });

  const byEnter = new Promise<Esito>((resolve) => {
    // Da una finestra senza terminale non arriva mai un Invio. Mettersi in
    // ascolto su stdin quando non e' un vero terminale puo' comportarsi in
    // modo imprevedibile (non si sa nemmeno se stdin e' un flusso leggibile):
    // si ascolta solo se stdin e' davvero un TTY.
    if (!process.stdin.isTTY) return;
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve("invio");
    });
  });

  const byClose = new Promise<Esito>((resolve) => {
    page.once("close", () => resolve("chiuso"));
  });
  const byDisconnect = new Promise<Esito>((resolve) => {
    browser.once("disconnected", () => resolve("chiuso"));
  });

  let who = await Promise.race([
    byUrl.catch((): Esito => "timeout"),
    byEnter,
    byClose,
    byDisconnect,
  ]);

  // Chi vince la corsa fra "byUrl rifiutata" e "byClose" e' un dettaglio
  // interno di Node, non un fatto su cui costruire un messaggio: la verita'
  // sta nello stato della pagina, non in chi si e' svegliato per primo.
  if (who === "timeout" && page.isClosed()) who = "chiuso";

  if (who === "url") console.log(`  Riconosciuto l'indirizzo di conferma.\n`);
  else if (who === "chiuso") console.log(`  Browser chiuso: concludo subito.\n`);
  else if (who === "timeout") console.log(`  Attesa scaduta sull'indirizzo (5 minuti): salvo comunque.\n`);

  return who;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const which = positionals(args)[0];

  if (!which) {
    console.error(
      "ERRORE: manca il bersaglio.\n\n" +
        "  npx ts-node scripts/session.ts clinic\n" +
        "  npx ts-node scripts/session.ts https://example.com\n"
    );
    process.exit(1);
  }

  const target = resolveTarget(which);
  const out = argValue(args, "--out") ?? target.session;

  const age = sessionAgeHours(target);
  console.log(`\nSESSIONE — ${target.name}\n`);
  console.log(`  Indirizzo : ${target.url}`);
  console.log(`  Salvera' in: ${out}`);
  if (age !== null) console.log(`  Ne esiste gia' una di ${age} ore fa: verra' sostituita.`);
  console.log("");

  const avvio = await avviaBrowser({ headless: false, args: ["--start-maximized"] });
  const browser = avvio.browser;
  const nota = noteRipiego(avvio);
  if (nota) console.log(nota);
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await page.goto(target.url, { waitUntil: "domcontentloaded" });

  if (target.login) {
    console.log(`  Login automatico:\n`);
    const { done, total } = await runLogin(page, target.login);
    console.log(
      done === total
        ? `\n  Tutti i ${total} passi eseguiti.\n`
        : `\n  ${done} passi su ${total}. Completa a mano quello che manca.\n`
    );
  }

  await waitUntilReady(page, browser, target);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  try {
    // Se chi ha chiuso il browser arriva qui, il tentativo di salvare puo'
    // ancora riuscire: il processo a volte resta raggiungibile un istante in
    // piu' della connessione che ce lo dice. Quando non ce la fa, e' perche'
    // non c'era piu' niente da salvare — non un bug, un fatto.
    await context.storageState({ path: out });
  } catch {
    console.error(
      `\nERRORE: il browser e' stato chiuso prima che ci fosse una sessione da salvare.\n` +
        `  Rilancia lo script e chiudi il browser solo dopo aver fatto login: un file\n` +
        `  vuoto qui farebbe fallire i test piu' tardi, con un sintomo che non\n` +
        `  assomiglia a questa causa.\n`
    );
    process.exit(1);
  }
  // Se il browser si e' gia' chiuso da solo, chiuderlo di nuovo non serve ed
  // e' innocuo lasciarlo fallire in silenzio.
  await browser.close().catch(() => { /* gia' chiuso */ });

  console.log(`  Sessione salvata in ${out}\n`);
  console.log(`  Da adesso partono gia' autenticati:`);
  console.log(`    npm run record -- ${target.name}`);
  console.log(`    npm run scout  -- ${target.name}\n`);
  console.log(
    `  Il file equivale a delle credenziali: sta sotto reports/, che e'\n` +
      `  gitignorato. Non condividerlo e non copiarlo altrove.\n`
  );
}

main().catch((err) => {
  console.error(`\n${(err as Error).message}\n`);
  process.exit(1);
});
