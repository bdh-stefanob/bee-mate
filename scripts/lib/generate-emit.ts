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

/** Il passo di verifica unico, generato per ogni asserzione registrata. */
export const VERIFY_STEP = "la pagina mostra {string}";

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
 * Si preferisce un'asserzione dichiarata dal tester: e' lui ad aver detto "se
 * vedo questo, sono dove volevo essere", ed e' un giudizio che non sapremmo
 * ricostruire. Solo se non ce ne sono di affidabili si ripiega su un componente
 * qualunque, che e' un riconoscimento piu' debole e va detto.
 */
function assertLoadedBody(
  assertions: readonly Assertion[],
  components: readonly Component[],
  fields: Map<Component, string>
): string {
  const stable = assertions.find((a) => judge(a.name, 1).stability === "stable");
  if (stable) {
    const match = components.find((c) => c.role === stable.role && c.name === stable.name);
    if (match) return `await this.expectVisible(this.${fields.get(match)!});`;
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

  const path = `${ctx.outRoot}/pages/generated/${page.slug}.page.ts`;
  const contents = render("page-object.ts.tmpl", {
    OUT_PATH: path,
    SOURCE_RECORDING: ctx.recordingPath,
    SOURCE_DICTIONARY: ctx.dictionaryPaths.join(", ") || "(nessuno)",
    GENERATED_AT: ctx.generatedAt,
    BASE_PAGE_IMPORT: "../../support/base.page",
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
    .replace(/^\(non chiuso.*\)$/, "il tester non ha chiuso questo passo")
    .replace(/^\(intento senza nome\)$/, "passo senza nome")
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
    return `process.env["APP_PASSWORD"] ?? "" /* mai registrata: viene da .env */`;
  }
  return ts(value ?? "");
}

export function emitSteps(
  ctx: EmitContext,
  pagesUsed: PageIdentity[],
  methodsByPage: Map<string, Map<Component, string>>
): GeneratedFile {
  const byKey = new Map(ctx.pages.map((p) => [p.key, p]));

  const imports = pagesUsed
    .map((p) => `import { ${p.className} } from "../../pages/generated/${p.slug}.page";`)
    .join("\n");

  const declarations = pagesUsed
    .map((p) => `let ${variableName(p.className)}: ${p.className};`)
    .join("\n");

  const seenPhrases = new Set<string>();
  const blocks: string[] = [];
  let verifyEmitted = false;
  const initialised = new Set<string>();

  ctx.intents.forEach((intent, i) => {
    const page = byKey.get(intent.page ?? "");
    if (!page) return;

    const variable = variableName(page.className);
    const lines: string[] = [];

    // La Page Object si crea nello step che la introduce, mai in un hook.
    if (!initialised.has(page.key)) {
      initialised.add(page.key);
      lines.push(`${variable} = new ${page.className}(this.page);`);
      if (i === 0) lines.push(`await ${variable}.navigate();`);
      else lines.push(`await ${variable}.assertLoaded();`);
    }

    for (const r of intent.steps) {
      const owner = byKey.get(r.fromPage ?? intent.page ?? "") ?? page;
      const ownerVar = variableName(owner.className);
      const method = methodsByPage.get(owner.key)?.get(r.component);
      if (!method) continue;
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
    if (next && next.key !== page.key) {
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
      blocks.push(
        `/**\n` +
          ` * @intent  ${phrase}\n` +
          ` * @page    ${page.className}\n` +
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

    // IL PASSO DI VERIFICA GENERICO, E PERCHE' E' UNO SOLO.
    //
    // Un passo per elemento verificato produrrebbe uno step nuovo a ogni
    // registrazione: esattamente l'entropia che questo progetto esiste per
    // togliere. Parametrizzato, ne basta uno per tutte le verifiche di
    // presenza, per sempre. E' generico di proposito: l'assistente lo
    // specializza dove l'intento lo merita.
    if (intent.assertions.length > 0 && !verifyEmitted) {
      verifyEmitted = true;
      blocks.push(
        `/**\n` +
          ` * @intent  Verifica che un elemento atteso sia presente sulla pagina.\n` +
          ` * @param   atteso  Il nome accessibile dell'elemento.\n` +
          ` * @wanted\n` +
          ` *\n` +
          ` * Uno solo per tutte le verifiche di presenza: uno per elemento sarebbe\n` +
          ` * uno step nuovo a ogni registrazione.\n` +
          ` */\n` +
          `Then(${ts(VERIFY_STEP)}, async function (this: CustomWorld, atteso: string) {\n` +
          `  await this.page.getByText(atteso, { exact: false }).first().waitFor({ state: "visible" });\n` +
          `});`
      );
    }
  });

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
  ctx.intents.forEach((intent, i) => {
    lines.push(`${keywordOf(i)} ${phraseOf(intent)}`);
    intent.assertions.forEach((a, j) => {
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
