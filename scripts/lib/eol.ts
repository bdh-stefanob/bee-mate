/**
 * eol.ts
 * ------
 * I fine riga non sono contenuto.
 *
 * PERCHE' ESISTE
 * Su Windows git converte spesso LF in CRLF quando scrive i file nella copia di
 * lavoro. Un confronto byte a byte fra un file generato e quello che ci si
 * aspetta dichiara allora "disallineati" nove file appena clonati, senza che
 * nessuno abbia toccato niente.
 *
 * E' successo davvero: `npm run rules:check` su una macchina nuova ha elencato
 * tutte le regole e tutti gli agenti come da rigenerare. Il danno non e' il
 * messaggio sbagliato, e' l'abitudine: un avviso che sbaglia insegna a ignorare
 * gli avvisi, e il giorno in cui una regola e' davvero disallineata nessuno ci
 * crede piu'.
 *
 * Chi confronta due testi che possono venire da un checkout git confronta il
 * testo, non i fine riga.
 */

/** Riporta i fine riga a LF. Un `\r` isolato non e' un fine riga: resta com'e'. */
export function normalizzaFineRiga(testo: string): string {
  return testo.replace(/\r\n/g, "\n");
}

/** Due testi che differiscono solo per i fine riga sono lo stesso testo. */
export function stessoTesto(a: string, b: string): boolean {
  return normalizzaFineRiga(a) === normalizzaFineRiga(b);
}
