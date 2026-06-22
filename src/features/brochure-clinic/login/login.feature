@brochure-clinic @login

Feature: Brochure Clinic Login

  Scenario Outline: Login successful authenticating by SMS/EMAIL without flag the checkbox "remember this device"
    Verify that, when a registered user on the brochure homepage clicks on login button and lands on the Clinic login page and enters valid credentials, the user is able to log in and authenticate through SMS/EMAIL

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #LOGIN
    When the user clicks on the Login button
    #LOGIN
    And the user lands on the Clinic login page
    #LOGIN
    And the user enters a valid email address
    #LOGIN
    And the user enters a valid password
    #LOGIN
    And the user clicks on the login button
    #MFA
    And the user flags the <checkbox>
    #MFA
    And the user clicks on Send code
    #MFA
    And the user inserts the received code
    #MFA
    And the user clicks the verify button
    #LOGIN
    Then the user successfully logs in
    #LOGIN
    And the user is redirected on My account page
    Examples:
      | <checkbox> |
      | SMS        |
      | EMAIL      |


  Scenario Outline: Re-login successful without MFA after authentication by SMS/EMAIL with option 'Remember this device'
    Verify that, when a registered user that previously logged and flagged the checkbox 'Remember this device', try to re-login from the brochure homepage, the system doesn't performs the MFA and allows the login.

    #MFA
    Given a registered user previously logged in with MFA by <authentication method>
    #MFA
    And the user previously flagged the 'Remember this device' option
    #BROCHURE HOMEPAGE
    And the user is on brochure homepage
    #LOGIN
    When the user in order to re-login clicks on the Login button
    #LOGIN
    And the user lands on the Clinic login page
    #LOGIN
    And the user enters a valid email address
    #LOGIN
    And the user enters a valid password
    #LOGIN
    And the user clicks on the Login button
    #LOGIN
    Then the user successfully logs in
    #LOGIN
    And the user is redirected on My account page
    Examples:
      | <authentication method> |
      | SMS                     |
      | EMAIL                   |

  Scenario: Login in Clinic after 90 days from flagged 'Remember this device'
    Verify that, when the user logins in Clinic after 90 days from he's flagged the option 'Remember this device', the system shows again the MFA screen where he can proceed with the authentication and then login

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #MFA
    And the user 90 days ago flagged the option 'Remember this device'
    #LOGIN
    And the user inserted valid credentials to login
    #LOGIN
    When the user clicks on the Login button
    #MFA
    Then the system shows the screen to perform the MFA
    #MFA
    And the user is able to login after the authentication


  Scenario Outline: Login in Clinic failed due to incorrect credentials
    Verify that, when the user tries to login in Clinic and enters invalid credentials, the system doesn't allow the login and shows an error UI message

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #LOGIN
    When the user clicks on the Login button
    #LOGIN
    And the user lands on the Clinic login page
    #LOGIN
    And the user enters <invalid credentials>
    #LOGIN
    And the user clicks on the login button
    #LOGIN FAILURE
    Then the system displays an error message
    #LOGIN FAILURE
    And the user isn't able to login
    Examples:
      | <invalid credentials>           |
      | invalid EMAIL, valid Password   |
      | valid EMAIL, invalid Password   |
      | invalid EMAIL, invalid Password |


  Scenario: Login in Clinic with MFA from 'Register new user' flow
    Verify that, if a user landed on the 'Register new user' screen clicks on login button and enters valid credentials and authenticate, is able to login in Clinic

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #REGISTER NEW USER
    And the user landed on 'Register for a Boots Online Doctor Services account'
    #LOGIN
    When the user clicks on the Login link at the bottom of the screen
    #LOGIN
    And the user enters a valid email address
    #LOGIN
    And the user enters a valid password
    #LOGIN
    And the user clicks on the login button
    #MFA
    And the user flags the authentication method
    #MFA
    And the user clicks on Send code
    #MFA
    And the user inserts the received code
    #MFA
    And the user clicks the verify button
    #LOGIN
    Then the user successfully logs in
    #LOGIN
    And the user is redirected on My account page

  Scenario Outline: MFA from 'Didn't get the code' flow
    Verify that, when a registered user tries to login with valid credentials and asks for the MFA code and after 10 seconds clicks on 'Didn't get the code' link, the user is able to log in and authenticate through SMS/EMAIL

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #LOGIN
    And the user inserted credentials to login
    #MFA
    And the user flagged the authentication method
    #MFA
    And the user is waiting for the code
    #LOGIN
    When the user after 10 seconds clicks on 'Didn't get the code'
    #MFA
    And the user flags the <checkbox>
    #MFA
    And the user clicks on Send code
    #MFA
    And the user inserts the received code
    #MFA
    And the user clicks the verify button
    #LOGIN
    Then the user successfully logs in
    #LOGIN
    And the user is redirected on My account page
    Examples:
      | <checkbox> |
      | SMS        |
      | EMAIL      |


  Scenario: Login in Clinic with MFA from a service flow
    Verify that, when a user starts a consultation and completes the questionnaire, is then able to login in Clinic and authenticate to complete the order

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #SERVICES MENU
    And the user selected a service
    #ORDER
    And the user started the consultation
    #ORDER
    And the user entered all personal info
    #ORDER
    And the user selected the product to order
    #ORDER
    And the user confirmed he understand the important information
    #ORDER
    And the user completeed all questionnaire answers
    #ORDER
    And the user uploaded the Selfie/ID photos
    #ORDER
    When the user submits the photos screen
    #LOGIN
    And the system redirects the user on the Clinic login page
    #LOGIN
    And the user enters a valid email address
    #LOGIN
    And the user enters a valid password
    #LOGIN
    And the user clicks on the login button
    #MFA
    And the user flags the authentication method
    #MFA
    And the user clicks on Send code
    #MFA
    And the user inserts the received code
    #MFA
    And the user clicks the verify button
    #LOGIN
    Then the user successfully logs in
    #ORDER
    And the system retains the selected journey
    #ORDER
    And the user can select the delivery method
    #ORDER
    And the user can complete the order


  Scenario: Clinic account locked due to incorrect password 6 consecutive times
    Verify that, when a registered user tries to login in Clinic 6 consecutive times entering each time an incorrect password, the system locks the account and forces the user to reset the password

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #LOGIN
    When the user clicks on the Login button
    #LOGIN
    And the user lands on the Clinic login page
    #LOGIN
    And the user enters a valid email address
    #LOGIN
    And the user enters 6 consecutive times an invalid password
    #LOCKED ACCOUNT
    Then the system locks the account
    #LOCKED ACCOUNT
    And the system shows an error message with a link
    #LOCKED ACCOUNT
    And the user is redirect to the 'Forgot password' flow


  Scenario: Clinic account locked due to incorrect MFA code 6 consecutive times
    Verify that, when a registered user tries to login in Clinic and inserts 6 consecutive times an incorrect MFA code, the system locks the account and forces the user to reset the password

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #LOGIN
    And the user inserted credentials to login
    #MFA
    And the user flagged the authentication method
    #MFA
    And the user is waiting for the code
    #MFA
    When the user inserts 6 consecutive times an incorrect code
    #LOCKED ACCOUNT
    Then the system locks the account
    #LOCKED ACCOUNT
    And the system shows an error message with a link
    #LOCKED ACCOUNT
    And the user needs to follow the 'Forgot password' flow

  Scenario: Clinic account locked due to 5 requests to send OTP code for MFA
    Verify that, when a registered user tries to login in Clinic and requires 5 consecutive times to send the OTP code for MFA, the system locks the account and forces the user to reset the password

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #LOGIN
    And the user inserted credentials to login
    #MFA
    And the user flagged the authentication method
    #MFA
    When the user requests 5 consecutive times to send the MFA code
    #LOCKED ACCOUNT
    Then the system locks the account
    #LOCKED ACCOUNT
    And the system shows an error message with a link
    #LOCKED ACCOUNT
    And the user needs to follow the 'Forgot password' flow

  Scenario: MFA failed due to expired authentication code
    Verify that, when the user logs in Clinic and insert the MFA code after 10 minutes from receipt, the system doesn't allow the authentication and the user needs to login again and ask for a new code

    #BROCHURE HOMEPAGE
    Given a registered user landed on the Brochure home page
    #LOGIN
    And the user inserted credentials to login
    #MFA
    And the user flagged the authentication method
    #MFA
    And the user received the code
    #MFA
    When the user inserts after 10 minutes from receipt
    #MFA
    Then the system doesn't authenticate the login
    #MFA
    And the system shows an error message with a link
    #LOGIN
    And the user needs to login again and authenticate with a new code
