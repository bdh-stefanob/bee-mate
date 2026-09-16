/**
 * sync-rules.ts
 * -------------
 * Le regole per l'assistente AI hanno UNA sorgente — `.amazonq/rules/` — e da
 * quella si genera la versione per gli altri strumenti.
 *
 * Perche' non due copie scritte a mano: strumenti diversi vogliono la stessa
 * regola in cartelle diverse e con sintassi diverse. Due copie divergono, e
 * divergono in silenzio: nessuno se ne accorge finche' un assistente non genera
 * codice secondo una regola che l'altro non ha piu'. E' esattamente il problema
 * di entropia che questo progetto esiste per risolvere, quindi sarebbe curioso
 * riprodurlo qui dentro.
 *
 * REGOLE
 *   Sorgente : .amazonq/rules/*.md        Markdown puro
 *   Generata : .kiro/steering/*.md        stesso testo + front-matter YAML
 *
 * AGENTI
 *   Sorgente : .amazonq/cli-agents/*.json
 *   Generata : .kiro/agents/*.json        stessi vincoli, nomi di strumento diversi
 *
 * Gli agenti contano piu' delle regole, ma meno di quanto credevamo, e la
 * differenza e' stata misurata invece che immaginata (2026-09-16, `kiro-cli`).
 *
 * Dichiarare `"tools": ["fs_read"]` **non toglie la shell**: `execute_cmd`
 * resta disponibile. Cambia l'**approvazione**: cio' che non sta in
 * `allowedTools` richiede un si' umano, e in modalita' non interattiva viene
 * rifiutato ("no user to approve"). Quindi un agente non impedisce: **toglie la
 * fiducia**. Chi lancia con `--trust-all-tools` gliela restituisce tutta, e
 * l'agente di sola lettura crea file.
 *
 * Resta vero che uno steering che dice "proponi, non modificare" e' solo un
 * consiglio, e che un agente con meno strumenti dichiarati chiede permesso piu'
 * spesso. Ma la garanzia va detta per quello che e': chi rivede uno scenario
 * non puo' correggerlo **senza che una persona dica di si'**.
 *
 * Uso:
 *   npm run rules:sync          rigenera regole e agenti
 *   npm run rules:check         verifica soltanto, esce 1 se disallineati
 *                               (da usare in CI)
 */

import * as fs from "fs";
import * as path from "path";
import { hasFlag } from "./lib/args";
import { normalizzaFineRiga, stessoTesto } from "./lib/eol";
import { validaStrumenti } from "./lib/kiro-tools";

const SOURCE_DIR = path.join(".amazonq", "rules");
const KIRO_DIR = path.join(".kiro", "steering");
const AGENTS_SOURCE = path.join(".amazonq", "cli-agents");
const AGENTS_KIRO = path.join(".kiro", "agents");

/**
 * Gli strumenti NON si traducono. Si chiamano allo stesso modo nelle due
 * versioni, e i nomi validi stanno in `lib/kiro-tools.ts` con la storia di cosa
 * e' successo quando li traducevamo: un agente di sola lettura che eseguiva una
 * shell. Il punto in cui una traduzione sbagliata toglie un limite era previsto
 * nel commento che stava qui — ed e' stata la traduzione a toglierlo.
 */

interface QAgent {
  name: string;
  description?: string;
  prompt?: string;
  tools?: string[];
  allowedTools?: string[];
  resources?: string[];
  /** Gli automatismi vivono qui dentro: non esiste una cartella di hook a parte. */
  hooks?: Record<string, unknown>;
}

/**
 * La versione Kiro di un agente.
 *
 * `model` NON viene impostato qui di proposito. Kiro lascia la selezione su
 * "Auto", che sceglie il modello in base al tipo di richiesta: comodo per
 * lavorare, **rovinoso per misurare**. Un confronto fra "con regole" e "senza"
 * fatto con due modelli diversi non misura le regole, e non c'e' modo di
 * accorgersene guardando i risultati. Prima del benchmark il modello va fissato
 * — e va fissato con l'identificativo esatto che la tua versione di Kiro accetta,
 * che non e' una cosa da indovinare qui dentro.
 */
function kiroAgent(q: QAgent, file: string): string {
  const body = {
    name: q.name,
    description: q.description,
    prompt: q.prompt,
    tools: validaStrumenti(q.tools ?? [], file),
    allowedTools: validaStrumenti(q.allowedTools ?? [], file),
    ...(q.hooks ? { hooks: q.hooks } : {}),
    // Le risorse vanno ripuntate sulla copia generata: un agente Kiro che
    // leggesse `.amazonq/rules/` funzionerebbe — quei file esistono — ma
    // caricherebbe la versione SENZA front-matter, cioe' senza le regole di
    // inclusione. Funzionante e sbagliato: il caso peggiore.
    resources: (q.resources ?? []).map((r) => r.replace(".amazonq/rules/", ".kiro/steering/")),
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}

/**
 * Quando Kiro deve caricare ciascuna regola.
 *
 * `always`    — in ogni interazione
 * `fileMatch` — solo lavorando su file che corrispondono al pattern
 * `manual`    — solo se richiamata esplicitamente in chat con #nome-file
 *
 * Amazon Q non ha questa distinzione e carica tutto: le regole sono scritte per
 * restare corrette anche cosi', il pattern e' un'ottimizzazione di contesto, non
 * un requisito di correttezza.
 */
/**
 * IL CRITERIO: il METODO e' sempre attivo, la MECCANICA no.
 *
 * La tentazione e' rendere tutto condizionale per risparmiare contesto. E'
 * sbagliato, e il modo in cui si sbaglia e' silenzioso: la regola piu'
 * importante che abbiamo — "non inventare frasi, cerca prima nel catalogo" —
 * serve **proprio quando** qualcuno chiede "scrivimi uno scenario per il login"
 * senza avere ancora aperto un `.feature`. Legata a `fileMatch: **_/_*.feature`
 * non sarebbe in contesto in quel momento, e l'assistente si comporterebbe
 * esattamente come il problema che stiamo prevenendo.
 *
 * Quindi sempre attivo cio' che serve a decidere COSA scrivere e come si
 * lavora qui (circa 250 righe: il costo di contesto e' modesto), condizionale
 * cio' che serve a scrivere il codice — che senza quei file davanti non serve.
 */
const KIRO_INCLUSION: Record<string, string[]> = {
  // Il metodo: sempre.
  "product.md": ["inclusion: always"],
  "bdd-authoring.md": ["inclusion: always"],
  "step-catalog.md": ["inclusion: always"],
  // Come si lavora sul progetto: sempre. E' il file che orienta un assistente
  // che arriva senza la conversazione che ha costruito tutto il resto — dove sta
  // il piano, dove sta lo stato, cosa non si committa mai.
  "metodo-di-lavoro.md": ["inclusion: always"],
  // La meccanica: solo quando si tocca il codice.
  "automation-layers.md": ["inclusion: fileMatch", "fileMatchPattern: 'src/**/*.ts'"],
  "from-recording.md": ["inclusion: fileMatch", "fileMatchPattern: 'src/**'"],
  // Le trappole gia' pagate sono quasi tutte di codice: servono quando se ne
  // scrive, in scripts/ come in src/.
  "lezioni.md": ["inclusion: fileMatch", "fileMatchPattern: '**/*.ts'"],
};

/** Default per un file nuovo non ancora mappato: meglio caricarlo sempre che mai. */
const DEFAULT_INCLUSION = ["inclusion: always"];

function kiroVersion(fileName: string, body: string): string {
  const lines = KIRO_INCLUSION[fileName] ?? DEFAULT_INCLUSION;
  // La documentazione Kiro e' esplicita: il front-matter deve essere il primo
  // contenuto del file, senza righe vuote prima.
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

function main(): void {
  const check = hasFlag(process.argv.slice(2), "--check");

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`ERRORE: manca la cartella sorgente ${SOURCE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".md")).sort();
  if (files.length === 0) {
    console.error(`ERRORE: nessuna regola in ${SOURCE_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(KIRO_DIR, { recursive: true });

  const stale: string[] = [];
  for (const file of files) {
    // A LF anche il corpo: cosi' il file generato ha fine riga uniformi, e non
    // meta' dal front-matter e meta' da come git ha scritto la sorgente.
    const body = normalizzaFineRiga(fs.readFileSync(path.join(SOURCE_DIR, file), "utf-8"));
    const wanted = kiroVersion(file, body);
    const target = path.join(KIRO_DIR, file);
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf-8") : "";

    // Si confronta il testo, non i fine riga: su Windows git li converte al
    // checkout, e un confronto byte a byte direbbe "rigenera" su un repository
    // appena clonato. Vedi lib/eol.ts.
    if (stessoTesto(current, wanted)) continue;
    stale.push(file);
    if (!check) fs.writeFileSync(target, wanted, "utf-8");
  }

  // ── Agenti ────────────────────────────────────────────────────────────────
  const agentFiles = fs.existsSync(AGENTS_SOURCE)
    ? fs.readdirSync(AGENTS_SOURCE).filter((f) => f.endsWith(".json")).sort()
    : [];

  if (agentFiles.length > 0) fs.mkdirSync(AGENTS_KIRO, { recursive: true });
  for (const file of agentFiles) {
    const q = JSON.parse(fs.readFileSync(path.join(AGENTS_SOURCE, file), "utf-8")) as QAgent;
    const wanted = kiroAgent(q, file);
    const target = path.join(AGENTS_KIRO, file);
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf-8") : "";
    if (stessoTesto(current, wanted)) continue;
    stale.push(`${file} (agente)`);
    if (!check) fs.writeFileSync(target, wanted, "utf-8");
  }

  // Regole cancellate dalla sorgente non devono sopravvivere nella copia generata.
  const orphans = fs
    .readdirSync(KIRO_DIR)
    .filter((f) => f.endsWith(".md") && !files.includes(f));
  for (const o of orphans) {
    stale.push(`${o} (orfano)`);
    if (!check) fs.unlinkSync(path.join(KIRO_DIR, o));
  }

  if (check) {
    if (stale.length === 0) {
      console.log(`Regole allineate: ${files.length} file.`);
      return;
    }
    console.error(
      `Regole DISALLINEATE (${stale.length}):\n` +
        stale.map((f) => `  - ${f}`).join("\n") +
        `\n\nRigenera con: npm run rules:sync`
    );
    process.exit(1);
  }

  console.log(`\nRegole e agenti sincronizzati\n`);
  console.log(`  Regole : ${SOURCE_DIR}  →  ${KIRO_DIR}`);
  if (agentFiles.length > 0) console.log(`  Agenti : ${AGENTS_SOURCE}  →  ${AGENTS_KIRO}`);
  console.log("");

  for (const file of files) {
    const how = (KIRO_INCLUSION[file] ?? DEFAULT_INCLUSION)[0]!.replace("inclusion: ", "");
    console.log(`  ${file.padEnd(24)} → ${how}`);
  }
  for (const file of agentFiles) {
    const q = JSON.parse(fs.readFileSync(path.join(AGENTS_SOURCE, file), "utf-8")) as QAgent;
    const soloLettura = (q.tools ?? []).every((t) => t === "fs_read");
    console.log(`  ${file.padEnd(24)} → ${soloLettura ? "SOLA LETTURA" : "puo' scrivere"}`);
  }

  console.log(
    stale.length > 0 ? `\n  ${stale.length} file aggiornati.` : `\n  Era gia' tutto allineato.`
  );

  // Il promemoria piu' importante di questo comando, e quello che si dimentica
  // per primo perche' non fa male finche' non serve.
  console.log(
    `\n  PRIMA DI MISURARE: FISSA IL MODELLO.\n` +
      `  Kiro sta su "Auto" e sceglie il modello in base al tipo di richiesta.\n` +
      `  Comodo per lavorare, rovinoso per confrontare: due esecuzioni con due\n` +
      `  modelli diversi non misurano le regole — e dai risultati non si vede.\n` +
      `  Fissalo dal selettore in chat, o col campo "model" negli agenti, con\n` +
      `  l'identificativo esatto che la tua versione accetta.\n`
  );
  console.log(
    `  Per usarle su un altro repository, copia ${SOURCE_DIR} nella sua root.\n` +
      `  Adatta la sezione sull'architettura in automation-layers.md alla struttura\n` +
      `  di quel repository: le altre regole valgono cosi' come sono.\n`
  );
}

main();
