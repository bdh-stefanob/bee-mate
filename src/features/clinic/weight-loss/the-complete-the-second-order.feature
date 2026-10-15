# generato-da: bdd-generate · rigenerabile
# src/features/clinic/weight-loss/the-complete-the-second-order.feature
#
# Derivato dalla sessione manuale registrata il 2026-10-14T09:14:05.714Z
# (reports/recordings/qa-clinic.lemonaidhealth.co.uk-2026-10-14T09-14-05-713Z.json, 500s, 16 intenti dichiarati dal tester).
#
# origine: persona
#
# I confini fra un passo e l'altro NON sono stati indovinati: sono quelli che il
# tester ha dichiarato premendo "Fine intento" mentre eseguiva il test. E' l'unico
# dato semantico dell'intera catena che non stiamo inferendo.
#
# Le frasi vanno riviste da chi ha eseguito il test: la struttura e' derivata,
# il linguaggio no.

@clinic @weight-loss @generato @da-rivedere
Feature: The complete the second order

  Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.
Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.

  Scenario: the complete the second order — sessione registrata
    Given The user log in with "stefano.bertaccini+22@bootsdigitalhealth.co.uk"
When the user click on start service
When the user start the service
When the user select the medication with "Wegovy" and "7.2mg" and "Without Coaching"
When the user insert the dose
  | domanda | risposta |
  | How do you wish to proceed? | Stay on the same dose |
  | 1. What is your current weight? | 190 / 80 |
  | Enter date | oggi |
  | 3. Has there been any change in your medication? | No |
  | 4. Do you have anything else to tell us? | No |
When the user insert the bmi and the date
When the user complete the questionary
When the user choose pick up in store
When The user sleect the store with "NW1"
When the user select the card
When the user insert personal photo
When the user get the id photo
When submit photo
When the user get the front photo
When user get the second photo
When the user open the notification and see the order
