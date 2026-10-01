import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import { lanciatoreVero } from '@/lib/registro';

/**
 * Interrompi lascia orfani i processi figli?
 *
 * La domanda: `ferma()` fa `figlio.kill()`, e su Windows `kill()` termina quel
 * solo processo. `test-bersaglio` lancia Cucumber con `execFileSync`, e Cucumber
 * lancia i browser: se restassero vivi, tre corsie interrotte sarebbero tre
 * Cucumber e dodici browser senza finestra.
 *
 * Riprodotto il 1/10/2026 con il lanciatore vero, su `test-bersaglio` e su `demo`
 * con il browser nascosto: **non restano orfani**. Il motivo e' di Node, non
 * nostro: su Windows libuv assegna ogni figlio a un "job" del processo padre con
 * l'opzione "chiudi tutto alla chiusura del job", e i discendenti ci restano
 * dentro. Terminato il padre, il job si chiude e muore l'intero albero.
 *
 * Questo caso e' la guardia: se una versione di Node o un cambio al lanciatore
 * (`detached`, una shell, un eseguibile che esce dal job) rompesse la proprieta',
 * qui si vede — e la correzione prevista e' `taskkill /T /F /PID` con `execFile`
 * e argomenti separati, mai una shell. Il metodo sa vedere un orfano: provato a
 * mano con un figlio avviato `detached`, che sopravvive alla terminazione del
 * padre. Su altri sistemi il caso non gira: li' `kill()` e' un segnale al solo
 * processo, e il comportamento dei figli e' un'altra storia.
 */
const SOLO_WINDOWS = process.platform === 'win32';

function esiste(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function finche(condizione: () => boolean, ms: number): Promise<boolean> {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    if (condizione()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return condizione();
}

describe.skipIf(!SOLO_WINDOWS)('Interrompi su Windows', () => {
  it('terminando un processo che aspetta un figlio con execFileSync, il figlio non resta orfano', async () => {
    // Il padre fa quello che fa `test-bersaglio`: aspetta il figlio in modo
    // bloccante. Il figlio dice il suo pid e resta vivo un minuto.
    const padre = `
      const { execFileSync } = require('child_process');
      execFileSync(process.execPath,
        ['-e', 'console.log("figlio=" + process.pid); setTimeout(() => {}, 60000)'],
        { stdio: 'inherit' });
    `;
    const processo = lanciatoreVero(process.execPath, ['-e', padre], { cwd: process.cwd(), env: process.env });

    let pidFiglio = 0;
    processo.onRiga((r) => {
      const m = /^figlio=(\d+)/.exec(r);
      if (m) pidFiglio = Number(m[1]);
    });
    let finito = false;
    processo.onFine(() => { finito = true; });

    try {
      expect(await finche(() => pidFiglio > 0, 10_000), 'il figlio non ha detto il suo pid').toBe(true);
      expect(esiste(pidFiglio)).toBe(true);

      processo.termina();
      expect(await finche(() => finito, 10_000), 'il padre non e\' morto').toBe(true);

      expect(
        await finche(() => !esiste(pidFiglio), 5_000),
        `il figlio ${pidFiglio} e' rimasto vivo dopo Interrompi: serve terminare l'albero (taskkill /T /F /PID, con execFile)`
      ).toBe(true);
    } finally {
      // Qualunque cosa sia successa, l'esperimento non lascia niente.
      if (pidFiglio > 0 && esiste(pidFiglio)) {
        execFileSync('taskkill', ['/PID', String(pidFiglio), '/T', '/F'], { stdio: 'ignore' });
      }
    }
  }, 30_000);
});
