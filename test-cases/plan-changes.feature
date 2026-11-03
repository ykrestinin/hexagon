Feature: Plan changes and licensing

  @TC-PLN-001
  Scenario: Mid-period upgrade charges the prorated difference and raises seats
    Given an organisation with an active Basic subscription and a 1-seat license
    And 15 of 30 days of the billing period have passed
    When it upgrades to PRO
    Then a paid proration invoice of 50.00 net is created
    And the license has 5 seats on the PRO plan

  @TC-PLN-002
  Scenario: Downgrade does not create a negative invoice
    Given an organisation with an active PRO subscription
    When it downgrades to Basic
    Then no invoice is created
    And the license has 1 seat

  @TC-PLN-003
  Scenario: License key stays the same across plan changes
    Given an organisation with an active Basic subscription
    When it upgrades to PRO
    Then the license key is unchanged
