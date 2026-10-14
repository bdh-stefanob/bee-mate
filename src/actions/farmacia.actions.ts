// src/actions/farmacia.actions.ts
// Cerca un CAP e sceglie la prima farmacia sulla mappa (POC, JetLagDeliveryPage).
import type { Page } from "@playwright/test";
import { FarmaciaPage } from "../pages/clinic/farmacia.page";
import { sceltaSuMappa } from "./mappa.actions";

export async function scegliFarmacia(page: Page, cap: string): Promise<void> {
  const farmacia = new FarmaciaPage(page);
  await farmacia.assertLoaded();
  await farmacia.cerca(cap);
  await sceltaSuMappa(page);
  await farmacia.confermaFarmacia();
}
