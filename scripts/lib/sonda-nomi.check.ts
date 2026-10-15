/**
 * sonda-nomi.check.ts
 * -------------------
 * Il nome che la sonda del registratore da' a un elemento e' lo stesso che usa
 * Playwright per ritrovarlo.
 *
 * IL CASO (Hair loss, 15/10). Il logo e' un pulsante che contiene solo
 * un'immagine con alt «Boots online doctor». Per Playwright il nome c'e'; la
 * sonda non guardava le immagini contenute, lo registrava come pulsante senza
 * nome, e il passo non si poteva riprodurre: «pulsante senza nome» trovava
 * tutte le icone della pagina.
 */
import { avviaBrowser } from "./browser";
import { DOM_PROBE_SOURCE } from "./dom-probe";

let failures = 0;
const eq = (what: string, got: unknown, want: unknown): void => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "OK  " : "FAIL"} ${what}${ok ? "" : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}`}`);
  if (!ok) failures++;
};

const PAGINA = `<!doctype html><html><body>
  <a id="logo" role="button" href="#"><img alt="Boots online doctor" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></a>
  <button id="icona"><svg width="10" height="10" aria-label="Close"><rect width="10" height="10"/></svg></button>
  <button id="testo">Select Pharmacy</button>
  <button id="vuoto"><span style="display:inline-block;width:10px;height:10px"></span></button>
</body></html>`;

async function main(): Promise<void> {
  const { browser } = await avviaBrowser({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(PAGINA);
    await page.evaluate(DOM_PROBE_SOURCE);
    const nome = (id: string): Promise<string> =>
      page.evaluate((i) => {
        const probe = (window as unknown as { __bddProbe: { describe(el: Element): { name: string } | null } }).__bddProbe;
        return probe.describe(document.getElementById(i)!)?.name ?? "";
      }, id);

    const logo = await nome("logo");
    eq("il logo prende il nome dall'immagine che contiene", logo, "Boots online doctor");
    eq(
      "e con quel nome Playwright lo trova, uno solo",
      await page.getByRole("button", { name: logo, exact: true }).count(),
      1
    );
    eq("un'icona prende il nome dall'aria-label del disegno", await nome("icona"), "Close");
    eq("il testo resta il primo criterio", await nome("testo"), "Select Pharmacy");
    eq("un pulsante davvero senza nome resta senza nome", await nome("vuoto"), "");
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
