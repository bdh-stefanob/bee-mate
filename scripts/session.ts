/**
 * session.ts
 * ----------
 * Apre un bersaglio, aspetta che tu faccia login, e salva la sessione.
 *
 * Dopo, `record` e `scout` partono gia' autenticati: il login si fa una volta
 * e per giorni non si rifa'.
 *
 * PERCHE' IL LOGIN E' MANUALE
 * Non e' una rinuncia, e' la lezione del POC aziendale: la' il login
 * automatico coi selettori funziona sul caso semplice e **degrada a manuale
 * appena compare la MFA**; per una delle applicazioni e' gia' interamente
 * manuale perche' i selettori "non sono ancora mappati".
 *
 * Automatizzarlo significa mantenere selettori che cambiano, custodire
 * credenziali, e comunque fermarsi davanti a MFA, banner di consenso e stati
 * raggiungibili solo a mano. Farlo a mano costa venti secondi una volta ogni
 * tanto e copre tutto.
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
import { resolveTarget, sessionAgeHours, type Target } from "./lib/targets";

loadEnv();

function argValue(args: string[], flag: string): string | undefined {
  const eq = args.find((a) => a.startsWith(flag + "="));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
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
