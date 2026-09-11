/**
 * targets.ts
 * ----------
 * Che ambienti sono configurati, cosa manca per usarli, e cosa scrivere in `.env`.
 *
 * PERCHE' ESISTE
 * Portare questo progetto su un'altra macchina significa configurare tre cose in
 * tre posti diversi: gli indirizzi in `bdd-targets.json`, le credenziali in
 * `.env`, la sessione salvata sotto `reports/sessions/`. Tutti e tre gitignorati,
 * quindi su una macchina nuova non ce n'e' nessuno.
 *
 * Quando ne manca uno, il sintomo non assomiglia alla causa. Una variabile non
 * definita si espande nella stringa vuota: il login compila il campo con niente,
 * l'applicazione risponde "credenziali errate", e si va a cercare nel posto
 * sbagliato. Questo comando risponde alla domanda giusta — **cosa mi manca?** —
 * prima che diventi mezz'ora persa.
 *
 * NON STAMPA MAI UN VALORE. Solo nomi di variabile, e se sono definite o no.
 * Un comando diagnostico che stampa segreti finisce prima o poi incollato in una
 * chat o in un ticket.
 *
 * Uso:
 *   npm run targets              tutti i bersagli, con cosa manca a ciascuno
 *   npm run targets clinic       solo quello, con i comandi pronti
 *   npm run targets env          il blocco da incollare in .env
 */

import * as fs from "fs";
import * as path from "path";
import { loadEnv } from "./lib/atlassian";
import {
  loadTargets, requiredVars, missingVars, hasSession, sessionAgeHours, type Target,
} from "./lib/targets";
import { hasFlag, positionals } from "./lib/args";

loadEnv();

const CONFIG = "bdd-targets.json";
const EXAMPLE = "bdd-targets.example.json";

/** Una sessione piu' vecchia di questo di solito e' scaduta senza dirlo. */
const SESSIONE_VECCHIA_ORE = 12;

function reportTarget(t: Target, dettaglio: boolean): boolean {
  const mancanti = missingVars(t.name);
  const servono = requiredVars().get(t.name) ?? [];
  const eta = sessionAgeHours(t);
  const pronto = mancanti.length === 0 && Boolean(t.url);

  console.log(`  ${pronto ? "OK " : "!! "} ${t.name}`);
  console.log(`       indirizzo : ${t.url || "(non risolto — manca una variabile)"}`);

  if (servono.length > 0) {
    const stato = servono.map((v) => `${v}${process.env[v] ? "" : "  MANCA"}`);
    console.log(`       variabili : ${stato.join(", ")}`);
  }

  console.log(
    `       login     : ${
      t.login ? `automatico, ${t.login.steps.length} passi (con ritorno a mano)` : "a mano"
    }`
  );

  if (!hasSession(t)) {
    console.log(`       sessione  : nessuna — serve  npm run session -- ${t.name}`);
  } else if (eta !== null && eta > SESSIONE_VECCHIA_ORE) {
    console.log(`       sessione  : di ${eta} ore fa. Probabilmente scaduta: rifalla`);
  } else {
    console.log(`       sessione  : di ${eta} ore fa`);
  }

  if (t.hint) console.log(`       nota      : ${t.hint}`);

  if (dettaglio) {
    console.log(`\n       Per usarlo:\n`);
    if (mancanti.length > 0) {
      console.log(`         1. metti in .env:  ${mancanti.map((v) => `${v}=...`).join("  ")}`);
    }
    console.log(`         ${mancanti.length > 0 ? "2" : "1"}. npm run session  -- ${t.name}     login una volta sola`);
    console.log(`         ${mancanti.length > 0 ? "3" : "2"}. npm run scout    -- ${t.name}     dizionario dei componenti`);
    console.log(`         ${mancanti.length > 0 ? "4" : "3"}. npm run record   -- ${t.name}     esegui il test a mano`);
    console.log(`         ${mancanti.length > 0 ? "5" : "4"}. npm run generate`);
    console.log(`         ${mancanti.length > 0 ? "6" : "5"}. npm run test:bersaglio ${t.name}`);
  }

  console.log("");
  return pronto;
}

function main(): void {
  const args = process.argv.slice(2);
  const soloEnv = hasFlag(args, "--env");
  const quale = positionals(args, ["env"])[0];

  if (!fs.existsSync(CONFIG)) {
    console.log(
      `\nNessun ${CONFIG}.\n\n` +
        `  Copialo dall'esempio e mettici i tuoi ambienti:\n\n` +
        `    cp ${EXAMPLE} ${CONFIG}\n\n` +
        `  ${CONFIG} e' gitignorato: indirizzi e selettori aziendali non finiscono\n` +
        `  nel repository. Le credenziali non vanno nemmeno li': si scrivono come\n` +
        `  \${VARIABILE} e si risolvono da .env.\n`
    );
    process.exit(1);
  }

  const targets = loadTargets();

  // Il blocco da incollare in .env: e' la cosa che serve per prima su una
  // macchina nuova, e cercarla dentro a un JSON e' esattamente l'attrito che
  // decide se lo strumento viene usato o no.
  if (soloEnv) {
    const tutte = new Set<string>();
    for (const vars of requiredVars().values()) for (const v of vars) tutte.add(v);
    console.log(`\n# Variabili attese da ${CONFIG}. I valori mettili tu.`);
    console.log(`# .env e' gitignorato: le credenziali non escono da questa macchina.\n`);
    for (const v of [...tutte].sort()) {
      console.log(`${v}=${process.env[v] ? "   # gia' definita" : ""}`);
    }
    console.log(`\n# Serve anche alla password dei test generati, se ne usano:`);
    console.log(`APP_PASSWORD=`);
    console.log(`\n# Alternativa a BDD_TARGET, per puntare un indirizzo senza nominarlo:`);
    console.log(`# BASE_URL=https://...\n`);
    return;
  }

  const daMostrare = quale ? targets.filter((t) => t.name === quale) : targets;

  if (quale && daMostrare.length === 0) {
    console.error(
      `\nBersaglio sconosciuto: "${quale}"\n\n` +
        `  Disponibili: ${targets.map((t) => t.name).join(", ") || "nessuno"}\n`
    );
    process.exit(1);
  }

  console.log(`\nBERSAGLI — ${CONFIG}\n`);
  const pronti = daMostrare.map((t) => reportTarget(t, Boolean(quale) || daMostrare.length === 1));

  if (!quale) {
    const ok = pronti.filter(Boolean).length;
    console.log(`  ${ok} su ${pronti.length} pronti all'uso.\n`);
    if (ok < pronti.length) {
      console.log(`  Per il blocco da incollare in .env:  npm run targets env`);
      console.log(`  Per i comandi di un bersaglio:       npm run targets <nome>\n`);
    }
  }

  // Un promemoria che vale la pena ripetere: i file di sessione equivalgono a
  // credenziali, e vivono sotto reports/, che e' gitignorato.
  const conSessione = daMostrare.filter(hasSession);
  if (conSessione.length > 0) {
    console.log(
      `  Le ${conSessione.length} sessioni salvate stanno in ${path.join("reports", "sessions")} ` +
        `ed equivalgono\n  a credenziali: non si condividono e non si copiano su altre macchine.\n`
    );
  }
}

main();
