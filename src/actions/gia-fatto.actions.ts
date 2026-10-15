// src/actions/gia-fatto.actions.ts
// Il passo di uno scenario in cui una utility (questionario, foto) e' gia'
// stata chiamata da un passo precedente: la utility fa tutto in una volta.
//
// Non e' un corpo vuoto (revisione del 15/10): gli step valgono per tutti gli
// scenari, e uno step vuoto riusato altrove passerebbe senza fare niente. Qui si
// verifica che la pagina sia davvero oltre quel comportamento.
import type { Page } from "@playwright/test";

const PAGINE: Record<string, RegExp> = {
  questionario: /\/questions\//,
  foto: /\/camera\//,
};

export async function verificaGiaFatto(page: Page, nome: string): Promise<void> {
  const pagina = PAGINE[nome];
  if (!pagina) return;
  if (pagina.test(new URL(page.url()).pathname)) {
    throw new Error(
      `${nome}: questo passo presuppone che sia gia' stato fatto in un passo precedente, ` +
        `ma la pagina e' ancora ${page.url()}.\n` +
        `  Se lo step e' riusato in un altro scenario, li' va chiamata la utility "${nome}".`
    );
  }
}
