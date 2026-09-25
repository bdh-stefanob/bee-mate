/** Righe che pulsano al posto del contenuto, comune a tutte le sezioni del Catalogo. */
export function ScheletroCatalogo({ etichetta }: { etichetta: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">{etichetta}</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg border"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/** Riquadro d'errore uniforme: la rotta manca o non risponde ancora. */
export function ErroreCatalogo({ messaggio }: { messaggio: string }) {
  return (
    <div
      className="rounded-lg border p-4 text-sm flex items-center gap-2"
      style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)', color: 'var(--testo)' }}
    >
      {messaggio}
    </div>
  );
}
