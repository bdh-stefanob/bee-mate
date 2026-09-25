'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { ScheletroCatalogo, ErroreCatalogo } from './Scheletro';
import type { RispostaCatalogo } from './tipi';

/**
 * Domanda 2: "Se cambio questo componente, cosa si rompe?"
 *
 * La mappa al contrario, gia' calcolata dal motore (che riusa
 * `component-impact.ts`, la stessa logica della vecchia pagina
 * `(portale)/components`) e servita dentro `GET /api/catalogo`. Questa
 * sezione ne prende il posto: la pagina del vecchio portale resta nel
 * codice, raggiungibile scrivendone l'indirizzo, ma non serve piu' passarci.
 */
export function SezioneComponenti({
  dati,
  caricamento,
  errore,
}: {
  dati: RispostaCatalogo | null;
  caricamento: boolean;
  errore: string | null;
}) {
  const t = useTranslations('Catalogo');
  const [aperti, setAperti] = useState<Set<string>>(new Set());

  if (caricamento) return <ScheletroCatalogo etichetta={t('caricamento')} />;
  if (errore) return <ErroreCatalogo messaggio={t('erroreCarico', { dettaglio: errore })} />;

  const componenti = [...(dati?.componenti ?? [])].sort((a, b) => b.step.length - a.step.length);

  if (componenti.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('nessunComponenteInCatalogo')}
      </p>
    );
  }

  function commuta(chiave: string) {
    setAperti((prev) => {
      const next = new Set(prev);
      if (next.has(chiave)) next.delete(chiave);
      else next.add(chiave);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
      <table className="min-w-[600px] w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--bordo)' }}>
            <th className="text-left px-3 py-2">{t('colonnaComponente')}</th>
            <th className="text-left px-3 py-2">{t('colonnaPagina')}</th>
            <th className="text-left px-3 py-2">{t('colonnaStep')}</th>
          </tr>
        </thead>
        <tbody>
          {componenti.map((c) => {
            const chiave = `${c.page ?? ''}\u0000${c.role}\u0000${c.name}`;
            const aperto = aperti.has(chiave);
            return (
              <>
                <tr
                  key={chiave}
                  className="border-b cursor-pointer select-none"
                  style={{ borderColor: 'var(--bordo)' }}
                  onClick={() => commuta(chiave)}
                  aria-expanded={aperto}
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    {c.role} &ldquo;{c.name}&rdquo;
                  </td>
                  <td className="px-3 py-2">{c.page ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
                    >
                      {t('nStep', { n: c.step.length })}
                    </Badge>
                  </td>
                </tr>
                {aperto && (
                  <tr key={`${chiave}-dettaglio`} style={{ background: 'var(--superficie-tenue)' }}>
                    <td colSpan={3} className="px-3 py-2">
                      <ul className="flex flex-col gap-1">
                        {c.step.map((espressione, i) => (
                          <li key={i} className="font-mono text-xs" style={{ color: 'var(--testo-tenue)' }}>
                            {espressione}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
