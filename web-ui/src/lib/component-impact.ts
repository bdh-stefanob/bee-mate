import type { CatalogStep, StepComponentRef } from './types';

/**
 * component-impact.ts
 * --------------------
 * La mappa al contrario: non "questo step usa quali componenti" (che sta gia'
 * dentro `CatalogStep.components`, scritto da `scripts/lib/generate-emit.ts` e
 * letto da `scripts/extract-steps.ts`), ma "questo componente e' usato da
 * quali step, e quanti sono".
 *
 * E' la domanda a cui la demo deve rispondere a colpo d'occhio: "se cambio
 * questo componente, quanti scenari tocco?". Il catalogo non la sa gia' —
 * bisogna scorrerlo e ribaltare l'indice.
 *
 * COSA NON FA
 * Non inventa un aggancio per gli step che non ne dichiarano uno: uno step
 * senza `components` semplicemente non compare in nessuna voce della mappa.
 * E' lo stato onesto dei 137 step scritti a mano (nessuna registrazione dietro
 * di loro), e va mostrato come assenza — non stimato con la somiglianza delle
 * frasi, che qui sarebbe un numero inventato spacciato per un fatto.
 *
 * IDENTITA' DI UN COMPONENTE: ruolo + nome, non la pagina
 * Due occorrenze con lo stesso ruolo e nome sono lo stesso componente anche se
 * solo una delle due dichiara la pagina — una registrazione vecchia non la
 * segnava sempre. Prima si spezzavano in due righe della mappa (`button "Sign
 * in" / AccediPage` e `button "Sign in" / —`), sottostimando l'impatto: se il
 * pulsante tocca 2 step, dire "1" nella direzione del "sembra piu' sicuro
 * cambiarlo di quanto sia" e' l'errore peggiore che questa mappa possa fare.
 * Quando invece due occorrenze dichiarano pagine DIVERSE e note, non si fonde
 * silenziosamente scegliendone una: sarebbe lo stesso errore all'incontrario
 * (un falso "sono la stessa cosa"). In quel caso il componente resta unico
 * (stesso ruolo+nome = stesso rischio se lo cambi), ma `page` resta assente e
 * `pagineAmbigue` porta l'elenco onesto delle pagine viste, cosi' la vista puo'
 * mostrarle entrambe invece di indovinare.
 *
 * Nota bene: ruoli diversi con lo stesso nome (`button "Sign in"` vs `link
 * "Sign in"`) restano due componenti distinti — la chiave include il ruolo
 * apposta. E' il caso opposto, che `riconciliazione.ts` usa per distinguere un
 * equivoco di denominazione da un doppione: non va toccato qui.
 */

/** Chiave stabile per un componente: ruolo+nome. La pagina NON fa parte dell'identita': vedi sopra. */
export function componentImpactKey(c: StepComponentRef): string {
  return `${c.role}\u0000${c.name}`;
}

export interface ComponentImpact {
  role: string;
  name: string;
  /** Pagina su cui vive, quando tutte le occorrenze che la dichiarano concordano. */
  page?: string;
  /**
   * Presente solo quando le occorrenze dichiarano pagine diverse: l'elenco
   * completo (in ordine di prima comparsa), senza fondere. Se presente,
   * `page` e' assente — l'ambiguita' si mostra, non si nasconde scegliendo
   * una pagina a caso.
   */
  pagineAmbigue?: string[];
  /** Gli step di catalogo che dichiarano questo componente. */
  steps: CatalogStep[];
}

/**
 * Costruisce la mappa componente -> step che lo usano, dagli step del
 * catalogo che dichiarano `components`. L'ordine e' decrescente per numero di
 * step: il componente piu' rischioso da cambiare sta in cima.
 */
export function computeComponentImpact(steps: readonly CatalogStep[]): ComponentImpact[] {
  // Due passaggi, e il motivo e' una distinzione che vale la pena tenere.
  //
  // Lo stesso ruolo+nome su PAGINE DIVERSE e' gente diversa: un `button
  // "Submit"` sulla pagina di accesso non e' quello del pagamento, e unirli
  // gonfierebbe il raggio d'impatto proprio mentre si toglie l'informazione
  // che lo rende utile.
  //
  // Il caso da sistemare era un altro: un'occorrenza che la pagina la sa e una
  // che non la sa — registrazioni fatte con versioni diverse del registratore.
  // Quelle sono lo stesso componente, e vanno unite.
  //
  // Quindi: prima si raggruppa cio' che la pagina ce l'ha; poi le occorrenze
  // senza pagina si appoggiano al gruppo giusto, ma solo se ce n'e' uno solo —
  // se i candidati sono due, non si indovina.
  const conPagina = new Map<string, ComponentImpact>();
  const senzaPagina = new Map<string, CatalogStep[]>();

  for (const step of steps) {
    for (const c of step.components ?? []) {
      const identita = `${c.role}\u0000${c.name}`;
      if (c.page) {
        const chiave = `${identita}\u0000${c.page}`;
        const esistente = conPagina.get(chiave);
        if (esistente) esistente.steps.push(step);
        else conPagina.set(chiave, { role: c.role, name: c.name, page: c.page, steps: [step] });
      } else {
        const elenco = senzaPagina.get(identita) ?? [];
        elenco.push(step);
        senzaPagina.set(identita, elenco);
      }
    }
  }

  const risultato = [...conPagina.values()];

  for (const [identita, passi] of senzaPagina) {
    const [role = '', name = ''] = identita.split('\u0000');
    const candidati = risultato.filter((r) => r.role === role && r.name === name);

    if (candidati.length === 1) {
      // Una pagina sola la conosce: e' quella, e le due occorrenze sono la
      // stessa cosa. E' il caso che falsava il conteggio per difetto.
      candidati[0]!.steps.push(...passi);
    } else if (candidati.length === 0) {
      risultato.push({ role, name, steps: [...passi] });
    } else {
      // Piu' pagine possibili: non si sceglie a caso e non si fonde tutto.
      // Resta una riga a parte, che dichiara l'incertezza invece di nasconderla.
      risultato.push({
        role,
        name,
        steps: [...passi],
        pagineAmbigue: candidati.map((c) => c.page!).filter(Boolean),
      });
    }
  }

  return risultato.sort((a, b) => b.steps.length - a.steps.length);
}

/** Quanti step del catalogo hanno almeno un componente dichiarato. Vedi diagnosi.ts. */
export function countAnchoredSteps(steps: readonly CatalogStep[]): number {
  return steps.filter((s) => (s.components?.length ?? 0) > 0).length;
}
