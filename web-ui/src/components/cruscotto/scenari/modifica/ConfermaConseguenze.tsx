'use client';

import { useTranslations } from 'next-intl';
import type { Messaggio } from '@/lib/convalida-scenario';
import type { ScenarioToccato } from '@/lib/piano-modifica';
import { DialogoModale } from './DialogoModale';
import { ElencoMessaggi } from './MessaggiControllo';
import { Bottone } from './stile';

/**
 * La conferma di una rinomina: vale per tutti gli scenari che usano la frase, e
 * il tester la vede PRIMA, con i loro nomi (mai i file) e con quali diventano
 * suoi. Esc sceglie "Torna indietro": non cambia niente.
 */
export function ConfermaConseguenze({
  da,
  a,
  scenari,
  avvisi,
  onConferma,
  onIndietro,
}: {
  da: string;
  a: string;
  scenari: ScenarioToccato[];
  avvisi: Messaggio[];
  onConferma: () => void;
  onIndietro: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  return (
    <DialogoModale titolo={t('confermaRinominaTitolo', { n: scenari.length })} onEsc={onIndietro}>
      <p className="text-sm" style={{ color: 'var(--testo)' }}>
        {t('confermaDa', { da, a })}
      </p>
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('confermaRinominaTesto')}
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-6 text-sm" style={{ color: 'var(--testo)' }}>
        {scenari.map((s) => (
          <li key={s.file}>{s.diventaTuo ? t('confermaScenarioTuo', { nome: s.nome }) : t('confermaScenario', { nome: s.nome })}</li>
        ))}
      </ul>
      <ElencoMessaggi blocchi={[]} avvisi={avvisi} />
      <div className="flex flex-wrap gap-2">
        <Bottone primario onClick={onConferma}>
          {t('conferma')}
        </Bottone>
        <Bottone data-iniziale onClick={onIndietro}>
          {t('tornaIndietro')}
        </Bottone>
      </div>
    </DialogoModale>
  );
}
