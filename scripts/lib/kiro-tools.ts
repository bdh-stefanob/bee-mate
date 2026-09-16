/**
 * kiro-tools.ts
 * -------------
 * I nomi degli strumenti che un agente puo' dichiarare.
 *
 * L'INCIDENTE CHE HA SCRITTO QUESTO FILE (2026-09-16)
 * La copia Kiro degli agenti veniva generata traducendo i nomi: `fs_read` →
 * `read`, `fs_write` → `write`, `execute_bash` → `shell`. Quei nomi non
 * esistono. Sulla macchina aziendale l'agente **di sola lettura** ha eseguito
 * `echo prova > prova-agente.txt` e ha creato il file: con un nome che non
 * riconosce, l'engine non nega — **concede**, e ricade sui suoi default.
 *
 * La scrittura non e' passata solo perche' lo strumento tradotto risultava un
 * segnaposto vuoto ("No tool with dummy is found"): il limite ha retto per un
 * nostro errore, non per una nostra difesa. Su questo si sarebbe detto in
 * presentazione "una regola orienta, un agente impedisce", e sarebbe stato
 * falso.
 *
 * Quindi: nessuna traduzione. Gli strumenti si chiamano allo stesso modo nelle
 * due versioni, e un nome fuori da questa lista ferma la generazione invece di
 * arrivare all'engine e farsi ignorare in silenzio.
 *
 * E NON BASTA — verificato subito dopo, sulla stessa macchina. Anche con i nomi
 * giusti, `"tools": ["fs_read"]` non toglie `execute_cmd`: lo strumento resta
 * disponibile. A fermarlo e' l'**approvazione**, perche' non sta in
 * `allowedTools` e in modalita' non interattiva viene rifiutato. Dichiarare il
 * minimo serve — ogni strumento fuori da `allowedTools` richiede un si' umano —
 * ma la garanzia si enuncia "non scrive senza approvazione", mai "non puo'".
 *
 * La lista viene dalla documentazione di Kiro, interrogata con l'agente
 * `kiro_help` (`kiro-cli chat --agent kiro_help`). Se una versione futura ne
 * aggiunge, si aggiungono qui — dopo averlo verificato, non per somiglianza.
 */

export const KIRO_TOOLS: readonly string[] = [
  "fs_read",
  "fs_write",
  "execute_bash",
  "grep",
  "glob",
  "code",
  "use_aws",
  "gh_issue",
  "introspect",
  "knowledge",
  "thinking",
  "todo_list",
  "delegate",
  "use_subagent",
];

/**
 * Restituisce gli strumenti cosi' come sono, se esistono tutti.
 *
 * Non traduce niente: e' la traduzione ad aver tolto il limite a un agente che
 * si chiamava "di sola lettura". Fallisce forte, perche' il modo in cui questo
 * difetto si manifesta e' silenzioso — l'agente funziona, e puo' fare di piu'
 * di quello che dichiara.
 */
export function validaStrumenti(tools: readonly string[], dove: string): string[] {
  for (const t of tools) {
    if (!KIRO_TOOLS.includes(t)) {
      throw new Error(
        `${dove}: strumento sconosciuto "${t}".\n` +
          `  Nomi validi: ${KIRO_TOOLS.join(", ")}\n` +
          `  Un nome che l'engine non riconosce non viene rifiutato: viene\n` +
          `  ignorato, e l'agente si ritrova i permessi di default — cioe'\n` +
          `  senza il limite che lo definisce. E' gia' successo.`
      );
    }
  }
  return [...tools];
}
