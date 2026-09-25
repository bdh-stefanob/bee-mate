/**
 * i18n-diagnosi.ts
 * ----------------
 * Il dizionario di `diagnosi.ts`: una chiave per ogni frase che l'uscita a
 * terminale puo' stampare, in italiano e in inglese.
 *
 * Le chiavi seguono lo schema `diagnosi.<voce>.<caso>`, lo stesso che usa
 * l'uscita JSON (`diagnosi.ts json`) per `chiaveNome` e `chiaveDettaglio`.
 * L'elenco completo, con i dati che ciascuna porta, e' documentato in
 * `.superpowers/sdd/2026-09-22-cruscotto-tester/contratto-lingue.md`: quel
 * file e' l'autorita', questo ne e' l'implementazione.
 *
 * `check:i18n` (vedi `i18n.check.ts`) fallisce se una chiave sta di qua e non
 * di la', o se sta nel dizionario e nessuno script la usa piu'.
 */

import type { DizionarioScript } from "./i18n";

export const dizionarioDiagnosi: DizionarioScript = {
  it: {
    // Nomi delle voci
    "diagnosi.browser.nome": "Browser di Playwright",
    "diagnosi.assistente.nome": "Assistente da riga di comando",
    "diagnosi.agenti.nome": "Agenti e automatismi",
    "diagnosi.ambienti.nome": "Ambienti",
    "diagnosi.dizionari.nome": "Dizionari dei componenti",
    "diagnosi.registrazioni.nome": "Registrazioni",
    "diagnosi.catalogo.nome": "Catalogo",

    // Browser
    "diagnosi.browser.scaricato": "scaricato",
    "diagnosi.browser.assente": "non scaricato — `npm install` installa il pacchetto, non i binari",
    "diagnosi.browser.ripiego": "si ripiega da solo su Chrome o Edge di sistema, se ci sono",

    // Assistente
    "diagnosi.assistente.trovato": "sul PATH: {strumenti}",
    "diagnosi.assistente.spiegazione": "serve solo a rendere il confronto ripetibile da script: l'IDE basta",
    "diagnosi.assistente.assente": "nessuno sul PATH — non e' un problema",
    "diagnosi.assistente.misura":
      "la misura legge file e li giudica con tsc e il dry-run: gli stessi file danno gli stessi numeri, che ci arrivi uno script o una persona",

    // Agenti e automatismi
    "diagnosi.agenti.trovati": "{agenti} agenti, {hook} file di hook",
    "diagnosi.agenti.spiegazione": "che l'IDE li riconosca va guardato nei suoi pannelli: da qui non si vede",
    "diagnosi.agenti.assenti": "non generati",

    // Ambienti
    "diagnosi.ambienti.nessuno": "nessun ambiente configurato — e' da qui che parte tutto",
    "diagnosi.ambienti.nessunoUtilizzabile":
      "{totale} configurati, ma nessuno e' ancora utilizzabile: manca un indirizzo o una credenziale",
    "diagnosi.ambienti.pronti": "{pronti} su {totale} pronti",
    "diagnosi.ambienti.accessoNonRegistrato": "{pronti} su {totale} configurati — accesso non ancora registrato",
    "diagnosi.ambienti.daCompletare": "{daCompletare} da completare quando serve",
    "diagnosi.ambienti.conSessione": "{conSessione} con sessione salvata",
    "diagnosi.ambienti.conSessioneVecchie":
      "{conSessione} con sessione salvata, di cui {vecchie} piu' vecchie di 12 ore",

    // Dizionari dei componenti
    "diagnosi.dizionari.inventariate": "{pagine} pagine inventariate",
    "diagnosi.dizionari.nessuno": "nessuno: senza, i locator vengono sintetizzati alla cieca",

    // Registrazioni
    "diagnosi.registrazioni.nessuna": "nessuna: e' da qui che parte tutto",
    "diagnosi.registrazioni.senzaPagina": "{totale}, ma nessuna riporta la pagina di ogni gesto",
    "diagnosi.registrazioni.conPagina": "{totale}, di cui {conUrl} con l'attribuzione per pagina",

    // Catalogo
    "diagnosi.catalogo.assente": "assente",
    "diagnosi.catalogo.riepilogo": "{steps} step, {ancorati} ancorati a componenti di frontend",
    "diagnosi.catalogo.nessunAncoraggio": "nessun ancoraggio: la rosa dei candidati si reggera' solo sul lessico",

    // Intestazione e chiusura del referto
    "diagnosi.intestazione": "DIAGNOSI — questa macchina",
    "diagnosi.prossimaCosa.titolo": "LA PROSSIMA COSA DA FARE",
    "diagnosi.prossimaCosa.motivo": "perche': {titolo} — {dettaglio}",
    "diagnosi.prossimaCosa.restano": "poi restano {n}:",
    "diagnosi.tuttoApposto.titolo": "Niente da sistemare. Il giro completo:",
    "diagnosi.tuttoApposto.scout": "npm run scout:pausa <url>        inventaria una pagina di lavoro vera",
    "diagnosi.tuttoApposto.record": "npm run record      <url>        esegui il test a mano",
    "diagnosi.tuttoApposto.generate": "npm run generate                 feature + Page Object + step",
    "diagnosi.tuttoApposto.benchmark": "npm run benchmark label=deterministico referto=referto.json",
    "diagnosi.nota":
      "Il referto e la diagnosi non contengono dati aziendali. Il resto di\n  reports/ si', e resta su questa macchina.",
  },
  en: {
    // Section names
    "diagnosi.browser.nome": "Playwright browsers",
    "diagnosi.assistente.nome": "Command-line assistant",
    "diagnosi.agenti.nome": "Agents and automations",
    "diagnosi.ambienti.nome": "Environments",
    "diagnosi.dizionari.nome": "Component dictionaries",
    "diagnosi.registrazioni.nome": "Recordings",
    "diagnosi.catalogo.nome": "Catalog",

    // Browser
    "diagnosi.browser.scaricato": "downloaded",
    "diagnosi.browser.assente": "not downloaded — `npm install` installs the package, not the binaries",
    "diagnosi.browser.ripiego": "falls back on the system's Chrome or Edge, if there is one",

    // Assistant
    "diagnosi.assistente.trovato": "on PATH: {strumenti}",
    "diagnosi.assistente.spiegazione": "only makes comparisons repeatable from a script: the IDE is enough on its own",
    "diagnosi.assistente.assente": "none on PATH — not a problem",
    "diagnosi.assistente.misura":
      "the measure reads files and judges them with tsc and the dry-run: the same files give the same numbers, whether a script or a person runs it",

    // Agents and automations
    "diagnosi.agenti.trovati": "{agenti} agents, {hook} hook files",
    "diagnosi.agenti.spiegazione": "whether the IDE recognizes them has to be checked in its own panels — not visible from here",
    "diagnosi.agenti.assenti": "not generated",

    // Environments
    "diagnosi.ambienti.nessuno": "no environment configured — this is where everything starts",
    "diagnosi.ambienti.nessunoUtilizzabile":
      "{totale} configured, but none is usable yet: missing an address or a credential",
    "diagnosi.ambienti.pronti": "{pronti} of {totale} ready",
    "diagnosi.ambienti.accessoNonRegistrato": "{pronti} of {totale} configured — sign-in not recorded yet",
    "diagnosi.ambienti.daCompletare": "{daCompletare} to complete when needed",
    "diagnosi.ambienti.conSessione": "{conSessione} with a saved session",
    "diagnosi.ambienti.conSessioneVecchie":
      "{conSessione} with a saved session, {vecchie} of which older than 12 hours",

    // Component dictionaries
    "diagnosi.dizionari.inventariate": "{pagine} pages inventoried",
    "diagnosi.dizionari.nessuno": "none: without one, locators are synthesized blind",

    // Recordings
    "diagnosi.registrazioni.nessuna": "none: this is where everything starts",
    "diagnosi.registrazioni.senzaPagina": "{totale}, but none records the page for each gesture",
    "diagnosi.registrazioni.conPagina": "{totale}, {conUrl} of which attributed per page",

    // Catalog
    "diagnosi.catalogo.assente": "missing",
    "diagnosi.catalogo.riepilogo": "{steps} steps, {ancorati} anchored to frontend components",
    "diagnosi.catalogo.nessunAncoraggio": "no anchoring: the candidate shortlist will rest on wording alone",

    // Report header and footer
    "diagnosi.intestazione": "DIAGNOSIS — this machine",
    "diagnosi.prossimaCosa.titolo": "THE NEXT THING TO DO",
    "diagnosi.prossimaCosa.motivo": "why: {titolo} — {dettaglio}",
    "diagnosi.prossimaCosa.restano": "then {n} remain:",
    "diagnosi.tuttoApposto.titolo": "Nothing to fix. The full loop:",
    "diagnosi.tuttoApposto.scout": "npm run scout:pausa <url>        inventory a real working page",
    "diagnosi.tuttoApposto.record": "npm run record      <url>        run the test by hand",
    "diagnosi.tuttoApposto.generate": "npm run generate                 feature + Page Object + steps",
    "diagnosi.tuttoApposto.benchmark": "npm run benchmark label=deterministic referto=referto.json",
    "diagnosi.nota":
      "The report and the diagnosis contain no company data. The rest of\n  reports/ does, and stays on this machine.",
  },
};
