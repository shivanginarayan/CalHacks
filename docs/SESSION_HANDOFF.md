# Economy God Mode — new-chat handoff

This is durable repository context saved at the user's request. Read this before continuing; do not start a new implementation task until the user requests one. All tasks below marked complete are already implemented. Do not repeat external deployments/collections merely to recover context.

## Workspace and Git

- Windows PowerShell, repository: `C:/Users/naray/Downloads/Calhacks`.
- GitHub: https://github.com/shivanginarayan/CalHacks.git, branch `main`.
- Latest fetched upstream commit: `2a3eba2 Rebuild San Francisco diorama to match demo reference`, following `9b4e73a Integrate live dashboard and optional sponsor workflows`.
- Local checkpoint `17c00d0 Add sourced public inputs and verified track demonstrations` preserves the previously uncommitted Treasury/Apify/report/track work and handoff. Merge `05cdbcf` incorporates `origin/main` without rewriting either side. The live-city integration follow-up is described below; inspect current `git log`/status for its final identity.
- These local commits have **not been pushed**. The user asked to get latest GitHub code and integrate it, not to publish local changes. Private environment, ignored data, source credential document and generated artifacts remain excluded from Git. A credential-value scan before checkpointing found zero matches in publishable files, including DOCX XML.
- Git identity previously verified: `shivanginarayan <narayan.shivangi@gmail.com>`. The user explicitly wants commits/pushes as them, without Codex coauthor attribution or collaborator invitations.
- User's earlier push requests have been completed. No new push was requested for the latest work; do not assume it has reached GitHub.

## User's direction and preferences

- Build the original Economy God Mode hackathon idea, not an unrelated product. Teammate provides UI; backend/integration is our responsibility.
- Explain the product and UI in simple terms. The user is learning the economy/crisis concepts and needs concrete controls and stories.
- Key request: believable reasons behind financial shocks, grounded in API data with visible assumptions.
- Key correction: **no manual fetch prerequisite for Apify data**. Opening the app must load public inputs automatically; new UI worlds default to those inputs.
- Continue authorized work autonomously; avoid unnecessary approval questions. No delegation/subagents unless explicitly requested or required by applicable instructions.
- Do not label synthetic balances, fixtures, scripted controllers, or assumed causal relationships as real data or live sponsor usage.
- Source strategy documents: root `ECONOMY GOD MODE — Detailed Engineering & Track Strategy.docx` and `to do.docx`. Their plans were implemented incrementally; read selectively if needed.
- `Free api resources cal hacks.docx` contains credentials and is explicitly ignored. Never dump its contents or commit it.

## What the product does

A small virtual economy: households earn/spend; businesses borrow, pay wages, procure materials and produce goods; banks lend/settle and can suffer losses; public institutions can provide support. Financial distress can spread through credit, missed payroll, defaults and spending. Users trigger shocks, compare calculated futures and inspect/approve agent recommendations.

The engine remains synthetic and is not a calibrated forecast of San Francisco. Real public reference data and limited collected price/wage samples ground selected inputs. Decorative geography does not imply actual resident-level or bank-level records.

## Backend and accounting

- Python FastAPI/Pydantic/httpx; SQLite full-world checkpoints. API version last observed `0.9.0`.
- Integer USD cents; double-entry accounting, exact-once transaction keys, atomic journal/state/events, audit invariants.
- Households, businesses, commercial banks, government and central bank. Defaults: 40 households, 8 businesses, 5 banks, seed 42.
- Wages, stock-limited purchases, credit issuance/repayment, maturities/refinancing/defaults, interbank exposures/clearing, bank capital/liquidity and risky-asset shocks.
- `finite_v1` production: raw materials become finished goods, production/sales recognize inventory values, supplier bills mature and can default. Legacy worlds retain previous semantics.
- Starting scenarios: `standard`, `credit_crunch`, `supply_crunch`.
- Three agent workflows: central-bank policy, business/bank credit negotiation, buyer/supplier procurement. Bounded tools, persisted public traces, validated arguments and separate financial settlement.
- Persistent background jobs, heartbeats, queued cancellation; playback Play/Pause/speed/manual step/reset; ordered replayable SSE.
- Fork Reality: three isolated branches (`no_intervention`, `bank_lending`, `household_cash`) from the same snapshot and matched RNG, with immutable timelines/audits/deltas. Its ranking is rule-based, separate from agent recommendations.
- Recommendation application and settlements reject stale snapshots. Keep paused between analysis and apply. Applying a recommendation is an explicit user action.

## Connected UI

- Active entry: `apps/web/src/main.tsx` -> `ConnectedApp.tsx`. `App.tsx` reexports ConnectedApp; old fixture components remain for reference/tests and are not the live data path.
- `apps/web/src/state/store.ts`: backend state/actions, SSE, polling, jobs, explicit settlement.
- `apps/web/src/ui/LiveDashboard.tsx`: controls/KPIs, inspector, network, crisis, forks, agent progress and integrations.
- `apps/web/src/data/api.ts`: typed API, currency conversion once, retry-safe request IDs (`postOnce`).
- Globe -> US -> San Francisco -> choose starting world -> Create and explore economy. Saved world restores on reload.
- Play advances days automatically (about 1 day/sec at 1×); it does not itself run LLMs or trigger a crisis. The bottom arrow steps one day.
- Trigger Crisis manually writes down a bank's risky investments. A 40% investment loss is not a 40% removal of customer deposits.
- Test rescue policies runs central-bank analysis (12-day horizon, maximum gross support $10,000); Apply recommendation is separate.
- Inspect business -> Review payroll credit / Negotiate supplies -> inspect role traces -> settle accepted credit or confirm contract/down payment.
- Supply-crunch recovery: step one day, inspect Business 1, negotiate supplies, confirm, step again and inspect production.

## Live Nemotron

- Actual provider: Nebius, model `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`.
- Base URL: `https://api.tokenfactory.nebius.com/v1`.
- Credentials only in ignored root `.env`; never include values in output, docs, prompts, source or Git.
- Provider forces function calls, max 4096 output tokens, disables Nemotron thinking for bounded tool output, gives integer-cent/qualitative-rationale instructions, sanitizes errors. Hidden reasoning is not saved.
- All three live workflows were previously verified, plus the Fetch backend conversation. No silent demo fallback on provider failure.
- One old persisted central-bank job failed before creating a report; cause unconfirmed. A fresh live retry completed with three tools and no intervention applied. Do not claim a root cause was fixed.

## Completed: sourced debt shock stories

Files: `backend/shock_stories.py`, `apps/web/src/ui/ShockStory.tsx`, `tests/test_shock_stories.py`, `scripts/qa-shock-story.mjs`, `docs/SHOCK_STORIES.md`.

- UI: **Build a sourced crisis story**. Uses keyless Treasury Debt to the Penny API, sorted latest record, exact Decimal debt, source and retrieval/observation dates.
- Hypothetical debt increase defaults to 25%. **Debt growth is not used to infer yields or bank losses.** Separate user assumptions: yield increase 200 bps, modified duration 5 years, bond exposure 50% of synthetic risky portfolio.
- First-order duration approximation: exposure fraction × modified duration × yield change -> risky-portfolio loss. Defaults imply 5%, not 25%.
- Preview saves immutable evidence and changes no money. Explicit apply requires paused unchanged snapshot, records journaled bank investment/equity loss and provenance event. Retries return the original receipt, even after advancement.
- Nemotron `inspect_economy` observations include the applied story context and distinguish hypothetical inputs from causal estimates.
- Zero-loss assumptions cannot apply a financial shock. Data failures do not substitute fixtures. Old observations are flagged.
- Live Treasury browser QA verified preview/no mutation, one-time application, analysis context, forks, reload, mobile and balanced audit.
- War, oil-cost pass-through, taxes/rent/interest economics and policy-to-rate causal models are **not implemented**. Do not present a narrative label as a validated causal model.

## Completed: real Apify collection

The user's Apify token is privately saved as `APIFY_TOKEN` in ignored root `.env`. It authenticates to their account. `APIFY_ACTOR_ID` is also saved there. Never echo either token or other secret values.

- We deployed private Actor `economy-public-sf` (ID `dQa3e0pZnc0FSj276`) under the user's account. Verified `isPublic=false`, `actorPermissionLevel=LIMITED_PERMISSIONS`, successful build and real runs.
- Official general-purpose Cheerio scraper refused execution pending full-account permission approval. We did **not** grant it; instead built the private limited-permission Actor.
- Actor source in `apify_actor/main.py` + Dockerfile: Python stdlib, fixed allowlisted sources, robots.txt check, exact parsing, excludes scripts, no arbitrary URLs, writes only its default dataset via run-scoped token. Public source requests never receive the Apify token.
- Source 1: Cafe Seventy8 public menu (`https://www.cafeseventy8.com/`): **29 posted drink-price options**, named items and source/timestamp. Sizes are not guessed; tax/surcharges unspecified. One venue is not a city price index.
- Source 2: SF official wage page (`https://www.sf.gov/information/understanding-minimum-wage-ordinance`): **one general statutory minimum wage reference**, observed $19.61/hour effective July 1, 2026. This is a legal floor, not average earnings. Assumed eight-hour day -> 15,688 cents/day. Source may change; parse current page, never hardcode this as perpetually current.
- Initial successful price/wage runs: `3Ige9F2xAe11Vxct9`, `l3dOGoqezfzFbsYy9`. Later verified browser collection: `067gqfNIFsQ8EfcBw`, `5qAj07cp4vVTgzWo5`. Provenance stored in local calibrations.
- `scripts/deploy_apify.py`: create private Actor/version and build; updates `.env` Actor ID. Do not redeploy unnecessarily.
- `backend/apify_recipe.py`: fixed categories; 128 MB, 120 sec/run, no proxy/restarts. `maxTotalChargeUsd=.25` is included but is not an all-inclusive platform billing cap. Two runs per collection. UI shows reported run usage.
- `scripts/apify_calibrate.py`: reusable collector and generic explicit-spec CLI; bearer authentication, numeric unit conversion, run/dataset/source/observation provenance and reported usage.
- `backend/apify_collection.py`: durable jobs and request mappings; shared active work, completed work reused for five minutes, max six collections/hour, recorded run IDs and sanitized errors. Interrupted/ambiguous requests are not immediately replayed.
- Calibration JSON under ignored `data/calibrations/`, immutable IDs. Worlds freeze the full sample/provenance object and checksum; forks/reset preserve that exact object, including when source file changes/disappears.
- Entity identities, private balances, loan portfolios, employment, budgets and behavior remain simulated. New business prices are actually sampled from collected prices and household wages use the explicit collected reference.

## Latest completed change: automatic loading on app open

- The user disliked having to click to collect. That requirement has been removed.
- `apps/web/src/state/publicInputs.ts` is shared Zustand state with a single initialization promise. `ConnectedApp` initializes it immediately on mount, including globe view.
- `POST /api/calibrations/ensure` returns latest valid cached data immediately. If missing or more than **six hours old**, it starts background collection. Multiple tabs share a durable automatic request ID per six-hour window. Failed/ambiguous automatic jobs are not replayed by reloads in that window; a later window can start a new collection.
- Cached public data remains usable during refresh failure. The initial missing-cache collection runs automatically with visible progress. World creation waits for the first dataset rather than substituting synthetic values.
- `readyPublicInputs()` supports world creation; completion publishes job+dataset atomically so a waiting creator does not reject between job completion and dataset retrieval.
- UI `PublicDataPanel.tsx` reads shared state, shows automatically loaded data and source evidence. Optional manual override is under **Refresh options -> Refresh public inputs now**. No collection click is required.
- `WorldDataOptions` defaults to latest public inputs. Explicit seeded synthetic demo remains an option. Existing worlds keep their frozen history and are not silently migrated or reset.
- `scripts/qa-apify-auto.mjs`: verified automatic loading without clicks, public-input world creation, reload without new crawl and frozen inputs.

## Other sponsor integrations and real verification status

- **Census/FDIC:** actual public SF population and bank-headquarters reference APIs implemented and previously verified. They do not replace simulated institutions/balances. Census vintage/date and FDIC headquarters-vs-branches distinction are explicit.
- **Fetch:** bounded backend chat accepts stress-test sentence + saved-evidence why follow-up; live Nemotron verified, ACP SDK validated. Optional ASI adapter exists. Prior supplied credentials returned 401; Agentverse registration and ASI:One discovery/chat remain unverified. Separate `.venv-fetch`, private seed/token ignored.
- **CRS:** fraud screens, guarded $1 simulated payment, optional credit reports, redacted caching, vendor mappings, strict eligibility and human escalation implemented/tested. Real credentials, product config, sponsor test profiles and field mappings still needed. No successful live CRS report claimed.
- **Human approval:** credit above configured thresholds or flagged evidence can require reasoned approve/decline. Approval moves no money; settlement separate, revalidates snapshot/evidence. Blocked identity cannot be overridden. Local operator is not authenticated production reviewer.
- **SpacetimeDB:** actual TypeScript SDK 2.13 module with public immutable keyed events and private publisher; owner-only ingest. Backend durable cursor/retry mirror and SQL read UI. Previously live-verified 20 events, duplicate replay unchanged, unauthorized/conflicting writes denied, ledger balanced. SQLite remains source of truth. Optional local service may be stopped.
- **x402:** actual Python SDK 2.25 isolated `.venv-x402`; optional 0.01 test USDC research on Base Sepolia only, unchecked opt-in UI, bounded buyer and at-most-one attempt/run, verified receipt/log logic. Real local 402 challenge verified; facilitator/RPC tests mocked. Buyer wallet unfunded; **no successful on-chain payment claimed**. Private wallets ignored. No mainnet or simulated-ledger debit.
- **Nessie:** optional, not implemented. Track eligibility and broad production claims are not guaranteed by having adapters.

## Run locally

From repository root in two PowerShell terminals:

```powershell
# First setup if needed:
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
# API: loads supported private .env settings, shell variables take precedence.
.\.venv\Scripts\python.exe -m scripts.run_backend --reload
```

```powershell
# Node 22 or 24; npm ci only for initial setup/dependency changes.
npm ci
npm run dev
```

App http://127.0.0.1:5173; API http://127.0.0.1:8000/docs; health `/health`. Vite proxies `/api` and `/health` to 8000. No frontend provider secrets. Plain Uvicorn does not load root `.env`; prefer the launcher.

Runtime state is ephemeral. At handoff save, Vite listened on 5173, but **no backend listener on 8000** was observed. Start API if needed. Servers often stop between chat turns. A Windows venv may spawn the base Anaconda Python executable; that alone does not prove the wrong environment. Watch/reload sometimes failed to load new routes; confirm OpenAPI and restart only the known project service if needed, preserving SQLite.

## Latest milestone: Hyphenate and Apify judging preparation

- The user asked to finish Hyphenate and Apify first; other sponsor tracks are deferred. No Devpost submission, new commit/push or public Actor publication has been performed.
- New `docs/HYPHENATE_APIFY_SUBMISSION.md`: timed three-minute demo, copy-ready sponsor descriptions, source scope, official event listing and final submission checklist. Linked from README, submission evidence and Apify docs.
- New `apify_actor/README.md`: custom Actor input/output, fixed-source behavior, deployment and review instructions. Corrected stale manual-fetch instructions in `docs/APIFY.md` and world-setup helper text.
- New `scripts/qa-hyphenate-apify.mjs --live`: records actual UI video/screenshots/evidence in timestamped ignored artifacts; real Nebius credit review, human gate, no-money-on-approval, separate exactly-once settlement, frozen Apify inputs, crisis/forks and live policy analysis without applying support. Creates separate worlds. Requires Playwright FFmpeg; installed locally under ignored `artifacts/playwright` (set `PLAYWRIGHT_BROWSERS_PATH` to that directory when running).
- Found a real live reliability failure: the bank proposed principal exceeding the observed request, then repeatedly tried to decide after its assessment was rejected. The engine blocked all calls and moved no money. Fixed `backend/credit_agents.py` to expose bank tools by successful prerequisites: inspect, optional CRS evidence, assessment, then decision. Handlers still validate calls; amount/decision remain model choices. Added a regression in `tests/test_credit.py` proving a rejected assessment can recover while human approval still blocks auto-settlement.
- Successful live combined run: `artifacts/hyphenate-apify-2026-10-25T03-45-18-795Z/evidence.json`. Actual Nemotron, all checks passed. The public-input scenario ended with zero employment/eight business defaults at day 12 in all three branches; both intervention branches spent $10,000 gross support. Agent recommended no intervention. Do not reuse older seeded-demo job-saving claims for this world. Public observations do not calibrate all behavioral assumptions.
- Read-only Apify remote verification confirmed private `economy-public-sf`, `LIMITED_PERMISSIONS`, successful price run `PLoFlPlLZwdijjEtC` (29 dataset rows) and wage run `JUzC6dTwgHvTqwPto` (one row). Saved non-secret evidence under `artifacts/apify-remote-verification.json`; no redeploy or fresh crawl was needed for this check.
- Recording harness note: when switching worlds by localStorage, first stop the old page (navigate about:blank) and set the intended world via init script before navigating back. A late SSE/poll refresh can otherwise overwrite localStorage between evaluate and reload. The readable recapture at `03-47-50-350Z` passed credit but failed that harness switch; it is not the final successful evidence. The script now checks the selected world before shocking.
- **Final readable recording passed:** `artifacts/hyphenate-apify-2026-10-25T03-52-13-456Z/evidence.json`, six screenshots and `page@2cc9d7dd6010ba1c0fe36444b632a5e5.webm`. All six check groups passed, zero browser errors; actual live credit principal 78,440 cents. Final policy recommendation was `household_cash` at 1,000,000 cents, unlike the earlier live run's `no_intervention`; inspect each report rather than promising a fixed model decision or claiming an optimal policy. No recommendation was applied. The intermediate `03-50-23-416Z` recording passed all financial/policy checks but failed a harness-only opaque-origin localStorage error; both init scripts now guard the app origin. Preserve failure records as history, use `03-52-13-456Z` for submission evidence.
- Current task started the known project API on 8000 without reload, using `scripts.run_backend`; Vite was already running on 5173. Recheck listeners on later turns. Backend logs are ignored under artifacts.
- Current verification after the credit correction: **171 backend tests passed, one optional skipped; 38 frontend tests passed; production build passed**. Existing Starlette deprecation and large-bundle warnings remain. Full working diff whitespace check passed.

## Latest milestone: Microsoft and technical-complexity preparation

- The user asked to choose and finish two more tracks. Initially suggested Microsoft and Nebius × NVIDIA. Official research confirmed Nebius is a **separate online event**, requiring an open-source licensed public repository, public YouTube video and judge-accessible demo/test-build through December 15. An optional choice question was sent; no selection arrived during work. Stated the assumption of keeping immediate work in Cal Hacks: **Microsoft Built for the Real World and Most Technically Complex Hack**. Do not claim the user approved licensing, hosting or a Nebius submission.
- Official Hive prize cards were read after client-side loading: `https://hive.hackberkeley.org/prizes`. Microsoft criteria confirmed customer understanding, measurable usefulness, path to production, responsible design, end-to-end functionality. The same board independently confirmed Hyphenate criteria; corrected the earlier guide's lack-of-independent-verification note. Coinbase's brief link is `https://drive.google.com/file/d/12TnPLguduV3gh1zY_TJ176XmVDz2RGW9/view?usp=sharing` if later needed; not fetched in this task.
- Added **Download comparison report** in Fork Reality. `apps/web/src/data/comparisonReport.ts` generates standalone escaped HTML with exact final outcomes, baseline differences, audits, separate fiscal transfers/public loans, source snapshot and frozen public provenance, synthetic assumptions and shock context. Only a completed agent report bound to the exact fork ID and snapshot can be attached; otherwise the export explicitly says no AI recommendation is linked. Export changes no balances. It flags incomplete event-window context. Full report schema is typed separately in `ComparisonEvidence` to keep chart metric keys numeric.
- Added four meaningful frontend regressions (`tests/comparisonReport.test.ts`): honest zero-benefit wording/amount conversion, exact report/snapshot binding, escaped source data/real-vs-synthetic labels and world identity binding.
- `scripts/evaluate_track_scenarios.py --calibration-id sf_public_20261025_031613_cd6326`: five seeds (41–45), two explicit input modes, three branches, 12 days, 40% Bank 1 risky loss, $10,000 intervention budget. **All 30 final audits balanced; all ten sources unchanged.** Pure local calculations: no model/external collection calls, no saved-world changes. Outputs `artifacts/microsoft-technical-evaluation/evaluation.md` and full JSON.
- Evaluation: synthetic seed 42 reproduces +5 jobs / one fewer default for household support. Across all five public-reference seeds, all three strategies end at zero jobs/eight defaults; don't claim public inputs make the behavior calibrated or the policies effective. The complete evaluation retains unfavorable and zero-benefit results.
- `scripts/qa-comparison-report.mjs` passed public and seeded UI downloads, exact outcome/funding values, no source changes, no browser errors and mobile checks. Final standalone examples under `artifacts/microsoft-technical-evidence/public-comparison.html` and `seeded-comparison.html`; associated screenshots/verification JSON are ignored. Screenshots were visually inspected. No new inference or financial payment was required.
- New `docs/MICROSOFT_TECHNICAL_SUBMISSION.md`: customer hypothesis, measured simulation results, discovery questions, explicit production gaps, engineering evidence, copy-ready text and timed demo. Customer interviews, real-world savings and validated policy optimality remain unproven. Linked from README/submission evidence.
- New `docs/NEBIUS_SUBMISSION_READINESS.md`: honest separate-event checklist and observed provider-feedback draft. Runtime inference is verified; licensing choice, current-source publication, remote test access and public video/submission remain outstanding. No license was added.
- Latest frontend verification: **42 tests passed and production build passed**; existing bundle-size warning remains. Backend implementation was unchanged this milestone; the earlier full 171-pass/one-skip result still applies. Final diff whitespace check passed. Microsoft/technical preparation is complete; publishing and event submission have not been performed.

## Latest Fetch credential check

- The user supplied a Fetch API key in chat and authorized continuing Fetch setup. Saved the exact candidate privately under ignored `data/fetch-key-candidate.txt`; never echo, copy into source/docs, or commit it.
- Checked the unmodified candidate using bearer authentication against official `GET https://api.asi1.ai/v1/models` and authenticated `GET https://agentverse.ai/v2/agents?limit=1`. **Both returned HTTP 401.** No account changes, registration or model calls were made. Existing root environment configuration was not overwritten by this rejected candidate.
- Sanitized status evidence is under ignored `data/fetch-key-probe.json`. Asked the user which console issued the key (ASI:One developer console vs Agentverse Profile/API Keys vs another source); issuer clarification or a working service-specific credential is still needed. Do not treat a configured key string as successful authentication or claim Fetch track completion.

## Last verification

See the latest GitHub integration milestone below for the current frontend and browser results; earlier recorded demos show the previous miniature and remain historical evidence of the workflows.

- **171 backend tests passed**, one optional SDK module skipped; existing Starlette/httpx deprecation warning.
- **74 frontend tests passed**, production TypeScript/Vite build passed after merging and integrating the rebuilt diorama. Existing large-bundle warning remains.
- Earlier isolated x402 SDK suite: nine tests passed with mocked facilitator/RPC.
- `qa-apify.mjs`: real bounded collection, actual values used in new worlds, source world unchanged, default selection, reload, balanced tick, mobile.
- `qa-apify-auto.mjs`: no collection click, auto load, public world creation, reload no new crawl, frozen preservation.
- `qa-shock-story.mjs`: real Treasury baseline, no-mutation preview, one-time application, agent story context, branches, reload/mobile, balanced audit.
- Earlier core/supplier/human-approval/sponsor browser QA passed before latest changes. Avoid claiming a recent full rerun of all old scripts.
- `git diff --check` passed. Private environment-value scan of publishable files (including DOCX XML) found no actual secret matches before the latest automatic-loader changes, which introduced no secrets.

Useful verification commands:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
npm test
npm run build
node scripts/qa-apify-auto.mjs
# These consume external source/Apify usage; run only when necessary:
node scripts/qa-apify.mjs
node scripts/qa-shock-story.mjs
```

Browser scripts use installed Chrome headlessly. QA screenshots/reports are ignored under `artifacts/`. A discovered test pitfall: an addInitScript that always sets the initial world ID overwrites the newly saved world on reload. Use conditional initialization and wait for the new ID to persist before reload; do not misdiagnose that harness issue as a product bug.

## Documentation and next work

### Latest GitHub integration

- The user requested latest GitHub code and completion of integration. Used sync/commit skills to create the local checkpoint, fetched `origin`, and merged the one incoming diorama commit. A merge preserved both histories; no existing commit was rewritten and no push was made.
- Incoming work rebuilds city geometry, landmarks, camera/LOD, static caching and 400 pooled visual movers. `ConnectedApp` remains the active app; the source fixtures provide scenery only, not live financial results.
- Found/fixed stale object bindings in the new canvas: bindings refresh from current backend objects on financial events/state changes. Featured bank buildings bind bank IDs, street shops bind businesses, remaining banks use available towers/offices, households bind homes, and public institutions retain landmark bindings. Layout/path IDs remain decorative and unchanged. Active-but-lending-constrained banks now show stress; closures come from actual business status.
- Bound business closures and activity update without remounting the canvas or rebuilding static scenery. Visual demand/movement indices are explicitly proxies for simulated employment; they are not actual neighborhood observations. The 400 visual movers are not 400 independent financial/LLM agents.
- Connected incoming district navigation to the **active live** event feed. Filtering uses bound agent/counterparty IDs, has a clear-empty state, and labels the districts visual groupings. It does not substitute old fixture events or fake district financial reports.
- Added regressions for featured bindings, identity uniqueness, preserving decorative IDs, visual district membership, replacement world objects, business closures and active-but-constrained banks. Added `scripts/qa-live-city.mjs` for actual current-backend startup, café inspection, same-day stress overlays, closures, source preservation, camera/cache continuity, forks/export and mobile.
- Broader `node scripts/qa-integration.mjs` passed playback/speed/step, shock, calculated forks, demo policy application, real institution selection, supplier settlement/production recovery, reload/reset, mobile and zero browser errors. **Final `node scripts/qa-live-city.mjs` also passed all six check groups**, including district-feed filtering and clearing. Reports/screenshots are under ignored `artifacts/integration-*` and `artifacts/live-city-integration/`. No new live model calls, testnet payments, collections or credential changes were required.
- Geometry correctness checks exceeded Vitest's default five-second budget even in a standalone run (roughly 5.5–9.8 seconds for the slow cases). Gave only three expensive regeneration/tree-geometry tests a bounded 20-second timeout, retaining all assertions. **All 74 frontend tests and the final production build passed** afterward. The existing large-bundle warning remains.
- Incoming older visual-only browser scripts still assume legacy fixture entry buttons/inspectors. Use the current live-city check for the connected app instead of changing the product back to fixture state.
- Fetch authentication remains blocked by the supplied key's HTTP 401 results. Incoming GitHub changes do not alter Fetch code or credentials; do not claim the visual merge resolves that.

Read `README.md`, `UI_PLAN.md`, `docs/API.md`, `docs/UI_INTEGRATION.md`, `docs/APIFY.md`, `docs/SHOCK_STORIES.md`, `docs/TRACK_IMPLEMENTATION.md`, `docs/SUBMISSION_EVIDENCE.md` and specific sponsor guides as needed. `docs/openapi.json` includes current routes.

The latest user request is to get the latest GitHub code and complete integration; see the GitHub milestone above. Microsoft/technical and Hyphenate/Apify preparation remain complete. Subsequent work, **only when requested**: push local commits, publish or submit prepared materials, choose/finalize a separate Nebius entry, broader validated datasets, separate oil/war/policy models, remaining sponsor credentials/live demos, deployment/authentication. Do not overwrite current worlds to make them look real or claim local work has been pushed.

## Tool/environment notes

PowerShell exec often needed the normal escalation review in this environment; use scoped justifications, never bypass review. One interruption was an account usage-limit review failure, then the user reset the limit and authorized completion. It was not an unsafe-action finding. Avoid exposing secrets in tool output, URLs, process arguments or logs. Use `rg` for file/text searches; PowerShell does not expand Unix-style glob arguments to `rg` as expected (`rg backend/job*` failed); use `rg ... backend -g '*.py'` or exact paths.
