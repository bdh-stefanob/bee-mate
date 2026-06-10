@weight-loss @clinic
Feature: Weight Loss Service
  As a user interested in weight loss treatment
  I want to complete the consultation questionnaire and select a medicine plan
  So that I can start an appropriate and safe treatment through Boots Clinic

  @smoke @navigation
  Scenario: Navigate to Weight Loss from popular services menu
    Given the user is on the Brochure home page
    When the user selects "Weight loss" from the popular services menu
    Then the user is on the "Weight Loss Treatment Service" page

  @smoke @questionnaire-start
  Scenario: Start questionnaire as a new user
    Given the user is on the "Weight Loss Treatment Service" page
    When the user clicks "Get started online" on the "Weight Loss Treatment Service" service page
    And the user selects "I'm New" as their service status
    Then the user is on the "Medicine Preference" page

  @medicine-selection
  Scenario Outline: Select medicine, dosage and coaching plan
    Given the user is on the "Medicine Preference" page
    When the user selects medicine "<medicine>" with quantity "<quantity>" and coaching "<coaching>"
    And the user confirms the medicine selection
    Then the user is on the "Important Info" page

    Examples: GLP-1 injectable — Wegovy
      | medicine | quantity | coaching |
      | Wegovy   | 0.25mg   | with     |
      | Wegovy   | 0.25mg   | without  |
      | Wegovy   | 0.5mg    | with     |
      | Wegovy   | 0.5mg    | without  |
      | Wegovy   | 1mg      | with     |
      | Wegovy   | 1mg      | without  |
      | Wegovy   | 1.7mg    | with     |
      | Wegovy   | 1.7mg    | without  |
      | Wegovy   | 2.4mg    | with     |
      | Wegovy   | 2.4mg    | without  |

    Examples: GLP-1 injectable — Mounjaro
      | medicine | quantity | coaching |
      | Mounjaro | 2.5mg    | with     |
      | Mounjaro | 2.5mg    | without  |
      | Mounjaro | 5mg      | with     |
      | Mounjaro | 5mg      | without  |
      | Mounjaro | 7.5mg    | with     |
      | Mounjaro | 10mg     | with     |
      | Mounjaro | 12.5mg   | with     |
      | Mounjaro | 15mg     | with     |

    Examples: Other medicines and coaching
      | medicine      | quantity | coaching |
      | Nevolat       | 3 Pens   | without  |
      | Nevolat       | 5 Pens   | without  |
      | Orlistat      |          | with     |
      | Orlistat      |          | without  |
      | Xenical       |          | without  |
      | Coaching Only | 1 Month  | with     |

  @questionnaire @medical-history @smoke
  Scenario: Complete questionnaire — no pre-existing conditions (happy path)
    Given the user is on the "Height and Weight" page
    When the user enters height "175" in "cm" and weight "80" in "kg"
    And the user clicks next on the "Height and Weight" questionnaire page
    And the user selects "White including English/ Welsh/ Scottish/ Irish/ British/ European/ Roma/ Gypsy or Traveller" on the "Ethnic Background" questionnaire page
    And the user clicks next on the "Ethnic Background" questionnaire page
    And the user selects "No, I'm new to weight loss treatment" on the "Current Medicines" questionnaire page
    And the user clicks next on the "Current Medicines" questionnaire page
    And the user selects "No" on the "Bariatric Surgery" questionnaire page
    And the user clicks next on the "Bariatric Surgery" questionnaire page
    And the user flags the consent checkbox and continues on the "GP or Bariatric Team" page
    And the user selects "None of the above" on the "Bowel and Gut Conditions" questionnaire page
    And the user clicks next on the "Bowel and Gut Conditions" questionnaire page
    And the user selects "None of the above" on the "Hormone Conditions" questionnaire page
    And the user clicks next on the "Hormone Conditions" questionnaire page
    And the user selects "No, I've never been told I have diabetes" on the "Diabetes" questionnaire page
    And the user clicks next on the "Diabetes" questionnaire page
    And the user selects "None of the above" on the "Any of the Following" questionnaire page
    And the user clicks next on the "Any of the Following" questionnaire page
    And the user selects "None of the above" on the "Clotting Conditions" questionnaire page
    And the user clicks next on the "Clotting Conditions" questionnaire page
    And the user selects "None of the above" on the "Gallstones, Gallbladder or Bile" questionnaire page
    And the user clicks next on the "Gallstones, Gallbladder or Bile" questionnaire page
    And the user selects "No" on the "Cancer" questionnaire page
    And the user clicks next on the "Cancer" questionnaire page
    And the user selects "I don't have any mental health conditions" on the "Mental Health" questionnaire page
    And the user clicks next on the "Mental Health" questionnaire page
    Then the user is on the "Summary" page
