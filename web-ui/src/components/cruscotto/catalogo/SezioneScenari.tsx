'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScheletroCatalogo, ErroreCatalogo } from './Scheletro';
import type { FileScenari } from '@/lib/scenari';

interface RispostaScenari {
  file: FileScenari[];
}

interface Gruppo {
  app: string;
  flusso: string;
  file: FileScenari[];
}

/** Applicazione/flusso da un percorso `src/features/<app>/<flusso>/...`. */
function gruppoDi(percorso: string): { app: string; flusso: string } {
  const parti = percorso.split('/');
  return { app: parti[0] ?? '—', flusso: parti[1] ?? '—' };
}

function raggruppa(file: FileScenari[]): Gruppo[] {
  const byChiave = new Map<string, Gruppo>();
  for (const f of file) {
    const { app, flusso } = gruppoDi(f.file);
    const chiave = `${app}\u0000${flusso}`;
    const esistente = byChiave.get(chiave);
    if (esistente) esistente.file.push(f);
    else byChiave.set(chiave, { app, flusso, file: [f] });
  }
  return [...byChiave.values()].sort(
    (a, b) => a.app.localeCompare(b.app) || a.flusso.localeCompare(b.flusso)
  );
}

/**
 * Gli scenari, raggruppati per applicazione e flusso, ognuno con il suo
 * pulsante di esportazione. Consuma `GET /api/scenari`, che esiste gia' ed e'
 * di sola lettura — l'esportazione vera e propria (`GET /api/scenari/esporta`)
 * e' del motore, costruita in parallelo: il pulsante punta li' anche se oggi
 * la rotta non risponde ancora.
 */
export function SezioneScenari() {
  const t = useTranslations('Catalogo');
  const [gruppi, setGruppi] = useState<Gruppo[] | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let annullato = false;
    fetch('/api/scenari')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((corpo: RispostaScenari) => {
        if (!annullato) {
          setGruppi(raggruppa(corpo.file ?? []));
          setCaricamento(false);
        }
      })
      .catch((err) => {
        if (!annullato) {
          setErrore(err instanceof Error ? err.message : String(err));
          setCaricamento(false);
        }
      });
    return () => {
      annullato = true;
    };
  }, []);

  if (caricamento) return <ScheletroCatalogo etichetta={t('caricamento')} />;
  if (errore) return <ErroreCatalogo messaggio={t('erroreCarico', { dettaglio: errore })} />;
  if (!gruppi || gruppi.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('nessunoScenarioSalvato')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {gruppi.map((g) => (
        <div key={`${g.app}\u0000${g.flusso}`} className="rounded-lg border" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--bordo)' }}>
            <FolderOpen size={16} aria-hidden="true" style={{ color: 'var(--testo-tenue)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
              {g.app} / {g.flusso}
            </span>
          </div>
          <ul className="flex flex-col">
            {g.file.map((f) =>
              f.scenari.map((s) => (
                <li
                  key={`${f.file}\u0000${s.nome}`}
                  className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0"
                  style={{ borderColor: 'var(--bordo)' }}
                >
                  <span className="text-sm flex-1" style={{ color: 'var(--testo)' }}>
                    {s.nome}
                  </span>
                  {f.generato && (
                    <Badge variant="outline" style={{ borderColor: 'var(--bordo)', color: 'var(--testo-tenue)' }}>
                      {t('generato')}
                    </Badge>
                  )}
                  <a
                    href={`/api/scenari/esporta?file=${encodeURIComponent(f.file)}`}
                    className="min-h-10 inline-flex items-center gap-1.5 px-2.5 rounded-md text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: 'var(--blu)', outlineColor: 'var(--blu)' }}
                    aria-label={t('esportaScenario', { nome: s.nome })}
                  >
                    <Download size={16} aria-hidden="true" />
                    {t('esporta')}
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
