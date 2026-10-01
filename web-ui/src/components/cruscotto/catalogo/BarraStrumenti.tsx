'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const RITARDO_RICERCA_MS = 250;

/**
 * Ricerca, filtri e riga dei risultati sopra una lista. Si mostra solo se le
 * voci sono piu' di 8 (`mostraFiltri`): con tre voci una ricerca e' rumore.
 *
 * La ricerca scrive nell'indirizzo dopo 250 ms (il campo e' reattivo, l'URL
 * no: Indietro non deve ripercorrere ogni lettera). I filtri vanno in
 * `children`, ognuno un `PulsanteFiltro` o un `<select>`.
 */
export function BarraStrumenti({
  q,
  onQ,
  segnaposto,
  children,
  mostrati,
  totale,
  nAttivi,
  onTogliFiltri,
}: {
  q: string;
  onQ: (q: string) => void;
  segnaposto: string;
  children?: React.ReactNode;
  mostrati: number;
  totale: number;
  nAttivi: number;
  onTogliFiltri: () => void;
}) {
  const t = useTranslations('Catalogo');
  const idCampo = useId();
  const campo = useRef<HTMLInputElement>(null);
  const [testo, setTesto] = useState(q);

  // L'ultimo valore che il campo ha mandato all'indirizzo: serve a non
  // sovrascrivere con la risposta lenta dell'indirizzo cio' che nel frattempo
  // si e' scritto ("ab" torna dopo che sono gia' stati digitati "abc").
  const inviato = useRef(q);

  // Cambi dall'esterno (Indietro, "Togli i filtri", un link): il campo li segue.
  useEffect(() => {
    if (q === inviato.current) return;
    inviato.current = q;
    setTesto(q);
  }, [q]);

  useEffect(() => {
    if (testo === inviato.current) return;
    const timer = setTimeout(() => {
      inviato.current = testo;
      onQ(testo);
    }, RITARDO_RICERCA_MS);
    return () => clearTimeout(timer);
  }, [testo, onQ]);

  // Nessun risultato per i filtri: il focus va al campo, cosi' si corregge subito.
  useEffect(() => {
    if (totale !== 0 || nAttivi === 0) return;
    const attivo = document.activeElement;
    if (!attivo || attivo === document.body || attivo.tagName === 'BUTTON') campo.current?.focus();
  }, [totale, nAttivi]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <label htmlFor={idCampo} className="sr-only">
          {t('cerca')}
        </label>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--testo-tenue)' }} />
        <input
          id={idCampo}
          ref={campo}
          type="search"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder={segnaposto}
          className="min-h-10 w-full rounded-md border pl-9 pr-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        />
      </div>

      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm" style={{ color: 'var(--testo-tenue)' }}>
        <p role="status" aria-live="polite">
          {t('mostrati', { mostrati, totale })}
        </p>
        {nAttivi > 0 && (
          <Button variant="ghost" className="min-h-10 h-auto" onClick={onTogliFiltri}>
            {t('togliFiltri')}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Un filtro a pulsante: `aria-pressed`, e quando e' attivo anche un segno di spunta (mai solo il colore). */
export function PulsanteFiltro({
  attivo,
  onClick,
  children,
}: {
  attivo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={attivo}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 text-sm outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        attivo && 'font-semibold'
      )}
      style={{
        borderColor: attivo ? 'var(--blu)' : 'var(--bordo)',
        background: attivo ? 'var(--superficie-tenue)' : 'var(--superficie)',
        color: 'var(--testo)',
        outlineColor: 'var(--blu)',
      }}
    >
      {attivo && <Check size={14} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Un `<select>` nativo (sul telefono apre il selettore del sistema), con la sua etichetta visibile. */
export function SelezioneFiltro({
  etichetta,
  valore,
  onCambia,
  opzioni,
}: {
  etichetta: string;
  valore: string;
  onCambia: (v: string) => void;
  opzioni: { valore: string; testo: string }[];
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {etichetta}
      </label>
      <select
        id={id}
        value={valore}
        onChange={(e) => onCambia(e.target.value)}
        className="min-h-10 rounded-md border px-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
      >
        {opzioni.map((o) => (
          <option key={o.valore} value={o.valore}>
            {o.testo}
          </option>
        ))}
      </select>
    </div>
  );
}
