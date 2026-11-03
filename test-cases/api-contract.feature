Feature: Shop API contract and validation

  @TC-API-001
  Scenario: Plans endpoint returns the sellable catalogue
    When the plan catalogue is requested
    Then it lists Basic at 49 with 1 seat and PRO at 149 with 5 seats

  @TC-API-002
  Scenario Outline: Invalid organisation is rejected
    When an organisation is created with <problem>
    Then the request is rejected with status <status> and an error message

    Examples:
      | problem              | status |
      | missing company name | 400    |
      | missing country      | 400    |
      | malformed VAT ID     | 422    |

  @TC-API-003
  Scenario: Unknown plan is rejected
    When an organisation subscribes to a plan that does not exist
    Then the request is rejected with status 400

  @TC-API-004
  Scenario: A second active subscription for the same organisation is rejected
    Given an organisation with an active subscription
    When it subscribes again
    Then the request is rejected with status 409

  @TC-API-005
  Scenario: Organisation can subscribe again after cancelling
    Given an organisation that cancelled its trial
    When it subscribes to the PRO plan
    Then the new subscription is active
