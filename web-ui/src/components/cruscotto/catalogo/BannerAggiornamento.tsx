'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Cosa dice l'ultima rigenerazione automatica del catalogo (F19): la
 * promessa e' che cresca da solo dopo ogni scenario salvato, e questa
 * striscia e' il posto dove si vede se e' successo davvero — invece di
 * lasciare che la tabella sotto mostri un numero vecchio senza avvisare.
 *
 * Di sola lettura, e non decide niente: legge `/api/catalogo/stato`, che lo
 * script `rigenera-catalogo.ts` scrive da solo. Un intervallo breve, perche'
 * "in corso" dura decine di secondi: interrogarlo ogni 2s costa nulla e
 * chiude lo spinner appena l'esito arriva.
 */

interface StatoCatalogo {
  stato: 'in-corso' | 'ok' | 'fallita' | 'mai-eseguito';
  avviatoIl?: string;
  concluseIl?: string;
  durataMs?: number;
  totaleStep?: number;
  messaggio?: string;
}

const INTERVALLO_MS = 2000;

export function BannerAggiornamento() {
  const t = useTranslations('Catalogo');
  const [stato, setStato] = useState<StatoCatalogo | null>(null);

  useEffect(() => {
    let annullato = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const leggi = () => {
      fetch('/api/catalogo/stato')
        .then((r) => r.json())
        .then((dati: StatoCatalogo) => {
          if (annullato) return;
          setStato(dati);
          // Solo mentre e' in corso vale la pena riprovare a breve: gli altri
          // esiti cambiano solo quando parte una nuova rigenerazione, cioe'
          // quando il tester genera un altro scenario da un'altra schermata.
          if (dati.stato === 'in-corso') timer = setTimeout(leggi, INTERVALLO_MS);
        })
        .catch(() => {
          // Nessuna notizia non e' una brutta notizia: la striscia resta
          // com'era, invece di mostrare un errore su un errore.
        });
    };
    leggi();

    return () => {
      annullato = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!stato || stato.stato === 'mai-eseguito') return null;

  if (stato.stato === 'in-corso') {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border p-3 text-sm"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
      >
        <Loader2 size={16} aria-hidden="true" className="animate-spin shrink-0" />
        <span>{t('aggiornamentoInCorso')}</span>
      </div>
    );
  }

  if (stato.stato === 'fallita') {
    return (
      <div
        className="flex items-start gap-2 rounded-lg border p-3 text-sm"
        style={{ borderColor: 'var(--ambra)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
      >
        <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--ambra)' }} />
        <span>{t('aggiornamentoFallito', { dettaglio: stato.messaggio ?? '?' })}</span>
      </div>
    );
  }

  // 'ok'
  return (
    <div
      className="flex items-center gap-2 rounded-lg border p-3 text-sm"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo-tenue)' }}
    >
      <CheckCircle2 size={16} aria-hidden="true" className="shrink-0" style={{ color: 'var(--blu)' }} />
      <span>
        {t('aggiornatoIl', {
          data: stato.concluseIl ? new Date(stato.concluseIl).toLocaleString() : '?',
          secondi: Math.round((stato.durataMs ?? 0) / 1000),
          n: stato.totaleStep ?? 0,
        })}
      </span>
    </div>
  );
}
