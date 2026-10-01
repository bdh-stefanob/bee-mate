/**
 * accesso.check.ts
 * ----------------
 * Il passo "the user is logged in", provato contro un'applicazione finta ma con
 * un browser vero.
 *
 * Una pagina simulata a mano direbbe solo che il codice fa cio' che ho scritto.
 * Qui c'e' un piccolo server con un modulo di accesso, un cookie di sessione e
 * una pagina interna: le stesse tre cose che decidono, sull'applicazione vera,
 * se uno scenario registrato da una sessione parte o cade al primo passo.
 *
 * Uso:  npm run check:accesso
 */

import * as http from "http";
import type { AddressInfo } from "net";
import type { BrowserContext } from "@playwright/test";
import { avviaBrowser } from "./browser";
import type { Target } from "./targets";
import { assicuraAccesso } from "../../src/actions/accesso.actions";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

const MODULO = `<!doctype html><title>Accedi</title>
<form method="post" action="/login">
  <label>Utente <input name="u"></label>
  <label>Password <input name="p" type="password"></label>
  <button>Entra</button>
</form>`;

/** Quante volte il modulo e' stato inviato: dice se l'accesso e' stato rifatto o no. */
let invii = 0;

const server = http.createServer((req, res) => {
  const dentro = (req.headers.cookie ?? "").includes("sessione=valida");
  const html = (corpo: string): void => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(corpo);
  };
  const vai = (dove: string, cookie?: string): void => {
    res.writeHead(302, { location: dove, ...(cookie ? { "set-cookie": cookie } : {}) });
    res.end();
  };

  if (req.method === "POST" && req.url === "/login") {
    let corpo = "";
    req.on("data", (c) => (corpo += c));
    req.on("end", () => {
      invii++;
      const dati = new URLSearchParams(corpo);
      if (dati.get("u") === "mario" && dati.get("p") === "giusta") vai("/home", "sessione=valida; Path=/");
      else vai("/");
    });
    return;
  }
  if (req.url === "/") return dentro ? vai("/home") : html(MODULO);
  if (req.url === "/home") return dentro ? html("<h1>Benvenuto</h1>") : vai("/");
  // Una pagina interna il cui indirizzo non dice niente: ne' modulo, ne' conferma.
  if (req.url === "/bacheca") return dentro ? html("<h1>Bacheca</h1>") : vai("/");
  res.writeHead(404);
  res.end();
});

const RICETTA: NonNullable<Target["login"]> = {
  dismiss: [{ role: "button", name: "Accetta tutto" }],
  steps: [
    { fill: { role: "textbox", name: "Utente" }, value: "${CHECK_ACCESSO_USER}" },
    { fill: { role: "textbox", name: "Password" }, value: "${CHECK_ACCESSO_PASS}" },
    { click: { role: "button", name: "Entra" } },
  ],
};

/** Tempi corti: qui il server e' sulla stessa macchina, e i casi "non entra" devono scadere. */
const TEMPI = { attesaMs: 1500, attesaIngressoMs: 2500 };

async function errore(f: () => Promise<void>): Promise<string> {
  try {
    await f();
    return "";
  } catch (err) {
    return (err as Error).message;
  }
}

async function main(): Promise<void> {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const { browser } = await avviaBrowser({ headless: true });

  const ambiente = (parziale: Partial<Target> = {}): Target => ({
    name: "finta",
    url: `${base}/`,
    session: "reports/sessions/inesistente-per-il-check.json",
    readyWhen: "/home",
    login: RICETTA,
    ...parziale,
  });
  const conSessione = async (c: BrowserContext): Promise<void> => {
    await c.addCookies([{ name: "sessione", value: "valida", url: base }]);
  };
  /** Un contesto nuovo per ogni caso: nessuno eredita il cookie di quello prima. */
  const caso = async (
    prepara: ((c: BrowserContext) => Promise<void>) | null,
    f: (page: import("@playwright/test").Page) => Promise<void>
  ): Promise<void> => {
    const contesto = await browser.newContext();
    if (prepara) await prepara(contesto);
    invii = 0;
    try {
      await f(await contesto.newPage());
    } finally {
      await contesto.close();
    }
  };

  process.env["CHECK_ACCESSO_USER"] = "mario";
  process.env["CHECK_ACCESSO_PASS"] = "giusta";

  console.log("\n--- con una sessione valida non si rifa' l'accesso ---\n");

  await caso(conSessione, async (page) => {
    await assicuraAccesso(page, ambiente(), TEMPI);
    eq("si e' dentro, riconosciuto dall'indirizzo di conferma", new URL(page.url()).pathname, "/home");
    eq("e il modulo non e' stato inviato", invii, 0);
  });

  await caso(conSessione, async (page) => {
    await assicuraAccesso(page, ambiente({ url: `${base}/bacheca`, readyWhen: undefined as never }), TEMPI);
    eq("una pagina interna senza conferma dichiarata vale come dentro", new URL(page.url()).pathname, "/bacheca");
    eq("e il modulo non e' stato inviato", invii, 0);
  });

  await caso(conSessione, async (page) => {
    const senzaRicetta = ambiente();
    delete senzaRicetta.login;
    eq("anche senza accesso registrato, la sessione valida basta", await errore(() => assicuraAccesso(page, senzaRicetta, TEMPI)), "");
  });

  console.log("\n--- da un browser pulito l'accesso viene eseguito ---\n");

  await caso(null, async (page) => {
    await assicuraAccesso(page, ambiente(), TEMPI);
    eq("dopo l'accesso si e' dentro", new URL(page.url()).pathname, "/home");
    eq("il modulo e' stato inviato una volta", invii, 1);
  });

  await caso(null, async (page) => {
    await assicuraAccesso(page, ambiente({ readyWhen: undefined as never }), TEMPI);
    eq("senza conferma dichiarata, basta che il modulo sparisca", new URL(page.url()).pathname, "/home");
  });

  console.log("\n--- dove non si puo' entrare, il messaggio dice perche' ---\n");

  await caso(null, async (page) => {
    const senzaRicetta = ambiente();
    delete senzaRicetta.login;
    const m = await errore(() => assicuraAccesso(page, senzaRicetta, TEMPI));
    eq("sessione mancante e accesso manuale: lo dice, con il rimedio", /manuale/.test(m) && /Accedi adesso/.test(m), true);
  });

  await caso(null, async (page) => {
    delete process.env["CHECK_ACCESSO_PASS"];
    const m = await errore(() => assicuraAccesso(page, ambiente(), TEMPI));
    process.env["CHECK_ACCESSO_PASS"] = "giusta";
    eq("credenziale non in .env: nomina la variabile", m.includes("CHECK_ACCESSO_PASS"), true);
    eq("e il modulo non e' stato inviato a meta'", invii, 0);
  });

  await caso(null, async (page) => {
    process.env["CHECK_ACCESSO_PASS"] = "sbagliata";
    const m = await errore(() => assicuraAccesso(page, ambiente(), TEMPI));
    process.env["CHECK_ACCESSO_PASS"] = "giusta";
    eq("l'accesso non fa entrare: dice dove si e' finiti", /non ha portato dentro/.test(m) && m.includes(base), true);
    eq("e non stampa mai la credenziale", m.includes("sbagliata"), false);
  });

  await caso(null, async (page) => {
    const m = await errore(() => assicuraAccesso(page, undefined, TEMPI));
    eq("con un indirizzo diretto: serve un ambiente nominato", /ambiente nominato/.test(m), true);
  });

  await browser.close();
  server.close();
}

main()
  .then(() => {
    console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
    process.exit(failures === 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error(`\nIl controllo non e' riuscito a girare: ${(err as Error).message}\n`);
    process.exit(1);
  });
