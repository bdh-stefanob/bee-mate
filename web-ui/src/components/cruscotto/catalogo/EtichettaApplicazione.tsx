'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

/**
 * Il badge dell'applicazione, uguale ovunque compaia uno step nella
 * schermata Catalogo (elenco step, mappa componenti, coppie di
 * riconciliazione): senza, un `button "Sign in"` di un'app sembra uguale a
 * quello di un'altra, ed e' proprio la confusione che questa schermata deve
 * evitare.
 *
 * `common` e `generated` non sono nomi di applicazioni reali (vedi
 * `riconciliazione.ts`): si mostrano tradotti, non come slug tecnico.
 */
export function EtichettaApplicazione({ app }: { app: string }) {
  const t = useTranslations('Catalogo');
  const etichetta = app === 'common' ? t('appComune') : app === 'generated' ? t('appNonSalvata') : app;
  return (
    <Badge variant="outline" style={{ borderColor: 'var(--bordo)', color: 'var(--testo-tenue)' }}>
      {etichetta}
    </Badge>
  );
}
