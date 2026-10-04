'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CircleDot, ClipboardCheck } from 'lucide-react';
import { PASSI_REGISTRA, statoInizialeRegistra } from '@/lib/stato-iniziale-registra';
import { TITOLO_GRUPPO, TITOLO_SEZIONE, TESTO_LETTURA } from '@/lib/scala-tipografica';

import { cn } from '@/lib/utils';
interface Props {
  ambiente: string;
  /** La richiesta di registrazione e' gia' partita: il pulsante resta spento. */
  inviando: boolean;
  onRegistra: () => void;
}

/**
 * Cosa si vede in Registra quando nessuna registrazione e' in corso: i tre
 * passi (accedi, registra, salva) e il pulsante che li avvia. Senza ambiente,
 * il pulsante e' spento e c'e' la strada per risolvere: il Check-up (F14).
 * Quale dei due casi lo decide `statoInizialeRegistra`.
 */
export function StatoInizialeRegistra({ ambiente, inviando, onRegistra }: Props) {
  const t = useTranslations('Registra');
  const router = useRouter();
  const stato = statoInizialeRegistra(ambiente);
  const pronto = stato.tipo === 'pronto';

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="registra-come-funziona"
        className="flex flex-col gap-4 rounded-scheda border p-6 border-bordo bg-superficie"
      >
        <h2
          id="registra-come-funziona"
          className={cn(TITOLO_SEZIONE, 'text-testo')}
        >
          {t('iniziaTitolo')}
        </h2>
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          {PASSI_REGISTRA.map((passo, i) => (
            <li key={passo} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-pillola border text-sm font-semibold border-blu text-blu"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className={cn(TITOLO_GRUPPO, 'text-testo')}>
                  {t(`passo_${passo}_titolo`)}
                </h3>
                <p className={`text-sm ${TESTO_LETTURA} text-testo-tenue`}>
                  {t(`passo_${passo}_testo`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-col items-start gap-4">
        {pronto ? (
          <p className="text-sm text-testo-tenue">
            {t('ambienteCorrente', { ambiente: stato.ambiente })}
          </p>
        ) : (
          <div
            className="flex w-full items-start gap-3 rounded-scheda border p-4 text-sm border-ambra text-testo bg-superficie-tenue"
          >
            <AlertTriangle
              size={18}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-ambra"
            />
            <p className={TESTO_LETTURA}>{t('senzaAmbienteSpiega')}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!pronto && (
            <button
              type="button"
              onClick={() => router.push('/controllo')}
              className="inline-flex min-h-10 items-center gap-2 rounded-controllo px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-blu-fondo outline-blu"
            >
              <ClipboardCheck size={18} aria-hidden="true" />
              {t('vaiAControllo')}
            </button>
          )}
          <button
            type="button"
            onClick={onRegistra}
            disabled={!pronto || inviando}
            className={
              pronto
                ? 'inline-flex min-h-10 items-center gap-2 rounded-controllo bg-blu-fondo px-4 text-sm font-medium text-white outline-blu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50'
                : 'inline-flex min-h-10 items-center gap-2 rounded-controllo border border-bordo px-4 text-sm font-medium text-testo outline-blu focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50'
            }
          >
            <CircleDot size={18} aria-hidden="true" />
            {t('registraSessione')}
          </button>
        </div>
      </div>
    </div>
  );
}
