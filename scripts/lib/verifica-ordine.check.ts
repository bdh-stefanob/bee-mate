/**
 * verifica-ordine.check.ts
 * -------------------------
 * Una verifica fatta a META' di un passo deve restare a meta' del passo.
 *
 * Il difetto che questo controllo ferma (collaudo del 30/9): il tester premeva
 * "Verifica" sul carrello mentre completava un ordine, ma il generatore
 * metteva tutte le verifiche in fondo al passo, cioe' dopo "Finish", dove il
 * carrello non c'era piu'. La traccia non conservava DOVE la verifica era stata
 * fatta: ora conserva quanti gesti la precedevano (`afterStep`).
 *
 * Due meta': il recorder che lo scrive, il generatore che lo rispetta.
 *
 * Uso:  npx ts-node scripts/lib/verifica-ordine.check.ts
 */

import { group } from "../record";
import { emitFeature, emitSteps } from "./generate-emit";
import { toComponent } from "./component-naming";
import type { ResolvedIntent, ResolvedStep } from "./generation-contract";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

console.log("\n--- il recorder ricorda dove e' stata fatta la verifica ---\n");
{
  const click = (name: string, at: number) => ({ type: "action" as const, at, action: "click" as const, role: "button", name });
  const verifica = (name: string, at: number) => ({ type: "assert" as const, at, role: "button", name });

  const { intents } = group([
    click("Cart", 1),
    verifica("Cart, 1 items", 2), // dopo 1 gesto: a meta'
    click("Checkout", 3),
    click("Finish", 4),
    verifica("Thank you", 5), // dopo tutti i gesti: in fondo
    { type: "intent", at: 6, label: "the user completes the order" },
  ]);
  eq(
    "ogni verifica porta il numero di gesti che la precedevano",
    intents[0]!.assertions.map((a) => [a.name, a.afterStep]),
    [["Cart, 1 items", 1], ["Thank you", 3]]
  );
}

console.log("\n--- una verifica dopo l'ultimo Fine intento non apre un passo vuoto ---\n");
{
  // Il difetto che questo caso ferma (registrazione del 30/9): il tester chiude il
  // passo "completa l'ordine" e poi verifica la pagina di conferma. Nessun gesto
  // segue, quindi quella verifica finiva in un gruppo nuovo, vuoto e "non chiuso",
  // e lo scenario si ritrovava un passo fantasma. La verifica appartiene al passo
  // che l'ha preceduta.
  const click = (name: string, at: number) => ({ type: "action" as const, at, action: "click" as const, role: "button", name });
  const { intents, unlabelled } = group([
    click("Finish", 1),
    { type: "intent" as const, at: 2, label: "the user completes the order" },
    { type: "assert" as const, at: 3, role: "heading", name: "Thank you for your order!" },
  ]);
  eq("nessun passo fantasma: un solo intento", intents.length, 1);
  eq("e nessun gruppo non chiuso", unlabelled, 0);
  eq(
    "la verifica va in fondo al passo precedente",
    intents[0]?.assertions.map((a) => [a.name, a.afterStep]),
    [["Thank you for your order!", 1]]
  );

  // Gesti senza verifiche, invece, restano un gruppo non chiuso: sono lavoro
  // vero che il tester non ha nominato.
  const senzaNome = group([click("A", 1), { type: "intent" as const, at: 2, label: "primo" }, click("B", 3)]);
  eq("gesti rimasti aperti restano non chiusi", senzaNome.unlabelled, 1);
}

console.log("\n--- il generatore la rispetta ---\n");
{
  const pagina = (nome: string, percorso: string) => ({
    key: `shop.invalid${percorso}`, host: "shop.invalid", path: percorso, pattern: percorso,
    className: `${nome}Page`, slug: nome.toLowerCase(),
  });
  const carrello = pagina("Cart", "/cart");
  const c1 = toComponent({ role: "button", name: "Checkout" }, 1);
  const c2 = toComponent({ role: "button", name: "Finish" }, 1);
  const passo = (c: typeof c1, nome: string): ResolvedStep => ({
    step: { action: "click", role: "button", name: nome }, component: c, synthesised: false, fromPage: carrello.key,
  });
  const intento: ResolvedIntent = {
    label: "the user completes the order",
    steps: [passo(c1, "Checkout"), passo(c2, "Finish")],
    assertions: [
      { role: "button", name: "Cart, 1 items", afterStep: 1 }, // a meta'
      { role: "heading", name: "Thank you", afterStep: 2 }, // in fondo
    ],
    notes: [], page: carrello.key, navigatesTo: null, candidates: [],
  };
  const ctx = {
    intents: [intento], pages: [carrello], recordingPath: "x.json", dictionaryPaths: [], recordedAt: "",
    durationSeconds: 0, generatedAt: "", slug: "ordine", outRoot: "src",
  };

  const steps = emitSteps(ctx, [carrello], new Map([[carrello.key, new Map([[c1, "clickCheckout"], [c2, "clickFinish"]])]]) as never).contents;
  const iCheckout = steps.indexOf("clickCheckout()");
  const iVerifica = steps.indexOf('expectTextVisible("Cart, 1 items")');
  const iFinish = steps.indexOf("clickFinish()");
  eq("nello step la verifica sta fra i due gesti, non in fondo", iCheckout >= 0 && iCheckout < iVerifica && iVerifica < iFinish, true);
  eq("la verifica in fondo non si duplica nello step", steps.includes('expectTextVisible("Thank you")'), false);

  const feature = emitFeature(ctx, "ordine").contents;
  eq("nella feature la verifica a meta' non e' un Then in fondo", feature.includes('Then the page shows "Cart, 1 items"'), false);
  eq("ma si vede, come commento, sotto il passo", feature.includes('"Cart, 1 items"') && feature.includes("#"), true);
  eq("la verifica in fondo resta un Then", feature.includes('Then the page shows "Thank you"'), true);

  // Una vecchia registrazione non sa dove: si comporta come prima.
  const vecchia = { ...intento, assertions: [{ role: "button", name: "Cart, 1 items" }] };
  const f2 = emitFeature({ ...ctx, intents: [vecchia] }, "ordine").contents;
  eq("senza posizione, tutto come prima: un Then in fondo", f2.includes('Then the page shows "Cart, 1 items"'), true);
}

console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
