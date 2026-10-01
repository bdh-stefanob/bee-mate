'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { nomeLeggibilePagina } from '@/lib/nome-pagina';
import type { ComponenteCatalogo } from './tipi';

/**
 * "Pulsante «Sign in»" invece di `button "Sign in"`: `button` e' gergo. I ruoli
 * noti si traducono; uno sconosciuto si mostra com'e'. Il nome resta quello
 * della pagina, mai tradotto.
 */
export function useNomeRuolo(): (ruolo: string) => string {
  const t = useTranslations('Catalogo');
  return (ruolo) => (t.has(`ruoli.${ruolo}`) ? t(`ruoli.${ruolo}`) : ruolo);
}

export function EtichettaComponente({ componente, conPagina = false }: { componente: Pick<ComponenteCatalogo, 'role' | 'name' | 'page'>; conPagina?: boolean }) {
  const t = useTranslations('Catalogo');
  const ruolo = useNomeRuolo();
  return (
    <Badge variant="secondary" className="h-auto min-h-5 whitespace-normal text-left">
      {ruolo(componente.role)} &laquo;{componente.name}&raquo;
      {conPagina && componente.page ? ` · ${t('paginaDi', { pagina: nomeLeggibilePagina(componente.page) })}` : ''}
    </Badge>
  );
}
