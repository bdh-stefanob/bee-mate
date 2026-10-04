/**
 * lib/copione-difese.ts
 * -----------------------
 * Le cinque difese che impediscono a un copione di diventare un modo di
 * scrivere test senza averli mai eseguiti a mano (N10, spec
 * `2026-10-01-assistente-nel-cruscotto-design.md` sezione 5(a), decisione
 * Q-A7). Ognuna da sola ha un buco: servono tutte e cinque insieme.
 *
 * Questo file raccoglie le difese che si esprimono come **funzioni pure**
 * (2, 3, 4, 5): niente browser, niente file system, cosi' si possono provare
 * con un caso solo. La difesa 1 (provenienza nella traccia) non e' qui: vive
 * nel tipo `Recording` (`generation-contract.ts`) e in chi lo produce
 * (`copione.ts`) e lo legge (`generate.ts`).
 */

import type { Target } from "./targets";

export class AmbienteNonAmmesso extends Error {}

/**
 * Difesa 2 — solo ambienti di collaudo, mai presunti.
 *
 * Un ambiente con `produzione: true` e' rifiutato SUBITO, anche se ha anche
 * `collaudo: true`: questo segno non si allenta per nessun ambiente. Un
 * ambiente senza `collaudo: true` esplicito e' "non di collaudo" di default —
 * il silenzio non e' un si'.
 */
export function verificaAmbienteDiCollaudo(target: Target): void {
  if (target.produzione) {
    throw new AmbienteNonAmmesso(
      `l'ambiente "${target.name}" e' dichiarato di PRODUZIONE (produzione: true in bdd-targets.json): ` +
        `un copione non puo' girare li', per nessun motivo.`
    );
  }
  if (!target.collaudo) {
    throw new AmbienteNonAmmesso(
      `l'ambiente "${target.name}" non e' dichiarato di collaudo. Un copione gira solo contro un ambiente ` +
        `con "collaudo": true nel suo blocco di bdd-targets.json, scritto dalla persona che lo amministra — ` +
        `mai presunto dal nome o dall'indirizzo.`
    );
  }
}

/**
 * Difesa 5 — conferma umana prima di un ambiente non pubblico.
 *
 * Non decide DA SOLA se l'esecuzione puo' partire: dice solo se serve una
 * conferma. Chi chiama (`record.ts`) decide cosa fare quando serve e non c'e'
 * (di norma: non partire — nessun avvio non presidiato contro un ambiente
 * aziendale).
 */
export function richiedeConfermaUmana(target: Target): boolean {
  return !target.pubblico;
}

/**
 * Impronta di un valore: solo per TRACCIARE una decisione, non per
 * nasconderla. Mai l'indirizzo (la spec lo vieta esplicitamente nella traccia):
 * questa funzione riceve il blocco intero dell'ambiente e produce una stringa
 * corta e stabile, buona per accorgersi che la dichiarazione e' cambiata senza
 * portare l'indirizzo dentro la traccia.
 */
export function impronta(valore: unknown): string {
  // Senza una dipendenza di hashing: la stessa idea di `dom-probe`/`inventory`,
  // una funzione piccola e deterministica invece di una libreria per un solo
  // uso. Non e' crittografico: serve a distinguere, non a proteggere.
  const testo = JSON.stringify(valore);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < testo.length; i++) {
    const c = testo.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = (Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)) >>> 0;
  h2 = (Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)) >>> 0;
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

/**
 * L'impronta del blocco di un ambiente (difesa 2, tracciata): tutto tranne
 * l'URL, che la spec vieta esplicitamente di portare nella traccia.
 */
export function improntaAmbiente(target: Target): string {
  const { url: _url, session: _session, ...senzaIndirizzo } = target;
  return impronta(senzaIndirizzo);
}

/**
 * Difesa 4 — l'uscita sta fuori da `src/`.
 *
 * Una registrazione `origine: "copione"` non puo' generare dentro `src/`: li'
 * la generazione aggiorna anche il catalogo (`npm run catalog`), e un copione
 * — scritto magari da un modello — non deve poter sporcare ne' il catalogo ne'
 * entrare come scenario versionato (quello lo impedisce la difesa 3, al
 * salvataggio; questa impedisce gia' che il file nasca li').
 */
export function verificaFuoriDaSrc(origine: "persona" | "copione" | undefined, outRoot: string): void {
  if (origine !== "copione") return;
  const normalizzato = outRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  if (normalizzato === "src" || normalizzato.startsWith("src/")) {
    throw new AmbienteNonAmmesso(
      `una registrazione da copione non puo' generare dentro "${outRoot}": l'uscita di un copione sta ` +
        `fuori da src/ (per esempio out=reports/collaudo/<nome>). Dentro src/ il generatore aggiorna anche ` +
        `il catalogo, e un copione non deve poterlo sporcare.`
    );
  }
}

/**
 * Difesa 3 — il salvataggio rifiuta.
 *
 * Non importa quanto l'ambiente fosse di collaudo: una registrazione
 * `origine: "copione"` non entra MAI in `src/features/<app>/`. Questa difesa
 * non si allenta per nessun ambiente (nemmeno `pubblico`).
 */
export function verificaSalvabile(origine: "persona" | "copione" | undefined): void {
  if (origine === "copione") {
    throw new AmbienteNonAmmesso(
      `uno scenario nato da un copione non si salva nel repository: nessuna persona lo ha mai eseguito ` +
        `a mano, ed e' esattamente il contrario di Specification by Demonstration. Puo' essere generato ` +
        `ed eseguito (serve a provare la catena), ma non entra in src/features/<app>/.`
    );
  }
}
