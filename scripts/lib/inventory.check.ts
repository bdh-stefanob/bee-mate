/**
 * inventory.check.ts
 * ------------------
 * Controlli sulla fusione di due inventari della stessa pagina.
 *
 * PERCHE' PROPRIO QUESTA FUNZIONE
 * Perche' sbaglia in silenzio. Se perde un componente, il dizionario e' piu'
 * povero e nessuno se ne accorge: il generatore sintetizza il locator mancante,
 * dichiara un avviso in mezzo ad altri, e il codice esce lo stesso. Il difetto
 * si manifesta settimane dopo come un locator che non trova niente — e a quel
 * punto nessuno lo collega a una fusione fatta male.
 *
 * Il caso che conta e' il modale: aperto a meta' sessione mostra componenti che
 * un attimo dopo non ci sono piu', e sono proprio quelli che il tester ha
 * toccato. Tenere l'ultimo inventario invece dell'unione li perderebbe tutti.
 *
 * Uso:  npm run check:inventory
 */

import { mergeInventories } from "./inventory";
import type { Component, ScoutResult } from "./generation-contract";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

function comp(name: string, occurrences = 1): Component {
  return {
    role: "button", name, kind: "action",
    locator: `getByRole('button', { name: '${name}' })`,
    method: `click${name}`,
    occurrences,
    stability: occurrences > 1 ? "ambiguous" : "stable",
    notes: [],
  };
}

function dict(components: Component[], url = "https://x.invalid/p"): ScoutResult {
  const usable = components.filter((c) => c.stability === "stable").length;
  return {
    url, scope: "body", scoutedAt: "2026-09-09T00:00:00.000Z",
    viewport: { width: 1920, height: 1080 },
    quality: {
      interactiveFound: components.length, usable,
      unnamed: 0, ambiguous: components.filter((c) => c.stability === "ambiguous").length,
      unstable: 0,
      accessibleScore: components.length ? Math.round((usable / components.length) * 100) : 0,
    },
    components,
  };
}

console.log("\n--- fusione di inventari ---\n");

{
  // IL CASO CHE MOTIVA LA FUNZIONE. Il modale c'era a meta' sessione e dopo no:
  // tenere il secondo inventario perderebbe proprio i componenti toccati.
  const conModale = dict([comp("Continua"), comp("Conferma"), comp("Annulla")]);
  const senzaModale = dict([comp("Continua")]);
  const unione = mergeInventories(conModale, senzaModale);

  eq(
    "l'unione tiene cio' che c'era solo prima",
    unione.components.map((c) => c.name).sort(),
    ["Annulla", "Conferma", "Continua"]
  );
}

{
  const primo = dict([comp("Modifica", 1)]);
  const secondo = dict([comp("Modifica", 8)]);
  const unione = mergeInventories(primo, secondo);

  // Un locator ambiguo anche una volta sola E' ambiguo: dimenticarlo produce un
  // locator che funziona in prova e fallisce quando la lista si riempie.
  eq("sulle occorrenze vince il massimo visto", unione.components[0]!.occurrences, 8);
  eq("e con esse il giudizio", unione.components[0]!.stability, "ambiguous");
}

{
  const a = dict([comp("A"), comp("B", 3)]);
  const b = dict([comp("C")]);
  const unione = mergeInventories(a, b);

  eq("i conteggi si ricalcolano sull'unione, non si sommano", unione.components.length, 3);
  eq("gli utilizzabili sono quelli veri", unione.quality.usable, 2);
  eq("e gli ambigui pure", unione.quality.ambiguous, 1);
  eq("l'indice di accessibilita' segue", unione.quality.accessibleScore, 67);
}

{
  // L'indirizzo e' quello dell'inventario piu' recente: la fusione serve ad
  // arricchire una pagina, non a fonderne due diverse.
  const a = dict([comp("A")], "https://x.invalid/prima");
  const b = dict([comp("B")], "https://x.invalid/dopo");
  eq("l'indirizzo e' quello dell'ultimo", mergeInventories(a, b).url, "https://x.invalid/dopo");
}

{
  const vuoto = dict([]);
  eq("fondere col vuoto non perde niente", mergeInventories(dict([comp("A")]), vuoto).components.length, 1);
  eq("e nemmeno al contrario", mergeInventories(vuoto, dict([comp("A")])).components.length, 1);
}

console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
