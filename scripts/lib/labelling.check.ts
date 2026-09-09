/**
 * labelling.check.ts
 * ------------------
 * Controlli sulla proposta dei confini fra intenti.
 *
 * Perche' contano: questa e' la parte che decide COME apparira' lo scenario a
 * chi lo legge. Una proposta sbagliata non rompe niente — produce venti passi
 * dove ne servivano tre, e chi la corregge a mano venti volte smette di usare
 * lo strumento. Il costo di un errore qui e' l'abbandono, non un fallimento.
 *
 * Uso:  npm run check:labelling
 */

import { proponiGruppi, descriviGesto, etichettaProposta } from "./labelling";
import type { Step } from "./generation-contract";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

const passo = (name: string, url: string, action: Step["action"] = "click"): Step => ({
  action, role: action === "fill" ? "textbox" : "button", name, url,
});

console.log("\n--- confini proposti ---\n");

{
  const gruppi = proponiGruppi(
    [
      passo("Email", "https://x.invalid/login", "fill"),
      passo("Password", "https://x.invalid/login", "fill"),
      passo("Continue", "https://x.invalid/login"),
      passo("Next", "https://x.invalid/account"),
    ],
    []
  );
  eq("si spezza dove cambia pagina", gruppi.length, 2);
  eq("e i gesti restano dove sono avvenuti", [gruppi[0]!.steps.length, gruppi[1]!.steps.length], [3, 1]);
}

{
  // IL CASO CHE MOTIVA TUTTO. Un questionario a venti domande produce venti
  // indirizzi, ma e' un passo solo del viaggio: spezzare a ogni domanda darebbe
  // venti intenti da un modulo, e uno scenario illeggibile.
  const gruppi = proponiGruppi(
    [
      passo("1", "https://x.invalid/questions/1", "fill"),
      passo("Next", "https://x.invalid/questions/1"),
      passo("2", "https://x.invalid/questions/2", "fill"),
      passo("Next", "https://x.invalid/questions/2"),
      passo("3", "https://x.invalid/questions/3", "fill"),
    ],
    []
  );
  eq("le domande di un questionario NON diventano venti passi", gruppi.length, 1);
  eq("e i gesti ci sono tutti", gruppi[0]!.steps.length, 5);
}

{
  const gruppi = proponiGruppi(
    [passo("Continue", "https://x.invalid/checkout")],
    [{ role: "heading", name: "Grazie", url: "https://x.invalid/confirmation" }]
  );
  eq("una verifica senza un gruppo suo finisce nell'ultimo", gruppi[gruppi.length - 1]!.assertions.length, 1);
}

eq("nessun gesto, nessun gruppo", proponiGruppi([], []).length, 0);

console.log("\n--- descrizioni ---\n");

{
  const s: Step = { action: "fill", role: "textbox", name: "Email", value: "a@b.invalid", url: "https://x.invalid/" };
  eq("un campo compilato mostra il valore: serve a ricordare quale passo era",
    descriviGesto(s), 'compilato textbox "Email" con "a@b.invalid"');
}
{
  const s: Step = { action: "fill", role: "textbox", name: "Password", value: "<password>", secret: true };
  const d = descriviGesto(s);
  if (!d.includes("<password>") && d.includes("(password)")) ok("la password non si mostra: non e' mai stata registrata");
  else fail("password", `ottenuto: ${d}`);
}

{
  const proposta = etichettaProposta({
    steps: [{ action: "fill", role: "textbox", name: "Email", url: "https://x.invalid/sign-up" }],
    assertions: [],
    pageUrl: "https://x.invalid/sign-up",
  });
  eq("la proposta parte dal percorso, in inglese", proposta, "the user completes sign up");
}

console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
