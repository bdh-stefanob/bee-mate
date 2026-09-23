/**
 * I dati che la diagnosi passa dentro un valore, quando il messaggio ha
 * numeri o nomi dentro (contratto: chiavi in italiano senza accenti,
 * minuscole — es. "pronti", "totale", "conUrl").
 */
export type DatiVoceDiagnosi = Record<string, string | number>;

/** La forma grezza che arriva da `diagnosi.ts json` (vedi il contratto lingue). */
export interface VoceDiagnosiGrezza {
  chiaveNome: string;
  esito: 'ok' | 'manca' | 'attenzione';
  chiaveDettaglio: string;
  dati?: DatiVoceDiagnosi;
  /** Il rimedio scritto per una persona: c'e' sempre, se un rimedio esiste. E' un comando: non si traduce mai. */
  rimedio?: string;
  /** Lo stesso rimedio come nome chiuso, quando la finestra puo' avviarlo da sola. */
  rimedioChiuso?: string;
  /** Dove si risolve dentro la finestra, quando si risolve dentro la finestra. */
  chiaveDallaFinestra?: string;
  /**
   * Riguarda chi ha costruito la catena (l'IDE con cui si scrivono script e
   * regole), non chi la usa per registrare ed eseguire un test a mano. Una
   * voce cosi' non deve mai decidere se la macchina e' "pronta" per un
   * tester: sennò la schermata direbbe per sempre "manca qualcosa" a chi non
   * ha né vuole un assistente da riga di comando sul PATH.
   */
  avanzata?: boolean;
}

export interface RimedioDiagnosi {
  /** La frase da mostrare e da copiare: c'e' sempre. Un comando: non si traduce mai. */
  comando: string;
  /** Il nome chiuso, quando la finestra puo' avviare il rimedio da sola. */
  chiuso?: string;
}

/** La forma interpretata, pronta per essere tradotta dai componenti con next-intl. */
export interface VoceDiagnosi {
  chiaveNome: string;
  esito: 'ok' | 'manca' | 'attenzione';
  chiaveDettaglio: string;
  dati?: DatiVoceDiagnosi;
  rimedio?: RimedioDiagnosi;
  chiaveDallaFinestra?: string;
  avanzata?: boolean;
}

/** Separata dalla rotta perche' e' la parte che si puo' verificare da sola. */
export function interpreta(grezzo: { voci: VoceDiagnosiGrezza[] }) {
  const voci: VoceDiagnosi[] = grezzo.voci.map((v) => ({
    chiaveNome: v.chiaveNome,
    esito: v.esito,
    chiaveDettaglio: v.chiaveDettaglio,
    dati: v.dati,
    avanzata: v.avanzata,
    chiaveDallaFinestra: v.chiaveDallaFinestra,
    // I due campi restano distinti fino alla riga che li mostra: un rimedio che
    // la macchina non sa avviare deve comunque arrivare all'occhio del tester,
    // come testo da copiare. Fonderli faceva sparire la seconda meta'.
    // Se la cosa si fa dentro la finestra, il comando da copiare non serve
    // piu' e anzi confonde: si indica il posto, e basta.
    rimedio: v.chiaveDallaFinestra
      ? undefined
      : v.rimedio
        ? { comando: v.rimedio, chiuso: v.rimedioChiuso }
        : undefined,
  }));
  // "Pronto" guarda solo cio' che impedisce davvero di lavorare: le voci
  // avanzate restano visibili in una sezione a parte, e un avviso resta un
  // avviso. Contare anche gli avvisi rendeva la riga falsa e per giunta
  // circolare: "Registrazioni" non puo' essere a posto finche' il tester non
  // ha registrato, cioe' finche' non ha fatto la cosa che quella schermata
  // dovrebbe invitarlo a fare.
  const essenziali = voci.filter((v) => !v.avanzata);
  return { pronto: essenziali.every((v) => v.esito !== 'manca'), voci };
}
