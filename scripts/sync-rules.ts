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
 * Gli agenti contano piu' delle regole, e per una ragione che non si vede
 * subito: una regola **orienta**, un agente **impedisce**. `bdd-authoring`
 * dichiara i soli strumenti di lettura, quindi non puo' modificare un file
 * nemmeno volendo. Uno steering che dice "proponi, non modificare" e' un
 * consiglio; `"tools": ["read"]` e' un limite. Chi rivede uno scenario non deve
 * poterlo correggere da solo: quella decisione e' di una persona.
 *
 * Uso:
 *   npm run rules:sync          rigenera regole e agenti
 *   npm run rules:sync -- --check   verifica soltanto, esce 1 se disallineati
 *                                   (da usare in CI)
 */

import * as fs from "fs";
import * as path from "path";

const SOURCE_DIR = path.join(".amazonq", "rules");
const KIRO_DIR = path.join(".kiro", "steering");
const AGENTS_SOURCE = path.join(".amazonq", "cli-agents");
const AGENTS_KIRO = path.join(".kiro", "agents");

/**
 * Gli stessi permessi, detti nei due dialetti.
 *
 * Non e' una tabella di comodo: e' il punto in cui una traduzione sbagliata
 * darebbe a un agente di sola lettura il permesso di scrivere, senza che niente
 * lo segnali. Per questo la mappa e' esplicita e cio' che non conosce fa
 * fallire, invece di passare inalterato.
 */
const TOOL_MAP: Record<string, string> = {
  fs_read: "read",
  fs_write: "write",
  execute_bash: "shell",
};

interface QAgent {
  name: string;
  description?: string;
  prompt?: string;
  tools?: string[];
  allowedTools?: string[];
  resources?: string[];
}

function traduciStrumenti(tools: readonly string[], dove: string): string[] {
  return tools.map((t) => {
    const k = TOOL_MAP[t];
    if (!k) {
      throw new Error(
        `${dove}: strumento sconosciuto "${t}".\n` +
          `  Aggiungilo a TOOL_MAP in scripts/sync-rules.ts.\n` +
          `  Non lo lascio passare inalterato: un nome che Kiro non riconosce\n` +
          `  verrebbe ignorato, e un agente di sola lettura potrebbe ritrovarsi\n` +
          `  senza il limite che lo definisce.`
      );
    }
    return k;
  });
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
    tools: traduciStrumenti(q.tools ?? [], file),
    allowedTools: traduciStrumenti(q.allowedTools ?? [], file),
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
 * Quindi sempre attivo cio' che serve a decidere COSA scrivere (165 righe in
 * tutto: il costo di contesto e' modesto), condizionale cio' che serve a
 * scrivere il codice — che senza quei file davanti non serve a niente.
 */
const KIRO_INCLUSION: Record<string, string[]> = {
  // Il metodo: sempre.
  "product.md": ["inclusion: always"],
  "bdd-authoring.md": ["inclusion: always"],
  "step-catalog.md": ["inclusion: always"],
  // La meccanica: solo quando si tocca il codice.
  "automation-layers.md": ["inclusion: fileMatch", "fileMatchPattern: 'src/**/*.ts'"],
  "from-recording.md": ["inclusion: fileMatch", "fileMatchPattern: 'src/**'"],
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
  const check = process.argv.includes("--check");

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
    const body = fs.readFileSync(path.join(SOURCE_DIR, file), "utf-8");
    const wanted = kiroVersion(file, body);
    const target = path.join(KIRO_DIR, file);
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf-8") : "";

    if (current === wanted) continue;
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
    if (current === wanted) continue;
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
