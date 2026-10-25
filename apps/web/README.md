# Economy God Mode UI

The globe and San Francisco city are connected to the Python backend. Financial values, institutions, shocks, agent jobs, supplier contracts, and Fork Reality outcomes come from API responses. The original fixtures remain development references rather than the active economy.

From the repository root, start the API in one terminal:

```powershell
.\.venv\Scripts\python.exe -m scripts.run_backend --reload
```

The launcher loads supported settings from the ignored root `.env`. Shell variables take precedence. Keep the Nebius key on the backend.

In a second terminal, using Node 22 LTS:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite proxies API and SSE traffic to http://127.0.0.1:8000. No frontend key is required. When configured, live mode uses the displayed Nemotron model; deterministic demo mode remains explicitly selectable.

Choose United States, San Francisco, and a starting scenario. Credit crunch supports the bank-crisis demo. Supply crunch supports material-shortage recovery through supplier negotiation. The miniature is a visual representation of backend institutions, not a calibrated local forecast.

Validation:

```sh
npm test
npm run build
node scripts/qa-integration.mjs
```

Browser QA requires both servers and installed Google Chrome. Screenshots and its report go to ignored `artifacts/`. The original fixture QA scripts are historical references.

See [UI integration](../../docs/UI_INTEGRATION.md) for supported actions, environment configuration, architecture, and demo steps. External settlement and unsupported rent/tax/interest-rate economics remain future work.

Map data: Natural Earth via datasets/geo-countries; public domain. Three-globe renders the globe, and Canvas renders the fixed city geometry.
