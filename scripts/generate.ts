/**
 * generate.ts
 * -----------
 * Da una sessione manuale registrata a uno scenario **che gira**.
 *
 * COSA PRODUCE, E CHI L'HA SCRITTO
 *
 *   src/pages/generated/<pagina>.page.ts     deterministico, dal dizionario
 *   src/steps/generated/<nome>.steps.ts      deterministico, glue a forma fissa
 *   src/features/generated/<nome>.feature    deterministico, parole del tester
 *   reports/generate/<nome>/brief.md         il compito per l'assistente
 *   reports/generate/<nome>/brief-naive.md   il termine di paragone (--no-rules)
 *
 * Nessun modello linguistico ha toccato niente di tutto questo. Il test gira gia'.
 * Le frasi Gherkin sono le etichette che il tester ha scritto mentre eseguiva il
 * test: vere, funzionanti, e non ancora nel vocabolario condiviso. Portarcele e'
 * il lavoro dell'assistente — non farle esistere.
 *
 * IL CONFRONTO, COSTRUITO DENTRO FIN DAL PRIMO GIORNO
 * `no-rules` scrive anche il compito **senza** vincoli: la registrazione
 * grezza e "scrivimi un test". Stesso ingresso, due prompt, e i giudici sono
 * deterministici — compila, gli step sono definiti, le frasi sono nel catalogo.
 * Misurare quanto valgono le regole non costa quasi niente, se l'interruttore
 * c'e' da subito. Aggiunto dopo, non lo si aggiunge mai.
 *
 * Uso:
 *   npm run generate                        l'ultima registrazione
 *   npm run generate reports/recordings/x.json
 *   npm run generate no-rules               scrive anche il compito senza vincoli
 *   npm run generate dry                    non scrive niente, dice cosa farebbe
 *
 * Opzioni, in forma nuda (valgono anche con i trattini: vedi lib/args.ts):
 *   out=DIR        radice del codice (default: src)
 *   name=NOME      nome corto per i file generati (default: dalla registrazione)
 *   dry            prova a vuoto
 *   no-rules       produce anche brief-naive.md, per il confronto
 *   scout=DIR      dizionari da usare (default: reports/scout)
 *   catalog=F      catalogo da usare (default: step-catalog.json)
 *   manifest=F     scrive l'elenco di cio' che ha prodotto, in JSON. Serve ai
 *                  controlli e servira' all'interfaccia: sapere cosa e' stato
 *                  generato non deve richiedere di leggere l'output a schermo
 */

import * as fs from "fs";
import * as path from "path";
import {
  indexDictionaries, resolveRecording, componentsForPage, type PageIdentity,
} from "./lib/generate-core";
import { emitPageObject, emitSteps, emitFeature, type EmitContext } from "./lib/generate-emit";
import { isRegenerable } from "./lib/render-template";
import { toComponent } from "./lib/component-naming";
import { writeBrief, writeNaiveBrief } from "./lib/generate-brief";
import type {
  CatalogStep, Component, GeneratedFile, Recording, ScoutResult,
} from "./lib/generation-contract";
import { argValue, hasFlag, positionals } from "./lib/args";

const RECORDINGS = path.join("reports", "recordings");
const DEFAULT_SCOUT = path.join("reports", "scout");
const DEFAULT_CATALOG = "step-catalog.json";

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

/** L'ultima registrazione, che nel 90% dei casi e' quella che si vuole. */
function latestRecording(): string {
  if (!fs.existsSync(RECORDINGS)) {
    throw new Error(
      `Nessuna registrazione: ${RECORDINGS} non esiste.\n` +
        `  Registrane una con:  npm run record -- <bersaglio>`
    );
  }
  const files = fs
    .readdirSync(RECORDINGS)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ f, at: fs.statSync(path.join(RECORDINGS, f)).mtimeMs }))
    .sort((a, b) => b.at - a.at);
  if (files.length === 0) throw new Error(`Nessuna registrazione in ${RECORDINGS}`);
  return path.join(RECORDINGS, files[0]!.f);
}

function loadDictionaries(dir: string): { dicts: ScoutResult[]; paths: string[] } {
  if (!fs.existsSync(dir)) return { dicts: [], paths: [] };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  return {
    dicts: files.map((f) => readJson<ScoutResult>(path.join(dir, f))),
    paths: files.map((f) => path.join(dir, f)),
  };
}

function loadCatalog(file: string): CatalogStep[] {
  if (!fs.existsSync(file)) return [];
  const json = readJson<{ steps?: CatalogStep[] }>(file);
  return json.steps ?? [];
}

/** Nome corto: dal file della registrazione, senza data e senza estensione. */
function slugOf(recordingPath: string): string {
  return path
    .basename(recordingPath, ".json")
    .replace(/-\d{4}-\d{2}-\d{2}T[\d-]+Z?$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "registrazione";
}

/**
 * Scrive un file solo se e' suo.
 *
 * Un file senza il marcatore e' stato adottato da qualcuno: la generazione lo
 * salta invece di cancellargli il lavoro. Stessa regola del publisher
 * Confluence, e per lo stesso motivo — l'errore banale e irreversibile e' quello
 * che chiude un'iniziativa, non i difetti interessanti.
 */
function writeFile(file: GeneratedFile, dry: boolean): "scritto" | "saltato" | "previsto" {
  if (!isRegenerable(file.path)) return "saltato";
  if (dry) return "previsto";
  fs.mkdirSync(path.dirname(file.path), { recursive: true });
  fs.writeFileSync(file.path, file.contents, "utf-8");
  return "scritto";
}

/**
 * I metodi che il file gia' sul disco espone e il nuovo non esporrebbe piu'.
 *
 * Succede quando due registrazioni toccano la stessa pagina: la seconda ne usa
 * meno componenti, e rigenerando la Page Object si accorcia. Il codice che
 * chiamava i metodi spariti smette di compilare — il che va benissimo, purche'
 * si sappia perche'. Senza questo avviso sembrerebbe un guasto.
 */
function methodsLost(file: GeneratedFile): string[] {
  if (!fs.existsSync(file.path)) return [];
  const names = (text: string): Set<string> =>
    new Set([...text.matchAll(/^\s{2}async ([a-zA-Z0-9_]+)\(/gm)].map((m) => m[1]!));
  const before = names(fs.readFileSync(file.path, "utf-8"));
  const after = names(file.contents);
  return [...before].filter((m) => !after.has(m));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dry = hasFlag(args, "--dry");
  const alsoNaive = hasFlag(args, "--no-rules");
  const outRoot = argValue(args, "--out") ?? "src";

  // Il primo .json fra i posizionali. Senza escludere le opzioni in forma nuda,
  // `catalog=altro.json` verrebbe preso per la registrazione.
  const given = positionals(args, ["dry", "no-rules"]).find((a) => a.endsWith(".json"));
  const recordingPath = given ?? latestRecording();
  if (!fs.existsSync(recordingPath)) {
    throw new Error(`Registrazione inesistente: ${recordingPath}`);
  }

  const recording = readJson<Recording>(recordingPath);
  // --scout e --catalog esistono per i controlli e per il confronto: la stessa
  // generazione, ripetuta con ingressi fissi, deve dare lo stesso risultato.
  const { dicts, paths: dictPaths } = loadDictionaries(argValue(args, "--scout") ?? DEFAULT_SCOUT);
  const catalog = loadCatalog(argValue(args, "--catalog") ?? DEFAULT_CATALOG);
  const slug = argValue(args, "--name") ?? slugOf(recordingPath);

  console.log(`\nGENERAZIONE — ${slug}\n`);
  console.log(`  Registrazione : ${recordingPath}`);
  console.log(`                  ${recording.intents.length} intenti, ${recording.summary.steps} gesti, ` +
    `${recording.summary.assertions} verifiche, ${recording.durationSeconds}s`);
  console.log(`  Dizionari     : ${dicts.length} (${dictPaths.map((p) => path.basename(p)).join(", ") || "nessuno"})`);
  console.log(`  Catalogo      : ${catalog.length} step\n`);

  const index = indexDictionaries(dicts);
  const { intents, gaps, pages } = resolveRecording(recording, index, { catalog });

  const ctx: EmitContext = {
    intents,
    pages,
    recordingPath,
    dictionaryPaths: dictPaths,
    recordedAt: recording.recordedAt,
    durationSeconds: recording.durationSeconds,
    generatedAt: new Date().toISOString(),
    slug,
    outRoot,
  };

  // ── Page Object, una per pagina toccata ─────────────────────────────────
  const asComponent = (a: { role: string; name: string }): Component =>
    toComponent({ role: a.role, name: a.name }, 1);

  const files: GeneratedFile[] = [];
  const methodsByPage = new Map<string, Map<Component, string>>();
  const pagesUsed: PageIdentity[] = [];

  for (const page of pages) {
    const components = componentsForPage(intents, page.key, asComponent);
    if (components.length === 0) continue;
    const assertions = intents.filter((i) => i.page === page.key).flatMap((i) => i.assertions);
    const { file, methods } = emitPageObject(page, components, assertions, ctx);
    files.push(file);
    methodsByPage.set(page.key, methods);
    pagesUsed.push(page);
  }

  files.push(emitSteps(ctx, pagesUsed, methodsByPage));
  files.push(emitFeature(ctx, `${slug.replace(/-/g, " ")} — sessione registrata`));

  // Due file con lo stesso percorso: il secondo cancellerebbe il primo senza
  // dirlo. E' successo con la prima registrazione vera, e il sintomo — metodi
  // mancanti, dichiarazioni doppie — non assomigliava alla causa. I nomi delle
  // pagine ora sono univoci per costruzione; questa e' la rete se un giorno non
  // lo fossero piu'.
  const percorsi = files.map((f) => f.path);
  const doppi = [...new Set(percorsi.filter((p, i) => percorsi.indexOf(p) !== i))];
  if (doppi.length > 0) {
    throw new Error(
      `Due file generati con lo stesso percorso: ${doppi.join(", ")}\n` +
        `  Il secondo sovrascriverebbe il primo. E' un difetto del generatore\n` +
        `  (nomi delle pagine), non della registrazione: non scrivo niente.`
    );
  }

  // ── Scrittura ───────────────────────────────────────────────────────────
  console.log(`  FILE\n`);
  const skipped: string[] = [];
  for (const f of files) {
    const lost = methodsLost(f);
    const outcome = writeFile(f, dry);
    if (outcome === "saltato") skipped.push(f.path);
    const mark = outcome === "scritto" ? "+" : outcome === "previsto" ? "?" : "!";
    console.log(`   ${mark} ${f.path}`);
    if (lost.length > 0) {
      console.log(`       ATTENZIONE: sparirebbero ${lost.length} metodi: ${lost.join(", ")}`);
      console.log(`       Un'altra registrazione li aveva prodotti. Rigenera anche da quella.`);
    }
  }

  if (skipped.length > 0) {
    console.log(
      `\n  ${skipped.length} file SALTATI: non portano il marcatore, quindi li ha adottati\n` +
        `  qualcuno. La generazione non ci scrive sopra.`
    );
  }

  // ── Il compito per l'assistente ─────────────────────────────────────────
  const briefDir = path.join("reports", "generate", slug);
  if (!dry) {
    fs.mkdirSync(briefDir, { recursive: true });
    writeBrief(path.join(briefDir, "brief.md"), ctx, methodsByPage, gaps, files);
    console.log(`\n   + ${path.join(briefDir, "brief.md")}`);
    if (alsoNaive) {
      writeNaiveBrief(path.join(briefDir, "brief-naive.md"), recording, recordingPath);
      console.log(`   + ${path.join(briefDir, "brief-naive.md")}   (termine di paragone)`);
    }
  }

  // ── Cosa non ha saputo fare da solo ─────────────────────────────────────
  if (gaps.length > 0) {
    console.log(`\n  DA GUARDARE — ${gaps.length}\n`);
    const byKind = new Map<string, typeof gaps>();
    for (const g of gaps) byKind.set(g.kind, [...(byKind.get(g.kind) ?? []), g]);
    for (const [kind, list] of byKind) {
      console.log(`   ${kind} (${list.length})`);
      // Le prime tre bastano a far capire il tipo di problema: l'elenco completo
      // sta nel brief, che e' il posto dove si lavora.
      for (const g of list.slice(0, 3)) console.log(`     · ${g.where}: ${g.detail}`);
      if (list.length > 3) console.log(`     · ...e altre ${list.length - 3}, nel brief`);
    }
  }

  // Il manifesto si scrive anche nella prova a vuoto: dice cosa SAREBBE stato
  // prodotto, ed e' cosi' che un controllo puo' salvarsi i file di prima —
  // oppure che un'interfaccia puo' mostrare l'anteprima senza toccare niente.
  const manifest = argValue(args, "--manifest");
  if (manifest) {
    fs.mkdirSync(path.dirname(path.resolve(manifest)), { recursive: true });
    fs.writeFileSync(
      manifest,
      JSON.stringify(
        {
          slug,
          recording: recordingPath,
          generatedAt: ctx.generatedAt,
          dry,
          files: files.map((f) => ({ path: f.path, origin: f.origin, template: f.template })),
          skipped,
          gaps,
        },
        null,
        2
      ),
      "utf-8"
    );
  }

  console.log(`\n  PROSSIMO PASSO\n`);
  if (dry) {
    console.log(`   Prova a vuoto: non e' stato scritto niente. Togli --dry per generare.\n`);
    return;
  }
  console.log(`   1. Il test gira gia' cosi' com'e', senza AI:`);
  console.log(`        npm run test:dry`);
  console.log(`        npx cucumber-js ${ctx.outRoot}/features/generated/${slug}.feature`);
  console.log(`   2. Poi dai ${path.join(briefDir, "brief.md")} all'assistente:`);
  console.log(`      porta le frasi nel vocabolario del catalogo.`);
  console.log(`   3. E verifica il suo lavoro con giudici che non sono pareri:`);
  console.log(`        npx tsc --noEmit -p tsconfig.json && npm run test:dry\n`);
}

main().catch((err) => {
  console.error(`\n${(err as Error).message}\n`);
  process.exit(1);
});
