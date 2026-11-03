Feature: Billing and EU VAT
  Invoices charge VAT by the customer's country. EU business customers outside Germany
  with a valid VAT ID are invoiced net (reverse charge).

  @TC-BIL-001
  Scenario Outline: Customer without a VAT ID is charged the VAT rate of their country
    Given an organisation in <country> without a VAT ID
    When it subscribes to the Basic plan
    Then the first invoice charges <rate> VAT on 49.00 net
    And the invoice is not marked as reverse charge

    Examples:
      | country | rate |
      | DE      | 19%  |
      | AT      | 20%  |
      | FR      | 20%  |
      | SE      | 25%  |

  @TC-BIL-002
  Scenario: EU business customer outside Germany gets reverse charge
    Given an organisation in AT with a valid VAT ID
    When it subscribes to the PRO plan
    Then the first invoice is marked as reverse charge
    And the invoice total equals the net price of 149.00

  @TC-BIL-003
  Scenario: Domestic business customer still pays German VAT
    Given an organisation in DE with a valid VAT ID
    When it subscribes to the Basic plan
    Then the first invoice charges 19% VAT
    And the invoice is not marked as reverse charge
