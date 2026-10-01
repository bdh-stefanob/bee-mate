/**
 * lancio-test.ts
 * --------------
 * Cio' che `test-bersaglio.ts` decide prima di lanciare Cucumber, come funzioni
 * pure: cosi' un controllo le puo' provare senza aprire un browser.
 */

/** Le opzioni nude di `test-bersaglio`: non sono percorsi. */
const OPZIONI_NUDE = new Set(["vedi", "pulito", "generati"]);
const PREFISSI_OPZIONE = ["messaggi=", "rallenta="];

/**
 * I percorsi di scenario fra gli argomenti: tutto cio' che segue il bersaglio e
 * non e' un'opzione. L'ordine e' quello dato — conta, perche' Cucumber esegue i
 * percorsi in quest'ordine (vedi `percorsi-cucumber.check.ts`).
 */
export function percorsiDaArgomenti(args: readonly string[]): string[] {
  return args
    .slice(1)
    .filter((a) => !OPZIONI_NUDE.has(a) && !PREFISSI_OPZIONE.some((p) => a.startsWith(p)));
}

/**
 * Dove scrivere il report HTML di un'esecuzione che ha il suo file dei messaggi:
 * accanto, con lo stesso nome. Due esecuzioni contemporanee hanno due file dei
 * messaggi (l'id e' unico), quindi due report: prima scrivevano entrambe su
 * `reports/cucumber-report.html` e l'ultima a finire cancellava l'altra.
 *
 * Senza file dei messaggi nessun nome proprio: `undefined`, e `cucumber.js` usa il
 * nome di sempre.
 */
export function reportHtmlPer(messaggi: string | undefined): string | undefined {
  if (!messaggi) return undefined;
  return /\.ndjson$/i.test(messaggi) ? messaggi.replace(/\.ndjson$/i, ".html") : `${messaggi}.html`;
}

export interface OpzioniAmbiente {
  base: NodeJS.ProcessEnv;
  /** `BASE_URL` o `BDD_TARGET`, gia' scelto. */
  ambiente: { BASE_URL?: string; BDD_TARGET?: string };
  percorsi: string[];
  messaggi?: string;
  vedi: boolean;
  rallenta: number;
  pulito: boolean;
}

/** L'ambiente del processo Cucumber. */
export function ambienteDiCucumber(o: OpzioniAmbiente): NodeJS.ProcessEnv {
  const html = reportHtmlPer(o.messaggi);
  return {
    ...o.base,
    ...o.ambiente,
    BDD_PATHS: o.percorsi.join(";"),
    ...(html ? { BDD_HTML: html } : {}),
    ...(o.vedi ? { HEADED: "1" } : {}),
    ...(o.rallenta > 0 ? { BDD_SLOWMO: String(o.rallenta) } : {}),
    ...(o.pulito ? { BDD_NO_SESSION: "1" } : {}),
  };
}
