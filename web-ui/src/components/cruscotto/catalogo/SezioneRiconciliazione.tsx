'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { GitMerge, Signpost, Loader2, CheckCircle2, Info, Undo2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScheletroCatalogo, ErroreCatalogo } from './Scheletro';
import type {
  AnteprimaFusione,
  CoppiaRiconciliazione,
  RispostaCatalogo,
  RispostaFusione,
  RispostaRiconciliazione,
  StatoAnnullamentoFusione,
  StepCatalogo,
  UsoScenario,
} from './tipi';

/**
 * Domanda 3: "Dove sta nascendo il disordine?"
 *
 * Il punto delicato dell'intero lavoro: due frasi quasi uguali con gli
 * *stessi* componenti sono un doppione; due frasi quasi uguali con componenti
 * *diversi* sono un equivoco di denominazione (si distinguono, non si
 * fondono). Il motore giudica quale caso sia (`stessoComponente`); questa
 * sezione lo rende visivamente inconfondibile invece di mostrare le due
 * coppie con la stessa scheda: icona diversa, colore diverso (ambra vs
 * rosso — il rosso e' riservato al caso che farebbe danno se trattato come
 * l'altro), e per l'equivoco un pulsante che il doppione non ha affatto (vedi
 * sotto il perche').
 *
 * `GET /api/catalogo/riconciliazione` non porta con se' `usatoIn` per le due
 * frasi (la vista dell'engine e' piu' leggera, solo per il confronto): questa
 * sezione lo recupera incrociando l'espressione con `GET /api/catalogo`, gia'
 * caricato dalla pagina, cosi' l'anteprima "cosa cambiera'" resta possibile
 * senza duplicare la lettura del catalogo.
 */
export function SezioneRiconciliazione({ catalogo }: { catalogo: RispostaCatalogo | null }) {
  const t = useTranslations('Catalogo');
  const [dati, setDati] = useState<RispostaRiconciliazione | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [rigenerazione, setRigenerazione] = useState(0);

  useEffect(() => {
    let annullato = false;
    setCaricamento(true);
    fetch('/api/catalogo/riconciliazione')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((corpo: RispostaRiconciliazione) => {
        if (!annullato) {
          setDati(corpo);
          setCaricamento(false);
          setErrore(null);
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
  }, [rigenerazione]);

  const usatoInPerEspressione = useMemo(() => {
    const m = new Map<string, UsoScenario[]>();
    for (const s of catalogo?.step ?? []) m.set(s.espressione, s.usatoIn);
    return m;
  }, [catalogo]);

  if (caricamento) return <ScheletroCatalogo etichetta={t('caricamento')} />;
  if (errore) return <ErroreCatalogo messaggio={t('erroreCarico', { dettaglio: errore })} />;

  const coppie = dati?.coppie ?? [];

  function conUsatoIn(s: CoppiaRiconciliazione['a']): StepCatalogo {
    return { ...s, usatoIn: usatoInPerEspressione.get(s.espressione) ?? [] };
  }

  return (
    <div className="flex flex-col gap-3">
      <BannerAnnullamentoFusione onAnnullato={() => setRigenerazione((n) => n + 1)} />
      {coppie.length === 0 ? (
        <p className="text-sm flex items-center gap-2" style={{ color: 'var(--testo-tenue)' }}>
          <CheckCircle2 size={16} aria-hidden="true" style={{ color: 'var(--blu)' }} />
          {t('nessunDisordine')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {coppie.map((coppia) => {
            const arricchita: CoppiaRiconciliazione & { a: StepCatalogo; b: StepCatalogo } = {
              ...coppia,
              a: conUsatoIn(coppia.a),
              b: conUsatoIn(coppia.b),
            };
            return (
              <li key={coppia.id}>
                {coppia.stessoComponente ? (
                  <SchedaDoppione coppia={arricchita} onFuso={() => setRigenerazione((n) => n + 1)} />
                ) : (
                  <SchedaEquivoco coppia={arricchita} onRiconciliato={() => setRigenerazione((n) => n + 1)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * "Torna indietro senza rimettere a mano cinque file": un solo livello di
 * annullamento, l'ultima fusione soltanto (vedi la rotta `fondi/annulla` per
 * il perche' basta). Il banner compare solo quando c'e' davvero qualcosa da
 * annullare — niente pulsante morto che non fa nulla.
 */
function BannerAnnullamentoFusione({ onAnnullato }: { onAnnullato: () => void }) {
  const t = useTranslations('Catalogo');
  const [stato, setStato] = useState<StatoAnnullamentoFusione | null>(null);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);

  useEffect(() => {
    let annullato = false;
    fetch('/api/catalogo/fondi/annulla')
      .then((res) => (res.ok ? res.json() : { disponibile: false }))
      .then((corpo: StatoAnnullamentoFusione) => {
        if (!annullato) setStato(corpo);
      })
      .catch(() => {
        if (!annullato) setStato({ disponibile: false });
      });
    return () => {
      annullato = true;
    };
  }, []);

  if (!stato?.disponibile) return null;

  async function annulla() {
    setInCorso(true);
    setEsito(null);
    try {
      const res = await fetch('/api/catalogo/fondi/annulla', { method: 'POST' });
      const corpo = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEsito({ ok: false, testo: t('annullamentoFallito', { dettaglio: corpo?.errore ?? `HTTP ${res.status}` }) });
      } else {
        setEsito({ ok: true, testo: t('annullamentoRiuscito') });
        setStato({ disponibile: false });
        onAnnullato();
      }
    } catch (err) {
      setEsito({ ok: false, testo: t('annullamentoFallito', { dettaglio: err instanceof Error ? err.message : String(err) }) });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <div
      className="rounded-lg border p-3 flex flex-wrap items-center gap-3"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
    >
      <span className="text-sm flex-1" style={{ color: 'var(--testo-tenue)' }}>
        {t('ultimaFusioneDisponibile', { da: stato.da ?? '', a: stato.a ?? '' })}
      </span>
      <Button onClick={annulla} disabled={inCorso} variant="outline">
        {inCorso ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Undo2 size={16} aria-hidden="true" />}
        {t('annullaUltimaFusione')}
      </Button>
      {esito && (
        <span className="text-sm w-full" style={{ color: esito.ok ? 'var(--blu)' : 'var(--rosso)' }}>
          {esito.testo}
        </span>
      )}
    </div>
  );
}

function EtichettaComponenti({ step }: { step: StepCatalogo }) {
  if (step.componenti.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {step.componenti.map((c, i) => (
        <Badge key={i} variant="secondary">
          {c.role} &ldquo;{c.name}&rdquo;
        </Badge>
      ))}
    </span>
  );
}

async function inviaRiconciliazione(da: string, a: string): Promise<{ ok: boolean; errore?: string }> {
  try {
    const res = await fetch('/api/catalogo/riconcilia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ da, a }),
    });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, errore: corpo?.errore ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, errore: err instanceof Error ? err.message : String(err) };
  }
}

async function chiediAnteprimaFusione(da: string, a: string): Promise<AnteprimaFusione> {
  const res = await fetch(`/api/catalogo/fondi?da=${encodeURIComponent(da)}&a=${encodeURIComponent(a)}`);
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(corpo?.errore ?? `HTTP ${res.status}`);
  return corpo as AnteprimaFusione;
}

async function inviaFusione(da: string, a: string, procediNonostanteDifferenza: boolean): Promise<RispostaFusione & { status: number }> {
  const res = await fetch('/api/catalogo/fondi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ da, a, procediNonostanteDifferenza }),
  });
  const corpo = await res.json().catch(() => ({}));
  return { ...corpo, status: res.status };
}

/**
 * Doppione: stesso componente dietro due frasi. Il gesto che il tester ha
 * chiesto: si sceglie la frase che resta, si vede COSA cambierebbe (quante
 * righe, in quali scenari, quale definizione sparisce), e solo dopo si
 * conferma. Se i due gestori non fanno la stessa cosa, la fusione normale
 * resta disabilitata: bisogna prima guardare entrambi i corpi e confermare
 * esplicitamente che va bene perdere quello della frase che sparisce — un
 * gesto separato, non lo stesso pulsante "Fondi" di sempre.
 */
function SchedaDoppione({ coppia, onFuso }: { coppia: CoppiaRiconciliazione; onFuso: () => void }) {
  const t = useTranslations('Catalogo');
  const [vincente, setVincente] = useState<'a' | 'b' | null>(null);
  const [anteprima, setAnteprima] = useState<AnteprimaFusione | null>(null);
  const [caricamentoAnteprima, setCaricamentoAnteprima] = useState(false);
  const [erroreAnteprima, setErroreAnteprima] = useState<string | null>(null);
  const [confermaCapito, setConfermaCapito] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);

  const fraseVincente = vincente === 'a' ? coppia.a.espressione : vincente === 'b' ? coppia.b.espressione : null;
  const frasePerdente = vincente === 'a' ? coppia.b.espressione : vincente === 'b' ? coppia.a.espressione : null;

  useEffect(() => {
    setAnteprima(null);
    setErroreAnteprima(null);
    setConfermaCapito(false);
    setEsito(null);
    if (!fraseVincente || !frasePerdente) return;
    let annullato = false;
    setCaricamentoAnteprima(true);
    chiediAnteprimaFusione(frasePerdente, fraseVincente)
      .then((corpo) => {
        if (!annullato) setAnteprima(corpo);
      })
      .catch((err) => {
        if (!annullato) setErroreAnteprima(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!annullato) setCaricamentoAnteprima(false);
      });
    return () => {
      annullato = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraseVincente, frasePerdente]);

  async function fondi(procediNonostanteDifferenza: boolean) {
    if (!fraseVincente || !frasePerdente) return;
    setInCorso(true);
    setEsito(null);
    const risultato = await inviaFusione(frasePerdente, fraseVincente, procediNonostanteDifferenza);
    setInCorso(false);
    if (risultato.ok) {
      setEsito({ ok: true, testo: t('fusioneRiuscita') });
      onFuso();
    } else {
      setEsito({ ok: false, testo: t('fusioneFallita', { dettaglio: risultato.errore ?? '' }) });
    }
  }

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--ambra)', background: 'var(--superficie)' }}>
      <div className="flex items-start gap-2">
        <GitMerge size={18} aria-hidden="true" style={{ color: 'var(--ambra)' }} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-medium" style={{ color: 'var(--testo)' }}>
            {t('doppioneTitolo')}
          </p>
          <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('doppioneSpiegazione')}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm font-medium" style={{ color: 'var(--testo)' }}>
        {t('sceltaFraseVincenteLabel')}
      </p>
      <div className="mt-1 flex flex-col gap-2">
        {[coppia.a, coppia.b].map((s, i) => {
          const l = i === 0 ? 'a' : 'b';
          return (
            <label
              key={l}
              className="min-h-10 flex items-center gap-2 px-3 rounded-md border cursor-pointer"
              style={{ borderColor: vincente === l ? 'var(--blu)' : 'var(--bordo)', background: 'var(--superficie-tenue)' }}
            >
              <input
                type="radio"
                name={`vincente-${coppia.id}`}
                checked={vincente === l}
                onChange={() => setVincente(l)}
                className="focus-visible:outline focus-visible:outline-2"
                style={{ outlineColor: 'var(--blu)' }}
              />
              <span className="font-mono text-xs flex-1" style={{ color: 'var(--testo)' }}>
                {s.espressione}
              </span>
              <EtichettaComponenti step={s} />
              <Badge variant="outline">{t('nUsi', { n: s.usatoIn.length })}</Badge>
              {vincente === l && <Badge>{t('fraseVincenteEtichetta')}</Badge>}
            </label>
          );
        })}
      </div>

      {vincente && caricamentoAnteprima && (
        <p className="mt-3 text-sm flex items-center gap-2" style={{ color: 'var(--testo-tenue)' }}>
          <Loader2 className="animate-spin" size={14} aria-hidden="true" />
          {t('fraseCaricamentoAnteprima')}
        </p>
      )}

      {vincente && erroreAnteprima && (
        <p className="mt-3 text-sm" style={{ color: 'var(--rosso)' }}>
          {t('anteprimaErrore', { dettaglio: erroreAnteprima })}
        </p>
      )}

      {vincente && anteprima && fraseVincente && frasePerdente && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="text-sm rounded-md border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
            <p className="font-medium" style={{ color: 'var(--testo)' }}>
              {t('cosaCambieraTitolo')}
            </p>
            <p style={{ color: 'var(--testo-tenue)' }}>
              {t('cosaCambieraFusione', { righe: anteprima.righeCoinvolte, frase: frasePerdente, file: anteprima.definizionePersa })}
            </p>
            {anteprima.scenariCoinvolti.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {anteprima.scenariCoinvolti.map((u, i) => (
                  <li key={i} className="font-mono text-xs" style={{ color: 'var(--testo-tenue)' }}>
                    {u.scenario} — {u.file}:{u.riga}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {anteprima.equivalenti ? (
            <div className="flex items-center gap-2">
              <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
                {t('corpiUgualiEsito')}
              </p>
            </div>
          ) : (
            <div className="rounded-md border p-3" style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)' }}>
              <p className="font-medium flex items-center gap-2" style={{ color: 'var(--rosso)' }}>
                <AlertTriangle size={16} aria-hidden="true" />
                {t('corpiDiversiTitolo')}
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--testo-tenue)' }}>
                {t('corpiDiversiSpiegazione', { frase: frasePerdente })}
              </p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-md border p-2" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--testo)' }}>
                    {t('corpoDiLabel', { frase: frasePerdente })}
                  </p>
                  <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--testo)' }}>
                    {anteprima.corpoDa ?? ''}
                  </pre>
                </div>
                <div className="rounded-md border p-2" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--testo)' }}>
                    {t('corpoDiLabel', { frase: fraseVincente })}
                  </p>
                  <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: 'var(--testo)' }}>
                    {anteprima.corpoA ?? ''}
                  </pre>
                </div>
              </div>
              <label className="mt-2 flex items-start gap-2 text-sm cursor-pointer" style={{ color: 'var(--testo)' }}>
                <input
                  type="checkbox"
                  checked={confermaCapito}
                  onChange={(e) => setConfermaCapito(e.target.checked)}
                  className="mt-0.5"
                />
                {t('confermaCapito', { frase: frasePerdente })}
              </label>
            </div>
          )}

          <div className="flex items-center gap-2">
            {anteprima.equivalenti ? (
              <Button onClick={() => fondi(false)} disabled={inCorso}>
                {inCorso ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <GitMerge size={16} aria-hidden="true" />}
                {t('fondiPulsante')}
              </Button>
            ) : (
              <Button onClick={() => fondi(true)} disabled={inCorso || !confermaCapito} variant="destructive">
                {inCorso ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
                {t('fondiComunquePulsante')}
              </Button>
            )}
            {esito && (
              <span className="text-sm" style={{ color: esito.ok ? 'var(--blu)' : 'var(--rosso)' }}>
                {esito.testo}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Equivoco di denominazione: componenti diversi. Il gesto e' distinguere, mai fondere. */
function SchedaEquivoco({ coppia, onRiconciliato }: { coppia: CoppiaRiconciliazione; onRiconciliato: () => void }) {
  const t = useTranslations('Catalogo');
  const [lato, setLato] = useState<'a' | 'b' | null>(null);
  const [nuovaFrase, setNuovaFrase] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<{ ok: boolean; testo: string } | null>(null);

  const originale = lato === 'a' ? coppia.a : lato === 'b' ? coppia.b : null;

  function scegli(l: 'a' | 'b') {
    setLato(l);
    setEsito(null);
    const s = l === 'a' ? coppia.a : coppia.b;
    const nomeComponente = s.componenti[0]?.name;
    setNuovaFrase(nomeComponente ? `${s.espressione} (${nomeComponente})` : s.espressione);
  }

  async function conferma() {
    if (!originale || !nuovaFrase.trim() || nuovaFrase.trim() === originale.espressione) return;
    setInCorso(true);
    setEsito(null);
    const risultato = await inviaRiconciliazione(originale.espressione, nuovaFrase.trim());
    setInCorso(false);
    if (risultato.ok) {
      setEsito({ ok: true, testo: t('distinzioneRiuscita') });
      onRiconciliato();
    } else {
      setEsito({ ok: false, testo: t('riconciliazioneFallita', { dettaglio: risultato.errore ?? '' }) });
    }
  }

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)' }}>
      <div className="flex items-start gap-2">
        <Signpost size={18} aria-hidden="true" style={{ color: 'var(--rosso)' }} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="font-medium" style={{ color: 'var(--testo)' }}>
            {t('equivocoTitolo')}
          </p>
          <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('equivocoAvviso')}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {[coppia.a, coppia.b].map((s, i) => {
          const l = i === 0 ? 'a' : 'b';
          return (
            <label
              key={l}
              className="min-h-10 flex items-center gap-2 px-3 rounded-md border cursor-pointer"
              style={{ borderColor: lato === l ? 'var(--blu)' : 'var(--bordo)', background: 'var(--superficie-tenue)' }}
            >
              <input
                type="radio"
                name={`da-distinguere-${coppia.id}`}
                checked={lato === l}
                onChange={() => scegli(l)}
                className="focus-visible:outline focus-visible:outline-2"
                style={{ outlineColor: 'var(--blu)' }}
              />
              <span className="font-mono text-xs flex-1" style={{ color: 'var(--testo)' }}>
                {s.espressione}
              </span>
              <EtichettaComponenti step={s} />
              <Badge variant="outline">{t('nUsi', { n: s.usatoIn.length })}</Badge>
            </label>
          );
        })}
      </div>

      {originale && (
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ color: 'var(--testo)' }} htmlFor={`nuova-frase-${coppia.id}`}>
            {t('nuovaFraseLabel')}
          </label>
          <input
            id={`nuova-frase-${coppia.id}`}
            type="text"
            value={nuovaFrase}
            onChange={(e) => setNuovaFrase(e.target.value)}
            className="min-h-10 rounded-md border px-3 font-mono text-xs focus-visible:outline focus-visible:outline-2"
            style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
          />
          <div className="text-sm rounded-md border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
            <p className="font-medium" style={{ color: 'var(--testo)' }}>
              {t('cosaCambieraTitolo')}
            </p>
            <p style={{ color: 'var(--testo-tenue)' }}>
              {t('cosaCambieraEquivoco', { righe: originale.usatoIn.length, frase: originale.espressione })}
            </p>
            {originale.usatoIn.length > 0 && (
              <ul className="mt-1 flex flex-col gap-0.5">
                {originale.usatoIn.map((u, i) => (
                  <li key={i} className="font-mono text-xs" style={{ color: 'var(--testo-tenue)' }}>
                    {u.scenario} — {u.file}:{u.riga}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          onClick={conferma}
          disabled={!originale || !nuovaFrase.trim() || nuovaFrase.trim() === originale?.espressione || inCorso}
          variant="destructive"
        >
          {inCorso ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <Signpost size={16} aria-hidden="true" />}
          {t('distinguiLeFrasi')}
        </Button>
        {esito && (
          <span className="text-sm" style={{ color: esito.ok ? 'var(--blu)' : 'var(--rosso)' }}>
            {esito.testo}
          </span>
        )}
      </div>
    </div>
  );
}
