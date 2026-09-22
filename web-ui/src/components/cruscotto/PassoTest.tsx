import { CheckCircle2, XCircle, MinusCircle, type LucideIcon } from 'lucide-react';

export interface Passo {
  testo: string;
  esito: 'passato' | 'fallito' | 'saltato';
  messaggio?: string;
  schermata?: string;
}

interface Aspetto {
  Icona: LucideIcon;
  parola: string;
  colore: string;
}

/**
 * Icona + parola per ogni esito: mai il solo colore a dirlo, altrimenti chi
 * non distingue rosso da verde non lo legge.
 */
const ASPETTO: Record<Passo['esito'], Aspetto> = {
  passato: { Icona: CheckCircle2, parola: 'superato', colore: 'var(--verde)' },
  fallito: { Icona: XCircle, parola: 'fallito', colore: 'var(--rosso)' },
  saltato: { Icona: MinusCircle, parola: 'saltato', colore: 'var(--testo-tenue)' },
};

/** Una riga per un passo dello scenario, con l'esito ben leggibile. */
export function PassoTest({ passo }: { passo: Passo }) {
  const { Icona, parola, colore } = ASPETTO[passo.esito];

  return (
    <li
      className="flex flex-col gap-2 rounded-md border p-3 min-h-10"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
    >
      <div className="flex items-start gap-2">
        <Icona size={20} aria-hidden="true" style={{ color: colore, flexShrink: 0 }} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm break-words" style={{ color: 'var(--testo)' }}>
            {passo.testo}
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: colore }}
          >
            {parola}
          </span>
        </div>
      </div>

      {passo.esito === 'fallito' && passo.messaggio && (
        <pre
          className="text-xs whitespace-pre-wrap break-words rounded-md p-2 m-0 font-mono"
          style={{ background: 'var(--superficie-tenue)', color: 'var(--rosso)' }}
        >
          {passo.messaggio}
        </pre>
      )}

      {passo.esito === 'fallito' && passo.schermata && (
        // eslint-disable-next-line @next/next/no-img-element -- data URI locale, non un asset da ottimizzare
        <img
          src={passo.schermata}
          alt={`Schermata catturata al momento del fallimento del passo "${passo.testo}"`}
          className="max-w-full h-auto rounded-md border"
          style={{ borderColor: 'var(--bordo)' }}
        />
      )}
    </li>
  );
}
