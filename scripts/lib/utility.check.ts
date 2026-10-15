/**
 * utility.check.ts
 * ----------------
 * Il registro delle utility riconosce i passi registrati per identita'.
 *
 * I gesti sono quelli veri della registrazione del 14/10 (ordine successivo
 * su qa-clinic), con indirizzi finti: e' il caso da cui nasce la spec
 * docs/superpowers/specs/2026-10-14-utility-per-comportamento-design.md.
 */
import { segmentaPasso, utilityDelPasso, type GestoPerUtility } from "../../src/support/utility";

let failures = 0;
const eq = (what: string, got: unknown, want: unknown): void => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "OK  " : "FAIL"} ${what}${ok ? "" : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}`}`);
  if (!ok) failures++;
};

const Q = "https://qa-clinic.invalid/questions/1";
const MAPPA = "https://qa-clinic.invalid/pharmacy-map-selection";
const CAM = "https://qa-clinic.invalid/camera/id";
const SUM = "https://qa-clinic.invalid/summary";

console.log("\n--- farmacia ---\n");
const farmacia: GestoPerUtility[] = [
  { action: "fill", role: "textbox", name: "zip", value: "NW1", url: MAPPA },
  { action: "click", role: "button", name: "Select Pharmacy", url: MAPPA },
];
const f = utilityDelPasso(farmacia);
eq("CAP + Select Pharmacy: la utility della farmacia, completa", [f?.nome, f?.completa], ["farmacia", true]);
eq("e il CAP diventa il parametro", f?.parametri, ["NW1"]);
eq(
  "con il pin registrato (pulsante senza nome) e' la stessa cosa",
  utilityDelPasso([farmacia[0]!, { action: "click", role: "button", name: "", url: MAPPA }, farmacia[1]!])?.completa,
  true
);
// Hair loss, 15/10: il tester chiude la scheda di una farmacia prima di sceglierne una.
eq(
  "chiudere una scheda della mappa fa parte della farmacia",
  utilityDelPasso([farmacia[0]!, { action: "click", role: "button", name: "Close", url: MAPPA }, farmacia[1]!])?.completa,
  true
);
eq(
  "con un gesto estraneo e' solo una proposta",
  utilityDelPasso([...farmacia, { action: "click", role: "button", name: "Edit address", url: MAPPA }])?.completa,
  false
);
eq(
  "una proposta non porta parametri",
  utilityDelPasso([...farmacia, { action: "click", role: "button", name: "Edit address", url: MAPPA }])?.parametri,
  []
);

console.log("\n--- questionario ---\n");
const domande: GestoPerUtility[] = [
  { action: "click", role: "button", name: "Stay on the same dose", url: Q, intestazione: "How do you wish to proceed?" },
  { action: "fill", role: "spinbutton", name: "0", value: "190", url: Q, intestazione: "1. What is your current weight?" },
  { action: "fill", role: "spinbutton", name: "0", value: "80", url: Q, intestazione: "1. What is your current weight?" },
  { action: "click", role: "button", name: "Next", url: Q, intestazione: "1. What is your current weight?" },
  { action: "click", role: "button", name: "No", url: Q, intestazione: "3. Has there been any change in your medication?" },
];
const q = utilityDelPasso(domande);
eq("gesti su /questions/: il questionario, completo", [q?.nome, q?.completa], ["questionario", true]);
eq("la tabella: una riga per domanda, i numeri uniti nell'ordine, Next ignorato", q?.tabella, [
  ["domanda", "risposta"],
  ["How do you wish to proceed?", "Stay on the same dose"],
  ["1. What is your current weight?", "190 / 80"],
  ["3. Has there been any change in your medication?", "No"],
]);
const conData: GestoPerUtility[] = [
  { action: "click", role: "button", name: "Open calendar", url: Q, intestazione: "Enter date" },
  { action: "click", role: "", name: "", url: Q, intestazione: "Enter date", senzaAncoraggio: true },
  { action: "click", role: "button", name: "Next", url: Q, intestazione: "Enter date" },
];
eq("la data scelta dal calendario diventa «oggi»", utilityDelPasso(conData)?.tabella, [
  ["domanda", "risposta"],
  ["Enter date", "oggi"],
]);
eq(
  "un gesto fuori dal questionario lo rende una proposta",
  utilityDelPasso([...domande, { action: "click", role: "button", name: "Yes, pick up in store", url: "https://qa-clinic.invalid/pharmacies" }])?.completa,
  false
);

console.log("\n--- foto e pagamento ---\n");
eq(
  "solo gesti della fotocamera: foto, completa",
  [
    utilityDelPasso(
      ["Open camera", "Take Picture", "Save", "That's me", "Submit"].map((name) => ({ action: "click" as const, role: "button", name, url: CAM }))
    )?.nome,
    utilityDelPasso([{ action: "click", role: "button", name: "Open camera", url: CAM }])?.completa,
  ],
  ["foto", true]
);
const p = utilityDelPasso([
  { action: "click", role: "button", name: "....0000 Expiry 12/29", url: SUM },
  { action: "click", role: "button", name: "Place Order", url: SUM },
]);
eq("carta salvata + Place Order: pagamento, senza parametri", [p?.nome, p?.completa, p?.parametri], ["pagamento", true, []]);
// Revisione finale (15/10): con la carta digitata, `paga()` cercava una carta
// salvata che non c'e'. Senza la carta salvata il pagamento resta generato.
eq(
  "carta digitata + Place Order: non e' la utility del pagamento",
  segmentaPasso([
    { action: "fill", role: "textbox", name: "Credit or debit card number", value: "4000 0082 6000 0000", url: SUM },
    { action: "click", role: "button", name: "Place Order", url: SUM },
  ]).map((t) => t.utility?.nome ?? null),
  [null]
);

console.log("\n--- un passo misto si divide in tratti (registrazione del 14/10) ---\n");
const INFO = "https://qa-clinic.invalid/important-info";
const dose: GestoPerUtility[] = [
  { action: "set", role: "checkbox", name: "I understand the important information above.", value: "checked", url: INFO },
  { action: "click", role: "button", name: "Continue", url: INFO },
  { action: "click", role: "button", name: "Stay on the same dose", url: Q, intestazione: "How do you wish to proceed?" },
  { action: "fill", role: "spinbutton", name: "0", value: "190", url: Q, intestazione: "1. What is your current weight?" },
];
eq("due tratti: gesti generati, poi il questionario", segmentaPasso(dose).map((t) => [t.da, t.a, t.utility?.nome ?? null]), [
  [0, 2, null],
  [2, 4, "questionario"],
]);
const calendario: GestoPerUtility[] = [
  { action: "fill", role: "spinbutton", name: "0", value: "80", url: Q, intestazione: "1. What is your current weight?" },
  { action: "click", role: "button", name: "Next", url: Q, intestazione: "1. What is your current weight?" },
  { action: "click", role: "button", name: "Open calendar", url: Q, intestazione: "Enter date" },
  { action: "click", role: "", name: "", url: Q, senzaAncoraggio: true },
  { action: "click", role: "button", name: "Next", url: Q, intestazione: "Enter date" },
];
eq("un giorno del calendario senza intestazione resta nel questionario", segmentaPasso(calendario).length, 1);
eq("e prende la domanda del gesto prima", utilityDelPasso(calendario)?.tabella?.[2], ["Enter date", "oggi"]);
const fine: GestoPerUtility[] = [
  { action: "click", role: "button", name: "Submit", url: CAM },
  { action: "click", role: "button", name: "1 Secure messages", url: "https://qa-clinic.invalid/order-complete-async-no-call" },
];
eq(
  "l'ultimo invio della foto e il clic sui messaggi: foto, poi gesti generati",
  segmentaPasso(fine).map((t) => t.utility?.nome ?? null),
  ["foto", null]
);
eq(
  "un clic senza ancoraggio fuori dalla mappa non e' un pin",
  segmentaPasso([{ action: "click", role: "", name: "", url: INFO, senzaAncoraggio: true }]).map((t) => t.utility?.nome ?? null),
  [null]
);
eq(
  "un passo senza utility e' un tratto solo, generato",
  segmentaPasso([{ action: "click", role: "link", name: "Weight Loss", url: "https://qa-brochure.invalid/" }]).map((t) => [
    t.da,
    t.a,
    t.utility?.nome ?? null,
  ]),
  [[0, 1, null]]
);

console.log("\n--- scelta del prodotto (Hair loss e Weight Loss, 14-15/10) ---\n");
const PROD = "https://qa-clinic.invalid/products/HAI-F";
const clic = (name: string, intestazione = "Propecia"): GestoPerUtility => ({ action: "click", role: "button", name, url: PROD, intestazione });
const spunta = (name: string): GestoPerUtility => ({ action: "set", role: "radio", name, value: "checked", url: PROD, intestazione: "Propecia" });
const propecia = utilityDelPasso([
  clic("Bundle £20"), spunta("Bundle"),
  clic("No-bundle £150 £51"), spunta("No-bundle"),
  clic("2 months"), clic("1 month"),
  clic("No-bundle £150 £51"), spunta("No-bundle"),
  clic("Select"),
]);
eq("i gesti sulla pagina dei prodotti: la scelta del prodotto, completa", [propecia?.nome, propecia?.completa], ["prodotto", true]);
eq("solo le scelte finali, senza prezzi: la scheda, la durata, la formula", propecia?.parametri, ["Propecia", "1 month", "No-bundle"]);
const WL = "https://qa-clinic.invalid/products/WEI-F";
const wegovy = utilityDelPasso([
  { action: "click", role: "button", name: "7.2mg", url: WL, intestazione: "Wegovy" },
  { action: "click", role: "button", name: "Without Coaching £285.97", url: WL, intestazione: "Wegovy" },
  { action: "set", role: "radio", name: "Without Coaching", value: "checked", url: WL, intestazione: "Wegovy" },
  { action: "click", role: "button", name: "Select", url: WL, intestazione: "Wegovy" },
]);
eq("anche con la dose in milligrammi", wegovy?.parametri, ["Wegovy", "7.2mg", "Without Coaching"]);
eq(
  "senza Select non e' una scelta conclusa",
  utilityDelPasso([clic("1 month"), clic("No-bundle £150 £51")])?.completa ?? false,
  false
);

console.log("\n--- accesso ---\n");
const LOGIN = "https://qa-clinic.invalid/login";
const accesso = utilityDelPasso([
  { action: "click", role: "button", name: "Log in", url: "https://qa-brochure.invalid/" },
  { action: "fill", role: "textbox", name: "Email", value: "paziente@esempio.invalid", url: LOGIN },
  { action: "fill", role: "textbox", name: "••••••••", value: "<password>", secret: true, url: LOGIN },
  { action: "click", role: "button", name: "Log In", url: LOGIN },
]);
eq("brochure, email, password, Log In: l'accesso, completo", [accesso?.nome, accesso?.completa], ["accesso", true]);
eq("l'email diventa il parametro, la password mai", accesso?.parametri, ["paziente@esempio.invalid"]);
eq("la password la chiede l'ambiente", accesso?.argomentiDalMondo, ["this.passwordAmbiente()"]);

console.log("\n--- solo su clinic ---\n");
const FINTA = "http://127.0.0.1:4321/questions/1";
eq(
  "gli stessi gesti su un'altra applicazione (l'app finta) non sono una utility",
  [
    utilityDelPasso([{ action: "click", role: "button", name: "No", url: FINTA, intestazione: "Do you have a GP?" }]),
    segmentaPasso([{ action: "click", role: "button", name: "No", url: FINTA, intestazione: "Do you have a GP?" }])[0]?.utility,
  ],
  [null, null]
);

console.log("\n--- nessuna utility ---\n");
eq(
  "un passo qualunque non e' una utility",
  utilityDelPasso([{ action: "click", role: "link", name: "Weight Loss", url: "https://qa-brochure.invalid/" }]),
  null
);
eq("un passo vuoto non e' una utility", utilityDelPasso([]), null);

console.log(failures === 0 ? "\nTutti i controlli OK." : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
