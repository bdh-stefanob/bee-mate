// src/steps/clinic/sentinelle/sentinelle.steps.ts
// La sentinella delle utility di clinic: glue sottile, ogni step chiama una
// utility. Se si accende, il passo fallito nomina la utility rotta.
import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import {
  accediAClinic,
  avviaWeightLossDiRitorno,
  sceglieRitiroInFarmacia,
} from "../../../actions/servizio-weight-loss.actions";
import { rispondiQuestionario } from "../../../actions/questionario.actions";
import { scegliFarmacia } from "../../../actions/farmacia.actions";
import { paga } from "../../../actions/pagamento.actions";
import { scattaFoto } from "../../../actions/foto.actions";

/**
 * @intent  Accede a clinic come paziente, dalla brochure.
 * @param   email L'utenza; la password viene dall'ambiente.
 */
Given("the patient is logged into clinic as {string}", async function (this: CustomWorld, email: string) {
  await accediAClinic(this.page, email, this.passwordAmbiente());
});

/** @intent Avvia Weight Loss come paziente di ritorno, fino al questionario. */
When("the patient starts the weight loss service as a returning patient", async function (this: CustomWorld) {
  await avviaWeightLossDiRitorno(this.page);
});

/** @intent Risponde al questionario dalla tabella; le domande non elencate ricevono «No». */
When("the patient answers the questionnaire", async function (this: CustomWorld, tabella: DataTable) {
  await rispondiQuestionario(this.page, tabella.raw());
});

/** @intent Sceglie il ritiro in farmacia e la prima farmacia vicino al CAP. */
When("the patient picks up in store near {string}", async function (this: CustomWorld, cap: string) {
  await sceglieRitiroInFarmacia(this.page);
  await scegliFarmacia(this.page, cap);
});

/** @intent Paga con la carta salvata e conferma l'ordine. */
When("the patient pays with the saved card", async function (this: CustomWorld) {
  await paga(this.page);
});

/** @intent Scatta tutte le foto che la pagina chiede. */
When("the patient takes the photos", async function (this: CustomWorld) {
  await scattaFoto(this.page);
});

/** @intent L'ordine e' inviato e in attesa della valutazione clinica. */
Then("the order is pending clinical assessment", async function (this: CustomWorld) {
  await this.expectTextVisible("Clinical assessment Pending");
});
