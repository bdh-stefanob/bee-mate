/**
 * lib/browser.ts
 * --------------
 * Avvia un browser, e quando non ci riesce **dice cosa fare**.
 *
 * PERCHE' ESISTE
 * `npm install` installa il pacchetto Playwright, non i browser: sono centinaia
 * di megabyte scaricati a parte. Chi clona il repository e lancia `npm run scout`
 * senza aver letto `bootstrap.ps1` si prende questo:
 *
 *     Scout fallito: browser.launch: Executable doesn't exist at ...
 *
 * che e' vero e inutile. Non dice che manca un passo di installazione, non dice
 * quale comando lo risolve, e su una macchina aziendale non dice la cosa piu'
 * importante: che il download potrebbe essere bloccato e che **c'e' una via
 * d'uscita**.
 *
 * LA VIA D'USCITA, CHE E' IL MOTIVO VERO DI QUESTO FILE
 * Playwright sa pilotare il Chrome o l'Edge gia' installati sulla macchina,
 * senza scaricare niente. Su un portatile aziendale con la CDN bloccata dal
 * proxy e' spesso l'unica strada — e ci si arriva da soli solo sapendo che
 * esiste. Qui si prova da sola, e viene detto quale browser e' stato usato:
 * silenziosamente diverso sarebbe peggio.
 *
 * Il compromesso va dichiarato: il Chrome di sistema non e' identico al Chromium
 * di Playwright, e ha la versione che ha. Per inventariare nomi accessibili e
 * registrare gesti non cambia niente; per un test che dipende da un dettaglio di
 * resa, potrebbe. In quel caso si installa quello di Playwright.
 */

import { chromium, type Browser, type LaunchOptions } from "@playwright/test";

/** I canali che proviamo, in ordine. Il primo e' quello di Playwright. */
const CANALI = ["chromium", "chrome", "msedge"] as const;
export type Canale = (typeof CANALI)[number];

const NOME_LEGGIBILE: Record<Canale, string> = {
  chromium: "il Chromium di Playwright",
  chrome: "il Chrome installato sulla macchina",
  msedge: "l'Edge installato sulla macchina",
};

/** L'errore che si prende quando il binario non e' stato scaricato. */
function eseguibileMancante(err: unknown): boolean {
  const m = (err as Error).message ?? "";
  return m.includes("Executable doesn't exist") || m.includes("looks like Playwright");
}

export interface RisultatoAvvio {
  browser: Browser;
  canale: Canale;
  /** Vero se abbiamo ripiegato su un browser di sistema. Va detto a schermo. */
  ripiego: boolean;
}

/**
 * Avvia il browser, provando i canali in ordine.
 *
 * `BDD_BROWSER=chrome` forza un canale: in quel caso non si ripiega, perche' chi
 * lo imposta ha una ragione per volere proprio quello, e un ripiego silenzioso
 * gliela toglierebbe.
 */
export async function avviaBrowser(
  options: LaunchOptions = {},
  preferito?: string
): Promise<RisultatoAvvio> {
  const forzato = process.env["BDD_BROWSER"] as Canale | undefined;

  // Una preferenza espressa da chi chiama (il `--browser` del recorder) mette
  // quel canale davanti, ma **non toglie gli altri**: chi registra sta eseguendo
  // un test, non configurando un ambiente, e fermarsi perche' manca il browser
  // preferito sarebbe fermarlo per un dettaglio che non lo riguarda. La variabile
  // d'ambiente invece esclude: chi la imposta ha una ragione per volere proprio
  // quello, e un ripiego silenzioso gliela toglierebbe.
  const ordinati = preferito && (CANALI as readonly string[]).includes(preferito)
    ? ([preferito as Canale, ...CANALI.filter((c) => c !== preferito)] as Canale[])
    : [...CANALI];

  const daProvare: Canale[] = forzato ? [forzato] : ordinati;
  const errori: string[] = [];

  for (const canale of daProvare) {
    try {
      const browser = await chromium.launch({
        ...options,
        ...(canale === "chromium" ? {} : { channel: canale }),
      });
      return { browser, canale, ripiego: canale !== "chromium" };
    } catch (err) {
      errori.push(`${canale}: ${(err as Error).message.split("\n")[0]}`);
      // Un canale mancante e' un motivo per provare il prossimo. Qualunque altro
      // errore — un flag sbagliato, un profilo corrotto — no: riproporlo su tre
      // canali produrrebbe tre volte lo stesso errore travestito da tre problemi.
      if (!eseguibileMancante(err)) break;
    }
  }

  throw new Error(
    `Nessun browser disponibile.\n\n` +
      `  Il piu' probabile: i browser di Playwright non sono stati scaricati.\n` +
      `  \`npm install\` installa il pacchetto, non i binari.\n\n` +
      `      npx playwright install chromium\n\n` +
      `  Se il download e' bloccato dal proxy aziendale, usa un browser che c'e'\n` +
      `  gia' sulla macchina — non scarica niente:\n\n` +
      `      BDD_BROWSER=chrome  npm run scout -- <url>     (oppure msedge)\n\n` +
      `  In PowerShell:  $env:BDD_BROWSER="chrome"; npm run scout -- <url>\n\n` +
      `  Dettaglio di cosa ho provato:\n` +
      errori.map((e) => `    ${e}`).join("\n") +
      `\n`
  );
}

/** Da stampare dopo l'avvio, quando si e' ripiegato: mai cambiare browser in silenzio. */
export function noteRipiego(r: RisultatoAvvio): string {
  if (!r.ripiego) return "";
  return (
    `  Uso ${NOME_LEGGIBILE[r.canale]}: quello di Playwright non e' installato.\n` +
    `  Va benissimo per inventariare e registrare. Se ti serve proprio il suo:\n` +
    `    npx playwright install chromium\n`
  );
}
