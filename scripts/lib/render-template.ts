/**
 * lib/render-template.ts
 * ----------------------
 * Sostituzione di segnaposto sui modelli in `templates/`. Nient'altro.
 *
 * NON E' UN MOTORE DI TEMPLATING, ED E' VOLUTO
 * Niente condizioni, niente cicli, niente espressioni. Un modello che sa
 * ramificare smette di essere leggibile come esempio del codice che produce — e
 * il motivo per cui i modelli sono file separati e' proprio che una persona
 * possa aprirli e riconoscere cosa uscira'. Se serve una condizione, la decide
 * il generatore e passa la stringa gia' decisa.
 *
 * LE TRE REGOLE
 *
 * 1. **Un segnaposto non sostituito e' un errore.** Non si lascia: si lancia.
 *    Un file generato a meta' che sembra completo e' il modo peggiore di
 *    sbagliare, perche' l'errore si scopre in esecuzione e sembra un altro
 *    problema.
 *
 * 2. **Una variabile passata e non usata e' un errore.** Prende i refusi nel
 *    generatore, che altrimenti si manifesterebbero come un segnaposto rimasto
 *    da qualche altra parte.
 *
 * 3. **Il rientro lo decide il modello.** Se un segnaposto sta da solo su una
 *    riga, il valore viene rientrato quanto lui — anche su piu' righe. Cosi'
 *    chi scrive il generatore concatena e basta, e non deve sapere a quale
 *    profondita' finira' il blocco.
 */

import * as fs from "fs";
import * as path from "path";

/** I modelli stanno nella radice del repository, non accanto al codice. */
export const TEMPLATE_DIR = path.join(__dirname, "..", "..", "templates");

/** Il marcatore che rende un file "generato", e quindi riscrivibile. */
export const GENERATED_MARKER = "generato-da: bdd-generate";

const PLACEHOLDER = /\{\{([A-Z0-9_]+)\}\}/g;
/** Un segnaposto da solo sulla sua riga: quello riceve il rientro. */
const BLOCK_LINE = /^([ \t]*)\{\{([A-Z0-9_]+)\}\}[ \t]*$/;

export type TemplateVars = Record<string, string>;

export function templatePath(name: string): string {
  return path.join(TEMPLATE_DIR, name);
}

export function loadTemplate(name: string): string {
  const file = templatePath(name);
  if (!fs.existsSync(file)) {
    const available = fs.existsSync(TEMPLATE_DIR)
      ? fs.readdirSync(TEMPLATE_DIR).filter((f) => f.endsWith(".tmpl")).join(", ")
      : "(la cartella templates/ non esiste)";
    throw new Error(`Modello inesistente: ${name}\n  Disponibili: ${available}`);
  }
  return fs.readFileSync(file, "utf-8");
}

/** Quali segnaposto usa un modello, in ordine di apparizione, senza ripetizioni. */
export function placeholdersOf(template: string): string[] {
  const seen = new Set<string>();
  for (const m of template.matchAll(PLACEHOLDER)) seen.add(m[1]!);
  return [...seen];
}

/** Rientra ogni riga del valore, lasciando in pace quelle vuote. */
function indentBlock(value: string, indent: string): string {
  return value
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : indent + line))
    .join("\n");
}

/**
 * Rende un modello gia' caricato. Separata da `render` perche' i controlli si
 * possono cosi' esercitare su una stringa, senza toccare il disco.
 *
 * I due controlli si fanno **prima** di sostituire, sul modello e sulle chiavi,
 * non sul risultato. Cercare i superstiti nel testo finale sembrerebbe piu'
 * diretto, ma prenderebbe anche i `{{...}}` arrivati dentro a un valore — cioe'
 * da un nome letto su una pagina vera. Un dato non deve poter pilotare il
 * rendering, e nemmeno farlo fallire.
 */
export function renderString(template: string, vars: TemplateVars, source = "(stringa)"): string {
  const needed = placeholdersOf(template);

  // Regola 1 — nessun segnaposto senza valore.
  const missing = needed.filter((k) => !(k in vars));
  if (missing.length > 0) {
    throw new Error(
      `${source}: segnaposto senza valore: ${missing.map((k) => `{{${k}}}`).join(", ")}\n` +
        `  Il file NON e' stato scritto: uscirebbe incompleto ma dall'aria completa.`
    );
  }

  // Regola 2 — nessuna variabile passata a vuoto.
  const unused = Object.keys(vars).filter((k) => !needed.includes(k));
  if (unused.length > 0) {
    throw new Error(
      `${source}: variabili passate ma non presenti nel modello: ${unused.join(", ")}\n` +
        `  Di solito e' un refuso nel generatore, o un modello modificato a meta'.`
    );
  }

  // Una passata sola: i valori sostituiti non vengono riesaminati.
  return template
    .split("\n")
    .flatMap((line) => {
      const block = BLOCK_LINE.exec(line);
      if (block) {
        const value = vars[block[2]!]!;
        // Valore vuoto: sparisce anche la riga. Altrimenti ogni blocco opzionale
        // lascerebbe una riga bianca a testimoniare la propria assenza.
        if (value.trim() === "") return [];
        return [indentBlock(value, block[1]!)];
      }
      return [line.replace(PLACEHOLDER, (_whole, key: string) => vars[key]!)];
    })
    .join("\n");
}

/** Carica il modello e lo rende. E' questa che usa il generatore. */
export function render(name: string, vars: TemplateVars): string {
  return renderString(loadTemplate(name), vars, name);
}

/**
 * Il file esistente si puo' riscrivere?
 *
 * Solo se porta il marcatore. Toglierlo significa "questo file adesso e' mio",
 * e da quel momento la generazione lo salta invece di cancellare il lavoro di
 * qualcuno. E' la stessa regola del publisher Confluence, per lo stesso motivo:
 * serve contro l'errore banale e irreversibile, che una volta sola basta a
 * chiudere l'iniziativa a prescindere da quanto funzioni tutto il resto.
 */
export function isRegenerable(file: string): boolean {
  if (!fs.existsSync(file)) return true;
  // Il marcatore sta in testa: leggere tutto un file solo per la prima riga
  // sarebbe inutile, ma questi file sono piccoli e la semplicita' vince.
  return fs.readFileSync(file, "utf-8").includes(GENERATED_MARKER);
}
