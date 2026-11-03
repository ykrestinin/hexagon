Feature: Checkout
  A new customer picks a plan in the catalogue, places an order and lands in the self-service portal.

  @TC-CHK-001
  Scenario: Customer buys the Basic plan and gets an active license
    Given the customer is on the plan catalogue
    When they order the Basic plan as a German company
    Then the portal shows an active Basic subscription
    And the license has 1 seat and a license key
    And one invoice of 58.31 including 19% VAT is shown
    And the shown invoice matches what was billed

  @TC-CHK-002
  Scenario: Customer starts a free trial without being invoiced
    Given the customer is on the plan catalogue
    When they order the PRO plan with a free trial
    Then the portal shows a trialing subscription with 5 seats
    And no invoice is shown

  @TC-CHK-003
  Scenario: Austrian business customer sees reverse charge on the invoice
    Given the customer is on the plan catalogue
    When they order the PRO plan as an Austrian company with a VAT ID
    Then the invoice shows reverse charge instead of a VAT amount
    And the invoice total is 149.00

  @TC-CHK-004
  Scenario: Invalid VAT ID is reported and no order is placed
    Given the customer is on the plan catalogue
    When they order the Basic plan with a malformed VAT ID
    Then the checkout shows "invalid VAT ID"
    And the customer stays on the checkout
