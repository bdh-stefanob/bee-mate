// src/support/base.page.ts
// LA BASE DA CUI SI GENERA.
//
// Ogni Page Object — scritta a mano o generata — estende questa classe. Non e'
// un contenitore di comodita': e' il contratto che permette di generare codice
// senza che chi lo genera debba decidere niente di architetturale.
//
// COSA IMPONE, E PERCHE' OGNI VINCOLO ESISTE
//
// 1. `page` arriva dal costruttore. Mai singleton, mai getInstance(), mai cache
//    statiche. E' una decisione presa dopo averne misurato il danno: l'istanza
//    statica sopravviveva fra scenari nello stesso worker e trascinava stato
//    sporco in quello successivo. Il World di Cucumber viene ricreato a ogni
//    scenario, ed e' li' che lo stato deve vivere.
//
// 2. `assertLoaded()` e' astratto, quindi obbligatorio. Una Page Object che non
//    sa dire "sono davvero io" produce fallimenti che puntano al posto sbagliato:
//    il test cade sul primo click, e sembra un problema del click.
//
// 3. `path` e' astratto. Renderlo obbligatorio costringe a decidere se la pagina
//    ha un indirizzo proprio (e allora si puo' raggiungere direttamente) o no
//    (stringa vuota: ci si arriva solo navigando). E' informazione che serve al
//    generatore, e che a memoria si dimentica di scrivere.
//
// Il resto — attese, sonde non lancianti — sta qui perche' scritto male una volta
// verrebbe ricopiato ovunque.

import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Quanto si aspetta che una pagina mostri cio' che la riconosce.
 *
 * Era 10 secondi fissi. Sull'ambiente QA vero (2026-10-13) una pagina dopo
 * l'accesso ne impiega anche piu' di dieci a riempirsi: lo scenario falliva su
 * un'attesa, non su un difetto. Aspettare di piu' non costa niente quando la
 * pagina arriva; costa solo quando manca davvero. `BDD_ATTESA_PAGINA` (in
 * millisecondi) la cambia senza toccare il codice.
 */
const ATTESA_PAGINA_MS = Number(process.env["BDD_ATTESA_PAGINA"] ?? 30_000);

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Il percorso della pagina, relativo alla baseURL. Stringa vuota se la pagina
   * non e' raggiungibile direttamente: in quel caso `navigate()` lo dice invece
   * di aprire silenziosamente la home.
   */
  abstract readonly path: string;

  /**
   * Verifica che questa sia davvero la pagina attesa, prima di interagirci.
   * Obbligatoria: vedi il punto 2 in testa al file.
   */
  abstract assertLoaded(): Promise<void>;

  async navigate(): Promise<void> {
    if (!this.path) {
      throw new Error(
        `${this.constructor.name} non ha un percorso proprio: ci si arriva solo ` +
          `navigando da un'altra pagina. Usa il metodo che compie quella transizione.`
      );
    }
    await this.page.goto(this.path);
    await this.assertLoaded();
  }

  /**
   * Sonda se un elemento compare entro un tempo, **senza far fallire il test**.
   *
   * Esiste perche' l'alternativa e' un try/catch riscritto a mano ogni volta,
   * e perche' l'errore vicino — `isVisible({ timeout })` — non aspetta affatto:
   * legge lo stato nell'istante in cui viene chiamato e il timeout riguarda solo
   * la risoluzione del locator. Su una SPA questo produce test che passano sulla
   * macchina veloce e falliscono in CI.
   */
  protected async isVisibleWithin(locator: Locator, ms = 5000): Promise<boolean> {
    return locator
      .waitFor({ state: "visible", timeout: ms })
      .then(() => true)
      .catch(() => false);
  }

  /** Attesa corretta: aspetta che diventi visibile, e fallisce se non succede. */
  protected async waitVisible(locator: Locator, ms = 10_000): Promise<void> {
    await locator.waitFor({ state: "visible", timeout: ms });
  }

  /**
   * L'asserzione che usa `assertLoaded()`. Passa per `expect` di Playwright, che
   * riprova finche' non scade: `toBeVisible()` su un locator e' un'asserzione
   * che aspetta, a differenza di una lettura di stato.
   */
  protected async expectVisible(locator: Locator, ms = ATTESA_PAGINA_MS): Promise<void> {
    // UNA PAGINA FERMA SOTTO IL VELO DI CARICAMENTO SI RICARICA, UNA VOLTA.
    //
    // Sull'ambiente QA vero (2026-10-13) una pagina su tre restava sotto il velo
    // di caricamento oltre mezzo minuto, e ricaricandola arrivava subito: non e'
    // lentezza, e' un caricamento che non finisce.
    //
    // SOLO SE IL VELO SI VEDE, e solo se l'ambiente dice qual e' (`BDD_VELO`, un
    // selettore CSS). La prima versione ricaricava ogni pagina in ritardo, e ha
    // fatto danno alla prima prova: una pagina che aspettava soltanto il passaggio
    // alla successiva e' stata ricaricata, e la risposta appena data e' sparita.
    // Ricaricare e' sicuro solo quando la pagina dichiara di non avere finito.
    const velo = process.env["BDD_VELO"];
    try {
      if (velo) {
        const arrivata = await expect(locator)
          .toBeVisible({ timeout: ms / 2 })
          .then(() => true, () => false);
        if (arrivata) return;
        const fermaSulVelo = await this.page.locator(velo).first().isVisible().catch(() => false);
        if (fermaSulVelo) await this.page.reload().catch(() => undefined);
        await expect(locator).toBeVisible({ timeout: ms / 2 });
        return;
      }
      await expect(locator).toBeVisible({ timeout: ms });
    } catch (err) {
      // DOVE SI E' FINITI, NON SOLO COSA MANCAVA.
      //
      // "element(s) not found" e' vero e inutile: manda a cercare il locator,
      // che spesso e' giusto. Sull'applicazione vera il motivo era un altro —
      // dopo il login si finiva su una pagina diversa da quella attesa — e
      // l'indirizzo lo diceva in un colpo d'occhio. Un fallimento che nomina il
      // posto sbagliato fa perdere piu' tempo di uno che tace.
      const dove = this.page.url();
      const atteso = this.path ? `${this.constructor.name} (${this.path})` : this.constructor.name;
      throw new Error(
        `${(err as Error).message}\n\n` +
          `  Pagina attesa : ${atteso}\n` +
          `  Indirizzo ora : ${dove}\n` +
          `  Se l'indirizzo non e' quello atteso, il locator non c'entra: il\n` +
          `  percorso e' cambiato prima di arrivare qui.`
      );
    }
  }

  /**
   * Spunta una casella o sceglie un'opzione, anche quando quella vera e' nascosta.
   *
   * IL CASO (ambiente QA, 2026-10-13). Molte applicazioni disegnano la propria
   * casella e tengono quella nativa fuori dallo schermo: `getByRole('checkbox')`
   * la trova — e' lei a portare il nome accessibile — ma `.check()` non puo'
   * cliccarla e aspetta trenta secondi un elemento "fuori dall'area visibile".
   * Una persona clicca il disegno; il clic sull'elemento nativo fa la stessa
   * cosa per l'applicazione (parte lo stesso evento, il modello si aggiorna).
   *
   * Prima si prova il modo normale, con poca pazienza: dove la casella e' una
   * casella vera, niente cambia.
   */
  protected async spunta(locator: Locator): Promise<void> {
    const normale = await locator.check({ timeout: 3000 }).then(() => true, () => false);
    if (normale) return;
    await locator.evaluate((el) => {
      const casella = el as HTMLInputElement;
      if (!casella.checked) casella.click();
    });
    await expect(locator).toBeChecked({ timeout: 5000 });
  }

  /**
   * Chiude un elemento **se c'e'**, senza pretendere che ci sia.
   *
   * Serve ai banner di consenso e agli avvisi: comparsi, intercettano i click e
   * fanno fallire tutto; assenti, non sono un problema. Trattarli come passo
   * obbligatorio rende i test fragili nella direzione opposta.
   */
  protected async dismissIfPresent(locator: Locator, ms = 3000): Promise<boolean> {
    if (!(await this.isVisibleWithin(locator, ms))) return false;
    await locator.click();
    return true;
  }

  /**
   * Il clic giusto per un componente senza ruolo ne' nome accessibile (un pin
   * di mappa, una cosa disegnata): vedi `componenteSenzaRuolo` in
   * `scripts/lib/component-naming.ts`, che e' da dove ogni Page Object generata
   * arriva a chiamare questo metodo.
   *
   * PERCHE' NON `.click()`. Su una libreria di mappe vera un pin non e' un
   * elemento isolato: un livello trasparente sopra la mappa intercetta i
   * puntatori e decide lui quale pin e' stato colpito (e' cosi' che si fa un
   * "hit test" su un canvas o su tile ridisegnate). Un `locator.click()` fa il
   * controllo di raggiungibilita' di Playwright PRIMA di cliccare, vede quel
   * livello sopra il pin e fallisce con "element intercepts pointer events" —
   * mai arrivando a cliccare. Un clic col mouse vero, a coordinate, non fa
   * quel controllo: arriva dove deve arrivare, come arriverebbe il clic di una
   * persona.
   *
   * Si porta l'elemento in vista e si forza un `resize` prima di leggere il suo
   * rettangolo: molte librerie di mappe calcolano l'area che disegnano una sola
   * volta, alla creazione, e non si accorgono da sole che il contenitore e'
   * cambiato — serve lo stesso segnale che manderebbe un ridimensionamento
   * vero della finestra perche' ridisegnino.
   *
   * Fallisce parlando: un locator lasciato scadere per trenta secondi non dice
   * niente di utile su un elemento che non ha ne' ruolo ne' nome.
   */
  protected async clickSenzaAncoraggio(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await this.page.evaluate(() => window.dispatchEvent(new Event("resize")));
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error(
        `${this.constructor.name}: l'elemento non e' sulla pagina. Non ha ne' ruolo ne' ` +
          `nome accessibile (e' ancorato solo a un selettore CSS): non c'e' niente su cui ` +
          `aspettare, quindi non si aspetta trenta secondi un locator che non comparira'.`
      );
    }
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
}
