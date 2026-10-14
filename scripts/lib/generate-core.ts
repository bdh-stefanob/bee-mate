/**
 * lib/generate-core.ts
 * --------------------
 * La parte **deterministica** della generazione: identita' delle pagine,
 * aggancio dei gesti al dizionario, restringimento dei candidati di catalogo.
 *
 * Qui non si scrive codice e non si scrive Gherkin: si prepara il terreno
 * perche' scriverli sia una scelta fra poche opzioni invece che un tema libero.
 * Tutto cio' che sta in questo file e' puro — nessun file letto, nessun browser
 * aperto — proprio perche' e' la parte su cui vale la pena avere dei controlli.
 */

import { fold, tokenize, fingerprint, maskParams } from "./normalize";
import { tokenSetRatio } from "./cluster";
import { componenteSenzaRuolo, conInvio, toComponent } from "./component-naming";
import { judge } from "./stability";
// Gli avvisi sono dichiarati una volta sola, dove vive il gestore che li chiude:
// `avvisoDelGesto` e' pura e non apre nessun browser, quindi questo file resta
// quello che era. Due elenchi di avvisi divergerebbero, e divergendo farebbero
// generare un passo che a tempo di esecuzione viene chiuso da solo.
import { avvisoDelGesto } from "../../src/support/avvisi";
// Stesso principio delle ricette: dichiarata una volta sola, dove vive l'azione
// che le applica (src/actions/mappa.actions.ts), cosi' il generatore e
// l'esecuzione non possono mai descrivere due identita' diverse per lo stesso
// caso. Pura anche questa: nessun browser, solo un confronto su ruolo+nome.
import { ricettaDelGesto } from "../../src/support/ricette";
import { utilityDelPasso } from "../../src/support/utility";
import { mergeInventories } from "./inventory";
import type {
  Assertion, CatalogStep, Component, Gap, Intent, Recording,
  ResolvedIntent, ResolvedStep, ScoutResult, Step,
} from "./generation-contract";

// ---------------------------------------------------------------------------
// Identita' di una pagina
// ---------------------------------------------------------------------------

export interface PageIdentity {
  /** Chiave di identita': host + percorso mascherato. Due URL uguali qui sono la stessa pagina. */
  key: string;
  /**
   * Host + percorso **vero**, senza mascherare niente.
   *
   * PERCHE' SERVONO DUE CHIAVI. La mascheratura e' una scommessa: che il
   * segmento numerico sia un identificativo e che le pagine che lo portano siano
   * la stessa cosa con dentro un dato diverso. E' giusta per `/orders/1830941`,
   * sbagliata per `/questions/3`, e dall'URL non si distingue.
   *
   * Tenere anche la chiave esatta permette di non scommettere: i dizionari si
   * raccolgono per percorso vero, e la decisione di unire due pagine la prende
   * chi ha visto i loro componenti — non chi guarda la forma dell'indirizzo.
   */
  keyEsatta: string;
  host: string;
  /** Percorso vero, quello che finisce in `readonly path`. */
  path: string;
  /** Percorso con i segmenti variabili mascherati. */
  pattern: string;
  className: string;
  slug: string;
}

/**
 * Un segmento di percorso e' un identificativo, e non fa parte dell'identita'
 * della pagina?
 *
 * Senza questo, `/orders/1830941` e `/orders/1830942` sarebbero due pagine
 * diverse, e da una registrazione uscirebbero due Page Object identiche con
 * nomi assurdi. E' lo stesso giudizio che `stability.ts` da' sui nomi
 * accessibili, applicato agli URL.
 */
export function looksLikeId(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  if (/^[0-9a-f]{12,}$/i.test(segment)) return true;
  // Misto lungo con cifre: token di sessione, slug con id in coda.
  if (segment.length > 20 && /\d/.test(segment)) return true;
  return false;
}

function pascal(s: string): string {
  return s
    .replace(/\.[a-z0-9]{2,5}$/i, "") // .html, .aspx, .jsp
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

function kebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Da un URL all'identita' della pagina.
 *
 * La query si butta: contiene token di sessione, filtri e reindirizzamenti, ed
 * e' la fonte piu' rapida di Page Object duplicate. Se un giorno servisse
 * distinguere due pagine che differiscono solo per un parametro, sara' una
 * decisione presa apposta — non un effetto collaterale.
 */
export function pageIdentity(url: string): PageIdentity {
  let host = "";
  let rawPath = "/";
  try {
    const u = new URL(url);
    host = u.hostname;
    rawPath = u.pathname || "/";
  } catch {
    // Un URL illeggibile non deve far cadere la generazione: diventa una pagina
    // sola, riconoscibile, e il referto lo dira'.
    host = "sconosciuto";
    rawPath = "/";
  }

  const segments = rawPath.split("/").filter(Boolean);
  const pattern = "/" + segments.map((s) => (looksLikeId(s) ? ":id" : s)).join("/");
  const named = segments.filter((s) => !looksLikeId(s));
  const last = named[named.length - 1] ?? "";

  const base = pascal(last) || "Home";
  // Il percorso vero, normalizzato solo sulla barra finale: `/camera/visit/` e
  // `/camera/visit` sono lo stesso indirizzo, e due chiavi per la stessa pagina
  // produrrebbero due dizionari, ognuno con meta' dei componenti.
  const esatto = "/" + segments.join("/");
  return {
    key: `${host}${pattern}`,
    keyEsatta: `${host}${esatto}`,
    host,
    path: rawPath,
    pattern,
    className: `${base}Page`,
    slug: kebab(base),
  };
}

/**
 * Il nome di una pagina che si tiene distinta dalle sue sorelle.
 *
 * `/questions/1` non puo' chiamarsi `QuestionsPage` come `/questions/2`: il
 * numero fa parte dell'identita', perche' si e' deciso che quelle due pagine
 * sono due. `Questions1Page` e' un nome brutto, e va bene cosi': lo si legge e
 * si capisce di quale passo si parla. Un nome bello che indica la pagina
 * sbagliata e' molto peggio.
 */
export function nomiDaPercorsoEsatto(id: PageIdentity): { className: string; slug: string } {
  const segmenti = id.path.split("/").filter(Boolean);
  const nome = pascal(segmenti.filter((s) => !looksLikeId(s)).pop() ?? "") || "Home";
  const numeri = segmenti.filter((s) => looksLikeId(s)).join("-");
  const base = numeri ? `${nome}${pascal(numeri)}` : nome;
  return { className: `${base}Page`, slug: kebab(base) };
}

/**
 * Rende i nomi di classe univoci.
 *
 * Due pagine diverse che finiscono con lo stesso segmento — `/admin/settings` e
 * `/account/settings` — produrrebbero due `SettingsPage`. La seconda
 * sovrascriverebbe la prima **in silenzio**: il file c'e', compila, e chiama i
 * metodi sbagliati. Si disambigua aggiungendo il segmento precedente, e solo a
 * chi serve: rinominare anche le pagine che non collidono renderebbe illeggibili
 * dei nomi che andavano bene.
 */
export function uniqueNames(identities: readonly PageIdentity[]): PageIdentity[] {
  // Tre passi, ognuno solo per chi collide ancora dopo il precedente. Il
  // secondo passo da solo non bastava: l'elenco `/visite` e il dettaglio
  // `/visite/9712` non hanno un segmento prima da usare, stanno sullo stesso
  // host, e ricevevano lo stesso prefisso — cioe' collidevano di nuovo. E' uscita
  // cosi' la prima registrazione vera, con 8 metodi mancanti.
  const collisioni = (list: readonly PageIdentity[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const p of list) m.set(p.className, (m.get(p.className) ?? 0) + 1);
    return m;
  };
  const base = (id: PageIdentity): string => id.className.replace(/Page$/, "");

  // 1. Il dettaglio di una risorsa si chiama come tale: e' anche il nome che un
  //    tester darebbe a quella pagina.
  let c = collisioni(identities);
  let result = identities.map((id) => {
    if ((c.get(id.className) ?? 0) === 1 || !id.pattern.endsWith("/:id")) return id;
    return { ...id, className: `${base(id)}DetailPage`, slug: kebab(`${base(id)}-detail`) };
  });

  // 2. Il segmento precedente, o l'host se non c'e'.
  c = collisioni(result);
  result = result.map((id) => {
    if ((c.get(id.className) ?? 0) === 1) return id;
    const segments = id.pattern.split("/").filter((s) => s && s !== ":id");
    const prefix = segments.length >= 2 ? pascal(segments[segments.length - 2]!) : pascal(id.host);
    return { ...id, className: `${prefix}${base(id)}Page`, slug: kebab(`${prefix}-${base(id)}`) };
  });

  // 3. L'ultima rete: un numero in coda. Brutto, ma un nome brutto si vede; una
  //    sovrascrittura silenziosa no.
  c = collisioni(result);
  const visti = new Map<string, number>();
  return result.map((id) => {
    if ((c.get(id.className) ?? 0) === 1) return id;
    const n = (visti.get(id.className) ?? 0) + 1;
    visti.set(id.className, n);
    if (n === 1) return id;
    return { ...id, className: `${base(id)}${n}Page`, slug: kebab(`${base(id)}-${n}`) };
  });
}

// ---------------------------------------------------------------------------
// Aggancio al dizionario
// ---------------------------------------------------------------------------

export interface DictionaryIndex {
  /**
   * Dizionari per percorso vero. E' il primo posto dove cercare: se ci sono tre
   * dizionari per `/questions/1..3`, indicizzarli per chiave mascherata ne
   * terrebbe uno solo — l'ultimo letto — e i componenti degli altri due
   * risulterebbero assenti.
   */
  byPath: Map<string, ScoutResult>;
  /** Dizionari per chiave di pagina mascherata. */
  byKey: Map<string, ScoutResult>;
  /** Dizionari per host, quando la pagina esatta non c'e'. */
  byHost: Map<string, ScoutResult[]>;
}

export function indexDictionaries(dicts: readonly ScoutResult[]): DictionaryIndex {
  const byPath = new Map<string, ScoutResult>();
  const byKey = new Map<string, ScoutResult>();
  const byHost = new Map<string, ScoutResult[]>();
  for (const d of dicts) {
    const id = pageIdentity(d.url);
    byPath.set(id.keyEsatta, d);
    // Per chiave mascherata si tiene l'unione, non l'ultimo: se due dizionari
    // cadono sulla stessa chiave, sono due stati o due passi della stessa
    // pagina, e il ripiego deve poterli vedere entrambi.
    const gia = byKey.get(id.key);
    byKey.set(id.key, gia ? mergeInventories(gia, d) : d);
    byHost.set(id.host, [...(byHost.get(id.host) ?? []), d]);
  }
  return { byPath, byKey, byHost };
}

/** Il componente esatto, dal dizionario della pagina giusta. Null se non c'e'. */
function lookup(index: DictionaryIndex, url: string, role: string, name: string): Component | null {
  const id = pageIdentity(url);
  // Prima il dizionario del percorso vero, poi quello della chiave mascherata.
  // L'ordine conta: su una procedura a passi il secondo e' l'unione di tutti i
  // passi, e un componente che esiste solo alla domanda 2 vi risulterebbe
  // presente anche alla domanda 3.
  for (const d of [index.byPath.get(id.keyEsatta), index.byKey.get(id.key)]) {
    const found = d?.components.find((c) => c.role === role && c.name === name);
    if (found) return found;
  }

  // Ripiego sullo stesso host: un componente di navigazione presente su ogni
  // pagina sta nel dizionario di una sola di esse. Il ripiego e' onesto solo
  // perche' role+name vengono dallo stesso probe: e' identita', non somiglianza.
  for (const d of index.byHost.get(id.host) ?? []) {
    const c = d.components.find((x) => x.role === role && x.name === name);
    if (c) return c;
  }
  return null;
}

/**
 * Sintetizza un componente dalla sola registrazione.
 *
 * Serve quando il dizionario non copre la pagina. Il gesto NON si butta: role e
 * name li abbiamo, e la formula del locator e' la stessa che usa lo scout. Cio'
 * che manca e' il conteggio delle occorrenze — cioe' non sappiamo se il locator
 * e' univoco — e infatti il chiamante emette un avviso. Degradare dichiarandolo
 * batte fermarsi, e batte anche tacere.
 */
function synthesise(step: Step): Component {
  // Un gesto senza ruolo ne' nome non si cerca con getByRole: non c'e' niente da
  // cercare. Si ancora a cio' che la registrazione ha potuto osservare, e lo
  // dichiara fragile. Vedi `componenteSenzaRuolo`.
  if (step.ancoraggioAssente) return componenteSenzaRuolo(step.ancoraggioAssente);
  return toComponent(
    { role: step.role, name: step.name, ...(step.secret ? { secret: true } : {}) },
    1
  );
}

export interface ResolveOptions {
  /** Il catalogo su cui cercare i candidati. */
  catalog: readonly CatalogStep[];
  /** Quanti candidati proporre per intento. */
  shortlist?: number;
}

/**
 * Un gesto che il tester ha fatto su un avviso noto, e che non e' diventato un
 * passo.
 *
 * Non e' un buco: e' una decisione, e va detta. Un gesto scartato in silenzio
 * e' un gesto che, il giorno in cui serviva davvero, non si sa dove e' finito.
 */
export interface AvvisoScartato {
  /** L'etichetta dell'intento in cui stava. */
  where: string;
  role: string;
  name: string;
  /** Quale avviso ha riconosciuto. */
  avviso: string;
}

/**
 * Toglie i gesti che sono lo stesso gesto visto due volte.
 *
 * IL CASO (ambiente QA, 2026-10-13). Una scelta disegnata dall'applicazione — un
 * pulsante «With Coaching £121» che contiene la sua opzione nativa, un'etichetta
 * che contiene la sua casella — produce DUE eventi per un clic solo: il clic
 * sul disegno e il cambio di stato del controllo nativo che ci sta sotto. Il
 * registratore li scrive entrambi, perche' entrambi sono avvenuti. Rieseguirli
 * entrambi no: il controllo nativo e' nascosto e non si lascia cliccare, e lo
 * scenario si ferma su un gesto che il tester non ha mai fatto.
 *
 * Due regole, e solo fra gesti CONSECUTIVI sulla stessa pagina — nel dubbio non
 * si toglie niente:
 *
 *  1. un clic su un pulsante o un link, seguito dal cambio di stato di
 *     un'opzione il cui nome sta DENTRO il nome di quel pulsante: resta il clic
 *     (ha un nome e si puo' rifare), va via il cambio di stato;
 *  2. un clic senza ancoraggio — ne' ruolo ne' nome — seguito dal cambio di
 *     stato di una casella o di un'opzione: era il clic sulla sua etichetta.
 *     Resta il cambio di stato (ha un'identita'), va via il clic sul rettangolo.
 */
export function senzaGestiDoppi(steps: readonly Step[]): Step[] {
  const scelta = (s: Step | undefined): s is Step =>
    Boolean(s) && s!.action === "set" && (s!.role === "radio" || s!.role === "checkbox");
  const stessaPagina = (a: Step, b: Step): boolean => (a.url ?? "") === (b.url ?? "");
  const pulito = (testo: string): string => testo.trim().toLowerCase();

  const tolti = new Set<number>();
  steps.forEach((step, i) => {
    const dopo = steps[i + 1];
    if (step.action !== "click" || !scelta(dopo) || !stessaPagina(step, dopo)) return;
    if (step.ancoraggioAssente) {
      tolti.add(i);
      return;
    }
    const contiene = dopo.name.trim() !== "" && pulito(step.name).includes(pulito(dopo.name));
    if ((step.role === "button" || step.role === "link") && contiene) tolti.add(i + 1);
  });
  return steps.filter((_, i) => !tolti.has(i));
}

export interface ResolveResult {
  intents: ResolvedIntent[];
  gaps: Gap[];
  /** Pagine incontrate, con nomi gia' resi univoci. */
  pages: PageIdentity[];
  /** I gesti su un avviso noto, tolti dai passi e dichiarati. */
  avvisi: AvvisoScartato[];
}

export function resolveRecording(
  recording: Recording,
  index: DictionaryIndex,
  options: ResolveOptions
): ResolveResult {
  const gaps: Gap[] = [];
  /** Le pagine incontrate, per percorso vero: niente e' ancora stato unito. */
  const viste = new Map<string, PageIdentity>();

  const remember = (url: string): PageIdentity => {
    const id = pageIdentity(url);
    if (!viste.has(id.keyEsatta)) viste.set(id.keyEsatta, id);
    return id;
  };

  // Le pagine si raccolgono PRIMA di risolvere, perche' i nomi di classe si
  // decidono guardandole tutte insieme: una collisione si vede solo cosi'.
  for (const intent of recording.intents) {
    for (const s of intent.steps) remember(s.url ?? intent.pageUrl ?? recording.startUrl);
    for (const a of intent.assertions) remember(a.url ?? intent.pageUrl ?? recording.startUrl);
    if (intent.pageUrl) remember(intent.pageUrl);
    if (intent.endUrl) remember(intent.endUrl);
  }
  if (viste.size === 0) remember(recording.startUrl);

  // ── Due indirizzi sono la stessa pagina? LO DECIDONO I COMPONENTI ────────
  //
  // `/questions/1` e `/questions/3` cadono entrambi su `/questions/:id`, ed e'
  // quasi sempre giusto: `/orders/1830941` e `/orders/1830942` sono la stessa
  // pagina con dentro un ordine diverso. Su una procedura a passi no: ogni passo
  // ha domande sue, e una Page Object sola prende l'unione dei componenti di
  // tutti — con locator che sulla pagina corrente non esistono.
  //
  // Dalla forma dell'indirizzo i due casi non si distinguono, ed e' per questo
  // che non si guarda l'indirizzo. Si guarda cio' che la sessione ha osservato:
  // i componenti del dizionario di quel percorso, piu' i gesti che il tester ci
  // ha fatto. Se coincidono, e' la stessa pagina con dentro un dato diverso e si
  // uniscono; se differiscono, sono due pagine e restano due. E' un dato, non
  // un'euristica — ed e' la ragione per cui `pageIdentity` tiene entrambe le
  // chiavi (decisione del proprietario, 2026-10-02; vedi T4 in docs/OVERVIEW.md).
  const gestiPerPercorso = new Map<string, Set<string>>();
  for (const intent of recording.intents) {
    const tocca = (url: string, role: string, name: string): void => {
      const k = pageIdentity(url).keyEsatta;
      if (!gestiPerPercorso.has(k)) gestiPerPercorso.set(k, new Set());
      gestiPerPercorso.get(k)!.add(componentKey(role, name));
    };
    for (const s of intent.steps) tocca(s.url ?? intent.pageUrl ?? recording.startUrl, s.role, s.name);
    for (const a of intent.assertions) tocca(a.url ?? intent.pageUrl ?? recording.startUrl, a.role, a.name);
  }

  /** Cio' che si e' osservato su un percorso: dizionario piu' gesti. */
  const osservatoSu = (id: PageIdentity): string => {
    const dal = index.byPath.get(id.keyEsatta)?.components ?? [];
    const insieme = new Set<string>(dal.map((c) => componentKey(c.role, c.name)));
    for (const g of gestiPerPercorso.get(id.keyEsatta) ?? []) insieme.add(g);
    return [...insieme].sort().join("\u0000");
  };

  const perMascherata = new Map<string, PageIdentity[]>();
  for (const id of viste.values()) {
    perMascherata.set(id.key, [...(perMascherata.get(id.key) ?? []), id]);
  }

  const scelte: PageIdentity[] = [];
  /** Da percorso vero all'identita' scelta: unita o separata. */
  const sceltaPerPercorso = new Map<string, PageIdentity>();
  const unite: Array<{ key: string; percorsi: string[] }> = [];

  for (const [key, gruppo] of perMascherata) {
    const diverse = new Set(gruppo.map(osservatoSu)).size > 1;
    if (gruppo.length === 1 || !diverse) {
      // Una sola, oppure tutte con gli stessi componenti: una Page Object, con
      // il percorso mascherato. E' il comportamento di sempre.
      const rappresentante = gruppo[0]!;
      scelte.push(rappresentante);
      for (const id of gruppo) sceltaPerPercorso.set(id.keyEsatta, rappresentante);
      if (gruppo.length > 1) unite.push({ key, percorsi: gruppo.map((g) => g.path) });
      continue;
    }
    // Componenti diversi: sono pagine diverse. Ognuna tiene la sua identita', e
    // la chiave diventa quella esatta — altrimenti due Page Object con la stessa
    // chiave e la seconda sovrascriverebbe la prima.
    for (const id of gruppo) {
      const separata: PageIdentity = { ...id, key: id.keyEsatta, ...nomiDaPercorsoEsatto(id) };
      scelte.push(separata);
      sceltaPerPercorso.set(id.keyEsatta, separata);
    }
  }

  const pages = uniqueNames(scelte);
  // `uniqueNames` puo' aver rinominato: la mappa si rifa' sui risultati.
  const perChiaveScelta = new Map(pages.map((p) => [p.key, p]));
  const identitaDi = (url: string): PageIdentity => {
    const id = pageIdentity(url);
    const scelta = sceltaPerPercorso.get(id.keyEsatta);
    return scelta ? perChiaveScelta.get(scelta.key) ?? scelta : id;
  };

  // UN PERCORSO CHE ATTRAVERSA PIU' DOMINI.
  //
  // Non e' un caso di scuola: succede quando il viaggio comincia sul sito
  // vetrina e prosegue nell'applicazione, che e' un'architettura comune e
  // proprio quella che stiamo guardando. Il problema e' che le Page Object
  // generate hanno percorsi RELATIVI, risolti contro un solo `baseURL`: quelle
  // del secondo dominio proverebbero a navigare sul primo.
  //
  // Non lo indovino e non lo aggiro: lo dichiaro. Il codice generato resta buono
  // per tutto il resto, e chi legge sa che li' serve una decisione.
  // PIU' INDIRIZZI UNITI IN UNA PAGINA SOLA.
  //
  // Non e' piu' un buco — la decisione la prendono i componenti osservati, qui
  // sopra — ma e' una decisione, e va detta: se la sessione ha attraversato quei
  // percorsi in uno stato che li faceva sembrare uguali, l'unione puo' essere
  // sbagliata, e chi legge deve poterla smentire.
  for (const { key, percorsi } of unite) {
    gaps.push({
      kind: "ancoraggio-instabile",
      where: key,
      detail:
        `${percorsi.length} indirizzi (${percorsi.join(", ")}) sono una Page Object sola: ` +
        `sulla registrazione mostravano gli stessi componenti, quindi sono la stessa pagina ` +
        `con dentro un dato diverso. Se invece sono passi diversi di una procedura, la ` +
        `sessione li ha attraversati in uno stato che li faceva sembrare uguali: rifai la ` +
        `registrazione passando da tutti, o lancia lo scout su ognuno.`,
    });
  }

  const hosts = [...new Set(pages.map((p) => p.host))];
  if (hosts.length > 1) {
    gaps.push({
      kind: "ancoraggio-instabile",
      where: "(tutta la registrazione)",
      detail:
        `Il percorso attraversa ${hosts.length} domini diversi. Le Page Object generate ` +
        `hanno percorsi relativi a un solo indirizzo di partenza: quelle del secondo ` +
        `dominio non navigherebbero dove credono. Serve un indirizzo per dominio — ` +
        `oppure si spezza la registrazione in due, una per dominio.`,
    });
  }

  const noUrls = recording.intents.every((i) => !i.pageUrl && i.steps.every((s) => !s.url));
  if (noUrls && recording.intents.length > 0) {
    gaps.push({
      kind: "ancoraggio-instabile",
      where: "(tutta la registrazione)",
      detail:
        "La registrazione non riporta su quale pagina e' avvenuto ogni gesto: e' stata " +
        "fatta con una versione precedente del recorder. Tutto finisce sulla pagina di " +
        "partenza, e un intento che ha attraversato due pagine risultera' su una sola. " +
        "Rifai la registrazione per avere l'attribuzione giusta.",
    });
  }

  const canonici = new Map<string, Component>();
  const avvisi: AvvisoScartato[] = [];

  // I campi che in questa sessione sono stati INVIATI, non solo compilati.
  // Si raccolgono prima di risolvere: la proprieta' e' della coppia
  // pagina+campo, non del singolo gesto.
  const inviati = new Set<string>();
  for (const intent of recording.intents) {
    for (const step of intent.steps) {
      if (!step.invio) continue;
      const id = identitaDi(step.url ?? intent.pageUrl ?? recording.startUrl);
      inviati.add(`${id.key}\u0000${componentKey(step.role, step.name)}`);
    }
  }
  const intents: ResolvedIntent[] = recording.intents.map((intent) => {
    const fallbackUrl = intent.pageUrl ?? recording.startUrl;

    // UN AVVISO NON E' UN PASSO.
    //
    // Il tester ha cliccato «Accept All» perche' il banner c'era in quel
    // momento, non perche' facesse parte del test. Uno scenario che lo clicca
    // fallisce ogni volta che non c'e' — cioe' quasi sempre dalla seconda
    // esecuzione in poi, quando il consenso e' gia' dato. A chiuderlo pensa
    // `registraAvvisi`, in qualunque punto dello scenario, e quindi il passo non
    // deve esistere. Solo i click: un valore digitato in un campo che si chiama
    // come un avviso non e' la chiusura di un avviso.
    const gesti = senzaGestiDoppi(
      intent.steps.filter((step) => {
        const avviso = step.action === "click" ? avvisoDelGesto(step) : null;
        if (!avviso) return true;
        avvisi.push({ where: intent.label, role: step.role, name: step.name, avviso: avviso.nome });
        return false;
      })
    );

    const steps: ResolvedStep[] = gesti.map((step) => {
      const url = step.url ?? fallbackUrl;
      const id = identitaDi(url);
      // Un campo password si cerca per tipo, sempre: anche quando il dizionario
      // ne ha uno, il nome che porta e' il segnaposto mascherato — pallini —
      // che non identifica niente. Il dizionario qui non aiuta, confonde.
      // Un gesto senza ruolo ne' nome non si cerca nel dizionario: il dizionario
      // inventaria cio' che ha un ruolo, quindi non lo contiene per definizione.
      // Cercarlo comunque produrrebbe un avviso che parla di `""` e manda chi
      // legge a rilanciare uno scout che non troverebbe niente.
      const found =
        step.secret || step.ancoraggioAssente ? null : lookup(index, url, step.role, step.name);

      if (step.ancoraggioAssente) {
        const a = step.ancoraggioAssente;
        gaps.push({
          kind: "ancoraggio-instabile",
          where: intent.label,
          detail:
            `Un gesto su ${a.tag}${a.selettore ?? ""} su ${id.className} non ha ne' ruolo ne' nome ` +
            `accessibile: l'ancoraggio e' una classe CSS, cioe' un dettaglio di implementazione. ` +
            (a.fra && a.fra.totale > 1
              ? `Ce n'erano ${a.fra.totale} uguali, e si prende il primo. `
              : "") +
            (step.contesto?.intestazione ? `Il gesto e' avvenuto sotto «${step.contesto.intestazione}». ` : "") +
            `Qui serve una ricetta: il comportamento dichiarato una volta, non un locator per elemento.`,
        });
      } else if (!found && !step.secret) {
        gaps.push({
          kind: "componente-non-nel-dizionario",
          where: intent.label,
          detail:
            `${step.role} "${step.name}" su ${id.className} non e' nel dizionario. ` +
            `Il locator e' stato sintetizzato dalla registrazione, ma non sappiamo se e' ` +
            `univoco sulla pagina. Rilancia lo scout su ${url}`,
        });
      }

      // UN SOLO OGGETTO PER COMPONENTE E PER PAGINA. Chi emette i file indicizza i
      // metodi per identita' dell'oggetto: un gesto ripetuto (due foto, due "Next")
      // su una pagina fuori dallo scout ne produceva uno nuovo a ogni occorrenza, e
      // tutti tranne uno venivano saltati in silenzio.
      const grezzo = found ?? synthesise(step);

      // IL GESTO ASSOMIGLIA A UNA RICETTA NOTA? Solo per i gesti senza ancoraggio:
      // una ricetta esiste perche' il codice generato normale (clicca il centro
      // del rettangolo) non basta proprio li'. Dichiarato nel rapporto, MAI
      // sostituito qui: vedi G2-ricette-mappa-e-ripetizioni.md, punto 4.
      if (step.ancoraggioAssente) {
        const ricetta = ricettaDelGesto({ role: grezzo.role, name: grezzo.name });
        if (ricetta) {
          gaps.push({
            kind: "ricetta-disponibile",
            where: intent.label,
            detail:
              `Questo gesto assomiglia alla ricetta "${ricetta.nome}" (${ricetta.dove}): ` +
              `${ricetta.nota} Il codice generato resta quello di sempre finche' una persona ` +
              `non sceglie a mano di usare la ricetta al suo posto.`,
          });
        }
      }

      const chiaveComponente = `${id.key}\u0000${componentKey(grezzo.role, grezzo.name)}`;
      // Un campo inviato con Invio si invia SEMPRE, su quella pagina: la
      // decisione si prende guardando tutta la registrazione, non il gesto
      // corrente, altrimenti due compilazioni dello stesso campo produrrebbero
      // due componenti diversi — e chi emette i file indicizza i metodi per
      // identita' dell'oggetto, quindi uno dei due sparirebbe in silenzio.
      const fresco = inviati.has(chiaveComponente) ? conInvio(grezzo) : grezzo;
      const component = canonici.get(chiaveComponente) ?? fresco;
      canonici.set(chiaveComponente, component);
      // Il gesto senza ancoraggio ha gia' il suo avviso, sopra, scritto in modo
      // che si capisca: ripeterlo qui darebbe due righe per lo stesso problema,
      // e la seconda parlerebbe di un ruolo vuoto.
      if (component.stability !== "stable" && !step.ancoraggioAssente) {
        gaps.push({
          kind: "ancoraggio-instabile",
          where: intent.label,
          detail:
            `${step.role} "${step.name}" e' un ancoraggio ${component.stability}` +
            (component.notes.length ? ` (${component.notes.join("; ")})` : "") +
            `. Il test si rompera' senza che nessuno abbia cambiato niente.`,
        });
      }

      return { step, component, synthesised: !found, fromPage: id.key };
    });

    for (const a of intent.assertions) {
      const { stability, notes } = judge(a.name, 1);
      if (stability !== "stable") {
        gaps.push({
          kind: "asserzione-non-verificabile",
          where: intent.label,
          detail:
            `La verifica su ${a.role} "${a.name}" e' ancorata a un nome ${stability}` +
            (notes.length ? ` (${notes.join("; ")})` : "") +
            `. Verifica il contenuto, non l'esistenza dell'elemento.`,
        });
      }
    }

    if (!intent.label || intent.label.startsWith("(")) {
      gaps.push({
        kind: "intento-senza-etichetta",
        where: intent.label || "(vuoto)",
        detail:
          "Il tester non ha chiuso questo gruppo di gesti con un'etichetta. La frase " +
          "Gherkin andra' scritta da zero invece che ripulita, ed e' la parte in cui " +
          "l'interpretazione di chi non c'era vale meno.",
      });
    }

    const pageId = identitaDi(fallbackUrl);
    const endId = intent.endUrl
      ? identitaDi(intent.endUrl)
      : null;

    const candidates = rankCandidates(intent, steps, options.catalog, options.shortlist ?? 5);
    if (candidates.length === 0) {
      gaps.push({
        kind: "nessuno-step-di-catalogo",
        where: intent.label,
        detail:
          "Nessuno step di catalogo assomiglia a questo intento. Serve una formulazione " +
          "nuova, da taggare @wanted — non il candidato meno peggio.",
      });
    }

    // UNA UTILITY RICONOSCIUTA (spec del 14/10). Completa: lo step la chiama.
    // Parziale: si propone e basta, il passo resta generato com'e'.
    const utility = utilityDelPasso(
      gesti.map((g) => ({
        action: g.action,
        role: g.role,
        name: g.name,
        ...(g.value !== undefined ? { value: g.value } : {}),
        ...(g.secret ? { secret: true } : {}),
        ...(g.url ? { url: g.url } : {}),
        ...(g.contesto?.intestazione ? { intestazione: g.contesto.intestazione } : {}),
        ...(g.ancoraggioAssente ? { senzaAncoraggio: true } : {}),
      }))
    );
    if (utility && !utility.completa) {
      gaps.push({
        kind: "utility-proposta",
        where: intent.label,
        detail:
          `Questo passo assomiglia alla utility "${utility.nome}" (src/${utility.modulo}.ts), ma contiene anche ` +
          `altri gesti: resta generato com'e'. Se i gesti in piu' sono rumore, toglili e rigenera.`,
      });
    }

    return {
      label: intent.label,
      steps,
      // Una verifica su un valore che cambia (un numero, una data) fallirebbe al
      // prossimo ordine: e' gia' dichiarata fra i buchi, e non diventa una
      // verifica (spec del 14/10).
      assertions: intent.assertions.filter((a) => judge(a.name, 1).stability !== "unstable"),
      notes: intent.notes,
      page: pageId.key,
      navigatesTo: endId && endId.key !== pageId.key ? endId.key : null,
      candidates: candidates.map((c) => c.step),
      candidateEvidence: candidates.map((c) => ({ classe: c.classe, similarity: c.similarity })),
      ...(utility?.completa ? { utility } : {}),
    };
  });

  // UN PASSO FATTO SOLO DI AVVISI NON E' UN PASSO.
  //
  // «the user prefers to start over» era un clic solo, su un dialog che compare
  // quando c'e' un ordine a meta': tolto il gesto (lo chiude `avvisi.ts`), del
  // passo restava la frase con un corpo vuoto — uno step che passa sempre e non
  // fa niente, cioe' una riga dello scenario che mente. Lo dichiarano gia' gli
  // AVVISI, con il nome del passo in cui stava. Un passo nato vuoto (il tester
  // ha chiuso un intento senza gesti) resta: quello e' un dato, non un residuo.
  const rimasti = intents.filter(
    (r, i) => r.steps.length > 0 || r.assertions.length > 0 || recording.intents[i]!.steps.length === 0
  );

  return { intents: rimasti, gaps, pages, avvisi };
}

// ---------------------------------------------------------------------------
// Restringimento dei candidati
// ---------------------------------------------------------------------------

export interface RankedCandidate {
  step: CatalogStep;
  score: number;
  /** Perche' e' finito nella rosa. Va mostrato: una rosa senza motivi non si discute. */
  why: string[];
  /** Prova (identita' di componente) o stima (somiglianza di frase): le due classi non si sommano. */
  classe: "stessi-componenti" | "formulazione-simile";
  /** Somiglianza di frase con l'etichetta, 0-1: spareggio per le prove, criterio per le stime. */
  similarity: number;
}

/**
 * DUE CLASSI DI PROVE, NON UNA MEDIA PONDERATA.
 *
 * L'ancoraggio al componente e' **identita'**: role+name vengono dallo stesso
 * probe nel recorder e nello scout, quindi o e' lo stesso elemento o non lo e'.
 * La somiglianza fra due frasi e' sempre una **stima**, anche nella stessa
 * lingua — sul corpus vero il clustering lessicale assorbe solo il 14% della
 * varieta' (F12).
 *
 * Sommarle con dei pesi sembrava naturale e non funziona, e vale la pena dire
 * perche' invece di riprovarci fra sei mesi. Con la somma, uno step di catalogo
 * che non dichiara componenti prendeva 0 sull'ancoraggio: veniva punito per un
 * campo non compilato, non per essere sbagliato. Normalizzando sui soli segnali
 * disponibili si ottiene l'errore opposto e peggiore — un candidato con **un
 * solo** segnale debole arriva al punteggio pieno, e batte uno agganciato al
 * componente giusto ma con parole diverse. Il controllo l'ha preso subito.
 *
 * Quindi: prima chi tocca gli stessi componenti, poi chi somiglia come frase.
 * Due classi ordinate, ognuna col suo criterio. E' anche piu' facile da
 * spiegare, che con una rosa di candidati non e' un dettaglio: chi la legge
 * deve poter capire perche' una voce c'e'.
 */
const ANCHORED_BASE = 0.5;

/**
 * Quanto devono somigliare due frasi perche' la somiglianza valga da sola.
 *
 * Sotto, la rosa si riempie di voci che condividono una parola, e una rosa
 * rumorosa invita a scegliere il meno peggio invece di dichiarare che manca —
 * che e' il modo in cui una quasi-duplicazione entra nel catalogo con la
 * benedizione dello strumento.
 */
const LEXICAL_MIN = 0.45;

function componentKey(role: string, name: string): string {
  return `${role} ${fold(name)}`;
}

/** Token della frase, gia' mascherata dai valori concreti e senza parole vuote. */
function phraseTokens(text: string): string[] {
  return tokenize(fingerprint(maskParams(text).masked));
}

export function rankCandidates(
  intent: Intent,
  resolved: readonly ResolvedStep[],
  catalog: readonly CatalogStep[],
  limit = 5
): RankedCandidate[] {
  const touched = new Set(resolved.map((r) => componentKey(r.step.role, r.step.name)));
  for (const a of intent.assertions) touched.add(componentKey(a.role, a.name));

  const labelTokens = phraseTokens(intent.label);
  const pageNames = new Set(
    resolved.map((r) => (r.fromPage ?? "").split("/").filter(Boolean).pop() ?? "").filter(Boolean)
  );

  const anchored: RankedCandidate[] = [];
  const similar: RankedCandidate[] = [];

  for (const step of catalog) {
    const anchors = step.components ?? [];
    const hit = anchors.filter((c) => touched.has(componentKey(c.role, c.name)));
    const samePage = Boolean(step.page && pageNames.has(step.page));

    // La somiglianza si calcola sull'espressione e su ogni alias: un alias e'
    // una formulazione che qualcuno ha davvero scritto, quindi e' esattamente
    // il testo che un'altra persona ha piu' probabilita' di riscrivere.
    const forms = [step.expression, ...(step.aliases ?? [])];
    const lexical = Math.max(
      0,
      ...forms.map((f) => (labelTokens.length ? tokenSetRatio(labelTokens, phraseTokens(f)) : 0))
    );

    if (hit.length > 0) {
      const fraction = hit.length / anchors.length;
      const why = [`tocca ${hit.length}/${anchors.length} dei componenti che ha usato il tester`];
      if (samePage) why.push(`stessa pagina (${step.page})`);
      if (lexical > LEXICAL_MIN) why.push(`e la formulazione somiglia (${Math.round(lexical * 100)}%)`);
      // Lessico e pagina restano solo come spareggio fra agganciati pari merito.
      anchored.push({
        step,
        score: ANCHORED_BASE + 0.5 * fraction + 0.01 * lexical + (samePage ? 0.01 : 0),
        why,
        classe: "stessi-componenti",
        similarity: lexical,
      });
      continue;
    }

    // Componenti dichiarati ma DISGIUNTI da quelli toccati: non e' un candidato
    // debole, e' un'altra intenzione. E' la stessa lettura di D22 — insiemi
    // disgiunti separano, non avvicinano — e qui vale come esclusione, non come
    // punteggio basso.
    if (anchors.length > 0) continue;

    if (lexical >= LEXICAL_MIN) {
      const why = [`formulazione simile (${Math.round(lexical * 100)}%)`];
      if (samePage) why.push(`stessa pagina (${step.page})`);
      similar.push({ step, score: lexical * (ANCHORED_BASE - 0.05), why, classe: "formulazione-simile", similarity: lexical });
    }
  }

  // Prima gli agganciati, poi i somiglianti. Le due classi non si mescolano
  // nell'ordinamento: una prova di identita' non va messa in gara con una stima.
  anchored.sort((a, b) => b.score - a.score);
  similar.sort((a, b) => b.score - a.score);
  return [...anchored, ...similar].slice(0, limit);
}

// ---------------------------------------------------------------------------
// Cio' che serve a chi emette i file
// ---------------------------------------------------------------------------

/**
 * Su quale pagina e' stata fatta una verifica. Una verifica in coda a un passo che
 * cambia pagina l'ha fatta il tester sulla pagina di ARRIVO; una a meta' passo,
 * su quella di partenza. Attribuirla sempre alla partenza lasciava la pagina di
 * arrivo senza componenti, quindi senza Page Object.
 */
export function assertionPage(
  intent: Pick<ResolvedIntent, "page" | "navigatesTo" | "steps">,
  a: Assertion
): string | null {
  const aMeta = a.afterStep !== undefined && a.afterStep < intent.steps.length;
  return aMeta ? intent.page : intent.navigatesTo ?? intent.page;
}

/** I componenti che una pagina deve esporre, dedotti da cosa la registrazione ha usato. */
export function componentsForPage(
  intents: readonly ResolvedIntent[],
  pageKey: string,
  assertionsOf: (a: Assertion) => Component
): Component[] {
  const byKey = new Map<string, Component>();

  for (const intent of intents) {
    for (const r of intent.steps) {
      if ((r.fromPage ?? intent.page) !== pageKey) continue;
      byKey.set(componentKey(r.component.role, r.component.name), r.component);
    }
    // Le asserzioni valgono quanto i gesti: `assertLoaded` ne ha bisogno, e
    // senza il locator la pagina non saprebbe riconoscersi.
    for (const a of intent.assertions) {
      if (assertionPage(intent, a) !== pageKey) continue;
      const c = assertionsOf(a);
      if (!byKey.has(componentKey(c.role, c.name))) byKey.set(componentKey(c.role, c.name), c);
    }
  }

  // NELL'ORDINE DELLA REGISTRAZIONE, non alfabetico: il primo componente e' il
  // primo che il tester ha toccato su quella pagina, ed e' l'unico di cui si sa
  // con certezza che esisteva quando la pagina si e' aperta. Ordinarli per nome
  // faceva scegliere l'ancoraggio a caso (vedi assertLoadedBody).
  return [...byKey.values()];
}
