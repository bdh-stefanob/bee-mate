// src/support/terze-parti.ts
// Gli script di tracciamento, pubblicita' e widget esterni non arrivano nel
// browser dei test.
//
// Nessuno step li usa, ma `page.goto` aspetta l'evento `load`, e `load` aspetta
// ogni script della pagina. Il 20/10 la brochure di QA non arrivava a `load` in
// 30 s: restavano appesi Trustpilot, Awin, Clarity e Bing, e lo scenario falliva
// all'accesso per colpa di un widget di recensioni. Con una rete lenta, come
// quella di una sala riunioni, succede lo stesso.
//
// Si bloccano per dominio: l'elenco e' corto e si allunga solo quando un nuovo
// script fa aspettare la pagina. Il banner dei cookie NON e' qui dentro: lo
// gestisce avvisi.ts, e se viene caricato da uno di questi domini semplicemente
// non compare.

import type { BrowserContext } from "@playwright/test";

const DOMINI_BLOCCATI = [
  "googletagmanager.com",
  "google-analytics.com",
  "googlesyndication.com",
  "doubleclick.net",
  "clarity.ms",
  "bing.net",
  "trustpilot.com",
  "dwin1.com",
  "facebook.net",
  "hotjar.com",
];

function bloccato(indirizzo: string): boolean {
  let host: string;
  try {
    host = new URL(indirizzo).hostname;
  } catch {
    return false;
  }
  return DOMINI_BLOCCATI.some((d) => host === d || host.endsWith(`.${d}`));
}

export async function bloccaTerzeParti(context: BrowserContext): Promise<void> {
  await context.route((url) => bloccato(url.href), (route) => route.abort("blockedbyclient"));
}
