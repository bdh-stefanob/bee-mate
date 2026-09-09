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
import { toComponent } from "./component-naming";
import { judge } from "./stability";
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
  return {
    key: `${host}${pattern}`,
    host,
    path: rawPath,
    pattern,
    className: `${base}Page`,
    slug: kebab(base),
  };
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
  const byName = new Map<string, PageIdentity[]>();
  for (const id of identities) {
    const list = byName.get(id.className) ?? [];
    list.push(id);
    byName.set(id.className, list);
  }

  return identities.map((id) => {
    const clashing = byName.get(id.className)!;
    if (clashing.length === 1) return id;

    const segments = id.pattern.split("/").filter((s) => s && s !== ":id");
    const prefix = segments.length >= 2 ? pascal(segments[segments.length - 2]!) : pascal(id.host);
    const base = id.className.replace(/Page$/, "");
    return { ...id, className: `${prefix}${base}Page`, slug: kebab(`${prefix}-${base}`) };
  });
}

// ---------------------------------------------------------------------------
// Aggancio al dizionario
// ---------------------------------------------------------------------------

export interface DictionaryIndex {
  /** Dizionari per chiave di pagina. */
  byKey: Map<string, ScoutResult>;
  /** Dizionari per host, quando la pagina esatta non c'e'. */
  byHost: Map<string, ScoutResult[]>;
}

export function indexDictionaries(dicts: readonly ScoutResult[]): DictionaryIndex {
  const byKey = new Map<string, ScoutResult>();
  const byHost = new Map<string, ScoutResult[]>();
  for (const d of dicts) {
    const id = pageIdentity(d.url);
    byKey.set(id.key, d);
    byHost.set(id.host, [...(byHost.get(id.host) ?? []), d]);
  }
  return { byKey, byHost };
}

/** Il componente esatto, dal dizionario della pagina giusta. Null se non c'e'. */
function lookup(index: DictionaryIndex, url: string, role: string, name: string): Component | null {
  const id = pageIdentity(url);
  const exact = index.byKey.get(id.key);
  const found = exact?.components.find((c) => c.role === role && c.name === name);
  if (found) return found;

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
  return toComponent({ role: step.role, name: step.name }, 1);
}

export interface ResolveOptions {
  /** Il catalogo su cui cercare i candidati. */
  catalog: readonly CatalogStep[];
  /** Quanti candidati proporre per intento. */
  shortlist?: number;
}

export interface ResolveResult {
  intents: ResolvedIntent[];
  gaps: Gap[];
  /** Pagine incontrate, con nomi gia' resi univoci. */
  pages: PageIdentity[];
}

export function resolveRecording(
  recording: Recording,
  index: DictionaryIndex,
  options: ResolveOptions
): ResolveResult {
  const gaps: Gap[] = [];
  const seenKeys = new Map<string, PageIdentity>();

  const remember = (url: string): PageIdentity => {
    const id = pageIdentity(url);
    if (!seenKeys.has(id.key)) seenKeys.set(id.key, id);
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
  if (seenKeys.size === 0) remember(recording.startUrl);

  const pages = uniqueNames([...seenKeys.values()]);
  const nameByKey = new Map(pages.map((p) => [p.key, p]));

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

  const intents: ResolvedIntent[] = recording.intents.map((intent) => {
    const fallbackUrl = intent.pageUrl ?? recording.startUrl;

    const steps: ResolvedStep[] = intent.steps.map((step) => {
      const url = step.url ?? fallbackUrl;
      const id = nameByKey.get(pageIdentity(url).key) ?? pageIdentity(url);
      const found = lookup(index, url, step.role, step.name);

      if (!found) {
        gaps.push({
          kind: "componente-non-nel-dizionario",
          where: intent.label,
          detail:
            `${step.role} "${step.name}" su ${id.className} non e' nel dizionario. ` +
            `Il locator e' stato sintetizzato dalla registrazione, ma non sappiamo se e' ` +
            `univoco sulla pagina. Rilancia lo scout su ${url}`,
        });
      }

      const component = found ?? synthesise(step);
      if (component.stability !== "stable") {
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

    const pageId = nameByKey.get(pageIdentity(fallbackUrl).key) ?? pageIdentity(fallbackUrl);
    const endId = intent.endUrl
      ? nameByKey.get(pageIdentity(intent.endUrl).key) ?? pageIdentity(intent.endUrl)
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

    return {
      label: intent.label,
      steps,
      assertions: intent.assertions,
      notes: intent.notes,
      page: pageId.key,
      navigatesTo: endId && endId.key !== pageId.key ? endId.key : null,
      candidates: candidates.map((c) => c.step),
    };
  });

  return { intents, gaps, pages };
}

// ---------------------------------------------------------------------------
// Restringimento dei candidati
// ---------------------------------------------------------------------------

export interface RankedCandidate {
  step: CatalogStep;
  score: number;
  /** Perche' e' finito nella rosa. Va mostrato: una rosa senza motivi non si discute. */
  why: string[];
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
      similar.push({ step, score: lexical * (ANCHORED_BASE - 0.05), why });
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
    if (intent.page === pageKey) {
      for (const a of intent.assertions) {
        const c = assertionsOf(a);
        if (!byKey.has(componentKey(c.role, c.name))) byKey.set(componentKey(c.role, c.name), c);
      }
    }
  }

  return [...byKey.values()].sort((a, b) => a.method.localeCompare(b.method));
}
