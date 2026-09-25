/**
 * rigenera-catalogo.ts
 * ---------------------
 * La stessa pipeline di `npm run catalog` — dry-run di Cucumber su tutta la
 * suite, poi estrazione e proiezione Markdown — ma in un SOLO eseguibile, cosi'
 * la finestra puo' chiamarlo dall'elenco chiuso (`esecuzione.ts`) senza `&&` e
 * senza shell: la stessa regola di ogni altro comando in quell'elenco.
 *
 * PERCHE' UN COMANDO A SE', E NON UN PASSO DENTRO generate.ts
 * `generate.ts` scrive i file di UNA registrazione: e' deterministico, veloce,
 * e il suo successo dipende solo da se stesso. Il dry-run che serve al
 * catalogo compila e ispeziona TUTTA la suite di step: puo' fallire per un
 * motivo che non ha niente a che fare con la registrazione appena generata —
 * un file lasciato da una registrazione precedente, una Page Object
 * sovrascritta. Impastare le due cose renderebbe "npm run generate" (usato
 * anche da un terminale, fuori dalla finestra) lento e fragile per un motivo
 * che chi lo lancia da riga di comando non ha causato. Restano due comandi,
 * ognuno col suo esito.
 *
 * ONESTA' SUL FALLIMENTO
 * Se un passo fallisce, il catalogo NON si tocca: i file precedenti restano
 * quelli di prima. Lo stato scritto in `reports/cruscotto/catalogo-stato.json`
 * lo dice esplicitamente — la schermata Catalogo lo legge e lo mostra, invece
 * di spacciare un numero vecchio per uno fresco.
 *
 * Uso:  npx ts-node scripts/rigenera-catalogo.ts
 */

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const NODE = process.execPath;
const TS_NODE = path.join("node_modules", "ts-node", "dist", "bin.js");
const CUCUMBER = path.join("node_modules", "@cucumber", "cucumber", "bin", "cucumber.js");
const MESSAGGI = path.join("reports", "cruscotto", "catalogo-messages.ndjson");
const STATO = path.join("reports", "cruscotto", "catalogo-stato.json");

export interface StatoCatalogo {
  stato: "in-corso" | "ok" | "fallita";
  avviatoIl: string;
  concluseIl?: string;
  durataMs?: number;
  /** Solo quando stato === "ok": quanti step ha in totale il catalogo appena scritto. */
  totaleStep?: number;
  /** Solo quando stato === "fallita": il motivo, gia' ripulito, per una persona. */
  messaggio?: string;
}

function scriviStato(s: StatoCatalogo): void {
  fs.mkdirSync(path.dirname(STATO), { recursive: true });
  fs.writeFileSync(STATO, JSON.stringify(s, null, 2), "utf-8");
}

/**
 * Un passo della pipeline: lancia l'eseguibile, stampa quello che ha detto
 * (cosi' chi guarda il flusso in diretta lo vede), e si ferma con un errore
 * leggibile se non e' andato a buon fine.
 */
function passo(etichetta: string, eseguibile: string, argomenti: string[]): void {
  console.log(`\n  ${etichetta}`);
  const esito = spawnSync(eseguibile, argomenti, { encoding: "utf-8" });
  if (esito.stdout) process.stdout.write(esito.stdout);
  if (esito.stderr) process.stderr.write(esito.stderr);
  if (esito.error) throw esito.error;
  if (esito.status !== 0) {
    throw new Error(`${etichetta} non riuscito (uscita ${esito.status ?? "?"})`);
  }
}

function main(): void {
  const avviatoIl = new Date().toISOString();
  const inizio = Date.now();
  scriviStato({ stato: "in-corso", avviatoIl });

  console.log("\nRIGENERAZIONE DEL CATALOGO\n");
  fs.mkdirSync(path.dirname(MESSAGGI), { recursive: true });

  try {
    passo("1. Dry-run di Cucumber su tutta la suite...", NODE, [
      CUCUMBER,
      "--dry-run",
      "--format",
      `message:${MESSAGGI}`,
    ]);
    passo("2. Estrazione degli step dal codice...", NODE, [
      TS_NODE,
      path.join("scripts", "extract-steps.ts"),
      MESSAGGI,
    ]);
    passo("3. Proiezione in STEP_CATALOG.md...", NODE, [TS_NODE, path.join("scripts", "render-markdown.ts")]);

    const catalogo = JSON.parse(fs.readFileSync("step-catalog.json", "utf-8")) as { totalSteps?: number };
    scriviStato({
      stato: "ok",
      avviatoIl,
      concluseIl: new Date().toISOString(),
      durataMs: Date.now() - inizio,
      totaleStep: catalogo.totalSteps,
    });
    console.log("\nCatalogo aggiornato.\n");
  } catch (err) {
    scriviStato({
      stato: "fallita",
      avviatoIl,
      concluseIl: new Date().toISOString(),
      durataMs: Date.now() - inizio,
      messaggio: (err as Error).message,
    });
    console.error(`\n${(err as Error).message}\n`);
    console.error("Il catalogo NON e' stato toccato: resta quello di prima.\n");
    process.exit(1);
  }
}

main();
