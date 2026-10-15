/**
 * catalog-merge.check.ts
 * ----------------------
 * Il catalogo non perde le richieste quando si rigenera.
 *
 * Il primo caso e' l'incidente: 100 voci richieste dal team, 34 step nel
 * codice, e una rigenerazione che lasciava 34.
 *
 * Uso:  npm run check:catalog-merge
 */

import { conservaRichieste, type VoceCatalogo } from "./catalog-merge";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

const voce = (expression: string, status: VoceCatalogo["status"]): VoceCatalogo => ({ expression, status });

console.log("\n--- uno step nato dal codice non e' una richiesta (15/10) ---\n");

{
  // Revisione finale: il catalogo versionato teneva step generati il cui codice
  // non c'era piu' (un file di controllo cancellato, una frase rigenerata senza
  // parametro). Una richiesta del team non punta a codice che esiste; uno step
  // nato dal codice si', o sta nel limbo dei generati.
  const conRif = (expression: string, sourceRef: string): VoceCatalogo => ({ expression, status: "wanted", sourceRef });
  const daCodice = [
    { expression: "the user insert the bmi and the date", status: "wanted" as const, sourceRef: "src\\steps\\clinic\\wl\\ordine.steps.ts:206" },
  ];
  const precedenti = [
    conRif("the user insert the bmi and the date with {string}", "src\\steps\\clinic\\wl\\ordine.steps.ts:206"),
    conRif("il cliente annulla un ordine", "src\\steps\\generated\\zz-controllo.steps.ts:58"),
    conRif("I open the prescription page", "src/steps/pharmacy/prescriptions/prescriptions.steps.ts:1"),
    voce("the user confirms the order", "wanted"),
  ];
  const unito = conservaRichieste(daCodice, precedenti).map((s) => s.expression);
  eq("la frase cambiata nel suo file non resta", unito.includes("the user insert the bmi and the date with {string}"), false);
  eq("uno step del limbo dei generati non resta", unito.includes("il cliente annulla un ordine"), false);
  eq("una richiesta per un file che ancora non esiste resta", unito.includes("I open the prescription page"), true);
  eq("una richiesta senza riferimento resta", unito.includes("the user confirms the order"), true);
}

console.log("\n--- rigenerazione del catalogo ---\n");

{
  const daCodice = [voce("the user logs in", "implemented")];
  const precedenti = [
    voce("the user selects a delivery method", "wanted"),
    voce("the user confirms the order", "wanted"),
  ];
  const unito = conservaRichieste(daCodice, precedenti);
  eq("le richieste sopravvivono alla rigenerazione", unito.length, 3);
  eq("e restano richieste", unito.filter((s) => s.status === "wanted").length, 2);
}

{
  // Quando una richiesta viene implementata, il codice la definisce: non si
  // duplica, e la versione che vale e' quella del codice.
  const espressione = "the user confirms the order";
  const unito = conservaRichieste([voce(espressione, "implemented")], [voce(espressione, "wanted")]);
  eq("una richiesta implementata non resta doppia", unito.length, 1);
  eq("e vale la voce del codice", unito[0]?.status, "implemented");
}

{
  const unito = conservaRichieste([voce("a", "implemented")], [voce("b", "deprecated")]);
  eq("anche le voci deprecate si conservano", unito.length, 2);
}

{
  eq("nessun catalogo precedente: passa solo il codice", conservaRichieste([voce("a", "implemented")], []).length, 1);
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
