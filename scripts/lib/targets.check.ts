/**
 * targets.check.ts
 * -----------------
 * (F4) Un ambiente con indirizzo risolto e credenziali a posto non e'
 * ancora un ambiente su cui qualcuno ha fatto l'accesso: `accessoRegistrato`
 * e' la sola domanda che decide se la diagnosi puo' dire "tutto ok" invece
 * di "configurato, ma nessuno l'ha ancora aperto". Se questa domanda
 * rispondesse "si'" troppo presto, la schermata di controllo tornerebbe a
 * mentire — lo stesso difetto gia' visto altrove in questo giro di verifica.
 *
 * Uso:  npx ts-node scripts/lib/targets.check.ts
 */

import * as path from "path";
import type { Target } from "./targets";
import { accessoRegistrato, ambientiIncompleti, passwordDelBersaglio, passwordDellUtenza } from "./targets";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

console.log("\n--- accessoRegistrato (F4) ---\n");

const bersaglio = (parziale: Partial<Target>): Target => ({
  name: "demo",
  url: "https://demo.invalid",
  session: "reports/sessions/inesistente-per-il-check.json",
  ...parziale,
});

eq(
  "appena aggiunto — niente sessione, niente login — non e' un accesso registrato",
  accessoRegistrato(bersaglio({})),
  false
);

eq(
  "un login automatico configurato conta come accesso registrato",
  accessoRegistrato(bersaglio({ login: { steps: [] } })),
  true
);

eq(
  "una sessione salvata su disco conta come accesso registrato",
  // Questo file esiste di sicuro: e' se stesso.
  accessoRegistrato(bersaglio({ session: path.resolve(__filename) })),
  true
);

console.log("\n--- la password viene dall'ambiente, non da un nome fisso ---\n");

// Il difetto che questo caso ferma (collaudo del 30/9): il test generato leggeva
// `APP_PASSWORD`, un nome che nessuna schermata scrive. Le credenziali di un
// ambiente stanno nel suo blocco `login`, come ${VARIABILE} risolta da .env, e
// le scrive il Controllo. Il test deve prendere da li' la password.
process.env["CHECK_PWD_DEMO"] = "valore-di-prova";
const conLogin = (value: string, fill: { role?: string; name?: string; selector?: string }): Target =>
  bersaglio({
    login: { steps: [{ fill: { role: "textbox", name: "Username" }, value: "utente" }, { fill, value }] },
  });

eq(
  "la password e' quella del campo password del login, con ${VARIABILE} risolta",
  passwordDelBersaglio(conLogin("${CHECK_PWD_DEMO}", { selector: 'input[type="password"]' })),
  "valore-di-prova"
);
eq(
  "si riconosce anche per nome del campo",
  passwordDelBersaglio(conLogin("segreta", { role: "textbox", name: "Password" })),
  "segreta"
);
eq("un ambiente senza login non ha una password", passwordDelBersaglio(bersaglio({})), undefined);
eq(
  "una variabile mancante non diventa una password vuota che sembra buona",
  passwordDelBersaglio(conLogin("${CHECK_VARIABILE_INESISTENTE}", { selector: "#password" })),
  undefined
);

console.log("\n--- la password e' quella dell'utenza dello scenario ---\n");

// 21/10: lo scenario Jet Lag registrato con +qa2 girava su un PC la cui password
// d'ambiente era quella di +22. Login fallito (e il sito blocca dopo 6), e con
// +22 il percorso cambia comunque. La password si cerca per l'email.
process.env["CHECK_PWD_QA2"] = "pwd-qa2";
const conUtenze = bersaglio({
  utenze: { "Paziente+QA2@esempio.invalid": "${CHECK_PWD_QA2}", "vuota@esempio.invalid": "${CHECK_VARIABILE_INESISTENTE}" },
});
eq("l'email trova la sua password, senza badare alle maiuscole", passwordDellUtenza(conUtenze, "paziente+qa2@esempio.invalid"), { stato: "trovata", password: "pwd-qa2" });
eq("un'email fuori elenco lo dice, invece di provare un'altra password", passwordDellUtenza(conUtenze, "altro@esempio.invalid"), { stato: "non-in-elenco" });
eq("una variabile mancante lo dice, invece di dare una password vuota", passwordDellUtenza(conUtenze, "vuota@esempio.invalid"), { stato: "variabile-vuota" });
eq("senza elenco di utenze vale la password dell'ambiente, come prima", passwordDellUtenza(bersaglio({}), "x@esempio.invalid"), { stato: "nessun-elenco" });

console.log("\n--- F3: un ambiente con variabili mancanti non e' pronto, e si dice quali ---\n");

// Il difetto: la diagnosi diceva "ok, 1 su 2 pronti" senza nominare l'ambiente
// ne' le variabili che mancano. Il test generato poi fallisce con un errore che
// nomina l'ambiente: il Controllo deve avvisare PRIMA, e senza mai un valore.
const attese = new Map<string, string[]>([
  ["demo", []], // password in chiaro apposta, nessuna variabile
  ["manuale", []], // nessun `login`: accesso a mano (MFA), nessuna variabile
  ["completo", ["APP_C_URL", "APP_C_PASS"]],
  ["incompleto", ["APP_A_URL", "APP_A_USER", "APP_A_PASS"]],
]);
const env = { APP_C_URL: "https://c.invalid", APP_C_PASS: "segretissima", APP_A_URL: "https://a.invalid" };

eq(
  "senza variabili attese non c'e' niente di incompleto (demo, accesso a mano)",
  ambientiIncompleti(new Map([["demo", []], ["manuale", []]]), {}),
  []
);
eq(
  "solo l'ambiente con variabili assenti e' incompleto, con i NOMI di quelle assenti",
  ambientiIncompleti(attese, env),
  [{ ambiente: "incompleto", variabili: ["APP_A_USER", "APP_A_PASS"] }]
);
eq(
  "una variabile definita ma vuota conta come mancante",
  ambientiIncompleti(new Map([["x", ["A_VUOTA"]]]), { A_VUOTA: "" }),
  [{ ambiente: "x", variabili: ["A_VUOTA"] }]
);
eq(
  "nessun valore compare nel risultato, nemmeno quello delle variabili presenti",
  JSON.stringify(ambientiIncompleti(attese, env)).includes("segretissima"),
  false
);

console.log("\n--- N10: collaudo/produzione/pubblico si leggono solo se espliciti (mai presunti) ---\n");

{
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const { loadTargets } = require("./targets") as typeof import("./targets");
  const file = path.join("reports", "check-targets-n10.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({
      demo: { url: "https://demo.invalid", collaudo: true, pubblico: true },
      collaudoAziendale: { url: "https://collaudo.invalid", collaudo: true },
      produzione: { url: "https://prod.invalid", produzione: true },
      entrambi: { url: "https://x.invalid", collaudo: true, produzione: true },
      senzaSegni: { url: "https://y.invalid" },
      stringaNonBooleana: { url: "https://z.invalid", collaudo: "true" },
    }),
    "utf-8"
  );
  try {
    const letti = new Map(loadTargets(file).map((t) => [t.name, t]));
    eq("demo: collaudo e pubblico letti", [letti.get("demo")?.collaudo, letti.get("demo")?.pubblico], [true, true]);
    eq(
      "collaudoAziendale: collaudo si', pubblico assente (non presunto)",
      [letti.get("collaudoAziendale")?.collaudo, letti.get("collaudoAziendale")?.pubblico],
      [true, undefined]
    );
    eq("produzione: produzione si', collaudo assente", letti.get("produzione")?.collaudo, undefined);
    eq("entrambi: produzione e collaudo arrivano entrambi (decide copione-difese, non targets)", [
      letti.get("entrambi")?.collaudo,
      letti.get("entrambi")?.produzione,
    ], [true, true]);
    eq("senzaSegni: nessuno dei tre campi compare", letti.get("senzaSegni")?.collaudo, undefined);
    eq(
      'una stringa "true" non e\' un booleano: non si legge come collaudo (mai presunto)',
      letti.get("stringaNonBooleana")?.collaudo,
      undefined
    );
  } finally {
    fs.rmSync(file, { force: true });
  }
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
