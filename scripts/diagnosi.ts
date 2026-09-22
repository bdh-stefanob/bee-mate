/**
 * diagnosi.ts
 * -----------
 * **Questa macchina e' pronta?** Un comando, e in fondo la prossima cosa da fare.
 *
 * PERCHE' UN COMANDO SOLO
 * Far girare questa catena richiede sei cose in sei posti: i browser di
 * Playwright, l'assistente, gli indirizzi, le credenziali, le sessioni, il
 * catalogo. Quando ne manca una, il sintomo non assomiglia mai alla causa —
 * un browser non scaricato dice "Executable doesn't exist", una variabile non
 * definita fa rispondere "credenziali errate", una sessione scaduta rimanda al
 * login a meta' registrazione. Ogni volta si perde mezz'ora a cercare nel posto
 * sbagliato.
 *
 * Sono tutti controlli che si potevano gia' fare a mano. Il valore non e' in
 * nessuno di essi: e' nell'averli in ordine, e nel finire con **una** riga da
 * eseguire invece che con un elenco di cose da valutare.
 *
 * NON STAMPA MAI UN VALORE. Nomi di variabile, si' o no. Un comando diagnostico
 * che stampa segreti finisce prima o poi incollato in un ticket.
 *
 * Uso:  npm run diagnosi
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";
import { loadEnv } from "./lib/atlassian";
import { loadTargets, requiredVars, hasSession, sessionAgeHours } from "./lib/targets";
import { hasFlag } from "./lib/args";

loadEnv();

type Esito = "ok" | "avviso" | "manca";

/**
 * Il nome chiuso del rimedio, quando corrisponde a uno dei comandi che la
 * schermata di controllo puo' avviare da sola (vedi web-ui/src/lib/esecuzione.ts).
 * Senza corrispondenza il rimedio resta solo testo per l'uscita a persone.
 */
type RimedioChiuso = 'installa-browser' | 'sincronizza-regole' | 'sessione' | 'scansione' | 'registrazione';

interface Voce {
  esito: Esito;
  titolo: string;
  dettaglio: string[];
  /** Il comando che risolve. Vuoto se non c'e' niente da risolvere. */
  rimedio?: string;
  /** Lo stesso rimedio, come nome chiuso, se la macchina puo' avviarlo da sola. */
  rimedioChiuso?: RimedioChiuso;
}

const voci: Voce[] = [];
const SEGNO: Record<Esito, string> = { ok: "OK ", avviso: "~~ ", manca: "!! " };

function aggiungi(v: Voce): void {
  voci.push(v);
}

/** Il comando esiste sul PATH? Su Windows serve `where`, altrove `which`. */
function sulPath(comando: string): boolean {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [comando], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 1. I browser
// ---------------------------------------------------------------------------

{
  let percorso = "";
  try {
    percorso = chromium.executablePath();
  } catch {
    /* Playwright non sa nemmeno dove cercarlo */
  }
  const scaricato = Boolean(percorso) && fs.existsSync(percorso);

  aggiungi(
    scaricato
      ? { esito: "ok", titolo: "Browser di Playwright", dettaglio: ["scaricato"] }
      : {
          esito: "avviso",
          titolo: "Browser di Playwright",
          dettaglio: [
            "non scaricato — `npm install` installa il pacchetto, non i binari",
            "si ripiega da solo su Chrome o Edge di sistema, se ci sono",
          ],
          rimedio: "npx playwright install chromium",
          rimedioChiuso: "installa-browser",
        }
  );
}

// ---------------------------------------------------------------------------
// 2. L'assistente
// ---------------------------------------------------------------------------

{
  const trovati = ["kiro-cli", "kiro", "q"].filter(sulPath);
  aggiungi(
    trovati.length > 0
      ? {
          esito: "ok",
          titolo: "Assistente da riga di comando",
          dettaglio: [
            `sul PATH: ${trovati.join(", ")}`,
            "serve solo a rendere il confronto ripetibile da script: l'IDE basta",
          ],
        }
      : {
          esito: "avviso",
          titolo: "Assistente da riga di comando",
          dettaglio: [
            "nessuno sul PATH — non e' un problema",
            "la misura legge file e li giudica con tsc e il dry-run: gli stessi",
            "file danno gli stessi numeri, che ci arrivi uno script o una persona",
          ],
        }
  );

  const agenti = fs.existsSync(path.join(".kiro", "agents"))
    ? fs.readdirSync(path.join(".kiro", "agents")).filter((f) => f.endsWith(".json"))
    : [];
  const hook = fs.existsSync(path.join(".kiro", "hooks"))
    ? fs.readdirSync(path.join(".kiro", "hooks")).filter((f) => f.endsWith(".json"))
    : [];
  aggiungi(
    agenti.length > 0
      ? {
          esito: "ok",
          titolo: "Agenti e automatismi",
          dettaglio: [
            `${agenti.length} agenti, ${hook.length} file di hook`,
            "che l'IDE li riconosca va guardato nei suoi pannelli: da qui non si vede",
          ],
        }
      : {
          esito: "manca",
          titolo: "Agenti e automatismi",
          dettaglio: ["non generati"],
          rimedio: "npm run rules:sync",
          rimedioChiuso: "sincronizza-regole",
        }
  );
}

// ---------------------------------------------------------------------------
// 3. Gli ambienti
// ---------------------------------------------------------------------------

{
  const targets = loadTargets();
  if (targets.length === 0) {
    aggiungi({
      esito: "manca",
      titolo: "Ambienti",
      dettaglio: ["nessun bdd-targets.json — si puo' anche passare un URL diretto"],
      rimedio: "cp bdd-targets.example.json bdd-targets.json",
    });
  } else {
    const attese = requiredVars();
    const pronti = targets.filter(
      (t) => t.url && (attese.get(t.name) ?? []).every((v) => process.env[v])
    );
    const conSessione = targets.filter(hasSession);
    const vecchie = conSessione.filter((t) => (sessionAgeHours(t) ?? 0) > 12);

    aggiungi({
      esito: pronti.length === targets.length ? "ok" : "avviso",
      titolo: "Ambienti",
      dettaglio: [
        `${pronti.length} su ${targets.length} configurati per intero`,
        `${conSessione.length} con sessione salvata` +
          (vecchie.length > 0 ? `, di cui ${vecchie.length} piu' vecchie di 12 ore` : ""),
      ],
      ...(pronti.length < targets.length ? { rimedio: "npm run targets" } : {}),
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Il materiale su cui si genera
// ---------------------------------------------------------------------------

{
  const dizionari = fs.existsSync(path.join("reports", "scout"))
    ? fs.readdirSync(path.join("reports", "scout")).filter((f) => f.endsWith(".json"))
    : [];
  aggiungi(
    dizionari.length > 0
      ? { esito: "ok", titolo: "Dizionari dei componenti", dettaglio: [`${dizionari.length} pagine inventariate`] }
      : {
          esito: "manca",
          titolo: "Dizionari dei componenti",
          dettaglio: ["nessuno: senza, i locator vengono sintetizzati alla cieca"],
          rimedio: "npm run scout:pausa -- <url>",
          rimedioChiuso: "scansione",
        }
  );
}

{
  const dir = path.join("reports", "recordings");
  const file = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")) : [];

  // Una registrazione fatta prima che il recorder stampigliasse l'URL su ogni
  // gesto non e' inutile, ma attribuisce tutto alla prima pagina. Il generatore
  // lo dichiara; saperlo prima evita di generare e poi chiedersi cosa non torna.
  const conUrl = file.filter((f) => {
    try {
      const r = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as {
        intents?: Array<{ pageUrl?: string; steps?: Array<{ url?: string }> }>;
      };
      return (r.intents ?? []).some((i) => i.pageUrl ?? (i.steps ?? []).some((s) => s.url));
    } catch {
      return false;
    }
  });

  aggiungi(
    file.length === 0
      ? {
          esito: "manca",
          titolo: "Registrazioni",
          dettaglio: ["nessuna: e' da qui che parte tutto"],
          rimedio: "npm run record -- <url>",
          rimedioChiuso: "registrazione",
        }
      : conUrl.length === 0
        ? {
            esito: "avviso",
            titolo: "Registrazioni",
            dettaglio: [
              `${file.length}, ma nessuna riporta la pagina di ogni gesto`,
              "fatte con un recorder precedente: tutto finirebbe sulla prima pagina",
            ],
            rimedio: "npm run record -- <url>",
            rimedioChiuso: "registrazione",
          }
        : {
            esito: "ok",
            titolo: "Registrazioni",
            dettaglio: [`${file.length}, di cui ${conUrl.length} con l'attribuzione per pagina`],
          }
  );
}

{
  const f = "step-catalog.json";
  if (!fs.existsSync(f)) {
    aggiungi({ esito: "manca", titolo: "Catalogo", dettaglio: ["assente"], rimedio: "npm run catalog" });
  } else {
    const steps = (JSON.parse(fs.readFileSync(f, "utf-8")) as {
      steps?: Array<{ components?: unknown[] }>;
    }).steps ?? [];
    const ancorati = steps.filter((s) => (s.components?.length ?? 0) > 0).length;

    // L'ancoraggio ai componenti e' il segnale piu' forte per proporre un
    // candidato, ed e' l'unico che regge fra lingue diverse. Senza, la rosa si
    // regge sulla sola somiglianza fra frasi, che e' una stima.
    aggiungi({
      esito: ancorati === 0 ? "avviso" : "ok",
      titolo: "Catalogo",
      dettaglio: [
        `${steps.length} step, ${ancorati} ancorati a componenti di frontend`,
        ...(ancorati === 0
          ? ["nessun ancoraggio: la rosa dei candidati si reggera' solo sul lessico"]
          : []),
      ],
    });
  }
}

// ---------------------------------------------------------------------------
// L'uscita per una macchina, accanto a quella per le persone.
// ---------------------------------------------------------------------------

/**
 * L'uscita per una macchina, accanto a quella per le persone.
 *
 * Chi legge un risultato lo legge da qui: un numero preso dalla prosa di uno
 * strumento e' gia' costato un 92 al posto di uno 0. Nessun valore di
 * credenziale e nessun indirizzo completo: solo nomi di requisito ed esito.
 */
interface VoceJson {
  nome: string;
  esito: "ok" | "manca" | "attenzione";
  dettaglio: string;
  /** Il rimedio come lo leggerebbe una persona: c'e' sempre, se un rimedio esiste. */
  rimedio?: string;
  /**
   * Lo stesso rimedio come nome chiuso, solo quando la finestra puo' avviarlo.
   * I due campi sono separati apposta: schiacciarli in uno solo faceva sparire
   * il rimedio dalle voci senza corrispondenza — restavano rosse e mute.
   */
  rimedioChiuso?: RimedioChiuso;
}

const ESITO_JSON: Record<Esito, VoceJson["esito"]> = { ok: "ok", manca: "manca", avviso: "attenzione" };

if (hasFlag(process.argv.slice(2), "--json")) {
  const vociJson: VoceJson[] = voci.map((v) => ({
    nome: v.titolo,
    esito: ESITO_JSON[v.esito],
    dettaglio: v.dettaglio[0] ?? "",
    ...(v.rimedio ? { rimedio: v.rimedio } : {}),
    ...(v.rimedioChiuso ? { rimedioChiuso: v.rimedioChiuso } : {}),
  }));
  console.log(JSON.stringify({ voci: vociJson }, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Il referto
// ---------------------------------------------------------------------------

console.log(`\nDIAGNOSI — questa macchina\n`);
for (const v of voci) {
  console.log(`  ${SEGNO[v.esito]} ${v.titolo}`);
  for (const d of v.dettaglio) console.log(`       ${d}`);
  if (v.rimedio) console.log(`       → ${v.rimedio}`);
  console.log("");
}

// Un avviso con un rimedio E' qualcosa da fare, anche se non blocca. Trattarlo
// come rumore e stampare "tutto a posto" sarebbe la bugia piu' costosa che
// questo comando possa dire: manderebbe avanti chi ha ancora un passo indietro
// da recuperare, e il conto si paga tre comandi dopo.
const daFare = voci.filter((v) => v.rimedio);
const primo = daFare[0];

console.log(`  LA PROSSIMA COSA DA FARE\n`);
if (primo) {
  console.log(`    ${primo.rimedio}`);
  console.log(`\n    perche': ${primo.titolo} — ${primo.dettaglio[0]}`);
  if (daFare.length > 1) {
    console.log(`\n    poi restano ${daFare.length - 1}:`);
    for (const v of daFare.slice(1)) console.log(`      ${v.rimedio}`);
  }
} else {
  console.log(`    Niente da sistemare. Il giro completo:`);
  console.log(`      npm run scout:pausa -- <url>     inventaria una pagina di lavoro vera`);
  console.log(`      npm run record     -- <url>      esegui il test a mano`);
  console.log(`      npm run generate                 feature + Page Object + step`);
  console.log(`      npm run benchmark label=deterministico referto=referto.json`);
}
console.log(
  `\n  Il referto e la diagnosi non contengono dati aziendali. Il resto di\n` +
    `  reports/ si', e resta su questa macchina.\n`
);
