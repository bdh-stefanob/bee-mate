/**
 * verifica-testo.check.ts
 * ------------------------
 * "Verifica" registra un elemento per ruolo + nome accessibile, e la frase
 * generata e' `the page shows "<nome>"`. Il nome accessibile pero' non e'
 * sempre testo visibile.
 *
 * Il difetto che questo controllo ferma (collaudo del 30/9, saucedemo): il
 * carrello e' un pulsante il cui nome accessibile e' "Cart, 1 items", mentre a
 * schermo si legge soltanto "1". La verifica cercava il TESTO, non lo trovava
 * mai, e cadeva dopo dieci secondi anche al momento giusto.
 *
 * Non serve la rete: la pagina e' scritta qui dentro.
 *
 * Uso:  npx ts-node scripts/lib/verifica-testo.check.ts
 */

import { aspettaPresenza } from "../../src/support/presenza";
import { avviaBrowser } from "./browser";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};

console.log("\n--- verifica di presenza ---\n");

async function trova(html: string, atteso: string): Promise<boolean> {
  const avvio = await avviaBrowser({ headless: true });
  try {
    const page = await avvio.browser.newPage();
    await page.setContent(html);
    await aspettaPresenza(page, atteso, 1500);
    return true;
  } catch {
    return false;
  } finally {
    await avvio.browser.close();
  }
}

(async () => {
  const casi: Array<[string, string, string, boolean]> = [
    ["un testo visibile si trova", "<h1>Thank you for your order!</h1>", "Thank you for your order!", true],
    [
      "un pulsante il cui nome accessibile non e' il testo visibile si trova",
      '<button aria-label="Cart, 1 items">1</button>',
      "Cart, 1 items",
      true,
    ],
    [
      "un link con nome accessibile dall'etichetta si trova",
      '<a href="#" aria-label="Open the cart">🛒</a>',
      "Open the cart",
      true,
    ],
    ["cio' che non c'e' non si trova", "<h1>Altro</h1>", "Cart, 1 items", false],
  ];

  for (const [nome, html, atteso, previsto] of casi) {
    const trovato = await trova(html, atteso);
    trovato === previsto ? ok(nome) : fail(nome, `trovato=${trovato}, atteso=${previsto}`);
  }

  console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
  process.exit(failures === 0 ? 0 : 1);
})();
