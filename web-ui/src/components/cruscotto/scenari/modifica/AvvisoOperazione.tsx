'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Undo2, X } from 'lucide-react';
import type { ErroreServer } from '@/lib/client-modifica';
import { BannerRifiuto } from './BannerEsito';
import { Bottone } from './stile';

/**
 * Lo scenario e' stato spostato o eliminato: il pannello che l'aveva in mano non c'e' piu',
 * quindi l'avviso (e l'"Annulla", spec A7: "Subito dopo puoi annullare") sta nella pagina.
 * E' una regione `aria-live`; stato = icona E parole. La pagina lo toglie appena qualcuno
 * fa un'altra modifica: l'Annulla annulla SEMPRE l'ultima, e non deve potersi
 * scambiare per quella di prima.
 */
export function AvvisoOperazione({
  tipo,
  nome,
  flusso,
  occupato,
  errore,
  onAnnulla,
  onChiudi,
}: {
  tipo: 'eliminato' | 'spostato';
  nome: string;
  flusso?: string;
  occupato: boolean;
  errore: ErroreServer | null;
  onAnnulla: () => void;
  onChiudi: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  return (
    <div className="flex flex-col gap-2">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-wrap items-center gap-3 rounded-scheda border p-3"
        style={{ borderColor: 'var(--verde)', background: 'var(--superficie)' }}
      >
        <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium" style={{ color: 'var(--testo)' }}>
          <CheckCircle2 size={18} aria-hidden="true" className="shrink-0" style={{ color: 'var(--verde)' }} />
          <span className="break-words">
            {tipo === 'eliminato' ? t('avvisoEliminato', { nome }) : t('avvisoSpostato', { nome, flusso: flusso ?? '' })}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Bottone disabled={occupato} onClick={onAnnulla}>
            <Undo2 size={16} aria-hidden="true" />
            {t('annullaModifica')}
          </Bottone>
          <Bottone aria-label={t('chiudiAvviso')} onClick={onChiudi}>
            <X size={16} aria-hidden="true" />
          </Bottone>
        </div>
      </div>
      {errore && <BannerRifiuto errore={errore} />}
    </div>
  );
}
