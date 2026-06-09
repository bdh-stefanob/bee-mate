/**
 * watch-catalog.ts
 * -----------------
 * Guarda src/steps/ e rigenera step-catalog.json ad ogni salvataggio.
 * Usa solo moduli Node.js built-in — zero dipendenze extra.
 *
 * Uso:
 *   npm run catalog:watch
 */

import { watch } from 'fs';
import { exec }  from 'child_process';
import { join }  from 'path';

const WATCH_DIR = join(process.cwd(), 'src', 'steps');
let debounce: ReturnType<typeof setTimeout> | null = null;
let running = false;

function regenerate(trigger: string) {
  if (running) return;
  running = true;
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${trigger} modificato — rigenero catalog...`);

  exec('npm run catalog', (err, _stdout, stderr) => {
    running = false;
    if (err) {
      console.error(`[catalog:watch] ERRORE:\n${stderr}`);
    } else {
      console.log(`[${new Date().toLocaleTimeString()}] step-catalog.json aggiornato ✓`);
    }
  });
}

console.log(`\n[catalog:watch] In ascolto su ${WATCH_DIR}`);
console.log('[catalog:watch] Premi Ctrl+C per fermare.\n');

// Genera subito al lancio
regenerate('avvio');

watch(WATCH_DIR, { recursive: true }, (_, filename) => {
  if (!filename?.endsWith('.ts')) return;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => regenerate(filename), 600);
});
