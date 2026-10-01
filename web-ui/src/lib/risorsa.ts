/**
 * risorsa.ts
 * ----------
 * Un dato letto dal server, tenuto FUORI dai componenti: uno solo per finestra,
 * chiunque lo mostri si iscrive (`useSyncExternalStore`, vedi `usa-risorsa.ts`).
 *
 * PERCHE' NON `useState` + `fetch` DENTRO IL COMPONENTE
 * Era cosi', e la pagina Controllo si ridisegnava per intero a ogni modifica:
 *  - due componenti in due sottoalberi diversi (la barra laterale e la sezione
 *    Ambienti) leggevano la stessa rotta ciascuno per conto suo, tenuti
 *    allineati da un avviso a parte;
 *  - ogni lettura metteva nello stato un oggetto NUOVO anche quando il server
 *    aveva risposto la stessa cosa, quindi ogni riga si ridisegnava;
 *  - tornando sulla pagina si ripartiva dallo scheletro, perche' il dato
 *    moriva con il componente.
 *
 * COSA FA QUESTO MODULO
 *  - una richiesta sola alla volta: chi chiede mentre una e' in volo si accoda
 *    a quella (`carica`); chi ha appena MODIFICATO qualcosa la fa ripetere
 *    appena finisce (`ricarica`), perche' quella in volo puo' essere partita
 *    prima della modifica;
 *  - i dati uguali restano LO STESSO oggetto (`condividi`): una riga che non e'
 *    cambiata conserva la sua identita', e un componente `memo` non si ridisegna;
 *  - un aggiornamento fallito lascia a schermo i dati di prima: lo stato
 *    'errore' esiste solo finche' non c'e' mai stato niente da mostrare.
 */

export interface Istantanea<T> {
  stato: 'caricamento' | 'pronto' | 'errore';
  dati: T | null;
  /** Una rilettura e' in corso MENTRE i dati di prima sono ancora a schermo. */
  aggiornando: boolean;
}

export interface Risorsa<T> {
  sottoscrivi: (ascoltatore: () => void) => () => void;
  istantanea: () => Istantanea<T>;
  /** Legge se nessuno sta gia' leggendo; altrimenti aspetta la lettura in volo. */
  carica: () => Promise<void>;
  /** Dopo una modifica: garantisce una lettura PARTITA dopo questa chiamata. */
  ricarica: () => Promise<void>;
  /** Qualcuno lo sta mostrando adesso? */
  osservata: () => boolean;
}

/**
 * Il nuovo valore, riusando dal vecchio tutto cio' che non e' cambiato.
 * Uguale in profondita' → torna il vecchio, stesso riferimento.
 */
export function condividi<T>(vecchio: T, nuovo: T): T {
  if (Object.is(vecchio, nuovo)) return vecchio;
  if (typeof vecchio !== 'object' || typeof nuovo !== 'object' || vecchio === null || nuovo === null) {
    return nuovo;
  }
  if (Array.isArray(vecchio) !== Array.isArray(nuovo)) return nuovo;

  if (Array.isArray(vecchio) && Array.isArray(nuovo)) {
    let uguale = vecchio.length === nuovo.length;
    const esito = nuovo.map((elemento, i) => {
      const condiviso = i < vecchio.length ? condividi(vecchio[i], elemento) : elemento;
      if (i >= vecchio.length || condiviso !== vecchio[i]) uguale = false;
      return condiviso;
    });
    return uguale ? vecchio : (esito as unknown as T);
  }

  const v = vecchio as Record<string, unknown>;
  const n = nuovo as Record<string, unknown>;
  const chiavi = Object.keys(n);
  let uguale = Object.keys(v).length === chiavi.length;
  const esito: Record<string, unknown> = {};
  for (const chiave of chiavi) {
    const presente = Object.prototype.hasOwnProperty.call(v, chiave);
    esito[chiave] = presente ? condividi(v[chiave], n[chiave]) : n[chiave];
    if (!presente || esito[chiave] !== v[chiave]) uguale = false;
  }
  return uguale ? vecchio : (esito as T);
}

export function creaRisorsa<T>(leggi: () => Promise<T>): Risorsa<T> {
  let attuale: Istantanea<T> = { stato: 'caricamento', dati: null, aggiornando: false };
  const ascoltatori = new Set<() => void>();
  let inVolo: Promise<void> | null = null;
  let daRipetere = false;

  function imposta(prossima: Istantanea<T>): void {
    // Niente di cambiato, nessun avviso: e' qui che si evita il ridisegno.
    if (
      prossima.stato === attuale.stato &&
      prossima.dati === attuale.dati &&
      prossima.aggiornando === attuale.aggiornando
    ) {
      return;
    }
    attuale = prossima;
    for (const f of ascoltatori) f();
  }

  async function esegui(): Promise<void> {
    do {
      daRipetere = false;
      if (attuale.dati !== null) imposta({ ...attuale, aggiornando: true });
      try {
        const letti: T = await leggi();
        const dati: T = attuale.dati === null ? letti : condividi<T>(attuale.dati, letti);
        imposta({ stato: 'pronto', dati, aggiornando: daRipetere });
      } catch {
        imposta(
          attuale.dati === null
            ? { stato: 'errore', dati: null, aggiornando: false }
            : { ...attuale, aggiornando: daRipetere }
        );
      }
    } while (daRipetere);
  }

  function carica(): Promise<void> {
    if (!inVolo) {
      // Dopo un errore senza dati si riparte dallo scheletro, non dal rosso.
      if (attuale.stato === 'errore') imposta({ stato: 'caricamento', dati: null, aggiornando: false });
      inVolo = esegui().finally(() => {
        inVolo = null;
      });
    }
    return inVolo;
  }

  return {
    sottoscrivi(ascoltatore) {
      ascoltatori.add(ascoltatore);
      return () => {
        ascoltatori.delete(ascoltatore);
      };
    },
    istantanea: () => attuale,
    carica,
    ricarica() {
      if (inVolo) {
        daRipetere = true;
        return inVolo;
      }
      return carica();
    },
    osservata: () => ascoltatori.size > 0,
  };
}
