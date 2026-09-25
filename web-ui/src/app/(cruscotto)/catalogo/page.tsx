'use client';

import { useTranslations } from 'next-intl';
import { BookOpen, Component, GitCompareArrows, ListTree } from 'lucide-react';
import { SezioneStep, useCatalogo } from '@/components/cruscotto/catalogo/SezioneStep';
import { SezioneComponenti } from '@/components/cruscotto/catalogo/SezioneComponenti';
import { SezioneRiconciliazione } from '@/components/cruscotto/catalogo/SezioneRiconciliazione';
import { SezioneScenari } from '@/components/cruscotto/catalogo/SezioneScenari';

/**
 * Catalogo: la schermata che risponde a tre domande, in quest'ordine — e' la
 * stessa scaletta del contratto, cosi' l'ordine in cui si legge la pagina e'
 * l'ordine in cui si giudica il lavoro:
 *
 * 1. Cosa sa fare il sistema oggi (gli step, con i componenti che toccano)
 * 2. Se cambio questo componente, cosa si rompe (la mappa al contrario —
 *    prende il posto della vecchia pagina `(portale)/components`)
 * 3. Dove sta nascendo il disordine (la riconciliazione, il momento della
 *    dimostrazione)
 *
 * Gli scenari, raggruppati per applicazione e flusso con il loro pulsante di
 * esportazione, chiudono la pagina: sono il catalogo visto "da fuori", non
 * una delle tre domande.
 */
export default function CatalogoPage() {
  const t = useTranslations('Catalogo');
  const { dati, caricamento, errore } = useCatalogo();

  return (
    <div className="max-w-screen-xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
          {t('titoloPagina')}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('descrizionePagina')}
        </p>
      </div>

      <Sezione icona={BookOpen} titolo={t('domanda1Titolo')} sottotitolo={t('domanda1Sottotitolo')}>
        <SezioneStep dati={dati} caricamento={caricamento} errore={errore} />
      </Sezione>

      <Sezione icona={Component} titolo={t('domanda2Titolo')} sottotitolo={t('domanda2Sottotitolo')}>
        <SezioneComponenti dati={dati} caricamento={caricamento} errore={errore} />
      </Sezione>

      <Sezione icona={GitCompareArrows} titolo={t('domanda3Titolo')} sottotitolo={t('domanda3Sottotitolo')}>
        <SezioneRiconciliazione catalogo={dati} />
      </Sezione>

      <Sezione icona={ListTree} titolo={t('scenariTitolo')} sottotitolo={t('scenariSottotitolo')}>
        <SezioneScenari />
      </Sezione>
    </div>
  );
}

function Sezione({
  icona: Icona,
  titolo,
  sottotitolo,
  children,
}: {
  icona: typeof BookOpen;
  titolo: string;
  sottotitolo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Icona size={20} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--blu)' }} />
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--testo)' }}>
            {titolo}
          </h2>
          <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {sottotitolo}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}
