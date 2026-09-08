/**
 * lib/gold.ts
 * -----------
 * La **matrice di risoluzione**: dato un gruppo di formulazioni equivalenti,
 * calcola quale merita di diventare la forma canonica ("Gold").
 *
 * IL MODELLO DI GOVERNANCE CHE SERVE
 * Ognuno scrive come vuole. Le varianti non vengono bloccate: vengono
 * registrate con il loro collegamento (dove sono scritte, quale componente
 * toccano). A tempo debito si elegge la Gold e si riscrivono tutte le
 * occorrenze in un colpo solo.
 *
 * Il vantaggio e' che nessuno aspetta un'approvazione per lavorare, e il
 * gatekeeper esce dal percorso critico. Il prezzo e' che **l'entropia cresce
 * prima di calare**, quindi la misura non e' piu' un accessorio: e' l'unica
 * cosa che distingue "sta convergendo" da "abbiamo costruito un raccoglitore
 * di varianti".
 *
 * PERCHE' IL PUNTEGGIO E' IN CHIARO
 * Le colonne e i pesi sono esposti nell'output, variante per variante. Chi
 * approva deve poter dire "no, la seconda e' migliore" e capire perche' il
 * calcolo diceva altrimenti. Se il punteggio decidesse da solo, avremmo messo
 * la governance del linguaggio in mano a uno script — l'esatto contrario di
 * quello che questo progetto sostiene.
 */

/** Peso di ciascun criterio. Somma 1. */
export interface GoldWeights {
  /** Quante volte e' stata scritta. */
  occurrences: number;
  /** In quante aree diverse. Il segnale piu' forte di vocabolario condiviso. */
  distinctAreas: number;
  /** Quanto rispetta le convenzioni (dichiarativa, parametrizzata, no meccanica UI). */
  conformity: number;
  /** Se e' agganciata a componenti di frontend reali. */
  componentLink: number;
}

export const DEFAULT_WEIGHTS: GoldWeights = {
  // Frequenza e diffusione pesano uguale, di proposito: una frase scritta 40
  // volte da una sola persona vale quanto una scritta 8 volte da quattro aree.
  // La seconda e' gia' vocabolario condiviso, la prima e' solo un'abitudine.
  occurrences: 0.3,
  distinctAreas: 0.3,
  // La conformita' pesa quanto le altre due: una formulazione molto usata ma
  // imperativa non deve diventare lo standard solo perche' e' diffusa. E'
  // esattamente cosi' che l'entropia si cristallizza.
  conformity: 0.3,
  componentLink: 0.1,
};

/**
 * Verbi di meccanica UI. Una frase che li usa descrive i click, non
 * l'intenzione: e' Gherkin imperativo, e non deve vincere per frequenza.
 */
const UI_MECHANICS = [
  "click", "clicks", "clicking", "press", "presses", "tap", "taps",
  "select the button", "selects the button", "scroll", "scrolls", "hover",
  "type into", "types into", "enter into", "enters into", "drag", "drops",
  "double-click", "right-click", "checkbox", "dropdown", "radio button",
  "clicca", "preme", "seleziona il pulsante", "digita nel campo",
];

export interface ConformityBreakdown {
  score: number;
  reasons: string[];
}

/**
 * Quanto una formulazione rispetta le convenzioni. 0..1.
 *
 * Non pretende di giudicare la qualita' della lingua: riconosce i due difetti
 * che contano davvero e che si vedono meccanicamente — la meccanica UI dentro
 * il Gherkin, e la mancata parametrizzazione.
 */
export function conformity(text: string): ConformityBreakdown {
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  let score = 1;

  const mechanics = UI_MECHANICS.filter((m) => lower.includes(m));
  if (mechanics.length > 0) {
    score -= 0.4;
    reasons.push(`meccanica UI: ${mechanics.slice(0, 3).join(", ")}`);
  }

  if (text.length > 90) {
    score -= 0.2;
    reasons.push(`lunga ${text.length} caratteri: probabilmente due passi in uno`);
  }

  // Una frase con un parametro copre N casi al posto di N frasi quasi identiche.
  if (/\{(string|int|float|date)\}/.test(text)) {
    score += 0.1;
    reasons.push("parametrizzata");
  }

  // Un letterale fra virgolette non mascherato e' un parametro mancato.
  if (/["'“”][^"'“”]{2,}["'“”]/.test(text) && !/\{/.test(text)) {
    score -= 0.15;
    reasons.push("contiene un valore letterale: andrebbe parametrizzato");
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

export interface Candidate {
  text: string;
  occurrences: number;
  /** Aree (rami) distinte in cui compare. */
  areas: string[];
  /** Componenti di frontend collegati, se noti. */
  components?: Array<{ role: string; name: string }>;
}

export interface ScoredCandidate extends Candidate {
  score: number;
  /** Punteggio per criterio, gia' normalizzato 0..1. Esposto per la revisione. */
  breakdown: {
    occurrences: number;
    distinctAreas: number;
    conformity: number;
    componentLink: number;
  };
  conformityReasons: string[];
}

/**
 * Ordina i candidati di un gruppo, dal piu' adatto a diventare Gold.
 *
 * Frequenza e diffusione sono normalizzate sul massimo del GRUPPO, non su
 * valori assoluti: la domanda e' "quale di queste", non "quanto e' buona in
 * assoluto".
 */
export function electGold(
  candidates: readonly Candidate[],
  weights: GoldWeights = DEFAULT_WEIGHTS
): ScoredCandidate[] {
  if (candidates.length === 0) return [];

  const maxOcc = Math.max(...candidates.map((c) => c.occurrences), 1);
  const maxAreas = Math.max(...candidates.map((c) => c.areas.length), 1);

  const scored = candidates.map((c) => {
    const conf = conformity(c.text);
    const breakdown = {
      occurrences: c.occurrences / maxOcc,
      distinctAreas: c.areas.length / maxAreas,
      conformity: conf.score,
      componentLink: (c.components?.length ?? 0) > 0 ? 1 : 0,
    };

    const score =
      breakdown.occurrences * weights.occurrences +
      breakdown.distinctAreas * weights.distinctAreas +
      breakdown.conformity * weights.conformity +
      breakdown.componentLink * weights.componentLink;

    return { ...c, score, breakdown, conformityReasons: conf.reasons };
  });

  // A parita' di punteggio vince la piu' usata: e' la meno traumatica da
  // adottare, perche' e' quella che piu' persone stanno gia' scrivendo.
  return scored.sort((a, b) => b.score - a.score || b.occurrences - a.occurrences);
}

/**
 * Quanto e' netta la vittoria. Serve a distinguere i casi da approvare in
 * blocco da quelli che meritano una discussione.
 *
 * Un distacco piccolo significa che due formulazioni si equivalgono: e' proprio
 * la' che il giudizio umano vale, e presentarlo come una decisione gia' presa
 * sarebbe disonesto.
 */
export function margin(scored: readonly ScoredCandidate[]): number {
  if (scored.length < 2) return 1;
  return (scored[0]!.score - scored[1]!.score);
}
