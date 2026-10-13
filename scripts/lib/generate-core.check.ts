/**
 * generate-core.check.ts
 * ----------------------
 * Controlli sulla generazione. Due livelli, perche' sbagliano in modi diversi.
 *
 * 1. LE FUNZIONI PURE — identita' delle pagine, aggancio al dizionario, rosa dei
 *    candidati. Qui gli errori sono silenziosi: una Page Object di troppo, un
 *    componente attribuito alla pagina sbagliata, un candidato mancante. Niente
 *    si rompe, e il risultato e' semplicemente peggiore senza che si veda.
 *
 * 2. LA CATENA INTERA — si genera da una registrazione finta e **si compila**.
 *    E' il livello che prende le cose che sfuggono al ragionamento: un badge di
 *    carrello che si chiama "1" produce `1Button`, che non e' un identificatore
 *    TypeScript valido. Nessuno ci arriva pensandoci; il compilatore ci arriva
 *    sempre.
 *
 * La registrazione finta e' fatta apposta per essere ostile: un intento che
 * cambia pagina, un URL con un identificativo dentro, un componente che nel
 * dizionario NON c'e', una verifica ancorata a un numero, e un catalogo in
 * inglese contro etichette in italiano.
 *
 * Uso:  npm run check:generate
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  looksLikeId, pageIdentity, uniqueNames, indexDictionaries, resolveRecording, rankCandidates, componentsForPage,
  senzaGestiDoppi,
} from "./generate-core";
import { componenteSenzaRuolo, toComponent } from "./component-naming";
import { ricettaDelGesto } from "../../src/support/ricette";
import { assertLoadedBody, emitPageObject, emitSteps, frasiDiIntento, phraseOf, rilevaRipetizione } from "./generate-emit";
import type {
  CatalogStep, Gap, Intent, Recording, ResolvedIntent, ResolvedStep, ScoutResult, Step,
} from "./generation-contract";

const ROOT = path.join(__dirname, "..", "..");
const FIXTURES = path.join(ROOT, "test-fixtures", "generate");
const TMP = path.join(ROOT, "reports", ".generate-check");

let failures = 0;

function ok(what: string): void {
  console.log(`OK   ${what}`);
}
function fail(what: string, detail: string): void {
  failures++;
  console.log(`FAIL ${what}\n       ${detail.split("\n").join("\n       ")}`);
}
function eq(what: string, actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) ok(what);
  else fail(what, `ottenuto ${JSON.stringify(actual)}, atteso ${JSON.stringify(expected)}`);
}
function truthy(what: string, value: unknown, detail = ""): void {
  if (value) ok(what);
  else fail(what, detail || "atteso qualcosa di vero");
}

// ---------------------------------------------------------------------------
// 1. Identita' delle pagine
// ---------------------------------------------------------------------------

console.log("\n--- identita' delle pagine ---\n");

for (const [segment, expected, why] of [
  ["4821", true, "solo cifre: e' un identificativo"],
  ["550e8400-e29b-41d4-a716-446655440000", true, "uuid"],
  ["a3f9c2b81d4e", true, "esadecimale lungo"],
  ["ordini", false, "parola"],
  ["order-detail", false, "parola composta"],
  ["v2", false, "versione: fa parte del percorso"],
] as const) {
  const got = looksLikeId(segment);
  if (got === expected) ok(`"${segment}" -> ${got ? "id" : "percorso"} (${why})`);
  else fail(`"${segment}"`, `ottenuto ${got}, atteso ${expected} — ${why}`);
}

{
  const id = pageIdentity("https://esempio.invalid/ordini/4821?token=abc#giu");
  eq("l'identificativo nel percorso non fa pagina a se'", id.pattern, "/ordini/:id");
  eq("il percorso vero resta intero, serve a navigare", id.path, "/ordini/4821");
  eq("il nome di classe viene dal segmento parlante", id.className, "OrdiniPage");
}
{
  const id = pageIdentity("https://esempio.invalid/");
  eq("la radice si chiama Home", id.className, "HomePage");
}
{
  const id = pageIdentity("https://esempio.invalid/inventory.html");
  eq("l'estensione non entra nel nome", id.className, "InventoryPage");
}
{
  const id = pageIdentity("non-un-url");
  eq("un URL illeggibile non fa cadere niente", id.className, "HomePage");
}

{
  // `text` e' il ripiego della sonda per un pezzo di testo senza ruolo — un
  // totale, un numero, un messaggio: esattamente cio' che si indica quando si
  // verifica. Non e' un ruolo ARIA, e `getByRole('text', ...)` non compila. La
  // prima registrazione vera con una verifica su un numero l'ha dimostrato.
  const testo = toComponent({ role: "text", name: "1801" }, 1);
  eq("un testo senza ruolo si cerca per testo", testo.locator.startsWith("getByText("), true);
  eq("e non per ruolo", testo.locator.includes("getByRole("), false);

  const pulsante = toComponent({ role: "button", name: "Annulla" }, 1);
  eq("un ruolo ARIA resta getByRole", pulsante.locator.startsWith("getByRole('button'"), true);
}

{
  // Il campo password, sulla prima esecuzione vera, e' stato cercato come
  // `getByRole('textbox', { name: '••••••••' })`: il nome era il segnaposto
  // mascherato, e `input[type=password]` non ha nemmeno ruolo ARIA implicito.
  // Trenta secondi di attesa, poi il fallimento.
  const pwd = toComponent({ role: "textbox", name: "••••••••", secret: true }, 1);
  eq("il campo password si cerca per tipo", pwd.locator, `locator('input[type="password"]')`);
  eq("e non per il suo mascheramento", pwd.locator.includes("•"), false);
  eq("e si chiama Password, non 'unnamed'", pwd.method, "fillPassword");
}

{
  // Come la pagina si riconosce. Sull'applicazione vera il test si fermava qui:
  // l'ancoraggio era la verifica del tester — un link che compare solo dopo aver
  // aperto una riga — e all'arrivo sulla pagina non esisteva ancora.
  const toccato = toComponent({ role: "link", name: "Batching" }, 1);
  const verificato = toComponent({ role: "link", name: "Missing" }, 1);
  const componenti = [toccato, verificato]; // nell'ordine della registrazione
  const campi = new Map([
    [toccato, "batchingLink"],
    [verificato, "missingLink"],
  ]);
  const verifiche = [{ role: "link", name: "Missing" }];

  const corpo = assertLoadedBody(verifiche, componenti, campi);
  eq("la pagina si riconosce da cio' che il tester ha toccato", corpo.includes("batchingLink"), true);
  eq("non dalla verifica, che dimostra un momento", corpo.includes("missingLink"), false);

  // Se non c'e' niente di toccato e stabile, la verifica resta un ripiego
  // dichiarato: meglio di niente, ma va detto che e' piu' debole.
  const soloVerifica = assertLoadedBody(verifiche, [verificato], new Map([[verificato, "missingLink"]]));
  eq("senza elementi toccati si ripiega sulla verifica", soloVerifica.includes("missingLink"), true);
  eq("e lo dichiara", soloVerifica.includes("dimostra un momento"), true);
}

{
  // LA PAGINA NON SI RICONOSCE DA CIO' CHE COMPARE DOPO UN'AZIONE.
  //
  // Il difetto che questo caso ferma (collaudo del 30/9, saucedemo): nella
  // pagina dei prodotti "Add to cart" esiste sei volte, quindi e' ambiguo e non
  // "stabile". Non c'era altro di toccato, e si ripiegava sulla verifica del
  // tester — "Cart, 1 items" — che compare solo DOPO il clic. assertLoaded()
  // la aspettava all'arrivo, prima di cliccare: dieci secondi e il test cadeva
  // sul primo passo, con un messaggio che accusava il locator.
  //
  // Un elemento toccato ma ambiguo esisteva di sicuro all'arrivo (ci si e'
  // cliccato sopra) e il suo locator usa gia' .first(): e' un'ancora migliore
  // di una verifica, e il generatore lo sa dichiarare.
  const ambiguo = toComponent({ role: "button", name: "Add to cart" }, 6);
  const poi = toComponent({ role: "button", name: "Cart, 1 items" }, 1);
  const campiInventario = new Map([[ambiguo, "addToCartButton"], [poi, "cart1ItemsButton"]]);
  const corpoInventario = assertLoadedBody([{ role: "button", name: "Cart, 1 items" }], [ambiguo, poi], campiInventario);
  eq("un elemento toccato ma ambiguo ancora la pagina", corpoInventario.includes("addToCartButton"), true);
  eq("e la verifica che compare dopo il clic no", corpoInventario.includes("cart1ItemsButton"), false);

  // Stessa pagina, ma "Cart, 1 items" toccato in un passo successivo invece che
  // verificato. Era stabile e vinceva sull'ambiguo toccato prima: ma esiste solo
  // DOPO il clic su Add to cart. L'ancora e' il primo toccato, stabile o no.
  const corpoSenzaVerifica = assertLoadedBody([], [ambiguo, poi], campiInventario);
  eq("il primo toccato vince anche se ambiguo", corpoSenzaVerifica.includes("addToCartButton"), true);
  eq("e lo stabile toccato dopo no", corpoSenzaVerifica.includes("cart1ItemsButton"), false);
}

{
  // Due pagine diverse che finiscono uguale: senza disambiguazione la seconda
  // sovrascriverebbe la prima in silenzio.
  const ids = uniqueNames([
    pageIdentity("https://esempio.invalid/admin/settings"),
    pageIdentity("https://esempio.invalid/account/settings"),
    pageIdentity("https://esempio.invalid/carrello"),
  ]);
  eq("collisione disambiguata", [ids[0]!.className, ids[1]!.className], ["AdminSettingsPage", "AccountSettingsPage"]);
  eq("chi non collide non viene rinominato", ids[2]!.className, "CarrelloPage");
}

{
  // L'incidente del 2026-09-16, sulla prima registrazione vera: l'elenco e il
  // dettaglio della stessa risorsa. Stesso segmento parlante, nessun segmento
  // prima da usare come prefisso, stesso host: la disambiguazione produceva di
  // nuovo due nomi uguali. La seconda Page Object ha sovrascritto la prima, e il
  // test e' arrivato con 8 metodi mancanti e 4 dichiarazioni doppie.
  const ids = uniqueNames([
    pageIdentity("https://esempio.invalid/visite"),
    pageIdentity("https://esempio.invalid/visite/9712"),
  ]);
  eq("elenco e dettaglio hanno due nomi", [ids[0]!.className, ids[1]!.className], ["VisitePage", "VisiteDetailPage"]);
  eq("e due file", [ids[0]!.slug, ids[1]!.slug], ["visite", "visite-detail"]);
}

{
  const ids = uniqueNames([
    pageIdentity("https://esempio.invalid/negozio/ordini/1"),
    pageIdentity("https://esempio.invalid/archivio/ordini/2"),
  ]);
  eq(
    "due dettagli in rami diversi",
    [ids[0]!.className, ids[1]!.className],
    ["NegozioOrdiniDetailPage", "ArchivioOrdiniDetailPage"]
  );
}

{
  // L'ultima rete: due host diversi che nessuna regola sa separare per nome.
  // Meglio un numero in coda che una sovrascrittura silenziosa.
  const ids = uniqueNames([
    pageIdentity("https://a-b.invalid/x"),
    pageIdentity("https://a.b.invalid/x"),
  ]);
  const nomi = ids.map((i) => i.className);
  eq("mai due nomi di classe uguali, neanche all'ultima rete", new Set(nomi).size, nomi.length);
  eq("e mai due file uguali", new Set(ids.map((i) => i.slug)).size, ids.length);
}

// ---------------------------------------------------------------------------
// 2. Aggancio e rosa dei candidati
// ---------------------------------------------------------------------------

console.log("\n--- aggancio al dizionario ---\n");

const recording = JSON.parse(fs.readFileSync(path.join(FIXTURES, "recording.json"), "utf-8")) as Recording;
const dicts = fs
  .readdirSync(path.join(FIXTURES, "scout"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(FIXTURES, "scout", f), "utf-8")) as ScoutResult);
const catalog = (JSON.parse(fs.readFileSync(path.join(FIXTURES, "catalog.json"), "utf-8")) as { steps: CatalogStep[] }).steps;

const resolved = resolveRecording(recording, indexDictionaries(dicts), { catalog });

eq("due pagine, non una e non tre", resolved.pages.length, 2);
eq(
  "i nomi delle pagine",
  resolved.pages.map((p) => p.className).sort(),
  ["AccessoPage", "OrdiniPage"]
);

{
  const first = resolved.intents[0]!;
  truthy(
    "l'intento che ha cambiato pagina lo dichiara",
    first.navigatesTo && first.navigatesTo.includes("/ordini/:id"),
    `navigatesTo = ${first.navigatesTo}`
  );
  eq("i gesti restano attribuiti alla pagina su cui sono avvenuti", first.page, "esempio.invalid/accesso");
}

{
  const cancel = resolved.intents[1]!.steps[0]!;
  truthy("il componente assente dal dizionario viene sintetizzato, non perso", cancel.synthesised);
  eq("e il locator e' quello che userebbe lo scout", cancel.component.locator, "getByRole('button', { name: 'Annulla ordine' })");
}

{
  // UN GESTO RIPETUTO NON SI PERDE (registrazione vera, 2/10: la sequenza fotocamera
  // "Take Picture, Save, That's me" fatta DUE volte usciva una volta sola).
  // I metodi sono indicizzati per identita' dell'oggetto componente: su una pagina
  // fuori dallo scout ogni occorrenza ne creava uno nuovo, e tutte tranne una
  // venivano saltate in silenzio.
  const url = "https://esempio.invalid/camera";
  const clic = (name: string) => ({ action: "click" as const, role: "button", name, url });
  const ripetuta: Recording = {
    startUrl: url, recordedAt: "", durationSeconds: 1, pagesVisited: [url],
    summary: { intents: 1, steps: 4, assertions: 0, unlabelled: 0 },
    intents: [{
      label: "il cliente fa due foto", pageUrl: url, steps: [clic("Take Picture"), clic("Save"), clic("Take Picture"), clic("Save")],
      assertions: [], notes: [],
    }],
  } as Recording;
  const r = resolveRecording(ripetuta, indexDictionaries([]), { catalog: [] });
  const passi = r.intents[0]!.steps;
  truthy(
    "due gesti uguali su una pagina fuori dallo scout condividono il componente",
    passi[0]!.component === passi[2]!.component && passi[1]!.component === passi[3]!.component,
    "oggetti diversi: il generatore ne salta uno, in silenzio"
  );
}

{
  // DUE INDIRIZZI CON LA STESSA CHIAVE MASCHERATA: UNA PAGINA O DUE?
  //
  // Lo decidono i componenti osservati, non la forma dell'indirizzo (decisione
  // del proprietario, 2026-10-02). Il caso che conta e' che la stessa funzione
  // dia le due risposte opposte sui due casi veri: un dettaglio di risorsa
  // (`/orders/1830941`) e un passo di procedura (`/questions/1`).
  const sessione = (percorsi: Array<[string, string]>): Recording => ({
    startUrl: `https://esempio.invalid${percorsi[0]![0]}`,
    recordedAt: "", durationSeconds: 1,
    pagesVisited: percorsi.map(([p]) => `https://esempio.invalid${p}`),
    summary: { intents: 1, steps: percorsi.length, assertions: 0, unlabelled: 0 },
    intents: [{
      label: "il cliente attraversa due pagine",
      pageUrl: `https://esempio.invalid${percorsi[0]![0]}`,
      steps: percorsi.map(([p, nome]) => ({
        action: "click" as const, role: "button", name: nome, url: `https://esempio.invalid${p}`,
      })),
      assertions: [], notes: [],
    }],
  }) as Recording;

  const uguali = resolveRecording(
    sessione([["/orders/1830941", "Pay"], ["/orders/1830942", "Pay"]]),
    indexDictionaries([]),
    { catalog: [] }
  );
  eq(
    "due indirizzi con gli stessi componenti sono una Page Object sola",
    uguali.pages.map((p) => p.className),
    ["OrdersPage"]
  );

  const diversi = resolveRecording(
    sessione([["/questions/1", "Next"], ["/questions/2", "No GP"]]),
    indexDictionaries([]),
    { catalog: [] }
  );
  eq(
    "due indirizzi con componenti diversi restano due Page Object, col numero nel nome",
    diversi.pages.map((p) => p.className).sort(),
    ["Questions1Page", "Questions2Page"]
  );
  truthy(
    "e le due Page Object non hanno la stessa chiave: la seconda non sovrascrive la prima",
    new Set(diversi.pages.map((p) => p.key)).size === diversi.pages.length,
    "stessa chiave: un file sovrascriverebbe l'altro in silenzio"
  );
}

const kinds = (g: readonly Gap[]): string[] => [...new Set(g.map((x) => x.kind))].sort();
eq(
  "i buchi dichiarati sono quelli veri",
  kinds(resolved.gaps),
  ["asserzione-non-verificabile", "componente-non-nel-dizionario"]
);

console.log("\n--- rosa dei candidati ---\n");

{
  // IL CASO CHE CONTA. L'etichetta e' in italiano, il catalogo in inglese:
  // nessuna somiglianza lessicale li fara' mai incontrare. Li fa incontrare
  // l'ancoraggio ai componenti, che di lingua non ne ha.
  const first = resolved.intents[0]!.candidates;
  eq(
    "italiano contro inglese: li aggancia il componente, non la parola",
    first[0]?.expression,
    "the customer signs in"
  );

  const second = resolved.intents[1]!.candidates;
  eq("stesso meccanismo sul secondo intento", second[0]?.expression, "the customer cancels an order");

  const all = [...first, ...second].map((c) => c.expression);
  truthy(
    "uno step senza niente in comune resta fuori dalla rosa",
    !all.includes("the warehouse dispatches the parcel"),
    `la rosa conteneva: ${all.join(" | ")}`
  );
}

{
  // IL CASO CHE DIVENTERA' NORMALE: etichetta ed espressione nella stessa
  // lingua, e uno step di catalogo che NON dichiara componenti — che oggi e' la
  // stragrande maggioranza.
  //
  // Prima della normalizzazione uno step del genere prendeva 0 sull'ancoraggio,
  // cioe' veniva punito per un campo non compilato, e per superare la soglia gli
  // serviva il 67% di somiglianza lessicale. Lo strumento restava muto proprio
  // nel caso piu' comune.
  const intent: Intent = {
    label: "the customer cancels the order",
    steps: [{ action: "click", role: "button", name: "Cancel order" }],
    assertions: [],
    notes: [],
  };
  const soloTesto: CatalogStep[] = [
    { expression: "the customer cancels an order", keyword: "When" },
    { expression: "the warehouse dispatches the parcel", keyword: "When" },
  ];
  const rosa = rankCandidates(intent, [], soloTesto, 5);
  eq(
    "stessa lingua, step non ancorato: entra lo stesso nella rosa",
    rosa[0]?.step.expression,
    "the customer cancels an order"
  );
  truthy(
    "e quello che non c'entra resta comunque fuori",
    !rosa.some((c) => c.step.expression.includes("warehouse")),
    `la rosa conteneva: ${rosa.map((c) => c.step.expression).join(" | ")}`
  );
}

{
  // L'ancoraggio deve restare piu' forte del lessico: quando i due segnali
  // indicano candidati diversi, vince il componente. E' identita' contro stima.
  const intent: Intent = {
    label: "the user signs in",
    steps: [{ action: "click", role: "button", name: "Entra" }],
    assertions: [],
    notes: [],
  };
  const misto: CatalogStep[] = [
    { expression: "the user signs in to the newsletter", keyword: "When" },
    { expression: "il cliente accede", keyword: "Given", components: [{ role: "button", name: "Entra" }] },
  ];
  const resolvedSteps: ResolvedStep[] = [
    {
      step: { action: "click", role: "button", name: "Entra" },
      component: {
        role: "button", name: "Entra", kind: "action",
        locator: "getByRole('button', { name: 'Entra' })", method: "clickEntra",
        occurrences: 1, stability: "stable", notes: [],
      },
      synthesised: false,
      fromPage: "esempio.invalid/accesso",
    },
  ];
  const rosa = rankCandidates(intent, resolvedSteps, misto, 5);
  eq(
    "quando i due segnali litigano, vince il componente",
    rosa[0]?.step.expression,
    "il cliente accede"
  );
  // Ogni candidato dice a quale classe di prove deve il suo posto: serve ai
  // suggerimenti, che mostrano una prova e una stima in modo diverso.
  eq("la rosa dice la classe di ogni candidato", rosa.map((c) => c.classe), ["stessi-componenti", "formulazione-simile"]);
  truthy("una stima porta la sua somiglianza di frase", (rosa[1]?.similarity ?? 0) >= 0.45, `${rosa[1]?.similarity}`);
}

{
  // UN PASSO CHE ATTRAVERSA PIU' PAGINE.
  //
  // Il difetto che questo caso ferma (collaudo del 30/9): "l'utente completa
  // l'ordine" parte dal carrello e arriva fino a "Finish", toccando tre pagine.
  // La Page Object si creava solo per la pagina dove l'intento comincia; le
  // altre venivano usate senza mai essere assegnate. tsc dava TS2454
  // ("used before being assigned") e, finche' quel file restava in src/steps,
  // NESSUNO scenario compilava piu'. Il fixture di questo controllo non aveva
  // un intento cosi', e la compilazione della catena qui sotto non poteva
  // accorgersene.
  const pagina = (host: string, percorso: string, nome: string) => ({
    key: `${host}${percorso}`, keyEsatta: `${host}${percorso}`, host, path: percorso, pattern: percorso,
    className: `${nome}Page`, slug: nome.toLowerCase(),
  });
  const carrello = pagina("shop.invalid", "/cart", "Cart");
  const dati = pagina("shop.invalid", "/checkout-step-one", "CheckoutStepOne");
  const riepilogo = pagina("shop.invalid", "/checkout-step-two", "CheckoutStepTwo");

  const componente = (nome: string) => toComponent({ role: "button", name: nome }, 1);
  const cCheckout = componente("Checkout");
  const cContinue = componente("Continue");
  const cFinish = componente("Finish");
  const passo = (c: typeof cCheckout, nome: string, fromPage: string): ResolvedStep => ({
    step: { action: "click", role: "button", name: nome },
    component: c, synthesised: false, fromPage,
  });

  const intento: ResolvedIntent = {
    label: "the user completes the order",
    steps: [
      passo(cCheckout, "Checkout", carrello.key),
      passo(cContinue, "Continue", dati.key),
      passo(cFinish, "Finish", riepilogo.key),
    ],
    assertions: [], notes: [],
    page: carrello.key, navigatesTo: null, candidates: [],
  };
  const metodi = new Map([
    [carrello.key, new Map([[cCheckout, "clickCheckout"]])],
    [dati.key, new Map([[cContinue, "clickContinue"]])],
    [riepilogo.key, new Map([[cFinish, "clickFinish"]])],
  ]);

  const file = emitSteps(
    {
      intents: [intento], pages: [carrello, dati, riepilogo],
      recordingPath: "x.json", dictionaryPaths: [], recordedAt: "", durationSeconds: 0,
      generatedAt: "", slug: "tre-pagine", outRoot: "src",
    },
    [carrello, dati, riepilogo],
    metodi as never
  );

  // Ogni variabile di Page Object deve essere assegnata, in ordine di
  // esecuzione, PRIMA della riga che ne chiama un metodo.
  const assegnate = new Set<string>();
  const usateSenzaAssegnare: string[] = [];
  for (const riga of file.contents.split(/\r?\n/)) {
    const nuova = riga.match(/^\s*(\w+) = new \w+\(/);
    if (nuova) assegnate.add(nuova[1]!);
    const uso = riga.match(/^\s*await (\w+)\.(?!assertLoaded|navigate)\w+\(/);
    if (uso && !assegnate.has(uso[1]!)) usateSenzaAssegnare.push(uso[1]!);
  }
  eq("un passo su tre pagine: nessuna Page Object usata prima di essere creata", usateSenzaAssegnare, []);

  // IL PASSO NON SI CHIUDE RICONOSCENDO LA PAGINA CHE HA APPENA LASCIATO.
  //
  // Il difetto (prima esecuzione sull'ambiente QA, 13/10): l'indirizzo di fine
  // passo e' quello dell'ultimo gesto, cioe' la pagina su cui «Finish» e' stato
  // cliccato. Lo step, dopo il clic, pretendeva di essere ancora li' — e dopo
  // un clic che naviga non c'e' piu'.
  const finisceNavigando = emitSteps(
    {
      intents: [{ ...intento, navigatesTo: riepilogo.key }], pages: [carrello, dati, riepilogo],
      recordingPath: "x.json", dictionaryPaths: [], recordedAt: "", durationSeconds: 0,
      generatedAt: "", slug: "finisce-navigando", outRoot: "src",
    },
    [carrello, dati, riepilogo],
    metodi as never
  ).contents;
  eq(
    "dopo l'ultimo gesto non si pretende di essere ancora sulla sua pagina",
    finisceNavigando.slice(finisceNavigando.indexOf("clickFinish()")).includes("assertLoaded()"),
    false
  );

  // UN PASSO CHE FINISCE SU UNA PAGINA DOVE NON SI E' TOCCATO NIENTE.
  //
  // Il difetto (collaudo sull'app vera, 30/9): il passo arrivava su una pagina di
  // messaggi e finiva li'. Nessun gesto su quella pagina, quindi nessuna Page
  // Object generata; ma lo step la costruiva lo stesso per riconoscere l'arrivo.
  // tsc: "Cannot find name 'MessagesPage'", e con lui tutti gli scenari fermi.
  const arrivo = pagina("shop.invalid", "/messages", "Messages");
  const conArrivo = emitSteps(
    {
      intents: [{ ...intento, navigatesTo: arrivo.key }], pages: [carrello, dati, riepilogo, arrivo],
      recordingPath: "x.json", dictionaryPaths: [], recordedAt: "", durationSeconds: 0,
      generatedAt: "", slug: "arrivo", outRoot: "src",
    },
    [carrello, dati, riepilogo], // la pagina di arrivo non ha componenti: nessuna Page Object
    metodi as never
  ).contents;
  eq(
    "una pagina senza Page Object non viene mai costruita nello step",
    /\bMessagesPage\b|\bmessagesPage\b/.test(conArrivo.replace(/^\s*\/\/.*$/gm, "")),
    false
  );
  // LA PAGINA DI ARRIVO SI GENERA. Le verifiche in coda a un passo che cambia
  // pagina sono state fatte sulla pagina di ARRIVO: danno alla Page Object i
  // componenti con cui riconoscersi. Senza, la pagina non esiste e lo scenario
  // non sa dove e' arrivato.
  const comeComponente = (a: { role: string; name: string }) => toComponent({ role: a.role, name: a.name }, 1);
  const conVerificaInArrivo: ResolvedIntent = {
    ...intento,
    steps: [passo(cCheckout, "Checkout", carrello.key)],
    assertions: [{ role: "heading", name: "Secure messages" }],
    navigatesTo: arrivo.key,
  };
  eq(
    "la verifica a fine passo diventa un componente della pagina di arrivo",
    componentsForPage([conVerificaInArrivo], arrivo.key, comeComponente).map((c) => c.name),
    ["Secure messages"]
  );
  eq(
    "e non della pagina di partenza",
    componentsForPage([conVerificaInArrivo], carrello.key, comeComponente).map((c) => c.name),
    ["Checkout"]
  );

  truthy(
    "la prima pagina si apre con navigate(), le altre si riconoscono con assertLoaded()",
    file.contents.includes("await cartPage.navigate();") &&
      ["checkoutStepOnePage", "checkoutStepTwoPage"].every((v) =>
        file.contents.includes(`await ${v}.assertLoaded();`)
      ),
    "una delle pagine non viene riconosciuta prima dell'uso"
  );
}

{
  // L'ultimo passo non chiuso finiva nel feature come una frase in italiano,
  // dentro uno scenario scritto in inglese (collaudo del 30/9). Il generatore
  // parla la lingua delle frasi del catalogo, anche quando la traccia porta
  // un'etichetta di servizio scritta dal recorder.
  const vuoto = { steps: [], assertions: [], notes: [], page: null, navigatesTo: null, candidates: [] };
  eq(
    "un passo non chiuso non diventa una frase in italiano",
    phraseOf({ ...vuoto, label: "(non chiuso — il tester non ha premuto Fine intento)" }),
    "the tester did not close this step"
  );
  eq(
    "un passo senza nome nemmeno",
    phraseOf({ ...vuoto, label: "(intento senza nome)" }),
    "unnamed step"
  );
}

console.log("\n--- ripetizione -> ciclo (G2, punto 1) ---\n");

{
  // IL CASO CHE CONTA (G2-ricette-mappa-e-ripetizioni.md, punto 1, con lo
  // stesso esempio della registrazione vera: "Take Picture, Save, That's me"
  // fatta due volte nel flusso della fotocamera, 2/10).
  //
  // PRIMA DI QUESTO COMMIT: nella glue generata c'erano 6 chiamate di fila, una
  // per gesto, e nessun parametro di conteggio ne' nel .feature ne' nello step —
  // il blocco si ripeteva silenziosamente tale e quale al numero di volte
  // registrato. DOPO: un ciclo di 3 chiamate che gira "volte" volte, e un "2"
  // nel .feature. Il blocco sotto costruisce quella registrazione e verifica
  // entrambe le meta' dell'affermazione: la rilevazione e il codice emesso.
  const url = "https://esempio.invalid/camera";
  const camera = {
    key: url, keyEsatta: url, host: "esempio.invalid", path: "/camera", pattern: "/camera",
    className: "CameraPage", slug: "camera",
  };
  const cTakePicture = toComponent({ role: "button", name: "Take Picture" }, 1);
  const cSave = toComponent({ role: "button", name: "Save" }, 1);
  const cThatsMe = toComponent({ role: "button", name: "That's me" }, 1);
  const gesto = (c: typeof cTakePicture, nome: string): ResolvedStep => ({
    step: { action: "click", role: "button", name: nome },
    component: c, synthesised: false, fromPage: camera.key,
  });
  const dueVolte: ResolvedStep[] = [
    gesto(cTakePicture, "Take Picture"), gesto(cSave, "Save"), gesto(cThatsMe, "That's me"),
    gesto(cTakePicture, "Take Picture"), gesto(cSave, "Save"), gesto(cThatsMe, "That's me"),
  ];
  const intento: ResolvedIntent = {
    label: "il cliente fa due foto",
    steps: dueVolte, assertions: [], notes: [],
    page: camera.key, navigatesTo: null, candidates: [],
  };

  const rip = rilevaRipetizione(dueVolte);
  eq(
    "sei gesti, tre diversi ripetuti due volte: la ripetizione si trova",
    rip,
    { inizio: 0, lunghezza: 3, ripetizioni: 2 }
  );

  const frasi = frasiDiIntento(intento);
  truthy(
    "l'espressione dello step porta un {int} per il conteggio",
    frasi.espressione.endsWith(", {int} times"),
    frasi.espressione
  );
  truthy(
    "la frase nel .feature porta il numero vero osservato nella registrazione",
    frasi.frase.endsWith(", 2 times"),
    frasi.frase
  );
  eq("il parametro del conteggio si chiama 'volte'", frasi.parametroVolte, "volte");

  const metodi = new Map([
    [camera.key, new Map([
      [cTakePicture, "clickTakePicture"], [cSave, "clickSave"], [cThatsMe, "clickThatsMe"],
    ])],
  ]);
  const file = emitSteps(
    {
      intents: [intento], pages: [camera],
      recordingPath: "x.json", dictionaryPaths: [], recordedAt: "", durationSeconds: 0,
      generatedAt: "", slug: "due-foto", outRoot: "src",
    },
    [camera],
    metodi as never
  );

  truthy(
    "la glue emette un ciclo for, non sei chiamate incollate",
    /for \(let i = 0; i < volte; i\+\+\) \{/.test(file.contents),
    file.contents
  );
  const chiamateTakePicture = (file.contents.match(/\.clickTakePicture\(\)/g) ?? []).length;
  eq("il gesto ripetuto compare una volta sola nel codice, non due", chiamateTakePicture, 1);
  truthy(
    "la funzione dello step riceve 'volte: number'",
    /async function \(this: CustomWorld, volte: number\)/.test(file.contents),
    file.contents
  );
  truthy(
    "le tre chiamate del blocco stanno dentro al ciclo, non fuori",
    /for \(let i = 0; i < volte; i\+\+\) \{\n(?:.*\n)*?\s*await cameraPage\.clickTakePicture\(\);\n\s*await cameraPage\.clickSave\(\);\n\s*await cameraPage\.clickThatsMe\(\);\n\s*\}/.test(
      file.contents
    ),
    file.contents
  );

  // LA DEDUPLICAZIONE DOPO UN CICLO. Due registrazioni della stessa procedura,
  // con un numero di ripetizioni diverso (due foto qui, tre in un'altra sessione),
  // DEVONO condividere lo stesso step: l'espressione porta `{int}`, non il
  // numero vero, quindi la chiave di deduplicazione (`frasi.espressione`) resta
  // identica. Se non fosse cosi' Cucumber vedrebbe due definizioni per la stessa
  // frase e si rifiuterebbe di partire — il difetto che G2 segnala esplicitamente
  // ("un ciclo cambia l'espressione, quindi cambia la chiave con cui si dedup").
  const treVolte: ResolvedStep[] = [...dueVolte, gesto(cTakePicture, "Take Picture"), gesto(cSave, "Save"), gesto(cThatsMe, "That's me")];
  const intentoTre: ResolvedIntent = { ...intento, steps: treVolte };
  const fileDue = emitSteps(
    {
      intents: [intento, intentoTre], pages: [camera],
      recordingPath: "x.json", dictionaryPaths: [], recordedAt: "", durationSeconds: 0,
      generatedAt: "", slug: "due-e-tre-foto", outRoot: "src",
    },
    [camera],
    metodi as never
  );
  const definizioni = (fileDue.contents.match(/When\(/g) ?? []).length + (fileDue.contents.match(/Given\(/g) ?? []).length;
  eq(
    "un conteggio diverso non crea una seconda definizione dello stesso step",
    definizioni,
    1
  );
}

console.log("\n--- clic su un componente senza ancoraggio (G2, punto 3) ---\n");

{
  // IL CASO CHE CONTA (G2-ricette-mappa-e-ripetizioni.md, punto 3). Un pin di
  // mappa non ha ne' ruolo ne' nome accessibile: `componenteSenzaRuolo` (vedi
  // `component-naming.ts`) lo marca `stability: "unnamed"`. Da li' in poi il
  // metodo generato NON deve essere un `.click()` normale — fallirebbe con
  // "element intercepts pointer events" contro un livello trasparente sopra la
  // mappa — ma deve passare da `clickSenzaAncoraggio` (vedi `base.page.ts`),
  // che scorre, forza un resize e clicca col mouse vero al centro del
  // rettangolo. PRIMA di questo commit il generatore produceva `.click()` per
  // ogni componente, pin compreso: questo e' il caso che l'avrebbe fatto
  // fallire (un `locator('.custom-marker').click()` generato, non
  // `this.clickSenzaAncoraggio(...)`).
  const pin = componenteSenzaRuolo({ tag: "div", classi: ["custom-marker"], selettore: ".custom-marker", fra: { indice: 0, totale: 3 } });
  eq("un pin senza ruolo ne' nome e' marcato 'unnamed'", pin.stability, "unnamed");

  const bottone = toComponent({ role: "button", name: "Continue" }, 1);
  const pagina = {
    key: "x/mappa", keyEsatta: "x/mappa", host: "x", path: "/mappa", pattern: "/mappa",
    className: "MappaPage", slug: "mappa",
  };
  const { file } = emitPageObject(pagina, [pin, bottone], [], {
    intents: [], pages: [pagina], recordingPath: "x.json", dictionaryPaths: [],
    recordedAt: "", durationSeconds: 0, generatedAt: "", slug: "mappa", outRoot: "src",
  });

  truthy(
    "il metodo del pin chiama clickSenzaAncoraggio, non .click()",
    file.contents.includes("await this.clickSenzaAncoraggio(this.customMarkerButton);") ||
      /async clickCustomMarker\(\): Promise<void> \{\s*await this\.clickSenzaAncoraggio\(this\.\w+\);/.test(file.contents),
    file.contents
  );
  truthy(
    "un componente normale (con ruolo e nome) resta un .click() semplice",
    /async clickContinue\(\): Promise<void> \{\s*await this\.continueButton\.click\(\);/.test(file.contents),
    file.contents
  );
}

console.log("\n--- ricetta proposta, mai applicata da sola (G2, punto 4) ---\n");

{
  // IL CASO CHE CONTA. Un gesto sul livello che intercetta i clic sopra una
  // mappa (id "map-overlay", nessuna classe: lo stesso caso che il fix del
  // punto 3 ha scoperto) assomiglia alla ricetta "scelta-su-mappa". Il
  // generatore lo DICHIARA in un buco "ricetta-disponibile" -- mai lo
  // sostituisce: il codice che esce resta quello generico di sempre.
  const url = "https://esempio.invalid/mappa";
  const gestoMappa: Step = {
    action: "click",
    role: "",
    name: "",
    url,
    ancoraggioAssente: { tag: "div", classi: [], id: "map-overlay", selettore: "#map-overlay" },
  };
  const registrazione: Recording = {
    startUrl: url, recordedAt: "", durationSeconds: 1, pagesVisited: [url],
    summary: { intents: 1, steps: 1, assertions: 0, unlabelled: 0 },
    intents: [{ label: "il cliente sceglie una farmacia sulla mappa", pageUrl: url, steps: [gestoMappa], assertions: [], notes: [] }],
  } as Recording;

  const risolta = resolveRecording(registrazione, indexDictionaries([]), { catalog: [] });
  const buchiRicetta = risolta.gaps.filter((g) => g.kind === "ricetta-disponibile");
  eq("un gesto che assomiglia alla ricetta produce un solo buco di quel tipo", buchiRicetta.length, 1);
  truthy(
    "il buco nomina la ricetta e dove sta scritta",
    buchiRicetta[0]?.detail.includes("scelta-su-mappa") && buchiRicetta[0]?.detail.includes("src/actions/mappa.actions.ts"),
    buchiRicetta[0]?.detail ?? "(nessun buco)"
  );

  // Un elemento senza ruolo che NON assomiglia a nessuna ricetta nota (un id
  // qualunque) non deve produrre il buco: il riconoscimento e' per identita'
  // esatta, mai per "sembra un po' la stessa cosa".
  const gestoAltro: Step = {
    action: "click", role: "", name: "", url,
    ancoraggioAssente: { tag: "div", classi: [], id: "qualcos-altro", selettore: "#qualcos-altro" },
  };
  const registrazioneAltro: Recording = {
    ...registrazione,
    intents: [{ ...registrazione.intents[0]!, steps: [gestoAltro] }],
  };
  const risoltaAltro = resolveRecording(registrazioneAltro, indexDictionaries([]), { catalog: [] });
  eq(
    "un elemento senza ruolo che non e' quello della ricetta non la propone",
    risoltaAltro.gaps.filter((g) => g.kind === "ricetta-disponibile").length,
    0
  );

  // La funzione pura usata dal generatore, isolata: e' per identita'
  // (ruolo+nome), non per somiglianza di testo.
  eq("ricettaDelGesto riconosce per identita' esatta", ricettaDelGesto({ role: "", name: "map-overlay" })?.nome, "scelta-su-mappa");
  eq("e non per un nome quasi uguale", ricettaDelGesto({ role: "", name: "Map Overlay" }), null);
}

// ---------------------------------------------------------------------------
// 3. La catena intera: si genera davvero, e si compila
// ---------------------------------------------------------------------------

console.log("\n--- un clic solo non diventa due gesti (ambiente QA, 13/10) ---\n");

{
  const su = (url: string) => (s: Omit<Step, "url">): Step => ({ ...s, url });
  const prodotti = su("https://shop.invalid/products");
  const info = su("https://shop.invalid/info");
  const nomi = (steps: Step[]): string[] => steps.map((s) => `${s.action} ${s.role} "${s.name}"`);

  // IL CASO CHE CONTA: i gesti veri della scelta del prodotto.
  const prodotto = senzaGestiDoppi([
    prodotti({ action: "click", role: "button", name: "With Coaching £121" }),
    prodotti({ action: "set", role: "radio", name: "With Coaching", value: "checked" }),
    prodotti({ action: "click", role: "button", name: "Select" }),
  ]);
  eq(
    "clic sul pulsante che contiene l'opzione: resta il clic, va via il cambio di stato",
    nomi(prodotto),
    ['click button "With Coaching £121"', 'click button "Select"']
  );

  const etichetta = senzaGestiDoppi([
    info({ action: "click", role: "", name: "", ancoraggioAssente: { tag: "span", classi: ["ng-binding"] } as never }),
    info({ action: "set", role: "checkbox", name: "I understand", value: "checked" }),
    info({ action: "click", role: "button", name: "Continue" }),
  ]);
  eq(
    "clic senza ancoraggio seguito dalla sua casella: resta la casella, va via il clic sul rettangolo",
    nomi(etichetta),
    ['set checkbox "I understand"', 'click button "Continue"']
  );

  // NEL DUBBIO NON SI TOGLIE NIENTE.
  const altroNome = [
    prodotti({ action: "click", role: "button", name: "Continue" }),
    prodotti({ action: "set", role: "checkbox", name: "Newsletter", value: "checked" }),
  ];
  eq("un pulsante che non contiene il nome dell'opzione: due gesti veri", senzaGestiDoppi(altroNome).length, 2);

  const altraPagina = [
    prodotti({ action: "click", role: "button", name: "With Coaching £121" }),
    info({ action: "set", role: "radio", name: "With Coaching", value: "checked" }),
  ];
  eq("stessi nomi ma su due pagine: due gesti veri", senzaGestiDoppi(altraPagina).length, 2);

  const nonConsecutivi = [
    prodotti({ action: "click", role: "button", name: "With Coaching £121" }),
    prodotti({ action: "click", role: "button", name: "Details" }),
    prodotti({ action: "set", role: "radio", name: "With Coaching", value: "checked" }),
  ];
  eq("con un gesto in mezzo: non si tocca", senzaGestiDoppi(nonConsecutivi).length, 3);
}

console.log("\n--- generazione e compilazione ---\n");

interface Manifest {
  files: Array<{ path: string }>;
}

function runGenerate(extra: string[]): Manifest {
  execFileSync(
    process.execPath,
    [
      path.join(ROOT, "node_modules", "ts-node", "dist", "bin.js"),
      path.join(ROOT, "scripts", "generate.ts"),
      path.join(FIXTURES, "recording.json"),
      "--scout", path.join(FIXTURES, "scout"),
      "--catalog", path.join(FIXTURES, "catalog.json"),
      "--name", "zz-controllo",
      "--manifest", path.join(TMP, "manifest.json"),
      // Il catalogo vero non si rigenera da qui: i file di controllo vengono
      // tolti a fine giro, e il catalogo restava con uno step che puntava a un
      // file sparito — modificato in git a ogni `check:all`.
      "no-catalog",
      ...extra,
    ],
    { cwd: ROOT, stdio: "pipe" }
  );
  return JSON.parse(fs.readFileSync(path.join(TMP, "manifest.json"), "utf-8")) as Manifest;
}

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

// Prima a vuoto, per sapere quali file toccheremmo e salvarli. Il controllo
// scrive dentro a src/ — non c'e' altro modo di compilare con gli import veri —
// e non deve lasciare traccia, nemmeno se fallisce a meta'.
const planned = runGenerate(["--dry"]);
const before = new Map<string, string | null>();
for (const f of planned.files) {
  const abs = path.join(ROOT, f.path);
  before.set(abs, fs.existsSync(abs) ? fs.readFileSync(abs, "utf-8") : null);
}

const restore = (): void => {
  for (const [abs, content] of before) {
    if (content === null) fs.rmSync(abs, { force: true });
    else fs.writeFileSync(abs, content, "utf-8");
  }
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "reports", "generate", "zz-controllo"), { recursive: true, force: true });
};

try {
  const made = runGenerate([]);
  eq("tre file generati: due pagine e la glue, piu' la feature", made.files.length, 4);

  const page = fs.readFileSync(
    path.join(ROOT, "src", "pages", "generated", "esempio.invalid", "ordini.page.ts"),
    "utf-8"
  );
  truthy("la Page Object espone il componente sintetizzato", page.includes("clickAnnullaOrdine"));

  const steps = fs.readFileSync(path.join(ROOT, "src", "steps", "generated", "zz-controllo.steps.ts"), "utf-8");
  truthy(
    "la transizione fra pagine e' esplicita nella glue",
    /ordiniPage = new OrdiniPage\(this\.page\);/.test(steps),
    "manca la costruzione della pagina di arrivo"
  );
  truthy(
    "la password non finisce mai nel codice",
    !steps.includes("<password>") && steps.includes("this.passwordAmbiente()"),
    "il valore segreto e' stato scritto nel file"
  );
  truthy(
    "le frasi sono quelle del tester, non quelle del catalogo",
    steps.includes("il cliente accede all'area ordini"),
    "il generatore ha scelto la frase al posto di chi deve sceglierla"
  );

  execFileSync(
    process.execPath,
    [path.join(ROOT, "node_modules", "typescript", "bin", "tsc"), "--noEmit", "-p", "tsconfig.json"],
    { cwd: ROOT, stdio: "pipe" }
  );
  ok("il codice generato compila");
} catch (err) {
  const e = err as { stdout?: Buffer; stderr?: Buffer; message?: string };
  const report = `${e.stdout?.toString() ?? ""}${e.stderr?.toString() ?? ""}`.trim();
  fail("la catena intera", report || e.message || "(nessun output)");
} finally {
  restore();
}

console.log(failures === 0 ? `\nTutti i controlli OK.` : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
