import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, MinusCircle, type LucideIcon } from 'lucide-react';
import type { RiepilogoErrore } from '@/lib/artefatti';

export interface Passo {
  testo: string;
  esito: 'passato' | 'fallito' | 'saltato';
  messaggio?: string;
  riepilogo?: RiepilogoErrore;
  schermata?: string;
}

interface Aspetto {
  Icona: LucideIcon;
  chiaveParola: 'esitoPassato' | 'esitoFallito' | 'esitoSaltato';
  colore: string;
}

/**
 * Icona + parola per ogni esito: mai il solo colore a dirlo, altrimenti chi
 * non distingue rosso da verde non lo legge.
 */
const ASPETTO: Record<Passo['esito'], Aspetto> = {
  passato: { Icona: CheckCircle2, chiaveParola: 'esitoPassato', colore: 'var(--verde)' },
  fallito: { Icona: XCircle, chiaveParola: 'esitoFallito', colore: 'var(--rosso)' },
  saltato: { Icona: MinusCircle, chiaveParola: 'esitoSaltato', colore: 'var(--testo-tenue)' },
};

/** Una riga per un passo dello scenario, con l'esito ben leggibile. */
export function PassoTest({ passo }: { passo: Passo }) {
  const t = useTranslations('PassoTest');
  const { Icona, chiaveParola, colore } = ASPETTO[passo.esito];

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
            {t(chiaveParola)}
          </span>
        </div>
      </div>

      {passo.esito === 'fallito' && passo.messaggio && (
        <div className="flex flex-col gap-2">
          {/*
           * La riga in chiaro, prima di tutto: la frase in plain language
           * (dove il messaggio la porta, "pagina attesa" / "indirizzo ora")
           * oppure la prima riga del messaggio ripulita dai codici colore —
           * mai lo stack per intero come prima cosa (finding F1).
           */}
          <div
            className="flex flex-col gap-0.5 text-sm font-medium"
            style={{ color: 'var(--rosso)' }}
          >
            {passo.riepilogo?.paginaAttesa || passo.riepilogo?.indirizzoOra ? (
              <>
                {passo.riepilogo.paginaAttesa && (
                  <span>{t('paginaAttesa', { pagina: passo.riepilogo.paginaAttesa })}</span>
                )}
                {passo.riepilogo.indirizzoOra && (
                  <span>{t('indirizzoRaggiunto', { indirizzo: passo.riepilogo.indirizzoOra })}</span>
                )}
              </>
            ) : (
              <span>{passo.riepilogo?.primaRiga}</span>
            )}
          </div>

          <details className="text-xs">
            <summary
              className="cursor-pointer select-none font-medium min-h-10 flex items-center"
              style={{ color: 'var(--testo-tenue)' }}
            >
              {t('dettagliTecnici')}
            </summary>
            <pre
              className="mt-2 whitespace-pre-wrap break-words rounded-md p-2 m-0 font-mono"
              style={{ background: 'var(--superficie-tenue)', color: 'var(--rosso)' }}
            >
              {passo.messaggio}
            </pre>
          </details>
        </div>
      )}

      {passo.esito === 'fallito' && passo.schermata && (
        // eslint-disable-next-line @next/next/no-img-element -- data URI locale, non un asset da ottimizzare
        <img
          src={passo.schermata}
          alt={t('altSchermata', { testo: passo.testo })}
          className="max-w-full h-auto rounded-md border"
          style={{ borderColor: 'var(--bordo)' }}
        />
      )}
    </li>
  );
}
