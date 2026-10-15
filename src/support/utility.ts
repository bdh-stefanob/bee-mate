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
  /** Argomenti che vengono dallo scenario, non dalla registrazione (la password). */
  argomentiDalMondo?: string[];
}

export interface Utility {
  nome: string;
  modulo: string;
  funzione: string;
  /** Il singolo gesto appartiene a questa utility? Serve a dividere un passo misto in tratti. */
  contiene(g: GestoPerUtility): boolean;
  riconosci(gesti: readonly GestoPerUtility[]): UtilityRiconosciuta | null;
}

const percorso = (g: GestoPerUtility): string => {
  try {
    return new URL(g.url ?? "").pathname;
  } catch {
    return "";
  }
};

/**
 * Le utility usano le Page Object di `src/pages/clinic/`: valgono solo per i
 * gesti registrati su clinic (qa-clinic.*), non per un'altra applicazione che
 * abbia indirizzi simili — l'app finta ha anch'essa /questions/, con pagine
 * diverse, e la utility andava in timeout (15/10).
 */
const diClinic = (g: GestoPerUtility): boolean => {
  try {
    return /(^|\.)qa-(clinic|brochure)\./.test(new URL(g.url ?? "").host);
  } catch {
    return false;
  }
};

const pulsante = (nome: RegExp) => (g: GestoPerUtility): boolean => g.role === "button" && nome.test(g.name);

/**
 * Riconoscimento per insieme di componenti: `obbligatori` devono esserci tutti,
 * `ammessi` possono esserci. Qualunque altro gesto rende la coincidenza parziale.
 */
function perComponenti(
  u: Omit<Utility, "riconosci" | "contiene"> & { argomentiDalMondo?: string[] },
  obbligatori: ReadonlyArray<(g: GestoPerUtility) => boolean>,
  ammessi: ReadonlyArray<(g: GestoPerUtility) => boolean>,
  parametri: (gesti: readonly GestoPerUtility[]) => string[],
  pagina?: RegExp
): Utility {
  const tutti = [...obbligatori, ...ammessi];
  return {
    ...u,
    contiene: (g) => (!pagina || pagina.test(percorso(g))) && tutti.some((t) => t(g)),
    riconosci(gesti) {
      if (gesti.length === 0 || !obbligatori.every((o) => gesti.some(o))) return null;
      const completa = gesti.every((g) => tutti.some((t) => t(g)));
      return { ...u, completa, parametri: completa ? parametri(gesti) : [] };
    },
  };
}

const FARMACIA = perComponenti(
  { nome: "farmacia", modulo: "actions/farmacia.actions", funzione: "scegliFarmacia" },
  [(g) => g.role === "textbox" && g.name === "zip" && g.action === "fill", pulsante(/^select pharmacy$/i)],
  // Il pin, quando il registratore lo prende: un pulsante senza nome o un gesto senza ancoraggio.
  [
    (g) => g.action === "click" && (g.name === "" || Boolean(g.senzaAncoraggio)),
    // Chiudere la scheda di una farmacia prima di sceglierne un'altra (Hair loss, 15/10).
    pulsante(/^close$/i),
  ],
  (gesti) => [gesti.find((g) => g.name === "zip")?.value ?? ""],
  // Il pin ammesso e' un clic senza nome: fuori dalla pagina della mappa non lo e'.
  /^\/pharmacy-map-selection/
);

const PAGAMENTO = perComponenti(
  { nome: "pagamento", modulo: "actions/pagamento.actions", funzione: "paga" },
  // Solo la carta salvata (revisione del 15/10): con la carta digitata negli
  // iframe di Stripe la utility cercava una carta salvata che non c'e', e un
  // primo ordine registrato falliva. Quel caso resta generato.
  [pulsante(/^place order$/i), pulsante(/expiry/i)],
  [],
  () => []
);

const NOMI_FOTO = /^(open camera|take picture|save|that's me|submit)$/i;
const FOTO: Utility = {
  nome: "foto",
  modulo: "actions/foto.actions",
  funzione: "scattaFoto",
  contiene: (g) => /\/camera\//.test(percorso(g)) && pulsante(NOMI_FOTO)(g),
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
  contiene: (g) => percorso(g).startsWith("/questions/"),
  riconosci(gesti) {
    if (gesti.length === 0 || !gesti.some((g) => percorso(g).startsWith("/questions/"))) return null;
    const completa = gesti.every((g) => percorso(g).startsWith("/questions/"));
    if (!completa) return { nome: this.nome, modulo: this.modulo, funzione: this.funzione, completa, parametri: [] };
    // Una riga per domanda, nell'ordine; i numeri della stessa domanda uniti con
    // " / ". Next e Open calendar non sono risposte; un giorno scelto dal
    // calendario (un gesto senza ancoraggio) diventa «oggi».
    // Un gesto senza intestazione (il giorno nel calendario) appartiene alla
    // domanda del gesto prima.
    const righe = new Map<string, string[]>();
    let ultima = "";
    for (const g of gesti) {
      const domanda = g.intestazione ?? ultima;
      ultima = domanda;
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

// L'accesso del paziente: dalla brochure al modulo di login. Dopo l'accesso il
// sito porta a volte all'account, a volte allo storico delle consultazioni
// (dipende dagli ordini dell'utenza): la utility riporta sempre all'account,
// dove la registrazione proseguiva (prova del 15/10). La password non e' mai
// nella registrazione: la chiede l'ambiente.
const ACCESSO = perComponenti(
  {
    nome: "accesso",
    modulo: "actions/servizio-weight-loss.actions",
    funzione: "accediAClinic",
    argomentiDalMondo: ["this.passwordAmbiente()"],
  },
  [
    (g) => g.role === "textbox" && g.name === "Email" && g.action === "fill",
    (g) => g.action === "fill" && Boolean(g.secret),
    (g) => pulsante(/^log in$/i)(g) && /\/login/.test(percorso(g)),
  ],
  [pulsante(/^log in$/i)],
  (gesti) => [gesti.find((g) => g.name === "Email")?.value ?? ""]
);

// LA SCELTA DEL PRODOTTO (Hair loss, 15/10). La pagina ha piu' schede prodotto
// (Finasteride, Propecia, ...), ognuna con le sue durate o dosi, le sue formule e
// il suo «Select»; i locator generati cercavano su tutta la pagina e colpivano la
// prima scheda. E il tester prova prima di decidere (Bundle, No-bundle, 2 mesi,
// 1 mese, di nuovo No-bundle). La utility lavora nella scheda del titolo
// registrato sopra i gesti, e tiene solo le scelte finali: l'ultima durata o
// dose (un nome che comincia con un numero) e l'ultima formula, senza prezzi.
const senzaPrezzi = (nome: string): string => nome.replace(/£\s?[\d.,]+/g, "").replace(/\s+/g, " ").trim();
const PRODOTTO: Utility = {
  nome: "prodotto",
  modulo: "actions/prodotto.actions",
  funzione: "scegliProdotto",
  contiene: (g) =>
    percorso(g).startsWith("/products/") && ((g.action === "click" && g.role === "button") || g.action === "set"),
  riconosci(gesti) {
    if (gesti.length === 0 || !gesti.some((g) => percorso(g).startsWith("/products/"))) return null;
    const base = { nome: this.nome, modulo: this.modulo, funzione: this.funzione };
    const conSelect = gesti.some(pulsante(/^select$/i));
    const completa = conSelect && gesti.every((g) => this.contiene(g));
    if (!completa) return { ...base, completa: false, parametri: [] };
    const scheda = gesti.find((g) => g.intestazione)?.intestazione ?? "";
    const scelte = gesti.filter((g) => g.action === "click" && !/^select$/i.test(g.name)).map((g) => senzaPrezzi(g.name));
    const dose = [...scelte].reverse().find((s) => /^\d/.test(s));
    const formula = [...scelte].reverse().find((s) => s !== "" && !/^\d/.test(s));
    return { ...base, completa: true, parametri: [scheda, ...(dose ? [dose] : []), ...(formula ? [formula] : [])] };
  },
};

export const UTILITY: readonly Utility[] = [QUESTIONARIO, FARMACIA, PAGAMENTO, FOTO, ACCESSO, PRODOTTO];

/** La prima utility che riconosce il passo; una completa prima di una parziale. */
export function utilityDelPasso(
  gesti: readonly GestoPerUtility[],
  utility: readonly Utility[] = UTILITY
): UtilityRiconosciuta | null {
  if (gesti.length === 0 || !gesti.every(diClinic)) return null;
  const esiti = utility.map((u) => u.riconosci(gesti)).filter((e): e is UtilityRiconosciuta => e !== null);
  return esiti.find((e) => e.completa) ?? esiti[0] ?? null;
}

/** Un tratto di un passo: gesti [da, a) fatti da una utility, o generati (utility null). */
export interface Tratto {
  da: number;
  a: number;
  utility: UtilityRiconosciuta | null;
}

/**
 * Divide i gesti di un passo in tratti contigui (spec del 14/10, decisione del
 * 15/10). Il tester chiude i passi dove vuole: «insert the dose» comincia con
 * la casella delle informazioni importanti e finisce dentro il questionario.
 * Ogni gesto appartiene alla prima utility che lo contiene; gesti vicini della
 * stessa utility fanno un tratto, che vale solo se la utility lo riconosce per
 * intero. Il resto resta generato com'e'.
 */
export function segmentaPasso(gesti: readonly GestoPerUtility[], utility: readonly Utility[] = UTILITY): Tratto[] {
  const proprietario = gesti.map((g) => (diClinic(g) ? utility.find((u) => u.contiene(g)) ?? null : null));
  const tratti: Tratto[] = [];
  let i = 0;
  while (i < gesti.length) {
    const u = proprietario[i];
    let j = i + 1;
    while (j < gesti.length && proprietario[j] === u) j++;
    const riconosciuta = u ? u.riconosci(gesti.slice(i, j)) : null;
    const tratto: Tratto = { da: i, a: j, utility: riconosciuta?.completa ? riconosciuta : null };
    const prima = tratti[tratti.length - 1];
    // Due tratti generati vicini sono un tratto solo.
    if (prima && prima.utility === null && tratto.utility === null) prima.a = j;
    else tratti.push(tratto);
    i = j;
  }
  return tratti;
}
