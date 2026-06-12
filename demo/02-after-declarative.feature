@brochure-clinic @weightloss
Feature: Weight Loss Treatment — First Time Order

  As a new patient
  I want to complete an online consultation and place a weight loss treatment order
  So that I can receive the appropriate medicine with clinical oversight

  @smoke @end-to-end @first-order
  Scenario: New patient completes full consultation and places a Wegovy order

    # --- Precondition ---
    Given an existing logged-in user

    # --- Service selection ---
    When the user selects "Weight loss" from the popular services menu
    When the user selects "Get started online" on the weight loss service page
    When the user selects "I'm New" as their service status

    # --- Medicine configuration ---
    When the user selects medicine "Wegovy" with quantity "0.25mg" and coaching "without"
    When the user completes the medicine confirmation
    When the user confirms the important information and continues

    # --- Medical questionnaire ---
    When the user enters their height and weight
    When the user completes the medical history questionnaire with no pre-existing conditions

    # --- Order & identity verification ---
    When the user places the order choosing store pickup
    When the user verifies their identity with photo ID and selfie

    # --- Outcomes ---
    Then the system shows the order submission confirmation
    Then a secure message is sent to the user account
    Then the order is placed on PIMS with status "Awaiting ID approval"
