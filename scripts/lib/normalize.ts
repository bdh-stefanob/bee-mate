/**
 * lib/normalize.ts
 * ----------------
 * Normalizzazione di una riga-passo: da prosa wiki a forma confrontabile.
 *
 * E' il secondo stadio dell'Osservatorio. `atlassian.ts` risponde a "questa
 * pagina contiene qualcosa che assomiglia a Gherkin?"; qui si risponde a
 * "questa riga e' la stessa cosa di quest'altra riga?".
 *
 * Il vincolo che governa tutte le scelte qui dentro: il meccanismo deve essere
 * ISPEZIONABILE. Ogni trasformazione dev'essere spiegabile a voce a un tester
 * ("togliamo i bullet, mascheriamo i valori fra virgolette, minuscolizziamo"),
 * perche' i numeri che ne escono finiscono in una presentazione e devono
 * reggere alla domanda "e come fai a saperlo?".
 *
 * Le tre uscite, ognuna con un compito diverso:
 *   - `body`        testo mascherato, casing originale → e' cio' che si mostra
 *                   a un umano e cio' che diventa la forma canonica candidata
 *   - `fingerprint` forma piatta (minuscole, senza accenti, spazi collassati)
 *                   → raggruppamento ESATTO, zero fuzzy, zero discussioni
 *   - `tokens`      insieme di token con stop-word tolte e suffissi ridotti
 *                   → input della similarita' in `cluster.ts`
 *
 * Cio' che NON fa: non decide se due passi sono equivalenti. Quella decisione
 * sta tutta in `cluster.ts`, con le sue soglie dichiarate.
 *
 * Verificato da:  npx ts-node scripts/lib/normalize.check.ts
 */

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

/** Keyword cosi' com'e' scritta, ricondotta alla forma inglese. */
export type CanonicalKeyword = "Given" | "When" | "Then" | "And" | "But";

/**
 * Keyword semantica dopo la risoluzione di And/But.
 * "Unknown" esiste perche' una riga puo' iniziare con "And" senza che sopra ci
 * sia mai stato un Given/When/Then: succede di continuo nelle pagine wiki dove
 * il passo e' stato copiato a meta'.
 */
export type StepBucket = "Given" | "When" | "Then" | "Unknown";

export type ParamToken = "{string}" | "{int}" | "{float}" | "{date}";

export interface ExtractedParam {
  token: ParamToken;
  /** Valore letterale trovato nel testo, senza le virgolette. */
  value: string;
}

export interface NormalizedStep {
  /** Riga originale, intatta. Serve a rendere ispezionabile ogni conclusione. */
  raw: string;
  keyword: CanonicalKeyword;
  /** Keyword come appariva davvero (es. "Dato che", "quando"). */
  keywordRaw: string;
  bucket: StepBucket;
  /** Corpo ripulito e mascherato, casing originale. */
  body: string;
  fingerprint: string;
  tokens: string[];
  params: ExtractedParam[];
  /** Es. "{string}|{int}". Vuoto se il passo non ha parametri. */
  paramSignature: string;
}

// ---------------------------------------------------------------------------
// Keyword
// ---------------------------------------------------------------------------
//
// Le keyword italiane non sono un vezzo: nelle pagine reali convivono con le
// inglesi anche dentro lo stesso scenario, perche' il modello di riferimento e'
// stato copiato da un collega diverso ogni volta. Se non le riconoscessimo, i
// passi italiani sparirebbero dalle metriche invece di risultare entropici.

// Divergenza voluta da `scoreGherkin`: li' "data" e "date" contano come keyword
// italiane, e va bene perche' il costo di un falso positivo e' una riga contata
// in piu'. Qui il costo e' un passo inventato ("Data is displayed" → Given "is
// displayed") che diventa un cluster fantasma nelle metriche. Quindi le due
// parole ambigue in inglese sono accettate solo nella forma "data che".
const KEYWORD_ALIASES: ReadonlyArray<readonly [string, CanonicalKeyword]> = [
  // Le forme multi-parola vanno PRIMA delle singole: "dato che" prima di "dato".
  ["dato che", "Given"], ["dati che", "Given"],
  ["data che", "Given"], ["date che", "Given"],
  ["premesso che", "Given"], ["premesso", "Given"],
  ["given that", "Given"], ["given", "Given"],
  ["dato", "Given"], ["dati", "Given"],
  ["when", "When"], ["quando", "When"],
  ["then", "Then"], ["allora", "Then"],
  ["and", "And"], ["ed", "And"], ["e", "And"],
  ["but", "But"], ["ma", "But"], ["pero", "But"], ["però", "But"],
];

/** Righe di struttura: non sono passi, ma non sono nemmeno rumore. */
const STRUCTURE_PREFIXES = [
  "feature", "scenario", "scenario outline", "background", "examples", "rule",
  "funzionalita", "funzionalità", "contesto", "esempi", "schema dello scenario",
];

// ---------------------------------------------------------------------------
// Stop-word
// ---------------------------------------------------------------------------
//
// Regola per decidere cosa entra: una parola e' stop-word solo se toglierla non
// puo' MAI cambiare l'intenzione del passo. Per questo "in", "out", "non",
// "senza" NON sono qui dentro: sono esattamente le parole che distinguono
// "logged in" da "logged out" e "confermato" da "non confermato", cioe' i falsi
// accoppiamenti piu' probabili e piu' dannosi.

const STOP_WORDS_SRC = [
  // EN — articoli, ausiliari, preposizioni non direzionali
  "the", "a", "an", "of", "to", "for", "by", "with", "from", "as", "that",
  "this", "these", "those", "is", "are", "was", "were", "be", "been", "being",
  "has", "have", "had", "it", "its", "his", "her", "their", "my", "your",
  "our", "there", "then", "when", "which", "who", "should", "shall", "will",
  "does", "do", "did", "at",
  // IT — articoli, preposizioni articolate, ausiliari
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "del",
  "dello", "della", "dei", "degli", "delle", "da", "dal", "dallo", "dalla",
  "dai", "dagli", "dalle", "nel", "nello", "nella", "nei", "negli", "nelle",
  "con", "col", "per", "su", "sul", "sullo", "sulla", "sui", "sugli", "sulle",
  "al", "allo", "alla", "ai", "agli", "alle", "che", "e", "ed", "o", "oppure",
  "essere", "viene", "vengono", "sono", "ha", "hanno", "aver", "avere", "sia",
  "esso", "essa", "suo", "sua", "loro", "quando", "quindi", "poi",
];

/** Marcatori di negazione. La loro presenza asimmetrica vieta la fusione. */
const NEGATION_WORDS_SRC = [
  "not", "never", "without", "no", "none", "neither", "cannot",
  "non", "mai", "senza", "nessun", "nessuno", "nessuna", "niente",
];

/**
 * Coppie di antonimi: se un passo sta su un lato e l'altro sul lato opposto,
 * non possono essere lo stesso passo, quanto si somiglino lessicalmente.
 * E' la difesa piu' efficace contro il falso positivo tipico — due frasi che
 * differiscono per UNA parola e significano l'opposto.
 */
const ANTONYM_PAIRS_SRC: ReadonlyArray<readonly [string, string]> = [
  ["in", "out"],
  ["login", "logout"],
  ["add", "remove"], ["adds", "removes"], ["added", "removed"],
  ["aggiunge", "rimuove"], ["aggiunto", "rimosso"],
  ["valid", "invalid"], ["valido", "invalido"], ["valida", "invalida"],
  ["enabled", "disabled"], ["abilitato", "disabilitato"],
  ["visible", "hidden"], ["visibile", "nascosto"],
  ["present", "absent"], ["presente", "assente"],
  ["confirmed", "cancelled"], ["confirmed", "canceled"],
  ["confermato", "annullato"],
  ["accepted", "rejected"], ["accettato", "rifiutato"],
  ["success", "failure"], ["successful", "failed"],
  ["successo", "errore"], ["riuscito", "fallito"],
  ["empty", "full"], ["vuoto", "pieno"],
  ["open", "closed"], ["aperto", "chiuso"],
  ["available", "unavailable"], ["disponibile", "indisponibile"],
  ["registered", "unregistered"], ["registrato", "anonimo"],
  ["increase", "decrease"], ["aumenta", "diminuisce"],
  ["before", "after"], ["prima", "dopo"],
  ["more", "less"], ["maggiore", "minore"],
];

// ---------------------------------------------------------------------------
// Pulizia della riga
// ---------------------------------------------------------------------------

/**
 * Toglie bullet, numerazione, citazioni e asterischi di lista in testa.
 * Stessa classe di caratteri usata da `scoreGherkin`: se le due divergessero,
 * il conteggio dei passi e la loro normalizzazione non parlerebbero della
 * stessa popolazione di righe.
 */
export function stripLinePrefix(line: string): string {
  return line.replace(/^[\s>*\-–—•·\d.)\]]+/, "");
}

/** Markdown/wiki residuo. Il grassetto sulla keyword e' la forma piu' comune. */
export function stripMarkup(s: string): string {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // link markdown → solo il testo
    .replace(/\*\*|__|`|~~/g, "")
    .replace(/(^|\s)[*_]+/g, "$1")
    .replace(/[*_]+(?=\s|$)/g, "");
}

/**
 * Ripiegamento per il confronto: minuscole, accenti tolti, apostrofo
 * tipografico uniformato, apostrofo di troncamento assorbito.
 *
 * Perche' togliere gli accenti: nelle pagine reali "è", "e'" ed "e`" convivono
 * nella stessa frase scritta da autori diversi. Senza il ripiegamento
 * finirebbero in tre cluster distinti e la metrica di entropia risulterebbe
 * gonfiata da un problema di tastiera, non di linguaggio.
 * Effetto collaterale accettato: la congiunzione "e" e il verbo "è" collassano
 * sullo stesso token — ma "e" e' stop-word, quindi non pesa sulla similarita'.
 */
export function fold(s: string): string {
  return s
    .replace(/[‘’ʼ]/g, "'")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/([aeiou])'(?=\s|$)/g, "$1");
}

// ---------------------------------------------------------------------------
// Estrazione dei parametri
// ---------------------------------------------------------------------------

const MONTHS =
  "(?:gen(?:naio)?|feb(?:braio|ruary)?|mar(?:zo|ch)?|apr(?:ile|il)?|" +
  "mag(?:gio)?|may|giu(?:gno)?|jun(?:e)?|lug(?:lio)?|jul(?:y)?|" +
  "ago(?:sto)?|aug(?:ust)?|set(?:tembre)?|sep(?:tember)?|" +
  "ott(?:obre)?|oct(?:ober)?|nov(?:embre|ember)?|dic(?:embre)?|dec(?:ember)?|" +
  "jan(?:uary)?)";

/** Confine "non alfanumerico": impedisce di mascherare il 2 dentro "SMS2". */
const NOT_WORD_BEFORE = "(?<![\\p{L}\\d])";
const NOT_WORD_AFTER = "(?![\\p{L}\\d])";

const DATE_SRC =
  NOT_WORD_BEFORE +
  "(?:" +
  "\\d{4}-\\d{2}-\\d{2}" +
  "|\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-]\\d{2,4}" +
  `|\\d{1,2}\\s+${MONTHS}\\.?\\s+\\d{4}` +
  `|${MONTHS}\\.?\\s+\\d{1,2},?\\s+\\d{4}` +
  ")" +
  NOT_WORD_AFTER;

/**
 * Un'unica alternanza, scandita da sinistra a destra: cosi' l'ordine dei
 * parametri estratti e' per costruzione l'ordine in cui compaiono, e un numero
 * dentro una stringa fra virgolette non viene mascherato due volte.
 *
 * L'apostrofo singolo ha una guardia sui confini per una ragione molto
 * concreta: in italiano "l'utente ... l'ordine" verrebbe letto come un
 * letterale fra apici, e mezza frase sparirebbe dentro un {string}.
 */
const PARAM_PATTERN = new RegExp(
  [
    '"([^"\\n]*)"',
    "“([^”\\n]*)”",
    "«([^»\\n]*)»",
    "(?<=^|[\\s(\\[:=])'([^'\\n]{1,80})'(?=$|[\\s).,;:\\]!?])",
    "(?<=^|[\\s(\\[:=])‘([^’\\n]{1,80})’(?=$|[\\s).,;:\\]!?])",
    // Segnaposto di Scenario Outline: <email>, <Mobile number>. Sono gia'
    // parametri dichiarati dall'autore — trattarli come testo renderebbe unico
    // ogni passo che ne contiene uno. I confini senza spazi evitano di
    // scambiare per segnaposto una disequazione ("il prezzo e' <10 e >5").
    "<([^<>\\s][^<>\\n]{0,38}[^<>\\s]|[^<>\\s])>",
    DATE_SRC,
    NOT_WORD_BEFORE + "\\d+[.,]\\d+" + NOT_WORD_AFTER,
    NOT_WORD_BEFORE + "\\d+" + NOT_WORD_AFTER,
  ].join("|"),
  "giu"
);

const DATE_ONLY = new RegExp("^(?:" + DATE_SRC + ")$", "iu");
const QUOTE_OPENERS = new Set(['"', "'", "“", "‘", "«", "<"]);

export interface MaskResult {
  masked: string;
  params: ExtractedParam[];
}

/**
 * Sostituisce i valori concreti con i token del catalogo e li conserva a parte.
 *
 * I valori conservati non sono uno scarto: sono i `paramEnums` candidati dello
 * schema v2. "SMS" ed "EMAIL" trovati in venti pagine diverse sono l'enum del
 * metodo di autenticazione, gia' pronto e gia' derivato dai dati.
 */
export function maskParams(body: string): MaskResult {
  const params: ExtractedParam[] = [];

  const masked = body.replace(PARAM_PATTERN, (match: string) => {
    const first = match.charAt(0);

    if (QUOTE_OPENERS.has(first)) {
      params.push({ token: "{string}", value: match.slice(1, -1) });
      return "{string}";
    }
    if (DATE_ONLY.test(match)) {
      params.push({ token: "{date}", value: match });
      return "{date}";
    }
    if (/^\d+[.,]\d+$/.test(match)) {
      params.push({ token: "{float}", value: match });
      return "{float}";
    }
    params.push({ token: "{int}", value: match });
    return "{int}";
  });

  return { masked, params };
}

// ---------------------------------------------------------------------------
// Impronta e token
// ---------------------------------------------------------------------------

/** Forma piatta per il raggruppamento esatto. Nessuna tolleranza, nessun fuzzy. */
export function fingerprint(maskedBody: string): string {
  return fold(maskedBody)
    .replace(/\s+/g, " ")
    .replace(/[.;:!?,]+$/, "")
    .trim();
}

const STOP_WORDS: ReadonlySet<string> = new Set(STOP_WORDS_SRC.map(fold));

/**
 * Riduzione di suffisso, non stemming vero: plurale inglese, participio in
 * "-ed", vocale finale delle flessioni italiane. Deliberatamente minima — uno
 * stemmer aggressivo (Porter/Snowball) collasserebbe parole di significato
 * diverso e i falsi accoppiamenti sono il rischio principale del progetto.
 *
 * Il "-ed" c'e' perche' sul corpus reale la coppia piu' frequente e' proprio
 * quella di tempo verbale: "the user selects" / "the user selected" scritti dal
 * tester A e dal tester B per lo stesso passo. Il vincolo sulla lunghezza del
 * residuo evita di sfregiare parole che finiscono in "-ed" per caso ("speed").
 */
export function stem(token: string): string {
  if (token.startsWith("{")) return token;
  let s = token;
  if (s.length >= 4 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  if (s.length >= 6 && s.endsWith("ed")) s = s.slice(0, -2);
  if (s.length >= 5 && /[aeiou]$/.test(s)) s = s.slice(0, -1);
  return s;
}

const TOKEN_PATTERN = /\{(?:string|int|float|date)\}|[\p{L}\p{N}]+/gu;

/** Token per la similarita': stop-word tolte, monoletterali tolti, suffissi ridotti. */
export function tokenize(fp: string): string[] {
  const out: string[] = [];
  for (const m of fp.matchAll(TOKEN_PATTERN)) {
    const t = m[0];
    if (t.startsWith("{")) {
      out.push(t);
      continue;
    }
    if (t.length < 2) continue;
    if (STOP_WORDS.has(t)) continue;
    out.push(stem(t));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Negazione e antonimi — esposti perche' `cluster.ts` li usa come guardie
// ---------------------------------------------------------------------------

const NEGATION_STEMS: ReadonlySet<string> = new Set(
  NEGATION_WORDS_SRC.map((w) => stem(fold(w)))
);

/**
 * stem → "gruppo:lato". I gruppi si fondono quando due coppie condividono una
 * parola: "add/remove", "adds/removes" e "added/removed" descrivono la stessa
 * opposizione, e la riduzione di suffisso non le porta tutte sullo stesso stem
 * ("added" resta "added", "removed" diventa "remov"). Senza la fusione, due lati
 * finirebbero in gruppi diversi e la guardia non scatterebbe piu' — cioe' si
 * romperebbe in silenzio proprio dove serve.
 */
const ANTONYM_SIDE = new Map<string, string>();
{
  let nextGroup = 0;
  for (const [rawLeft, rawRight] of ANTONYM_PAIRS_SRC) {
    const left = stem(fold(rawLeft));
    const right = stem(fold(rawRight));
    const known = ANTONYM_SIDE.get(left) ?? ANTONYM_SIDE.get(right);
    const group = known ? known.split(":")[0]! : String(nextGroup++);
    // Se una delle due e' gia' nota, l'altra prende il lato opposto nello
    // stesso gruppo; altrimenti si apre un gruppo nuovo con L e R.
    const leftSide = ANTONYM_SIDE.get(left) ?? (ANTONYM_SIDE.get(right) === `${group}:L` ? `${group}:R` : `${group}:L`);
    ANTONYM_SIDE.set(left, leftSide);
    ANTONYM_SIDE.set(right, ANTONYM_SIDE.get(right) ?? (leftSide.endsWith("L") ? `${group}:R` : `${group}:L`));
  }
}

export function hasNegation(tokens: readonly string[]): boolean {
  return tokens.some((t) => NEGATION_STEMS.has(t));
}

/** true se i due insiemi contengono i due lati opposti della stessa coppia. */
export function hasAntonymConflict(a: readonly string[], b: readonly string[]): boolean {
  for (const ta of a) {
    const sideA = ANTONYM_SIDE.get(ta);
    if (!sideA) continue;
    const [idA, lrA] = sideA.split(":");
    for (const tb of b) {
      const sideB = ANTONYM_SIDE.get(tb);
      if (!sideB) continue;
      const [idB, lrB] = sideB.split(":");
      if (idA === idB && lrA !== lrB) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Riconoscimento del passo
// ---------------------------------------------------------------------------

export interface NormalizeOptions {
  /**
   * Le celle di tabella arrivano da `storageToText` separate da " | ": la parte
   * dopo il primo separatore e' quasi sempre l'esito atteso, non il passo.
   * Tenerla dentro renderebbe unico ogni passo che varia solo per il dato
   * atteso — cioe' proprio la duplicazione che stiamo misurando.
   */
  cutAtPipe?: boolean;
}

export function isStructureLine(line: string): boolean {
  const l = fold(stripMarkup(stripLinePrefix(line))).trim();
  return STRUCTURE_PREFIXES.some((k) => l.startsWith(fold(k) + ":"));
}

/**
 * Da riga grezza a passo normalizzato. `null` se la riga non e' un passo.
 * Il `bucket` resta provvisorio (And/But non sanno da soli cosa ereditano):
 * lo risolve `normalizeSteps` guardando la sequenza.
 */
export function normalizeStepLine(
  rawLine: string,
  opts: NormalizeOptions = {}
): NormalizedStep | null {
  const cleaned = stripMarkup(stripLinePrefix(rawLine)).trim();
  if (!cleaned) return null;
  if (isStructureLine(rawLine)) return null;

  const folded = fold(cleaned);
  let hit: { alias: string; canonical: CanonicalKeyword } | null = null;
  for (const [alias, canonical] of KEYWORD_ALIASES) {
    const a = fold(alias);
    if (folded.startsWith(a + " ") && folded.length > a.length + 2) {
      hit = { alias: a, canonical };
      break;
    }
  }
  if (!hit) return null;

  const keywordRaw = cleaned.slice(0, hit.alias.length);
  let body = cleaned.slice(hit.alias.length).trim();

  // "Given that ..." / "Dato che ..." descrivono lo stesso passo di "Given ...":
  // lasciare il connettivo produrrebbe due cluster per una differenza di stile.
  body = body.replace(/^(?:that|che)\s+/i, "");

  if (opts.cutAtPipe !== false) {
    const pipe = body.indexOf(" | ");
    if (pipe > 0) body = body.slice(0, pipe).trim();
  }
  body = body.replace(/[\s.;:]+$/, "").trim();
  if (!body) return null;

  const { masked, params } = maskParams(body);
  const fp = fingerprint(masked);
  if (!fp) return null;

  return {
    raw: rawLine,
    keyword: hit.canonical,
    keywordRaw,
    bucket: bucketOf(hit.canonical) ?? "Unknown",
    body: masked,
    fingerprint: fp,
    tokens: tokenize(fp),
    params,
    paramSignature: params.map((p) => p.token).join("|"),
  };
}

function bucketOf(k: CanonicalKeyword): StepBucket | null {
  if (k === "Given" || k === "When" || k === "Then") return k;
  return null;
}

export interface NormalizedLine {
  step: NormalizedStep;
  /** Indice 1-based della riga nel testo di partenza. Serve per la tracciabilita'. */
  line: number;
}

/**
 * Normalizza un blocco di testo intero, risolvendo l'ereditarieta' di And/But.
 *
 * Una riga "And the user confirms" non ha senso da sola: eredita la keyword
 * dell'ultimo passo concreto. Senza questa risoluzione, tutti gli "And"
 * finirebbero in un unico bucket indistinto e i cluster mescolerebbero premesse
 * con verifiche — il tipo di errore che gonfia le metriche e non si vede.
 */
export function normalizeSteps(
  text: string,
  opts: NormalizeOptions = {}
): NormalizedLine[] {
  const out: NormalizedLine[] = [];
  let current: StepBucket = "Unknown";
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    // Una riga di struttura chiude la sequenza: lo scenario successivo non
    // eredita il Given dello scenario precedente.
    if (isStructureLine(raw)) {
      current = "Unknown";
      continue;
    }
    const step = normalizeStepLine(raw, opts);
    if (!step) continue;

    if (step.keyword === "And" || step.keyword === "But") {
      step.bucket = current;
    } else {
      current = step.bucket;
    }
    out.push({ step, line: i + 1 });
  }

  return out;
}

/** Esposto per i controlli: elenco delle stop-word effettivamente in uso. */
export function stopWords(): ReadonlySet<string> {
  return STOP_WORDS;
}
