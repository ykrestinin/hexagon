Feature: Subscription lifecycle
  Time moves with a per-organisation test clock, so lifecycle scenarios do not wait real days.

  @TC-LIF-001
  Scenario: Trial converts to a paid subscription when the trial ends
    Given an organisation that started a 14-day Basic trial
    Then the subscription is trialing with an active license and no invoices
    When 13 days have passed
    Then the subscription is still trialing and nothing is billed
    When the trial end is reached
    Then the subscription is active and a paid trial conversion invoice exists

  @TC-LIF-002
  Scenario: Cancelling a trial revokes access immediately
    Given an organisation on a PRO trial
    When it cancels the subscription
    Then the subscription is canceled
    And the license is inactive

  @TC-LIF-003
  Scenario: Active subscription renews every billing period
    Given an organisation with an active Basic subscription
    When two billing periods have passed
    Then it has one initial and two renewal invoices, all paid
    And the subscription is still active

  @TC-LIF-004
  Scenario: Cancel at period end keeps access until the paid period is over
    Given an organisation with an active Basic subscription, 10 days into the period
    When it cancels the subscription
    Then the subscription stays active and is marked to cancel at period end
    And the license stays active
    When the billing period ends
    Then the subscription is canceled and the license is inactive
    And no renewal invoice is created

  @TC-LIF-005
  Scenario: Reactivating before period end continues the subscription
    Given an organisation that cancelled its active Basic subscription at period end
    When it reactivates the subscription
    And the billing period ends
    Then the subscription is active and renewed

  @TC-LIF-006
  Scenario: Failed renewal goes past due and recovers after the payment method is updated
    Given an organisation with an active Basic subscription and a payment method that declines
    When the renewal is due
    Then the subscription is past due
    And the license stays active during the grace period
    When the customer updates the payment method
    Then the subscription is active and the failed renewal is paid

  @TC-LIF-007
  Scenario: Unpaid subscription is suspended after the grace period
    Given an organisation whose renewal payment failed
    When the 7-day grace period has almost passed
    Then the subscription is still past due
    When the grace period ends
    Then the subscription is suspended and the license is inactive
