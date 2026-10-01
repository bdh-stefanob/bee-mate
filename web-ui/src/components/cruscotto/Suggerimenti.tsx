'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Loader2, Undo2 } from 'lucide-react';
import type { RigaVista } from '@/lib/suggerimenti-regole';
import type { Origin } from '@/lib/suggerimenti-contratto';

type Risposta =
  | { stato: 'nessuno' }
  | { stato: 'pronte'; id: string; origin: Origin; righe: RigaVista[]; applicabili: number }
  | { stato: 'applicate'; id: string; usate: number };

type Scelta = 'mia' | 'catalogo';

/** Cosa dire, sopra il pulsante, dell'ultimo tentativo. */
type Avviso =
  | { tipo: 'applicate'; n: number }
  | { tipo: 'annullate' }
  | { tipo: 'rifiutate'; giudice: string }
  | { tipo: 'errore'; codice: string; dettagli: string[] };

const CODICI_CON_MESSAGGIO = new Set([
  'scaduta', 'non-applicabile', 'stessa-voce', 'collisione', 'frase-non-trovata',
  'file-a-mano', 'modificato-a-mano', 'gia-salvato', 'niente-da-annullare',
]);

const STILE_BOTTONE_PIENO = { background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' } as const;
const STILE_BOTTONE_VUOTO = { borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' } as const;
/**
 * Le frasi dello scenario sono cambiate: il catalogo si riallinea da solo, con lo
 * stesso comando che parte dopo "Genera il test". Se non parte, il catalogo resta
 * quello di prima e la schermata Catalogo lo dice.
 */
function riallineaCatalogo(): void {
  fetch('/api/esegui', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'catalogo' }),
  }).catch(() => {});
}

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

/**
 * I suggerimenti, in Registra: dopo "Genera il test" e prima di "Salva lo scenario".
 *
 * Per ogni passo che puo' usare una frase gia' nel catalogo, la frase del tester e
 * quella del catalogo una accanto all'altra, e una scelta a due stati. Niente e'
 * preselezionato: non scegliere vuol dire tenere la propria frase. Mai "accetta
 * tutto". Chi ha suggerito e' sempre dichiarato: oggi sono le regole del catalogo.
 *
 * Non disturba: se non c'e' niente da offrire (la risposta e' `nessuno`, o la
 * richiesta fallisce) non rende niente, e "Salva" resta com'era. E' ripiegato di
 * fabbrica e si apre da tastiera.
 */
export function Suggerimenti() {
  const t = useTranslations('Suggerimenti');
  const idBase = useId();
  const [risposta, setRisposta] = useState<Risposta>({ stato: 'nessuno' });
  const [scelte, setScelte] = useState<Record<number, Scelta>>({});
  const [lavoro, setLavoro] = useState<'applico' | 'annullo' | null>(null);
  const [avviso, setAvviso] = useState<Avviso | null>(null);
  const [aperto, setAperto] = useState(false);
  const riepilogoRef = useRef<HTMLParagraphElement | null>(null);

  const carica = useCallback(async () => {
    try {
      const r = await fetch('/api/suggerimenti', { method: 'POST' });
      const corpo = (await r.json()) as Risposta;
      setRisposta(corpo);
      setScelte({});
    } catch {
      // Nessuna risposta, nessun riquadro: mai un ostacolo fra il tester e "Salva".
      setRisposta({ stato: 'nessuno' });
    }
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  const applica = useCallback(async () => {
    if (risposta.stato !== 'pronte' || lavoro) return;
    const elenco = risposta.righe
      .filter((r) => scelte[r.passo] === 'catalogo')
      .map((r) => ({ passo: r.passo, voce: r.voce }));
    if (elenco.length === 0) return;
    setLavoro('applico');
    try {
      const res = await fetch('/api/suggerimenti/applica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: risposta.id, scelte: elenco }),
      });
      const corpo = (await res.json()) as {
        esito?: string; usate?: number; giudici?: Array<{ nome: string; ok: boolean }>;
        codice?: string; dettagli?: string[];
      };
      if (res.ok && corpo.esito === 'applicato') {
        setRisposta({ stato: 'applicate', id: risposta.id, usate: corpo.usate ?? elenco.length });
        setAvviso({ tipo: 'applicate', n: corpo.usate ?? elenco.length });
        // Si apre da solo: ora il pulsante utile e' "Annulla le modifiche".
        setAperto(true);
        riallineaCatalogo();
        setScelte({});
      } else if (res.ok && corpo.esito === 'rifiutato-dai-giudici') {
        setAvviso({ tipo: 'rifiutate', giudice: corpo.giudici?.find((g) => !g.ok)?.nome ?? '' });
        setScelte({});
      } else {
        setAvviso({ tipo: 'errore', codice: corpo.codice ?? '', dettagli: corpo.dettagli ?? [] });
      }
    } catch {
      setAvviso({ tipo: 'errore', codice: '', dettagli: [] });
    } finally {
      setLavoro(null);
      // Dopo "Applica" il focus va al riepilogo: chi usa una tastiera o uno
      // screen reader non resta su un pulsante che non c'e' piu'.
      setTimeout(() => riepilogoRef.current?.focus(), 0);
    }
  }, [risposta, scelte, lavoro]);

  const annulla = useCallback(async () => {
    if (risposta.stato !== 'applicate' || lavoro) return;
    setLavoro('annullo');
    try {
      const res = await fetch('/api/suggerimenti/annulla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: risposta.id }),
      });
      if (res.ok) {
        setAvviso({ tipo: 'annullate' });
        riallineaCatalogo();
        await carica();
      } else {
        const corpo = (await res.json()) as { codice?: string; dettagli?: string[] };
        setAvviso({ tipo: 'errore', codice: corpo.codice ?? '', dettagli: corpo.dettagli ?? [] });
      }
    } catch {
      setAvviso({ tipo: 'errore', codice: '', dettagli: [] });
    } finally {
      setLavoro(null);
      setTimeout(() => riepilogoRef.current?.focus(), 0);
    }
  }, [risposta, lavoro, carica]);

  const testoAvviso = (a: Avviso): string => {
    switch (a.tipo) {
      case 'applicate':
        return t('applicate', { n: a.n });
      case 'annullate':
        return t('annullate');
      case 'rifiutate':
        return t('rifiutate', {
          quale: ['tsc', 'dry-run', 'validatore'].includes(a.giudice) ? t(`giudice.${a.giudice}`) : t('giudice.validatore'),
        });
      case 'errore':
        return t(CODICI_CON_MESSAGGIO.has(a.codice) ? `errore.${a.codice}` : 'errore.generico');
    }
  };

  // Niente da offrire: niente riquadro. L'area che annuncia resta, vuota, solo se
  // c'e' qualcosa da dire (un errore dopo un tentativo).
  if (risposta.stato === 'nessuno' && !avviso) return null;

  const scelteFatte = risposta.stato === 'pronte' ? risposta.righe.filter((r) => scelte[r.passo] === 'catalogo').length : 0;
  const applicate = risposta.stato === 'applicate';
  const conteggio = risposta.stato === 'pronte' ? risposta.applicabili : 0;
  const idRiepilogo = `${idBase}-riepilogo`;

  return (
    <section
      aria-label={t('titolo')}
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
    >
      {/* L'annuncio dei cambi di stato: educato, mai invadente. */}
      <p
        ref={riepilogoRef}
        id={idRiepilogo}
        tabIndex={-1}
        aria-live="polite"
        className="flex items-start gap-2 text-sm focus-visible:outline focus-visible:outline-2"
        style={{ color: 'var(--testo)', outlineColor: 'var(--blu)' }}
      >
        {avviso && (
          <>
            {avviso.tipo === 'applicate' || avviso.tipo === 'annullate' ? (
              <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--verde)' }} />
            ) : (
              <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--ambra)' }} />
            )}
            <span>{testoAvviso(avviso)}</span>
          </>
        )}
      </p>
      {avviso?.tipo === 'errore' && avviso.dettagli.length > 0 && (
        <ul className="m-0 list-disc pl-8 text-xs" style={{ color: 'var(--testo-tenue)' }} aria-label={t('dettagliTitolo')}>
          {avviso.dettagli.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}

      {(risposta.stato === 'pronte' || applicate) && (
        <details className="group" open={aperto} onToggle={(e) => setAperto(e.currentTarget.open)}>
          <summary
            className={`flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md text-sm font-medium ${FOCUS}`}
            style={{ color: 'var(--testo)', outlineColor: 'var(--blu)' }}
          >
            <ChevronDown size={18} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
            <span>{t('titolo')}</span>
            <span className="font-normal" style={{ color: 'var(--testo-tenue)' }}>
              {applicate ? null : t('riepilogo', { n: conteggio })}
            </span>
          </summary>

          <div className="mt-3 flex flex-col gap-4">
            <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--testo-tenue)' }}>
              <Info size={16} aria-hidden="true" className="shrink-0" />
              {t('suggeritoDa', { chi: risposta.stato === 'pronte' && risposta.origin === 'assistito' ? t('chiAssistente') : t('chiRegole') })}
            </p>
            {!applicate && (
              <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
                {t('aiuto')}
              </p>
            )}

            {risposta.stato === 'pronte' && (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {risposta.righe.map((r) => (
                  <RigaSuggerimento
                    key={r.passo}
                    riga={r}
                    scelta={scelte[r.passo]}
                    disabilitata={lavoro !== null}
                    onScelta={(s) => setScelte((prima) => ({ ...prima, [r.passo]: s }))}
                    idBase={idBase}
                  />
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {risposta.stato === 'pronte' && (
                <button
                  type="button"
                  onClick={() => void applica()}
                  disabled={scelteFatte === 0 || lavoro !== null}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white disabled:opacity-50 ${FOCUS}`}
                  style={STILE_BOTTONE_PIENO}
                >
                  {lavoro === 'applico' && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  {lavoro === 'applico' ? t('applicando') : t('applica', { n: scelteFatte })}
                </button>
              )}
              {applicate && (
                <button
                  type="button"
                  onClick={() => void annulla()}
                  disabled={lavoro !== null}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium disabled:opacity-50 ${FOCUS}`}
                  style={STILE_BOTTONE_VUOTO}
                >
                  {lavoro === 'annullo' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Undo2 size={16} aria-hidden="true" />}
                  {lavoro === 'annullo' ? t('annullando') : t('annulla')}
                </button>
              )}
            </div>
            <p className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
              {t('nota')}
            </p>
          </div>
        </details>
      )}
    </section>
  );
}

function RigaSuggerimento({
  riga, scelta, disabilitata, onScelta, idBase,
}: {
  riga: RigaVista;
  scelta: Scelta | undefined;
  disabilitata: boolean;
  onScelta: (s: Scelta) => void;
  idBase: string;
}) {
  const t = useTranslations('Suggerimenti');
  const legenda = `${idBase}-legenda-${riga.passo}`;
  const motivo = riga.motivoNonApplicabile;

  return (
    <li className="flex flex-col gap-2 rounded-md border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
      <h3 className="m-0 text-sm font-semibold" style={{ color: 'var(--testo)' }}>
        {t('passo', { n: riga.passo })}
        {riga.anche.length > 0 && (
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--testo-tenue)' }}>
            {t('ancheIn', { altri: riga.anche.join(', ') })}
          </span>
        )}
      </h3>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--testo)' }}>
        <dt className="font-medium" style={{ color: 'var(--testo-tenue)' }}>{t('latuaFrase')}</dt>
        <dd className="m-0 break-words">{riga.etichetta}</dd>
        <dt className="font-medium" style={{ color: 'var(--testo-tenue)' }}>{t('nelCatalogo')}</dt>
        <dd className="m-0 break-words">{riga.voce}</dd>
        <dt className="font-medium" style={{ color: 'var(--testo-tenue)' }}>{t('perche')}</dt>
        <dd className="m-0">
          {riga.classe === 'stessi-componenti'
            ? t('prova')
            : riga.somiglianza !== undefined
              ? t('stima', { n: riga.somiglianza })
              : t('stimaSenzaNumero')}
          {riga.perche && (
            <span className="block text-xs" style={{ color: 'var(--testo-tenue)' }}>
              {t('spiegazione', { testo: riga.perche })}
            </span>
          )}
        </dd>
      </dl>

      {motivo ? (
        <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--testo)' }}>
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--ambra)' }} />
          <span>{t('nonApplicabile', { motivo: t(`motivo.${motivo}`) })}</span>
        </p>
      ) : (
        <div role="radiogroup" aria-labelledby={legenda} className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <span id={legenda} className="sr-only">
            {t('legenda', { n: riga.passo })}
          </span>
          {(['mia', 'catalogo'] as const).map((valore) => (
            <label
              key={valore}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm"
              style={{ color: 'var(--testo)' }}
            >
              <input
                type="radio"
                name={`${idBase}-scelta-${riga.passo}`}
                value={valore}
                checked={scelta === valore}
                disabled={disabilitata}
                onChange={() => onScelta(valore)}
                className={`h-5 w-5 ${FOCUS}`}
                style={{ outlineColor: 'var(--blu)' }}
              />
              {valore === 'mia' ? t('tieniMia') : t('usaCatalogo')}
            </label>
          ))}
        </div>
      )}
    </li>
  );
}
