/**
 * lib/derivazione-login.ts
 * ------------------------
 * Da una registrazione (quella che produce `scripts/record.ts`, sotto
 * `reports/recordings/`) ricava il blocco `login` da scrivere in
 * `bdd-targets.json` — la stessa forma (`LoginRecipe`) che il tester oggi
 * prepara a mano.
 *
 * LA REGOLA CHE VIENE PRIMA DI TUTTO
 * Nessun valore digitato dal tester puo' finire nel risultato. Il registratore
 * (vedi `scripts/lib/recorder-overlay.ts`) gia' non salva mai il contenuto di
 * un campo password — arriva qui come `"<password>"` — ma il nome utente
 * invece viene salvato in chiaro nella registrazione. Questo modulo non lo
 * usa mai: legge solo `role`/`name` (etichette dell'interfaccia) e il
 * contrassegno `secret`, e per OGNI gesto di compilazione (non solo la
 * password) scrive un segnaposto `${VARIABILE}` al posto del valore.
 *
 * COME SI RICONOSCONO I PASSI
 * - I clic su un campo che verra' comunque compilato sono solo il fuoco
 *   spostato li' prima di scrivere: non sono un passo di accesso, si scartano.
 * - I clic prima del primo campo compilato sono presunti avvisi da chiudere
 *   (banner cookie): finiscono in `dismiss`, non in `steps`.
 * - Il primo campo compilato marcato `secret` da' la variabile della
 *   password. Il primo campo di testo compilato (non marcato) da' la
 *   variabile dell'utente. Ogni campo compilato oltre questi due prende il
 *   nome dalla propria etichetta — non si indovina cosa sia.
 */
import type { LoginLocator, LoginRecipe, LoginStep } from '../../../scripts/lib/targets';

export interface PassoRegistrato {
  action: 'click' | 'fill' | 'set';
  role: string;
  name: string;
  value?: string;
  secret?: boolean;
  url?: string;
}

export interface IntentoRegistrato {
  steps: PassoRegistrato[];
  pageUrl?: string;
  endUrl?: string;
}

export interface RegistrazioneGrezza {
  startUrl?: string;
  pagesVisited?: string[];
  intents: IntentoRegistrato[];
}

export interface DerivazioneLogin {
  login: LoginRecipe;
  readyWhen?: string;
  /** Solo i NOMI delle variabili derivate. Mai un valore. */
  variabili: string[];
}

/** I ruoli che portano un valore: un clic su uno di questi, prima di riempirlo, e' solo il fuoco. */
const RUOLI_CON_VALORE = ['textbox', 'searchbox', 'spinbutton', 'combobox', 'checkbox', 'radio', 'switch'];

function chiaveDaTesto(testo: string, fallback: string): string {
  const pulita = testo
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const base = pulita || fallback;
  return /^[A-Z]/.test(base) ? base : `X_${base}`;
}

/** Il prefisso delle variabili di questo ambiente: dal suo nome, in maiuscolo. */
function prefissoAmbiente(nomeAmbiente: string): string {
  return chiaveDaTesto(nomeAmbiente, 'AMBIENTE');
}

function locatorDi(p: PassoRegistrato): LoginLocator {
  const l: LoginLocator = {};
  if (p.role) l.role = p.role;
  if (p.name) l.name = p.name;
  return l;
}

/**
 * L'indirizzo raggiunto dopo l'accesso, se e' diverso da quello di partenza.
 *
 * Prima si guarda `endUrl` dell'intento di login (lo scrive gia' `record.ts`
 * quando un intento attraversa piu' pagine): e' il segnale piu' preciso, e
 * riguarda solo il login — non un'azione successiva registrata nella stessa
 * sessione. Altrimenti si guarda l'ultimo indirizzo visitato nell'intera
 * registrazione: meno preciso, ma e' quanto basta per una registrazione che
 * non contiene altro che l'accesso.
 */
function indirizzoDopoLogin(reg: RegistrazioneGrezza, intentoLogin: IntentoRegistrato): string | undefined {
  if (intentoLogin.endUrl) return intentoLogin.endUrl;
  if (reg.pagesVisited && reg.pagesVisited.length > 0) {
    return reg.pagesVisited[reg.pagesVisited.length - 1];
  }
  return undefined;
}

function percorsoDi(url: string): string | undefined {
  try {
    return new URL(url).pathname || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Ricava il blocco di accesso da una registrazione. `null` se la
 * registrazione non contiene nessun campo compilato: non e' un accesso, e non
 * c'e' niente da derivare (un login fatto solo di clic non esiste).
 */
export function derivaLogin(reg: RegistrazioneGrezza, nomeAmbiente: string): DerivazioneLogin | null {
  // Si guarda un solo intento: quello che contiene il primo campo compilato.
  // Una registrazione dedicata all'accesso e' quasi sempre un intento solo, e
  // limitarsi a quello evita di raccogliere gesti di un'azione successiva
  // (registrata nella stessa sessione ma dopo "Fine intento") come se
  // facessero parte del login.
  const idxIntento = reg.intents.findIndex((i) =>
    i.steps.some((p) => p.action === 'fill' || p.action === 'set')
  );
  if (idxIntento < 0) return null;
  const intentoLogin = reg.intents[idxIntento]!;

  // Si scartano i clic di "fuoco" su un campo che verra' comunque compilato.
  const filtrati = intentoLogin.steps.filter((p) => {
    if (p.action !== 'click') return true;
    return !RUOLI_CON_VALORE.includes(p.role);
  });

  const primoRiempimento = filtrati.findIndex((p) => p.action === 'fill' || p.action === 'set');
  if (primoRiempimento < 0) return null;

  const prima = filtrati.slice(0, primoRiempimento);
  const dopo = filtrati.slice(primoRiempimento);

  const dismiss: LoginLocator[] = prima
    .filter((p) => p.action === 'click')
    .map(locatorDi);

  const prefisso = prefissoAmbiente(nomeAmbiente);
  const variabili: string[] = [];
  const chiaviUsate = new Set<string>();
  let usatoUtente = false;
  const steps: LoginStep[] = [];

  const chiaveLibera = (base: string): string => {
    if (!chiaviUsate.has(base)) return base;
    let n = 2;
    while (chiaviUsate.has(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  };

  for (const p of dopo) {
    if (p.action === 'click') {
      steps.push({ click: locatorDi(p) });
      continue;
    }

    // fill / set: ogni gesto di compilazione diventa un segnaposto, mai il
    // valore digitato (`p.value` non si legge da nessuna parte, qui sotto).
    let chiave: string;
    if (p.secret) {
      chiave = chiaveLibera(`${prefisso}_PASS`);
    } else if (!usatoUtente) {
      chiave = chiaveLibera(`${prefisso}_USER`);
      usatoUtente = true;
    } else {
      chiave = chiaveLibera(`${prefisso}_${chiaveDaTesto(p.name, 'CAMPO')}`);
    }
    chiaviUsate.add(chiave);
    variabili.push(chiave);
    steps.push({ fill: locatorDi(p), value: '${' + chiave + '}' });
  }

  const login: LoginRecipe = {
    ...(dismiss.length > 0 ? { dismiss } : {}),
    steps,
  };

  const dopoUrl = indirizzoDopoLogin(reg, intentoLogin);
  const partenzaUrl = reg.startUrl ?? intentoLogin.pageUrl;
  let readyWhen: string | undefined;
  if (dopoUrl && partenzaUrl) {
    const dopoPercorso = percorsoDi(dopoUrl);
    const partenzaPercorso = percorsoDi(partenzaUrl);
    if (dopoPercorso && dopoPercorso !== partenzaPercorso) readyWhen = dopoPercorso;
  }

  return { login, ...(readyWhen ? { readyWhen } : {}), variabili };
}
