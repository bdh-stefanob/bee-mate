@brochure-clinic @weightloss
Feature: Weight Loss Treatment — First Time Order
  As a registered Boots Clinic user
  I want to order a weight loss treatment service for the first time
  So that I can begin a clinically supervised weight loss journey

  @smoke @end-to-end @first-order
  Scenario: New patient completes full consultation and places a Wegovy order
    Given an existing logged-in user
    When the user selects "Weight loss" from the popular services menu
    When the user selects "Get started online" on the weight loss service page
    When the user selects "I'm New" as their service status
    When the user selects medicine "Wegovy" with quantity "0.25mg" and coaching "without"
    When the user completes the medicine confirmation
    When the user confirms the important information and continues
    When the user enters their height and weight
    When the user completes the medical history questionnaire with no pre-existing conditions
    When the user places the order choosing store pickup
    When the user verifies their identity with photo ID and selfie
    Then the system shows the order submission confirmation
    Then a secure message is sent to the user account
    Then the order is placed on PIMS with status "Awaiting ID approval"
