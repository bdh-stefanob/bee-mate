// src/actions/accesso.actions.ts
// "L'utente e' dentro": l'intenzione, non i clic.
//
// Uno scenario registrato a partire da una sessione salvata comincia da una
// pagina che si vede solo da autenticati. Questa azione rende vera quella
// premessa in tutti e due i modi di partire:
//
//   - con una sessione valida non rifa' niente: guarda dove si trova e prosegue;
//   - con un browser pulito, o una sessione scaduta, esegue l'accesso che il
//     tester ha registrato una volta («Registra l'accesso», nel Controllo).
//
// Dove l'accesso non si puo' automatizzare — nessun accesso registrato, una
// verifica in due passaggi — lo dice, con la causa e il rimedio: un "elemento
// non trovato" sulla prima pagina manderebbe a cercare nel posto sbagliato.

import type { Page } from "@playwright/test";
import { AccessoPage } from "../pages/common/accesso.page";
import type { Target } from "../../scripts/lib/targets";

export interface OpzioniAccesso {
  /** Quanto aspettare per capire se si e' dentro o davanti al modulo di accesso. */
  attesaMs?: number;
  /** Quanto aspettare, dopo aver premuto, che l'applicazione faccia entrare. */
  attesaIngressoMs?: number;
  /** Quanto aspettare l'avviso «riprendi l'ordine» prima di concludere che non c'e'. */
  attesaAvvisoMs?: number;
}

type Posizione = "dentro" | "accesso";

/**
 * Dentro, o davanti al modulo di accesso?
 *
 * Il modulo si guarda per primo: se e' a schermo l'accesso serve, qualunque
 * cosa dica l'indirizzo (alcune applicazioni lo mostrano anche con una sessione
 * valida). Se nel tempo dato non compare ne' il modulo ne' l'indirizzo di
 * conferma, la sessione ha portato su una pagina interna: si e' dentro.
 */
async function doveSono(
  page: Page,
  pagina: AccessoPage | undefined,
  readyWhen: string | undefined,
  attesaMs: number
): Promise<Posizione | "sconosciuta"> {
  const scadenza = Date.now() + attesaMs;
  for (;;) {
    if (pagina && (await pagina.campoIniziale().isVisible().catch(() => false))) return "accesso";
    if (readyWhen && page.url().includes(readyWhen)) return "dentro";
    if (Date.now() >= scadenza) return "sconosciuta";
    await page.waitForTimeout(100);
  }
}

async function entra(
  page: Page,
  ambiente: Target | undefined,
  opzioni: OpzioniAccesso = {}
): Promise<void> {
  const { attesaMs = 5000, attesaIngressoMs = 15_000 } = opzioni;

  if (!ambiente) {
    throw new Error(
      `Il passo di accesso richiede un ambiente nominato: con un indirizzo diretto non\n` +
        `  si sa come si entra. Esegui scegliendo un ambiente (npm run test:bersaglio <nome>).`
    );
  }

  const pagina = ambiente.login
    ? new AccessoPage(page, ambiente.url, ambiente.login, ambiente.name)
    : undefined;

  await page.goto(ambiente.url);
  const posizione = await doveSono(page, pagina, ambiente.readyWhen, attesaMs);
  if (posizione === "dentro") return;

  if (!pagina) {
    // Senza un accesso registrato il modulo non si sa riconoscere. Se
    // l'ambiente dichiara dove si arriva da autenticati e non ci si e'
    // arrivati, la sessione non c'e' piu'; se non lo dichiara, non c'e' modo di
    // saperlo da qui e si prosegue: sara' la prima pagina a dirlo.
    if (!ambiente.readyWhen) return;
    throw new Error(
      `Non si e' dentro "${ambiente.name}": la sessione manca o e' scaduta, e l'accesso di\n` +
        `  questo ambiente e' manuale.\n` +
        `  Indirizzo ora : ${page.url()}\n` +
        `  Rimedio       : «Accedi adesso» nel Controllo; oppure «Registra l'accesso»,\n` +
        `                  cosi' il test lo rifa' da solo.`
    );
  }

  // Nessun modulo e nessuna conferma: la sessione ha portato su una pagina interna.
  if (posizione === "sconosciuta") return;

  await pagina.chiudiAvvisi();
  await pagina.accedi();

  const entrato = ambiente.readyWhen
    ? await page
        .waitForURL((u) => u.href.includes(ambiente.readyWhen!), { timeout: attesaIngressoMs })
        .then(() => true)
        .catch(() => false)
    : await pagina
        .campoIniziale()
        .waitFor({ state: "hidden", timeout: attesaIngressoMs })
        .then(() => true)
        .catch(() => false);

  if (!entrato) {
    throw new Error(
      `L'accesso a "${ambiente.name}" non ha portato dentro.\n` +
        `  Indirizzo ora : ${page.url()}\n` +
        (ambiente.readyWhen ? `  Atteso        : un indirizzo che contiene "${ambiente.readyWhen}"\n` : "") +
        `  Se l'applicazione chiede un passaggio in piu' (un codice, una conferma), quello\n` +
        `  non si automatizza: fai «Accedi adesso» nel Controllo e riesegui con la sessione.\n` +
        `  Se le credenziali sono cambiate, correggile nella riga dell'ambiente.`
    );
  }
}

/**
 * Chiude l'avviso «riprendi l'ordine aperto», se compare. Mai un errore.
 *
 * Un account con un ordine non concluso lo mostra subito dopo l'accesso, e
 * intercetta ogni click successivo. Non e' una verifica del test: e' una
 * condizione dell'account, che cambia da un'esecuzione all'altra. Per questo non
 * puo' far fallire lo scenario: se c'e', si chiude con Escape (l'ordine non si
 * tocca); se non c'e', o non si lascia chiudere, si prosegue, e se poi blocca
 * davvero qualcosa il dossier del fallimento lo mostrera'.
 */
export async function chiudiOrdineAperto(page: Page, attesaMs = 1500): Promise<boolean> {
  try {
    const riprendi = page.getByRole("button", { name: /resume/i });
    if (!(await riprendi.first().waitFor({ state: "visible", timeout: attesaMs }).then(() => true, () => false))) {
      return false;
    }
    await page.keyboard.press("Escape");
    await riprendi.first().waitFor({ state: "hidden", timeout: 3000 }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

export async function assicuraAccesso(
  page: Page,
  ambiente: Target | undefined,
  opzioni: OpzioniAccesso = {}
): Promise<void> {
  await entra(page, ambiente, opzioni);
  await chiudiOrdineAperto(page, opzioni.attesaAvvisoMs);
}
