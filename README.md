# Economy God Mode Backend

Milestone 2 adds bank asset shocks, constrained lending, business defaults, job losses, and interbank clearing to the reproducible financial economy. SQLite persists complete worlds and their journal/event histories. Government and central-bank agents remain placeholders until the intervention milestone.

The product direction is saved in [UI_PLAN.md](./UI_PLAN.md). Frontend integration details are in [docs/API.md](./docs/API.md).

## Run locally

Prerequisites: Git and Python 3.11 or newer with pip and venv. The backend was tested with Python 3.11 on Windows. SQLite is included with Python; no separate database server, Node.js, Docker, cloud account, or API keys are needed for the current simulation. The frontend is being developed separately.

Clone the repository:

```sh
git clone https://github.com/shivanginarayan/CalHacks.git
cd CalHacks
```

On Windows, run these commands from the project root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

On macOS/Linux:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock.txt
.venv/bin/python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Run commands from the repository root. Calling the virtual environment's Python directly avoids activation and PowerShell execution-policy requirements. The exact tested dependency versions are in [requirements.lock.txt](./requirements.lock.txt); [requirements.txt](./requirements.txt) records the supported direct dependency ranges. The same lock file is used on all platforms, but only Windows execution has been verified so far.

Open the interactive API at <http://127.0.0.1:8000/docs>. Health is available at <http://127.0.0.1:8000/health>.

Keep the server terminal open and use a second terminal for API requests. Stop the server with Ctrl+C. Simulation data survives restarts. No environment variables are required with the defaults.

## Environment configuration

The optional [environment template](./.env.example) documents the available settings. The application reads shell environment variables; copying the template to `.env` does **not** load it automatically.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ECONOMY_DB_PATH` | `data/economy.sqlite3` under the repository root | SQLite world storage. An override may be an absolute path, or a path relative to the working directory. Parent directories are created automatically. |
| `ECONOMY_CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173` | Comma-separated frontend origins, including scheme and port. |

Example overrides in PowerShell, before starting the server:

```powershell
$env:ECONOMY_DB_PATH = 'data/economy.sqlite3'
$env:ECONOMY_CORS_ORIGINS = 'http://localhost:5173,http://localhost:3000'
```

Or on macOS/Linux:

```sh
export ECONOMY_DB_PATH="data/economy.sqlite3"
export ECONOMY_CORS_ORIGINS="http://localhost:5173,http://localhost:3000"
```

The UI's API base URL should be `http://127.0.0.1:8000` on the same computer. If another service uses port 8000, start Uvicorn with `--port 8001` and update the frontend's API base URL. CORS settings identify the frontend's origin, not the backend URL. The local API has no authentication; keep this development setup on localhost.

The virtual environment, local database files, caches, and private environment files are excluded from Git. Keep the example template free of secrets. Sponsor credentials will be documented when those integrations are implemented.

## Try the API

Create and advance a world:

```powershell
$world = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/worlds -ContentType application/json -Body '{"seed":42,"households":40,"businesses":8,"banks":5}'
$simulationId = $world.simulation_id
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/worlds/$simulationId/step" -ContentType application/json -Body '{"ticks":1}'
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/worlds/$simulationId/audit"
```

## What works

- Seeded world creation with employment and banking relationships.
- Balance sheets and balanced journal entries for every entity.
- Same-bank and cross-bank payments, including reserve settlement.
- Explicit bank credit creation and principal repayment.
- Wages, rule-based household consumption, and rejected-payment events.
- Idempotent transaction IDs: exact retries settle once; conflicting reuse fails.
- Atomic SQLite checkpoints: balances, tick, journal, and events commit together.
- Institution inspection, historical tick metrics, paginated transactions and events.
- Typed OpenAPI contract and generated example responses for the UI.
- Idempotent bank asset shocks and live capital/liquidity indicators.
- Automatic payroll credit, business debt maturities, and refinancing decisions.
- Business closures, matching loan writeoffs, and job losses after missed obligations.
- Interbank exposures and simultaneous clearing with protected deposit claims.
- A reproducible `credit_crunch` starting scenario for the crisis demo.

## Financial rules and assumptions

All amounts are integer USD cents. Account balances are derived from signed debit/credit entries. Each transaction balances separately for every affected institution. An audit reconstructs all balances from the journal and checks customer deposits and debts against the banks’ corresponding liabilities and assets.

Opening bank capital and customer deposits are explicit genesis endowments. Initial deposits are backed by endowed bank reserves; these operations run only at world creation. This starting allocation is an assumption of the experiment.

Wages and purchases move existing deposits and recognize changes in each customer’s equity immediately. Transfers between banks move reserves. Credit issuance creates a bank loan asset, deposit liability, borrower deposit, and borrower debt. Repayment reverses those entries and destroys the repaid deposit money.

One tick represents one day. Due interbank obligations clear first. Active businesses then attempt principal repayments/refinancing and request payroll credit when needed. Businesses attempt wages before households buy goods. A household selects a business using a seeded per-tick random stream and spends up to its fixed budget and available deposit, rounded down to whole units of the seller’s price. Unemployed households cap spending at 10% of available deposits. Purchases targeting closed businesses are skipped. Goods supply is currently unlimited.

Loans are principal-only and may be manually requested or rule-based payroll credit. Business loans mature after five ticks and may be extended under the bank’s current lending rules. Borrower debt is capped at 500,000 cents; bank lending requires at least 8% capital/assets, at least 10% reserves/customer deposits, positive equity, no prior interbank payment default, and total customer loans no greater than five times equity. These are initial simulation rules, not calibrated economics or regulatory thresholds. See [the crisis model](./docs/CRISIS.md) for the exact default and clearing assumptions.

Government and central-bank entities currently have zero balances and no automated behavior. Intervention cost remains zero. Taxes, rent, inventory, Fork Reality, interventions, AI reasoning, sponsor integrations, and background play/pause are subsequent milestones. Current credit decisions are explicit deterministic rules.

## Frontend connection

The UI can create a world, render relationships, inspect balance sheets, advance time, trigger a bank shock, poll ordered events, and display financial history. Use the API’s returned simulation ID. Worlds are paused between explicit step requests. Crisis controls are ready; AI and fork controls remain upcoming. The network endpoint exposes real borrower/lender relationships and amounts.

For the demo, create a world with `{"seed":42,"scenario":"credit_crunch"}`, post a 4,000-basis-point shock to `bank_1`, then step 12 days. Follow the runnable requests in [docs/CRISIS.md](./docs/CRISIS.md). The `standard` scenario retains high starting bank capital and can absorb the same shock; scenarios are intentionally different initial conditions.

The local browser origins `localhost:3000`, `localhost:5173`, `127.0.0.1:3000`, and `127.0.0.1:5173` are enabled. Configure a comma-separated `ECONOMY_CORS_ORIGINS` environment variable for another frontend origin. Configuration follows [FastAPI’s CORS documentation](https://fastapi.tiangolo.com/tutorial/cors/).

The default database is [data/economy.sqlite3](./data/economy.sqlite3), created on first import/start. Set `ECONOMY_DB_PATH` to override it. The API is a local development service with no authentication; transaction IDs provide retry protection, not authorization.

## Verify

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m scripts.export_contract
```

On macOS/Linux, use `.venv/bin/python` in place of `.\.venv\Scripts\python.exe`. The current suite contains 32 tests. Contract export regenerates the schema and calculated examples in [docs/](./docs/), including [the crisis demo](./docs/crisis_demo.json).

Tests cover ledger invariants, reproducibility, reserve/deposit conservation, loan creation and repayment, rejected transactions, request validation, persistence, event pagination, CORS, concurrent requests, shock replay, clearing calculations, crisis propagation, defaults, and legacy checkpoints.

The persistence approach stores complete world checkpoints, including history. It favors correctness and easy snapshots for the first milestone. Long runs and high-volume event retrieval will need normalized storage or incremental journal writes; the maximum input population is not a throughput guarantee.
