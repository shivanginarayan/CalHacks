# Economy God Mode

A frontend-only San Francisco economy demo, built from the supplied agent prompt and visual references.

Run from this workspace:

```sh
npm install
npm run dev
npm test
npm run build
```

Open http://127.0.0.1:5173. Recommended tooling: Node 22 LTS or Node 24 LTS. The current workspace's Node 23 runs the checks, but patched Vitest declares support for even-numbered LTS versions.

The demo path is United States → San Francisco → Explore this question → confirm → Run this scenario. Use Create World and Play; after six months, pause, expand Trigger Crisis and apply the default Bank 2 / commercial loans / 40% loss. Follow the Café 14 feed item into its inspector. Expand its payment activity. Test a rescue policy in the existing panel, inspect the three-source trace, and Accept or Reject. Fork Reality compares three futures. City / Network shares tick, branch, and selected institution. Escape navigates back; Space toggles playback outside form fields.

All economics are committed storyboards, not a running economy engine. Components consume backend-shaped data only through `apps/web/src/data/fixtures.ts`. Country boundaries, cities, and the muted Earth texture are local assets. There are no API keys, live LLM calls, databases, accounts, or runtime third-party asset requests. Mock, error, and not-connected agent states can be previewed in the inline provider-state disclosure. Real provider and x402 integration are intentionally absent.

The offline crisis storyboard supports Bank 2, commercial loans, and 40% loss. Other controls explain that limit rather than relabeling the same outcomes. Arbitrary prompt parsing is supported; custom economic outcomes and follow-up outcomes require the future backend adapter. A follow-up currently preserves the tick and previews the available Shock + Policy fixture; it explicitly says this in the panel. The three intervention branches share the month-6 crisis snapshot. The committed layout is fixed; no runtime city-generation or branching engine is implemented.

Three-globe renders the Earth. Transparent raster country caps use the local GeoJSON on a second sphere, avoiding conic triangulation artifacts across dateline boundaries; geographic ray picking makes every country interactive. Canvas 2D draws the miniature city with a cached static layer and 400 sampled visual movers. City activity, closures, and bank distress come from the selected fixture snapshot.

`npm test` verifies frontend contracts, parser cases, shared branch snapshots, fixture replay, layout stability, trace labels, payment obligations, ledger identity uniqueness, and frontend proposal validation. Simulation-engine conservation tests and alternate-seed generation tests are backend work; these tests do not pretend to implement or validate that backend.

Browser QA: `node scripts/qa.mjs` uses locally installed Chrome and blocks external requests. Screenshots, measured frame rate, and check results are in `artifacts/`. `node scripts/record-demo.mjs` records the three-minute demo using Playwright's FFmpeg helper (`npx playwright install ffmpeg`).

Map source: datasets/geo-countries, derived from Natural Earth. https://github.com/datasets/geo-countries . Natural Earth data is public domain. The local map has been reduced and styled for this demo.
