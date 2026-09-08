/**
 * lib/corpus.ts
 * -------------
 * Caricamento del corpus da analizzare: un export di `confluence-fetch.ts`
 * oppure una cartella di file `.feature`.
 *
 * Sta in un posto solo perche' lo usano due strumenti — l'analisi delle
 * metriche e il ciclo del catalogo — e devono vedere ESATTAMENTE lo stesso
 * corpus. Se uno dei due leggesse una pagina in piu' o attribuisse un ramo in
 * modo diverso, i numeri della baseline e quelli della coda di consolidamento
 * non sarebbero confrontabili, e nessuno capirebbe perche'.
 */

import * as fs from "fs";
import * as path from "path";

export interface SourceDoc {
  id: string;
  title: string;
  branch: string;
  text: string;
}

export function str(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

/** Export di `confluence-fetch.ts`: l'oggetto `pages` con testo gia' estratto. */
function loadExport(file: string): { docs: SourceDoc[]; label: string } {
  const json = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
  const pages = (json["pages"] as Array<Record<string, unknown>>) ?? [];
  if (pages.length === 0) {
    throw new Error(
      `Nessuna pagina in ${file}.\n` +
        "  Se il file viene da confluence-fetch, prova a rilanciarlo con --all-pages:\n" +
        "  potrebbe aver scartato tutto perche' nessuna pagina superava la soglia Gherkin."
    );
  }
  const source = (json["source"] ?? {}) as Record<string, unknown>;
  return {
    docs: pages.map((p) => ({
      id: str(p, "id"),
      title: str(p, "title"),
      branch: str(p, "branch") || "(radice)",
      text: str(p, "text"),
    })),
    label: `export Confluence — ${str(source, "target") || file}`,
  };
}

function walkFeatures(dir: string, root: string, out: SourceDoc[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFeatures(full, root, out);
      continue;
    }
    if (!entry.name.endsWith(".feature")) continue;
    const rel = path.relative(root, full).split(path.sep);
    out.push({
      id: path.relative(root, full),
      title: entry.name,
      // Il primo livello di cartella e' l'equivalente del "ramo" di Confluence.
      branch: rel.length > 1 ? rel[0]! : "(radice)",
      text: fs.readFileSync(full, "utf-8"),
    });
  }
}

function loadFeatures(dir: string): { docs: SourceDoc[]; label: string } {
  const docs: SourceDoc[] = [];
  walkFeatures(dir, dir, docs);
  if (docs.length === 0) throw new Error(`Nessun file .feature sotto ${dir}`);
  return { docs, label: `cartella .feature — ${dir}` };
}

export function load(inPath: string): { docs: SourceDoc[]; label: string } {
  if (!fs.existsSync(inPath)) throw new Error(`Percorso inesistente: ${inPath}`);
  return fs.statSync(inPath).isDirectory() ? loadFeatures(inPath) : loadExport(inPath);
}

