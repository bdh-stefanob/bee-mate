# generato-da: bdd-generate · rigenerabile
# src/features/human-recharge/recharge/user-try-to-recharge-without-charge.feature
#
# Derivato dalla sessione manuale registrata il 2026-09-25T07:24:30.012Z
# (reports\recordings\humanrechargeweb-humanrecharge.up.railway.app-2026-09-25T07-24-30-011Z.json, 144s, 7 intenti dichiarati dal tester).
#
# I confini fra un passo e l'altro NON sono stati indovinati: sono quelli che il
# tester ha dichiarato premendo "Fine intento" mentre eseguiva il test. E' l'unico
# dato semantico dell'intera catena che non stiamo inferendo.
#
# Le frasi vanno riviste da chi ha eseguito il test: la struttura e' derivata,
# il linguaggio no.

@human-recharge @recharge @generato @da-rivedere
Feature: User try to recharge without charge

  Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.
  Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.

  Scenario: User try to recharge without charge
    Given The user click on the login button
    When the user insert the username
    When the user insert the password
    When the user click on the login button
    When the user land on the homepage
    Then the page shows "Good morning, StefanoHow charged are you today?YESTERDAY 50%Today?to discoverDiscover your charge 3 questions + micro-te"
    When the user clcik on the recharge button
    When the user click on the the first music
