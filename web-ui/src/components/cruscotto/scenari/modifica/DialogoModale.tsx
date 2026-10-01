'use client';

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

const FOCALIZZABILI = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Un dialogo che trattiene il fuoco (spec A11): `role="dialog"` `aria-modal`, il
 * fuoco entra sul primo controllo (o su quello marcato `data-iniziale`, la scelta
 * piu' sicura), Tab non esce, Esc fa `onEsc` — che deve scegliere SEMPRE l'opzione
 * che non cambia niente — e alla chiusura il fuoco torna a chi lo aveva aperto.
 * Mai `window.confirm`.
 */
export function DialogoModale({
  titolo,
  onEsc,
  children,
}: {
  titolo: string;
  onEsc: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const radice = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prima = document.activeElement as HTMLElement | null;
    const iniziale =
      radice.current?.querySelector<HTMLElement>('[data-iniziale]') ?? radice.current?.querySelector<HTMLElement>(FOCALIZZABILI);
    iniziale?.focus();
    return () => {
      // Il pulsante che ha aperto il dialogo puo' non esserci piu' (si e' ridisegnato): niente di grave.
      if (prima && document.contains(prima)) prima.focus();
    };
  }, []);

  const suTasto = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onEsc();
      return;
    }
    if (e.key !== 'Tab') return;
    const elementi = [...(radice.current?.querySelectorAll<HTMLElement>(FOCALIZZABILI) ?? [])];
    if (elementi.length === 0) return;
    const primo = elementi[0];
    const ultimo = elementi[elementi.length - 1];
    if (e.shiftKey && document.activeElement === primo) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primo.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        ref={radice}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onKeyDown={suTasto}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-lg border p-5"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)', color: 'var(--testo)' }}
      >
        <h2 id={id} className="text-base font-semibold">
          {titolo}
        </h2>
        {children}
      </div>
    </div>
  );
}
