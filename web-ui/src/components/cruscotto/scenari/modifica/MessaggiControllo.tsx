'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Info } from 'lucide-react';
import type { Messaggio } from '@/lib/convalida-scenario';
import type { ErroreServer } from '@/lib/client-modifica';

type T = (chiave: string, valori?: Record<string, string | number>) => string;

/** Una frase per il tester, dal codice del controllo. Mai un percorso, mai un nome di file. */
export function fraseMessaggio(t: T, m: Messaggio): string {
  const frase = m.frase ?? '';
  switch (m.codice) {
    case 'sintassi': return t('bloccoSintassi', { riga: m.riga ?? 1 });
    case 'titolo': return t('bloccoTitolo');
    case 'nessun-passo': return t('bloccoNessunPasso');
    case 'struttura': return t('bloccoStruttura');
    case 'sconosciuto': return t('bloccoSconosciuto', { frase });
    case 'ambiguo': return t('bloccoAmbiguo', { frase });
    case 'frase-orfana': return t('bloccoOrfana', { frase });
    case 'sconosciuto-gia': return t('avvisoSconosciutoGia', { frase });
    case 'ambiguo-gia': return t('avvisoAmbiguoGia', { frase });
    case 'nessuna-verifica': return t('avvisoNessunaVerifica');
    case 'senza-accesso': return t('avvisoSenzaAccesso');
    case 'wanted': return t('avvisoWanted', { frase });
    case 'non-piu-usato': return t('avvisoNonPiuUsato', { frase });
    case 'simile': {
      const altra = m.altra ?? '';
      if (m.stessoComponente === true) return t('avvisoSimileDoppione', { altra });
      if (m.stessoComponente === false) return t('avvisoSimileEquivoco', { altra });
      return t('avvisoSimile', { altra });
    }
  }
}

/**
 * Blocchi e avvisi del controllo, ciascuno con la sua icona E con una parola
 * (mai solo il colore). I blocchi sono un `alert`; gli avvisi si leggono ma non
 * interrompono.
 */
export function ElencoMessaggi({ blocchi, avvisi }: { blocchi: Messaggio[]; avvisi: Messaggio[] }) {
  const t = useTranslations('ModificaScenario');
  if (blocchi.length === 0 && avvisi.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {blocchi.length > 0 && (
        <div role="alert" className="flex flex-col gap-1.5 text-sm" style={{ color: 'var(--rosso)' }}>
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} aria-hidden="true" />
            {t('bloccoIntestazione')}
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-8" style={{ color: 'var(--testo)' }}>
            {blocchi.map((m, i) => (
              <li key={`${m.codice}-${i}`}>{fraseMessaggio(t, m)}</li>
            ))}
          </ul>
        </div>
      )}
      {avvisi.length > 0 && (
        <div className="flex flex-col gap-1.5 text-sm">
          <p className="flex items-center gap-2 font-semibold" style={{ color: 'var(--testo)' }}>
            <Info size={16} aria-hidden="true" style={{ color: 'var(--ambra)' }} />
            {t('avvisoIntestazione')}
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-8" style={{ color: 'var(--testo)' }}>
            {avvisi.map((m, i) => (
              <li key={`${m.codice}-${i}`}>{fraseMessaggio(t, m)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Perche' non si e' fatto: il codice stabile della rotta, in una frase (e, per il controllo bocciato, la ragione). */
export function frasiRifiuto(t: T, e: ErroreServer): { principale: string; dettaglio?: string; messaggi: Messaggio[] } {
  const messaggi = e.dettagli ?? [];
  switch (e.errore) {
    case 'bocciato': {
      const passi = (e.controllo?.passi ?? []).join('", "');
      const motivo = e.controllo?.motivo;
      const dettaglio =
        motivo === 'indefinito' ? t('bocciatoIndefinito', { passi })
        : motivo === 'ambiguo' ? t('bocciatoAmbiguo', { passi })
        : motivo === 'compilazione' ? t('bocciatoCompilazione')
        : motivo === 'tempo' ? t('bocciatoTempo')
        : motivo === 'nessuna-prova' ? t('bocciatoNessunaProva')
        : motivo === 'fallito' ? t('bocciatoFallito', { passi })
        : undefined;
      return { principale: t('bocciatoTitolo'), dettaglio, messaggi };
    }
    case 'bloccato': return { principale: t('bloccoIntestazione'), messaggi };
    case 'non-modificabile':
      return {
        principale:
          e.ragione === 'registrato' ? t('nonModificabileRegistrato')
          : e.ragione === 'documento' ? t('nonModificabileDocumento')
          : t('nonModificabileComplesso'),
        messaggi,
      };
    case 'non-rinominabile': return { principale: t('bloccoNonRinominabile'), messaggi };
    case 'frase-esiste': return { principale: t('bloccoFraseEsiste'), messaggi };
    case 'operazione-in-corso': return { principale: t('operazioneInCorso'), messaggi };
    case 'richiesta-non-ammessa': return { principale: t('richiestaNonAmmessa'), messaggi };
    case 'catalogo': return { principale: t('erroreCatalogo'), messaggi };
    case 'ripristino': return { principale: t('erroreRipristino'), messaggi };
    case 'cambiato-dopo': return { principale: t('erroreCambiatoDopo'), messaggi };
    case 'niente-da-annullare': return { principale: t('erroreNienteDaAnnullare'), messaggi };
    case 'rete': return { principale: t('erroreRete'), messaggi };
    case 'conflitto': return { principale: t('conflittoTitolo'), messaggi };
    default: return { principale: t('erroreGenerico'), messaggi };
  }
}
