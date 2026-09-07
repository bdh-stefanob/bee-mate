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

export function judge(name: string, occurrences: number): { stability: Stability; notes: string[] } {
  const notes: string[] = [];

  if (!name) {
    return {
      stability: "unnamed",
      notes: ["nessun nome accessibile: non raggiungibile per ruolo+nome, e probabilmente invisibile a uno screen reader"],
    };
  }
  if (name.length > 80) {
    notes.push("nome molto lungo: probabilmente e' il testo di un contenitore, non del controllo");
  }
  for (const { re, why } of UNSTABLE_PATTERNS) {
    if (re.test(name)) notes.push(why);
  }
  if (occurrences > 1) {
    notes.push(`${occurrences} elementi con lo stesso ruolo e nome: il locator non e' univoco, servira' .nth() o un filtro`);
    return { stability: "ambiguous", notes };
  }
  if (notes.length > 0) return { stability: "unstable", notes };
  return { stability: "stable", notes: [] };
}

