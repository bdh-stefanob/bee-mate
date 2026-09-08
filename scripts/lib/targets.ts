/**
 * lib/targets.ts
 * --------------
 * I **bersagli**: le applicazioni su cui si registra e si inventaria, ciascuna
 * con un nome corto.
 *
 * PERCHE' ESISTONO
 * Il destinatario di questi strumenti e' un tester manuale. Chiedergli di
 * ricordare l'URL di staging di tre applicazioni diverse, e di incollarlo
 * giusto ogni volta, e' l'attrito che decide se lo strumento viene usato o no.
 * Con un bersaglio nominato il comando diventa `npm run record -- clinic`.
 *
 * DOVE VIVONO GLI URL, E PERCHE' NON QUI
 * Il file `bdd-targets.json` e' **gitignorato**: contiene gli indirizzi degli
 * ambienti aziendali. In repository c'e' solo `bdd-targets.example.json`. Gli
 * URL si possono anche tenere in `.env` e referenziare come `${CLINIC_URL}`,
 * cosi' esistono in un posto solo.
 *
 * PERCHE' NESSUNA CREDENZIALE
 * Il login e' sempre manuale, una volta sola, e produce una sessione salvata.
 * La scelta viene dall'esperienza sul campo: nel POC aziendale la strada
 * automatica coi selettori funziona sul caso facile e **degrada a manuale
 * appena compare la MFA** — e per una delle applicazioni e' gia' interamente
 * manuale. Automatizzare il login copre il caso semplice e si arrende su
 * quelli veri, in cambio di selettori da mantenere e credenziali da custodire.
 */

import * as fs from "fs";
import * as path from "path";

export interface Target {
  /** Nome corto, quello che si digita. */
  name: string;
  /** URL di partenza. Ammette ${VAR} risolto da .env. */
  url: string;
  /**
   * Come si riconosce che il login e' andato a buon fine: un pezzo di URL.
   * E' il segnale usato anche nel POC aziendale (es. "/account", "/visits").
   * Assente: si aspetta che sia la persona a dire che ha finito.
   */
  readyWhen?: string;
  /** Dove sta la sessione salvata. Sotto reports/, che e' gitignorato. */
  session: string;
  /** Nota per chi registra: cosa fare dopo il login. */
  hint?: string;
}

const CONFIG = "bdd-targets.json";
const EXAMPLE = "bdd-targets.example.json";

/** Risolve i riferimenti `${VAR}` con le variabili d'ambiente. */
function expand(value: string): string {
  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => process.env[name] ?? "");
}

export function loadTargets(file = CONFIG): Target[] {
  if (!fs.existsSync(file)) return [];
  const json = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, Partial<Target>>;

  return Object.entries(json).map(([name, t]) => ({
    name,
    url: expand(t.url ?? ""),
    ...(t.readyWhen ? { readyWhen: t.readyWhen } : {}),
    // Default sensato: una sessione per bersaglio, sotto reports/.
    session: t.session ?? path.join("reports", "sessions", `${name}.json`),
    ...(t.hint ? { hint: t.hint } : {}),
  }));
}

/**
 * Risolve cio' che l'utente ha scritto: un URL diretto oppure il nome di un
 * bersaglio. Restituisce sempre un Target, cosi' il resto del codice non deve
 * distinguere i due casi.
 */
export function resolveTarget(input: string, file = CONFIG): Target {
  if (/^https?:\/\//i.test(input)) {
    return {
      name: "(url diretto)",
      url: input,
      session: path.join("reports", "sessions", "adhoc.json"),
    };
  }

  const targets = loadTargets(file);
  const found = targets.find((t) => t.name === input);
  if (found) {
    if (!found.url) {
      throw new Error(
        `Il bersaglio "${input}" non ha un URL.\n` +
          `  Se in ${file} usa \${NOME_VARIABILE}, controlla che sia definita in .env.`
      );
    }
    return found;
  }

  throw new Error(
    targets.length === 0
      ? `Nessun bersaglio configurato, e "${input}" non e' un URL.\n\n` +
        `  Copia ${EXAMPLE} in ${CONFIG} e mettici i tuoi ambienti.\n` +
        `  ${CONFIG} e' gitignorato: gli indirizzi non finiscono nel repository.\n`
      : `Bersaglio sconosciuto: "${input}"\n\n` +
        `  Disponibili: ${targets.map((t) => t.name).join(", ")}\n` +
        `  Oppure passa direttamente un URL.\n`
  );
}

/** La sessione esiste ed e' leggibile? */
export function hasSession(target: Target): boolean {
  return Boolean(target.session) && fs.existsSync(target.session);
}

/**
 * Da quanto tempo e' stata salvata. Le sessioni scadono senza avvisare, e il
 * sintomo — l'applicazione che rimanda al login a meta' registrazione — non
 * assomiglia per niente alla causa.
 */
export function sessionAgeHours(target: Target): number | null {
  if (!hasSession(target)) return null;
  const stat = fs.statSync(target.session);
  return Math.round((Date.now() - stat.mtimeMs) / 3_600_000);
}
