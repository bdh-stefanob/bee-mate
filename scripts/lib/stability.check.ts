/**
 * stability.check.ts
 * ------------------
 * Controlli sul giudizio di stabilita' di un nome accessibile.
 *
 * Perche' esiste: `judge` decide se un componente e' un ancoraggio affidabile,
 * e lo usano sia lo scout (per il dizionario) sia il recorder (per avvertire il
 * tester). Un errore qui non fa fallire niente subito — produce test che si
 * rompono fra un mese, quando nessuno ricorda piu' perche'.
 *
 * I casi sotto vengono da nomi visti davvero su pagine reali.
 *
 * Uso:  npm run check:stability
 */

import { judge } from "./stability";

interface Case {
  name: string;
  /** Ci si aspetta che sia un ancoraggio affidabile? */
  stable: boolean;
  /** Occorrenze dello stesso ruolo+nome nella pagina. */
  occurrences?: number;
  why: string;
}

const CASES: Case[] = [
  { name: "Open Menu", stable: true, why: "etichetta fissa" },
  { name: "Add to cart", stable: true, why: "etichetta fissa" },
  { name: "Sauce Labs Backpack", stable: true, why: "nome di prodotto: cambia col catalogo ma non a ogni esecuzione" },
  { name: "Login", stable: true, why: "etichetta fissa" },

  // Il caso che ha motivato questo controllo: il badge di un carrello si chiama
  // "1", e al secondo articolo si chiama "2".
  { name: "1", stable: false, why: "solo cifre: e' un conteggio" },
  { name: "  12 ", stable: false, why: "solo cifre con spazi" },

  { name: "Ordine 1830941 del 12/06/26", stable: false, why: "identificativo + data" },
  { name: "mario.rossi@example.com", stable: false, why: "indirizzo email" },
  { name: "£29.99", stable: false, why: "importo" },
  { name: "3 results", stable: false, why: "conteggio" },

  // Non-univoco: il componente esiste, ma il locator no.
  { name: "edit", stable: false, occurrences: 8, why: "otto elementi con lo stesso nome" },

  // Senza nome non e' raggiungibile per ruolo+nome, ed e' anche un problema a11y.
  { name: "", stable: false, why: "nessun nome accessibile" },
];

let failures = 0;

for (const c of CASES) {
  const { stability, notes } = judge(c.name, c.occurrences ?? 1);
  const isStable = stability === "stable";

  if (isStable === c.stable) {
    console.log(`OK   ${JSON.stringify(c.name)} -> ${stability}`);
  } else {
    failures++;
    console.log(
      `FAIL ${JSON.stringify(c.name)} -> ${stability}, atteso ${c.stable ? "stable" : "non stable"}` +
        `\n       motivo atteso: ${c.why}` +
        (notes.length ? `\n       rilevato: ${notes.join(" · ")}` : "")
    );
  }
}

console.log(
  failures === 0 ? `\n${CASES.length}/${CASES.length} casi OK` : `\n${failures}/${CASES.length} casi FALLITI`
);
process.exit(failures === 0 ? 0 : 1);
