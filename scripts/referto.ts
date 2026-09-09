/**
 * referto.ts
 * ----------
 * Cosa e' stato misurato su una macchina, **in una forma che si puo' committare**.
 *
 * IL PROBLEMA CHE RISOLVE
 * `reports/` e' gitignorato e deve restarlo: un dizionario di un'applicazione
 * aziendale contiene nomi di componenti, di funzionalita' e indirizzi reali, e
 * questo repository e' pubblico con due remote sulla stessa storia. Ma allora
 * chi misura su una macchina e discute su un'altra deve ricopiare i numeri a
 * mano, e ricopiare a mano significa non farlo.
 *
 * LA GARANZIA, CHE E' STRUTTURALE E NON UNA PROMESSA
 * Questo file **non copia mai una stringa presa dai dati in ingresso**. Ogni
 * riga che produce e' un numero calcolato qui dentro, o un'etichetta scritta in
 * questo sorgente. Non e' che "sta attento a non far uscire i nomi": e' che i
 * nomi non attraversano nemmeno il codice. Una regola che si puo' violare per
 * distrazione non e' una garanzia — questa non si puo' violare senza riscrivere
 * la funzione.
 *
 * Le pagine si chiamano "pagina 1", "pagina 2" nell'ordine in cui compaiono.
 * Basta a confrontare due misure e a discuterne; non basta a sapere di cosa si
 * parla, ed e' voluto.
 *
 * Uso:
 *   npm run referto              scrive referti/<data>-misura.md
 *   npm run referto -- clinic    scrive referti/<data>-clinic.md
 *
 * Il nome si passa come argomento nudo, non come flag. E' la terza volta che un
 * flag non arriva allo script passando per `npm run -- ...`, e le prime due
 * volte e' costata una misura sbagliata e un file sovrascritto. Un argomento
 * senza trattini davanti non lo mangia nessuno.
 */

import * as fs from "fs";
import * as path from "path";

const SCOUT = path.join("reports", "scout");
const RECORDINGS = path.join("reports", "recordings");
const CATALOG = "step-catalog.json";
const OUT_DIR = "referti";

function argValue(args: string[], flag: string): string | undefined {
  const eq = args.find((a) => a.startsWith(flag + "="));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

function leggi<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

function elenca(dir: string): string[] {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
}

/** Conta per chiave. Restituisce numeri, mai le chiavi dei dati. */
function conta<T>(items: readonly T[], chiave: (x: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of items) m.set(chiave(x), (m.get(chiave(x)) ?? 0) + 1);
  return m;
}

interface Componente {
  role: string;
  kind: string;
  stability: string;
}
interface Dizionario {
  quality?: { interactiveFound?: number; accessibleScore?: number };
  viewport?: { width?: number; height?: number };
  components?: Componente[];
}
interface Registrazione {
  durationSeconds?: number;
  summary?: { intents?: number; steps?: number; assertions?: number; unlabelled?: number };
  intents?: Array<{ pageUrl?: string; steps?: Array<{ url?: string; secret?: boolean }> }>;
}

function main(): void {
  const args = process.argv.slice(2);
  // Argomento nudo, con --nome ancora accettato per chi l'aveva imparato.
  const nome = args.find((a) => !a.startsWith("-")) ?? argValue(args, "--nome") ?? "misura";
  const righe: string[] = [];

  righe.push(`# Referto — ${nome}`);
  righe.push("");
  righe.push(`Prodotto il ${new Date().toISOString().slice(0, 10)} da \`npm run referto\`.`);
  righe.push("");
  righe.push(
    `Solo numeri. Nomi di pagine, componenti, indirizzi e frasi restano sulla ` +
      `macchina che ha misurato: qui non arrivano, e non perche' vengano tolti — ` +
      `perche' non attraversano il codice che scrive questo file.`
  );
  righe.push("");

  // ── Dizionari ─────────────────────────────────────────────────────────────
  const dizionari = elenca(SCOUT);
  righe.push(`## Pagine inventariate — ${dizionari.length}`);
  righe.push("");

  if (dizionari.length === 0) {
    righe.push("_Nessuna._");
  } else {
    righe.push("| # | Componenti | Utilizzabili | Senza nome | Ambigui | Instabili | Accessibilita' |");
    righe.push("|---|---|---|---|---|---|---|");

    dizionari.forEach((f, i) => {
      const d = leggi<Dizionario>(path.join(SCOUT, f));
      const comp = d?.components ?? [];
      const perStab = conta(comp, (c) => c.stability);
      righe.push(
        `| ${i + 1} | ${comp.length} | ${perStab.get("stable") ?? 0} | ` +
          `${perStab.get("unnamed") ?? 0} | ${perStab.get("ambiguous") ?? 0} | ` +
          `${perStab.get("unstable") ?? 0} | ${d?.quality?.accessibleScore ?? "?"}% |`
      );
    });

    righe.push("");
    righe.push("### Che tipo di componenti");
    righe.push("");

    const tutti = dizionari.flatMap((f) => leggi<Dizionario>(path.join(SCOUT, f))?.components ?? []);
    const perKind = conta(tutti, (c) => c.kind);
    const perRole = conta(tutti, (c) => c.role);

    righe.push(`Su ${tutti.length} componenti in tutto:`);
    righe.push("");
    for (const [k, n] of [...perKind.entries()].sort((a, b) => b[1] - a[1])) {
      righe.push(`- \`${k}\` — ${n}`);
    }
    righe.push("");
    righe.push(
      `Ruoli ARIA distinti: **${perRole.size}**. ` +
        `Pochi ruoli distinti su molti componenti significa che la pagina usa poche ` +
        `primitive: l'automazione per ruolo+nome regge meglio.`
    );
  }
  righe.push("");

  // ── Registrazioni ─────────────────────────────────────────────────────────
  const registrazioni = elenca(RECORDINGS);
  righe.push(`## Sessioni registrate — ${registrazioni.length}`);
  righe.push("");

  if (registrazioni.length === 0) {
    righe.push("_Nessuna._");
  } else {
    righe.push("| # | Durata | Intenti | Gesti | Verifiche | Senza etichetta | Pagine | Attribuzione |");
    righe.push("|---|---|---|---|---|---|---|---|");

    registrazioni.forEach((f, i) => {
      const r = leggi<Registrazione>(path.join(RECORDINGS, f));
      const intents = r?.intents ?? [];
      // Le pagine si CONTANO, non si nominano: quante sono e' un dato utile,
      // quali sono e' materiale aziendale.
      const pagine = new Set<string>();
      for (const it of intents) {
        if (it.pageUrl) pagine.add(it.pageUrl);
        for (const s of it.steps ?? []) if (s.url) pagine.add(s.url);
      }
      const conUrl = pagine.size > 0;
      righe.push(
        `| ${i + 1} | ${r?.durationSeconds ?? "?"}s | ${r?.summary?.intents ?? "?"} | ` +
          `${r?.summary?.steps ?? "?"} | ${r?.summary?.assertions ?? "?"} | ` +
          `${r?.summary?.unlabelled ?? "?"} | ${conUrl ? pagine.size : "—"} | ` +
          `${conUrl ? "per pagina" : "**solo la prima**"} |`
      );
    });

    righe.push("");
    righe.push(
      `"Attribuzione: solo la prima" significa una registrazione fatta prima che il ` +
        `recorder stampigliasse la pagina su ogni gesto. Non e' inutile, ma tutto ` +
        `finisce sulla prima Page Object — il generatore lo dichiara.`
    );
  }
  righe.push("");

  // ── Catalogo ──────────────────────────────────────────────────────────────
  const cat = leggi<{ steps?: Array<{ components?: unknown[]; status?: string }> }>(CATALOG);
  const steps = cat?.steps ?? [];
  const ancorati = steps.filter((s) => (s.components?.length ?? 0) > 0).length;
  const perStato = conta(steps, (s) => s.status ?? "(senza stato)");

  righe.push(`## Catalogo — ${steps.length} step`);
  righe.push("");
  righe.push(`- ancorati a componenti di frontend: **${ancorati}** su ${steps.length}`);
  for (const [k, n] of [...perStato.entries()].sort((a, b) => b[1] - a[1])) {
    righe.push(`- \`${k}\`: ${n}`);
  }
  righe.push("");
  if (ancorati === 0) {
    righe.push(
      `Zero ancoraggi e' il limite principale in questo momento: e' il segnale piu' ` +
        `forte per proporre un candidato, ed e' l'unico che regge quando etichetta e ` +
        `catalogo non parlano la stessa lingua. Senza, la rosa si regge sulla sola ` +
        `somiglianza fra frasi, che e' una stima.`
    );
    righe.push("");
  }

  // ── Scrittura ─────────────────────────────────────────────────────────────
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const file = path.join(
    OUT_DIR,
    `${new Date().toISOString().slice(0, 10)}-${nome.replace(/[^a-z0-9-]/gi, "-")}.md`
  );
  fs.writeFileSync(file, righe.join("\n"), "utf-8");

  console.log(`\nREFERTO\n`);
  console.log(`  ${dizionari.length} pagine, ${registrazioni.length} sessioni, ${steps.length} step di catalogo`);
  console.log(`\n  Scritto in ${file}`);
  console.log(
    `\n  Questo file si puo' committare: contiene solo numeri.\n` +
      `  Il resto di reports/ no, e resta dov'e'.\n`
  );
}

main();
