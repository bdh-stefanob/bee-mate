// src/support/world.ts
// Il "World" di Cucumber e' il contesto di uno scenario. Ogni scenario ne riceve
// uno nuovo, quindi lo stato non passa da uno scenario all'altro. Qui dentro
// vivono il browser e la pagina di Playwright, ed e' da qui che li prendono le
// step definition e le Page Object.

import { setWorldConstructor, World, IWorldOptions } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page } from "@playwright/test";
import { avviaBrowser } from "../../scripts/lib/browser";
import { loadEnv } from "../../scripts/lib/atlassian";
import { resolveTarget, hasSession, sessionAgeHours } from "../../scripts/lib/targets";

// Una sola implementazione del lettore di .env in tutto il progetto: due copie
// divergono, e la seconda si scopre il giorno in cui una variabile viene letta
// in un posto e non nell'altro.
loadEnv();

/**
 * Dove girano i test, e da dove viene la sessione.
 *
 * **L'indirizzo non sta nel codice, e non e' una svista.** Le Page Object
 * generate hanno un `path` relativo (`/inventory.html`): l'origine cambia fra
 * locale, collaudo e produzione, e scriverla nei file la fisserebbe a un
 * ambiente solo — oltre a far finire un indirizzo aziendale in un repository
 * pubblico.
 *
 * Due modi, e il primo e' quello buono:
 *
 *   npm run test:bersaglio clinic       il bersaglio nominato in bdd-targets.json:
 *                                       porta con se' indirizzo E sessione salvata,
 *                                       quindi i test partono gia' autenticati
 *   npm run test:bersaglio https://...  un indirizzo e basta, per una prova al volo
 *
 * Lo script imposta BDD_TARGET o BASE_URL al posto tuo. Scriverli a mano davanti
 * al comando e' sintassi di bash: in PowerShell non imposta niente.
 *
 * `npm run targets` dice quali bersagli esistono e cosa manca a ciascuno.
 */
interface Ambiente {
  baseURL: string;
  storageState?: string;
  descrizione: string;
}

/**
 * Partire da un browser pulito, come se nessuno avesse mai fatto il login.
 *
 * Serve quando la registrazione **contiene** il login: con la sessione salvata
 * si e' gia' dentro, il pulsante di accesso non esiste piu', e il passo
 * registrato fallisce cercando una cosa che l'applicazione non mostra. Non e'
 * un difetto del test: sono due modi diversi di cominciare, e vanno scelti.
 */
const SENZA_SESSIONE = process.env["BDD_NO_SESSION"] === "1";

function ambiente(): Ambiente {
  const nome = process.env["BDD_TARGET"];

  if (nome) {
    // Se il bersaglio non esiste, `resolveTarget` lancia con l'elenco di quelli
    // che ci sono. Meglio un fallimento immediato e parlante che trenta scenari
    // che falliscono uno per uno contro l'ambiente sbagliato.
    const target = resolveTarget(nome);
    const eta = sessionAgeHours(target);
    return {
      baseURL: target.url,
      ...(hasSession(target) && !SENZA_SESSIONE ? { storageState: target.session } : {}),
      descrizione: SENZA_SESSIONE
        ? `bersaglio "${nome}", sessione ignorata: si parte da un browser pulito`
        : hasSession(target)
        ? `bersaglio "${nome}", sessione di ${eta} ore fa`
        : `bersaglio "${nome}", nessuna sessione salvata (npm run session -- ${nome})`,
    };
  }

  return {
    baseURL: process.env["BASE_URL"] ?? "",
    ...(process.env["STORAGE_STATE"] && !SENZA_SESSIONE
      ? { storageState: process.env["STORAGE_STATE"] }
      : {}),
    descrizione: process.env["BASE_URL"] ? "BASE_URL" : "nessun indirizzo configurato",
  };
}

// Si risolve una volta sola, all'avvio: cosi' un bersaglio inesistente si
// scopre subito e non a meta' della prima esecuzione.
const AMBIENTE = ambiente();
if (!AMBIENTE.baseURL) {
  console.warn(
    `\n  Nessun indirizzo: i percorsi relativi delle Page Object non porteranno da nessuna parte.\n` +
      `  Rimedio:  npm run test:bersaglio <nome>     (vedi: npm run targets)\n` +
      `        o:  BASE_URL=https://... in .env\n`
  );
}

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async init(): Promise<void> {
    // HEADED=1 per guardare il test mentre gira: serve quando un passo fallisce
    // e la causa non si capisce dal messaggio.
    // Passa da `avviaBrowser` come tutto il resto: su una macchina dove i
    // browser di Playwright non sono stati scaricati, l'alternativa sarebbe
    // trenta scenari che falliscono con "Executable doesn't exist" invece di
    // un messaggio che dice quale comando lo risolve.
    const avvio = await avviaBrowser({ headless: process.env["HEADED"] !== "1" });
    this.browser = avvio.browser;
    this.context = await this.browser.newContext({
      ...(AMBIENTE.baseURL ? { baseURL: AMBIENTE.baseURL } : {}),
      // La sessione salvata da `npm run session` evita di rifare il login a ogni
      // scenario. Assente, si parte da un browser pulito — e su un'applicazione
      // dietro autenticazione questo significa fallire al primo passo.
      ...(AMBIENTE.storageState ? { storageState: AMBIENTE.storageState } : {}),
    });
    this.page = await this.context.newPage();
  }

  /**
   * Verifica che un testo sia visibile sulla pagina corrente.
   *
   * Sta qui e non in una step definition per una ragione precisa: la verifica di
   * presenza non appartiene a nessuna pagina in particolare — vale su qualunque
   * pagina — e scriverla nello step significherebbe metterci dentro un
   * selettore. Il World e' supporto, non glue: e' il posto giusto per la
   * meccanica che non ha una Page Object a cui appartenere.
   *
   * Il difetto era nel codice generato, e non l'ha trovato una rilettura: l'ha
   * trovato la misura "selettori negli step" del benchmark, puntata contro noi
   * stessi.
   */
  async expectTextVisible(text: string, ms = 10_000): Promise<void> {
    await this.page
      .getByText(text, { exact: false })
      .first()
      .waitFor({ state: "visible", timeout: ms });
  }

  async destroy(): Promise<void> {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(CustomWorld);
