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
import { sceltaSuMappa } from "../src/actions/mappa.actions";

loadEnv();
const ARGS = process.argv.slice(2);

const BROCHURE = "https://qa-brochure.lemonaidhealth.co.uk";
const CLINIC = "https://qa-clinic.lemonaidhealth.co.uk";

/** Risposte note, riconosciute dal testo della domanda (come JetLagWizardPage.KNOWN_ANSWERS). */
const RISPOSTE: Array<[RegExp, string]> = [
  [/how do you wish to proceed/i, "Stay on the same dose"],
  [/change in your medication/i, "No"],
  [/anything else to tell us/i, "No"],
  [/permission to tell your GP|GP about any care/i, "No"],
  [/Boots store/i, "No"],
];

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

/** Clicca una risposta del questionario: prima l'etichetta esatta, poi un elemento con ng-click (dal POC). */
async function rispondi(page: Page, risposta: string): Promise<void> {
  const etichetta = page.getByText(risposta, { exact: true }).filter({ visible: true }).first();
  const bersaglio = (await etichetta.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false))
    ? etichetta
    : page.locator("[ng-click]").filter({ hasText: risposta }).filter({ visible: true }).first();
  await bersaglio.click();
}

/** Aspetta che la domanda cambi o che si lasci il questionario; altrimenti preme Next appena si abilita. */
async function avanza(page: Page, domanda: string): Promise<void> {
  const next = page.getByRole("button", { name: "Next", exact: true });
  const limite = Date.now() + 20_000;
  while (Date.now() < limite) {
    if (!page.url().includes("/questions/") || (await titolo(page)) !== domanda) return;
    if (await next.isEnabled().catch(() => false)) {
      await next.click({ timeout: 5000 }).catch(() => undefined);
      const fine = Date.now() + 15_000;
      while (Date.now() < fine && page.url().includes("/questions/") && (await titolo(page)) === domanda) {
        await page.waitForTimeout(250);
      }
      return;
    }
    await page.waitForTimeout(250);
  }
}

async function questionario(page: Page): Promise<void> {
  for (let i = 0; i < 15; i++) {
    if (!page.url().includes("/questions/")) return;
    await page.locator("h3").filter({ visible: true }).first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => undefined);
    const domanda = await titolo(page);
    if (!domanda) return;
    await fotografa(page, `domanda ${i + 1}`);
    if (/current weight/i.test(domanda)) {
      // Altezza e peso: due campi numerici senza nome, nell'ordine.
      const campi = page.getByRole("spinbutton").filter({ visible: true });
      await campi.nth(0).fill(argValue(ARGS, "altezza") ?? "190");
      await campi.nth(1).fill(argValue(ARGS, "peso") ?? "80");
      await campi.nth(1).press("Tab");
    } else if (await page.getByRole("textbox", { name: /^\d{2}\/\d{2}\/\d{4}$/ }).filter({ visible: true }).first()
        .waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false)) {
      // Una data: campo di testo gg/mm/aaaa (il nome e' la data di oggi). Una settimana fa.
      const d = new Date(Date.now() - 7 * 86_400_000);
      const data = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      const campo = page.getByRole("textbox", { name: /^\d{2}\/\d{2}\/\d{4}$/ }).filter({ visible: true }).first();
      // Il campo e' in sola lettura: la data si sceglie dal calendario (oggi).
      const scritto = await campo.fill(data, { timeout: 3000 }).then(() => true, () => false);
      if (!scritto) {
        await page.getByRole("button", { name: "Open calendar" }).click();
        const oggi = page.locator(".md-calendar-date-today .md-calendar-date-selection-indicator").filter({ visible: true }).first();
        const qualunque = page.locator(".md-calendar-date:not(.md-calendar-date-disabled) .md-calendar-date-selection-indicator").filter({ visible: true }).last();
        await oggi.or(qualunque).first().click({ timeout: 10_000 });
      } else {
        await campo.press("Tab");
      }
      log(`domanda: «${domanda}» -> ${data}`);
    } else {
      const risposta = RISPOSTE.find(([re]) => re.test(domanda))?.[1] ?? "No";
      log(`domanda: «${domanda}» -> ${risposta}`);
      await rispondi(page, risposta);
    }
    await avanza(page, domanda);
  }
}

async function foto(page: Page): Promise<void> {
  // Le foto compaiono una o due volte per gruppo (documento, corpo); «That's me» e' facoltativo.
  // Prima di cercare i pulsanti, la pagina delle foto deve essere arrivata: sul
  // riepilogo c'e' un altro «Submit».
  await page.waitForURL(/\/camera\//, { timeout: 90_000 });
  for (let i = 0; i < 12; i++) {
    const apri = page.getByRole("button", { name: "Open camera", exact: true }).filter({ visible: true }).first();
    const scatta = page.getByRole("button", { name: "Take Picture", exact: true }).filter({ visible: true }).first();
    const invia = page.getByRole("button", { name: "Submit", exact: true }).filter({ visible: true }).first();
    // Promise.any, non race: un'attesa che fallisce subito (la pagina che cambia) non deve vincere.
    const quale = await Promise.any([
      apri.waitFor({ state: "visible", timeout: 30_000 }).then(() => "apri"),
      scatta.waitFor({ state: "visible", timeout: 30_000 }).then(() => "scatta"),
      invia.waitFor({ state: "visible", timeout: 30_000 }).then(() => "invia"),
    ]).catch(() => "niente");
    await fotografa(page, `foto ${quale}`);
    if (quale === "niente") return;
    if (quale === "invia") {
      await invia.click();
      await page.waitForTimeout(2000);
      if (!page.url().includes("/camera/")) return;
      continue;
    }
    if (quale === "apri") await apri.click();
    await scatta.click();
    await page.getByRole("button", { name: "Save" }).click();
    const sonoIo = page.getByRole("button", { name: "That's me" });
    if (await sonoIo.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false)) await sonoIo.click();
  }
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
    await questionario(page);

    fase = "consegna";
    await page.getByRole("button", { name: "Yes, pick up in store" }).waitFor({ state: "visible", timeout: 60_000 });
    await fotografa(page, "consegna");
    await page.getByRole("button", { name: "Yes, pick up in store" }).click();

    fase = "farmacia";
    const cap = page.getByRole("textbox", { name: "zip" });
    await cap.waitFor({ state: "visible", timeout: 60_000 });
    await cap.fill(argValue(ARGS, "cap") ?? "NW1");
    await cap.press("Enter");
    await sceltaSuMappa(page);
    await fotografa(page, "mappa dopo il pin");
    await page.getByRole("button", { name: "Select Pharmacy" }).click();

    fase = "riepilogo e pagamento";
    await page.getByRole("heading", { name: /your order/i }).waitFor({ state: "visible", timeout: 60_000 });
    await fotografa(page, "riepilogo");
    await page.getByRole("button", { name: /Expiry/ }).filter({ visible: true }).first().click();
    await page.getByRole("button", { name: /place order/i }).click();

    fase = "foto";
    await foto(page);

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
