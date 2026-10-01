/**
 * preflight-ambiente.ts
 * ---------------------
 * Prima di salvare un ambiente: a quell'indirizzo risponde qualcuno?
 *
 * Senza questa domanda un refuso nell'indirizzo si scopriva solo al primo
 * "Accedi adesso", con un browser aperto su una pagina d'errore — cioe' lontano
 * dal campo in cui era stato scritto, e con un sintomo che fa pensare
 * all'applicazione invece che a una lettera sbagliata.
 *
 * COSA CONTA COME "C'E'"
 * Qualunque risposta HTTP, anche 401, 403, 404 o 500: dice che a quell'indirizzo
 * c'e' un server, ed e' tutto cio' che qui si vuole sapere (un'applicazione
 * dietro accesso risponde 401 proprio perche' esiste). Non c'e' quando non si
 * arriva nemmeno a una risposta: nome che non si risolve, connessione rifiutata,
 * attesa scaduta, certificato non valido.
 *
 * E' UN AVVISO, NON UN CANCELLO
 * Chi chiama decide cosa farne. Un ambiente dietro una VPN spenta, o giu' per
 * manutenzione, deve restare aggiungibile: la rotta lo rifiuta la prima volta e
 * lo accetta se il tester conferma.
 */

export type MotivoIrraggiungibile = 'dns' | 'rifiutata' | 'tempo' | 'certificato' | 'altro';

export type EsitoPreflight =
  | { esito: 'raggiungibile' }
  /** L'indirizzo usa una ${VARIABILE} non ancora in .env: non c'e' niente da provare. */
  | { esito: 'saltato' }
  | { esito: 'irraggiungibile'; motivo: MotivoIrraggiungibile };

export interface OpzioniPreflight {
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  timeoutMs?: number;
  env?: Record<string, string | undefined>;
}

function motivoDaCodice(code: string): MotivoIrraggiungibile {
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns';
  if (code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH') {
    return 'rifiutata';
  }
  if (code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'UND_ERR_HEADERS_TIMEOUT') {
    return 'tempo';
  }
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS/.test(code)) return 'certificato';
  return 'altro';
}

export async function preflightAmbiente(url: string, opzioni: OpzioniPreflight = {}): Promise<EsitoPreflight> {
  const { fetchImpl = fetch, timeoutMs = 5000, env = process.env } = opzioni;

  let irrisolta = false;
  const risolto = url.replace(/\$\{([A-Z0-9_]+)\}/g, (_, nome: string) => {
    const valore = env[nome];
    if (!valore) irrisolta = true;
    return valore ?? '';
  });
  if (irrisolta) return { esito: 'saltato' };

  try {
    // GET e non HEAD: diversi server rispondono 405 a HEAD o non rispondono
    // affatto, e qui interessa solo che una risposta arrivi. Il corpo non si
    // legge mai.
    const risposta = await fetchImpl(risolto, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    });
    await risposta.body?.cancel().catch(() => { /* gia' chiuso */ });
    return { esito: 'raggiungibile' };
  } catch (err: unknown) {
    const nome = (err as { name?: unknown } | null)?.name;
    if (nome === 'TimeoutError' || nome === 'AbortError') return { esito: 'irraggiungibile', motivo: 'tempo' };
    const code = (err as { cause?: { code?: unknown } } | null)?.cause?.code;
    return { esito: 'irraggiungibile', motivo: motivoDaCodice(typeof code === 'string' ? code : '') };
  }
}
