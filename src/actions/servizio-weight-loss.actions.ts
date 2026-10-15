// src/actions/servizio-weight-loss.actions.ts
// Accesso del paziente e avvio del servizio Weight Loss per un paziente di
// ritorno: i passi prima del questionario. Nessun selettore: stanno nelle
// Page Object di src/pages/clinic/.
import type { Page } from "@playwright/test";
import { AccessoClinicPage } from "../pages/clinic/accesso-clinic.page";
import { ServizioWeightLossPage } from "../pages/clinic/servizio-weight-loss.page";

export async function accediAClinic(page: Page, email: string, password: string): Promise<void> {
  const accesso = new AccessoClinicPage(page);
  await accesso.apriDallaBrochure();
  await accesso.assertLoaded();
  await accesso.entra(email, password);
  await accesso.vaiAllAccount();
}

export async function avviaWeightLossDiRitorno(page: Page, dose = "7.2mg"): Promise<void> {
  const servizio = new ServizioWeightLossPage(page);
  await servizio.apri();
  await servizio.comePazienteDiRitorno();
  await servizio.scegliProdotto(dose, "Without Coaching");
  await servizio.accettaInformazioniImportanti();
}

export async function sceglieRitiroInFarmacia(page: Page): Promise<void> {
  await new ServizioWeightLossPage(page).ritiroInFarmacia();
}
