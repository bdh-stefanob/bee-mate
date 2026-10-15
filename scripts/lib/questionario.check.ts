/**
 * questionario.check.ts
 * ---------------------
 * La utility del questionario non risponde a caso.
 *
 * Revisione finale del 15/10: il ripiego cercava la risposta predefinita «No»
 * come sottostringa, quindi trovava «None of the above» e cliccava quella. Una
 * domanda senza la risposta deve fermare lo scenario dicendo quale domanda era.
 *
 * Pagine finte servite da `page.route`, nessuna rete.
 */
import type { Page } from "@playwright/test";
import { avviaBrowser } from "./browser";
import { rispondiQuestionario } from "../../src/actions/questionario.actions";

let failures = 0;
const eq = (what: string, got: unknown, want: unknown): void => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "OK  " : "FAIL"} ${what}${ok ? "" : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}`}`);
  if (!ok) failures++;
};

const pagina = (opzioni: string[]): string => `<!doctype html><html><body>
  <h3>Do you smoke?</h3>
  ${opzioni.map((o) => `<div ng-click="scegli()" onclick="document.body.dataset.scelta='${o}'; location.href='/fine'">${o}</div>`).join("\n")}
  <button disabled>Next</button>
</body></html>`;

async function prova(page: Page, opzioni: string[], tabella: string[][]): Promise<{ errore: string; scelta: string }> {
  await page.route("http://clinic.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      contentType: "text/html",
      body: url.pathname.startsWith("/questions/") ? pagina(opzioni) : "<html><body><h1>fine</h1></body></html>",
    });
  });
  await page.goto("http://clinic.invalid/questions/1");
  let errore = "";
  await rispondiQuestionario(page, tabella).catch((e: Error) => {
    errore = e.message;
  });
  const scelta = page.url().endsWith("/fine") ? "cliccato" : "niente";
  await page.unrouteAll({ behavior: "ignoreErrors" });
  return { errore, scelta };
}

async function main(): Promise<void> {
  const { browser } = await avviaBrowser({ headless: true });
  try {
    console.log("\n--- la risposta predefinita «No» non trova «None of the above» ---\n");
    let page = await browser.newPage();
    const senzaNo = await prova(page, ["None of the above", "Yes"], [["domanda", "risposta"]]);
    eq("non si clicca niente", senzaNo.scelta, "niente");
    eq("e l'errore nomina la domanda", senzaNo.errore.includes("Do you smoke?"), true);
    await page.close();

    console.log("\n--- con «No» fra le opzioni si risponde ---\n");
    page = await browser.newPage();
    const conNo = await prova(page, ["No", "Yes"], [["domanda", "risposta"]]);
    eq("si clicca «No» e si lascia il questionario", [conNo.scelta, conNo.errore], ["cliccato", ""]);
    await page.close();

    console.log("\n--- una risposta dalla tabella con piu' testo intorno si trova ---\n");
    page = await browser.newPage();
    const lunga = await prova(page, ["  Yes, every day  ", "Never"], [
      ["domanda", "risposta"],
      ["Do you smoke?", "Yes, every day"],
    ]);
    eq("l'etichetta con spazi intorno si clicca", [lunga.scelta, lunga.errore], ["cliccato", ""]);
    await page.close();
  } finally {
    await browser.close();
  }
  console.log(failures === 0 ? "\nTutti i controlli OK." : `\n${failures} controlli FALLITI`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
