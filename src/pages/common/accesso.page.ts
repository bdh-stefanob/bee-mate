// src/pages/common/accesso.page.ts
// La pagina di accesso di un ambiente, cosi' come «Registra l'accesso» l'ha vista.
//
// Non e' generata per applicazione e non ha locator scritti dentro: li prende
// dal blocco `login` dell'ambiente (bdd-targets.json), cioe' da cio' che il
// tester ha fatto una volta registrando il proprio accesso. Una classe sola per
// tutti gli ambienti, e registrare di nuovo l'accesso la aggiorna senza toccare
// codice.
//
// Il prezzo, dichiarato: l'accesso registrato vive sulla macchina, come la
// sessione. Su una macchina nuova si registra una volta.

import type { Locator, Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";
import {
  expand, locatorDi, descriviLocator, type LoginRecipe, type LoginStep,
} from "../../../scripts/lib/targets";

/** Le `${VARIABILE}` di un valore che non sono definite. Mai i valori: solo i nomi. */
function variabiliMancanti(valore: string): string[] {
  return [...valore.matchAll(/\$\{([A-Z0-9_]+)\}/g)].map((m) => m[1]!).filter((v) => !process.env[v]);
}

export class AccessoPage extends BasePage {
  /** L'indirizzo dell'ambiente, assoluto: e' da li' che l'accesso comincia. */
  readonly path: string;

  constructor(
    page: Page,
    indirizzo: string,
    private readonly ricetta: LoginRecipe,
    private readonly nomeAmbiente: string
  ) {
    super(page);
    this.path = indirizzo;
  }

  private bersaglioDi(passo: LoginStep): Locator {
    return locatorDi(this.page, (passo.fill ?? passo.click)!);
  }

  /**
   * Il primo elemento dell'accesso: se si vede, non si e' ancora dentro.
   * E' anche cio' che dice "questa e' la pagina di accesso".
   */
  campoIniziale(): Locator {
    const primo = this.ricetta.steps[0];
    if (!primo) {
      throw new Error(`L'accesso registrato per "${this.nomeAmbiente}" non ha nessun passo.`);
    }
    return this.bersaglioDi(primo);
  }

  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.campoIniziale());
  }

  /** Banner di consenso e avvisi: si chiudono se ci sono, e non e' un problema se mancano. */
  async chiudiAvvisi(): Promise<void> {
    for (const avviso of this.ricetta.dismiss ?? []) {
      await this.dismissIfPresent(locatorDi(this.page, avviso));
    }
  }

  /**
   * Compila e preme, nell'ordine in cui il tester l'ha fatto.
   *
   * A differenza della sessione manuale (`scripts/session.ts`), qui un passo
   * che non riesce E' un errore: la' il tester finisce a mano nello stesso
   * browser, in un test non c'e' nessuno a finire.
   */
  async accedi(): Promise<void> {
    for (const passo of this.ricetta.steps) {
      if (passo.fill) {
        const mancanti = variabiliMancanti(passo.value ?? "");
        if (mancanti.length > 0) {
          throw new Error(
            `Per accedere a "${this.nomeAmbiente}" manca ${mancanti.join(", ")} in .env.\n` +
              `  Si compila nel Controllo, nella riga dell'ambiente (sezione Ambienti).`
          );
        }
        // Mai il valore in un messaggio: sono credenziali.
        await this.bersaglioDi(passo).fill(expand(passo.value ?? ""));
      } else if (passo.click) {
        await this.bersaglioDi(passo).click();
      }
    }
  }

  /** Come nominare, in un messaggio, cio' che si stava aspettando. */
  descrizioneCampoIniziale(): string {
    const primo = this.ricetta.steps[0];
    return primo ? descriviLocator((primo.fill ?? primo.click)!) : "?";
  }
}
