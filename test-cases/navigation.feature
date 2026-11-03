Feature: Navigation
  The header links the plan catalogue and, once the customer is known, their account.

  @TC-NAV-001
  Scenario: Customer moves between the portal and the plan catalogue
    Given a customer with an active subscription is in the portal
    When they open the plans from the navigation
    Then the plan catalogue is shown
    When they go to their account from the navigation
    Then the portal shows their own active subscription

  @TC-NAV-002
  Scenario: New visitor is not offered an account link
    Given a new visitor is on the plan catalogue
    Then the navigation offers the plans
    And the navigation offers no account link
