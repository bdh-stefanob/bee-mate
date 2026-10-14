@clinic @sentinella
Feature: Sentinella delle utility di clinic

  Una volta al giorno: se si accende, il passo fallito nomina la utility rotta.

  Scenario: ordine successivo di Weight Loss, da inizio a fine
    Given the patient is logged into clinic as "stefano.bertaccini+22@bootsdigitalhealth.co.uk"
    When the patient starts the weight loss service as a returning patient
    And the patient answers the questionnaire
      | domanda                         | risposta              |
      | How do you wish to proceed?     | Stay on the same dose |
      | 1. What is your current weight? | 190 / 80              |
    And the patient picks up in store near "NW1"
    And the patient pays with the saved card
    And the patient takes the photos
    Then the order is pending clinical assessment
