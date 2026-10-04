/**
 * copione-schema.check.ts
 * ------------------------
 * Il caso che dimostra, PRIMA di guidare un browser vero, che un copione
 * malformato viene rifiutato con la lista intera dei problemi — non solo il
 * primo — e che uno valido passa. Vedi lib/copione-schema.ts.
 *
 * Uso:  npx ts-node scripts/lib/copione-schema.check.ts
 */
import { validaCopione, variabiliRichieste, risolviValori, CopioneNonValido, type Copione } from "./copione-schema";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};

console.log("\n--- un copione valido passa ---\n");

const VALIDO = {
  schema: 1,
  ambiente: "demo",
  intenti: [
    {
      nome: "the user logs in",
      azioni: [
        { azione: "fill", ruolo: "textbox", nome: "Username", valore: "${DEMO_USER}" },
        { azione: "fill", ruolo: "textbox", nome: "Password", valore: "${DEMO_PASS}" },
        { azione: "click", ruolo: "button", nome: "Login" },
      ],
      verifiche: [{ ruolo: "heading", nome: "Products", testo: "Products" }],
    },
  ],
};

try {
  const c = validaCopione(VALIDO);
  ok("un copione ben formato non lancia");
  if (c.ambiente === "demo") ok("il campo ambiente arriva intatto");
  else fail("il campo ambiente arriva intatto", JSON.stringify(c));
} catch (err) {
  fail("un copione ben formato non lancia", (err as Error).message);
}

console.log("\n--- un copione rotto elenca TUTTI i problemi, non solo il primo ---\n");

const ROTTO = {
  schema: 2, // sbagliato
  ambiente: "", // sbagliato
  intenti: [
    {
      nome: "",
      azioni: [
        { azione: "scroll", ruolo: "button", nome: "Login" }, // azione sconosciuta
        { azione: "click", ruolo: ".btn-primary", nome: "Login" }, // selettore CSS
        { azione: "fill", ruolo: "textbox", nome: "Password" }, // manca valore
      ],
    },
  ],
};

try {
  validaCopione(ROTTO);
  fail("un copione rotto lancia CopioneNonValido", "non ha lanciato niente");
} catch (err) {
  if (!(err instanceof CopioneNonValido)) {
    fail("un copione rotto lancia CopioneNonValido", `ha lanciato ${(err as Error).constructor.name}, non CopioneNonValido`);
  } else {
    const attesi = ["schema", "ambiente", "nome", "azione", "selettore CSS", "valore"];
    const mancanti = attesi.filter((frammento) => !err.dettagli.some((d) => d.includes(frammento)));
    if (mancanti.length === 0) {
      ok(`tutti i problemi attesi compaiono nell'elenco (${err.dettagli.length} in tutto)`);
    } else {
      fail(
        "tutti i problemi attesi compaiono nell'elenco",
        `mancano: ${mancanti.join(", ")}\n       trovati: ${err.dettagli.join(" | ")}`
      );
    }
  }
}

console.log("\n--- un ambiente scritto come URL diretto e' rifiutato (difesa 2: serve un bersaglio dichiarato) ---\n");

try {
  validaCopione({ ...VALIDO, ambiente: "https://esempio.invalid" });
  fail("un URL diretto come ambiente e' rifiutato", "non ha lanciato niente");
} catch (err) {
  if (err instanceof CopioneNonValido && err.dettagli.some((d) => d.includes("URL diretto"))) {
    ok("un URL diretto come ambiente e' rifiutato, spiegando perche'");
  } else {
    fail("un URL diretto come ambiente e' rifiutato", (err as Error).message);
  }
}

console.log("\n--- le variabili ${VAR} si trovano e si risolvono, mai in ruolo/nome ---\n");

const copioneConVar = validaCopione(VALIDO) as Copione;
const richieste = variabiliRichieste(copioneConVar);
if (richieste.includes("DEMO_USER") && richieste.includes("DEMO_PASS") && richieste.length === 2) {
  ok(`variabiliRichieste trova esattamente le due attese: ${richieste.join(", ")}`);
} else {
  fail("variabiliRichieste trova esattamente le due attese", JSON.stringify(richieste));
}

const risolto = risolviValori(copioneConVar, { DEMO_USER: "standard_user", DEMO_PASS: "secret_sauce" });
const primaAzione = risolto.intenti[0]!.azioni[0]!;
if (primaAzione.valore === "standard_user") {
  ok("risolviValori espande ${VAR} nel valore");
} else {
  fail("risolviValori espande ${VAR} nel valore", JSON.stringify(primaAzione));
}
if (risolto.intenti[0]!.azioni[2]!.nome === "Login") {
  ok("risolviValori non tocca ruolo/nome");
} else {
  fail("risolviValori non tocca ruolo/nome", JSON.stringify(risolto.intenti[0]!.azioni[2]));
}

console.log(failures === 0 ? "\nTutti i controlli OK.\n" : `\n${failures} controlli FALLITI\n`);
process.exit(failures === 0 ? 0 : 1);
