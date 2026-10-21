# generato-da: bdd-generate · rigenerabile
# src/features/clinic/jet-lag/the-user-complete-a-jet-lag-service.feature
#
# Derivato dalla sessione manuale registrata il 2026-10-21T12:55:02.374Z
# (reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-21T12-55-02-371Z.json, 409s, 11 intenti dichiarati dal tester).
#
# origine: persona
#
# I confini fra un passo e l'altro NON sono stati indovinati: sono quelli che il
# tester ha dichiarato premendo "Fine intento" mentre eseguiva il test. E' l'unico
# dato semantico dell'intera catena che non stiamo inferendo.
#
# Le frasi vanno riviste da chi ha eseguito il test: la struttura e' derivata,
# il linguaggio no.

@clinic @jet-lag @generato @da-rivedere
Feature: the user complete a jet lag service

  Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.
  Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.

  Scenario: the user complete a jet lag service
    Given the user is logged in
    And the user log in with username and password with "stefano.bertaccini+qa2@bootsdigitalhealth.co.uk"
    When the user click on Boots title and land on main page
    When the user select Jet-Lag service
    When the user select and confirm the propduct
    When the user accept important info
    When the user complete the questionarie
      | domanda | risposta |
      | Parent Q1 | Answer 1 (wizard copy 1) - normal |
      | GP Address | No |
    When the user click No on gp
    When the user click on pick up in store
    When the user insert the store cap and select it on the map with "WD172TR"
    When the user select a card on his list and confrm the payment
    When the user see the new notification and check it
    # durante questo passo si verifica: "Secure messages"
