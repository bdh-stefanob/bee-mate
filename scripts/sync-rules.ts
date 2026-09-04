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
 * Sorgente   : .amazonq/rules/*.md        Amazon Q Developer — Markdown puro
 * Generata   : .kiro/steering/*.md        Kiro — stesso testo + front-matter YAML
 *
 * La differenza fra i due formati e' solo il front-matter: Kiro lo usa per
 * decidere QUANDO caricare un file (sempre, solo su certi file, a richiesta),
 * Amazon Q carica tutto quello che trova nella cartella.
 *
 * Uso:
 *   npm run rules:sync          rigenera
 *   npm run rules:sync -- --check   verifica soltanto, esce 1 se disallineati
 *                                   (da usare in CI)
 */

import * as fs from "fs";
import * as path from "path";

const SOURCE_DIR = path.join(".amazonq", "rules");
const KIRO_DIR = path.join(".kiro", "steering");

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
const KIRO_INCLUSION: Record<string, string[]> = {
  "product.md": ["inclusion: always"],
  "bdd-authoring.md": ["inclusion: fileMatch", "fileMatchPattern: '**/*.feature'"],
  "automation-layers.md": ["inclusion: fileMatch", "fileMatchPattern: 'src/**/*.ts'"],
  "step-catalog.md": ["inclusion: manual"],
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

  console.log(`\nRegole sincronizzate\n`);
  console.log(`  Sorgente : ${SOURCE_DIR}   (Amazon Q Developer)`);
  console.log(`  Generata : ${KIRO_DIR}   (Kiro)\n`);
  for (const file of files) {
    const how = (KIRO_INCLUSION[file] ?? DEFAULT_INCLUSION)[0]!.replace("inclusion: ", "");
    console.log(`  ${file.padEnd(24)} → Kiro: ${how}`);
  }
  console.log(
    stale.length > 0
      ? `\n  ${stale.length} file aggiornati.\n`
      : `\n  Era gia' tutto allineato.\n`
  );
  console.log(
    `  Per usarle su un altro repository, copia ${SOURCE_DIR} nella sua root.\n` +
      `  Adatta la sezione sull'architettura in automation-layers.md alla struttura\n` +
      `  di quel repository: le altre regole valgono cosi' come sono.\n`
  );
}

main();
