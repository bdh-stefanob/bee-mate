/**
 * kiro-tools.check.ts
 * -------------------
 * Controlli sui nomi degli strumenti di un agente.
 *
 * Il secondo caso e' l'incidente vero: `read` era il nome che generavamo noi, e
 * l'agente "di sola lettura" ha potuto eseguire una shell. Un nome sbagliato
 * non deve piu' poter uscire da qui.
 *
 * Uso:  npm run check:kiro-tools
 */

import * as fs from "fs";
import * as path from "path";
import { KIRO_TOOLS, validaStrumenti } from "./kiro-tools";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);
const lancia = (w: string, f: () => unknown): void => {
  try {
    f();
    fail(w, "non ha lanciato: il nome sbagliato sarebbe arrivato all'engine");
  } catch {
    ok(w);
  }
};

console.log("\n--- nomi degli strumenti ---\n");

eq("i nomi veri passano invariati", validaStrumenti(["fs_read", "grep"], "prova"), ["fs_read", "grep"]);
lancia('"read" — il nome che generavamo noi — non passa', () => validaStrumenti(["read"], "prova"));
lancia('"shell" non passa', () => validaStrumenti(["shell"], "prova"));
lancia("un refuso non passa", () => validaStrumenti(["fs_reed"], "prova"));
eq("nessuno strumento e' un caso valido", validaStrumenti([], "prova"), []);

console.log("\n--- agenti generati ---\n");

{
  // Il controllo che conta davvero: cosa c'e' scritto nei file che l'engine legge.
  const dir = path.join(".kiro", "agents");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
  eq("ci sono agenti generati da controllare", files.length > 0, true);

  const fuoriLista: string[] = [];
  const soloLettura: string[] = [];
  for (const f of files) {
    const a = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as {
      description?: string;
      tools?: string[];
    };
    for (const t of a.tools ?? []) if (!KIRO_TOOLS.includes(t)) fuoriLista.push(`${f}: ${t}`);
    // Un agente che si descrive "sola lettura" non puo' avere la shell: con
    // `execute_bash` si scrive un file in una riga, e la descrizione mente.
    const dichiaraSolaLettura = /sola lettura/i.test(a.description ?? "");
    const puoScrivere = (a.tools ?? []).some((t) => t === "fs_write" || t === "execute_bash");
    if (dichiaraSolaLettura && puoScrivere) soloLettura.push(f);
  }
  eq("nessuno strumento fuori dalla lista nei file generati", fuoriLista, []);
  eq("chi si dichiara di sola lettura non ha scrittura ne' shell", soloLettura, []);
}

console.log(failures === 0 ? "\nTutti i controlli passano.\n" : `\n${failures} controlli falliti.\n`);
process.exit(failures === 0 ? 0 : 1);
