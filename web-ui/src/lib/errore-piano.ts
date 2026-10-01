import type { Messaggio, EsitoControlloVero } from './convalida-scenario';

/** Le cartelle da cui si legge e in cui si scrive: parametri, non costanti (come `salvaScenario`). */
export interface RadiciModifica {
  /** Radice del repository (vi sta `step-catalog.json`, e `reports/modifiche/`). */
  repoRoot: string;
  /** `src/features/` */
  featuresDir: string;
}

export type CodiceErrorePiano =
  | 'percorso' | 'non-trovato' | 'non-modificabile' | 'conflitto' | 'bloccato' | 'non-rinominabile'
  | 'frase-esiste' | 'catalogo' | 'richiesta' | 'bocciato' | 'scrittura' | 'ripristino'
  | 'niente-da-annullare' | 'cambiato-dopo' | 'operazione-in-corso';

/**
 * Perche' una modifica non si fa. Il `codice` e' stabile e la finestra lo traduce;
 * il messaggio resta per i log e i test e non contiene mai un percorso assoluto.
 */
export class ErrorePiano extends Error {
  /** Per `non-modificabile`: perche' (`registrato`, `documento`, `complesso`). Per `non-rinominabile`: il motivo. */
  ragione?: string;
  /** I blocchi del controllo rapido, per `bloccato`. */
  dettagli: Messaggio[] = [];
  /** L'esito del controllo vero, per `bocciato`. */
  controllo?: Extract<EsitoControlloVero, { ok: false }>;

  constructor(readonly codice: CodiceErrorePiano, readonly stato: number, messaggio: string, extra: { ragione?: string; dettagli?: Messaggio[]; controllo?: Extract<EsitoControlloVero, { ok: false }> } = {}) {
    super(messaggio);
    this.ragione = extra.ragione;
    if (extra.dettagli) this.dettagli = extra.dettagli;
    this.controllo = extra.controllo;
  }
}
