'use client';

import { useTranslations } from 'next-intl';
import type { PassoRimasto } from '@/lib/piano-modifica';
import { DialogoModale } from './DialogoModale';
import { Bottone } from './stile';

type T = (chiave: string, valori?: Record<string, string | number>) => string;

const CHIAVE_RESTA: Record<PassoRimasto['motivo'], string> = {
  condiviso: 'restaCondiviso',
  comune: 'restaComune',
  parametri: 'restaParametri',
  richiesto: 'restaRichiesto',
  altro: 'restaAltro',
};

/** Un passo che resta, con il suo perche' (e, se lo usano altri scenari, quali: i loro nomi, mai i file). */
export function fraseRimasto(t: T, p: PassoRimasto): string {
  return t(CHIAVE_RESTA[p.motivo], { frase: p.frase, scenari: p.usatoDa.join(', ') });
}

/**
 * La conferma di "Elimina lo scenario" (spec A7): PRIMA l'elenco delle conseguenze, in
 * linea nel pannello, mai `window.confirm`. Dice quali passi vanno con lo scenario (nessun
 * altro li usa) e quali restano e perche', e che le pagine dell'applicazione non si toccano.
 * Esc e il fuoco iniziale stanno su "Torna indietro": la scelta che non cancella niente.
 */
export function ConfermaElimina({
  nome,
  vanno,
  restano,
  onConferma,
  onIndietro,
}: {
  nome: string;
  vanno: string[];
  restano: PassoRimasto[];
  onConferma: () => void;
  onIndietro: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  return (
    <DialogoModale titolo={t('eliminaTitolo', { nome })} onEsc={onIndietro}>
      {vanno.length > 0 ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="text-testo">{t('eliminaVanno')}</p>
          <ul className="flex list-disc flex-col gap-1 pl-6 text-testo">
            {vanno.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-testo">
          {t('eliminaNienteVa')}
        </p>
      )}
      {restano.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="text-testo">{t('eliminaRestano')}</p>
          <ul className="flex list-disc flex-col gap-1 pl-6 text-testo">
            {restano.map((p) => (
              <li key={p.frase}>{fraseRimasto(t, p)}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-testo-tenue">
        {t('eliminaPagine')} {t('eliminaAnnullabile')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Bottone data-iniziale onClick={onIndietro}>
          {t('tornaIndietro')}
        </Bottone>
        <Bottone primario onClick={onConferma}>
          {t('eliminaVa')}
        </Bottone>
      </div>
    </DialogoModale>
  );
}

/**
 * La conferma di "Sposta": da quale flusso a quale, nella stessa applicazione, e che lo
 * scenario diventa del tester. Esc = "Torna indietro".
 */
export function ConfermaSposta({
  nome,
  da,
  a,
  onConferma,
  onIndietro,
}: {
  nome: string;
  da: string;
  a: string;
  onConferma: () => void;
  onIndietro: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  return (
    <DialogoModale titolo={t('spostaTitolo', { nome })} onEsc={onIndietro}>
      <p className="text-sm text-testo">
        {t('spostaTesto', { da, a })}
      </p>
      <p className="text-sm text-testo-tenue">
        {t('spostaEsiti')} {t('eliminaAnnullabile')}
      </p>
      <div className="flex flex-wrap gap-2">
        <Bottone data-iniziale onClick={onIndietro}>
          {t('tornaIndietro')}
        </Bottone>
        <Bottone primario onClick={onConferma}>
          {t('spostaVai')}
        </Bottone>
      </div>
    </DialogoModale>
  );
}
