'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Play } from 'lucide-react';
import type { Messaggio } from '@/lib/convalida-scenario';
import type { ErroreServer } from '@/lib/client-modifica';
import { ElencoMessaggi, frasiRifiuto } from './MessaggiControllo';
import { Bottone, CLASSE_BOTTONE } from './stile';

import { cn } from '@/lib/utils';
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
      className="flex flex-col gap-3 rounded-scheda border p-4 border-verde bg-superficie"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-verde">
        <CheckCircle2 size={18} aria-hidden="true" />
        {t('salvata')}{' '}
        <span className="text-testo">{scenari > 1 ? t('salvataScenari', { n: scenari }) : ''}</span>
      </p>
      {marcatoreTolto && (
        <p className="text-sm text-testo">
          {t('oraTuo')}
        </p>
      )}
      {catalogoRigenerato === false && (
        <p className="text-sm text-testo">
          {t('catalogoNonAggiornato')}
        </p>
      )}
      <ElencoMessaggi blocchi={[]} avvisi={avvisi} />
      <p className="text-sm font-medium text-testo">
        {t('nonEseguito')}
      </p>
      <div className="flex flex-wrap gap-2">
        {indirizzoEsegui && (
          <Link
            href={indirizzoEsegui}
            className={cn(CLASSE_BOTTONE, 'border-blu-fondo bg-blu-fondo text-white outline-blu')}
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
    <div role="alert" className="flex flex-col gap-2 rounded-scheda border p-4 text-sm border-rosso bg-superficie">
      <p className="flex items-start gap-2 font-semibold text-rosso">
        <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        {f.principale}
      </p>
      {f.dettaglio && <p className="text-testo">{f.dettaglio}</p>}
      {f.messaggi.length > 0 && <ElencoMessaggi blocchi={f.messaggi} avvisi={[]} />}
    </div>
  );
}
