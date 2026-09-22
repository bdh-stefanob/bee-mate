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

  // Il segnaposto di un campo password: il browser espone i pallini come nome
  // accessibile. Cercare un campo per il suo mascheramento vuol dire non
  // trovarlo mai — trenta secondi di attesa, sulla prima esecuzione vera.
  { name: "••••••••", stable: false, why: "segnaposto mascherato, non un nome" },
  { name: "****", stable: false, why: "segnaposto mascherato con asterischi" },

  { name: "Ordine 1830941 del 12/06/26", stable: false, why: "identificativo + data" },
  { name: "mario.rossi@example.com", stable: false, why: "indirizzo email" },
  { name: "£29.99", stable: false, why: "importo" },
  { name: "3 results", stable: false, why: "conteggio" },

  // Non-univoco: il componente esiste, ma il locator no.
  { name: "edit", stable: false, occurrences: 8, why: "otto elementi con lo stesso nome" },

  // Senza nome non e' raggiungibile per ruolo+nome, ed e' anche un problema a11y.
  { name: "", stable: false, why: "nessun nome accessibile" },

  // I falsi allarmi. Un numero di telefono ha un gruppo lungo di cifre e veniva
  // preso dalla regola sugli identificativi — ma e' l'etichetta stessa del
  // pulsante, non un valore che cambia. Visto due volte su pagine vere, ed e'
  // costato due righe di rumore in un elenco che vale solo se ogni riga merita
  // di essere guardata.
  { name: "telephone # 0203 3183773", stable: true, why: "numero di telefono: etichetta fissa" },
  { name: "+44 20 3318 3773", stable: true, why: "numero di telefono in forma internazionale" },
  { name: "Call us on 0203 3183 773", stable: true, why: "numero di telefono dentro a una frase" },

  // Ma l'eccezione non deve diventare un buco: un ordine resta instabile anche
  // se qualcuno gli scrive accanto la parola "call".
  { name: "Ordine 1830941", stable: false, why: "identificativo: l'eccezione non lo copre" },

  // Il testo del link E' l'URL: succede sui riferimenti bibliografici. Va
  // segnalato — uno screen reader lo legge per intero — ma per QUELLA ragione,
  // non per "contiene una data", che manda a cercare un problema inesistente.
  { name: "https://doi.org/10.1016/S2213-8587(25)00226-8", stable: false, why: "il nome e' un URL" },
  { name: "https://www.nature.com/articles/s41591-024-02996-7", stable: false, why: "il nome e' un URL" },
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
