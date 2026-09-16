/**
 * hooks.ts
 * --------
 * Quale controllo deterministico spetta a un file appena scritto.
 *
 * PERCHE' ESISTE, E PERCHE' NON E' QUELLO CHE AVEVAMO SCRITTO
 * L'automatismo era stato pensato sul salvataggio nell'editor: salvi un
 * `.feature`, parte il validatore. Quell'evento **non esiste**: i trigger sono
 * `agentSpawn`, `userPromptSubmit`, `preToolUse`, `postToolUse`, `stop`, e gli
 * hook si dichiarano dentro al file dell'agente, non in una cartella a parte.
 * Il file `.kiro/hooks/*.json` che avevamo scritto non lo leggeva nessuno:
 * sembrava un pezzo di metodo, ed era configurazione morta.
 *
 * Il trigger che c'e' e' anche il piu' pertinente: `postToolUse` su `fs_write`,
 * cioe' **quando l'assistente scrive**. Il rischio non e' che una persona salvi
 * un file: e' che un modello ne scriva uno che non passa i giudici.
 *
 * Qui sta solo la decisione — quale comando per quale file — perche' e' la
 * parte che si puo' controllare senza avviare niente.
 */

export interface Controllo {
  comando: string;
  perche: string;
}

/**
 * Il comando che rende di nuovo vero cio' che quel file promette, o `null` se
 * quel file non promette niente di verificabile.
 */
export function controlloPer(percorso: string): Controllo | null {
  const p = percorso.replace(/\\/g, "/").toLowerCase();

  // L'ordine conta: una step definition finisce per `.ts`, ma non e' un `.ts`
  // qualunque — e il catalogo si rigenera solo da quelle.
  if (p.endsWith(".feature")) {
    return {
      comando: "npm run validate:steps",
      perche: "uno scenario e' cambiato: le frasi si validano contro il catalogo",
    };
  }
  if (p.endsWith(".steps.ts")) {
    return {
      comando: "npm run catalog",
      perche: "una step definition e' cambiata: STEP_CATALOG.md si rigenera dal codice",
    };
  }
  return null;
}

/** Il percorso scritto, da come l'evento lo riporta. `null` se non c'e'. */
export function percorsoScritto(evento: unknown): string | null {
  const e = evento as { tool_input?: Record<string, unknown> } | null;
  const input = e?.tool_input;
  if (!input) return null;
  for (const chiave of ["path", "file_path", "filePath"]) {
    const v = input[chiave];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}
