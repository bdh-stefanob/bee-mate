// src/pages/clinic/foto.page.ts
// Le pagine della fotocamera (/camera/id, /camera/visit/). Scritta a mano: la
// usa la utility delle foto. La fotocamera e' finta: vedi MEDIA_FINTI.
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export type PulsanteFoto = "Open camera" | "Take Picture" | "Save" | "That's me" | "Submit";

export class FotoPage extends BasePage {
  readonly path = "/camera/";

  constructor(page: Page) {
    super(page);
  }

  /** Dopo «Place Order» la pagina delle foto arriva tardi: sul riepilogo c'e' un altro «Submit». */
  async assertLoaded(): Promise<void> {
    await this.page.waitForURL(/\/camera\//, { timeout: 90_000 });
  }

  sullaFotocamera(): boolean {
    return this.page.url().includes("/camera/");
  }

  pulsante(nome: PulsanteFoto): Locator {
    return this.page.getByRole("button", { name: nome, exact: true }).filter({ visible: true }).first();
  }
}
