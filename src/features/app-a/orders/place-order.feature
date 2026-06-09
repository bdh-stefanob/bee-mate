@orders
Feature: Order placement

  Scenario: User places an order for a single product
    Given I am logged in as a "standard" user
    And the cart contains the product "Wireless Mouse"
    When I place the order
    Then the order is confirmed
    And the order status is "pending"

  Scenario: User places an order for multiple products
    Given I am logged in as a "standard" user
    And the cart contains the following products:
      | product        | quantity |
      | Wireless Mouse | 2        |
      | USB-C Cable     | 1        |
    When I place the order
    Then the order is confirmed
