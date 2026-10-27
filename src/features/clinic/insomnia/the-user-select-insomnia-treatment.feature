# generato-da: bdd-generate · rigenerabile
# src/features/clinic/insomnia/the-user-select-insomnia-treatment.feature
#
# Derivato dalla sessione manuale registrata il 2026-10-27T10:22:51.095Z
# (reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-27T10-22-51-093Z.json, 200s, 7 intenti dichiarati dal tester).
#
# origine: persona
#
# I confini fra un passo e l'altro NON sono stati indovinati: sono quelli che il
# tester ha dichiarato premendo "Fine intento" mentre eseguiva il test. E' l'unico
# dato semantico dell'intera catena che non stiamo inferendo.
#
# Le frasi vanno riviste da chi ha eseguito il test: la struttura e' derivata,
# il linguaggio no.

@clinic @insomnia @generato @da-rivedere
Feature: the user select insomnia treatment

  Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.
  Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.

  Scenario: the user select insomnia treatment
    Given the user is logged in
    And the user select insomnia treatment
    When the user select i'am new
    When the user select a product
    When the user accept important info
    When th user pick up in store and selct a store with "NW1"
      | domanda | risposta |
      | Welcome to our insomnia clinic. How long have you had difficulty sleeping? How long have you had difficulty sleeping? | Less than 3 months |
      | When you have difficulty sleeping, how many hours of real sleep do you usually get, not counting the time you’re awake in bed? | Less than 7 hours |
    When the user comple the card assignemnt
    When the user check notification
    # durante questo passo si verifica: "16 Secure messages"
