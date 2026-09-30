// presenza.ts
// -----------
// Come si trova, su una pagina, cio' che il tester ha indicato con "Verifica".
//
// "Verifica" registra ruolo + nome ACCESSIBILE, e la frase generata porta solo
// il nome: `the page shows "Cart, 1 items"`. Il nome accessibile pero' non e'
// sempre testo visibile — il carrello di un negozio e' un pulsante che si legge
// "1" e si chiama "Cart, 1 items" — e cercare soltanto il testo non lo trova
// mai, nemmeno al momento giusto.
//
// Si cerca quindi in ordine di somiglianza con quello che il tester ha visto: il
// testo, poi il nome accessibile dei ruoli che si verificano di solito. E'
// ancora una ricerca per nome, non un selettore: nessuna Page Object c'entra.

import type { Locator, Page } from "@playwright/test";

/** Ruoli che un tester indica con "Verifica" e che si leggono per nome. */
const RUOLI_PER_NOME = ["button", "link", "heading", "img", "tab", "checkbox", "radio", "menuitem"] as const;

export function localizzaPresenza(page: Page, text: string): Locator {
  let cerca = page.getByText(text, { exact: false });
  for (const role of RUOLI_PER_NOME) {
    cerca = cerca.or(page.getByRole(role, { name: text }));
  }
  return cerca.first();
}

/** Aspetta che cio' che il tester ha verificato sia visibile. */
export async function aspettaPresenza(page: Page, text: string, ms = 10_000): Promise<void> {
  await localizzaPresenza(page, text).waitFor({ state: "visible", timeout: ms });
}
