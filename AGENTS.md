# Test Automation Instructions

Conventions for all work in this repository. Running tests, the environment and the test-case registry are described in [`README.md`](README.md). Frontend `test-id` rules live in [`.claude/rules/test-id.md`](.claude/rules/test-id.md).

## Stack

Playwright with TypeScript, Biome for lint and format. Source code lives under `src/`. The system under test is the mock shop in `mock-app/server.mjs`; in a real setup `BASE_URL` points at a test environment instead.

## Key Locations

| Path | Purpose |
| --- | --- |
| `src/tests/<layer>/` | Specs (`*.spec.ts`); the folder selects the Playwright project: `api/` (no browser) or `e2e/` (Chromium, plus WebKit for `@smoke`) |
| `src/pages/<section>/` | Page objects, one folder per app section (`catalog/` for `/`, `checkout/` for `/checkout`, `account/` for `/account`), plus the shared `BasePageObject` |
| `src/pages/index.ts` | Barrel export for page objects |
| `src/e2e-controls/` | Control wrappers built on Playwright locators |
| `src/test-base/` | Shared typing for control options |
| `src/api/` | Typed API client (`shop-api.ts`) and domain types; the only place that knows endpoints |
| `src/fixtures/` | `test.extend` fixtures (`api`, `org`) and `E2E_CONFIG` |
| `src/test-data/` | Test data factories and the billing oracle, one file per business entity |
| `src/steps/` | Business-action orchestration reused across specs (see Step Rules) |
| `test-cases/` | Test-case registry: Gherkin scenarios with TC-IDs |
| `scripts/check-test-cases.ts` | Derives which TCs are automated; fails on unknown or duplicate TC-IDs |
| `lint/*.grit` | Biome plugins that enforce the locator rules below |

Reference implementations: [`src/tests/e2e/checkout.spec.ts`](src/tests/e2e/checkout.spec.ts) for a UI journey (page objects, a step, `test.step()` mirroring Gherkin), [`src/tests/e2e/self-service.spec.ts`](src/tests/e2e/self-service.spec.ts) for a hybrid API-arrange / UI-verify test, [`src/tests/api/subscription-lifecycle.spec.ts`](src/tests/api/subscription-lifecycle.spec.ts) for an API scenario driven by the test clock.

## Page Object Rules

- Extend `BasePageObject` from `src/pages/base-page-object.ts`.
- Location: `src/pages/<section>/`, where `<section>` is the part of the app the screen belongs to, usually its first route segment.
- File naming: `<page>-page.page-object.ts` without repeating the section (`checkout/checkout-page.page-object.ts`). A reusable part of a page (a table row) is a plain control file next to it (`account/invoice-row.ts`).
- Constructor pattern: `super(page, null, "<root-test-id>")`.
- Declare child controls as `readonly` fields and always pass `{ parent: this }`, so locators stay scoped to the page root.
- Page objects own navigation (`open()`) and wait for their root (`waitForLoad()`), so a spec never asserts on a page that has not rendered.
- Export every new page object from `src/pages/index.ts` immediately after creating it.

## Control Rules

- Use the controls from `src/e2e-controls/`: `Control`, `ControlCollection`, `Input`, `Text`, `Select` (native `<select>`), `Button`, `Hyperlink`, `Checkbox`.
- Do not create wrappers that add nothing. Create a new control only when an interaction is genuinely not covered (for example a custom dropdown).
- A control takes a `test-id` string or a role-based `Locator` built from `page`; both are resolved inside the parent.

## Spec File Rules

- Keep specs under `src/tests/<layer>/`.
- Every test automates a scenario from `test-cases/`: the title starts with its TC-ID (`"TC-CHK-001: ..."`), and a scenario outline keeps the same TC-ID for every generated test.
- Use `test.describe()` to group the scenarios of one feature file.
- Tag format: append `@tag` directly in the title (`"TC-...: does X @checkout @smoke"`). Do not use Playwright's `{ tag: [...] }` option; mixing styles hurts readability. Do not tag the layer (`@api`, `@e2e`); the folder already selects the project.
- Test body: for a scenario driven by several `test.step()` calls, extract the body into a named `async function` declared after the `test.describe()` block, typed with `TestArgs` from `src/fixtures`, and pass it as the callback: `test("TC-...: title @tag", basicPurchaseIsActive)`. Name it after the expected behaviour, not generically (`testCase1`). Short, single-assertion tests keep an inline arrow function.
- `test.step()` names mirror the Given/When/Then lines of the scenario, and every `Then` line has a concrete assertion behind it.
- Import page objects via the `src/pages` barrel.
- Do not hardcode URLs. Use relative paths (resolved against `baseURL`) and `E2E_CONFIG`.

## API Test Rules

- Specs call the domain through `ShopApi`; no raw `request.get('/api/...')` in specs. Negative tests use the `*Raw` methods and assert on the status code.
- Expected amounts come from `Billing` in `src/test-data/billing.ts`, never copied from the application's output.
- Move time with `api.advanceClock(orgId, days)` (per-organisation test clock). Never wait real time.
- Arrange UI tests through the API when the setup is not what the test is about (hybrid tests).

## Step Rules

- Put a business action in `src/steps/` when it orchestrates more than one page object, or when the same multi-step action is used by more than one spec.
- If a multi-step action is used by one spec only, inline it as `test.step()` calls first; promote it once a second spec needs it.
- File naming: `<flow>-steps.ts`, exporting a named object of `async` functions (`checkoutSteps.orderPlan`).
- A step receives `page` (and the data it needs) and composes page object methods. It never builds locators itself.
- A step that would only forward to one page object method is not a step: call the page object directly.

## Fixture Rules

- Shared setup lives in `src/fixtures/`: the `api` client, a fresh `org` per test, and `E2E_CONFIG`.
- Every test owns its data: create what it needs through fixtures or factories, never depend on another test or on pre-seeded accounts.
- Keep fixtures generic; no page-object-specific logic in fixtures.

## Tag Rules

- Feature tags (`@billing`, `@checkout`, ...) are free-form and match the feature file.
- `@smoke` runs on every pull request and additionally in WebKit, so keep it on checks that are cheap and meaningful across browsers. Everything else runs on `main` and nightly.

## Interaction Rules

- Do not bypass Playwright actionability checks with `.evaluate(element => element.click())`, `force: true` or other DOM-level interaction.
- `Control.click()` already waits for visible and enabled; forcing a click can hide a real UX bug (an element a real user could not click either).
- If an element does not become clickable through the normal path, fix the cause (missing wait for the page root, an overlay, an async render) instead of forcing the interaction.
- No `page.waitForTimeout()`. Wait for a state with a web-first assertion.

## Assertion Rules

- In UI specs, assert through control methods: `isAvailable()`, `isHidden()`, `isEnabled()`, `hasText()`, `containsText()`, `hasCount()`.
- `expect(page).toHaveURL(...)` and `expect(page).toHaveTitle(...)` are allowed for navigation-level assertions.
- `expect(locator)` belongs in controls only. `expect(value)` on API responses is fine in specs.

## Locator Convention

### Locator Strategy

When building a page object control, pick the first applicable strategy:

1. `test-id` for interactive elements (inputs, buttons, links, checkboxes, selects) and for values a test asserts (see the Asserted Value Exception in the test-id rule). Preferred.
2. `getByRole` for display-only elements such as headings, status messages or alerts.
3. Nothing else. CSS selectors, XPath and class-based locators are forbidden (enforced by `lint/no-css-locators.grit`).

The `test-id` attribute is configured as `testIdAttribute: 'test-id'` in `playwright.config.ts`.

```typescript
// Correct: interactive element uses test-id
readonly submitButton = new Button(this.page, { parent: this }, 'checkout-submit-button');

// Correct: display element uses getByRole
readonly errorMessage = new Text(this.page, { parent: this }, this.page.getByRole('alert'));

// Wrong: CSS selector
readonly title = new Text(this.page, { parent: this }, this.page.locator('.page-title'));
```

### Usage In Specs

- `test-id`s and locators are used only inside page objects and controls, never in spec files.
- Specs never call `getByTestId`, `getByRole`, `locator` and the like; this is enforced by `lint/no-raw-locators-in-specs.grit`.

```typescript
// Correct
await checkoutPage.submitButton.click();

// Wrong
await page.getByTestId('checkout-submit-button').click();
```

### Frontend Collaboration Rule

When a page object needs an element that has no `test-id`, add the attribute to the frontend (here: the HTML templates in `mock-app/server.mjs`) per the test-id rule, then reference it from the page object.

### Headings And Other Translated Content

Do not locate an element by its user-facing text (`getByRole('heading', { name: /Checkout/ })`). This couples the locator to copy and breaks on wording or locale changes.

- A page's primary heading that is the only one of its level inside the root is located with `getByRole('heading', { level: 1 })`, scoped through `{ parent: this }`.
- Only when the root holds several such headings, add a `<page>-heading` `test-id` (Primary Heading Exception in the test-id rule).
- To check the copy, assert it separately with `hasText()` on the already-located element.
- `getByRole` without a name is fine for generic regions such as `getByRole('alert')`.

### Composite Controls (Tables, Lists)

A control that wraps repeated items is a `ControlCollection` with an item factory. Scope it through its container control:

```typescript
private readonly invoicesTable = new Control(this.page, { parent: this }, 'invoices-table');
readonly invoices = new ControlCollection(
  this.page,
  { parent: this.invoicesTable },
  this.page.getByRole('row').filter({ has: this.page.getByRole('cell') }),
  (page, row) => new InvoiceRow(page, row),
);
```

### Locating A Specific Row Or Item

Pick an item by its content, then act or assert within it, instead of by index:

```typescript
// Correct
await accountPage.invoiceFor('proration').status.hasText('paid');

// Avoid: breaks when ordering or unrelated rows change
await accountPage.invoices.control.nth(1)...
```
