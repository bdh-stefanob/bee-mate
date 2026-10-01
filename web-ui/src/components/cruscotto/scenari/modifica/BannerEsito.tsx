'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Play } from 'lucide-react';
import type { Messaggio } from '@/lib/convalida-scenario';
import type { ErroreServer } from '@/lib/client-modifica';
import { ElencoMessaggi, frasiRifiuto } from './MessaggiControllo';
import { Bottone, CLASSE_BOTTONE } from './stile';

/**
 * Com'e' andata: salvato (con avvisi, con "ora e' tuo", e SEMPRE "non l'ho ancora
 * eseguito" con il pulsante per farlo: nessun controllo prova che il test
 * funzioni, per esempio se si e' tolto il passo che prepara la pagina), oppure
 * un rifiuto con la sua causa e il suo rimedio. Il risultato e' in una regione
 * `aria-live`; stato = icona E parole.
 */
export function BannerSalvata({
  scenari,
  avvisi,
  marcatoreTolto,
  catalogoRigenerato,
  indirizzoEsegui,
  occupato,
  onAnnulla,
}: {
  scenari: number;
  avvisi: Messaggio[];
  marcatoreTolto: boolean;
  catalogoRigenerato: boolean | null;
  indirizzoEsegui: string | null;
  occupato: boolean;
  onAnnulla: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: 'var(--verde)', background: 'var(--superficie)' }}
    >
      <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--verde)' }}>
        <CheckCircle2 size={18} aria-hidden="true" />
        {t('salvata')}{' '}
        <span style={{ color: 'var(--testo)' }}>{scenari > 1 ? t('salvataScenari', { n: scenari }) : ''}</span>
      </p>
      {marcatoreTolto && (
        <p className="text-sm" style={{ color: 'var(--testo)' }}>
          {t('oraTuo')}
        </p>
      )}
      {catalogoRigenerato === false && (
        <p className="text-sm" style={{ color: 'var(--testo)' }}>
          {t('catalogoNonAggiornato')}
        </p>
      )}
      <ElencoMessaggi blocchi={[]} avvisi={avvisi} />
      <p className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
        {t('nonEseguito')}
      </p>
      <div className="flex flex-wrap gap-2">
        {indirizzoEsegui && (
          <Link
            href={indirizzoEsegui}
            className={CLASSE_BOTTONE}
            style={{ borderColor: 'var(--blu-fondo)', background: 'var(--blu-fondo)', color: '#fff', outlineColor: 'var(--blu)' }}
          >
            <Play size={16} aria-hidden="true" />
            {t('eseguiOra')}
          </Link>
        )}
        <Bottone disabled={occupato} onClick={onAnnulla}>
          {t('annullaModifica')}
        </Bottone>
      </div>
    </div>
  );
}

export function BannerRifiuto({ errore }: { errore: ErroreServer }) {
  const t = useTranslations('ModificaScenario');
  const f = frasiRifiuto(t, errore);
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)' }}>
      <p className="flex items-start gap-2 font-semibold" style={{ color: 'var(--rosso)' }}>
        <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        {f.principale}
      </p>
      {f.dettaglio && <p style={{ color: 'var(--testo)' }}>{f.dettaglio}</p>}
      {f.messaggi.length > 0 && <ElencoMessaggi blocchi={f.messaggi} avvisi={[]} />}
    </div>
  );
}
