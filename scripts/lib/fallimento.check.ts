/**
 * fallimento.check.ts
 * -------------------
 * Il dossier di uno scenario fallito deve bastare, da solo, a capire il problema:
 * il passo, l'errore, la pagina com'era. E non deve mai contenere un segreto.
 *
 * Uso:  npm run check:fallimento
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { comandoRilancio, scriviFallimento, senzaSegreti, slugFallimento } from "./fallimento";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const truthy = (w: string, v: unknown, d = "atteso qualcosa di vero"): void => (v ? ok(w) : fail(w, d));

const radice = fs.mkdtempSync(path.join(os.tmpdir(), "fallimento-"));
const quando = new Date("2026-10-02T10:00:00Z");

const dir = scriviFallimento(
  {
    scenario: "a user completes an order",
    feature: "src/features/qa-brochure/ordine.feature",
    passo: "the user check the last notification",
    messaggio: 'locator.click: Timeout 10000ms exceeded.\n  password=Segreta123 Authorization: Bearer abc.def-123',
    url: "https://qa.example/messages",
    titolo: "Messages",
    aria: '- heading "Secure messages"\n- button "Resume order"',
    screenshot: Buffer.from("png"),
    ambiente: "qa-brochure",
    quando,
  },
  radice
);

const md = fs.readFileSync(path.join(dir, "fallimento.md"), "utf8");
truthy("il dossier nomina il passo fallito", md.includes("the user check the last notification"));
truthy("e la pagina com'era", md.includes("https://qa.example/messages") && md.includes("Messages"));
truthy("l'albero di accessibilita' e' un file a parte", fs.readFileSync(path.join(dir, "aria.yml"), "utf8").includes("Resume order"));
truthy("lo screenshot e' salvato", fs.existsSync(path.join(dir, "screenshot.png")));
truthy("il testo dice di correggere nella Page Object, non nello step", md.includes("mai nello step"));
truthy("rilancia solo questo scenario, sullo stesso ambiente", md.includes('npm run test:bersaglio qa-brochure -- --name "^a user completes an order$"'));
truthy("nessuna password nel dossier", !md.includes("Segreta123"), "la password e' finita nel file");
truthy("nessun token nel dossier", !md.includes("abc.def-123"), "il token e' finito nel file");

truthy("senza segreti: una frase normale non cambia", senzaSegreti("Timeout 5000ms") === "Timeout 5000ms");
truthy("lo slug e' un nome di cartella valido", /^[a-z0-9-]+$/.test(slugFallimento({ scenario: "È un Test: «ordine»!", quando })));
truthy("senza ambiente il rilancio usa cucumber-js", comandoRilancio({ scenario: "x" }).startsWith("npx cucumber-js"));

const senzaPagina = scriviFallimento({ scenario: "y", feature: "f.feature", messaggio: "boom", quando }, radice);
truthy(
  "senza pagina leggibile il dossier lo dice, e non si rompe",
  fs.readFileSync(path.join(senzaPagina, "fallimento.md"), "utf8").includes("Non e' stato possibile leggere la pagina")
);

fs.rmSync(radice, { recursive: true, force: true });
if (failures > 0) {
  console.log(`\n${failures} controlli FALLITI`);
  process.exit(1);
}
console.log("\nTutti i controlli OK.");
