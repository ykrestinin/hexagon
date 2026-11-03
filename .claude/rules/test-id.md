---
paths:
  - "mock-app/**"
  - "src/pages/**"
---

# test-id Convention

Applies when editing frontend markup that participates in E2E flows (here: the HTML templates in `mock-app/server.mjs`). Defines when and how to add `test-id` attributes for stable page objects.

## Principle

`test-id` is a contract between UI and tests. It exists to support stable interaction, not to describe layout or content.

## Format

- Attribute name: always `test-id` (configured as `testIdAttribute` in `playwright.config.ts`), not `data-testid` or another variant.
- Value: kebab-case, one `test-id` per element.
- Names describe business meaning or user action, not implementation detail.
- Naming pattern: `<page>-<element>-<type>`, such as `checkout-company-name-input`, `checkout-submit-button`, `account-upgrade-button`.
- A `test-id` only has to be unique within its page: page objects scope child controls through the page root.
- A component rendered once per data item (a plan card) puts the item key into the id: `plan-card-<planId>-select-link`.

```html
<!-- Correct -->
<input test-id="checkout-vat-id-input" />
<button test-id="account-cancel-button">Cancel subscription</button>

<!-- Wrong: describes implementation, not intent -->
<input test-id="field2" />
<div test-id="container-wrapper"></div>
```

## When To Add test-id

Only to elements a page object interacts with:

- `input`, `textarea`, `select`, checkbox, radio
- `button`
- `a` when it is part of a user flow
- Any element that triggers navigation or side effects

## When Not To Add test-id

- Display-only elements (headings, paragraphs, labels, icons), unless an exception below applies
- Layout wrappers (`div`, `section`, `article`, cards, grids), unless it is the page root or a collection container
- Elements no scenario uses

## Page Root Exception

One root `test-id` per page, on the top-level container that scopes child controls. Naming: `<page>-page` (`checkout-page`, `account-page`).

## Collection Container Exception

A table or list a page object treats as a `ControlCollection` may carry one `test-id` on its container (`invoices-table`). Rows and items are found by role inside it.

## Primary Heading Exception

The primary heading may carry `<page>-heading` only when it cannot be located with an unnamed `getByRole('heading', { level: 1 })` inside the page root (that is, the root contains several `h1`). Never locate a heading by its text.

## Asserted Value Exception

A display-only element may carry a `test-id` when a test asserts its value and a locator by role cannot single it out, such as a status, an amount or a license key.

- The `test-id` goes on the element that renders the value, not on a wrapper.
- Naming pattern: `<component>-<value>`: `subscription-status`, `license-seats`, `invoice-total`.
- Copy a test only needs to see stays without a `test-id`.
