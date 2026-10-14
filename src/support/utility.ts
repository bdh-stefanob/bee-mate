// src/support/utility.ts
// Il registro delle utility: per ognuna, come si riconosce un passo registrato
// che la fa, e quali valori di quel passo ne diventano i parametri.
//
// Puro come avvisi.ts e ricette.ts: lo legge il generatore senza aprire un
// browser. Il riconoscimento e' per identita' (ruolo + nome, o la pagina), mai
// per somiglianza di parole. Completo: il passo e' fatto solo di gesti della
// utility, e il generatore la usa. Parziale: c'e' altro, e la propone soltanto.
//
// Spec: docs/superpowers/specs/2026-10-14-utility-per-comportamento-design.md

/** Un gesto registrato, ridotto a cio' che serve per riconoscere una utility. */
export interface GestoPerUtility {
  action: "click" | "fill" | "set";
  role: string;
  name: string;
  value?: string;
  secret?: boolean;
  url?: string;
  /** L'intestazione visibile sopra il gesto: per il questionario e' la domanda. */
  intestazione?: string;
  /** Il gesto non ha ne' ruolo ne' nome (un pin, un giorno del calendario). */
  senzaAncoraggio?: boolean;
}

export interface UtilityRiconosciuta {
  nome: string;
  /** Percorso del modulo sotto src/, senza estensione: "actions/farmacia.actions". */
  modulo: string;
  funzione: string;
  /** true: il passo e' fatto solo di gesti della utility. false: solo da proporre. */
  completa: boolean;
  /** Valori che diventano {string} nella frase, nell'ordine degli argomenti. */
  parametri: string[];
  /** Righe della tabella Gherkin sotto lo step, intestazione compresa. */
  tabella?: string[][];
}

export interface Utility {
  nome: string;
  modulo: string;
  funzione: string;
  riconosci(gesti: readonly GestoPerUtility[]): UtilityRiconosciuta | null;
}

const percorso = (g: GestoPerUtility): string => {
  try {
    return new URL(g.url ?? "").pathname;
  } catch {
    return "";
  }
};

const pulsante = (nome: RegExp) => (g: GestoPerUtility): boolean => g.role === "button" && nome.test(g.name);

/**
 * Riconoscimento per insieme di componenti: `obbligatori` devono esserci tutti,
 * `ammessi` possono esserci. Qualunque altro gesto rende la coincidenza parziale.
 */
function perComponenti(
  u: Omit<Utility, "riconosci">,
  obbligatori: ReadonlyArray<(g: GestoPerUtility) => boolean>,
  ammessi: ReadonlyArray<(g: GestoPerUtility) => boolean>,
  parametri: (gesti: readonly GestoPerUtility[]) => string[]
): Utility {
  return {
    ...u,
    riconosci(gesti) {
      if (gesti.length === 0 || !obbligatori.every((o) => gesti.some(o))) return null;
      const tutti = [...obbligatori, ...ammessi];
      const completa = gesti.every((g) => tutti.some((t) => t(g)));
      return { ...u, completa, parametri: completa ? parametri(gesti) : [] };
    },
  };
}

const FARMACIA = perComponenti(
  { nome: "farmacia", modulo: "actions/farmacia.actions", funzione: "scegliFarmacia" },
  [(g) => g.role === "textbox" && g.name === "zip" && g.action === "fill", pulsante(/^select pharmacy$/i)],
  // Il pin, quando il registratore lo prende: un pulsante senza nome o un gesto senza ancoraggio.
  [(g) => g.action === "click" && (g.name === "" || Boolean(g.senzaAncoraggio))],
  (gesti) => [gesti.find((g) => g.name === "zip")?.value ?? ""]
);

const PAGAMENTO = perComponenti(
  { nome: "pagamento", modulo: "actions/pagamento.actions", funzione: "paga" },
  [pulsante(/^place order$/i)],
  [pulsante(/expiry/i)],
  () => []
);

const NOMI_FOTO = /^(open camera|take picture|save|that's me|submit)$/i;
const FOTO: Utility = {
  nome: "foto",
  modulo: "actions/foto.actions",
  funzione: "scattaFoto",
  riconosci(gesti) {
    if (gesti.length === 0 || !gesti.some((g) => /\/camera\//.test(percorso(g)))) return null;
    const completa = gesti.every((g) => /\/camera\//.test(percorso(g)) && pulsante(NOMI_FOTO)(g));
    return { nome: this.nome, modulo: this.modulo, funzione: this.funzione, completa, parametri: [] };
  },
};

const QUESTIONARIO: Utility = {
  nome: "questionario",
  modulo: "actions/questionario.actions",
  funzione: "rispondiQuestionario",
  riconosci(gesti) {
    if (gesti.length === 0 || !gesti.some((g) => percorso(g).startsWith("/questions/"))) return null;
    const completa = gesti.every((g) => percorso(g).startsWith("/questions/") && Boolean(g.intestazione));
    if (!completa) return { nome: this.nome, modulo: this.modulo, funzione: this.funzione, completa, parametri: [] };
    // Una riga per domanda, nell'ordine; i numeri della stessa domanda uniti con
    // " / ". Next e Open calendar non sono risposte; un giorno scelto dal
    // calendario (un gesto senza ancoraggio) diventa «oggi».
    const righe = new Map<string, string[]>();
    for (const g of gesti) {
      const domanda = g.intestazione!;
      if (g.senzaAncoraggio) {
        righe.set(domanda, ["oggi"]);
        continue;
      }
      if (/^(next|open calendar)$/i.test(g.name)) continue;
      const gia = righe.get(domanda) ?? [];
      if (g.action === "fill") gia.push(g.value ?? "");
      else gia.splice(0, gia.length, g.name);
      righe.set(domanda, gia);
    }
    const tabella = [["domanda", "risposta"], ...[...righe].map(([d, r]) => [d, r.join(" / ")])];
    return { nome: this.nome, modulo: this.modulo, funzione: this.funzione, completa, parametri: [], tabella };
  },
};

export const UTILITY: readonly Utility[] = [QUESTIONARIO, FARMACIA, PAGAMENTO, FOTO];

/** La prima utility che riconosce il passo; una completa prima di una parziale. */
export function utilityDelPasso(
  gesti: readonly GestoPerUtility[],
  utility: readonly Utility[] = UTILITY
): UtilityRiconosciuta | null {
  const esiti = utility.map((u) => u.riconosci(gesti)).filter((e): e is UtilityRiconosciuta => e !== null);
  return esiti.find((e) => e.completa) ?? esiti[0] ?? null;
}
