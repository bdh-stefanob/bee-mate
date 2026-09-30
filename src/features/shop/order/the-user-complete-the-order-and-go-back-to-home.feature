# generato-da: bdd-generate · rigenerabile
# src/features/shop/order/the-user-complete-the-order-and-go-back-to-home.feature
#
# Derivato dalla sessione manuale registrata il 2026-09-30T13:33:47.950Z
# (reports\recordings\www.saucedemo.com-2026-09-30T13-33-47-948Z.json, 71s, 3 intenti dichiarati dal tester).
#
# I confini fra un passo e l'altro NON sono stati indovinati: sono quelli che il
# tester ha dichiarato premendo "Fine intento" mentre eseguiva il test. E' l'unico
# dato semantico dell'intera catena che non stiamo inferendo.
#
# Le frasi vanno riviste da chi ha eseguito il test: la struttura e' derivata,
# il linguaggio no.

@shop @order @generato @da-rivedere
Feature: the user complete the order and go back to home

  Le frasi sono le etichette scritte dal tester durante l'esecuzione manuale.
  Sono vere e il test gira, ma non sono ancora nel vocabolario condiviso.

  Scenario: the user complete the order and go back to home
    Given The user logged in
    When The user complete the order
    # durante questo passo si verifica: "Cart, 1 items"
    When The user back to home
    # durante questo passo si verifica: "Thank you for your order!"
