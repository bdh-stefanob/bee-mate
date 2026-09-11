/**
 * args.check.ts
 * -------------
 * Controlli sulla lettura delle opzioni, e sui comandi che il repository suggerisce.
 *
 * Perche' conta: un'opzione persa non da' errore, da' un'esecuzione diversa.
 *
 * La seconda parte viene dalla prima prova di Kiro. La regola "mai un'opzione
 * con i trattini dopo `npm run x --`" c'era, scritta nelle lezioni. Una trentina
 * di esempi, nei documenti e nei messaggi degli script, la contraddicevano — e
 * l'assistente ha seguito gli esempi. Una regola smentita dagli esempi perde:
 * quindi gli esempi li controlla una macchina, non la buona volonta'.
 *
 * Uso:  npm run check:args
 */

import * as fs from "fs";
import * as path from "path";
import { argValue, hasFlag, positionals } from "./args";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);

console.log("\n--- opzioni ---\n");

eq("forma nuda chiave=valore", argValue(["label=con-regole"], "--label"), "con-regole");
eq("forma --chiave valore", argValue(["--label", "x"], "--label"), "x");
eq("forma --chiave=valore", argValue(["--label=x"], "--label"), "x");
eq("un indirizzo con ?label= non e' l'opzione", argValue(["https://a.invalid/p?label=x"], "--label"), undefined);
eq("mylabel= non e' label=", argValue(["mylabel=x"], "--label"), undefined);
eq("il valore puo' contenere un uguale", argValue(["cql=space = QA"], "--cql"), "space = QA");
eq("interruttore nudo", hasFlag(["confronta"], "--confronta"), true);
eq("interruttore con i trattini", hasFlag(["--confronta"], "--confronta"), true);
eq("una parola simile non e' l'interruttore", hasFlag(["confrontare"], "--confronta"), false);

console.log("\n--- posizionali ---\n");

eq(
  "il bersaglio, fra opzioni e interruttori",
  positionals(["clinic", "env", "out=x.json", "--dry"], ["env"]),
  ["clinic"]
);
eq("un indirizzo con query resta posizionale", positionals(["https://a.invalid/p?q=1"]), ["https://a.invalid/p?q=1"]);
eq("un percorso Windows resta posizionale", positionals(["C:\\dati\\x.json"]), ["C:\\dati\\x.json"]);
{
  // Il caso di generate.ts: il primo .json posizionale e' la registrazione.
  // Se le forme nude non fossero escluse, catalog=... verrebbe preso per lei.
  const args = ["catalog=altro.json", "reports/recordings/r.json"];
  eq(
    "generate: la registrazione, non il catalogo",
    positionals(args).find((a) => a.endsWith(".json")),
    "reports/recordings/r.json"
  );
}

console.log("\n--- una copia sola ---\n");

function files(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true, encoding: "utf-8" })
    .filter((f) => f.endsWith(ext) && !f.split(path.sep).includes("node_modules"))
    .map((f) => path.join(dir, f));
}

{
  const copie = files("scripts", ".ts")
    .filter((f) => path.basename(f) !== "args.ts")
    .filter((f) => /function argValue\(/.test(fs.readFileSync(f, "utf-8")));
  eq("nessuno script ha una sua lettura delle opzioni", copie, []);
}

console.log("\n--- i comandi che il repository suggerisce ---\n");

{
  // La forma che si perde: un'opzione con i trattini dopo `npm run x --`.
  // `.planning/` resta fuori: e' storia, non istruzioni.
  const TRAPPOLA = /npm run [\w:]+ -- (?:\S+ )*--\w/;
  const dove = [
    ...files("docs", ".md"),
    ...files("scripts", ".ts"),
    ...files("scripts", ".md"),
    ...files(".amazonq", ".md"),
    ...files(".amazonq", ".json"),
    ...files(path.join(".kiro", "specs"), ".md"),
    ...files("referti", ".md"),
    ...["README.md", "CONTRIBUTING.md", "ROADMAP.md", "CLAUDE.md"].filter((f) => fs.existsSync(f)),
  ];
  const trovati: string[] = [];
  for (const f of dove) {
    fs.readFileSync(f, "utf-8")
      .split("\n")
      .forEach((riga, i) => {
        if (TRAPPOLA.test(riga)) trovati.push(`${f}:${i + 1}`);
      });
  }
  eq("nessun comando suggerito nella forma che si perde", trovati, []);
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
