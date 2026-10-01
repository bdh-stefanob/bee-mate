'use client';

import { memo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, CircleDashed, History, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VoceScenario } from '@/lib/scenari-elenco';
import { formattaDurata, formattaQuando, type Traduttore } from '@/lib/formato-quando';

interface Aspetto {
  Icona: LucideIcon;
  colore: string;
}

const ASPETTO: Record<VoceScenario['stato']['tipo'], Aspetto> = {
  passato: { Icona: CheckCircle2, colore: 'var(--verde)' },
  fallito: { Icona: XCircle, colore: 'var(--rosso)' },
  modificato: { Icona: History, colore: 'var(--ambra)' },
  mai: { Icona: CircleDashed, colore: 'var(--testo-tenue)' },
};

interface Props {
  voce: VoceScenario;
  /** L'ambiente scelto: serve solo alla riga "Mai eseguito su ...". */
  ambiente: string | null;
  scelta: boolean;
  /** L'unica opzione con `tabindex=0`. */
  attiva: boolean;
  /** Il numero della riga fra intestazioni e opzioni (per la tastiera). */
  riga: number;
  idOpzione: string;
  onScegli: (voce: VoceScenario) => void;
  onFuoco: (chiave: string) => void;
}

/**
 * Le righe che non cambiano non si ridisegnano: il confronto guarda cio' che
 * conta (l'esito che mostra), non l'identita' dell'oggetto `voce`, che si
 * ricostruisce a ogni lettura.
 */
function uguali(a: Props, b: Props): boolean {
  const ea = a.voce.stato.tipo === 'mai' ? a.voce.stato.altrove : a.voce.stato.esito;
  const eb = b.voce.stato.tipo === 'mai' ? b.voce.stato.altrove : b.voce.stato.esito;
  return (
    a.voce.chiave === b.voce.chiave &&
    a.voce.stato.tipo === b.voce.stato.tipo &&
    ea === eb &&
    a.ambiente === b.ambiente &&
    a.scelta === b.scelta &&
    a.attiva === b.attiva &&
    a.riga === b.riga &&
    a.idOpzione === b.idOpzione &&
    a.onScegli === b.onScegli &&
    a.onFuoco === b.onFuoco
  );
}

function RigaScenarioBase({ voce, ambiente, scelta, attiva, riga, idOpzione, onScegli, onFuoco }: Props) {
  const t = useTranslations('Scenari');
  const te = useTranslations('Esecuzione');
  const locale = useLocale();
  const { Icona, colore } = ASPETTO[voce.stato.tipo];
  const stato = voce.stato;

  let testoStato: string;
  if (stato.tipo === 'passato') {
    testoStato = t('rigaPassato', {
      quando: formattaQuando(stato.esito.quando, locale, t as Traduttore),
      durata: formattaDurata(stato.esito.durataMs, locale, te as Traduttore),
    });
  } else if (stato.tipo === 'fallito') {
    const quando = formattaQuando(stato.esito.quando, locale, t as Traduttore);
    testoStato = stato.esito.passoFallito
      ? t('rigaFallito', { numero: stato.esito.passoFallito.numero, totale: stato.esito.passoFallito.totale, quando })
      : t('rigaFallitoSenzaPasso', { quando });
  } else if (stato.tipo === 'modificato') {
    testoStato = t('esitoModificato');
  } else {
    testoStato = ambiente ? t('rigaMai', { ambiente }) : t('esitoDaEseguire');
  }

  return (
    <div
      id={idOpzione}
      role="option"
      aria-selected={scelta}
      tabIndex={attiva ? 0 : -1}
      data-riga={riga}
      onClick={() => onScegli(voce)}
      onFocus={() => onFuoco(voce.chiave)}
      className={cn(
        'flex min-h-14 cursor-pointer items-start gap-2.5 border-l-4 px-3 py-2 text-left',
        'hover:bg-black/5 dark:hover:bg-white/10',
        'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2'
      )}
      style={{
        borderLeftColor: scelta ? 'var(--blu)' : 'transparent',
        background: scelta ? 'var(--superficie-tenue)' : undefined,
        outlineColor: 'var(--blu)',
      }}
    >
      <Icona size={20} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: colore }} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn('text-sm break-words', scelta && 'font-semibold')} style={{ color: 'var(--testo)' }}>
          {voce.nome}
        </span>
        <span className="text-xs break-words" style={{ color: 'var(--testo-tenue)' }}>
          {testoStato}
        </span>
      </span>
    </div>
  );
}

export const RigaScenario = memo(RigaScenarioBase, uguali);
