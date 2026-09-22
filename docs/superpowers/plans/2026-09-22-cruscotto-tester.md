# Cruscotto per il tester — piano di implementazione

> **Per chi esegue (anche agenti):** usa `superpowers:subagent-driven-development`
> (consigliato) oppure `superpowers:executing-plans`. I passi hanno le caselle
> `- [ ]` per essere spuntati.

**Obiettivo:** un tester manuale registra una sessione, genera il test e lo vede
girare, senza mai aprire un terminale.

**Architettura:** le schermate nuove vivono nell'app desktop che gia' esiste
(`web-ui`, Next + Electron). L'esecuzione dei comandi passa da un modulo solo,
con un elenco chiuso di comandi ammessi; i risultati si leggono dagli artefatti
su disco (JSON), mai dall'output a schermo.

**Tecnologie:** Next 15 (app router), React, Tailwind, vitest, Electron. Nessuna
dipendenza nuova.

**Specifica:** `docs/superpowers/specs/2026-09-22-cruscotto-tester-design.md` —
si legge insieme a questo piano.

## Vincoli globali

Valgono per ogni attivita', senza ripeterli:

- **Nessun nome aziendale** nel prodotto: testi, nomi di file, commenti.
- **Opzioni agli script in forma nuda** (`label=x`, `pause`, `vedi`): mai un
  flag con i trattini dopo `npm run x --`, che su alcune shell si perde.
- **Mai leggere un risultato dalla prosa** di uno strumento: si leggono gli
  artefatti JSON. L'output testuale serve solo a mostrare cosa sta succedendo.
- **Nessun comando arbitrario dalla finestra**: la UI manda un nome dall'elenco
  chiuso piu' parametri tipizzati.
- **Contrasto >= 4,5:1**, mai il colore da solo, area cliccabile >= 40px,
  contorno di focus visibile.
- **Il codice generato e le registrazioni non si committano** (gia' ignorati).
- Comandi di verifica del repository: `npx tsc --noEmit -p tsconfig.json`,
  `npm run check:all`, `npm run rules:check`. Dentro `web-ui`: `npm test`.

## Struttura dei file

| File | Responsabilita' |
|---|---|
| `web-ui/src/lib/esecuzione.ts` | l'elenco chiuso dei comandi e la riga di comando che ne deriva. Logica pura, nessun processo. |
| `web-ui/src/lib/registro.ts` | avvia, osserva e ferma le esecuzioni; tiene lo stato su disco; un comando lungo alla volta. |
| `web-ui/src/lib/artefatti.ts` | legge traccia, manifesto e messaggi di Cucumber e li traduce nei tipi che la UI mostra. |
| `web-ui/src/app/api/esegui/route.ts` | avvia un comando. |
| `web-ui/src/app/api/esegui/[id]/flusso/route.ts` | eventi dell'esecuzione (SSE). |
| `web-ui/src/app/api/esegui/[id]/ferma/route.ts` | interrompe. |
| `web-ui/src/app/api/controllo/route.ts` | stato della macchina, strutturato. |
| `web-ui/src/app/(cruscotto)/layout.tsx` | guscio: barra laterale a tre voci, responsive. |
| `web-ui/src/app/(cruscotto)/controllo/page.tsx` | schermata Controllo. |
| `web-ui/src/app/(cruscotto)/registra/page.tsx` | schermata Registra. |
| `web-ui/src/app/(cruscotto)/esecuzione/page.tsx` | schermata Esecuzione. |
| `scripts/diagnosi.ts` | (modifica) uscita strutturata con l'opzione nuda `json`. |
| `scripts/test-bersaglio.ts` | (modifica) opzione nuda `messaggi=<file>` per il flusso Cucumber. |

**Ordine ed esecuzione in parallelo.** Le attivita' 1, 4, 5 e 6 non dipendono da
nessuna: si possono affidare a quattro agenti insieme, e con loro la 6b. Poi 2
(dopo 1), 3 (dopo 2), e infine 7, 8, 9 (dopo 3, 5, 6; la 7 vuole anche 4 e 6b).

---

### Attivita' 1: l'elenco chiuso dei comandi

**File:**
- Crea: `web-ui/src/lib/esecuzione.ts`
- Test: `web-ui/__tests__/lib/esecuzione.test.ts`

**Interfacce:**
- Consuma: niente.
- Produce:
  - `type NomeComando = 'diagnosi' | 'sessione' | 'registrazione' | 'generazione' | 'test' | 'scansione'`
  - `interface Parametri { bersaglio?: string; vedi?: boolean; pulito?: boolean; manifesto?: string; messaggi?: string }`
  - `function rigaDiComando(nome: NomeComando, p?: Parametri): { eseguibile: string; argomenti: string[] }`

- [ ] **Passo 1: il caso che fallisce**

```ts
// web-ui/__tests__/lib/esecuzione.test.ts
import { describe, it, expect } from 'vitest';
import { rigaDiComando } from '@/lib/esecuzione';

describe('elenco chiuso dei comandi', () => {
  it('rifiuta un comando che non e\' nell\'elenco', () => {
    // @ts-expect-error: e' proprio il caso che deve fallire a runtime
    expect(() => rigaDiComando('rm -rf /')).toThrow(/non e' un comando previsto/);
  });

  it('un test si lancia con le opzioni in forma nuda', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro', vedi: true, pulito: true });
    expect(r.argomenti).toEqual([
      'ts-node', 'scripts/test-bersaglio.ts', 'lavoro', 'generati', 'vedi', 'pulito',
    ]);
  });

  it('nessuna opzione con i trattini, mai', () => {
    const tutti: Array<Parameters<typeof rigaDiComando>[0]> =
      ['diagnosi', 'sessione', 'registrazione', 'generazione', 'test', 'scansione'];
    for (const nome of tutti) {
      const r = rigaDiComando(nome, { bersaglio: 'x', manifesto: 'm.json', messaggi: 'g.ndjson' });
      expect(r.argomenti.some((a) => a.startsWith('-'))).toBe(false);
    }
  });

  it('il bersaglio non puo\' iniettare argomenti', () => {
    expect(() => rigaDiComando('test', { bersaglio: 'lavoro && del *' }))
      .toThrow(/nome di bersaglio non valido/);
  });
});
```

- [ ] **Passo 2: eseguilo e verifica che fallisca**

Da `web-ui`: `npx vitest run __tests__/lib/esecuzione.test.ts`
Atteso: FAIL, "Cannot find module '@/lib/esecuzione'".

- [ ] **Passo 3: l'implementazione minima**

```ts
// web-ui/src/lib/esecuzione.ts
/**
 * L'elenco CHIUSO dei comandi che la finestra puo' chiedere.
 *
 * La UI manda un nome e dei parametri tipizzati, mai una stringa da eseguire:
 * un'app che esegue cio' che le si chiede e' un terminale travestito.
 *
 * Le opzioni si scrivono in forma nuda (`vedi`, `manifesto=...`): e' la sola
 * forma che arriva intatta in ogni shell — vedi metodo-di-lavoro.md.
 */
export type NomeComando =
  | 'diagnosi' | 'sessione' | 'registrazione' | 'generazione' | 'test' | 'scansione';

export interface Parametri {
  bersaglio?: string;
  vedi?: boolean;
  pulito?: boolean;
  manifesto?: string;
  messaggi?: string;
}

/** Un bersaglio e' un nome, non una riga di comando. */
const BERSAGLIO_VALIDO = /^[A-Za-z0-9._-]{1,40}$/;

function bersaglioDi(p?: Parametri): string {
  const b = p?.bersaglio ?? '';
  if (!BERSAGLIO_VALIDO.test(b)) {
    throw new Error(`nome di bersaglio non valido: ${JSON.stringify(b)}`);
  }
  return b;
}

/** Un percorso di artefatto resta dentro reports/. */
function percorsoDi(valore: string | undefined, etichetta: string): string {
  if (!valore || valore.includes('..') || /^[a-zA-Z]:|^[\\/]/.test(valore)) {
    throw new Error(`percorso ${etichetta} non valido: ${JSON.stringify(valore)}`);
  }
  return valore;
}

export function rigaDiComando(
  nome: NomeComando,
  p?: Parametri
): { eseguibile: string; argomenti: string[] } {
  const npx = 'npx';
  switch (nome) {
    case 'diagnosi':
      return { eseguibile: npx, argomenti: ['ts-node', 'scripts/diagnosi.ts', 'json'] };
    case 'sessione':
      return { eseguibile: npx, argomenti: ['ts-node', 'scripts/session.ts', bersaglioDi(p)] };
    case 'registrazione':
      return { eseguibile: npx, argomenti: ['ts-node', 'scripts/record.ts', bersaglioDi(p)] };
    case 'scansione':
      return { eseguibile: npx, argomenti: ['ts-node', 'scripts/scout.ts', bersaglioDi(p), 'pause'] };
    case 'generazione':
      return {
        eseguibile: npx,
        argomenti: ['ts-node', 'scripts/generate.ts', `manifest=${percorsoDi(p?.manifesto, 'manifesto')}`],
      };
    case 'test': {
      const argomenti = ['ts-node', 'scripts/test-bersaglio.ts', bersaglioDi(p), 'generati'];
      if (p?.vedi) argomenti.push('vedi');
      if (p?.pulito) argomenti.push('pulito');
      if (p?.messaggi) argomenti.push(`messaggi=${percorsoDi(p.messaggi, 'messaggi')}`);
      return { eseguibile: npx, argomenti };
    }
    default:
      throw new Error(`${String(nome)} non e' un comando previsto`);
  }
}
```

- [ ] **Passo 4: eseguilo e verifica che passi**

Da `web-ui`: `npx vitest run __tests__/lib/esecuzione.test.ts` → PASS (4 casi).

- [ ] **Passo 5: commit**

```bash
git add web-ui/src/lib/esecuzione.ts web-ui/__tests__/lib/esecuzione.test.ts
git commit -m "feat(cruscotto): elenco chiuso dei comandi eseguibili"
```

---

### Attivita' 2: il registro delle esecuzioni

**File:**
- Crea: `web-ui/src/lib/registro.ts`
- Test: `web-ui/__tests__/lib/registro.test.ts`

**Interfacce:**
- Consuma: `rigaDiComando`, `NomeComando`, `Parametri` (attivita' 1); `REPO_ROOT` da `@/lib/repo`.
- Produce:
  - `interface Esecuzione { id: string; nome: NomeComando; stato: 'in corso' | 'conclusa' | 'fallita' | 'interrotta'; righe: string[]; codice?: number; avvio: string; fine?: string }`
  - `function avvia(nome: NomeComando, p?: Parametri, lancia?: Lanciatore): Esecuzione`
  - `function stato(id: string): Esecuzione | undefined`
  - `function ferma(id: string): boolean`
  - `type Lanciatore = (eseguibile: string, argomenti: string[], cwd: string) => ProcessoMinimo`
  - `interface ProcessoMinimo { onRiga(f: (r: string) => void): void; onFine(f: (codice: number) => void): void; termina(): void }`

- [ ] **Passo 1: il caso che fallisce**

```ts
// web-ui/__tests__/lib/registro.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { avvia, stato, ferma, azzeraPerTest } from '@/lib/registro';
import type { ProcessoMinimo } from '@/lib/registro';

function processoFinto(): ProcessoMinimo & { emettiRiga(r: string): void; concludi(c: number): void } {
  let righe: ((r: string) => void) | null = null;
  let fine: ((c: number) => void) | null = null;
  return {
    onRiga(f) { righe = f; },
    onFine(f) { fine = f; },
    termina() { fine?.(130); },
    emettiRiga(r) { righe?.(r); },
    concludi(c) { fine?.(c); },
  };
}

beforeEach(() => azzeraPerTest());

describe('registro delle esecuzioni', () => {
  it('raccoglie le righe e conclude con il codice di uscita', () => {
    const finto = processoFinto();
    const e = avvia('diagnosi', {}, () => finto);
    finto.emettiRiga('tutto a posto');
    finto.concludi(0);
    const dopo = stato(e.id)!;
    expect(dopo.righe).toContain('tutto a posto');
    expect(dopo.stato).toBe('conclusa');
    expect(dopo.codice).toBe(0);
  });

  it('un codice diverso da zero e\' un fallimento, non una conclusione', () => {
    const finto = processoFinto();
    const e = avvia('diagnosi', {}, () => finto);
    finto.concludi(1);
    expect(stato(e.id)!.stato).toBe('fallita');
  });

  it('un comando lungo alla volta: il secondo riceve un no chiaro', () => {
    avvia('registrazione', { bersaglio: 'x' }, () => processoFinto());
    expect(() => avvia('registrazione', { bersaglio: 'y' }, () => processoFinto()))
      .toThrow(/gia' in corso/);
  });

  it('fermare un\'esecuzione la segna interrotta', () => {
    const finto = processoFinto();
    const e = avvia('registrazione', { bersaglio: 'x' }, () => finto);
    expect(ferma(e.id)).toBe(true);
    expect(stato(e.id)!.stato).toBe('interrotta');
  });

  it('tiene al massimo 500 righe, le ultime', () => {
    const finto = processoFinto();
    const e = avvia('diagnosi', {}, () => finto);
    for (let i = 0; i < 600; i++) finto.emettiRiga(`riga ${i}`);
    const righe = stato(e.id)!.righe;
    expect(righe.length).toBe(500);
    expect(righe[righe.length - 1]).toBe('riga 599');
  });
});
```

- [ ] **Passo 2: eseguilo e verifica che fallisca**

Da `web-ui`: `npx vitest run __tests__/lib/registro.test.ts` → FAIL, modulo assente.

- [ ] **Passo 3: l'implementazione minima**

```ts
// web-ui/src/lib/registro.ts
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { rigaDiComando, type NomeComando, type Parametri } from '@/lib/esecuzione';

export interface ProcessoMinimo {
  onRiga(f: (r: string) => void): void;
  onFine(f: (codice: number) => void): void;
  termina(): void;
}
export type Lanciatore = (eseguibile: string, argomenti: string[], cwd: string) => ProcessoMinimo;

export interface Esecuzione {
  id: string;
  nome: NomeComando;
  stato: 'in corso' | 'conclusa' | 'fallita' | 'interrotta';
  righe: string[];
  codice?: number;
  avvio: string;
  fine?: string;
}

/** Piu' di cosi' non serve a nessuno, e la memoria non cresce all'infinito. */
const MAX_RIGHE = 500;

/** I comandi che tengono occupata la macchina: uno alla volta. */
const LUNGHI: NomeComando[] = ['registrazione', 'sessione', 'scansione', 'test'];

const esecuzioni = new Map<string, Esecuzione>();
const processi = new Map<string, ProcessoMinimo>();

/** Solo per i test: il registro e' di processo, non globale al sistema. */
export function azzeraPerTest(): void {
  esecuzioni.clear();
  processi.clear();
}

const lanciatoreVero: Lanciatore = (eseguibile, argomenti, cwd) => {
  const figlio = spawn(eseguibile, argomenti, {
    cwd,
    // Su Windows npx e' uno script: senza shell non parte.
    shell: process.platform === 'win32',
  });
  let resto = '';
  return {
    onRiga(f) {
      const pezzo = (d: Buffer) => {
        resto += d.toString('utf-8');
        const righe = resto.split(/\r?\n/);
        resto = righe.pop() ?? '';
        righe.forEach(f);
      };
      figlio.stdout.on('data', pezzo);
      figlio.stderr.on('data', pezzo);
    },
    onFine(f) { figlio.on('close', (c) => f(c ?? 1)); },
    termina() { figlio.kill(); },
  };
};

function salva(e: Esecuzione): void {
  const dir = path.join(REPO_ROOT, 'reports', 'cruscotto');
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${e.id}.json`), JSON.stringify({ ...e, righe: undefined }, null, 2));
  } catch {
    // Lo stato su disco e' un servizio, non un requisito: se non si scrive,
    // l'esecuzione continua.
  }
}

export function avvia(nome: NomeComando, p?: Parametri, lancia: Lanciatore = lanciatoreVero): Esecuzione {
  if (LUNGHI.includes(nome)) {
    const occupato = [...esecuzioni.values()].some(
      (e) => e.stato === 'in corso' && LUNGHI.includes(e.nome)
    );
    if (occupato) throw new Error("c'e' gia' in corso un'operazione che occupa il browser");
  }

  const { eseguibile, argomenti } = rigaDiComando(nome, p);
  const id = `${nome}-${Date.now().toString(36)}`;
  const e: Esecuzione = { id, nome, stato: 'in corso', righe: [], avvio: new Date().toISOString() };
  esecuzioni.set(id, e);

  const processo = lancia(eseguibile, argomenti, REPO_ROOT);
  processi.set(id, processo);

  processo.onRiga((r) => {
    e.righe.push(r);
    if (e.righe.length > MAX_RIGHE) e.righe.splice(0, e.righe.length - MAX_RIGHE);
  });
  processo.onFine((codice) => {
    if (e.stato === 'interrotta') return;
    e.stato = codice === 0 ? 'conclusa' : 'fallita';
    e.codice = codice;
    e.fine = new Date().toISOString();
    salva(e);
  });

  salva(e);
  return e;
}

export function stato(id: string): Esecuzione | undefined {
  return esecuzioni.get(id);
}

export function ferma(id: string): boolean {
  const e = esecuzioni.get(id);
  const processo = processi.get(id);
  if (!e || !processo || e.stato !== 'in corso') return false;
  e.stato = 'interrotta';
  e.fine = new Date().toISOString();
  processo.termina();
  salva(e);
  return true;
}
```

- [ ] **Passo 4: eseguilo e verifica che passi**

`npx vitest run __tests__/lib/registro.test.ts` → PASS (5 casi).

- [ ] **Passo 5: commit**

```bash
git add web-ui/src/lib/registro.ts web-ui/__tests__/lib/registro.test.ts
git commit -m "feat(cruscotto): registro delle esecuzioni, una alla volta"
```

---

### Attivita' 3: le rotte che avviano, osservano e fermano

**File:**
- Crea: `web-ui/src/app/api/esegui/route.ts`
- Crea: `web-ui/src/app/api/esegui/[id]/flusso/route.ts`
- Crea: `web-ui/src/app/api/esegui/[id]/ferma/route.ts`
- Test: `web-ui/__tests__/api/esegui.test.ts`

**Interfacce:**
- Consuma: `avvia`, `stato`, `ferma`, `azzeraPerTest` (attivita' 2).
- Produce: `POST /api/esegui` → `{ id }` (400 se il comando non esiste);
  `GET /api/esegui/<id>/flusso` → SSE con eventi `riga` e `fine`;
  `POST /api/esegui/<id>/ferma` → `{ fermata: boolean }`.

- [ ] **Passo 1: il caso che fallisce**

```ts
// web-ui/__tests__/api/esegui.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/esegui/route';
import { azzeraPerTest } from '@/lib/registro';

beforeEach(() => azzeraPerTest());

describe('POST /api/esegui', () => {
  it('rifiuta un comando che non e\' nell\'elenco', async () => {
    const res = await POST(new Request('http://x/api/esegui', {
      method: 'POST',
      body: JSON.stringify({ nome: 'qualunque-cosa' }),
    }));
    expect(res.status).toBe(400);
  });

  it('rifiuta un bersaglio che sembra una riga di comando', async () => {
    const res = await POST(new Request('http://x/api/esegui', {
      method: 'POST',
      body: JSON.stringify({ nome: 'test', parametri: { bersaglio: 'x && del *' } }),
    }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Passo 2: eseguilo e verifica che fallisca**

`npx vitest run __tests__/api/esegui.test.ts` → FAIL, modulo assente.

- [ ] **Passo 3: l'implementazione minima**

```ts
// web-ui/src/app/api/esegui/route.ts
import { NextResponse } from 'next/server';
import { avvia } from '@/lib/registro';
import type { NomeComando, Parametri } from '@/lib/esecuzione';

export async function POST(request: Request) {
  let corpo: { nome?: string; parametri?: Parametri };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta non leggibile' }, { status: 400 });
  }

  try {
    const e = avvia(corpo.nome as NomeComando, corpo.parametri);
    return NextResponse.json({ id: e.id });
  } catch (err) {
    // Il messaggio arriva dall'elenco chiuso o dal lucchetto: e' gia' scritto
    // per una persona, e non contiene percorsi ne' valori.
    return NextResponse.json({ errore: (err as Error).message }, { status: 400 });
  }
}
```

```ts
// web-ui/src/app/api/esegui/[id]/flusso/route.ts
import { stato } from '@/lib/registro';

/**
 * Eventi dell'esecuzione, in Server-Sent Events.
 *
 * Unidirezionale e senza dipendenze nuove: il browser riconnette da solo. Si
 * mandano le righe nuove ogni 400ms, non a ogni riga: una registrazione ne
 * produce a raffica, e una finestra che ridisegna trecento volte al secondo non
 * la legge nessuno.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const flusso = new ReadableStream({
    start(controller) {
      let inviate = 0;
      const manda = (evento: string, dati: unknown) => {
        controller.enqueue(new TextEncoder().encode(`event: ${evento}\ndata: ${JSON.stringify(dati)}\n\n`));
      };
      const battito = setInterval(() => {
        const e = stato(id);
        if (!e) { manda('fine', { stato: 'sconosciuta' }); clearInterval(battito); controller.close(); return; }
        const nuove = e.righe.slice(inviate);
        if (nuove.length > 0) { inviate = e.righe.length; manda('riga', nuove); }
        if (e.stato !== 'in corso') {
          manda('fine', { stato: e.stato, codice: e.codice });
          clearInterval(battito);
          controller.close();
        }
      }, 400);
    },
  });

  return new Response(flusso, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
```

```ts
// web-ui/src/app/api/esegui/[id]/ferma/route.ts
import { NextResponse } from 'next/server';
import { ferma } from '@/lib/registro';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ fermata: ferma(id) });
}
```

- [ ] **Passo 4: eseguilo e verifica che passi**

`npx vitest run __tests__/api/esegui.test.ts` → PASS (2 casi).

- [ ] **Passo 5: commit**

```bash
git add web-ui/src/app/api/esegui web-ui/__tests__/api/esegui.test.ts
git commit -m "feat(cruscotto): rotte per avviare, osservare e fermare un comando"
```

---

### Attivita' 4: la diagnosi in forma strutturata

**File:**
- Modifica: `scripts/diagnosi.ts` (radice del repository)
- Crea: `web-ui/src/app/api/controllo/route.ts`
- Test: `web-ui/__tests__/api/controllo.test.ts`

**Interfacce:**
- Consuma: niente.
- Produce: `GET /api/controllo` → `{ pronto: boolean; voci: Array<{ nome: string; esito: 'ok' | 'manca' | 'attenzione'; dettaglio: string; rimedio?: { comando: string } }> }`

- [ ] **Passo 1: il caso che fallisce**

```ts
// web-ui/__tests__/api/controllo.test.ts
import { describe, it, expect } from 'vitest';
import { interpreta } from '@/app/api/controllo/route';

describe('controllo della macchina', () => {
  it('una voce che manca porta con se\' il rimedio', () => {
    const r = interpreta({
      voci: [{ nome: 'Browser', esito: 'manca', dettaglio: 'nessun browser trovato', rimedio: 'installa-browser' }],
    });
    expect(r.pronto).toBe(false);
    expect(r.voci[0].rimedio).toBeDefined();
  });

  it('tutto a posto significa pronto', () => {
    const r = interpreta({ voci: [{ nome: 'Browser', esito: 'ok', dettaglio: 'Chrome' }] });
    expect(r.pronto).toBe(true);
  });
});
```

- [ ] **Passo 2: eseguilo e verifica che fallisca**

`npx vitest run __tests__/api/controllo.test.ts` → FAIL, modulo assente.

- [ ] **Passo 3: l'uscita strutturata nello script**

In `scripts/diagnosi.ts`, accanto alla stampa per le persone. `hasFlag` accetta
sia `json` sia `--json`, e in forma nuda l'opzione arriva in ogni shell.

```ts
// scripts/diagnosi.ts — in cima al main, prima delle stampe
import { hasFlag } from "./lib/args";

/**
 * L'uscita per una macchina, accanto a quella per le persone.
 *
 * Chi legge un risultato lo legge da qui: un numero preso dalla prosa di uno
 * strumento e' gia' costato un 92 al posto di uno 0. Nessun valore di
 * credenziale e nessun indirizzo completo: solo nomi di requisito ed esito.
 */
interface VoceJson {
  nome: string;
  esito: "ok" | "manca" | "attenzione";
  dettaglio: string;
  rimedio?: "sessione" | "scansione";
}

if (hasFlag(process.argv.slice(2), "--json")) {
  const voci: VoceJson[] = verifiche.map((v) => ({
    nome: v.titolo,
    esito: v.ok ? "ok" : v.bloccante ? "manca" : "attenzione",
    dettaglio: v.dettaglio[0] ?? "",
    ...(v.rimedioComando ? { rimedio: v.rimedioComando } : {}),
  }));
  console.log(JSON.stringify({ voci }, null, 2));
  process.exit(0);
}
```

I nomi `verifiche`, `v.titolo`, `v.ok`, `v.dettaglio` sono quelli gia' usati
dallo script: leggilo prima e adatta i campi ai suoi, senza inventarne di nuovi.
Se una verifica non ha un rimedio automatico, `rimedio` si omette.

- [ ] **Passo 4: la rotta**

```ts
// web-ui/src/app/api/controllo/route.ts
import { NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import { REPO_ROOT } from '@/lib/repo';
import { rigaDiComando } from '@/lib/esecuzione';

export interface VoceDiagnosi {
  nome: string;
  esito: 'ok' | 'manca' | 'attenzione';
  dettaglio: string;
  rimedio?: string;
}

/** Separata dalla rotta perche' e' la parte che si puo' verificare da sola. */
export function interpreta(grezzo: { voci: VoceDiagnosi[] }) {
  const voci = grezzo.voci.map((v) => ({
    ...v,
    rimedio: v.rimedio ? { comando: v.rimedio } : undefined,
  }));
  return { pronto: voci.every((v) => v.esito === 'ok'), voci };
}

export async function GET() {
  const { eseguibile, argomenti } = rigaDiComando('diagnosi');
  try {
    const uscita = execFileSync(eseguibile, argomenti, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 60000,
      shell: process.platform === 'win32',
    });
    return NextResponse.json(interpreta(JSON.parse(uscita)));
  } catch (err) {
    return NextResponse.json(
      { pronto: false, voci: [], errore: 'la diagnosi non e\' riuscita a girare' },
      { status: 500 }
    );
  }
}
```

- [ ] **Passo 5: verifica**

`npx vitest run __tests__/api/controllo.test.ts` → PASS.
Dalla radice: `npx ts-node scripts/diagnosi.ts json` stampa JSON valido, e
`npm run check:all` resta verde.

- [ ] **Passo 6: commit**

```bash
git add scripts/diagnosi.ts web-ui/src/app/api/controllo web-ui/__tests__/api/controllo.test.ts
git commit -m "feat(cruscotto): la diagnosi parla anche in JSON"
```

---

### Attivita' 5: leggere gli artefatti

**File:**
- Crea: `web-ui/src/lib/artefatti.ts`
- Crea: `web-ui/__tests__/fixtures/traccia.json`, `web-ui/__tests__/fixtures/messaggi.ndjson`
- Modifica: `scripts/test-bersaglio.ts` (opzione nuda `messaggi=<file>`)
- Test: `web-ui/__tests__/lib/artefatti.test.ts`

**Interfacce:**
- Consuma: niente.
- Produce:
  - `function leggiTraccia(percorso: string): { passi: Array<{ nome: string; gesti: number; verifiche: number }>; durata: number }`
  - `function leggiPassiTest(percorsoMessaggi: string): Array<{ testo: string; esito: 'passato' | 'fallito' | 'saltato'; messaggio?: string }>`

- [ ] **Passo 1: il caso che fallisce**

```ts
// web-ui/__tests__/lib/artefatti.test.ts
import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { leggiTraccia, leggiPassiTest } from '@/lib/artefatti';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

describe('lettura degli artefatti', () => {
  it('dalla traccia legge i passi con il nome dato dal tester', () => {
    const t = leggiTraccia(path.join(FIXTURES, 'traccia.json'));
    expect(t.passi).toEqual([
      { nome: 'the user logs in', gesti: 3, verifiche: 0 },
      { nome: 'the user opens the list', gesti: 1, verifiche: 2 },
    ]);
  });

  it('dai messaggi di Cucumber legge l\'esito di ogni passo', () => {
    const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi.ndjson'));
    expect(passi.map((p) => p.esito)).toEqual(['passato', 'fallito', 'saltato']);
  });

  it('un file che non c\'e\' non fa cadere la finestra', () => {
    expect(leggiTraccia(path.join(FIXTURES, 'non-esiste.json')).passi).toEqual([]);
  });
});
```

Le fixture: `traccia.json` con due intenti (il primo con tre gesti e nessuna
verifica, il secondo con un gesto e due verifiche) nella forma prodotta da
`scripts/record.ts`; `messaggi.ndjson` con tre `testStepFinished` di esito
`PASSED`, `FAILED`, `SKIPPED` e i rispettivi `testStep` / `pickleStep`.

- [ ] **Passo 2: eseguilo e verifica che fallisca**

`npx vitest run __tests__/lib/artefatti.test.ts` → FAIL.

- [ ] **Passo 3: l'implementazione**

```ts
// web-ui/src/lib/artefatti.ts
import * as fs from 'fs';

/**
 * I risultati si leggono da qui, non dall'output a schermo: un conteggio preso
 * da un riassunto pensato per le persone dava 92 invece di 0.
 *
 * Un file che non c'e' non fa cadere la finestra: restituisce vuoto, e la
 * schermata lo dice.
 */
interface TracciaGrezza {
  durationSeconds?: number;
  intents?: Array<{ label?: string; steps?: unknown[]; assertions?: unknown[] }>;
}

export function leggiTraccia(percorso: string): {
  passi: Array<{ nome: string; gesti: number; verifiche: number }>;
  durata: number;
} {
  let grezza: TracciaGrezza;
  try {
    grezza = JSON.parse(fs.readFileSync(percorso, 'utf-8')) as TracciaGrezza;
  } catch {
    return { passi: [], durata: 0 };
  }
  return {
    durata: grezza.durationSeconds ?? 0,
    passi: (grezza.intents ?? []).map((i) => ({
      nome: i.label ?? '(senza nome)',
      gesti: (i.steps ?? []).length,
      verifiche: (i.assertions ?? []).length,
    })),
  };
}

type Esito = 'passato' | 'fallito' | 'saltato';

const ESITI: Record<string, Esito> = {
  PASSED: 'passato',
  FAILED: 'fallito',
  SKIPPED: 'saltato',
  UNDEFINED: 'saltato',
  PENDING: 'saltato',
  AMBIGUOUS: 'fallito',
};

export function leggiPassiTest(percorsoMessaggi: string): Array<{
  testo: string;
  esito: Esito;
  messaggio?: string;
}> {
  let righe: string[];
  try {
    righe = fs.readFileSync(percorsoMessaggi, 'utf-8').split('\n').filter((r) => r.trim());
  } catch {
    return [];
  }

  // Il testo del passo sta nel pickle; l'esito arriva dopo, con l'id del passo.
  const testoPerId = new Map<string, string>();
  const passi: Array<{ testo: string; esito: Esito; messaggio?: string }> = [];

  for (const riga of righe) {
    let m: Record<string, any>;
    try {
      m = JSON.parse(riga);
    } catch {
      continue;
    }
    if (m.pickle?.steps) {
      for (const s of m.pickle.steps) testoPerId.set(s.id, s.text ?? '');
    }
    if (m.testCase?.testSteps) {
      for (const s of m.testCase.testSteps) {
        if (s.pickleStepId) testoPerId.set(s.id, testoPerId.get(s.pickleStepId) ?? '');
      }
    }
    if (m.testStepFinished) {
      const id = m.testStepFinished.testStepId as string;
      const risultato = m.testStepFinished.testStepResult ?? {};
      const testo = testoPerId.get(id);
      // Gli hook non hanno un testo: non sono passi dello scenario.
      if (!testo) continue;
      passi.push({
        testo,
        esito: ESITI[risultato.status as string] ?? 'saltato',
        ...(risultato.message ? { messaggio: String(risultato.message) } : {}),
      });
    }
  }
  return passi;
}
```

- [ ] **Passo 4: l'opzione `messaggi` nel lanciatore dei test**

In `scripts/test-bersaglio.ts`, con `messaggi=<file>` si aggiunge
`--format message:<file>` agli argomenti di Cucumber (i trattini qui vanno bene:
non passano da npm, li mette lo script).

- [ ] **Passo 5: verifica**

`npx vitest run __tests__/lib/artefatti.test.ts` → PASS.
Dalla radice: `npx tsc --noEmit -p tsconfig.json` e `npm run check:all` verdi.

- [ ] **Passo 6: commit**

```bash
git add web-ui/src/lib/artefatti.ts web-ui/__tests__ scripts/test-bersaglio.ts
git commit -m "feat(cruscotto): i risultati si leggono dagli artefatti"
```

---

### Attivita' 6: tema e guscio

**File:**
- Modifica: `web-ui/src/app/globals.css` (variabili della tavolozza)
- Crea: `web-ui/src/app/(cruscotto)/layout.tsx`
- Crea: `web-ui/src/components/cruscotto/BarraLaterale.tsx`

**Interfacce:**
- Produce: il guscio con tre voci — Controllo (`/controllo`), Registra
  (`/registra`), Esecuzione (`/esecuzione`).

- [ ] **Passo 1: le variabili**

In `globals.css`, accanto a quelle esistenti:

```css
:root {
  --blu: #1A56DB;
  --verde: #067647;
  --rosso: #B42318;
  --testo: #101828;
  --testo-tenue: #475467;
  --superficie: #FFFFFF;
  --superficie-tenue: #F9FAFB;
  --bordo: #EAECF0;
}
```

- [ ] **Passo 2: il guscio**

`layout.tsx` con una griglia: barra laterale 240px e contenuto, che sotto i
900px diventa una colonna sola con la barra in alto. Ogni voce e' un link con
stato attivo reso da **icona + testo + colore**, mai dal colore soltanto, e
contorno di focus visibile (`focus-visible:outline`).

- [ ] **Passo 3: verifica**

Da `web-ui`: `npm run build` senza errori. Poi `npm run dev` e, a mano:
la finestra a 1024px di larghezza non ha scorrimento orizzontale; con il solo
tasto Tab si raggiungono tutte e tre le voci e si vede dove si e'.

- [ ] **Passo 4: commit**

```bash
git add web-ui/src/app/globals.css web-ui/src/app/\(cruscotto\) web-ui/src/components/cruscotto
git commit -m "feat(cruscotto): tema accessibile e guscio a tre voci"
```

---

### Attivita' 6b: scrivere indirizzi e credenziali

**File:**
- Crea: `web-ui/src/lib/configurazione.ts`
- Crea: `web-ui/src/app/api/configurazione/route.ts`
- Test: `web-ui/__tests__/lib/configurazione.test.ts`

**Interfacce:**
- Consuma: `REPO_ROOT` da `@/lib/repo`.
- Produce:
  - `function scriviVariabile(contenutoEnv: string, chiave: string, valore: string): string`
  - `function bersagliDaFile(json: string): string[]`
  - `POST /api/configurazione` con `{ chiave, valore }` → `{ scritta: true }`

Senza questa attivita' la schermata Controllo puo' solo **dire** cosa manca; il
tester dovrebbe aprire un file per rimediare, e il vincolo V3 cadrebbe proprio
dove serve.

- [ ] **Passo 1: il caso che fallisce**

```ts
// web-ui/__tests__/lib/configurazione.test.ts
import { describe, it, expect } from 'vitest';
import { scriviVariabile, bersagliDaFile } from '@/lib/configurazione';

describe('scrittura della configurazione', () => {
  it('aggiunge una variabile che non c\'era', () => {
    expect(scriviVariabile('ALTRA=1\n', 'PIMS_URL', 'https://x.invalid'))
      .toBe('ALTRA=1\nPIMS_URL=https://x.invalid\n');
  });

  it('sostituisce quella che c\'era, senza duplicarla', () => {
    const dopo = scriviVariabile('A=1\nPIMS_URL=vecchio\nB=2\n', 'PIMS_URL', 'nuovo');
    expect(dopo).toBe('A=1\nPIMS_URL=nuovo\nB=2\n');
    expect(dopo.match(/PIMS_URL/g)).toHaveLength(1);
  });

  it('rifiuta una chiave che non e\' una chiave', () => {
    expect(() => scriviVariabile('', 'A=1\nB', 'x')).toThrow(/chiave non valida/);
  });

  it('elenca i bersagli senza mostrarne gli indirizzi', () => {
    const json = '{"_commento":["x"],"lavoro":{"url":"${PIMS_URL}"},"altro":{"url":"${B}"}}';
    expect(bersagliDaFile(json)).toEqual(['lavoro', 'altro']);
  });
});
```

- [ ] **Passo 2: eseguilo e verifica che fallisca**

`npx vitest run __tests__/lib/configurazione.test.ts` → FAIL.

- [ ] **Passo 3: l'implementazione**

```ts
// web-ui/src/lib/configurazione.ts
/**
 * Scrive una variabile in .env conservando il resto del file.
 *
 * Perche' una funzione pura e non una scrittura diretta: cosi' si puo'
 * verificare che sostituisca invece di duplicare — un .env con la stessa chiave
 * due volte ha un comportamento che dipende da chi lo legge, e il sintomo
 * (credenziali che "a volte" non funzionano) non assomiglia alla causa.
 */
const CHIAVE_VALIDA = /^[A-Z][A-Z0-9_]{0,60}$/;

export function scriviVariabile(contenutoEnv: string, chiave: string, valore: string): string {
  if (!CHIAVE_VALIDA.test(chiave)) throw new Error(`chiave non valida: ${JSON.stringify(chiave)}`);
  if (/[\r\n]/.test(valore)) throw new Error('il valore non puo\' contenere un a capo');

  const righe = contenutoEnv.split('\n');
  const i = righe.findIndex((r) => r.startsWith(`${chiave}=`));
  if (i >= 0) {
    righe[i] = `${chiave}=${valore}`;
    return righe.join('\n');
  }
  const senzaCodaVuota = contenutoEnv.endsWith('\n') || contenutoEnv === ''
    ? contenutoEnv
    : `${contenutoEnv}\n`;
  return `${senzaCodaVuota}${chiave}=${valore}\n`;
}

/** I nomi dei bersagli, senza gli indirizzi: quelli non servono alla finestra. */
export function bersagliDaFile(json: string): string[] {
  const dati = JSON.parse(json) as Record<string, unknown>;
  return Object.keys(dati).filter((k) => !k.startsWith('_'));
}
```

La rotta legge `.env` (se c'e'), chiama `scriviVariabile`, riscrive il file con
permessi invariati e risponde `{ scritta: true }`. **Non rilegge mai il valore
verso la finestra**: un campo credenziale si scrive, non si rilegge.

- [ ] **Passo 4: eseguilo e verifica che passi**

`npx vitest run __tests__/lib/configurazione.test.ts` → PASS (4 casi).

- [ ] **Passo 5: commit**

```bash
git add web-ui/src/lib/configurazione.ts web-ui/src/app/api/configurazione web-ui/__tests__/lib/configurazione.test.ts
git commit -m "feat(cruscotto): indirizzi e credenziali si scrivono dalla finestra"
```

---

### Attivita' 7: schermata Controllo

**File:**
- Crea: `web-ui/src/app/(cruscotto)/controllo/page.tsx`
- Crea: `web-ui/src/components/cruscotto/VoceControllo.tsx`

**Interfacce:**
- Consuma: `GET /api/controllo` (attivita' 4), `POST /api/esegui` (attivita' 3),
  `POST /api/configurazione` e `bersagliDaFile` (attivita' 6b).

- [ ] **Passo 1: la schermata**

All'apertura chiama `/api/controllo` e mostra una riga per voce: icona, nome,
esito a parole, dettaglio. Dove c'e' un rimedio, un pulsante che chiama
`/api/esegui` con quel comando e mostra l'avanzamento nella stessa riga.

- [ ] **Passo 2: gli stati che si vedono davvero**

Caricamento (scheletro, non una rotella sola), errore della diagnosi ("non sono
riuscito a controllare la macchina" con pulsante *riprova*), e lo stato in
fondo: *pronto* oppure *mancano N cose*.

- [ ] **Passo 3: verifica a mano**

Con la diagnosi che passa: tutte le voci verdi, stato *pronto*.
Rinomina temporaneamente `bdd-targets.json`: compare la voce rossa con il
rimedio, e il resto della schermata resta leggibile. Rimettilo a posto.

- [ ] **Passo 4: commit**

```bash
git add web-ui/src/app/\(cruscotto\)/controllo web-ui/src/components/cruscotto/VoceControllo.tsx
git commit -m "feat(cruscotto): schermata di controllo della macchina"
```

---

### Attivita' 8: schermata Registra

**File:**
- Crea: `web-ui/src/app/(cruscotto)/registra/page.tsx`
- Crea: `web-ui/src/components/cruscotto/RiepilogoTraccia.tsx`

**Interfacce:**
- Consuma: `POST /api/esegui` con `registrazione` e poi `generazione`;
  `GET /api/esegui/<id>/flusso`; `leggiTraccia` (attivita' 5) esposta da una
  rotta `GET /api/traccia?percorso=<relativo>` che convalida il percorso dentro
  `reports/recordings/`.

- [ ] **Passo 1: avvio e attesa**

Elenco degli ambienti (dalla stessa fonte della schermata Controllo), pulsante
**Registra una sessione**, e durante la registrazione un'attesa che dice cosa
sta succedendo e offre *interrompi*.

- [ ] **Passo 2: il riepilogo**

Alla fine mostra i passi con il nome dato dal tester, quante verifiche, e i
buchi tradotti in italiano comprensibile, ognuno con il suo rimedio dove esiste
(*scansiona quella pagina*).

- [ ] **Passo 3: generare**

Un pulsante **Genera il test**, che chiama `/api/esegui` con `generazione` e, a
fine, porta alla schermata Esecuzione.

- [ ] **Passo 4: verifica a mano**

Una registrazione breve vera: la barra compare, alla chiusura il riepilogo
mostra i passi con i nomi giusti, e *Genera il test* produce i file.

- [ ] **Passo 5: commit**

```bash
git add web-ui/src/app/\(cruscotto\)/registra web-ui/src/components/cruscotto/RiepilogoTraccia.tsx web-ui/src/app/api/traccia
git commit -m "feat(cruscotto): schermata di registrazione con riepilogo"
```

---

### Attivita' 9: schermata Esecuzione

**File:**
- Crea: `web-ui/src/app/(cruscotto)/esecuzione/page.tsx`
- Crea: `web-ui/src/components/cruscotto/PassoTest.tsx`
- Crea: `web-ui/src/app/api/passi/route.ts` (legge i messaggi con `leggiPassiTest`)

**Interfacce:**
- Consuma: `POST /api/esegui` con `test` e `messaggi=reports/cruscotto/<id>.ndjson`;
  `GET /api/esegui/<id>/flusso`; `GET /api/passi?id=<id>`.

- [ ] **Passo 1: lanciare**

Due interruttori (*guarda il browser*, *parti senza sessione*) e un pulsante
**Lancia il test**.

- [ ] **Passo 2: i passi che diventano verdi**

Mentre gira, la pagina chiede `/api/passi` ogni secondo e disegna i passi con
icona e parola: *superato*, *fallito*, *saltato*.

- [ ] **Passo 3: il fallimento che si capisce**

Sul passo rosso: il messaggio dell'errore, la schermata catturata se c'e', e in
fondo una riga che riassume (*4 superati, 1 fallito, 6 saltati*).

- [ ] **Passo 4: verifica a mano**

Su uno scenario che passa: tutti verdi. Su uno che fallisce: si vede quale passo
e perche', senza aprire nessun file.

- [ ] **Passo 5: commit**

```bash
git add web-ui/src/app/\(cruscotto\)/esecuzione web-ui/src/components/cruscotto/PassoTest.tsx web-ui/src/app/api/passi
git commit -m "feat(cruscotto): schermata di esecuzione con i passi in tempo reale"
```

---

## Quando l'MVP e' finito

- Dalla finestra, senza terminale: si controlla la macchina, si registra, si
  genera, si lancia il test e se ne legge l'esito.
- `npm test` in `web-ui` verde; `npm run check:all` e `rules:check` verdi nella
  radice; `npm run build` in `web-ui` senza errori.
- Nessun nome aziendale nei file nuovi, e la ricerca prima del commit resta
  pulita.

## Cosa resta fuori, dichiarato

Catalogo e assistente dentro al cruscotto, sincronizzazione, aggiornamento
automatico, gestore credenziali di sistema, test che pilotano l'interfaccia.
