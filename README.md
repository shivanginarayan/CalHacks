### Parallax
A small world. A big what if.
Parallax is a living miniature economy of San Francisco. Start on a 3D globe, zoom into a hand-built isometric diorama of the city, trigger a bank or supply shock, and fork reality into three futures to see which policy actually saves jobs.
Behind the diorama is a real simulation: 40 households, 8 businesses, 5 banks, a government and a central bank. Every wage, purchase, loan and default settles on a double-entry ledger, audited after every simulated day.
## What it does
- Play a timeline and watch unemployment, household cash, business defaults and bank stress move live, with a ripple effect feed for each event.- Trigger a crisis: hit a bank with asset losses and watch credit dry up, payroll fail, and layoffs spread gradually.- Inspect anyone: click a building to see its balance sheet, connections and recent ledger entries.- Switch to Network to see who owes whom: loans, accounts and supplier contracts.- Fork Reality: pause the world, snapshot it, and run three futures side by side from the same moment — no intervention, emergency bank lending, or direct household support — on synchronized charts.- Ask the policy assistant: an agent inspects the economy, tests interventions on forked copies, and recommends exactly one, using a published ranking: jobs first, then defaults, then bank health, then cost. You accept or reject it, it never moves money on its own.- Credit and procurement agents: a bank agent handles credit reviews, and a procurement agent negotiates supplier contracts, with separate approval and settlement.
City reference statistics come from the US Census Bureau (2024 population estimates) and FDIC BankFind (the five banks headquartered in San Francisco). This is a stylized simulation, not a forecast of a real city, and not a real bank.
## Run locally
Prerequisites: Git, Python 3.11+, and Node 22 or 24. No database server or Docker is needed. SQLite is included with Python.
```shgit clone https://github.com/shivanginarayan/CalHacks.gitcd CalHacks```
Backend, from the repo root:
```powershellpython -m venv .venv.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000```
On macOS/Linux, use `.venv/bin/python` in place of `.\.venv\Scripts\python.exe`.
Frontend, from the repo root:
```shnpm cinpm run dev```
Open <http://127.0.0.1:5173/> with the API running, and the API docs at <http://127.0.0.1:8000/docs>. Health is at <http://127.0.0.1:8000/health>. The local API has no authentication; keep it on localhost.
## Environment
No keys are needed for simulation or demo agents. Live agents need:
- `NEBIUS_API_KEY` — required for live central-bank, credit, and supplier agents- `NEBIUS_MODEL` — exact tool-capable Nemotron model ID for your account- `NEBIUS_BASE_URL` — default `https://api.tokenfactory.nebius.com/v1`
See `.env.example` for the full list, including `ECONOMY_DB_PATH` and `ECONOMY_CORS_ORIGINS`. Start with `python -m scripts.run_backend --reload` to load settings from the ignored root `.env`.
## Try it
Create a world, step it, and audit it:
```powershell$world = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/api/worlds -ContentType application/json -Body '{"seed":42,"households":40,"businesses":8,"banks":5}'$simulationId = $world.simulation_idInvoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/worlds/$simulationId/step" -ContentType application/json -Body '{"ticks":1}'Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/worlds/$simulationId/audit"```
For the demo, create a world with `{"seed":42,"scenario":"credit_crunch"}`, post a shock to `bank_1`, then step 12 days. To compare rescues, call `/api/worlds/{id}/forks` before advancing time with `{"request_id":"demo-1","bank_id":"bank_1","budget_cents":1000000,"ticks":12}`. See `docs/CRISIS.md` and `docs/FORK_REALITY.md` for the full walkthroughs.
## Integrations
- **Fetch.ai:** a uAgents / ACP agent, registered on Agentverse and discoverable on ASI:One, runs bounded stress tests in conversation. See `docs/FETCH_AGENT.md`.- **Coinbase x402:** a separate research service charges 0.01 Base Sepolia test USDC for a snapshot-specific employment trend projection, with a real 402 challenge and verified testnet receipt. Paid research is off by default and requires explicit per-run authorization. See `docs/X402_SUBMISSION.md`.- **CRS:** a sandbox fraud-screened payment workflow, with sponsor test profiles. See `docs/SPONSOR_INTEGRATIONS.md`.- **Apify:** real public price and wage inputs, with source links and timestamps, frozen into snapshots for reproducible experiments. See `docs/APIFY.md`.- **SpacetimeDB:** a shared event feed and control room for proposing, reviewing, and executing shocks across browsers. SQLite remains the financial ledger. See `docs/SPACETIME_SUBMISSION.md`.
Detailed setup, live versus fixture status, and submission evidence are in `docs/TRACK_IMPLEMENTATION.md` and `docs/SUBMISSION_EVIDENCE.md`. The API contract is in `docs/API.md`.
## Verify
```powershell.\.venv\Scripts\python.exe -m pytest -qnpm testnpm run build```
Tests cover ledger invariants, fork isolation and accounting, agent workflows, credit and supplier settlement, playback, and jobs. Agent tests use offline scripted responses; they do not prove live Nemotron availability.
