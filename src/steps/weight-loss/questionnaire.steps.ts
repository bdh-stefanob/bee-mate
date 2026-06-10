// src/steps/weight-loss/questionnaire.steps.ts
// Parametric step definitions covering the entire Weight Loss questionnaire flow.
//
// Design principle: the page name is always a {string} parameter.
// This replaces the CAPS-prefix convention (THE USER ON MEDICINE PREFER...)
// with a single step per interaction type, reused across all questionnaire pages.
// One step covers every single-choice question; one step covers every "with text" question.

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";

/**
 * @intent  Selects a Boots service from the popular services navigation menu.
 * @param   service  The service label (e.g. "Weight loss", "Hair loss", "Acne").
 * @page    BrochureHomePage
 * @area    weight-loss
 * @wanted
 */
When(
  "the user selects {string} from the popular services menu",
  async function (this: CustomWorld, _service: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Clicks a primary call-to-action on a service landing page.
 * @param   cta      Button label (e.g. "Get started online", "View our in store service").
 * @param   service  The service page name (e.g. "Weight Loss Treatment Service").
 * @area    weight-loss
 * @wanted
 */
When(
  "the user clicks {string} on the {string} service page",
  async function (this: CustomWorld, _cta: string, _service: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Selects the user's returning-patient status at the start of the flow.
 * @param   status  One of: "I'm New" | "I haven't been here for over 3 months" |
 *                  "I'm using Boots weight loss medicine".
 * @page    ServiceBeforePage
 * @area    weight-loss
 * @wanted
 */
When(
  "the user selects {string} as their service status",
  async function (this: CustomWorld, _status: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Selects a weight loss medicine with dosage tier and coaching option.
 * @param   medicine  Medicine name: "Wegovy" | "Mounjaro" | "Nevolat" | "Orlistat" |
 *                    "Xenical" | "Coaching Only".
 * @param   quantity  Dose string (e.g. "0.25mg", "5mg", "3 Pens"). Empty string when
 *                    the medicine has no dosing tiers.
 * @param   coaching  "with" | "without".
 * @page    MedicinePreferencePage
 * @area    weight-loss
 * @wanted
 */
When(
  "the user selects medicine {string} with quantity {string} and coaching {string}",
  async function (this: CustomWorld, _medicine: string, _quantity: string, _coaching: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Clicks continue on the medicine confirmation page.
 * @page    MedicineConfirmationPage
 * @area    weight-loss
 * @wanted
 */
When("the user confirms the medicine selection", async function (this: CustomWorld) {
  throw new Error("NOT IMPLEMENTED");
});

/**
 * @intent  Flags the mandatory consent checkbox and clicks continue.
 * @param   page  The page name (e.g. "Important Info", "GP or Bariatric Team").
 * @area    weight-loss
 * @wanted
 */
When(
  "the user flags the consent checkbox and continues on the {string} page",
  async function (this: CustomWorld, _page: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Enters height and weight with explicit unit selection.
 * @param   height      Numeric value as string (e.g. "175", "5").
 * @param   heightUnit  "cm" | "ft/in".
 * @param   weight      Numeric value as string (e.g. "80", "12").
 * @param   weightUnit  "kg" | "st/lbs".
 * @page    HeightAndWeightPage
 * @area    weight-loss
 * @wanted
 */
When(
  "the user enters height {string} in {string} and weight {string} in {string}",
  async function (this: CustomWorld, _h: string, _hu: string, _w: string, _wu: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Selects a single option on any questionnaire page and clicks next.
 *          This one step covers every single-choice question in the flow.
 * @param   option  The exact option label to select.
 * @param   page    The questionnaire page name (e.g. "Ethnic Background",
 *                  "Bariatric Surgery", "Mental Health").
 * @area    weight-loss
 * @wanted
 */
When(
  "the user selects {string} on the {string} questionnaire page",
  async function (this: CustomWorld, _option: string, _page: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Selects an option that requires additional free-text on a questionnaire page.
 * @param   option  The option label to select (triggers the text input).
 * @param   value   The free-text value to enter in the associated input field.
 * @param   page    The questionnaire page name.
 * @area    weight-loss
 * @wanted
 */
When(
  "the user selects {string} and enters {string} on the {string} questionnaire page",
  async function (this: CustomWorld, _option: string, _value: string, _page: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

/**
 * @intent  Clicks the Next button to advance from a questionnaire page.
 * @param   page  The questionnaire page name.
 * @area    weight-loss
 * @wanted
 */
When(
  "the user clicks next on the {string} questionnaire page",
  async function (this: CustomWorld, _page: string) {
    throw new Error("NOT IMPLEMENTED");
  }
);

// "the user is on the {string} page" lives in common/common.steps.ts
