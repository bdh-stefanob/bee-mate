@brochure-clinic @register-new-user

Feature: Brochure Clinic Register New User

  Scenario Outline: Register a BOD account successfully with same address as billing and shipping
    Verify that, when the user from brochure homepage clicks on login button and lands on the Clinic login page, the user is able to register a new user with same address as billing and shipping and logged in the application

    #BROCHURE HOMEPAGE
    Given a user on Brochure home page
    #LOGIN
    And the user clicks on the "Login" button
    #LOGIN
    And the user lands on Clinic login page
    #REGISTER NEW USER
    When the user clicks on "Register for a Boots Online Doctor Services account" button
    #REGISTER YOUR ACCOUNT
    And the user insert the email address
    #REGISTER YOUR ACCOUNT
    And the user insert the Password
    #REGISTER YOUR ACCOUNT
    And the user confirm the Password
    #REGISTER YOUR ACCOUNT
    And the user select a security question
    #REGISTER YOUR ACCOUNT
    And the user insert the security answer
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #REGISTER YOUR ACCOUNT
    And the user insert the first name
    #REGISTER YOUR ACCOUNT
    And the user insert the last name
    #REGISTER YOUR ACCOUNT
    And the user select the birth gender
    #REGISTER YOUR ACCOUNT
    And the user insert the date of birth
    #REGISTER YOUR ACCOUNT
    And the user insert the mobile number
    #REGISTER YOUR ACCOUNT
    And the user insert the postcode
    #REGISTER YOUR ACCOUNT
    And the user insters the <address>
    #REGISTER YOUR ACCOUNT
    And the user flag the <checkbox> about billing and shipping address
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #CREATE ACCOUNT
    And the user flag the <checkbox> about Term and Conditions
    #CREATE ACCOUNT
    And the user clicks "Continue" button
    #MFA
    And the user select a radio button as autentication metod
    #MFA
    And the user clicks "Send code" button
    #MFA
    And the user insert the code received
    #MFA
    And the user clicks "Verify" button
    #LOGIN
    Then the user successfully logged in the application
    #LOGIN
    And the user lands on clinic home page

    Examples:
      | <address>                                                                                               |
      | the user clicks on the suggested address                                                                |
      | the user clicks "Can't find your address, click here to edit" and insert manually Road and City        |


  Scenario: Register a BOD account successfully with different address as billing and shipping
    Verify that, when the user from brochure homepage clicks on login button and lands on the Clinic login page, the user is able to register a new user with different address as billing and shipping and logged in the application

    #BROCHURE HOMEPAGE
    Given a user on Brochure home page
    #LOGIN
    And the user clicks on the "Login" button
    #LOGIN
    And the user lands on Clinic login page
    #REGISTER NEW USER
    When the user clicks on "Register for a Boots Online Doctor Services account" button
    #REGISTER YOUR ACCOUNT
    And the user insert the email address
    #REGISTER YOUR ACCOUNT
    And the user insert the Password
    #REGISTER YOUR ACCOUNT
    And the user confirm the Password
    #REGISTER YOUR ACCOUNT
    And the user select a security question
    #REGISTER YOUR ACCOUNT
    And the user insert the security answer
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #REGISTER YOUR ACCOUNT
    And the user insert the first name
    #REGISTER YOUR ACCOUNT
    And the user insert the last name
    #REGISTER YOUR ACCOUNT
    And the user select the birth gender
    #REGISTER YOUR ACCOUNT
    And the user insert the date of birth
    #REGISTER YOUR ACCOUNT
    And the user insert the mobile number
    #REGISTER YOUR ACCOUNT
    And the user insert the postcode
    #REGISTER YOUR ACCOUNT
    And the user insert the postcode of Billing address
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #CREATE ACCOUNT
    And the user flag the <checkbox> about Term and Conditions
    #CREATE ACCOUNT
    And the user clicks "Continue" button
    #MFA
    And the user select a radio button as autentication metod
    #MFA
    And the user clicks "Send code" button
    #MFA
    And the user insert the code received
    #MFA
    And the user clicks "Verify" button
    #LOGIN
    Then the user successfully logged in the application
    #LOGIN
    And the user lands on clinic home page


  Scenario: Register a BOD account successfully adding the address by 'Find my location' functionality
    Verify that, when the user from brochure homepage clicks on login button and lands on the Clinic login page, the user is able to register a new user through Find my location functionality and logged in the application

    #BROCHURE HOMEPAGE
    Given a user on Brochure home page
    #LOGIN
    And the user clicks on the "Login" button
    #LOGIN
    And the user lands on Clinic login page
    #REGISTER NEW USER
    When the user clicks on "Register for a Boots Online Doctor Services account" button
    #REGISTER YOUR ACCOUNT
    And the user insert the email address
    #REGISTER YOUR ACCOUNT
    And the user insert the Password
    #REGISTER YOUR ACCOUNT
    And the user confirm the Password
    #REGISTER YOUR ACCOUNT
    And the user select a security question
    #REGISTER YOUR ACCOUNT
    And the user insert the security answer
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #REGISTER YOUR ACCOUNT
    And the user insert the first name
    #REGISTER YOUR ACCOUNT
    And the user insert the last name
    #REGISTER YOUR ACCOUNT
    And the user select the birth gender
    #REGISTER YOUR ACCOUNT
    And the user insert the date of birth
    #REGISTER YOUR ACCOUNT
    And the user insert the mobile number
    #REGISTER YOUR ACCOUNT
    And the user insert the postcode through Find my location functionality
    #REGISTER YOUR ACCOUNT
    And the user flag the <checkbox> about billing and shipping address
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #CREATE ACCOUNT
    And the user flag the <checkbox> about Term and Conditions
    #CREATE ACCOUNT
    And the user clicks "Continue" button
    #MFA
    And the user select a radio button as autentication metod
    #MFA
    And the user clicks "Send code" button
    #MFA
    And the user insert the code received
    #MFA
    And the user clicks "Verify" button
    #LOGIN
    Then the user successfully logged in the application
    #LOGIN
    And the user lands on clinic home page


  Scenario: Register a BOD account successfully from a service flow
    Verify that, when the user from brochure service flow clicks on login button and lands on the Clinic login page, the user is able to register a new user and logged in the application

    #BROCHURE HOMEPAGE
    Given a user on Brochure home page
    #SERVICES MENU
    And the user selects a service
    #ORDER
    And the user starts the order
    #ORDER
    And the user is redirected to Clinic
    #ORDER
    And the user enters the postal code
    #ORDER
    And the user selects their gender
    #ORDER
    And the user enters their date of birth
    #ORDER
    And the user selects the product to order
    #ORDER
    And the user confirms they understand the important information
    #ORDER
    And the user completes all questionnaire answers
    #ORDER
    And the user uploads Selfie/ID photos
    #LOGIN
    And the user lands on the Clinic login page
    #REGISTER YOUR ACCOUNT
    And the user insert the email address
    #REGISTER YOUR ACCOUNT
    And the user insert the Password
    #REGISTER YOUR ACCOUNT
    And the user confirm the Password
    #REGISTER YOUR ACCOUNT
    And the user select a security question
    #REGISTER YOUR ACCOUNT
    And the user insert the security answer
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #REGISTER YOUR ACCOUNT
    And the user insert the first name
    #REGISTER YOUR ACCOUNT
    And the user insert the last name
    #REGISTER YOUR ACCOUNT
    And the user insert the mobile number
    #REGISTER YOUR ACCOUNT
    And the user insert the address
    #REGISTER YOUR ACCOUNT
    And the user flag the <checkbox> about billing and shipping address
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #CREATE ACCOUNT
    And the user flag the <checkbox> about Term and Conditions
    #CREATE ACCOUNT
    And the user clicks "Continue" button
    #MFA
    And the user select a radio button as autentication metod
    #MFA
    And the user clicks "Send code" button
    #MFA
    And the user insert the code received
    #MFA
    And the user clicks "Verify" button
    #LOGIN
    Then the user successfully logged in the application
    #LOGIN
    And the user lands on clinic delivery method
    #DELIVERY METHOD
    And the user chose the delivery method
    #ORDER
    And the user is able to complete the order


  Scenario Outline: Register a BOD account failure for password criteria
    Verify that, when the user from brochure homepage clicks on login button and lands on the Clinic login page, the user is unable to register a new user for password criteria not respected

    #BROCHURE HOMEPAGE
    Given a user on Brochure home page
    #LOGIN
    And the user clicks on the "Login" button
    #LOGIN
    And the user lands on Clinic login page
    #REGISTER NEW USER
    When the user clicks on "Register for a Boots Online Doctor Services account" button
    #REGISTER YOUR ACCOUNT
    And the user insert the email address
    #REGISTER YOUR ACCOUNT
    And the user <insert> and <confirm> Password
    #REGISTER YOUR ACCOUNT
    Then an error message is dysplayed
    #REGISTER YOUR ACCOUNT
    And the "Continue" button is disabled
    #REGISTER YOUR ACCOUNT
    And the user is unable to register a new user

    Examples:
      | <insert>  | <confirm> |
      | qwerty    | qwerty    |
      | qwertyui  | qwertyui  |
      | qwertyu1  | qwertyu1  |
      | qwerty11  | qwerty12  |


  Scenario Outline: Register a BOD account failure for any field (date of birth, mobile number, postcode)
    Verify that, when the user from brochure homepage clicks on login button and lands on the Clinic login page, the user is unable to register a new user for date of birth, mobile number, postcode criteria not respected

    #BROCHURE HOMEPAGE
    Given a user on Brochure home page
    #LOGIN
    And the user clicks on the "Login" button
    #LOGIN
    And the user lands on Clinic login page
    #REGISTER NEW USER
    When the user clicks on "Register for a Boots Online Doctor Services account" button
    #REGISTER YOUR ACCOUNT
    And the user insert the email address
    #REGISTER YOUR ACCOUNT
    And the user insert the Password
    #REGISTER YOUR ACCOUNT
    And the user confirm the Password
    #REGISTER YOUR ACCOUNT
    And the user select a security question
    #REGISTER YOUR ACCOUNT
    And the user insert the security answer
    #REGISTER YOUR ACCOUNT
    And the user clicks "Continue" button
    #REGISTER YOUR ACCOUNT
    And the user insert the first name
    #REGISTER YOUR ACCOUNT
    And the user insert the last name
    #REGISTER YOUR ACCOUNT
    And the user select the birth gender
    #REGISTER YOUR ACCOUNT
    And the user insert the <date of birth>, <Mobile number>, <Postcode>
    #REGISTER YOUR ACCOUNT
    Then an error message is dysplayed
    #REGISTER YOUR ACCOUNT
    And the "Continue" button is disabled
    #REGISTER YOUR ACCOUNT
    And the user is unable to register a new user

    Examples:
      | <date of birth> | <Mobile number> | <Postcode> |
      | 01/01/2011      |                 |            |
      | 01/01/1990      | 04111222333     |            |
      | 01/01/1990      | 07111222333     | 80020      |


  Scenario: Register a BOD account failure for account already exist
    Verify that, when the user from brochure homepage clicks on login button and lands on the Clinic login page, the user is unable to register a new user for account already exist

    #BROCHURE HOMEPAGE
    Given a user on Brochure home page
    #LOGIN
    And the user clicks on the "Login" button
    #LOGIN
    And the user lands on Clinic login page
    #REGISTER NEW USER
    When the user clicks on "Register for a Boots Online Doctor Services account" button
    #REGISTER YOUR ACCOUNT
    And the user insert the email address already registred
    #REGISTER YOUR ACCOUNT
    Then an error message is dysplayed
    #REGISTER YOUR ACCOUNT
    And the "Continue" button is disabled
    #REGISTER YOUR ACCOUNT
    And the user is unable to register a new user
