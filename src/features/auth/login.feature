@auth
Feature: Authentication

  Scenario: User logs in with valid credentials
    Given I am a registered user
    When I log in with valid credentials
    Then I land on my dashboard

  Scenario Outline: User logs in with different roles
    Given I am a registered user with role "<role>"
    When I log in with valid credentials
    Then I land on my dashboard

    Examples:
      | role    |
      | admin   |
      | standard|
