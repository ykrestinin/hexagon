Feature: Self-service portal
  An existing customer manages their subscription in the portal.

  @TC-SSP-001
  Scenario: Customer upgrades from Basic to PRO
    Given a customer with an active Basic subscription is in the portal
    When they upgrade to PRO
    Then the portal shows the PRO plan with 5 seats
    And a proration invoice is added

  @TC-SSP-002
  Scenario: Customer cancels and then keeps the subscription
    Given a customer with an active Basic subscription is in the portal
    When they cancel the subscription
    Then the portal shows the end date of the period
    And the subscription stays active until then
    When they choose to keep the subscription
    Then the end date is no longer shown

  @TC-SSP-003
  Scenario: Suspended account is shown as suspended
    Given a customer whose subscription was suspended for non-payment
    When they open the portal
    Then the subscription is shown as suspended
    And the license is shown as inactive
    And the failed renewal invoice is shown
