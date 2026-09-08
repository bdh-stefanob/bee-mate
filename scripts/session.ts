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

import { chromium } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { loadEnv } from "./lib/atlassian";
import {
  resolveTarget, sessionAgeHours, expand,
  type Target, type LoginLocator, type LoginRecipe,
} from "./lib/targets";

loadEnv();

function argValue(args: string[], flag: string): string | undefined {
  const eq = args.find((a) => a.startsWith(flag + "="));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

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

/** Aspetta l'URL di conferma, oppure che la persona prema Invio. */
async function waitUntilReady(
  page: import("@playwright/test").Page,
  target: Target
): Promise<void> {
  if (target.readyWhen) {
    console.log(
      `  Fai login nel browser.\n` +
        `  La sessione si salva da sola appena l'indirizzo contiene "${target.readyWhen}".\n` +
        `  (oppure premi INVIO qui quando hai finito)\n`
    );
  } else {
    console.log(`  Fai login nel browser, poi premi INVIO qui.\n`);
  }
  if (target.hint) console.log(`  Nota: ${target.hint}\n`);

  // Chi arriva prima fra i due. L'Invio serve sempre: readyWhen puo' essere
  // sbagliato, o l'applicazione puo' atterrare su un URL diverso dal previsto,
  // e in quel caso restare bloccati a fissare un browser sarebbe assurdo.
  const byUrl = target.readyWhen
    ? page.waitForURL(`**${target.readyWhen}**`, { timeout: 300_000 }).then(() => "url")
    : new Promise<string>(() => { /* mai */ });

  const byEnter = new Promise<string>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve("invio");
    });
  });

  const who = await Promise.race([byUrl.catch(() => "timeout"), byEnter]);
  if (who === "url") console.log(`  Riconosciuto l'indirizzo di conferma.\n`);
  if (who === "timeout") console.log(`  Attesa scaduta sull'indirizzo: salvo comunque.\n`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const which = args.find((a) => !a.startsWith("-"));

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

  const browser = await chromium.launch({ headless: false, args: ["--start-maximized"] });
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

  await waitUntilReady(page, target);

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await context.storageState({ path: out });
  await browser.close();

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
