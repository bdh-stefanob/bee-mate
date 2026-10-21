import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from './repo';
import type { VoceEsito } from './esiti-da-messaggi';

/**
 * Il cronometro di uno scenario registrato: dall'inizio della registrazione al
 * primo lancio verde. E' il numero che la demo promette ("da test manuale ad
 * automatico in un giorno"), misurato invece che stimato.
 *
 * L'inizio e la durata della registrazione stanno gia' nell'intestazione del
 * `.feature` generato. Il primo verde no: l'indice degli esiti tiene solo
 * l'ultima prova per scenario, quindi il primo verde si conserva a parte, in
 * `reports/primi-verdi.json`, e non si sovrascrive mai. Fuori da git come
 * tutto `reports/`.
 *
 * Conta i lanci fatti dal cruscotto: quelli da riga di comando non passano dal
 * registro e non lasciano esiti.
 */

export interface Registrazione {
  /** ISO: quando il tester ha premuto "Registra". */
  inizio: string;
  durataS: number;
}

export interface Cronometro {
  inizio: string;
  durataRegistrazioneS: number;
  /** ISO, o `null` finche' non c'e' un lancio verde dopo la registrazione. */
  primoVerde: string | null;
  totaleMs: number | null;
}

const INTESTAZIONE = /registrata il (\S+?)\s*\r?\n#\s*\([^)\n]*?,\s*(\d+)s,/;

/** `null` per uno scenario scritto a mano, o con un'intestazione che non si legge. */
export function registrazioneDaIntestazione(testo: string): Registrazione | null {
  const m = testo.match(INTESTAZIONE);
  if (!m || Number.isNaN(Date.parse(m[1]))) return null;
  return { inizio: m[1], durataS: Number(m[2]) };
}

export function percorsoPrimiVerdi(radice: string = REPO_ROOT): string {
  return path.join(radice, 'reports', 'primi-verdi.json');
}

const chiave = (file: string, nome: string): string => `${file}\u0000${nome}`;

/** File + titolo -> ISO del primo verde. Un file assente o illeggibile vale come vuoto. */
export function leggiPrimiVerdi(percorso: string): Record<string, string> {
  try {
    const dati = JSON.parse(fs.readFileSync(percorso, 'utf-8')) as unknown;
    if (dati === null || typeof dati !== 'object' || Array.isArray(dati)) return {};
    return Object.fromEntries(
      Object.entries(dati as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string')
    );
  } catch {
    return {};
  }
}

/** Salva il verde degli scenari che non ne avevano ancora uno. Puo' lanciare: chi chiama decide. */
export function registraPrimiVerdi(percorso: string, voci: VoceEsito[]): void {
  const primi = leggiPrimiVerdi(percorso);
  let nuovi = 0;
  for (const v of voci) {
    const k = chiave(v.file, v.nome);
    if (v.esito !== 'passato' || primi[k]) continue;
    primi[k] = v.quando;
    nuovi++;
  }
  if (nuovi === 0) return;
  fs.mkdirSync(path.dirname(percorso), { recursive: true });
  const temporaneo = `${percorso}.${process.pid}.tmp`;
  fs.writeFileSync(temporaneo, JSON.stringify(primi, null, 2));
  fs.renameSync(temporaneo, percorso);
}

export function primoVerdeDi(primi: Record<string, string>, file: string, nome: string): string | undefined {
  return primi[chiave(file, nome)];
}

/**
 * Pura. Un verde precedente alla registrazione appartiene a una versione
 * vecchia dello scenario (la stessa frase registrata di nuovo): non conta.
 */
export function cronometroDi(registrazione: Registrazione | null, primoVerde: string | undefined): Cronometro | null {
  if (!registrazione) return null;
  const inizio = Date.parse(registrazione.inizio);
  const verde = primoVerde ? Date.parse(primoVerde) : NaN;
  const valido = !Number.isNaN(verde) && verde >= inizio;
  return {
    inizio: registrazione.inizio,
    durataRegistrazioneS: registrazione.durataS,
    primoVerde: valido ? primoVerde! : null,
    totaleMs: valido ? verde - inizio : null,
  };
}
