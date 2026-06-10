@brochure-clinic @auth
Feature: Clinic Login from Brochure
  As a registered Clinic user arriving from the Boots Brochure site
  I want to log in to my Clinic account using SMS two-factor authentication
  So that I can access my health services securely

  @smoke @sms-login
  Scenario: Successful SMS login without remembering the device
    Given the user is on the Brochure home page
    When the user clicks the Login button
    And the user enters valid login credentials on the "Clinic login" page
    And the user completes SMS verification
    Then the user is successfully logged in
    And the user is on the "My Account" page
