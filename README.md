# Subscription Shop: Playwright Test Framework

Test automation for a **B2B subscription platform**: self-service checkout, trials, renewals, dunning,
plan changes with proration, license provisioning and EU VAT.

A small mock shop (`mock-app/`) is included so the suite runs out of the box. In a real project
`BASE_URL` points at a test or staging environment instead.

## Running

Requires Node 24+ (see `.nvmrc`).

```bash
npm ci
npx playwright install chromium webkit
```

| Command | What it runs |
| --- | --- |
| `npm test` | everything: API, UI in Chromium, `@smoke` UI in WebKit |
| `npm run test:api` | API layer only, ~1 s, no browser |
| `npm run test:e2e` | UI layer only |
| `npm run test:smoke` | `@smoke` subset, a quick check before pushing |
| `npm run test:stability` | whole suite 3× on 4 workers, to catch order and parallelism dependencies |
| `npm run verify` | lint, typecheck, test-case registry check (no tests) |
| `npm run example:locators` | demo: one journey with controls, with bare-locator page objects, and with raw XPath/CSS |
| `npm run report` | open the HTML report with traces |
| `npx playwright test --grep TC-CHK-001` | one test case |

The mock shop starts automatically on port 3100 (`PORT` overrides it). With `BASE_URL` set, no server is started
and the suite runs against that environment.

## Structure

```
test-cases/               Gherkin scenarios with TC-IDs: the source of truth for what is tested
src/
  tests/api/              business rules via API: lifecycle, billing & tax, plan changes, contract
  tests/e2e/              customer journeys in the browser, hybrid API-arrange / UI-verify tests
  pages/<section>/        page objects (catalog, checkout, account, layout) on top of BasePageObject
  e2e-controls/           Button, Input, Select, Text, ControlCollection... wrappers that own waits and assertions
  steps/                  business actions spanning several page objects
  api/                    typed API client and domain model; the only place that knows endpoints
  fixtures/               api client, fresh organisation per test, E2E_CONFIG
  test-data/              data factories and the billing oracle
scripts/check-test-cases.ts   registry ↔ specs traceability check
lint/*.grit               lint rules that enforce the locator conventions
examples/                 the same journey without controls and with raw locators, for comparison
mock-app/server.mjs       system under test (in-memory)
.github/workflows/        CI: static checks, then all tests in one run with one HTML report
```

## Design decisions

| Decision | Why |
| --- | --- |
| **Test pyramid inside one tool** | Playwright runs API and UI tests with the same runner, fixtures and reports. Billing and lifecycle rules are verified via API in milliseconds; the browser covers only what the customer sees. |
| **Hybrid tests** | Arrange state via API (a suspended account), verify in the UI. Faster and far less flaky than clicking through setup. |
| **Per-organisation test clock** | Lifecycle tests move time per customer (like Stripe test clocks) instead of waiting 30 days or using a global clock. Tests stay isolated and fully parallel. |
| **Every test owns its data** | The `org` fixture creates a fresh organisation per test: no shared accounts, no ordering dependencies. Checked with `npm run test:stability`. |
| **Billing rules as oracle** | Expected VAT and proration are computed from the spec (`src/test-data/billing.ts`), not copied from the app's output. |
| **`test-id` as a UI contract** | Interactive elements and asserted values carry a `test-id`; display elements are found by role. No text-based locators, so copy changes and translations do not break tests. |
| **Page objects and controls** | Specs never touch locators. Controls own waiting and assertions, page objects scope everything to their root. Enforced by lint rules, not only by review. `examples/page-object-styles.spec.ts` shows the alternatives: page objects without controls, and raw XPath/CSS. |
| **Traceable test cases** | Each test starts with the TC-ID of its Gherkin scenario, and `test.step()` names repeat the scenario lines, so a failing report reads like the test case. `npm run check:test-cases` derives coverage and fails on unknown IDs. |
| **Tags, not folders, for scope** | CI runs the whole suite (seconds) on every pull request, `main` and nightly. `@smoke` marks the few journeys that also run in WebKit and make up the quick local check. |
| **Debuggability** | Trace and screenshot on failure, Playwright HTML report locally and as a CI artifact. |

## Test cases

Scenarios live in `test-cases/<feature>.feature`. Each `Scenario` or `Scenario Outline` has exactly one `@TC-<AREA>-<NNN>` tag.

### Automating a scenario

1. The test title starts with the TC-ID, followed by the behaviour and the tags: `TC-CHK-001: customer buys the Basic plan and gets an active license @checkout @smoke`. Every example of a scenario outline keeps the same TC-ID.
2. Tags: the feature tag (`@billing`, `@checkout`, ...) and `@smoke` for the few journeys that also run in WebKit.
3. A multi-step scenario has one `test.step()` per Given/When/Then line, named after it, and every `Then` has an assertion behind it.
4. `npm run check:test-cases` must pass: it lists each TC as automated or not and fails on a TC-ID the registry does not know.

### Coverage

| Area | Feature file | TCs |
| --- | --- | --- |
| Billing & tax | `billing-tax.feature` | VAT per country (data-driven), reverse charge for EU B2B, domestic B2B |
| Plan changes | `plan-changes.feature` | prorated upgrade, downgrade without negative invoice, stable license key |
| Lifecycle | `subscription-lifecycle.feature` | trial → paid, trial cancel, renewals, cancel at period end, reactivation, dunning recovery, suspension |
| API contract | `api-contract.feature` | catalogue, 400/422/409 cases, re-subscribe after cancel |
| Catalogue (UI) | `catalog.feature` | every plan the shop sells is shown |
| Checkout (UI) | `checkout.feature` | buy, trial, reverse charge display, VAT error |
| Self-service (UI) | `self-service.feature` | upgrade, cancel and keep, suspended state |
| Navigation (UI) | `navigation.feature` | header links between catalogue and account, no account link for new visitors |

## What I would add on a real project

- Contract tests between shop, billing and licensing services (Pact)
- Webhook and event assertions (idempotency, retries, out-of-order delivery)
- Payment provider sandbox flows (3-D Secure, SEPA mandates)
- Visual and accessibility checks (`@axe-core/playwright`) on checkout
- Test results pushed to Jira/Xray per run; flaky-test tracking
- A shared test library across teams: controls, fixtures and API clients as a package, each team owns its specs
