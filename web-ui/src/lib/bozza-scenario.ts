/**
 * La bozza di uno scenario in modifica: gli stati e le transizioni di A5 della spec
 * (docs/superpowers/specs/2026-10-01-modifica-scenari-e-dismissione-portale-design.md).
 *
 * E' un riduttore puro, senza React ne' rete: `vitest` gira solo in ambiente node e
 * non prova i componenti, quindi tutta la logica "in che stato siamo e dove si
 * puo' andare" sta qui e il pannello si limita a disegnarla e a chiamare le rotte.
 *
 * La bozza e' sempre UN TESTO (il contenuto del `.feature`). I gesti guidati sono
 * trasformazioni di quel testo (`modifica-scenario.ts`) e arrivano qui come
 * `{ tipo: 'modifica', testo }`: una sola fonte di verita'.
 *
 * Il via libera a lasciare la bozza e' un valore (`proseguire`), non un effetto:
 * chi disegna lo legge, naviga, e dice `proseguito`.
 */

export type Fase =
  | 'lettura' | 'carico' | 'non-modificabile' | 'pulita' | 'sporca' | 'controllo' | 'conferma'
  | 'salvataggio' | 'salvata' | 'conflitto' | 'errore';

/** Dove deve stare il fuoco quando si entra in modifica da un clic su un passo o sul titolo (decisione M11). */
export type Focus = { tipo: 'titolo' } | { tipo: 'passo'; riga: number };

export type RagioneNonModificabile = 'registrato' | 'documento' | 'complesso';

/** Una cosa che il tester voleva fare quando la bozza era sporca. */
export type Uscita = { tipo: 'verso'; verso: string } | { tipo: 'annulla-modifiche' };

export interface Bozza {
  fase: Fase;
  /** L'ultimo testo letto dal disco (o salvato). */
  letto: string;
  /** L'impronta di `letto`: la rimanda il salvataggio, il server la confronta col file di adesso. */
  versione: string;
  /** Il testo della bozza. */
  testo: string;
  /** Il file porta il marcatore di generazione: si dice "salvando diventa tuo". */
  marcatore: boolean;
  focus: Focus | null;
  ragione: RagioneNonModificabile | null;
  /** Cosa si sta confermando (oggi solo la rinomina: sposta ed elimina sono del passo 4). */
  conferma: 'rinomina' | 'testo' | null;
  /** Da quale fase si e' entrati in `conferma`: "Torna indietro" ci riporta. */
  prima: 'pulita' | 'sporca' | null;
  /** Il dialogo "modifiche non salvate" e' aperto per questa uscita. */
  inSospeso: Uscita | null;
  /** Via libera: si puo' lasciare la bozza. Una volta sola, poi `proseguito`. */
  proseguire: Uscita | null;
  avviso: 'salva-prima' | null;
  errore: string | null;
  /** In `conflitto`: com'e' il file adesso sul disco. */
  attuale: { testo: string; versione: string } | null;
  /** Il testo del tester messo da parte dopo "Guarda la versione attuale". */
  miaBozza: string | null;
  /** I blocchi dell'ultimo controllo sono in vista. */
  blocchiVisibili: boolean;
}

export function bozzaIniziale(): Bozza {
  return {
    fase: 'lettura', letto: '', versione: '', testo: '', marcatore: false, focus: null, ragione: null,
    conferma: null, prima: null, inSospeso: null, proseguire: null, avviso: null, errore: null,
    attuale: null, miaBozza: null, blocchiVisibili: false,
  };
}

export type Azione =
  | { tipo: 'apri'; focus?: Focus }
  | { tipo: 'letto'; testo: string; versione: string; marcatore: boolean }
  | { tipo: 'non-modificabile'; ragione: RagioneNonModificabile }
  | { tipo: 'lettura-fallita' }
  | { tipo: 'esci' }
  | { tipo: 'modifica'; testo: string }
  | { tipo: 'controlla' }
  /** `blocchi`: quanti ne ha trovati il controllo; `tocca`: la modifica tocca altro oltre a questo scenario (chiede conferma). */
  | { tipo: 'controllato'; blocchi: number; tocca: boolean }
  | { tipo: 'chiedi-rinomina' }
  | { tipo: 'conferma' }
  | { tipo: 'indietro' }
  | { tipo: 'salvata'; testo: string; versione: string }
  | { tipo: 'annullata'; testo: string; versione: string }
  | { tipo: 'conflitto'; attuale: { testo: string; versione: string } }
  | { tipo: 'adotta-attuale' }
  | { tipo: 'salva-comunque' }
  | { tipo: 'rifiutata'; codice: string }
  | { tipo: 'riprova' }
  | { tipo: 'annulla-modifiche' }
  | { tipo: 'vuole-uscire'; verso: string }
  | { tipo: 'scelta'; scelta: 'salva' | 'scarta' | 'resta' }
  | { tipo: 'proseguito' };

/** Ci sono modifiche che si perderebbero lasciando la bozza (anche in conflitto, anche mentre si controlla). */
export function haModificheNonSalvate(b: Bozza): boolean {
  if (b.fase === 'lettura' || b.fase === 'carico' || b.fase === 'non-modificabile' || b.fase === 'salvata') return false;
  return b.testo !== b.letto;
}

const fasePerTesto = (b: Bozza, testo: string): Fase => (testo === b.letto ? 'pulita' : 'sporca');

export function riduci(b: Bozza, a: Azione): Bozza {
  switch (a.tipo) {
    case 'apri':
      // Da lettura o da un errore di lettura; mai da dentro una modifica in corso.
      if (b.fase !== 'lettura' && b.fase !== 'errore') return b;
      return { ...bozzaIniziale(), fase: 'carico', focus: a.focus ?? null };

    case 'letto':
      if (b.fase !== 'carico') return b;
      return { ...b, fase: 'pulita', letto: a.testo, testo: a.testo, versione: a.versione, marcatore: a.marcatore };

    case 'non-modificabile':
      if (b.fase !== 'carico') return b;
      return { ...b, fase: 'non-modificabile', ragione: a.ragione, focus: null };

    case 'lettura-fallita':
      return b.fase === 'carico' ? { ...b, fase: 'errore', errore: 'lettura' } : b;

    case 'esci':
      return bozzaIniziale();

    case 'modifica': {
      // Non mentre si controlla, si conferma, si salva o si e' in conflitto: il testo non si muove sotto i piedi.
      if (b.fase !== 'pulita' && b.fase !== 'sporca' && b.fase !== 'salvata' && b.fase !== 'errore') return b;
      return { ...b, testo: a.testo, fase: fasePerTesto(b, a.testo), blocchiVisibili: false, avviso: null, errore: null };
    }

    case 'controlla':
      return b.fase === 'sporca' ? { ...b, fase: 'controllo', avviso: null, blocchiVisibili: false } : b;

    case 'controllato': {
      if (b.fase !== 'controllo') return b;
      if (a.blocchi > 0) return { ...b, fase: 'sporca', blocchiVisibili: true, inSospeso: null };
      if (a.tocca) return { ...b, fase: 'conferma', conferma: 'testo', prima: 'sporca' };
      return { ...b, fase: 'salvataggio' };
    }

    case 'chiedi-rinomina':
      if (b.fase === 'pulita') return { ...b, fase: 'conferma', conferma: 'rinomina', prima: 'pulita', avviso: null };
      // Da sporca non parte: la rinomina vale per tutto il repository e si applica subito,
      // quindi prima si salva o si scarta quello che c'e'.
      if (b.fase === 'sporca') return { ...b, avviso: 'salva-prima' };
      return b;

    case 'conferma':
      return b.fase === 'conferma' ? { ...b, fase: 'salvataggio' } : b;

    case 'indietro':
      return b.fase === 'conferma' ? { ...b, fase: b.prima ?? 'sporca', conferma: null, prima: null } : b;

    case 'salvata': {
      if (b.fase !== 'salvataggio') return b;
      const base: Bozza = {
        ...b, fase: 'salvata', letto: a.testo, testo: a.testo, versione: a.versione, conferma: null, prima: null,
        inSospeso: null, errore: null, attuale: null, blocchiVisibili: false, marcatore: false,
      };
      // L'uscita che aspettava il "Salva" del dialogo ora e' libera.
      return b.inSospeso && b.inSospeso.tipo === 'verso' ? { ...base, proseguire: b.inSospeso } : base;
    }

    case 'annullata':
      if (b.fase !== 'salvata') return b;
      return { ...b, fase: 'pulita', letto: a.testo, testo: a.testo, versione: a.versione };

    case 'conflitto':
      if (b.fase !== 'salvataggio' && b.fase !== 'controllo' && b.fase !== 'conferma') return b;
      return { ...b, fase: 'conflitto', attuale: a.attuale, inSospeso: null };

    case 'adotta-attuale':
      if (b.fase !== 'conflitto' || !b.attuale) return b;
      return {
        ...b, fase: 'pulita', letto: b.attuale.testo, testo: b.attuale.testo, versione: b.attuale.versione,
        miaBozza: b.testo, attuale: null, conferma: null, prima: null,
      };

    case 'salva-comunque':
      if (b.fase !== 'conflitto' || !b.attuale) return b;
      return { ...b, fase: 'salvataggio', versione: b.attuale.versione, letto: b.attuale.testo, attuale: null };

    case 'rifiutata':
      if (b.fase !== 'salvataggio' && b.fase !== 'controllo') return b;
      return { ...b, fase: 'errore', errore: a.codice, inSospeso: null };

    case 'riprova':
      // Un errore di salvataggio: il testo del tester e' intatto, si torna a lavorarci.
      // (Una lettura fallita si ritenta con `apri`, non con questo.)
      return b.fase === 'errore' && b.letto !== '' ? { ...b, fase: fasePerTesto(b, b.testo), errore: null } : b;

    case 'annulla-modifiche':
      if (b.fase === 'sporca') return { ...b, inSospeso: { tipo: 'annulla-modifiche' } };
      if (b.fase === 'errore' || b.fase === 'conflitto' || b.fase === 'pulita' || b.fase === 'salvata') {
        return { ...b, fase: 'pulita', testo: b.letto, errore: null, attuale: null, blocchiVisibili: false };
      }
      return b;

    case 'vuole-uscire': {
      const uscita: Uscita = { tipo: 'verso', verso: a.verso };
      if (haModificheNonSalvate(b)) return { ...b, inSospeso: uscita };
      return { ...b, proseguire: uscita };
    }

    case 'scelta': {
      if (!b.inSospeso) return b;
      const uscita = b.inSospeso;
      if (a.scelta === 'resta') return { ...b, inSospeso: null };
      if (a.scelta === 'scarta') {
        return {
          ...b, fase: 'pulita', testo: b.letto, inSospeso: null, errore: null, attuale: null, blocchiVisibili: false,
          proseguire: uscita.tipo === 'verso' ? uscita : null,
        };
      }
      // "Salva": si controlla e si salva; il via libera arriva solo a salvataggio riuscito.
      return b.fase === 'sporca' ? { ...b, fase: 'controllo', blocchiVisibili: false } : b;
    }

    case 'proseguito':
      return { ...b, proseguire: null };
  }
}
