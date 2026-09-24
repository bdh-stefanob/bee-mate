'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, FolderInput, Loader2 } from 'lucide-react';
import type { CodiceErrore, EsitoSalvataggio } from '@/lib/salva-scenario';

interface Cartella {
  app: string;
  flussi: string[];
}

const CHIAVE_ERRORE: Record<CodiceErrore, string> = {
  'non-registrato': 'erroreNonRegistrato',
  'non-trovato': 'erroreNonTrovato',
  app: 'erroreApp',
  flusso: 'erroreFlusso',
  titolo: 'erroreTitolo',
  troppi: 'erroreTroppi',
};

/**
 * Lo stesso nome che il server accetta (`[a-z0-9-]`): lo si normalizza mentre
 * si scrive, cosi' il tester vede subito il nome della cartella che nascera',
 * invece di scoprirlo da un errore.
 */
function comeCartella(valore: string): string {
  return valore.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const STILE_CAMPO = {
  borderColor: 'var(--bordo)',
  background: 'var(--superficie)',
  color: 'var(--testo)',
  outlineColor: 'var(--blu)',
} as const;
const CLASSE_CAMPO =
  'min-h-10 w-full min-w-0 rounded-md border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

/**
 * Dopo "Genera il test": a quale applicazione e flusso appartiene lo scenario,
 * e come si chiama. I valori proposti vengono dal catalogo (campi `app` e
 * `area`) e dalle cartelle che esistono gia'; se ne puo' scrivere uno nuovo.
 */
export function SalvaScenario({
  titoloProposto,
  onSalvato,
  onTieni,
}: {
  titoloProposto: string;
  onSalvato: (esito: EsitoSalvataggio) => void;
  onTieni: () => void;
}) {
  const t = useTranslations('Salva');
  const id = useId();
  const [cartelle, setCartelle] = useState<Cartella[]>([]);
  const [app, setApp] = useState('');
  const [flusso, setFlusso] = useState('');
  const [titolo, setTitolo] = useState(titoloProposto);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let attivo = true;
    fetch('/api/scenari/cartelle')
      .then((r) => r.json())
      .then((d: { cartelle?: Cartella[] }) => {
        if (attivo) setCartelle(d.cartelle ?? []);
      })
      .catch(() => {
        // Senza suggerimenti si scrive a mano: non e' un motivo per fermarsi.
      });
    return () => {
      attivo = false;
    };
  }, []);

  const flussiProposti = cartelle.find((c) => c.app === app)?.flussi ?? [];
  const pronto = app !== '' && flusso !== '' && titolo.trim() !== '';

  const salva = async () => {
    if (!pronto || salvando) return;
    setSalvando(true);
    setErrore(null);
    try {
      const risposta = await fetch('/api/scenari/salva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app, flusso, titolo: titolo.trim() }),
      });
      const corpo = (await risposta.json()) as Partial<EsitoSalvataggio> & { codice?: CodiceErrore };
      if (!risposta.ok || !corpo.file) {
        setErrore(t(corpo.codice ? CHIAVE_ERRORE[corpo.codice] : 'erroreGenerico'));
        return;
      }
      onSalvato(corpo as EsitoSalvataggio);
    } catch {
      setErrore(t('erroreGenerico'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section
      className="flex flex-col gap-4 rounded-lg border p-4"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
      aria-labelledby={`${id}-titolo`}
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-titolo`} className="text-base font-semibold" style={{ color: 'var(--testo)' }}>
          {t('titolo')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('descrizione')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-app`} className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('app')}
          </label>
          <input
            id={`${id}-app`}
            list={`${id}-app-elenco`}
            value={app}
            onChange={(e) => setApp(comeCartella(e.target.value))}
            placeholder={t('appEsempio')}
            className={CLASSE_CAMPO}
            style={STILE_CAMPO}
            autoComplete="off"
          />
          <datalist id={`${id}-app-elenco`}>
            {cartelle.map((c) => (
              <option key={c.app} value={c.app} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-flusso`} className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('flusso')}
          </label>
          <input
            id={`${id}-flusso`}
            list={`${id}-flusso-elenco`}
            value={flusso}
            onChange={(e) => setFlusso(comeCartella(e.target.value))}
            placeholder={t('flussoEsempio')}
            className={CLASSE_CAMPO}
            style={STILE_CAMPO}
            autoComplete="off"
          />
          <datalist id={`${id}-flusso-elenco`}>
            {flussiProposti.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-nome`} className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
          {t('nome')}
        </label>
        <input
          id={`${id}-nome`}
          value={titolo}
          maxLength={80}
          onChange={(e) => setTitolo(e.target.value)}
          className={CLASSE_CAMPO}
          style={STILE_CAMPO}
        />
      </div>

      {app && flusso && (
        <p className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
          {t('destinazione', { percorso: `src/features/${app}/${flusso}/` })}
        </p>
      )}

      {errore && (
        <p role="alert" className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--rosso)' }}>
          <AlertTriangle size={16} aria-hidden="true" />
          {errore}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void salva()}
          disabled={!pronto || salvando}
          className="inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
        >
          {salvando ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <FolderInput size={16} aria-hidden="true" />
          )}
          {salvando ? t('salvando') : t('salva')}
        </button>
        <button
          type="button"
          onClick={onTieni}
          disabled={salvando}
          className="inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
          style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          {t('tieni')}
        </button>
      </div>
    </section>
  );
}
