// src/actions/pagamento.actions.ts
// Paga e conferma l'ordine. Con i dati di una carta dallo step si usa quella;
// altrimenti la carta salvata dell'utenza. Senza ne' l'una ne' l'altra si
// ferma subito, dicendolo, invece di aspettare trenta secondi un pulsante.
import type { Page } from "@playwright/test";
import { PagamentoPage } from "../pages/clinic/pagamento.page";

export async function paga(page: Page, numero?: string, scadenza?: string, cvc?: string): Promise<void> {
  const p = new PagamentoPage(page);
  await p.assertLoaded();
  if (numero && scadenza && cvc) {
    await p.scriviCarta(numero, scadenza, cvc);
  } else if (await p.cartaSalvata().waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false)) {
    await p.cartaSalvata().click();
  } else {
    throw new Error("Pagamento: nessuna carta salvata per questa utenza, e lo step non passa i dati di una carta.");
  }
  await p.confermaOrdine();
}
