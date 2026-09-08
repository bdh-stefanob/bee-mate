/**
 * gold.check.ts
 * -------------
 * Controlli sulla matrice di risoluzione.
 *
 * Perche' esistono: questa matrice decide quale formulazione diventa lo
 * standard che tutti dovranno usare. Se sbaglia, non fallisce niente — si
 * cristallizza la frase sbagliata e da quel momento la si trova ovunque. E' il
 * tipo di errore che si paga per anni.
 *
 * Uso:  npm run check:gold
 */

import { electGold, conformity, margin, type Candidate } from "./gold";

let failures = 0;

function check(ok: boolean, label: string, detail = ""): void {
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}${detail ? "  — " + detail : ""}`);
}

// ---------------------------------------------------------------------------
// Conformita'
// ---------------------------------------------------------------------------

check(
  conformity("the user completes SMS verification").score > 0.9,
  "una frase dichiarativa e' conforme",
  conformity("the user completes SMS verification").score.toFixed(2)
);

check(
  conformity('the user clicks the "Login" button').score < 0.7,
  "la meccanica UI abbassa la conformita'",
  conformity('the user clicks the "Login" button').reasons.join(" · ")
);

check(
  conformity("the user logs in as {string}").score >= 1,
  "la parametrizzazione premia",
  conformity("the user logs in as {string}").score.toFixed(2)
);

check(
  conformity('the user logs in as "admin"').score < 1,
  "un valore letterale non mascherato penalizza",
  conformity('the user logs in as "admin"').reasons.join(" · ")
);

// ---------------------------------------------------------------------------
// Elezione
// ---------------------------------------------------------------------------

// Il caso che il modello esiste per gestire: la frase piu' diffusa NON deve
// vincere se e' imperativa. E' cosi' che l'entropia si cristallizza.
{
  const candidates: Candidate[] = [
    { text: 'the user clicks "Login" and then clicks "Continue"', occurrences: 40, areas: ["qa"] },
    { text: "the user logs in as {string}", occurrences: 8, areas: ["qa", "mobile", "store"] },
  ];
  const scored = electGold(candidates);
  check(
    scored[0]!.text === "the user logs in as {string}",
    "una frase dichiarativa usata da piu' aree batte una imperativa piu' frequente",
    `vince "${scored[0]!.text}" (${scored[0]!.score.toFixed(2)} vs ${scored[1]!.score.toFixed(2)})`
  );
}

// A parita' di qualita', vince la piu' diffusa fra le aree.
{
  const candidates: Candidate[] = [
    { text: "the user opens the order list", occurrences: 20, areas: ["qa"] },
    { text: "the user views the order list", occurrences: 18, areas: ["qa", "mobile"] },
  ];
  const scored = electGold(candidates);
  check(
    scored[0]!.areas.length === 2,
    "a qualita' pari vince quella usata da piu' aree",
    `vince "${scored[0]!.text}"`
  );
}

// L'aggancio ai componenti e' un vantaggio, non un requisito.
{
  const candidates: Candidate[] = [
    { text: "the user submits the form", occurrences: 10, areas: ["qa"] },
    {
      text: "the user submits the form",
      occurrences: 10,
      areas: ["qa"],
      components: [{ role: "button", name: "Submit" }],
    },
  ];
  const scored = electGold(candidates);
  check(
    (scored[0]!.components?.length ?? 0) > 0,
    "a parita', vince la variante agganciata a componenti reali"
  );
}

// Il distacco serve a sapere quando NON presentare la scelta come gia' fatta.
{
  const netta = electGold([
    { text: "the user logs in as {string}", occurrences: 50, areas: ["qa", "mobile"] },
    { text: 'the user clicks "Login" button and waits for the page', occurrences: 2, areas: ["qa"] },
  ]);
  const incerta = electGold([
    { text: "the user opens the order list", occurrences: 10, areas: ["qa"] },
    { text: "the user views the order list", occurrences: 10, areas: ["qa"] },
  ]);
  check(margin(netta) > 0.2, "una vittoria netta si riconosce", margin(netta).toFixed(2));
  check(margin(incerta) < 0.05, "un pareggio si riconosce", margin(incerta).toFixed(2));
}

// Casi degeneri: non devono lanciare.
check(electGold([]).length === 0, "gruppo vuoto: nessun candidato, nessuna eccezione");
check(margin(electGold([{ text: "x", occurrences: 1, areas: [] }])) === 1, "un solo candidato: distacco massimo");

console.log(failures === 0 ? "\nTUTTO OK" : `\n${failures} CONTROLLI FALLITI`);
process.exit(failures === 0 ? 0 : 1);
