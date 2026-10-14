/**
 * esplora-flusso.ts
 * -----------------
 * Percorre un flusso vero dall'inizio alla fine e fotografa ogni pagina.
 *
 * PERCHE' ESISTE (2026-10-14). Uno scenario registrato e generato si fermava
 * sempre prima della meta' del flusso `clinic`, ogni volta su un comportamento
 * diverso del sito. Rilanciarlo, fallire e correggere scopre un ostacolo per
 * volta. Questo script fa il percorso con le tecniche del POC
 * (`uiautomationpwpoc`): aspetta il velo di caricamento, chiude i dialog noti,
 * risponde al questionario leggendo la domanda a schermo. A ogni pagina nuova
 * salva l'albero di accessibilita' (senza i valori dei campi) e uno screenshot,
 * con il tempo trascorso. Il risultato e' la mappa del flusso da cui si
 * scrivono le utility (spec del 14/10).
 *
 * NON E' UN TEST. Non verifica niente: osserva. Si ferma al primo ostacolo che
 * non sa superare, e lo dice con la stessa fotografia.
 *
 * Crea un ordine vero sull'ambiente scelto: va usato solo su un ambiente di
 * collaudo, con un'utenza che si puo' sporcare.
 *
 * Uso:
 *   npx ts-node scripts/esplora-flusso.ts email=<utenza> [ambiente=clinic] [cap=NW1] [vedi]
 * La password viene da CLINIC_PASS in .env e non viene mai stampata.
 */

import * as fs from "fs";
import * as path from "path";
import type { Page } from "@playwright/test";
import { avviaBrowser, MEDIA_FINTI } from "./lib/browser";
import { ariaSenzaValori } from "./lib/fallimento";
import { loadEnv } from "./lib/atlassian";
import { argValue, hasFlag } from "./lib/args";
import { registraAvvisi } from "../src/support/avvisi";
import { rispondiQuestionario } from "../src/actions/questionario.actions";
import { scegliFarmacia } from "../src/actions/farmacia.actions";
import { paga } from "../src/actions/pagamento.actions";
import { scattaFoto } from "../src/actions/foto.actions";

loadEnv();
const ARGS = process.argv.slice(2);

const BROCHURE = "https://qa-brochure.lemonaidhealth.co.uk";
const CLINIC = "https://qa-clinic.lemonaidhealth.co.uk";

const avvio = Date.now();
const secondi = (): string => ((Date.now() - avvio) / 1000).toFixed(1);
const cartella = path.join("reports", "esplora", new Date().toISOString().replace(/[:.]/g, "-"));
fs.mkdirSync(cartella, { recursive: true });
const diario: string[] = [`# Esplorazione del flusso`, ``, `| # | t (s) | Fase | Indirizzo | Titolo a schermo |`, `|---|---|---|---|---|`];
let numero = 0;

function log(riga: string): void {
  console.log(`[${secondi()}s] ${riga}`);
}

async function titolo(page: Page): Promise<string> {
  const h = page.locator("h1, h2, h3").filter({ visible: true }).first();
  return ((await h.textContent({ timeout: 1500 }).catch(() => "")) ?? "").replace(/\s+/g, " ").trim().slice(0, 90);
}

/** Fotografa la pagina: albero senza valori, screenshot, una riga di diario. */
async function fotografa(page: Page, fase: string): Promise<void> {
  numero++;
  const nome = `${String(numero).padStart(2, "0")}-${fase.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`;
  const aria = await page.locator("body").ariaSnapshot({ timeout: 5000 }).catch(() => "(non leggibile)");
  fs.writeFileSync(path.join(cartella, `${nome}.yml`), ariaSenzaValori(aria));
  await page.screenshot({ path: path.join(cartella, `${nome}.png`) }).catch(() => undefined);
  const u = new URL(page.url());
  diario.push(`| ${numero} | ${secondi()} | ${fase} | \`${u.host.split(".")[0]}${u.pathname}\` | ${await titolo(page)} |`);
  fs.writeFileSync(path.join(cartella, "diario.md"), diario.join("\n") + "\n");
  log(`foto ${nome}  ${u.pathname}`);
}

async function visibile(page: Page, testo: string | RegExp, ms: number): Promise<boolean> {
  return page.getByText(testo).filter({ visible: true }).first()
    .waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
}

async function main(): Promise<void> {
  const email = argValue(ARGS, "email");
  const password = process.env["CLINIC_PASS"];
  if (!email || !password) throw new Error("servono email=<utenza> e CLINIC_PASS in .env");
  process.env["BDD_VELO"] = process.env["BDD_VELO"] ?? ".loading-dialog";

  const { browser } = await avviaBrowser({ headless: !hasFlag(ARGS, "vedi"), args: [...MEDIA_FINTI.args] });
  const context = await browser.newContext({ permissions: [...MEDIA_FINTI.permissions] });
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  await registraAvvisi(page);

  let fase = "avvio";
  try {
    fase = "accesso";
    await page.goto(`${BROCHURE}/`);
    await fotografa(page, "brochure");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.locator('input[type="password"]').fill(password);
    await fotografa(page, "login");
    await page.getByRole("button", { name: "Log In", exact: true }).click();
    await page.getByRole("button", { name: /My account/ }).waitFor({ state: "visible", timeout: 45_000 });
    await fotografa(page, "account");

    fase = "servizio";
    await page.goto(`${BROCHURE}/weight-loss/treatment`);
    await fotografa(page, "weight loss treatment");
    await page.getByRole("link", { name: /^Get started/ }).filter({ visible: true }).first().click();

    fase = "nuovo o ritorno";
    const ritorno = page.getByText(/I haven't been here for over 3 months/).filter({ visible: true }).first();
    await ritorno.waitFor({ state: "visible", timeout: 60_000 });
    await fotografa(page, "nuovo o ritorno");
    await ritorno.click();

    fase = "prodotto";
    await page.getByRole("heading", { name: /which medicine/i }).waitFor({ state: "visible", timeout: 60_000 });
    await fotografa(page, "prodotto");
    await page.getByRole("button", { name: argValue(ARGS, "dose") ?? "7.2mg", exact: true }).first().click();
    await page.getByRole("button", { name: /Without Coaching/ }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: "Select", exact: true }).and(page.locator(":enabled")).first().click();
    await page.getByRole("button", { name: /^continue$/i }).filter({ visible: true }).first().click();

    fase = "informazioni importanti";
    await visibile(page, /important info/i, 60_000);
    await fotografa(page, "important info");
    await page.getByText("I understand the important information above.").filter({ visible: true }).first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    fase = "questionario";
    await page.waitForURL(/\/questions\//, { timeout: 60_000 });
    await fotografa(page, "questionario");
    await rispondiQuestionario(page, [
      ["domanda", "risposta"],
      ["How do you wish to proceed?", "Stay on the same dose"],
      ["1. What is your current weight?", `${argValue(ARGS, "altezza") ?? "190"} / ${argValue(ARGS, "peso") ?? "80"}`],
    ]);

    fase = "consegna";
    await page.getByRole("button", { name: "Yes, pick up in store" }).click({ timeout: 60_000 });
    await fotografa(page, "consegna");

    fase = "farmacia";
    await scegliFarmacia(page, argValue(ARGS, "cap") ?? "NW1");
    await fotografa(page, "farmacia scelta");

    fase = "riepilogo e pagamento";
    await paga(page);

    fase = "foto";
    await scattaFoto(page);
    await fotografa(page, "foto fatte");

    fase = "esito";
    await page.waitForTimeout(3000);
    await fotografa(page, "esito");
    log("arrivato in fondo");
  } catch (err) {
    log(`FERMO nella fase «${fase}»: ${(err as Error).message.split("\n")[0]}`);
    await fotografa(page, `fermo ${fase}`);
    diario.push("", `**Fermo nella fase «${fase}»**: ${(err as Error).message.split("\n")[0].replace(password, "***")}`);
    fs.writeFileSync(path.join(cartella, "diario.md"), diario.join("\n") + "\n");
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log(`\nDiario e foto in ${cartella}`);
  }
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
