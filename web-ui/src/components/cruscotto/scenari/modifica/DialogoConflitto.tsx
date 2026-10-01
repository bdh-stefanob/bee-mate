'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DialogoModale } from './DialogoModale';
import { Bottone, CLASSE_CAMPO, STILE_CAMPO } from './stile';

/**
 * Il file e' cambiato sul disco mentre il tester modificava. Il suo testo non va
 * perso: sta in un riquadro copiabile. Tre scelte; Esc sceglie "Guarda la versione
 * attuale", che non butta niente (il testo del tester resta da parte).
 */
export function DialogoConflitto({
  testoMio,
  onVediAttuale,
  onSalvaComunque,
}: {
  testoMio: string;
  onVediAttuale: () => void;
  onSalvaComunque: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  const id = useId();
  const [copiato, setCopiato] = useState(false);

  const copia = async () => {
    try {
      await navigator.clipboard.writeText(testoMio);
      setCopiato(true);
    } catch {
      // Senza permessi per gli appunti il testo resta comunque nel riquadro: si seleziona a mano.
      setCopiato(false);
    }
  };

  return (
    <DialogoModale titolo={t('conflittoTitolo')} onEsc={onVediAttuale}>
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('conflittoTesto')}
      </p>
      <textarea
        id={`${id}-mio`}
        readOnly
        value={testoMio}
        rows={8}
        aria-label={t('miaBozzaTitolo')}
        className={`${CLASSE_CAMPO} font-mono text-xs`}
        style={STILE_CAMPO}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Bottone primario data-iniziale onClick={onVediAttuale}>
          {t('conflittoVedi')}
        </Bottone>
        <Bottone onClick={() => void copia()}>{t('conflittoCopia')}</Bottone>
        <Bottone onClick={onSalvaComunque}>{t('conflittoComunque')}</Bottone>
        <span role="status" className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {copiato ? t('conflittoCopiato') : ''}
        </span>
      </div>
    </DialogoModale>
  );
}
