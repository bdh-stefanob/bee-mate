'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Image as IconaSchermata } from 'lucide-react';
import { indirizzoProva } from '@/lib/percorso-esecuzione';

/**
 * "Vedi la schermata" di un rosso passato: apre in Esecuzione, in sola lettura,
 * la prova che l'indice degli esiti ricorda. Si offre solo se i file di quella
 * prova esistono ancora (la pulizia dello storico puo' averli tolti); se non
 * ci sono piu', una frase lo dice invece di un link che porta a una pagina
 * vuota. Finche' non si sa, non si mostra niente: mai un link che poi sparisce.
 */
export function LinkSchermata({ esecuzione }: { esecuzione: string }) {
  const t = useTranslations('Scenari');
  const indirizzo = indirizzoProva(esecuzione);
  const [esiste, setEsiste] = useState<boolean | null>(null);

  useEffect(() => {
    if (!indirizzo) {
      setEsiste(false);
      return;
    }
    let attivo = true;
    setEsiste(null);
    fetch(`/api/prova?id=${encodeURIComponent(esecuzione)}&solo=esiste`)
      .then((r) => r.json())
      .then((d: { esiste?: boolean }) => {
        if (attivo) setEsiste(d.esiste === true);
      })
      .catch(() => {
        // Se non si sa, non si promette: nessun link.
        if (attivo) setEsiste(false);
      });
    return () => {
      attivo = false;
    };
  }, [esecuzione, indirizzo]);

  if (esiste === null) return null;
  if (!esiste || !indirizzo) {
    return (
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('schermataNonPiuDisponibile')}
      </p>
    );
  }
  return (
    <Link
      href={indirizzo}
      className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
    >
      <IconaSchermata size={16} aria-hidden="true" />
      {t('vediSchermata')}
    </Link>
  );
}
