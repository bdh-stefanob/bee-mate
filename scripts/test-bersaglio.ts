/**
 * test-bersaglio.ts
 * -----------------
 * Esegue gli scenari su un bersaglio nominato: `npm run test:bersaglio clinic`.
 *
 * PERCHE' UNO SCRIPT E NON UNA VARIABILE D'AMBIENTE SCRITTA A MANO
 * `BDD_TARGET=clinic npm test` e' sintassi di bash. In PowerShell — la shell della
 * macchina aziendale — quella riga non imposta niente: fallisce con un "comando non
 * riconosciuto". Ogni documento del progetto la suggeriva, cioe' suggeriva un
 * comando che sulla macchina che conta non funziona.
 *
 * Qui il bersaglio e' un argomento nudo, come vuole la lezione sui flag: niente
 * sintassi di shell, niente trattini che npm possa mangiare per strada.
 *
 * Uso:
 *   npm run test:bersaglio clinic             tutti gli scenari su "clinic"
 *   npm run test:bersaglio clinic generati    solo quelli usciti dalla registrazione
 *   npm run test:bersaglio clinic vedi        con il browser visibile
 *   npm run test:bersaglio clinic pulito      senza la sessione salvata
 *   npm run test:bersaglio clinic src/features/generated/x.feature
 *   npm run test:bersaglio https://...        un indirizzo, senza bersaglio nominato
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { loadEnv } from "./lib/atlassian";
import { resolveTarget, hasSession, sessionAgeHours, type Target } from "./lib/targets";
import { argValue } from "./lib/args";

loadEnv();

/**
 * Risolve il bersaglio, e se non esiste lo dice come lo direbbe una persona.
 *
 * `resolveTarget` lancia con un messaggio gia' buono — l'elenco dei bersagli che
 * ci sono. Lasciarlo arrivare in cima come eccezione lo seppellirebbe sotto uno
 * stack trace: il messaggio giusto nel formato sbagliato non lo legge nessuno.
 */
function risolvi(nome: string): Target {
  try {
    return resolveTarget(nome);
  } catch (err) {
    console.error(`\n${(err as Error).message}\n`);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const nome = args[0];

  if (!nome || nome.startsWith("-")) {
    console.error(
      "ERRORE: manca il bersaglio.\n\n" +
        "  npm run test:bersaglio clinic\n" +
        "  npm run targets                 (quali bersagli ci sono)\n"
    );
    process.exit(1);
  }

  // Si risolve qui, prima di lanciare Cucumber: un bersaglio sconosciuto deve
  // fallire subito con l'elenco di quelli che esistono, non con trenta scenari
  // rossi uno dopo l'altro.
  const target = risolvi(nome);
  const indirizzoDiretto = /^https?:\/\//i.test(nome);
  const vedi = args.includes("vedi");

  // "generati": esegue SOLO gli scenari usciti dalla registrazione.
  //
  // Nel repository vivono anche gli scenari scritti a mano, che glue non ne
  // hanno: ogni esecuzione ne stampava ventinove "undefined" e quattrocento
  // righe di suggerimenti, e l'unico scenario che interessava finiva in fondo,
  // illeggibile. Un risultato che non si riesce a leggere e' un risultato che
  // non si guarda.
  const soloGenerati = args.includes("generati");

  // "pulito": browser senza la sessione salvata.
  //
  // Se la registrazione contiene il login, con la sessione si e' gia' dentro e
  // quel passo cerca un pulsante che l'applicazione non mostra piu'. Sono due
  // modi diversi di cominciare, e qui si sceglie quale provare.
  const pulito = args.includes("pulito");

  // "messaggi=<file>": Cucumber scrive l'esito di ogni passo in quel file, in
  // formato messages — una riga JSON per messaggio. E' quello che legge il
  // cruscotto: mai la prosa che Cucumber stampa a schermo.
  const messaggi = argValue(args, "--messaggi");

  const percorsi = soloGenerati
    ? [path.join("src", "features", "generated")]
    : args.slice(1).filter((a) => a !== "vedi" && a !== "pulito" && !a.startsWith("messaggi="));

  const eta = sessionAgeHours(target);
  console.log(`\nTEST — ${indirizzoDiretto ? "indirizzo diretto" : `bersaglio "${target.name}"`}\n`);
  console.log(`  Indirizzo : ${target.url}`);
  if (!indirizzoDiretto) {
    console.log(
      `  Sessione  : ${
        pulito
          ? "ignorata (pulito): si parte da un browser senza login"
          : hasSession(target)
            ? `di ${eta} ore fa`
            : `nessuna — npm run session ${target.name}`
      }`
    );
  }
  console.log(`  Browser   : ${vedi ? "visibile" : "nascosto (aggiungi: vedi)"}\n`);

  const cucumber = path.join("node_modules", "@cucumber", "cucumber", "bin", "cucumber.js");
  if (!fs.existsSync(cucumber)) {
    console.error("ERRORE: Cucumber non e' installato. Lancia: npm install");
    process.exit(1);
  }

  // Un indirizzo diretto va in BASE_URL, non in BDD_TARGET: il World risolverebbe
  // il bersaglio per nome, e "(url diretto)" non e' il nome di niente.
  const ambiente = indirizzoDiretto ? { BASE_URL: nome } : { BDD_TARGET: target.name };

  // I trattini qui vanno bene: non passano da npm, li mette lo script.
  const formato = messaggi ? ["--format", `message:${messaggi}`] : [];

  try {
    execFileSync(process.execPath, [cucumber, ...percorsi, ...formato], {
      stdio: "inherit",
      env: {
        ...process.env,
        ...ambiente,
        ...(vedi ? { HEADED: "1" } : {}),
        ...(pulito ? { BDD_NO_SESSION: "1" } : {}),
      },
    });
  } catch (err) {
    // Cucumber ha gia' stampato cosa e' fallito: qui si propaga solo l'esito,
    // cosi' chi lancia il comando da uno script vede il fallimento.
    process.exit((err as { status?: number }).status ?? 1);
  }
}

main();
