/**
 * lib/stability.ts
 * ----------------
 * Giudizio su quanto ci si puo' fidare del nome accessibile di un componente.
 *
 * PERCHE' STA IN UN POSTO SOLO
 * Lo usano lo **scout**, che inventaria i componenti di una pagina, e il
 * **recorder**, che deve avvertire il tester quando registra un'asserzione
 * ancorata a qualcosa che cambiera'. Un esempio visto sul campo: il badge del
 * carrello si chiama "1", cioe' il conteggio degli articoli. Come verifica ha
 * senso; come locator si rompe al secondo prodotto. Se i due strumenti
 * giudicassero con criteri diversi, lo scout marcherebbe fragile un componente
 * che il recorder ha registrato come se fosse solido.
 */

export type Stability = "stable" | "ambiguous" | "unstable" | "unnamed";

/**
 * Nomi che cambiano da esecuzione a esecuzione: un locator costruito su questi
 * si rompe al primo dato diverso. Vanno segnalati, non scartati — il componente
 * esiste, e' il modo di raggiungerlo che va scelto a mano.
 */
const UNSTABLE_PATTERNS: Array<{ re: RegExp; why: string }> = [
  { re: /\d{2}[\/.-]\w{2,3}[\/.-]\d{2,4}/, why: "contiene una data" },
  { re: /\b\d{4,}\b/, why: "contiene un identificativo numerico" },
  { re: /[\w.+-]+@[\w-]+\.\w+/, why: "contiene un indirizzo email" },
  { re: /^\s*[£$€]\s?[\d.,]+/, why: "contiene un importo" },
  { re: /^\d+\s*(items?|risultati|results?)/i, why: "contiene un conteggio" },
  // Un nome fatto di sole cifre e' quasi sempre un contatore o un importo: il
  // badge di un carrello si chiama "1", e al secondo articolo si chiama "2".
  // Come verifica ha senso, come locator no.
  { re: /^[\d.,\s]+$/, why: "il nome e' solo un numero: e' un valore che cambia, non un'identita'" },
];

/**
 * Nomi che assomigliano a un dato variabile ma non lo sono.
 *
 * Un numero di telefono contiene un gruppo lungo di cifre e viene preso dalla
 * regola sugli identificativi numerici — ma e' fisso: e' l'etichetta stessa del
 * pulsante, non un valore che cambia fra un'esecuzione e l'altra. Visto due
 * volte su pagine vere.
 *
 * Perche' vale la pena l'eccezione: un avviso che sbaglia insegna a ignorare gli
 * avvisi. L'elenco "da rivedere a mano" vale solo se ogni riga merita di essere
 * guardata.
 */
const FALSI_ALLARMI: Array<{ re: RegExp; why: string }> = [
  { re: /(?:tel|phone|telefono|call)/i, why: "numero di telefono: e' un'etichetta fissa" },
  { re: /^\s*\+?\d[\d\s().-]{7,17}\s*$/, why: "numero di telefono: e' un'etichetta fissa" },
];

/**
 * Il nome accessibile e' un indirizzo web.
 *
 * Succede sui riferimenti bibliografici: il testo del link E' l'URL. Come
 * ancoraggio non e' instabile — quell'indirizzo non cambia fra un'esecuzione e
 * l'altra — ma le regole sugli identificativi e sulle date lo prendevano lo
 * stesso, e davano il motivo SBAGLIATO: "contiene una data" su un DOI manda a
 * cercare un problema che non c'e'.
 *
 * Va segnalato comunque, per un motivo diverso e piu' interessante: uno screen
 * reader legge quel nome per intero, carattere per carattere. E' il tipo di
 * difetto che questo strumento trova per caso e che vale piu' dell'automazione.
 */
const URL_COME_NOME = /^\s*(https?:\/\/|www\.)\S+\s*$/i;

export function judge(name: string, occurrences: number): { stability: Stability; notes: string[] } {
  const notes: string[] = [];

  if (!name) {
    return {
      stability: "unnamed",
      notes: ["nessun nome accessibile: non raggiungibile per ruolo+nome, e probabilmente invisibile a uno screen reader"],
    };
  }
  // Un segnaposto mascherato non e' un nome: e' il valore nascosto. Succede sui
  // campi password, dove il segnaposto e' una fila di pallini — e cercare un
  // campo per il suo mascheramento vuol dire non trovarlo mai.
  if (/^[•●·*.\s]+$/.test(name)) {
    return {
      stability: "unnamed",
      notes: ["il nome e' un segnaposto mascherato (pallini o asterischi): non e' un'identita'"],
    };
  }
  if (name.length > 80) {
    notes.push("nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo");
  }
  if (URL_COME_NOME.test(name)) {
    // Un motivo solo, e quello giusto: impilarci sopra "contiene una data"
    // manderebbe a cercare un problema inesistente.
    notes.push(
      "il nome accessibile e' un indirizzo web: uno screen reader lo legge per intero. " +
        "Come ancoraggio tiene, ma il link andrebbe scritto con un testo leggibile"
    );
  } else if (!FALSI_ALLARMI.some(({ re }) => re.test(name))) {
    for (const { re, why } of UNSTABLE_PATTERNS) {
      if (re.test(name)) notes.push(why);
    }
  }
  if (occurrences > 1) {
    notes.push(`${occurrences} elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro`);
    return { stability: "ambiguous", notes };
  }
  if (notes.length > 0) return { stability: "unstable", notes };
  return { stability: "stable", notes: [] };
}

