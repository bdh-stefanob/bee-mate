/**
 * azioni-catalogo.ts
 * ------------------
 * Le chiamate che MODIFICANO il vocabolario (fondere due frasi, dare un'altra
 * formulazione, annullare l'ultima fusione) e quella che ne mostra l'anteprima.
 * Stanno fuori dai componenti: una funzione di modulo ha sempre la stessa
 * identita', e i componenti restano solo composizione.
 *
 * Le rotte non cambiano: `GET/POST /api/catalogo/fondi`, `POST
 * /api/catalogo/riconcilia`, `GET/POST /api/catalogo/fondi/annulla`.
 */
import type {
  AnteprimaFusione,
  RispostaFusione,
  StatoAnnullamentoFusione,
} from '@/components/cruscotto/catalogo/tipi';

export async function chiediAnteprimaFusione(da: string, a: string): Promise<AnteprimaFusione> {
  const res = await fetch(`/api/catalogo/fondi?da=${encodeURIComponent(da)}&a=${encodeURIComponent(a)}`);
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(corpo?.errore ?? `HTTP ${res.status}`);
  return corpo as AnteprimaFusione;
}

export async function inviaFusione(
  da: string,
  a: string,
  procediNonostanteDifferenza: boolean
): Promise<RispostaFusione & { status: number }> {
  const res = await fetch('/api/catalogo/fondi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ da, a, procediNonostanteDifferenza }),
  });
  const corpo = await res.json().catch(() => ({}));
  return { ...corpo, status: res.status };
}

export async function inviaRiconciliazione(da: string, a: string): Promise<{ ok: boolean; errore?: string }> {
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

/** C'e' un'ultima fusione che si puo' annullare? Rotta di sola lettura; qualunque problema vale "no". */
export async function leggiAnnullamentoDisponibile(): Promise<StatoAnnullamentoFusione> {
  try {
    const res = await fetch('/api/catalogo/fondi/annulla');
    return res.ok ? ((await res.json()) as StatoAnnullamentoFusione) : { disponibile: false };
  } catch {
    return { disponibile: false };
  }
}

export async function annullaUltimaFusione(): Promise<{ ok: boolean; errore?: string }> {
  try {
    const res = await fetch('/api/catalogo/fondi/annulla', { method: 'POST' });
    const corpo = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, errore: corpo?.errore ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, errore: err instanceof Error ? err.message : String(err) };
  }
}
