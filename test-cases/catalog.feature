Feature: Plan catalogue

  @TC-CAT-001
  Scenario: Catalogue shows every plan the shop sells
    Given a visitor opens the plan catalogue
    Then it shows the name of every plan the shop sells
