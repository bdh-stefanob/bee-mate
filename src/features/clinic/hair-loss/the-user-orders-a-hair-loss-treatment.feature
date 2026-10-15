# generato-da: bdd-generate · rigenerabile
# src/features/clinic/hair-loss/the-user-orders-a-hair-loss-treatment.feature
#
# Derivato dalla sessione manuale registrata il 2026-10-15T08:39:43.860Z
# (reports/recordings/qa-clinic.lemonaidhealth.co.uk-2026-10-15T08-39-43-860Z.json, 345s, 12 intenti dichiarati dal tester).
#
# origine: persona
#
# I confini fra un passo e l'altro NON sono stati indovinati: sono quelli che il
# tester ha dichiarato premendo "Fine intento" mentre eseguiva il test. E' l'unico
# dato semantico dell'intera catena che non stiamo inferendo.
#
# Le frasi vanno riviste da chi ha eseguito il test: la struttura e' derivata,
# il linguaggio no.

@clinic @hair-loss @generato @da-rivedere
Feature: The user orders a hair loss treatment

  Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.
Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.

  Scenario: hair loss — sessione registrata
    Given the user log in and land on consultation history with "stefano.bertaccini+22@bootsdigitalhealth.co.uk"
When the user click on home page button
When the user start the hair loss treatment
When the user select the product with "Propecia" and "1 month" and "No-bundle"
When the user confirm the product and accept
When the user answer to the questions
  | domanda | risposta |
  | Product questionnaire test | Starting the medicine for the first time |
  | Would you like me to tell your GP about any care we provide? | No |
When the user take a selphie
When the user take the photoID
When the user submit the photo
When the user search in the map after insert the half postal code and select the store with "NW1"
When the user selct the card and confirm
When the user check the notification and the last of the page is the new one
