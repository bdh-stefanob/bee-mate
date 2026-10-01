'use client';

import { useTranslations } from 'next-intl';
import { DialogoModale } from './DialogoModale';
import { Bottone } from './stile';

/**
 * "Hai modifiche non salvate": tre scelte, in un dialogo che trattiene il fuoco.
 * Il fuoco parte su "Resta qui" e Esc la sceglie: la scelta che non perde niente.
 */
export function DialogoNonSalvate({
  onScelta,
}: {
  onScelta: (scelta: 'salva' | 'scarta' | 'resta') => void;
}) {
  const t = useTranslations('ModificaScenario');
  return (
    <DialogoModale titolo={t('nonSalvateTitolo')} onEsc={() => onScelta('resta')}>
      <p className="text-sm" style={{ color: 'var(--testo)' }}>
        {t('nonSalvateTesto')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Bottone primario onClick={() => onScelta('salva')}>
          {t('nonSalvateSalva')}
        </Bottone>
        <Bottone onClick={() => onScelta('scarta')}>{t('nonSalvateScarta')}</Bottone>
        <Bottone data-iniziale onClick={() => onScelta('resta')}>
          {t('nonSalvateResta')}
        </Bottone>
      </div>
    </DialogoModale>
  );
}
