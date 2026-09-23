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
 * DUE LINGUE
 * L'uscita per una macchina (`json`) manda chiavi e dati, mai frasi: le
 * parole vivono nei dizionari (della finestra o di questo script), non qui
 * dentro. L'uscita per le persone (senza `json`) risolve le stesse chiavi con
 * `scripts/lib/i18n-diagnosi.ts`, nella lingua di BDD_LANG — l'inglese e' il
 * ripiego quando non e' impostata, come la finestra che apre in inglese.
 *
 * Uso:  npm run diagnosi
 *       BDD_LANG=it npm run diagnosi
 */

import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";
import { loadEnv } from "./lib/atlassian";
import { loadTargets, requiredVars, hasSession, sessionAgeHours } from "./lib/targets";
import { hasFlag } from "./lib/args";
import { linguaCorrente, traduci } from "./lib/i18n";
import { dizionarioDiagnosi } from "./lib/i18n-diagnosi";

loadEnv();

type Esito = "ok" | "avviso" | "manca";

/**
 * Il nome chiuso del rimedio, quando corrisponde a uno dei comandi che la
 * schermata di controllo puo' avviare da sola (vedi web-ui/src/lib/esecuzione.ts).
 * Senza corrispondenza il rimedio resta solo testo per l'uscita a persone.
 */
type RimedioChiuso = 'installa-browser' | 'sincronizza-regole' | 'sessione' | 'scansione' | 'registrazione';

/** Una riga di dettaglio: una chiave del dizionario, con i dati che porta. */
interface DettaglioVoce {
  chiave: string;
  dati?: Record<string, string | number>;
}

interface Voce {
  esito: Esito;
  /** La chiave del nome della voce, es. `diagnosi.browser.nome`. */
  chiaveNome: string;
  /** Una o piu' righe di dettaglio. La prima e' quella che va nell'uscita JSON. */
  dettaglio: DettaglioVoce[];
  /** Il comando che risolve. Vuoto se non c'e' niente da risolvere. */
  rimedio?: string;
  /** Lo stesso rimedio, come nome chiuso, se la macchina puo' avviarlo da sola. */
  rimedioChiuso?: RimedioChiuso;
  /**
   * La chiave della frase che dice dove si risolve DENTRO la finestra, quando
   * si risolve dentro la finestra. Vive nel dizionario della finestra, non in
   * quello di questo script: da qui passa solo la chiave.
   *
   * Serve perche' il cruscotto ha imparato a fare cose che prima si facevano
   * solo da terminale: mostrare ancora il comando da copiare, con la sezione
   * che lo fa due centimetri piu' sotto, manda il tester nel posto sbagliato.
   * L'uscita testuale continua a mostrare il comando: li' il lettore ha un
   * terminale davvero.
   */
  chiaveDallaFinestra?: string;
  /**
   * Riguarda chi ha costruito la catena, non chi la usa per testare a mano:
   * non deve mai decidere se la macchina e' "pronta" per un tester, e nella
   * schermata di controllo va in una sezione a parte, richiudibile.
   */
  avanzata?: boolean;
}

const voci: Voce[] = [];
const SEGNO: Record<Esito, string> = { ok: "OK ", avviso: "~~ ", manca: "!! " };

const lingua = linguaCorrente();
const t = (chiave: string, dati?: Record<string, string | number>): string =>
  traduci(dizionarioDiagnosi, lingua, chiave, dati);

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
      ? { esito: "ok", chiaveNome: "diagnosi.browser.nome", dettaglio: [{ chiave: "diagnosi.browser.scaricato" }] }
      : {
          esito: "avviso",
          chiaveNome: "diagnosi.browser.nome",
          dettaglio: [{ chiave: "diagnosi.browser.assente" }, { chiave: "diagnosi.browser.ripiego" }],
          rimedio: "npx playwright install chromium",
          rimedioChiuso: "installa-browser",
        }
  );
}

// ---------------------------------------------------------------------------
// 2. L'assistente
// ---------------------------------------------------------------------------

{
  // Le due voci che seguono riguardano chi costruisce la catena (l'IDE con cui
  // si scrivono script e regole), non chi la usa per registrare ed eseguire un
  // test a mano. Un tester senza l'assistente sul PATH non ha nessun problema:
  // marcarle "avanzata" le tiene fuori dal calcolo di "pronto" e dalla vista
  // principale della schermata di controllo.
  const trovati = ["kiro-cli", "kiro", "q"].filter(sulPath);
  aggiungi(
    trovati.length > 0
      ? {
          esito: "ok",
          chiaveNome: "diagnosi.assistente.nome",
          dettaglio: [
            { chiave: "diagnosi.assistente.trovato", dati: { strumenti: trovati.join(", ") } },
            { chiave: "diagnosi.assistente.spiegazione" },
          ],
          avanzata: true,
        }
      : {
          esito: "avviso",
          chiaveNome: "diagnosi.assistente.nome",
          dettaglio: [{ chiave: "diagnosi.assistente.assente" }, { chiave: "diagnosi.assistente.misura" }],
          avanzata: true,
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
          chiaveNome: "diagnosi.agenti.nome",
          dettaglio: [
            { chiave: "diagnosi.agenti.trovati", dati: { agenti: agenti.length, hook: hook.length } },
            { chiave: "diagnosi.agenti.spiegazione" },
          ],
          avanzata: true,
        }
      : {
          esito: "manca",
          chiaveNome: "diagnosi.agenti.nome",
          dettaglio: [{ chiave: "diagnosi.agenti.assenti" }],
          rimedio: "npm run rules:sync",
          rimedioChiuso: "sincronizza-regole",
          avanzata: true,
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
      chiaveNome: "diagnosi.ambienti.nome",
      dettaglio: [{ chiave: "diagnosi.ambienti.nessuno" }],
      rimedio: "cp bdd-targets.example.json bdd-targets.json",
      chiaveDallaFinestra: "diagnosi.ambienti.aggiungiQui",
    });
  } else {
    const attese = requiredVars();
    const pronti = targets.filter(
      (tg) => tg.url && (attese.get(tg.name) ?? []).every((v) => process.env[v])
    );
    const conSessione = targets.filter(hasSession);
    const vecchie = conSessione.filter((tg) => (sessionAgeHours(tg) ?? 0) > 12);

    aggiungi({
      esito: pronti.length === targets.length ? "ok" : "avviso",
      chiaveNome: "diagnosi.ambienti.nome",
      dettaglio: [
        { chiave: "diagnosi.ambienti.parziali", dati: { pronti: pronti.length, totale: targets.length } },
        vecchie.length > 0
          ? {
              chiave: "diagnosi.ambienti.conSessioneVecchie",
              dati: { conSessione: conSessione.length, vecchie: vecchie.length },
            }
          : { chiave: "diagnosi.ambienti.conSessione", dati: { conSessione: conSessione.length } },
      ],
      ...(pronti.length < targets.length
        ? { rimedio: "npm run targets", chiaveDallaFinestra: "diagnosi.ambienti.controllaIndirizzi" }
        : {}),
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
      ? {
          esito: "ok",
          chiaveNome: "diagnosi.dizionari.nome",
          dettaglio: [{ chiave: "diagnosi.dizionari.inventariate", dati: { pagine: dizionari.length } }],
        }
      : {
          esito: "manca",
          chiaveNome: "diagnosi.dizionari.nome",
          dettaglio: [{ chiave: "diagnosi.dizionari.nessuno" }],
          rimedio: "npm run scout:pausa <url>",
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
          chiaveNome: "diagnosi.registrazioni.nome",
          dettaglio: [{ chiave: "diagnosi.registrazioni.nessuna" }],
          rimedio: "npm run record <url>",
          rimedioChiuso: "registrazione",
          chiaveDallaFinestra: "diagnosi.registrazioni.vaiSuRegistra",
        }
      : conUrl.length === 0
        ? {
            esito: "avviso",
            chiaveNome: "diagnosi.registrazioni.nome",
            dettaglio: [{ chiave: "diagnosi.registrazioni.senzaPagina", dati: { totale: file.length } }],
            rimedio: "npm run record <url>",
            rimedioChiuso: "registrazione",
            chiaveDallaFinestra: "diagnosi.registrazioni.rifai",
          }
        : {
            esito: "ok",
            chiaveNome: "diagnosi.registrazioni.nome",
            dettaglio: [
              { chiave: "diagnosi.registrazioni.conPagina", dati: { totale: file.length, conUrl: conUrl.length } },
            ],
          }
  );
}

{
  const f = "step-catalog.json";
  if (!fs.existsSync(f)) {
    aggiungi({
      esito: "manca",
      chiaveNome: "diagnosi.catalogo.nome",
      dettaglio: [{ chiave: "diagnosi.catalogo.assente" }],
      rimedio: "npm run catalog",
      // Gergo di chi ha costruito lo strumento: il tester non puo' farci
      // niente, quindi va nella sezione avanzata come Assistente e Agenti.
      avanzata: true,
    });
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
      chiaveNome: "diagnosi.catalogo.nome",
      dettaglio: [
        { chiave: "diagnosi.catalogo.riepilogo", dati: { steps: steps.length, ancorati } },
        ...(ancorati === 0 ? [{ chiave: "diagnosi.catalogo.nessunAncoraggio" }] : []),
      ],
      avanzata: true,
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
 * credenziale e nessun indirizzo completo: solo chiavi, dati numerici o nomi
 * di strumento, ed esito.
 *
 * Manda chiavi, non frasi: le frasi le scrive chi legge (la finestra o questo
 * stesso script, in `stampaPerPersone`), ciascuno nella propria lingua.
 */
interface VoceJson {
  chiaveNome: string;
  esito: "ok" | "manca" | "attenzione";
  chiaveDettaglio: string;
  /** Solo quando il messaggio ha dei numeri o dei nomi dentro. */
  dati?: Record<string, string | number>;
  /** Il rimedio come lo leggerebbe una persona: c'e' sempre, se un rimedio esiste. NON si traduce: e' un comando. */
  rimedio?: string;
  /** La chiave di dove si risolve dentro la finestra, se si risolve dentro la finestra. Vive nel dizionario della finestra. */
  chiaveDallaFinestra?: string;
  /**
   * Lo stesso rimedio come nome chiuso, solo quando la finestra puo' avviarlo.
   * I due campi sono separati apposta: schiacciarli in uno solo faceva sparire
   * il rimedio dalle voci senza corrispondenza — restavano rosse e mute.
   */
  rimedioChiuso?: RimedioChiuso;
  /**
   * Riguarda chi ha costruito la catena, non chi la usa per testare a mano.
   * La finestra di controllo la tiene fuori dal calcolo di "pronto" e la mette
   * in una sezione a parte. Assente (non `false`) quando non si applica.
   */
  avanzata?: true;
}

const ESITO_JSON: Record<Esito, VoceJson["esito"]> = { ok: "ok", manca: "manca", avviso: "attenzione" };

if (hasFlag(process.argv.slice(2), "--json")) {
  const vociJson: VoceJson[] = voci.map((v) => ({
    chiaveNome: v.chiaveNome,
    esito: ESITO_JSON[v.esito],
    chiaveDettaglio: v.dettaglio[0].chiave,
    ...(v.dettaglio[0].dati ? { dati: v.dettaglio[0].dati } : {}),
    ...(v.rimedio ? { rimedio: v.rimedio } : {}),
    ...(v.chiaveDallaFinestra ? { chiaveDallaFinestra: v.chiaveDallaFinestra } : {}),
    ...(v.rimedioChiuso ? { rimedioChiuso: v.rimedioChiuso } : {}),
    ...(v.avanzata ? { avanzata: true as const } : {}),
  }));
  console.log(JSON.stringify({ voci: vociJson }, null, 2));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Il referto, per le persone — in italiano o in inglese secondo BDD_LANG.
// ---------------------------------------------------------------------------

console.log(`\n${t("diagnosi.intestazione")}\n`);
for (const v of voci) {
  console.log(`  ${SEGNO[v.esito]} ${t(v.chiaveNome)}`);
  for (const d of v.dettaglio) console.log(`       ${t(d.chiave, d.dati)}`);
  if (v.rimedio) console.log(`       → ${v.rimedio}`);
  console.log("");
}

// Un avviso con un rimedio E' qualcosa da fare, anche se non blocca. Trattarlo
// come rumore e stampare "tutto a posto" sarebbe la bugia piu' costosa che
// questo comando possa dire: manderebbe avanti chi ha ancora un passo indietro
// da recuperare, e il conto si paga tre comandi dopo.
const daFare = voci.filter((v) => v.rimedio);
const primo = daFare[0];

console.log(`  ${t("diagnosi.prossimaCosa.titolo")}\n`);
if (primo) {
  console.log(`    ${primo.rimedio}`);
  console.log(
    `\n    ${t("diagnosi.prossimaCosa.motivo", {
      titolo: t(primo.chiaveNome),
      dettaglio: t(primo.dettaglio[0].chiave, primo.dettaglio[0].dati),
    })}`
  );
  if (daFare.length > 1) {
    console.log(`\n    ${t("diagnosi.prossimaCosa.restano", { n: daFare.length - 1 })}`);
    for (const v of daFare.slice(1)) console.log(`      ${v.rimedio}`);
  }
} else {
  console.log(`    ${t("diagnosi.tuttoApposto.titolo")}`);
  console.log(`      ${t("diagnosi.tuttoApposto.scout")}`);
  console.log(`      ${t("diagnosi.tuttoApposto.record")}`);
  console.log(`      ${t("diagnosi.tuttoApposto.generate")}`);
  console.log(`      ${t("diagnosi.tuttoApposto.benchmark")}`);
}
console.log(`\n  ${t("diagnosi.nota")}\n`);
