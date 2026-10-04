/**
 * lib/copione-schema.ts
 * ----------------------
 * Il formato del **copione**: la lista di azioni che un agente da' al recorder
 * al posto di una persona (N10, spec `2026-10-01-assistente-nel-cruscotto-design.md`
 * sezione 5(a)).
 *
 * PERCHE' VALIDATO A MANO, SENZA UNA LIBRERIA
 * Il progetto non ha una dipendenza di validazione (niente `zod` in
 * `node_modules`): aggiungerne una per un solo file non vale il costo. La forma
 * e' piccola, e l'elenco di errori che questo file produce e' pensato per essere
 * letto da una persona — non e' un dettaglio che una libreria generica farebbe
 * meglio.
 *
 * TUTTI GLI ERRORI, NON IL PRIMO
 * Come in `leggi-json.ts` e nel generatore: un copione scritto da un modello puo'
 * avere piu' di un problema, e correggerne uno alla volta per scoprire il
 * successivo e' il modo peggiore di validare qualcosa che nessuno guarda a
 * schermo mentre gira.
 *
 * MAI SELETTORI CSS
 * La stessa regola degli step del progetto: un'azione si esprime per ruolo +
 * nome accessibile. `ruolo` e `nome` che assomigliano a un selettore CSS
 * (iniziano per `.`, `#`, `[`, o contengono uno spazio seguito da `>`) sono
 * rifiutati qui, prima che possano arrivare al recorder.
 */

export type TipoAzione = "click" | "fill";

export interface AzioneCopione {
  azione: TipoAzione;
  ruolo: string;
  nome: string;
  /** Solo per `fill`. Ammette `${VARIABILE}`, risolta da `.env` come per i target. */
  valore?: string;
}

export interface VerificaCopione {
  ruolo: string;
  nome: string;
  testo?: string;
}

export interface IntentoCopione {
  /** Il nome del passo: diventa l'etichetta dell'intento, come "Fine intento" nella barra. */
  nome: string;
  azioni: AzioneCopione[];
  /** Verifiche dichiarate alla fine dell'intento, come "Verifica" nella barra. Facoltative. */
  verifiche?: VerificaCopione[];
}

export interface Copione {
  schema: 1;
  /** Il nome di un ambiente in bdd-targets.json. Mai un URL diretto (difesa 2: serve un bersaglio dichiarato). */
  ambiente: string;
  intenti: IntentoCopione[];
}

/** Tutti gli errori insieme, mai solo il primo: vedi la nota in testa al file. */
export class CopioneNonValido extends Error {
  constructor(public readonly dettagli: string[]) {
    super(`copione non valido:\n  - ${dettagli.join("\n  - ")}`);
    this.name = "CopioneNonValido";
  }
}

/** Assomiglia a un selettore CSS invece che a un ruolo o un nome accessibile? */
function sembraSelettoreCss(valore: string): boolean {
  return /^[.#\[]/.test(valore.trim()) || />/.test(valore) || /^[a-z0-9]+(\.[a-z0-9_-]+)+$/i.test(valore.trim());
}

function stringaNonVuota(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function validaAzione(v: unknown, dove: string, errori: string[]): void {
  if (typeof v !== "object" || v === null) {
    errori.push(`${dove}: non e' un oggetto`);
    return;
  }
  const a = v as Record<string, unknown>;
  if (a.azione !== "click" && a.azione !== "fill") {
    errori.push(`${dove}.azione: deve essere "click" o "fill", trovato ${JSON.stringify(a.azione)}`);
  }
  if (!stringaNonVuota(a.ruolo)) {
    errori.push(`${dove}.ruolo: manca o e' vuoto`);
  } else if (sembraSelettoreCss(a.ruolo)) {
    errori.push(`${dove}.ruolo: "${a.ruolo}" sembra un selettore CSS, non un ruolo ARIA — mai selettori nel copione`);
  }
  if (!stringaNonVuota(a.nome)) {
    errori.push(`${dove}.nome: manca o e' vuoto (nome accessibile)`);
  } else if (sembraSelettoreCss(a.nome)) {
    errori.push(`${dove}.nome: "${a.nome}" sembra un selettore CSS, non un nome accessibile — mai selettori nel copione`);
  }
  if (a.azione === "fill" && !stringaNonVuota(a.valore)) {
    errori.push(`${dove}.valore: una "fill" richiede un valore di prova (anche vuoto va scritto esplicitamente con "")`);
  }
  if (a.azione === "click" && a.valore !== undefined) {
    errori.push(`${dove}.valore: un "click" non ha un valore, trovato ${JSON.stringify(a.valore)}`);
  }
}

function validaVerifica(v: unknown, dove: string, errori: string[]): void {
  if (typeof v !== "object" || v === null) {
    errori.push(`${dove}: non e' un oggetto`);
    return;
  }
  const a = v as Record<string, unknown>;
  if (!stringaNonVuota(a.ruolo)) errori.push(`${dove}.ruolo: manca o e' vuoto`);
  else if (sembraSelettoreCss(a.ruolo)) errori.push(`${dove}.ruolo: "${a.ruolo}" sembra un selettore CSS`);
  if (!stringaNonVuota(a.nome)) errori.push(`${dove}.nome: manca o e' vuoto`);
  else if (sembraSelettoreCss(a.nome)) errori.push(`${dove}.nome: "${a.nome}" sembra un selettore CSS`);
  if (a.testo !== undefined && typeof a.testo !== "string") {
    errori.push(`${dove}.testo: deve essere una stringa, trovato ${JSON.stringify(a.testo)}`);
  }
}

function validaIntento(v: unknown, dove: string, errori: string[]): void {
  if (typeof v !== "object" || v === null) {
    errori.push(`${dove}: non e' un oggetto`);
    return;
  }
  const i = v as Record<string, unknown>;
  if (!stringaNonVuota(i.nome)) errori.push(`${dove}.nome: manca o e' vuoto`);
  if (!Array.isArray(i.azioni) || i.azioni.length === 0) {
    errori.push(`${dove}.azioni: serve un elenco non vuoto`);
  } else {
    i.azioni.forEach((a, j) => validaAzione(a, `${dove}.azioni[${j}]`, errori));
  }
  if (i.verifiche !== undefined) {
    if (!Array.isArray(i.verifiche)) errori.push(`${dove}.verifiche: deve essere un elenco`);
    else i.verifiche.forEach((a, j) => validaVerifica(a, `${dove}.verifiche[${j}]`, errori));
  }
}

/**
 * Valida un valore grezzo (da `JSON.parse`) come copione. Lancia
 * `CopioneNonValido` con TUTTI i problemi trovati, non solo il primo.
 */
export function validaCopione(valore: unknown): Copione {
  const errori: string[] = [];

  if (typeof valore !== "object" || valore === null || Array.isArray(valore)) {
    throw new CopioneNonValido(["il copione deve essere un oggetto JSON"]);
  }
  const c = valore as Record<string, unknown>;

  if (c.schema !== 1) {
    errori.push(`schema: atteso 1, trovato ${JSON.stringify(c.schema)}`);
  }
  if (!stringaNonVuota(c.ambiente)) {
    errori.push("ambiente: manca o e' vuoto — deve essere il nome di un ambiente in bdd-targets.json, mai un URL");
  } else if (/^https?:\/\//i.test(c.ambiente)) {
    errori.push(
      `ambiente: "${c.ambiente}" e' un URL diretto. Un copione punta solo a un ambiente NOMINATO e ` +
        `dichiarato di collaudo in bdd-targets.json (difesa 2): un URL diretto non porta nessuna dichiarazione.`
    );
  }
  if (!Array.isArray(c.intenti) || c.intenti.length === 0) {
    errori.push("intenti: serve un elenco non vuoto");
  } else {
    c.intenti.forEach((i, j) => validaIntento(i, `intenti[${j}]`, errori));
  }

  if (errori.length > 0) throw new CopioneNonValido(errori);
  return valore as unknown as Copione;
}

/** Le variabili `${VAR}` usate nei valori di `fill`, nell'ordine in cui compaiono. */
export function variabiliRichieste(copione: Copione): string[] {
  const trovate = new Set<string>();
  for (const intento of copione.intenti) {
    for (const azione of intento.azioni) {
      if (azione.valore === undefined) continue;
      for (const m of azione.valore.matchAll(/\$\{([A-Z0-9_]+)\}/g)) trovate.add(m[1]!);
    }
  }
  return [...trovate];
}

/** Risolve `${VAR}` nei valori di `fill` con le variabili d'ambiente. Non tocca ruolo/nome. */
export function risolviValori(copione: Copione, env: Record<string, string | undefined> = process.env): Copione {
  const espandi = (v: string): string => v.replace(/\$\{([A-Z0-9_]+)\}/g, (_, n: string) => env[n] ?? "");
  return {
    ...copione,
    intenti: copione.intenti.map((i) => ({
      ...i,
      azioni: i.azioni.map((a) => (a.valore !== undefined ? { ...a, valore: espandi(a.valore) } : a)),
    })),
  };
}
