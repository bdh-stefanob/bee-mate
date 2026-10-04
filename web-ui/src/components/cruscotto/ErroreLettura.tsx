'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * Una lettura dal server che non e' riuscita: cosa e' successo, cosa fare, e
 * "Riprova". Lo usano le schermate che leggono l'elenco degli scenari (Scenari
 * ed Esecuzione), cosi' dicono la stessa frase nello stesso modo.
 */
export function ErroreLettura({
  titolo,
  testo,
  etichettaRiprova,
  onRiprova,
  compatto = false,
}: {
  titolo: string;
  testo: string;
  etichettaRiprova: string;
  onRiprova: () => void;
  /** Dentro un modulo, accanto ad altri campi: meno spazio attorno. */
  compatto?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-start rounded-scheda border ${compatto ? 'gap-2 p-3' : 'gap-3 p-6'}`}
      style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)' }}
    >
      <p
        className={`flex items-center gap-2 font-semibold ${compatto ? 'text-sm' : 'text-base'}`}
        style={{ color: 'var(--rosso)' }}
      >
        <AlertTriangle size={compatto ? 16 : 20} aria-hidden="true" />
        {titolo}
      </p>
      <p className="text-sm" style={{ color: 'var(--testo)' }}>
        {testo}
      </p>
      <button
        type="button"
        onClick={onRiprova}
        className="inline-flex min-h-10 items-center rounded-controllo border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ borderColor: 'var(--bordo)', color: 'var(--blu)', outlineColor: 'var(--blu)' }}
      >
        {etichettaRiprova}
      </button>
    </div>
  );
}
