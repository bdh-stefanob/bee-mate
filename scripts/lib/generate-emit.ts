/**
 * lib/generate-emit.ts
 * --------------------
 * Dai dati risolti ai file. Sostituzione di stringhe sui modelli, niente altro.
 *
 * LA PROPRIETA' CHE VALE PIU' DI TUTTE
 * Quello che esce di qui **gira**, senza che nessun modello linguistico abbia
 * toccato niente. Le frasi Gherkin sono le etichette che il tester ha scritto
 * mentre eseguiva il test: non conformi al catalogo, ma vere e funzionanti.
 *
 * Il lavoro dell'assistente e' portarle nel vocabolario condiviso — non farle
 * esistere. Se il modello delude, si resta con un test verde scritto con le
 * parole di chi il test l'ha eseguito: un punto di partenza, non un fallimento.
 *
 * DUE DEVIAZIONI CONSAPEVOLI DALLE CONVENZIONI, ENTRAMBE MOTIVATE SOTTO:
 * la transizione fra pagine e il passo di verifica generico.
 */

import { render } from "./render-template";
import { fieldName } from "./component-naming";
import { judge } from "./stability";
import type { PageIdentity } from "./generate-core";
import type {
  Assertion, Component, GeneratedFile, ResolvedIntent,
} from "./generation-contract";

/**
 * Il passo di verifica unico, generato per ogni asserzione registrata.
 *
 * In inglese come il catalogo: era in italiano, e il risultato erano scenari
 * meta' e meta' — i passi del tester in inglese, le verifiche in italiano.
 * Due lingue nello stesso file sono entropia prodotta dal nostro strumento,
 * proprio quella che il progetto esiste per ridurre.
 */
export const VERIFY_STEP = "the page shows {string}";

/**
 * Il passo di accesso, messo in testa a uno scenario registrato a partire da
 * una sessione salvata. Definito una volta in src/steps/common/accesso.steps.ts.
 *
 * Senza, lo scenario comincia da una pagina che si vede solo da autenticati:
 * gira finche' la sessione sulla macchina e' valida e cade al primo passo
 * appena scade — con un "elemento non trovato" che non nomina la causa.
 */
export const LOGIN_STEP = "the user is logged in";

export interface EmitContext {
  intents: ResolvedIntent[];
  pages: PageIdentity[];
  /** Nome della registrazione, per i riferimenti nei file generati. */
  recordingPath: string;
  dictionaryPaths: string[];
  recordedAt: string;
  durationSeconds: number;
  generatedAt: string;
  /** Nome corto dello scenario: da' il nome ai file. */
  slug: string;
  /** Cartella radice del codice, di solito "src". */
  outRoot: string;
  /** La registrazione e' partita gia' autenticata: lo scenario dichiara l'accesso. */
  startedWithSession?: boolean;
}

// ---------------------------------------------------------------------------
// Nomi
// ---------------------------------------------------------------------------

/**
 * Nomi di campo univoci dentro alla stessa classe.
 *
 * Due componenti diversi possono ridurre allo stesso nome — un pulsante
 * "Continua" e un link "Continua »" diventano entrambi `continuaButton` dopo la
 * ripulitura. Senza questo, il secondo campo vincerebbe in silenzio e il primo
 * metodo cliccherebbe l'elemento sbagliato: compila, gira, e sbaglia.
 */
function uniqueFieldNames(components: readonly Component[]): Map<Component, string> {
  const used = new Set<string>();
  const out = new Map<Component, string>();
  for (const c of components) {
    let name = fieldName(c.kind, c.name);
    let n = 2;
    while (used.has(name)) name = `${fieldName(c.kind, c.name)}${n++}`;
    used.add(name);
    out.set(c, name);
  }
  return out;
}

function uniqueMethodNames(components: readonly Component[]): Map<Component, string> {
  const used = new Set<string>();
  const out = new Map<Component, string>();
  for (const c of components) {
    let name = c.method;
    let n = 2;
    while (used.has(name)) name = `${c.method}${n++}`;
    used.add(name);
    out.set(c, name);
  }
  return out;
}

function variableName(className: string): string {
  return className[0]!.toLowerCase() + className.slice(1);
}

/** Una stringa TypeScript con apici doppi, a prova di virgolette e a capo. */
function ts(value: string): string {
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// Page Object
// ---------------------------------------------------------------------------

function methodBody(kind: Component["kind"], field: string): { signature: string; body: string } {
  if (kind === "input") {
    return { signature: "(value: string): Promise<void>", body: `await this.${field}.fill(value);` };
  }
  if (kind === "choice") {
    return { signature: "(): Promise<void>", body: `await this.${field}.check();` };
  }
  return { signature: "(): Promise<void>", body: `await this.${field}.click();` };
}

/**
 * Come la pagina si riconosce.
 *
 * IL PRIMO ELEMENTO TOCCATO, NON LA VERIFICA DEL TESTER.
 *
 * Prima si preferiva un'asserzione dichiarata dal tester — "se vedo questo sono
 * dove volevo essere" — e sembrava la scelta migliore, perche' e' un giudizio
 * umano. Contro l'applicazione vera non ha retto: una verifica dimostra un
 * **momento**, non l'identita' di una pagina. Il tester aveva verificato un link
 * che compare solo dopo aver aperto una riga; il test, arrivando sulla pagina,
 * lo aspettava dieci secondi e si fermava li'.
 *
 * Cio' che invece esisteva di sicuro quando la pagina si e' aperta e' il primo
 * elemento che il tester ha **toccato**: ci ha cliccato sopra, quindi c'era. Le
 * verifiche restano un ripiego, e un componente qualunque l'ultimo.
 */
export function assertLoadedBody(
  assertions: readonly Assertion[],
  components: readonly Component[],
  fields: Map<Component, string>
): string {
  const chiave = (role: string, name: string): string => `${role}\u0000${name}`;
  const daVerifica = new Set(assertions.map((a) => chiave(a.role, a.name)));
  const toccati = components.filter((c) => !daVerifica.has(chiave(c.role, c.name)));

  // I componenti arrivano nell'ordine della registrazione: il primo toccato e'
  // il primo della lista, stabile o ambiguo che sia. Non si cerca il primo
  // STABILE: uno stabile toccato dopo puo' esistere solo grazie ai clic
  // precedenti ("Cart, 1 items" compare dopo "Add to cart").
  const primoToccato = toccati.find((c) => c.stability === "stable" || c.stability === "ambiguous");
  if (primoToccato?.stability === "stable") {
    return `await this.expectVisible(this.${fields.get(primoToccato)!});`;
  }

  // Toccato ma ambiguo (lo stesso pulsante ripetuto in una lista): esisteva
  // comunque all'arrivo, e il suo locator usa gia' `.first()`. Meglio di una
  // verifica, che descrive cio' che compare DOPO un'azione.
  if (primoToccato) {
    return (
      `// Nessun elemento stabile fra quelli toccati: si usa il primo toccato, che\n` +
      `// esisteva all'arrivo ma non e' univoco (ce ne sono piu' d'uno uguali).\n` +
      `await this.expectVisible(this.${fields.get(primoToccato)!});`
    );
  }

  const verificaStabile = assertions.find((a) => judge(a.name, 1).stability === "stable");
  if (verificaStabile) {
    const match = components.find(
      (c) => c.role === verificaStabile.role && c.name === verificaStabile.name
    );
    if (match) {
      return (
        `// Nessun elemento stabile fra quelli toccati: si ripiega sulla verifica del\n` +
        `// tester, che pero' dimostra un momento, non l'identita' della pagina.\n` +
        `await this.expectVisible(this.${fields.get(match)!});`
      );
    }
  }

  const fallback = components.find((c) => c.stability === "stable") ?? components[0];
  if (fallback) {
    return (
      `// Nessuna verifica dichiarata dal tester su questa pagina: si riconosce da un\n` +
      `// componente qualunque. E' un riconoscimento debole — registrando, premi\n` +
      `// "Verifica" su cio' che dice davvero "sono sulla pagina giusta".\n` +
      `await this.expectVisible(this.${fields.get(fallback)!});`
    );
  }

  return (
    `// Questa pagina non ha componenti noti: non c'e' niente su cui riconoscerla.\n` +
    `await this.page.waitForLoadState("domcontentloaded");`
  );
}

export function emitPageObject(
  page: PageIdentity,
  components: readonly Component[],
  assertions: readonly Assertion[],
  ctx: EmitContext
): { file: GeneratedFile; methods: Map<Component, string> } {
  const fields = uniqueFieldNames(components);
  const methods = uniqueMethodNames(components);

  const locators = components
    .map((c) => {
      const note = c.stability === "stable" ? "" : `  // ${c.stability}: ${c.notes.join("; ")}`;
      return `private readonly ${fields.get(c)!}: Locator = this.page.${c.locator};${note}`;
    })
    .join("\n");

  const methodBlocks = components.map((c) => {
    const { signature, body } = methodBody(c.kind, fields.get(c)!);
    const warn = c.stability === "stable" ? "" : `\n * @attenzione  ancoraggio ${c.stability}: ${c.notes.join("; ")}`;
    return (
      `/**\n * @componente  ${c.role} ${ts(c.name)}${warn}\n */\n` +
      `async ${methods.get(c)!}${signature} {\n  ${body}\n}`
    );
  });

  // Una sottocartella per host: due applicazioni diverse possono produrre lo
  // stesso slug (due "home", due "accedi"), e prima di questa sottocartella la
  // seconda registrazione sovrascriveva la Page Object della prima in
  // silenzio — compilava, girava, e chiamava i metodi sbagliati. `page.host`
  // e' gia' parte dell'identita' della pagina (vedi `pageIdentity` in
  // generate-core.ts), quindi non e' un'informazione nuova da mantenere: e'
  // la stessa che gia' distingue due pagine con lo stesso `slug` su domini
  // diversi.
  const path = `${ctx.outRoot}/pages/generated/${page.host}/${page.slug}.page.ts`;
  const contents = render("page-object.ts.tmpl", {
    OUT_PATH: path,
    SOURCE_RECORDING: ctx.recordingPath,
    SOURCE_DICTIONARY: ctx.dictionaryPaths.join(", ") || "(nessuno)",
    GENERATED_AT: ctx.generatedAt,
    // Un livello in piu' di prima: la pagina vive sotto pages/generated/<host>/,
    // non piu' sotto pages/generated/ direttamente.
    BASE_PAGE_IMPORT: "../../../support/base.page",
    EXTRA_IMPORTS: "",
    CLASS_NAME: page.className,
    PATH: page.path,
    LOCATORS: locators || "// Nessun componente noto su questa pagina.",
    ASSERT_LOADED_BODY: assertLoadedBody(assertions, components, fields),
    METHODS: methodBlocks.join("\n\n") || "// Nessuna azione registrata su questa pagina.",
  });

  return {
    file: { path, contents, origin: "deterministico", template: "page-object.ts.tmpl" },
    methods,
  };
}

// ---------------------------------------------------------------------------
// Step definition
// ---------------------------------------------------------------------------

/**
 * La frase Gherkin deterministica: l'etichetta del tester, ripulita.
 *
 * Non si sceglie qui uno step dal catalogo, per quanto la rosa dei candidati sia
 * gia' pronta. Se lo facesse il generatore, il lavoro dell'assistente sarebbe
 * gia' fatto e il confronto fra "con regole" e "senza" non misurerebbe niente.
 * La rosa serve a chi scrive la frase, e chi scrive la frase e' l'assistente.
 */
export function phraseOf(intent: ResolvedIntent): string {
  return intent.label
    .replace(/^\(non chiuso.*\)$/, "the tester did not close this step")
    .replace(/^\(intento senza nome\)$/, "unnamed step")
    .replace(/\s+/g, " ")
    .replace(/[.;:]+$/, "")
    .trim();
}

function keywordOf(index: number): "Given" | "When" {
  return index === 0 ? "Given" : "When";
}

/** Il valore da scrivere in un campo. Le password non si sono mai avute. */
function valueExpression(value: string | undefined, secret: boolean | undefined): string {
  if (secret) {
    // Mai registrata: la dichiara l'ambiente nel suo blocco `login` (Controllo).
    return `this.passwordAmbiente()`;
  }
  return ts(value ?? "");
}

/**
 * La verifica e' stata fatta a META' del passo, non alla fine?
 *
 * Se si', va eseguita nel punto in cui il tester l'ha fatta: in fondo, un elemento
 * che compare solo a meta' (il carrello, prima di pagare) non c'e' piu'.
 */
export function verificaNelPasso(a: Assertion, intent: { steps: readonly unknown[] }): boolean {
  return a.afterStep !== undefined && a.afterStep < intent.steps.length;
}

export function emitSteps(
  ctx: EmitContext,
  pagesUsed: PageIdentity[],
  methodsByPage: Map<string, Map<Component, string>>
): GeneratedFile {
  const byKey = new Map(ctx.pages.map((p) => [p.key, p]));

  const imports = pagesUsed
    .map((p) => `import { ${p.className} } from "../../pages/generated/${p.host}/${p.slug}.page";`)
    .join("\n");

  const declarations = pagesUsed
    .map((p) => `let ${variableName(p.className)}: ${p.className};`)
    .join("\n");

  // Solo le pagine con una Page Object generata (almeno un componente toccato)
  // si possono costruire nello step: le altre non sono importate ne' dichiarate.
  const conPageObject = new Set(pagesUsed.map((p) => p.key));

  const seenPhrases = new Set<string>();
  const blocks: string[] = [];
  const initialised = new Set<string>();

  ctx.intents.forEach((intent, i) => {
    const page = byKey.get(intent.page ?? "");
    if (!page) return;

    const variable = variableName(page.className);
    const lines: string[] = [];

    // La Page Object si crea nello step che la introduce, mai in un hook.
    if (!initialised.has(page.key) && conPageObject.has(page.key)) {
      initialised.add(page.key);
      lines.push(`${variable} = new ${page.className}(this.page);`);
      if (i === 0) lines.push(`await ${variable}.navigate();`);
      else lines.push(`await ${variable}.assertLoaded();`);
    }

    for (const [k, r] of intent.steps.entries()) {
      // Le verifiche fatte prima di questo gesto, nel punto in cui il tester le ha
      // fatte. `expectTextVisible` sta nel World: uno step non conosce selettori.
      for (const a of intent.assertions) {
        if (verificaNelPasso(a, intent) && a.afterStep === k) {
          lines.push(`await this.expectTextVisible(${ts(a.name)});`);
        }
      }
      const owner = byKey.get(r.fromPage ?? intent.page ?? "") ?? page;
      const ownerVar = variableName(owner.className);
      const method = methodsByPage.get(owner.key)?.get(r.component);
      if (!method) continue;
      // Un passo che attraversa piu' pagine (dal carrello fino a "Finish")
      // tocca Page Object diverse da quella in cui comincia. Ognuna va creata
      // la prima volta che si incontra: usarla prima di assegnarla e' TS2454, e
      // un solo file cosi' in src/steps fa fallire la compilazione di TUTTI gli
      // scenari, non solo del suo.
      if (!initialised.has(owner.key)) {
        initialised.add(owner.key);
        lines.push(`${ownerVar} = new ${owner.className}(this.page);`);
        lines.push(`await ${ownerVar}.assertLoaded();`);
      }
      const arg =
        r.component.kind === "input" ? valueExpression(r.step.value, r.step.secret) : "";
      lines.push(`await ${ownerVar}.${method}(${arg});`);
    }

    // LA TRANSIZIONE FRA PAGINE, E PERCHE' NON E' return-value chaining.
    //
    // La convenzione vorrebbe che il metodo che cambia pagina restituisca la
    // Page Object successiva. Fra Page Object GENERATE non si puo': due pagine
    // che si raggiungono a vicenda — un login che porta al catalogo e un logout
    // che torna al login — si importerebbero a vicenda, e con CommonJS uno dei
    // due `require` restituisce un modulo ancora vuoto. Il sintomo e' un
    // costruttore `undefined` a tempo di esecuzione, che non assomiglia per
    // niente alla causa.
    //
    // La transizione resta esplicita, solo che avviene qui: si vede lo stesso
    // che la pagina e' cambiata, e non si rischia un ciclo.
    const next = intent.navigatesTo ? byKey.get(intent.navigatesTo) : undefined;
    if (next && next.key !== page.key && !conPageObject.has(next.key)) {
      // Si arriva su una pagina dove il tester non ha toccato niente: non ha una
      // Page Object, quindi non c'e' niente con cui riconoscerla. Costruirla qui
      // era un nome inesistente, e un file che non compila ferma TUTTI gli scenari.
      lines.push(`// Arrivo su ${next.className.replace(/Page$/, "")}: nessun componente toccato, nessuna Page Object da riconoscere.`);
    } else if (next && next.key !== page.key) {
      const nextVar = variableName(next.className);
      initialised.add(next.key);
      lines.push(`${nextVar} = new ${next.className}(this.page);`);
      lines.push(`await ${nextVar}.assertLoaded();`);
    }

    const phrase = phraseOf(intent);
    if (!seenPhrases.has(phrase)) {
      seenPhrases.add(phrase);
      const candidates = intent.candidates.length
        ? intent.candidates.map((c) => ` *          - ${c.expression}`).join("\n")
        : " *          (nessuno: serve una formulazione nuova)";

      // I componenti che questo intento ha davvero toccato, dedotti dalla
      // registrazione — non dal catalogo, che qui ancora non ha una voce per
      // questa frase. E' l'unico momento in cui l'informazione "questo step
      // usa questo componente" esiste per uno step wanted: se non la si scrive
      // ora, va persa, ed e' esattamente il buco che il catalogo misura come
      // "0 ancorati a componenti di frontend". Una password non si dichiara
      // mai (`secret`): il nome che porta e' un segnaposto, non un'identita'.
      const multiPagina = new Set(
        intent.steps.map((r) => r.fromPage ?? intent.page ?? "")
      ).size > 1;
      const componentKeys = new Set<string>();
      const componentLines: string[] = [];
      for (const r of intent.steps) {
        if (r.step.secret) continue;
        const owner = byKey.get(r.fromPage ?? intent.page ?? "") ?? page;
        const key = `${r.component.role}\u0000${r.component.name}\u0000${owner.key}`;
        if (componentKeys.has(key)) continue;
        componentKeys.add(key);
        const pageSuffix = multiPagina ? ` page=${owner.className}` : "";
        componentLines.push(` * @component ${r.component.role} ${ts(r.component.name)}${pageSuffix}`);
      }

      blocks.push(
        `/**\n` +
          ` * @intent  ${phrase}\n` +
          ` * @page    ${page.className}\n` +
          (componentLines.length ? componentLines.join("\n") + "\n" : "") +
          ` * @wanted\n` +
          ` *\n` +
          ` * Formulazione presa dall'etichetta del tester. Da portare nel catalogo:\n` +
          candidates +
          `\n */\n` +
          `${keywordOf(i)}(${ts(phrase)}, async function (this: CustomWorld) {\n` +
          lines.map((l) => `  ${l}`).join("\n") +
          `\n});`
      );
    }

  });

  // Il passo di verifica generico ("the page shows {string}") non si genera
  // piu' qui: vive una volta sola in src/steps/common/verifica.steps.ts.
  // Emesso in ogni file generato, bastava salvare due scenari perche' Cucumber
  // trovasse la stessa frase due volte e si rifiutasse di partire.

  const path = `${ctx.outRoot}/steps/generated/${ctx.slug}.steps.ts`;
  return {
    path,
    origin: "deterministico",
    template: "steps.ts.tmpl",
    contents: render("steps.ts.tmpl", {
      OUT_PATH: path,
      SOURCE_RECORDING: ctx.recordingPath,
      GENERATED_AT: ctx.generatedAt,
      WORLD_IMPORT: "../../support/world",
      PAGE_IMPORTS: imports,
      PAGE_DECLARATIONS: declarations,
      STEP_DEFINITIONS: blocks.join("\n\n"),
    }),
  };
}

// ---------------------------------------------------------------------------
// Feature
// ---------------------------------------------------------------------------

export function emitFeature(ctx: EmitContext, title: string): GeneratedFile {
  const lines: string[] = [];

  // `And` dopo il primo passo dello stesso tipo: tre `Then` di fila si leggono
  // come tre verifiche indipendenti, e sono invece un solo esito osservato.
  if (ctx.startedWithSession) lines.push(`Given ${LOGIN_STEP}`);

  ctx.intents.forEach((intent, i) => {
    // Con l'accesso in testa, il primo passo del tester non e' piu' il primo
    // `Given`: lo segue.
    const keyword = i === 0 && ctx.startedWithSession ? "And" : keywordOf(i);
    lines.push(`${keyword} ${phraseOf(intent)}`);
    // Le verifiche a meta' del passo stanno dentro lo step, nel punto giusto; qui si
    // vedono come commento, perche' chi legge lo scenario sappia che ci sono.
    for (const a of intent.assertions.filter((x) => verificaNelPasso(x, intent))) {
      lines.push(`# durante questo passo si verifica: "${a.name.replace(/"/g, "'")}"`);
    }
    intent.assertions.filter((x) => !verificaNelPasso(x, intent)).forEach((a, j) => {
      const keyword = j === 0 ? "Then" : "And";
      lines.push(`${keyword} ${VERIFY_STEP.replace("{string}", `"${a.name.replace(/"/g, "'")}"`)}`);
    });
  });

  const path = `${ctx.outRoot}/features/generated/${ctx.slug}.feature`;
  return {
    path,
    origin: "deterministico",
    template: "feature.feature.tmpl",
    contents: render("feature.feature.tmpl", {
      OUT_PATH: path,
      SOURCE_RECORDING: ctx.recordingPath,
      RECORDED_AT: ctx.recordedAt,
      DURATION: String(ctx.durationSeconds),
      INTENT_COUNT: String(ctx.intents.length),
      TAGS: "@generato @da-rivedere",
      FEATURE_TITLE: title,
      FEATURE_DESCRIPTION:
        "Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.\n" +
        "Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.",
      SCENARIO_TITLE: title,
      SCENARIO_STEPS: lines.join("\n"),
    }),
  };
}
