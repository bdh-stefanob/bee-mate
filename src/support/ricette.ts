// src/support/ricette.ts
// Gesti che il generatore non sa automatizzare bene da solo.
//
// Un componente senza ruolo ne' nome (`componenteSenzaRuolo`, vedi
// `scripts/lib/component-naming.ts`) produce comunque un metodo che compila e
// gira: clicca il centro del suo rettangolo. Per un pulsante disegnato a mano
// basta. Per il livello che intercetta i clic sopra una mappa non basta: il
// centro di quel livello non e' il pin che il tester voleva, e cliccarlo non
// sceglie niente.
//
// UNA RICETTA E' PROPOSTA, MAI APPLICATA DA SOLA. Il generatore non sostituisce
// il gesto grezzo con la ricetta: lo dichiara (un buco "ricetta-disponibile" nel
// rapporto di generazione, sullo stesso canale di "ancoraggio-instabile") e
// lascia a una persona la scelta. Un ciclo sbagliato o un clic sbagliato
// costano piu' di un gesto grezzo lasciato com'e' (lo stesso principio del
// punto 1 di G2 per la ripetizione-in-ciclo).
//
// COME SI RICONOSCE: per IDENTITA', mai per somiglianza di testo — lo stesso
// vocabolario del probe del DOM (`role` + `name`, dove `name` per un componente
// senza ruolo e' gia' classe/id/tag: vedi `componenteSenzaRuolo`), esattamente
// come fa `avvisoDelGesto` in `avvisi.ts` per gli avvisi. Una ricetta non si
// riconosce da "sembra una mappa" o da una classe CSS simile: si riconosce da
// un ruolo e un nome che corrispondono esattamente a quelli osservati la prima
// volta su un caso vero.

export interface RiconoscimentoRicetta {
  role: string;
  /** Identita' esatta (classe, id o tag sintetizzato): mai un'espressione di somiglianza. */
  name: string;
}

export interface Ricetta {
  nome: string;
  /** Come si riconosce un gesto che le assomiglia: lo stesso vocabolario del probe del DOM. */
  riconoscimento: RiconoscimentoRicetta;
  /** Dove sta scritta, per il messaggio a chi legge il rapporto. */
  dove: string;
  /** Perche' serve una ricetta qui, invece del codice generato normale. */
  nota: string;
}

export const RICETTE: readonly Ricetta[] = [
  {
    nome: "scelta-su-mappa",
    // "map-overlay" e' il nome che componenteSenzaRuolo sintetizza per un
    // elemento senza ruolo ne' classe ma con un id (vedi component-naming.ts):
    // il livello trasparente che intercetta i clic sopra una mappa, non il pin.
    riconoscimento: { role: "", name: "map-overlay" },
    dove: "src/actions/mappa.actions.ts",
    nota:
      "un livello sopra la mappa intercetta i clic e fa il proprio hit-test: il generatore " +
      "puo' solo cliccare il centro di quel livello, non sa scegliere il pin giusto. " +
      "La ricetta clicca il pin stesso, scelto per indice.",
  },
];

/**
 * Il gesto registrato assomiglia a una ricetta nota?
 *
 * Pura: la chiama il generatore, senza aprire nessun browser. Confronta
 * l'identita' (ruolo + nome), mai il testo di una nota o di un selettore —
 * esattamente come `avvisoDelGesto` per gli avvisi.
 */
export function ricettaDelGesto(
  gesto: { role: string; name: string },
  ricette: readonly Ricetta[] = RICETTE
): Ricetta | null {
  return (
    ricette.find(
      (r) => r.riconoscimento.role === gesto.role && r.riconoscimento.name === gesto.name
    ) ?? null
  );
}
