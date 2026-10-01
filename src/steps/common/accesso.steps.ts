// src/steps/common/accesso.steps.ts
// Il passo di accesso, scritto una volta sola.
//
// Ogni scenario generato da una registrazione partita con una sessione salvata
// comincia con questa frase. Sta qui, e non nel file di step di ciascuno
// scenario, per la stessa ragione di verifica.steps.ts: due scenari salvati che
// definissero la stessa frase farebbero rifiutare a Cucumber di partire.

import { Given } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";
import { assicuraAccesso } from "../../actions/accesso.actions";

/**
 * @intent  L'utente e' dentro l'applicazione: con una sessione valida non fa
 *          niente, altrimenti esegue l'accesso registrato per l'ambiente.
 * @area    common
 */
Given("the user is logged in", async function (this: CustomWorld) {
  await assicuraAccesso(this.page, this.ambienteCorrente());
});
