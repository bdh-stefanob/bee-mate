'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Un elenco vuoto che spiega perche' e cosa fare, invece di una pagina che
 * sembra rotta. L'azione e' un link (porta a un'altra schermata), non un
 * pulsante che finge di fare qualcosa.
 */
export function StatoVuoto({
  icona: Icona,
  titolo,
  testo,
  dettaglio,
  azione,
}: {
  icona: LucideIcon;
  titolo: string;
  testo: string;
  dettaglio?: string;
  azione?: { href: string; etichetta: string };
}) {
  return (
    <div
      className="rounded-lg border p-6 flex flex-col items-start gap-2"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
    >
      <Icona size={24} aria-hidden="true" style={{ color: 'var(--blu)' }} />
      <p className="font-medium" style={{ color: 'var(--testo)' }}>
        {titolo}
      </p>
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {testo}
      </p>
      {dettaglio && (
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {dettaglio}
        </p>
      )}
      {azione && (
        <Link href={azione.href} className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 min-h-10 h-auto')}>
          {azione.etichetta}
        </Link>
      )}
    </div>
  );
}
