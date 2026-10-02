# generato-da: bdd-generate · rigenerabile
# src/features/qa-brochure/weight-loss/the-user-complete-the-order.feature
#
# Derivato dalla sessione manuale registrata il 2026-09-30T15:10:45.435Z
# (reports\recordings\qa-clinic.lemonaidhealth.co.uk-2026-09-30T15-10-45-430Z.json, 186s, 5 intenti dichiarati dal tester).
#
# I confini fra un passo e l'altro NON sono stati indovinati: sono quelli che il
# tester ha dichiarato premendo "Fine intento" mentre eseguiva il test. E' l'unico
# dato semantico dell'intera catena che non stiamo inferendo.
#
# Le frasi vanno riviste da chi ha eseguito il test: la struttura e' derivata,
# il linguaggio no.

@qa-brochure @weight-loss @generato @da-rivedere
Feature: the user complete the order

  Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.
Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.

  Scenario: qa clinic lemonaidhealth co uk — sessione registrata
    Given the user land on brochure
When the user open the weight loss
When the user click get started
When the user complete the order
When the user check the last notification
Then the page shows "Secure messages"
