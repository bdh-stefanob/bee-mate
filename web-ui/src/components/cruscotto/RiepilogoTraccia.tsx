import { useTranslations } from 'next-intl';
import { CheckCircle2, ListChecks, AlertTriangle, Clock } from 'lucide-react';

export interface PassoRiepilogo {
  nome: string;
  gesti: number;
  verifiche: number;
}

export interface BucoRiepilogo {
  pagina: string;
  messaggio: string;
}

interface Props {
  passi: PassoRiepilogo[];
  durata: number;
  buchi: BucoRiepilogo[];
}

/**
 * La durata: come "{m} min {s} s"/"{s} s" del namespace Esecuzione, ma qui
 * arriva gia' in secondi interi (non ms) e senza decimali, quindi resta il
 * suo formato invariato fra le due lingue.
 */
function formattaDurata(secondi: number): string {
  const m = Math.floor(secondi / 60);
  const s = secondi % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}

/**
 * Il riepilogo di una registrazione: i passi con il nome dato dal tester,
 * quante verifiche, e i buchi nel dizionario tradotti in italiano
 * comprensibile. Puramente di presentazione: nessuna chiamata di rete, nessun
 * valore digitato dal tester (la traccia lo conserva, ma non arriva fin qui).
 */
export function RiepilogoTraccia({ passi, durata, buchi }: Props) {
  const t = useTranslations('Riepilogo');
  const totaleVerifiche = passi.reduce((n, p) => n + p.verifiche, 0);

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap items-center gap-4 rounded-lg border p-4 text-sm"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
      >
        <span className="flex items-center gap-2" style={{ color: 'var(--testo)' }}>
          <Clock size={18} aria-hidden="true" />
          {t('durataLabel', { durata: formattaDurata(durata) })}
        </span>
        <span className="flex items-center gap-2" style={{ color: 'var(--testo)' }}>
          <ListChecks size={18} aria-hidden="true" />
          {t('passiVerifiche', { passi: passi.length, verifiche: totaleVerifiche })}
        </span>
      </div>

      <ol className="flex flex-col gap-3">
        {passi.map((passo, i) => (
          <li
            key={`${passo.nome}-${i}`}
            className="rounded-lg border p-4"
            style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
          >
            <p className="font-medium" style={{ color: 'var(--testo)' }}>
              {i + 1}. {passo.nome}
            </p>
            <p
              className="mt-1 flex items-center gap-2 text-sm"
              style={{ color: 'var(--testo-tenue)' }}
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              {passo.verifiche === 0 ? t('passoNessunaVerifica') : t('passoVerifiche', { n: passo.verifiche })}
              {' · '}
              {t('passoAzioni', { n: passo.gesti })}
            </p>
          </li>
        ))}
      </ol>

      {buchi.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--testo)' }}>
            {t('daSapere')}
          </h2>
          {buchi.map((buco, i) => (
            <div
              key={`${buco.pagina}-${i}`}
              className="flex items-start gap-2 rounded-lg border p-3 text-sm"
              style={{
                borderColor: 'var(--bordo)',
                background: 'var(--superficie-tenue)',
                color: 'var(--testo)',
              }}
            >
              <AlertTriangle
                size={18}
                aria-hidden="true"
                style={{ color: 'var(--rosso)', flexShrink: 0, marginTop: 2 }}
              />
              <span>
                <strong>{t('attenzioneLabel')}</strong> — {buco.messaggio}.
                <br />
                <span style={{ color: 'var(--testo-tenue)' }}>
                  {t('rimedioScansione', { pagina: buco.pagina })}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
