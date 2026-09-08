/**
 * lib/generation-contract.ts
 * --------------------------
 * **Il contratto della generazione.** Cosa entra, cosa esce, e chi produce cosa.
 *
 * PERCHE' ESISTE UN FILE SOLO PER I TIPI
 * Il generatore, il recorder, lo scout e l'assistente AI parlano tutti degli
 * stessi oggetti. Finche' ognuno se li ridichiarava in casa, due copie potevano
 * divergere — e divergendo avrebbero rotto proprio l'aggancio fra "cosa ha
 * toccato il tester" e "quale componente e' quello", che e' il perno del metodo.
 * E' la stessa ragione per cui esiste `dom-probe.ts`.
 *
 * LA DIVISIONE DEL LAVORO, CHE E' LA DECISIONE PIU' IMPORTANTE QUI
 * ----------------------------------------------------------------
 * Quasi niente di cio' che serve generare ha bisogno di un modello:
 *
 *     scheletro della Page Object       DETERMINISTICO   dall'URL
 *     un metodo per componente          DETERMINISTICO   dal dizionario (1:1)
 *     assertLoaded()                    DETERMINISTICO   dalle asserzioni registrate
 *     glue delle step definition        DETERMINISTICO   e' codice a forma fissa
 *     --------------------------------------------------------------------------
 *     la frase Gherkin                  AI               vincolata al catalogo
 *     intento -> quali metodi chiamare  AI               vincolata ai metodi generati
 *
 * Le ultime due righe sono le sole in cui serve giudizio. Tutto il resto e'
 * sostituzione di stringhe su uno scheletro, e va fatto senza AI: deterministico
 * batte corretto-quasi-sempre.
 *
 * IL COROLLARIO: L'OUTPUT DELL'AI E' VERIFICABILE A MACCHINA
 * Se all'assistente diamo lo scheletro e l'elenco esatto dei metodi disponibili,
 * inventare un metodo che non esiste fa fallire `tsc`. Il sistema ha cosi' due
 * giudici deterministici, uno per meta':
 *
 *     Gherkin  ->  validatore del catalogo   (lo step esiste? e' una variante nota?)
 *     Codice   ->  compilatore TypeScript    (il metodo esiste? il tipo torna?)
 *
 * Nessuno dei due costa niente: ci sono gia'.
 */

// ---------------------------------------------------------------------------
// INGRESSO 1 — la registrazione (prodotta da record.ts)
// ---------------------------------------------------------------------------

/** Un gesto singolo, come e' stato osservato. */
export interface Step {
  action: "click" | "fill" | "set";
  role: string;
  name: string;
  value?: string;
  /**
   * Il valore non e' stato registrato perche' era un campo password. In quel
   * caso `value` vale "<password>": non e' un segnaposto da riempire, e' la
   * prova che non l'abbiamo mai avuto.
   */
  secret?: boolean;
}

/** Cosa il tester ha indicato come "questo e' il risultato che mi aspetto". */
export interface Assertion {
  role: string;
  name: string;
  text?: string;
}

/**
 * Un intento = i gesti che il tester ha dichiarato essere **un solo passo**.
 *
 * Il raggruppamento non e' inferito: e' il tester che preme "Fine intento".
 * E' l'unico dato semantico dell'intera catena che non stiamo indovinando, e
 * per questo e' il confine su cui si costruisce lo step Gherkin.
 */
export interface Intent {
  label: string;
  steps: Step[];
  assertions: Assertion[];
  notes: string[];
}

export interface Recording {
  startUrl: string;
  recordedAt: string;
  durationSeconds: number;
  /** Pagine visitate, nell'ordine. Dice quali dizionari servono. */
  pagesVisited: string[];
  summary: { intents: number; steps: number; assertions: number; unlabelled: number };
  intents: Intent[];
}

// ---------------------------------------------------------------------------
// INGRESSO 2 — il dizionario dei componenti (prodotto da scout.ts)
// ---------------------------------------------------------------------------

/** A che serve il componente: guida il nome del metodo di Page Object. */
export type Kind = "action" | "input" | "navigation" | "choice";

export interface Component {
  role: string;
  name: string;
  kind: Kind;
  /** Espressione Playwright pronta da incollare in una Page Object. */
  locator: string;
  /** Nome di metodo suggerito per la Page Object. */
  method: string;
  /** Quante volte lo stesso role+name compare nella pagina. */
  occurrences: number;
  stability: "stable" | "ambiguous" | "unstable" | "unnamed";
  /** Perche' e' stato giudicato cosi'. Vuoto se stabile. */
  notes: string[];
  href?: string;
  disabled?: boolean;
}

export interface ScoutResult {
  url: string;
  scope: string;
  scoutedAt: string;
  /** Registrata nell'output: cambiandola cambiano i componenti visibili. */
  viewport: { width: number; height: number };
  quality: {
    interactiveFound: number;
    usable: number;
    unnamed: number;
    ambiguous: number;
    unstable: number;
    accessibleScore: number;
  };
  components: Component[];
}

// ---------------------------------------------------------------------------
// INGRESSO 3 — il catalogo degli step gia' esistenti
// ---------------------------------------------------------------------------

/**
 * Una voce del catalogo, ridotta a cio' che serve alla generazione.
 * La forma completa vive in `step-catalog.json`.
 */
export interface CatalogStep {
  expression: string;
  keyword: string;
  parameters: string[];
  area?: string;
  page?: string;
  status?: string;
  /** Componenti di frontend a cui lo step e' ancorato, se noti. */
  components?: string[];
}

// ---------------------------------------------------------------------------
// L'AGGANCIO — dove le tre cose si incontrano
// ---------------------------------------------------------------------------

/**
 * Un gesto della registrazione, riconosciuto nel dizionario.
 *
 * L'aggancio e' **esatto su ruolo+nome**, non fuzzy, ed e' possibile solo
 * perche' recorder e scout descrivono gli elementi con lo stesso codice
 * (`dom-probe.ts`). Quando fallisce, fallisce in modo dichiarato: `component`
 * resta `null` e il generatore lo scrive nel referto invece di indovinare.
 */
export interface ResolvedStep {
  step: Step;
  component: Component | null;
  /** Da quale dizionario viene. Serve quando un intento attraversa piu' pagine. */
  fromPage: string | null;
}

/**
 * Un intento, dopo che i suoi gesti sono stati agganciati al dizionario.
 *
 * `candidates` e' la parte che restringe il lavoro dell'AI: invece di "scrivi
 * uno step per questo", la domanda diventa "scegli fra questi, o dichiara che
 * nessuno va bene". E' lo stesso principio del validatore, applicato prima
 * della scrittura invece che dopo.
 */
export interface ResolvedIntent {
  label: string;
  steps: ResolvedStep[];
  assertions: Assertion[];
  notes: string[];
  /** La pagina su cui l'intento inizia. Decide quale Page Object usare. */
  page: string | null;
  /** L'intento ha cambiato pagina: qui serve il return-value chaining. */
  navigatesTo: string | null;
  /** Step di catalogo plausibili, dal piu' al meno. Puo' essere vuoto. */
  candidates: CatalogStep[];
}

// ---------------------------------------------------------------------------
// USCITA — cosa il generatore produce
// ---------------------------------------------------------------------------

/**
 * Chi ha scritto il file.
 *
 * Serve al benchmark: misurare l'assistente su codice che non ha scritto lui
 * falserebbe il risultato in meglio.
 */
export type Origin = "deterministico" | "assistito";

export interface GeneratedFile {
  /** Percorso relativo alla radice del repository. */
  path: string;
  contents: string;
  origin: Origin;
  /** Da quale modello e' stato reso. Assente per i file non da template. */
  template?: string;
}

export interface GenerationResult {
  files: GeneratedFile[];
  /**
   * Cosa il generatore **non** ha saputo fare da solo.
   *
   * Non e' un elenco di errori: e' l'ordine del giorno per l'assistente e per
   * la persona. Un generatore che tacesse i propri buchi produrrebbe codice che
   * sembra completo e non lo e', che e' il modo peggiore di sbagliare.
   */
  gaps: Gap[];
}

export interface Gap {
  kind:
    | "componente-non-nel-dizionario"
    | "nessuno-step-di-catalogo"
    | "ancoraggio-instabile"
    | "intento-senza-etichetta"
    | "asserzione-non-verificabile";
  /** Cosa non e' andato, in una frase leggibile da chi non ha scritto il codice. */
  detail: string;
  /** Dove: l'etichetta dell'intento, oppure la pagina. */
  where: string;
}
