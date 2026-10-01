import { useTranslations } from 'next-intl';
import type { RiepilogoErrore } from '@/lib/artefatti';

/**
 * Le righe in chiaro di un passo fallito: "pagina attesa / indirizzo raggiunto",
 * o "sei sulla pagina giusta ma non trovo l'elemento ...", o la prima riga del
 * messaggio. Mai lo stack per intero.
 *
 * Una sola copia, usata da Esecuzione (`PassoTest`) e dalla pagina Scenari:
 * cosi' i due posti non possono dire cose diverse dello stesso errore.
 */
export function FraseFallimento({ riepilogo }: { riepilogo?: RiepilogoErrore }) {
  const t = useTranslations('PassoTest');
  if (!riepilogo) return null;

  return (
    <div className="flex flex-col gap-0.5 text-sm font-medium" style={{ color: 'var(--rosso)' }}>
      {riepilogo.elementoMancante ? (
        <span>{t('paginaGiustaElementoMancante', riepilogo.elementoMancante)}</span>
      ) : riepilogo.paginaAttesa || riepilogo.indirizzoOra ? (
        <>
          {riepilogo.paginaAttesa && <span>{t('paginaAttesa', { pagina: riepilogo.paginaAttesa })}</span>}
          {riepilogo.indirizzoOra && <span>{t('indirizzoRaggiunto', { indirizzo: riepilogo.indirizzoOra })}</span>}
        </>
      ) : (
        <span>{riepilogo.primaRiga}</span>
      )}
    </div>
  );
}
