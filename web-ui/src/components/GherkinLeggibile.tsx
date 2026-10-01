'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';
import { tokenizzaGherkin, type RigaGherkin } from '@/lib/gherkin-lettura';

/**
 * Il testo di uno scenario, in sola lettura e con i colori del Gherkin.
 *
 * Il colore RINFORZA, il testo resta leggibile da solo: i valori fra
 * virgolette sono sottolineati, le verifiche a meta' passo hanno la loro icona
 * e la loro frase. Niente CodeMirror: qui non si modifica (vedi
 * `gherkin-lettura.ts`). E' testo vero, selezionabile e copiabile; i numeri di
 * riga stanno in un contatore CSS, quindi copiando non si portano dietro.
 * Il testo va a capo (`pre-wrap`): nessuno scorrimento orizzontale, nemmeno per
 * un passo lungo.
 */
export function GherkinLeggibile({
  testo,
  rigaEvidenziata,
  ariaLabel,
}: {
  testo: string;
  /** La riga di `Scenario:` da evidenziare quando il file ne ha piu' d'uno. */
  rigaEvidenziata?: number;
  ariaLabel: string;
}) {
  const t = useTranslations('Scenari');
  const righe = useMemo(() => tokenizzaGherkin(testo), [testo]);
  const larghezzeTabella = useMemo(() => larghezzePerRiga(righe), [righe]);
  const evidenziata = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Con piu' scenari nel file, quello scelto si porta in vista.
    if (rigaEvidenziata !== undefined) evidenziata.current?.scrollIntoView({ block: 'nearest' });
  }, [rigaEvidenziata, testo]);

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="overflow-x-hidden rounded-lg border py-2 text-sm leading-6 [counter-reset:riga]"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)', color: 'var(--testo)' }}
    >
      {righe.map((r) => {
        const evidenzia = r.numero === rigaEvidenziata;
        return (
          <div
            key={r.numero}
            ref={evidenzia ? evidenziata : undefined}
            className="grid grid-cols-[2.75rem_minmax(0,1fr)] [counter-increment:riga] before:select-none before:pr-3 before:text-right before:text-xs before:leading-6 before:text-[color:var(--testo-tenue)] before:content-[counter(riga)]"
            style={{
              // La barra segna lo scenario scelto.
              borderLeft: `3px solid ${evidenzia ? 'var(--blu)' : 'transparent'}`,
            }}
          >
            <div
              className="min-w-0 whitespace-pre-wrap pr-3 [overflow-wrap:anywhere]"
              style={{ paddingLeft: `${r.rientro}ch` }}
            >
              <Contenuto riga={r} larghezze={larghezzeTabella.get(r.numero)} verifica={(x) => t('verificaNelPasso', { testo: x })} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Le larghezze delle colonne di ogni tabella (righe consecutive), cosi' si allineano. */
function larghezzePerRiga(righe: RigaGherkin[]): Map<number, number[]> {
  const out = new Map<number, number[]>();
  let corrente: Array<Extract<RigaGherkin, { tipo: 'tabella' }>> = [];
  const chiudi = () => {
    if (corrente.length === 0) return;
    const colonne = Math.max(...corrente.map((r) => r.celle.length));
    const larghezze = Array.from({ length: colonne }, (_, i) => Math.max(...corrente.map((r) => (r.celle[i] ?? '').length)));
    for (const r of corrente) out.set(r.numero, larghezze);
    corrente = [];
  };
  for (const r of righe) {
    if (r.tipo === 'tabella') corrente.push(r);
    else chiudi();
  }
  chiudi();
  return out;
}

const TENUE = { color: 'var(--testo-tenue)' } as const;
const BLU = { color: 'var(--blu)' } as const;

function Contenuto({
  riga,
  larghezze,
  verifica,
}: {
  riga: RigaGherkin;
  larghezze?: number[];
  verifica: (testo: string) => string;
}) {
  switch (riga.tipo) {
    case 'vuota':
      return <span aria-hidden="true">&nbsp;</span>;
    case 'tag':
      return (
        <span className="text-xs" style={TENUE}>
          {riga.tag.join(' ')}
        </span>
      );
    case 'intestazione':
      return (
        <>
          <span className="font-bold" style={BLU}>
            {riga.parola}:
          </span>{' '}
          <span className="font-bold">{riga.titolo}</span>
        </>
      );
    case 'passo':
      return (
        <>
          <span className="inline-block min-w-[3.5rem] font-bold" style={BLU}>
            {riga.parola}
          </span>{' '}
          {riga.parti.map((p, i) =>
            p.valore ? (
              <span key={i} className="underline decoration-1 underline-offset-2" style={{ color: 'var(--verde)' }}>
                {p.testo}
              </span>
            ) : (
              <span key={i}>{p.testo}</span>
            )
          )}
        </>
      );
    case 'verifica':
      return (
        <span
          className="inline-flex items-start gap-1.5 rounded px-2 py-0.5"
          style={{ background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
        >
          <Eye size={16} aria-hidden="true" className="mt-1 shrink-0" style={BLU} />
          <span>{verifica(riga.testo)}</span>
        </span>
      );
    case 'commento':
      return (
        <span className="italic" style={TENUE}>
          {riga.testo}
        </span>
      );
    case 'tabella':
      return (
        <span className="font-mono text-xs">
          <span style={TENUE}>|</span>
          {riga.celle.map((c, i) => (
            <span key={i}>
              {` ${c.padEnd(larghezze?.[i] ?? c.length)} `}
              <span style={TENUE}>|</span>
            </span>
          ))}
        </span>
      );
    case 'descrizione':
    case 'semplice':
      return <span>{riga.testo}</span>;
  }
}
