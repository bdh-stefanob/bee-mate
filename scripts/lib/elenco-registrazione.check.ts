/**
 * elenco-registrazione.check.ts — cosa la barra mostra di quanto si e' registrato,
 * e cosa toglie "Annulla l'ultimo".
 *
 * Uso:  npm run check:elenco-registrazione
 */

import { annullaUltimo, elencoRegistrato } from "./elenco-registrazione";
import type { RawEvent } from "./registrazione";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

const azione = (name: string): RawEvent => ({ type: "action", at: 0, action: "click", role: "button", name });
const passo = (label: string): RawEvent => ({ type: "intent", at: 0, label });
const verifica = (name: string, text?: string): RawEvent => ({ type: "assert", at: 0, role: "heading", name, ...(text ? { text } : {}) });
const nota = (text: string): RawEvent => ({ type: "note", at: 0, text });

console.log("\n--- l'elenco nella barra ---\n");

eq("niente registrato, elenco vuoto", elencoRegistrato([]), []);

eq(
  "una verifica sta sotto il passo che la chiude, come nella generazione; il passo in corso in fondo",
  elencoRegistrato([
    azione("Log in"), azione("Email"), passo("the user logs in"),
    azione("Weight loss"), verifica("Order summary"), passo("the user picks the product"),
    azione("Next"),
  ]),
  [
    { tipo: "passo", testo: "the user logs in", azioni: 2 },
    { tipo: "passo", testo: "the user picks the product", azioni: 1 },
    { tipo: "verifica", testo: "Order summary" },
    { tipo: "in-corso", testo: "", azioni: 1 },
  ]
);

eq(
  "le verifiche fatte dopo l'ultimo passo chiuso stanno sotto quello, se non segue nessuna azione",
  elencoRegistrato([azione("a"), passo("primo"), verifica("Fatto")]),
  [
    { tipo: "passo", testo: "primo", azioni: 1 },
    { tipo: "verifica", testo: "Fatto" },
  ]
);

eq(
  "verifiche del passo in corso dopo la sua riga",
  elencoRegistrato([azione("a"), verifica("Fatto"), azione("b")]),
  [
    { tipo: "in-corso", testo: "", azioni: 2 },
    { tipo: "verifica", testo: "Fatto" },
  ]
);

eq("una verifica mostra il testo scelto, se c'e'", elencoRegistrato([verifica("Totale", "£ 12.00")]), [
  { tipo: "verifica", testo: "£ 12.00" },
]);

eq("le note compaiono anche loro", elencoRegistrato([nota("attendere la mail")]), [
  { tipo: "nota", testo: "attendere la mail" },
]);

eq("ready e stop non sono cose registrate", elencoRegistrato([{ type: "ready", at: 0 }, { type: "stop", at: 0 }]), []);

console.log("\n--- annulla l'ultimo ---\n");

{
  const eventi = [azione("a"), passo("primo"), azione("b"), verifica("Fatto")];
  eq("toglie l'ultima verifica e la dice", annullaUltimo(eventi), { tipo: "verifica", testo: "Fatto" });
  eq("le azioni restano", eventi.map((e) => e.type), ["action", "intent", "action"]);
}

{
  const eventi = [azione("a"), passo("primo"), azione("b")];
  eq("riapre l'ultimo passo chiuso", annullaUltimo(eventi), { tipo: "passo", testo: "primo" });
  eq("le sue azioni tornano nel passo in corso", elencoRegistrato(eventi), [{ tipo: "in-corso", testo: "", azioni: 2 }]);
}

{
  const eventi = [azione("a"), azione("b")];
  eq("solo azioni: non c'e' niente da annullare", annullaUltimo(eventi), null);
  eq("e le azioni non si toccano", eventi.length, 2);
}

console.log(failures === 0 ? "\nTutti i controlli OK.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
