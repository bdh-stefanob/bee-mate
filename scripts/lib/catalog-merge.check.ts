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
