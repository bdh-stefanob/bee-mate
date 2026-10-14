# generato-da: bdd-generate · rigenerabile
# src/features/clinic/weight-loss/complete-an-order-on-weight-loss.feature
#
# Derivato dalla sessione manuale registrata il 2026-10-14T08:51:36.226Z
# (reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-10-14T08-51-36-224Z.json, 780s, 12 intenti dichiarati dal tester).
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
Feature: complete an order on weight loss

  Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.
Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.

  Scenario: qa clinic lemonaidhealth co uk — sessione registrata
    Given The user log in and click on start a service with "stefano.bertaccini+22@bootsdigitalhealth.co.uk"
When The user start a wright loss service
When the user select the Mounjaro 7.5mg without coaching
When the user read the imprtant info with "answer"
When the user answer the question
When the user insert the bmi data with "70"
When the user select the store pharmacy to pick up with "NW15rt"
When the user insert a card and a photo with "4000 0082 6000 0000", "12 / 29" and "001"
When the user get the second photo
When the user get another photo for document
When the user submit the photo and the order
When the user check the notification and the page
# durante questo passo si verifica: "1"
Then the page shows "Boots Digital Health"
