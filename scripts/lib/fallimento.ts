/**
 * fallimento.ts
 * -------------
 * Il dossier di uno scenario fallito: tutto cio' che serve a capire il problema
 * senza riaprire l'applicazione.
 *
 * Perche' esiste. Chi corregge dopo il lancio — una persona, o Kiro in modalita'
 * agente — spesso non puo' raggiungere l'ambiente: e' dietro una VPN, o
 * l'agente non ha il web. Un messaggio d'errore da solo («locator not found»)
 * dice cosa non si e' trovato, non cosa c'era al suo posto. Il dossier porta
 * quello che c'era: l'albero di accessibilita' della pagina nel momento del
 * fallimento, l'indirizzo, lo screenshot, il passo e il file che lo contiene.
 *
 * Con quello, il rimedio piu' frequente (un nome cambiato, un avviso in mezzo)
 * si trova leggendo file locali, e si prova rilanciando solo lo scenario.
 *
 * Non contiene valori digitati ne' credenziali: il testo dell'errore passa da
 * `senzaSegreti` prima di essere scritto.
 */

import * as fs from "fs";
import * as path from "path";

export interface DatiFallimento {
  scenario: string;
  /** Percorso del .feature, come lo riporta Cucumber. */
  feature: string;
  /** Il passo che e' fallito: il testo Gherkin. Assente se e' fallito un hook. */
  passo?: string;
  messaggio: string;
  url?: string;
  titolo?: string;
  /** Albero di accessibilita' (YAML di Playwright) al momento del fallimento. */
  aria?: string;
  screenshot?: Buffer;
  /** L'ambiente nominato su cui girava, se c'e'. */
  ambiente?: string;
  quando?: Date;
}

/** Toglie dall'errore cio' che non deve finire in un file: password, token, intestazioni. */
export function senzaSegreti(testo: string): string {
  return testo
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[nascosto]")
    .replace(/(password|passwd|token|secret|authorization|cookie)(["'\s:=]+)(?!Bearer\b)[^\s"',;]+/gi, "$1$2[nascosto]");
}

export function slugFallimento(d: Pick<DatiFallimento, "scenario" | "quando">): string {
  const nome = d.scenario
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const quando = (d.quando ?? new Date()).toISOString().replace(/[:.]/g, "-").toLowerCase();
  return `${nome || "scenario"}-${quando}`;
}

/** Il comando che rilancia solo questo scenario, con lo stesso ambiente. */
export function comandoRilancio(d: Pick<DatiFallimento, "scenario" | "ambiente">): string {
  const nome = d.scenario.replace(/"/g, '\\"');
  return d.ambiente
    ? `npm run test:bersaglio ${d.ambiente} -- --name "^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$"`
    : `npx cucumber-js --name "^${nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$"`;
}

export function formattaFallimento(d: DatiFallimento, file: { aria?: string; screenshot?: string }): string {
  const righe: string[] = [
    `# Scenario fallito — ${d.scenario}`,
    "",
    `- **Quando**: ${(d.quando ?? new Date()).toISOString()}`,
    `- **Feature**: \`${d.feature}\``,
    `- **Passo fallito**: ${d.passo ? `\`${d.passo}\`` : "(un hook, non un passo)"}`,
    ...(d.ambiente ? [`- **Ambiente**: ${d.ambiente}`] : []),
    ...(d.url ? [`- **Pagina al momento del fallimento**: ${d.url}${d.titolo ? ` — «${d.titolo}»` : ""}`] : []),
    "",
    "## Errore",
    "",
    "```",
    senzaSegreti(d.messaggio).trim(),
    "```",
    "",
    "## Cosa c'era sulla pagina",
    "",
    file.aria
      ? `L'albero di accessibilita' e' in \`${file.aria}\`: e' l'elenco di cio' che un utente (o un locator \`getByRole\`) vede. Se il componente che il passo cercava non c'e', cerca quello che gli somiglia: di solito e' stato rinominato.`
      : "Non e' stato possibile leggere la pagina (il browser era gia' chiuso o la pagina non si e' aperta).",
    ...(file.screenshot ? ["", `Screenshot: \`${file.screenshot}\``] : []),
    "",
    "## Come procedere",
    "",
    "1. Trova lo step nel file di step: cerca il testo del passo fallito sotto `src/steps/`.",
    "2. Confronta il componente che cerca con l'albero di accessibilita': e' sparito, rinominato, o coperto da un avviso (un modale, un banner)?",
    "3. Correggi **nella Page Object** (`src/pages/`) o nell'azione (`src/actions/`), mai nello step: niente selettori negli step.",
    "4. Se la causa e' un avviso che compare solo a volte, chiudilo \"se c'e'\" (`dismissIfPresent` in `base.page.ts`): non deve far fallire lo scenario.",
    "5. Rilancia solo questo scenario:",
    "",
    "```",
    comandoRilancio(d),
    "```",
    "",
    "Se il dossier non basta a capire (la pagina e' troppo diversa da quella registrata), dillo invece di indovinare: serve rilanciare lo scout su quell'indirizzo.",
    "",
  ];
  return righe.join("\n");
}

/** Scrive il dossier sotto `reports/failures/<slug>/` e restituisce la cartella. */
export function scriviFallimento(d: DatiFallimento, radice = path.join("reports", "failures")): string {
  const dir = path.join(radice, slugFallimento(d));
  fs.mkdirSync(dir, { recursive: true });
  const file: { aria?: string; screenshot?: string } = {};
  if (d.aria) {
    fs.writeFileSync(path.join(dir, "aria.yml"), d.aria);
    file.aria = "aria.yml";
  }
  if (d.screenshot) {
    fs.writeFileSync(path.join(dir, "screenshot.png"), d.screenshot);
    file.screenshot = "screenshot.png";
  }
  fs.writeFileSync(path.join(dir, "fallimento.md"), formattaFallimento(d, file));
  return dir;
}
