'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, History } from 'lucide-react';
import { PassoTest, type Passo } from '@/components/cruscotto/PassoTest';
import { formattaQuando, type Traduttore } from '@/lib/formato-quando';

type Risposta =
  | { stato: 'ok'; passi: Passo[]; quando: string | null; ambiente: string | null }
  | { stato: 'assente' }
  | { stato: 'non-valida' }
  | { stato: 'in-corso' };

type Caricamento = { tipo: 'carico' } | { tipo: 'errore' } | { tipo: 'risposta'; dati: Risposta };

const CHIAVE_ESITO = { passato: 'esitoPassato', fallito: 'esitoFallito', saltato: 'esitoSaltato' } as const;

/**
 * Una prova gia' conclusa, in sola lettura: `/esecuzione?prova=<id>`. Mostra
 * i passi, l'esito, la frase del fallimento e la schermata, con in testa
 * QUANDO e SU QUALE AMBIENTE e' stata fatta e che non e' in corso. L'id arriva
 * dall'indirizzo e non e' fidato: lo valida il server (`/api/prova`), qui lo
 * si passa solo codificato.
 */
export function ProvaPassata({ id }: { id: string }) {
  const t = useTranslations('Esecuzione');
  const ts = useTranslations('Scenari');
  const locale = useLocale();
  const [stato, setStato] = useState<Caricamento>({ tipo: 'carico' });

  useEffect(() => {
    let attivo = true;
    setStato({ tipo: 'carico' });
    fetch(`/api/prova?id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        const dati = (await r.json()) as Risposta | { errore: string };
        // Un id che il server rifiuta (400) e' "non valido", come l'ha detto lui.
        if (!r.ok) return { stato: 'non-valida' } as Risposta;
        return dati as Risposta;
      })
      .then((dati) => {
        if (attivo) setStato({ tipo: 'risposta', dati });
      })
      .catch(() => {
        if (attivo) setStato({ tipo: 'errore' });
      });
    return () => {
      attivo = false;
    };
  }, [id]);

  const ritorno = (
    <Link
      href="/scenari"
      className="inline-flex min-h-10 w-fit items-center rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
    >
      {t('provaVaiAScenari')}
    </Link>
  );

  const avviso = (titolo: string, testo: string, azione: React.ReactNode = ritorno) => (
    <section
      role="status"
      className="flex flex-col gap-2 rounded-lg border p-4 text-sm"
      style={{ borderColor: 'var(--ambra)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
    >
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={18} aria-hidden="true" style={{ color: 'var(--ambra)' }} />
        {titolo}
      </p>
      <p style={{ color: 'var(--testo-tenue)' }}>{testo}</p>
      {azione}
    </section>
  );

  let corpo: React.ReactNode;
  if (stato.tipo === 'carico') {
    corpo = (
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('provaCaricamento')}
      </p>
    );
  } else if (stato.tipo === 'errore') {
    corpo = avviso(t('provaTitolo'), t('provaErrore'));
  } else if (stato.dati.stato === 'assente') {
    corpo = avviso(t('provaNonTrovataTitolo'), t('provaNonTrovataTesto'));
  } else if (stato.dati.stato === 'non-valida') {
    corpo = avviso(t('provaNonValidaTitolo'), t('provaNonValidaTesto'));
  } else if (stato.dati.stato === 'in-corso') {
    corpo = avviso(
      t('provaInCorsoTitolo'),
      t('provaInCorsoTesto'),
      <Link
        href="/esecuzione"
        className="inline-flex min-h-10 w-fit items-center rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
      >
        {t('provaVaiAEsecuzione')}
      </Link>
    );
  } else {
    const { passi, quando, ambiente } = stato.dati;
    const quandoTesto = quando ? formattaQuando(quando, locale, ts as Traduttore) : '';
    const conteggio = { passato: 0, fallito: 0, saltato: 0 };
    for (const p of passi) conteggio[p.esito]++;
    corpo = (
      <>
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
        >
          <History size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--testo-tenue)' }} />
          <span>
            {ambiente
              ? t('provaIntestazione', { quando: quandoTesto, ambiente })
              : t('provaIntestazioneSenzaAmbiente', { quando: quandoTesto })}
          </span>
        </p>
        {passi.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('provaSenzaPassi')}
          </p>
        ) : (
          <section aria-label={t('passiAriaLabel')} className="flex flex-col gap-4 min-w-0">
            <ul className="flex flex-col gap-2" role="list">
              {passi.map((p, i) => (
                <PassoTest key={i} passo={p} />
              ))}
            </ul>
            <p
              className="text-sm font-semibold border-t pt-3"
              style={{ color: 'var(--testo-tenue)', borderColor: 'var(--bordo)' }}
            >
              {(['passato', 'fallito', 'saltato'] as const)
                .map((e) => t(CHIAVE_ESITO[e], { n: conteggio[e] }))
                .join(', ')}
            </p>
          </section>
        )}
        {ritorno}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl min-w-0">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
        {t('provaTitolo')}
      </h1>
      {corpo}
    </div>
  );
}
