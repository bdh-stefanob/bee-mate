/**
 * lib/inventory.ts
 * ----------------
 * Inventariare i componenti di una pagina aperta. Una sola implementazione.
 *
 * PERCHE' STA QUI E NON DENTRO ALLO SCOUT
 * Perche' la usano in due, e il secondo e' arrivato dopo aver capito una cosa
 * che cambia il metodo: **inventariare durante la registrazione e' piu' corretto
 * che inventariare a parte.**
 *
 * Non e' solo un comando in meno. Una pagina scansionata a freddo puo' mostrare
 * uno stato diverso da quello che il tester ha attraversato: dentro a un
 * questionario, `/questions/3` dipende dalle risposte date prima; un modale
 * aperto cambia cosa e' raggiungibile; una lista dipende dai dati del proprio
 * utente. Il dizionario preso mentre si registra descrive **la pagina che il
 * tester ha davvero avuto davanti**, e quella e' l'unica che conta per generare
 * il codice di quella sessione.
 *
 * Lo scout autonomo resta, e non e' un doppione: serve al censimento di
 * accessibilita', che si fa su pagine che nessuno sta registrando.
 */

import type { Page } from "@playwright/test";
import { DOM_PROBE_SOURCE } from "./dom-probe";
import { toComponent, type RawElement } from "./component-naming";
import type { Component, ScoutResult } from "./generation-contract";

/**
 * Raccoglie gli elementi interattivi usando il probe condiviso.
 *
 * La descrizione (ruolo + nome accessibile) NON e' reimplementata qui: arriva da
 * `DOM_PROBE_SOURCE`, lo stesso codice che usa il recorder per capire cosa ha
 * toccato il tester. Due implementazioni diverse divergerebbero, e divergendo
 * romperebbero l'aggancio fra gesto e componente — che e' il perno del metodo.
 */
export function collectWithProbe(scopeSelector: string): RawElement[] {
  const probe = (window as unknown as { __bddProbe: {
    describe(el: Element): { role: string; name: string } | null;
    isVisible(el: Element): boolean;
  } }).__bddProbe;

  const selector = [
    "a[href]", "button", 'input:not([type="hidden"])', "select", "textarea",
    '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]',
    '[role="checkbox"]', '[role="radio"]', '[role="combobox"]',
    '[role="textbox"]', '[role="searchbox"]', '[role="switch"]',
  ].join(", ");

  const root = document.querySelector(scopeSelector) ?? document.body;
  const out: RawElement[] = [];

  root.querySelectorAll(selector).forEach((el) => {
    if (!probe.isVisible(el)) return;
    const described = probe.describe(el);
    if (!described) return;

    const input = el as HTMLInputElement;
    out.push({
      role: described.role,
      name: described.name,
      href: (el as HTMLAnchorElement).href ?? "",
      disabled: Boolean(input.disabled || input.readOnly),
    });
  });

  return out;
}

/**
 * Il dizionario della pagina attualmente aperta.
 *
 * `url` viene da `page.url()`, mai da quello richiesto: un rimando al login e'
 * silenzioso, e un dizionario che dichiarasse di essere di un'altra pagina
 * sarebbe una bugia che si scopre molto piu' tardi, quando i locator non
 * trovano niente.
 */
export async function inventory(page: Page, scope = "body"): Promise<ScoutResult> {
  // La pagina e' gia' caricata, quindi evaluate e non addInitScript. Reiniettare
  // e' innocuo: il probe si installa una volta sola e poi si autoesclude.
  await page.evaluate(DOM_PROBE_SOURCE);
  const raw = await page.evaluate(collectWithProbe, scope);

  // Conta le occorrenze PRIMA di deduplicare: e' il dato che rende un locator
  // ambiguo, e si perde se si deduplica per primo.
  const counts = new Map<string, number>();
  for (const el of raw) {
    const key = `${el.role} ${el.name}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const seen = new Set<string>();
  const components: Component[] = [];
  for (const el of raw) {
    const key = `${el.role} ${el.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    components.push(toComponent(el, counts.get(key) ?? 1));
  }

  components.sort((a, b) =>
    a.role === b.role ? a.name.localeCompare(b.name) : a.role.localeCompare(b.role)
  );

  const unnamed = components.filter((c) => c.stability === "unnamed").length;
  const ambiguous = components.filter((c) => c.stability === "ambiguous").length;
  const unstable = components.filter((c) => c.stability === "unstable").length;
  const usable = components.filter((c) => c.stability === "stable").length;

  return {
    url: page.url(),
    scope,
    scoutedAt: new Date().toISOString(),
    viewport: page.viewportSize() ?? { width: 0, height: 0 },
    quality: {
      interactiveFound: raw.length,
      usable,
      unnamed,
      ambiguous,
      unstable,
      accessibleScore: components.length ? Math.round((usable / components.length) * 100) : 0,
    },
    components,
  };
}

/**
 * Fonde due inventari della stessa pagina.
 *
 * Serve quando una pagina viene inventariata piu' volte durante la stessa
 * sessione — succede di continuo su un'applicazione a pagina singola, dove si
 * torna indietro e si riparte. **Si tiene l'unione**, non l'ultima: un modale
 * aperto a meta' sessione mostra componenti che dopo non ci sono piu', e sono
 * proprio quelli che il tester ha toccato.
 *
 * Sulle occorrenze si tiene il MASSIMO visto: un locator ambiguo una volta sola
 * e' ambiguo, e dimenticarlo produrrebbe un locator che funziona in prova e
 * fallisce quando la lista si riempie.
 */
export function mergeInventories(a: ScoutResult, b: ScoutResult): ScoutResult {
  const perChiave = new Map<string, Component>();

  for (const c of [...a.components, ...b.components]) {
    const key = `${c.role} ${c.name}`;
    const gia = perChiave.get(key);
    if (!gia) {
      perChiave.set(key, c);
      continue;
    }
    if (c.occurrences > gia.occurrences) perChiave.set(key, c);
  }

  const components = [...perChiave.values()].sort((x, y) =>
    x.role === y.role ? x.name.localeCompare(y.name) : x.role.localeCompare(y.role)
  );
  const usable = components.filter((c) => c.stability === "stable").length;

  return {
    ...b,
    components,
    quality: {
      interactiveFound: Math.max(a.quality.interactiveFound, b.quality.interactiveFound),
      usable,
      unnamed: components.filter((c) => c.stability === "unnamed").length,
      ambiguous: components.filter((c) => c.stability === "ambiguous").length,
      unstable: components.filter((c) => c.stability === "unstable").length,
      accessibleScore: components.length ? Math.round((usable / components.length) * 100) : 0,
    },
  };
}
