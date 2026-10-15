// src/actions/questionario.actions.ts
// Risponde al questionario leggendo la domanda a schermo (POC, JetLagWizardPage).
//
// Le risposte vengono dalla tabella sotto lo step (prima riga: domanda,
// risposta). Una domanda che non c'e' riceve "No", la risposta sicura del POC.
// Una domanda senza quella risposta ferma lo scenario dicendo quale domanda era:
// cliccare a caso sarebbe peggio di fermarsi.
//
// Numeri: piu' campi della stessa domanda (altezza e peso) si scrivono uniti
// con " / ", nell'ordine. Date: "oggi" sceglie il giorno dal calendario.
import type { Page } from "@playwright/test";
import { QuestionarioPage } from "../pages/clinic/questionario.page";

const MAX_DOMANDE = 15;

const normalizza = (s: string): string => s.toLowerCase().replace(/^\d+\.\s*/, "").replace(/\s+/g, " ").trim();

function rispostaPer(domanda: string, tabella: readonly string[][]): string {
  return tabella.slice(1).find(([d]) => normalizza(d ?? "") === normalizza(domanda))?.[1] ?? "No";
}

/**
 * Dopo una risposta la domanda cambia da sola, oppure Next si abilita e va
 * premuto una volta. Rispondere alla domanda successiva prima che compaia era
 * il difetto dello scenario generato (prova del 14/10).
 */
async function avanza(q: QuestionarioPage, page: Page, domanda: string): Promise<void> {
  const limite = Date.now() + 20_000;
  while (Date.now() < limite) {
    if (!q.sulQuestionario() || (await q.domanda()) !== domanda) return;
    if (await q.next().isEnabled().catch(() => false)) {
      await q.next().click({ timeout: 5000 }).catch(() => undefined);
      const fine = Date.now() + 15_000;
      while (Date.now() < fine && q.sulQuestionario() && (await q.domanda()) === domanda) {
        await page.waitForTimeout(250);
      }
      return;
    }
    await page.waitForTimeout(250);
  }
}

export async function rispondiQuestionario(page: Page, tabella: string[][]): Promise<void> {
  const q = new QuestionarioPage(page);
  // Chiamata subito dopo il clic che ci porta (prova del 15/10), la pagina e'
  // ancora quella prima: senza aspettare, «non sono nel questionario» e si
  // usciva senza rispondere.
  const arrivato = await page.waitForURL(/\/questions\//, { timeout: 60_000 }).then(() => true, () => false);
  if (!arrivato) throw new Error(`Questionario: la pagina delle domande non e' arrivata (indirizzo: ${page.url()}).`);
  for (let i = 0; i < MAX_DOMANDE; i++) {
    if (!q.sulQuestionario()) return;
    await q.aspettaDomanda();
    const domanda = await q.domanda();
    if (!domanda) return;
    const risposta = rispostaPer(domanda, tabella);
    const numeri = risposta.split(" / ");
    if ((await q.campiNumerici().count()) > 0 && numeri.every((n) => /^\d+([.,]\d+)?$/.test(n))) {
      for (const [k, n] of numeri.entries()) await q.campiNumerici().nth(k).fill(n);
      await q.campiNumerici().nth(numeri.length - 1).press("Tab");
    } else if (await q.haData()) {
      await q.scegliData(risposta === "No" ? "oggi" : risposta);
    } else if (!(await q.rispondi(risposta))) {
      throw new Error(
        `Questionario: alla domanda «${domanda}» non c'e' la risposta «${risposta}».\n` +
          `  Aggiungi la domanda alla tabella sotto lo step, con una delle risposte che la pagina offre.`
      );
    }
    await avanza(q, page, domanda);
  }
  throw new Error(`Questionario: non e' finito dopo ${MAX_DOMANDE} domande.`);
}
