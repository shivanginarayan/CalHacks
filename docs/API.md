# Frontend API Contract

Base URL: `http://127.0.0.1:8000`. Interactive documentation: `/docs`. Generated schemas: [openapi.json](./openapi.json). Actual calculated samples: [examples.json](./examples.json).

The example world ID is illustrative. Create a world and use its returned `simulation_id` in requests. All amounts are integer USD cents, and `employment_rate` is a fraction between zero and one.

## Available endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Service health. |
| POST | `/api/worlds` | Create a paused, seeded world. |
| GET | `/api/worlds/{id}` | Current metrics, entities, tick, and latest event sequence. |
| POST | `/api/worlds/{id}/step` | Execute 1–100 days atomically and return the updated world. |
| GET | `/api/worlds/{id}/entities/{entity_id}` | Institution relationships and balance sheet. |
| GET | `/api/worlds/{id}/metrics?after_tick=-1` | Tick snapshots after the exclusive tick cursor. |
| GET | `/api/worlds/{id}/events?after=0&limit=200` | Ordered events after the exclusive sequence cursor. |
| GET | `/api/worlds/{id}/transactions?offset=0&limit=100` | Paginated journal entries, including genesis entries. |
| POST | `/api/worlds/{id}/payments` | Validate and settle a payment. |
| POST | `/api/worlds/{id}/loans` | Issue principal-only credit at the borrower’s bank. |
| POST | `/api/worlds/{id}/loan-repayments` | Repay principal at the borrower’s bank. |
| GET | `/api/worlds/{id}/audit` | Reconstruct the ledger and validate accounting. |
| POST | `/api/worlds/{id}/shocks` | Write down a bank’s risky assets and update its financial status. |
| GET | `/api/worlds/{id}/network` | Current interbank/customer credit exposures and due ticks. |

## Requests

Create world (all fields have defaults):

```json
{"seed":42,"households":40,"businesses":8,"banks":5,"scenario":"standard"}
```

Supported configuration limits: 1–2,000 households, 1–150 businesses, 1–10 banks, and a seed between 0 and 4,294,967,295. These are input limits; large worlds and long runs still require performance measurement.

Use `scenario: "credit_crunch"` for the crisis demo. It starts with thinner bank capital and businesses carrying working-capital loans. `standard` retains high bank capital. See [the crisis model and walkthrough](./CRISIS.md) and [calculated crisis example](./crisis_demo.json).

Step:

```json
{"ticks":1}
```

Payment:

```json
{"transaction_id":"ui-payment-001","payer_id":"business_1","receiver_id":"household_1","amount_cents":20000}
```

Loan or repayment:

```json
{"transaction_id":"ui-loan-001","borrower_id":"business_1","amount_cents":100000}
```

Use a unique transaction ID for every intended financial operation. Retry an uncertain payment/loan request with its original ID and identical contents. An identical retry returns the original receipt without a second payment or event; conflicting contents return 409. IDs are scoped to a world and shared across all transaction types. Do not use the backend-reserved `genesis:` or `tick:` prefixes.

Step requests currently have no idempotency key. If a step response is lost, retrieve the current world tick before deciding to advance again.

Bank asset shock (4,000 basis points = 40% of the remaining risky asset category):

```json
{"transaction_id":"ui-shock-001","bank_id":"bank_1","asset_category":"risky_assets","loss_bps":4000}
```

This returns a journal receipt. Fetch the world and new events afterward for updated bank status and metrics. Shock IDs follow the same retry rules as payments and loans. A new ID applies a new loss to the remaining assets. `loss_bps` accepts 1–10,000; other asset categories are rejected. Advance time to see business and interbank consequences. Worlds saved before milestone 2 remain usable, but need to be recreated to include risky portfolios and interbank relationships.

## Event handling

An event contains:

```json
{
  "sequence":2,
  "simulation_id":"world_example",
  "simulation_tick":1,
  "event_type":"salary",
  "agent_id":"business_1",
  "counterparty_id":"household_1",
  "amount_cents":8000,
  "transaction_id":"tick:1:salary:household_1",
  "details":{}
}
```

This shape illustrates the contract; calculated event values are in the examples file. `agent_id` is the initiating actor, not necessarily an AI agent. Nullable fields are present when a field does not apply. Current event types are `world_created`, `salary`, `purchase`, `payment`, `loan_issued`, `loan_repayment`, `payment_rejected`, and `tick_completed`.

Additional crisis events are `startup_cost` (scenario initialization), `bank_asset_loss`, `bank_status_changed`, `credit_rejected`, `loan_refinanced`, `loan_default`, `business_default`, `job_lost`, `interbank_payment`, `interbank_default`, and `interbank_cleared`. `bank_status_changed.details` contains the old/new status, ratios, and lending availability. Interbank events include the due, paid, and unpaid amounts. Several events can reference one simultaneous clearing transaction; deduplicate animations by event sequence, not transaction ID.

Responses include `events`, `next_after`, and `has_more`. Begin with `after=0`, consume each page, then request `after=next_after`. Drain all pages when `has_more=true`. Deduplicate animations by `(simulation_id, sequence)`. Refresh current state after reconnecting, and fetch events from the saved cursor if missed animations are useful.

Polling is available now; WebSocket streaming is a later milestone. Keep at most one step request in flight. A frontend play loop may send explicit steps sequentially, and pause by stopping further steps; it cannot cancel an in-flight step.

## Metrics and inspector

The current world contains a `metrics` object and `entities` list. Every entity has an ID, name, kind, status, and balance sheet. Businesses provide employees and price; households provide employer, bank, wage, and consumption budget. Institution sheets satisfy `assets_cents = liabilities_cents + equity_cents`.

Use `bank_id`, `employer_id`, and employee IDs for banking/employment links. The network endpoint returns `exposures` containing `kind` (`customer_loan` or `interbank`), `borrower_id`, `lender_id`, `amount_cents`, and `due_tick`. Direction is explicit: the borrower owes the lender. Repaid or written-off exposures disappear from the current network; event history preserves the cause.

Bank detail includes `capital_ratio`, `liquidity_ratio`, `lending_available`, and status (`active`, `stressed`, or `insolvent`). A bank that has defaulted on interbank payments remains at least stressed. Business status becomes `defaulted` when it closes; affected households’ `employer_id` becomes null. `loan_due_tick` and missed-obligation counters are available in the inspector. `stressed_banks` includes both stressed and insolvent banks; `insolvent_banks` is a subset.

The metrics endpoint returns history captured at world creation and after each completed tick. Manual payments, loans, and shocks update current world metrics immediately, but do not create additional historical tick samples. Read the world response for current values.

## Error behavior

- `404`: unknown simulation or institution.
- `409`: financial rejection, insufficient funds/reserves, exceeded lending limit, or conflicting transaction ID. No partial mutation is saved.
- `422`: malformed input, unknown request fields, invalid bounds, or non-integer monetary values.

Financial errors use `{"detail":"reason"}`. Validation errors use FastAPI’s structured `detail` array. Failed scheduled wages/purchases appear as `payment_rejected` events while the rest of the tick continues.

## Not available in this milestone

Backend play/pause scheduling, reset, interventions, Fork Reality, autonomous-agent traces, supplier negotiation, and external payments. To start over now, create another world. Keep unfinished controls disabled or clearly marked as upcoming in the UI.
