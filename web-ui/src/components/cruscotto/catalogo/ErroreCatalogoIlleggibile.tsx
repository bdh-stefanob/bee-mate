'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRisorsa } from '@/hooks/useRisorsa';
import { riprovaCatalogo, statoAggiornamento, type EsitoRiprova } from '@/lib/risorse-catalogo';
import type { StatoAggiornamentoCatalogo } from '@/lib/risorse-catalogo';
import type { Istantanea } from '@/lib/risorsa';

const selStato = (i: Istantanea<StatoAggiornamentoCatalogo>) => i.dati;

/**
 * Il tentativo in corso e il suo esito stanno FUORI dal componente: rileggere
 * riporta la risorsa allo scheletro, quindi il riquadro si smonta e si rimonta
 * a meta' tentativo, e uno stato locale andrebbe perso (il pulsante tornerebbe
 * acceso e la frase d'esito sparirebbe).
 */
interface Tentativo {
  provando: boolean;
  esito: EsitoRiprova | null;
}
let tentativo: Tentativo = { provando: false, esito: null };
const ascoltatori = new Set<() => void>();
function imposta(prossimo: Tentativo): void {
  tentativo = prossimo;
  for (const f of ascoltatori) f();
}
const sottoscrivi = (f: () => void) => {
  ascoltatori.add(f);
  return () => {
    ascoltatori.delete(f);
  };
};
const leggiTentativo = () => tentativo;

async function tenta(): Promise<void> {
  if (tentativo.provando) return;
  imposta({ provando: true, esito: null });
  let esito: EsitoRiprova | null = null;
  try {
    esito = await riprovaCatalogo();
  } finally {
    imposta({ provando: false, esito });
  }
}

/**
 * Il catalogo non si legge: file rovinato, o mai generato, oppure una lettura
 * caduta per la rete. "Riprova ora" prima RILEGGE (se era la rete, basta);
 * solo se il catalogo e' davvero illeggibile lo fa ricostruire, il rimedio che
 * gia' esiste. Non resta mai spento a causa di un "in corso" ormai vecchio:
 * e' spento solo mentre il suo stesso tentativo e' in volo.
 *
 * Finita la rigenerazione, la pagina rilegge catalogo e coppie da sola
 * (`useAggiornamentoCatalogo`) e questo riquadro sparisce.
 */
export function ErroreCatalogoIlleggibile() {
  const t = useTranslations('Catalogo');
  const stato = useRisorsa(statoAggiornamento, selStato);
  const { provando, esito } = useSyncExternalStore(sottoscrivi, leggiTentativo, leggiTentativo);
  const inCorso = stato?.stato === 'in-corso';

  return (
    <div
      role="alert"
      className="rounded-lg border p-4 text-sm flex flex-wrap items-center gap-3"
      style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)', color: 'var(--testo)' }}
    >
      <div className="flex-1 min-w-48">
        <p>{inCorso ? t('catalogoRicostruzione') : t('catalogoNonSiLegge')}</p>
        {(esito === 'rifiutato' || esito === 'rete') && (
          <p role="status" className="mt-1" style={{ color: 'var(--testo-tenue)' }}>
            {esito === 'rete' ? t('nonRaggiungibile') : t('aggiornamentoOccupato')}
          </p>
        )}
      </div>
      <Button variant="outline" className="min-h-10 h-auto" onClick={() => void tenta()} disabled={provando}>
        {(provando || inCorso) && <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
        {t('riprovaAggiornamento')}
      </Button>
    </div>
  );
}
