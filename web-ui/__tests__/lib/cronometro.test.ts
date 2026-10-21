import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  registrazioneDaIntestazione,
  leggiPrimiVerdi,
  registraPrimiVerdi,
  cronometroDi,
} from '@/lib/cronometro';
import type { VoceEsito } from '@/lib/esiti-da-messaggi';

let tmp: string | null = null;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

function percorso(): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cronometro-'));
  return path.join(tmp, 'reports', 'primi-verdi.json');
}

function voce(extra: Partial<VoceEsito> = {}): VoceEsito {
  return {
    file: 'clinic/hair-loss/ordine.feature',
    nome: 'hair loss',
    esito: 'passato',
    quando: '2026-10-20T10:00:00.000Z',
    durataMs: 1000,
    ambiente: 'clinic',
    esecuzione: 'test-1',
    impronta: 'x',
    ...extra,
  };
}

const INTESTAZIONE = [
  '# generato-da: bdd-generate · rigenerabile',
  '# src/features/clinic/hair-loss/ordine.feature',
  '#',
  '# Derivato dalla sessione manuale registrata il 2026-10-15T08:39:43.860Z',
  '# (reports/recordings/qa-clinic-2026-10-15T08-39-43-860Z.json, 345s, 12 intenti dichiarati dal tester).',
  '#',
  'Feature: ordine',
].join('\n');

describe('registrazioneDaIntestazione', () => {
  it("legge l'inizio e la durata della registrazione", () => {
    expect(registrazioneDaIntestazione(INTESTAZIONE)).toEqual({ inizio: '2026-10-15T08:39:43.860Z', durataS: 345 });
  });

  it('regge le barre rovesciate di Windows e le righe CRLF', () => {
    const testo = INTESTAZIONE.replace('reports/recordings/', 'reports\\recordings\\').replace(/\n/g, '\r\n');
    expect(registrazioneDaIntestazione(testo)).toEqual({ inizio: '2026-10-15T08:39:43.860Z', durataS: 345 });
  });

  it('uno scenario scritto a mano non ha registrazione', () => {
    expect(registrazioneDaIntestazione('Feature: a mano\n  Scenario: x\n')).toBeNull();
  });

  it('una data che non si legge non diventa una registrazione', () => {
    expect(registrazioneDaIntestazione(INTESTAZIONE.replace('2026-10-15T08:39:43.860Z', 'ieri'))).toBeNull();
  });
});

describe('primi verdi', () => {
  it('senza file non ci sono primi verdi', () => {
    expect(leggiPrimiVerdi(percorso())).toEqual({});
  });

  it('salva il primo verde di uno scenario', () => {
    const p = percorso();
    registraPrimiVerdi(p, [voce()]);
    expect(leggiPrimiVerdi(p)).toEqual({ 'clinic/hair-loss/ordine.feature\u0000hair loss': '2026-10-20T10:00:00.000Z' });
  });

  it('un verde successivo non sovrascrive il primo', () => {
    const p = percorso();
    registraPrimiVerdi(p, [voce()]);
    registraPrimiVerdi(p, [voce({ quando: '2026-10-21T09:00:00.000Z' })]);
    expect(Object.values(leggiPrimiVerdi(p))).toEqual(['2026-10-20T10:00:00.000Z']);
  });

  it('un rosso non conta', () => {
    const p = percorso();
    registraPrimiVerdi(p, [voce({ esito: 'fallito' })]);
    expect(leggiPrimiVerdi(p)).toEqual({});
    expect(fs.existsSync(p)).toBe(false);
  });

  it('un file illeggibile vale come vuoto e viene riscritto', () => {
    const p = percorso();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, '{rotto');
    expect(leggiPrimiVerdi(p)).toEqual({});
    registraPrimiVerdi(p, [voce()]);
    expect(Object.keys(leggiPrimiVerdi(p))).toHaveLength(1);
  });
});

describe('cronometroDi', () => {
  const registrazione = { inizio: '2026-10-15T08:39:43.860Z', durataS: 345 };

  it('dalla registrazione al primo verde', () => {
    expect(cronometroDi(registrazione, '2026-10-15T09:20:43.860Z')).toEqual({
      inizio: registrazione.inizio,
      durataRegistrazioneS: 345,
      primoVerde: '2026-10-15T09:20:43.860Z',
      totaleMs: 41 * 60_000,
    });
  });

  it('senza verde il totale non esiste ancora', () => {
    expect(cronometroDi(registrazione, undefined)).toEqual({
      inizio: registrazione.inizio,
      durataRegistrazioneS: 345,
      primoVerde: null,
      totaleMs: null,
    });
  });

  it('un verde precedente alla registrazione non e\' di questa registrazione', () => {
    expect(cronometroDi(registrazione, '2026-10-14T09:00:00.000Z')?.totaleMs).toBeNull();
  });

  it('senza registrazione non c\'e\' cronometro', () => {
    expect(cronometroDi(null, '2026-10-15T09:20:43.860Z')).toBeNull();
  });
});

describe('unisciEsiti con il cronometro', () => {
  it("lo scenario registrato porta il suo cronometro, quello a mano no", async () => {
    const { unisciEsiti } = await import('@/lib/esiti-scenari');
    const registrato = {
      file: 'clinic/hair-loss/ordine.feature', nome: 'ordine', generato: false, nonAutomatizzati: 0, impronta: 'x',
      scenari: [{ nome: 'hair loss', riga: 22 }],
      registrazione: { inizio: '2026-10-20T09:00:00.000Z', durataS: 300 },
    };
    const aMano = { ...registrato, file: 'clinic/a-mano.feature', registrazione: null };
    const [r, m] = unisciEsiti([registrato, aMano], [], {
      'clinic/hair-loss/ordine.feature\u0000hair loss': '2026-10-20T10:00:00.000Z',
    });
    expect(r.scenari[0].cronometro?.totaleMs).toBe(3_600_000);
    expect(m.scenari[0].cronometro).toBeNull();
  });
});
