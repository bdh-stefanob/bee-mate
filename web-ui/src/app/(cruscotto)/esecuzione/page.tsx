'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Traduttore } from '@/lib/formato-quando';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PlayCircle, Loader2, AlertTriangle, Square, Plus, X } from 'lucide-react';
import { ProvaPassata } from '@/components/cruscotto/ProvaPassata';
import { PannelloCorsia, type StatoCorsia } from '@/components/cruscotto/esecuzione/PannelloCorsia';
import { cn } from '@/lib/utils';
import type { NomeComando } from '@/lib/esecuzione';
import { cancellaRiaggancio } from '@/lib/riaggancio-client';
import { useAmbiente } from '@/context/AmbienteContext';
import type { FileScenari } from '@/lib/scenari';
import { leggiConLimite, leggiElencoScenari, statoElencoScenari, type EsitoElencoScenari } from '@/lib/lettura';
import { ErroreLettura } from '@/components/cruscotto/ErroreLettura';
import { TITOLO_PAGINA } from '@/lib/scala-tipografica';
import { useRisorsa } from '@/hooks/useRisorsa';
import { configurazione, type Configurazione } from '@/lib/stato-controllo';
import type { Istantanea } from '@/lib/risorsa';
import {
  avvisoStessoAmbiente,
  MASSIMO_TEST_CONTEMPORANEI,
  puoAggiungereRiga,
  puoLanciare,
  righeDaRiagganciare,
  type OperazioneRiaggancio,
} from '@/lib/corsie';

/** Un'operazione lunga che gira altrove, e dove mandare a guardarla. */
const ALTROVE: Partial<Record<NomeComando, { chiaveComando: string; percorso: string; chiaveVai: string }>> = {
  registrazione: { chiaveComando: 'comandoRegistrazione', percorso: '/registra', chiaveVai: 'vaiARegistra' },
  sessione: { chiaveComando: 'comandoSessione', percorso: '/controllo', chiaveVai: 'vaiAControllo' },
  scansione: { chiaveComando: 'comandoScansione', percorso: '/controllo', chiaveVai: 'vaiAControllo' },
};

/** La chiave che la versione precedente usava per una sola corsia: si toglie, non serve piu'. */
const CHIAVE_RIAGGANCIO_VECCHIA = 'cruscotto.riaggancio.esecuzione';

const NESSUNO: string[] = [];
// Solo i nomi: come nella barra laterale, non si ridisegna per un indirizzo che cambia.
const soloNomi = (i: Istantanea<Configurazione>): string[] => i.dati?.bersagli ?? NESSUNO;

interface RispostaOperazioni {
  operazione: { id: string; nome: NomeComando; avvio: string } | null;
  operazioni?: OperazioneRiaggancio[];
}

/** Una riga del form: la corsia che si lancera'. `ambiente` vuoto vuol dire "come nella barra". */
interface RigaForm {
  chiave: string;
  scenario: string;
  ambiente: string;
}

/** Una corsia gia' lanciata o riagganciata, sulla schermata. */
interface CorsiaSulloSchermo {
  id: string;
  ambiente: string;
  scenario: string;
  avviatoAlle: number | null;
}

interface RispostaErroreLancio {
  id?: string;
  errore?: string;
  codice?: 'occupato' | 'tetto' | 'catalogo';
  n?: number;
}

/** L'ambiente di una riga: il suo, o quello della barra se la riga non ne sceglie uno. */
const ambienteDi = (riga: RigaForm, barra: string): string => riga.ambiente || barra;

/** Il messaggio per un rifiuto del server: il codice si traduce, il resto e' gia' in italiano. */
function messaggioDiErrore(dati: RispostaErroreLancio, t: Traduttore): string {
  if (dati.codice === 'occupato') return t('erroreOccupato');
  if (dati.codice === 'tetto') return t('erroreTetto', { n: dati.n ?? MASSIMO_TEST_CONTEMPORANEI });
  return dati.errore ?? t('erroreLancio');
}

/** Un interruttore accessibile: mai un checkbox nascosto senza etichetta visibile. */
function Interruttore({
  etichetta,
  attivo,
  onChange,
  disabilitato,
}: {
  etichetta: string;
  attivo: boolean;
  onChange: (v: boolean) => void;
  disabilitato: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={attivo}
      disabled={disabilitato}
      onClick={() => onChange(!attivo)}
      className={cn(
        'flex items-center justify-between gap-3 min-h-10 rounded-controllo border px-3 text-sm font-medium text-left',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'border-bordo text-testo outline-blu',
      )}
    >
      <span>{etichetta}</span>
      <span
        aria-hidden="true"
        className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-pillola transition-colors', attivo ? 'bg-blu' : 'bg-bordo')}
      >
        <span
          className="inline-block h-5 w-5 rounded-pillola bg-white transition-transform"
          style={{ transform: attivo ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </span>
    </button>
  );
}

function EsecuzioneContenuto() {
  const t = useTranslations('Esecuzione');
  const tScenari = useTranslations('Scenari');
  const router = useRouter();
  const { ambiente } = useAmbiente();
  const ambientiDisponibili = useRisorsa(configurazione, soloNomi);

  const [altrove, setAltrove] = useState<NomeComando | null>(null);
  const [guardaIlBrowser, setGuardaIlBrowser] = useState(false);
  const [senzaSessione, setSenzaSessione] = useState(false);
  // Pausa fra un'azione e l'altra, in millisecondi: serve solo a chi guarda il
  // browser. 0 e' la velocita' di sempre.
  const [rallenta, setRallenta] = useState(0);

  // Arrivando da Registra dopo un salvataggio, lo scenario appena salvato e' gia'
  // scelto nella prima riga. Il valore della query non e' fidato: lo valida il server.
  const parametri = useSearchParams();
  const salvato = parametri.get('salvato');
  const contatoreRighe = useRef(1);
  const [righe, setRighe] = useState<RigaForm[]>(() => [
    { chiave: 'r1', scenario: parametri.get('scenario') ?? '', ambiente: '' },
  ]);

  // null = la richiesta non e' ancora tornata. 'non-letto' NON e' "nessuno
  // scenario": un errore di rete non deve far credere al tester di aver perso il lavoro.
  const [elenco, setElenco] = useState<EsitoElencoScenari<FileScenari> | null>(null);
  const [tentativoElenco, setTentativoElenco] = useState(0);
  const fileScenari = elenco?.tipo === 'letto' ? elenco.file : null;
  const statoElenco = statoElencoScenari(elenco);

  // Le corsie sulla schermata, nell'ordine di partenza, e lo stato di ciascuna.
  // Una corsia senza stato registrato e' ancora in corso: e' lo stato con cui parte.
  const [corsie, setCorsie] = useState<CorsiaSulloSchermo[]>([]);
  const [statiCorsie, setStatiCorsie] = useState<Record<string, StatoCorsia>>({});
  const [inLancio, setInLancio] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const inCorsoDi = (c: CorsiaSulloSchermo) => (statiCorsie[c.id] ?? 'in corso') === 'in corso';
  const corsieInCorso = corsie.filter(inCorsoDi);
  const ambientiDelleRighe = righe.map((r) => ambienteDi(r, ambiente));
  const possoLanciareOra = ambientiDelleRighe.every((a) => a !== '') && puoLanciare(corsieInCorso.length, righe.length);

  // Riaggancio: appena la schermata si apre, chiede quali corsie di test sono
  // ancora in corso sul server e le ripropone tutte, non una. Le operazioni di
  // persona (registrazione, sessione, scansione) non sono corsie: si segnalano a parte.
  useEffect(() => {
    let attivo = true;
    cancellaRiaggancio(CHIAVE_RIAGGANCIO_VECCHIA);
    leggiConLimite('/api/esegui')
      .then((r) => r.json())
      .then((d: RispostaOperazioni) => {
        if (!attivo) return;
        const operazioni = d.operazioni ?? [];
        const persona = operazioni.find((o) => o.nome !== 'test');
        if (persona) setAltrove(persona.nome as NomeComando);
        const daRiagganciare = righeDaRiagganciare(operazioni);
        if (daRiagganciare.length === 0) return;
        setCorsie((precedenti) => {
          const viste = new Set(precedenti.map((c) => c.id));
          const nuove = daRiagganciare
            .filter((r) => !viste.has(r.id))
            .map((r) => ({ id: r.id, ambiente: '', scenario: '', avviatoAlle: r.avviatoAlle }));
          return [...precedenti, ...nuove];
        });
      })
      .catch(() => {
        // Nessuna notizia non e' una brutta notizia: si resta sulla scelta.
      });
    return () => {
      attivo = false;
    };
    // Solo all'apertura della schermata.
  }, []);

  // Gli scenari che si possono scegliere: letti una volta, all'apertura.
  useEffect(() => {
    let attivo = true;
    setElenco(null);
    void leggiElencoScenari<FileScenari>().then((esito) => {
      if (attivo) setElenco(esito);
    });
    return () => {
      attivo = false;
    };
  }, [tentativoElenco]);

  // Stabile: il pannello di ogni corsia lo usa in un effetto che non deve ripartire.
  const registraStato = useCallback((id: string, stato: StatoCorsia) => {
    setStatiCorsie((precedenti) => ({ ...precedenti, [id]: stato }));
  }, []);

  const aggiungiRiga = () => {
    contatoreRighe.current += 1;
    setRighe((precedenti) => [
      ...precedenti,
      { chiave: `r${contatoreRighe.current}`, scenario: '', ambiente: '' },
    ]);
  };

  const modificaRiga = (chiave: string, cambio: Partial<RigaForm>) => {
    setRighe((precedenti) => precedenti.map((r) => (r.chiave === chiave ? { ...r, ...cambio } : r)));
  };

  const togliRiga = (chiave: string) => {
    setRighe((precedenti) => precedenti.filter((r) => r.chiave !== chiave));
  };

  // Lancia le righe una dopo l'altra. Se una viene rifiutata, si ferma li' e dice
  // perche': le corsie gia' partite restano, quelle dopo non partono.
  const lancia = useCallback(async () => {
    setErrore(null);
    if (!puoLanciare(corsieInCorso.length, righe.length)) {
      setErrore(t('limiteCorsie', { n: MASSIMO_TEST_CONTEMPORANEI }));
      return;
    }
    setInLancio(true);
    // Via le corsie gia' finite: la schermata si pulisce per il lancio nuovo, come prima.
    setCorsie((precedenti) => precedenti.filter((c) => (statiCorsie[c.id] ?? 'in corso') === 'in corso'));
    try {
      for (const riga of righe) {
        const ambienteRiga = ambienteDi(riga, ambiente);
        const risposta = await fetch('/api/esegui', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: 'test',
            parametri: {
              bersaglio: ambienteRiga,
              vedi: guardaIlBrowser,
              pulito: senzaSessione,
              ...(guardaIlBrowser && rallenta > 0 ? { rallenta } : {}),
              ...(riga.scenario ? { scenario: riga.scenario } : {}),
            },
          }),
        });
        const dati = (await risposta.json()) as RispostaErroreLancio;
        if (!risposta.ok || !dati.id) {
          setErrore(messaggioDiErrore(dati, t));
          break;
        }
        const avviatoAlleOra = Date.now();
        setCorsie((precedenti) => [
          ...precedenti,
          { id: dati.id as string, ambiente: ambienteRiga, scenario: riga.scenario, avviatoAlle: avviatoAlleOra },
        ]);
        setStatiCorsie((precedenti) => ({ ...precedenti, [dati.id as string]: 'in corso' }));
      }
    } catch {
      setErrore(t('erroreContattoCruscotto'));
    } finally {
      setInLancio(false);
    }
  }, [righe, corsieInCorso.length, statiCorsie, ambiente, guardaIlBrowser, rallenta, senzaSessione, t]);

  // "Interrompi tutto": ferma ogni corsia in corso, una richiesta ciascuna.
  const interrompiTutto = useCallback(async () => {
    const ids = corsie.filter((c) => (statiCorsie[c.id] ?? 'in corso') === 'in corso').map((c) => c.id);
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/esegui/${encodeURIComponent(id)}/ferma`, { method: 'POST' }).catch(() => {
          // Se una richiesta non arriva, quella corsia resta in corso: il tester lo vede e riprova.
        })
      )
    );
  }, [corsie, statiCorsie]);

  const primaScelta = righe[0]?.scenario ?? '';
  const avvisoCondiviso = avvisoStessoAmbiente(ambientiDelleRighe);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <h1 className={cn(TITOLO_PAGINA, 'text-testo')}>
        {t('titolo')}
      </h1>

      {altrove && (
        <div className="flex items-center gap-3 rounded-scheda border p-4 text-sm border-ambra text-testo bg-superficie-tenue">
          <AlertTriangle size={18} aria-hidden="true" className="text-ambra" />
          <span className="flex-1">
            {t('altroInCorso', { comando: t(ALTROVE[altrove]?.chiaveComando ?? 'comandoSessione') })}
          </span>
          <button
            type="button"
            onClick={() => router.push(ALTROVE[altrove]?.percorso ?? '/controllo')}
            className="inline-flex min-h-10 items-center rounded-controllo border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-bordo text-testo outline-blu"
          >
            {t(ALTROVE[altrove]?.chiaveVai ?? 'vaiAControllo')}
          </button>
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-scheda border p-4 border-bordo bg-superficie">
        <p className="text-sm text-testo-tenue">
          {ambiente ? t('ambienteCorrente', { ambiente }) : t('nessunBersaglio')}
        </p>
        {/* F14: senza ambiente non si puo' lanciare niente; la strada per risolvere e' il Check-up. */}
        {!ambiente && (
          <button
            type="button"
            onClick={() => router.push('/controllo')}
            className="inline-flex min-h-10 w-fit items-center rounded-controllo border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-bordo text-testo outline-blu"
          >
            {t('vaiAControllo')}
          </button>
        )}

        {(salvato === 'nuovo' || salvato === 'sovrascritto' || salvato === 'rinominato') && primaScelta && (
          <p role="status" className="text-sm rounded-scheda border px-3 py-2 border-verde text-testo">
            {t(
              salvato === 'nuovo' ? 'salvatoNuovo' : salvato === 'sovrascritto' ? 'salvatoSovrascritto' : 'salvatoRinominato',
              { file: primaScelta.replace(/^src\/features\//, '') }
            )}
          </p>
        )}

        {righe.map((riga, indice) => {
          const numero = indice + 1;
          return (
            <div key={riga.chiave} className="flex flex-col gap-3 rounded-controllo border p-3 border-bordo">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`scenario-${riga.chiave}`} className="text-sm font-medium text-testo">
                  {righe.length > 1 ? t('scenarioCorsia', { n: numero }) : t('scenarioEtichetta')}
                </label>
                <select
                  id={`scenario-${riga.chiave}`}
                  value={riga.scenario}
                  onChange={(e) => modificaRiga(riga.chiave, { scenario: e.target.value })}
                  className={cn(
                    'min-h-10 w-full min-w-0 rounded-controllo border px-3 text-sm',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                    'border-bordo bg-superficie text-testo outline-blu',
                  )}
                >
                  <option value="">{t('tuttiIRegistrati')}</option>
                  {(fileScenari ?? []).map((f) => (
                    <optgroup key={f.file} label={f.generato ? t('gruppoRegistrato', { nome: f.nome }) : f.nome}>
                      <option value={`src/features/${f.file}`}>
                        {t('interoGruppo', { n: f.scenari.length, nome: f.nome })}
                      </option>
                      {f.scenari.map((s) => (
                        <option key={s.riga} value={`src/features/${f.file}:${s.riga}`}>
                          {s.nome}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {statoElenco === 'non-letto' ? (
                  <ErroreLettura
                    compatto
                    titolo={tScenari('erroreTitolo')}
                    testo={tScenari('erroreTesto')}
                    etichettaRiprova={tScenari('riprova')}
                    onRiprova={() => setTentativoElenco((n) => n + 1)}
                  />
                ) : indice === 0 ? (
                  <p className="text-xs text-testo-tenue">
                    {statoElenco === 'vuoto' ? t('nessunoScenario') : t('notaDocumentati')}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={`ambiente-${riga.chiave}`} className="text-sm font-medium text-testo">
                  {righe.length > 1 ? t('ambienteDellaCorsia', { n: numero }) : t('bersaglio')}
                </label>
                <select
                  id={`ambiente-${riga.chiave}`}
                  value={riga.ambiente}
                  onChange={(e) => modificaRiga(riga.chiave, { ambiente: e.target.value })}
                  className="min-h-10 w-full min-w-0 rounded-controllo border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-bordo bg-superficie text-testo outline-blu"
                >
                  <option value="">{t('stessoDellaBarra', { ambiente: ambiente || t('nessunBersaglio') })}</option>
                  {ambientiDisponibili.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {righe.length > 1 && (
                <button
                  type="button"
                  onClick={() => togliRiga(riga.chiave)}
                  className="inline-flex min-h-10 w-fit items-center gap-2 rounded-controllo border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-bordo text-testo outline-blu"
                >
                  <X size={16} aria-hidden="true" />
                  {t('togliCorsia')}
                </button>
              )}
            </div>
          );
        })}

        {puoAggiungereRiga(righe.length) && (
          <button
            type="button"
            onClick={aggiungiRiga}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-controllo border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-bordo text-testo outline-blu"
          >
            <Plus size={16} aria-hidden="true" />
            {t('aggiungiCorsia')}
          </button>
        )}

        {avvisoCondiviso && (
          <p role="status" className="text-sm rounded-scheda border px-3 py-2 border-ambra text-testo">
            {t('avvisoStessoAmbiente')}
          </p>
        )}

        <Interruttore
          etichetta={t('guardaIlBrowser')}
          attivo={guardaIlBrowser}
          onChange={setGuardaIlBrowser}
          disabilitato={false}
        />
        {guardaIlBrowser && (
          <div className="flex items-center justify-between gap-3 min-h-10 rounded-controllo border px-3 text-sm border-bordo text-testo">
            <label htmlFor="velocita-browser" className="font-medium">
              {t('velocita')}
            </label>
            <select
              id="velocita-browser"
              value={rallenta}
              onChange={(e) => setRallenta(Number(e.target.value))}
              className="min-h-10 rounded-controllo border px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-bordo bg-superficie text-testo outline-blu"
            >
              <option value={0}>{t('velocitaNormale')}</option>
              <option value={500}>{t('velocitaLenta')}</option>
              <option value={1200}>{t('velocitaMoltoLenta')}</option>
            </select>
          </div>
        )}
        <Interruttore
          etichetta={t('partiSenzaSessione')}
          attivo={senzaSessione}
          onChange={setSenzaSessione}
          disabilitato={false}
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void lancia()}
            disabled={inLancio || !possoLanciareOra}
            className={cn(
              'inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-controllo text-sm font-semibold text-white transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-blu-fondo outline-blu',
            )}
          >
            {inLancio ? (
              <Loader2 size={18} aria-hidden="true" className="animate-spin" />
            ) : (
              <PlayCircle size={18} aria-hidden="true" />
            )}
            {inLancio ? t('testInCorso') : t('lanciaIlTest')}
          </button>

          {corsieInCorso.length > 0 && (
            <button
              type="button"
              onClick={() => void interrompiTutto()}
              className="inline-flex min-h-10 items-center gap-2 rounded-controllo border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 border-rosso text-rosso outline-rosso"
            >
              <Square size={16} aria-hidden="true" />
              {t('interrompiTutto')}
            </button>
          )}
        </div>

        {!puoLanciare(corsieInCorso.length, righe.length) && (
          <p className="text-sm text-testo-tenue">{t('limiteCorsie', { n: MASSIMO_TEST_CONTEMPORANEI })}</p>
        )}

        {errore && (
          <p role="alert" className="text-sm font-medium text-rosso">
            {errore}
          </p>
        )}
      </section>

      {corsie.length > 0 && (
        <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
          {corsie.map((c, i) => (
            <PannelloCorsia
              key={c.id}
              id={c.id}
              numero={i + 1}
              ambiente={c.ambiente}
              scenario={c.scenario}
              avviatoAlle={c.avviatoAlle}
              onStato={registraStato}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheletroCaricamento() {
  const t = useTranslations('Esecuzione');
  return (
    <p className="text-sm text-testo-tenue">
      {t('caricamento')}
    </p>
  );
}

/**
 * `?prova=<id>` apre una prova GIA' conclusa in sola lettura (il "Vedi la
 * schermata" di Scenari); senza, la schermata di sempre. L'id non e' fidato: lo
 * valida il server.
 */
function EsecuzioneOProva() {
  const prova = useSearchParams().get('prova');
  return prova ? <ProvaPassata id={prova} /> : <EsecuzioneContenuto />;
}

export default function EsecuzionePage() {
  return (
    <Suspense fallback={<ScheletroCaricamento />}>
      <EsecuzioneOProva />
    </Suspense>
  );
}
