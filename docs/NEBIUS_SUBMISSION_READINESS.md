# Separate Nebius and NVIDIA event readiness

This is a separate online hackathon, not a Cal Hacks sponsor category. Its [official overview](https://nebiusglobalaihackathon.devpost.com/) and [official rules](https://nebiusglobalaihackathon.devpost.com/rules), checked October 24, 2026, require runtime Nebius/NVIDIA usage plus submission/access materials. The appropriate category for this project is **Best Apps and Agents**. The listed deadline is October 30, 2026 at 10 AM Pacific.

| Requirement | Current status |
| --- | --- |
| Runtime call to Token Factory or AI Cloud and an NVIDIA open model | Verified: actual Nebius Token Factory calls to `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`. See [integration evidence](./NEMOTRON.md). |
| Working coherent application | Local prototype and live recorded credit/policy flows verified; supplier workflow previously verified live. |
| Repository with an open-source license visible to judges | The earlier integration source was pushed to GitHub through `da84403`. The subsequent SpacetimeDB/x402 milestone has local changes; check Git status before publishing. A team-approved license has not been selected. Do not add a license on behalf of all contributors without resolving ownership and their choice. |
| Working demo, hosted app or test-build URL | Localhost is insufficient for remote judges. A judge-accessible test build or hosted deployment remains unverified. |
| Free unrestricted judging access through the end of judging | A funding/hosting/access arrangement remains outstanding; do not expose the current unauthenticated local API as a production service. The rules list judging through December 15, 2026. |
| Public YouTube video under three minutes | A 1:49 silent local recording exists. It shows actual live calls and the model label; public YouTube upload and a track-specific explanation remain outstanding. |
| Description, track selection and developer feedback | Draft integration description and feedback below; no event submission has been made. |

## Draft integration description

Economy God Mode uses NVIDIA Nemotron through the Nebius Token Factory inference API to drive bounded financial-agent workflows. Business and bank roles inspect payroll needs, assess credit and propose terms. A central-bank role calls a simulation tool to compare interventions on isolated copies before recommending a strategy. The engine validates tool arguments, financial constraints, source snapshots and settlement permissions. Agents cannot change balances through prose.

Actual live provider/model labels and public tool traces are saved with reports. Demo controllers remain an explicit separate mode. Function calls are required, output is bounded, monetary arguments use integer cents and errors remain inspectable. No silent demo fallback is used. The system's financial state is synthetic, and selected Apify observations do not make it a calibrated forecast.

## Draft feedback based on observed integration work

Token Factory's chat-completions interface let the existing tool-oriented backend call Nemotron without changing the financial engine. Authenticated model discovery confirmed the configured model, and live credit/policy workflows produced valid inspectable calls. The initial thinking-enabled configuration could use its bounded output before emitting a tool call; disabling thinking for these bounded tool workflows allowed completed function-call runs. This is an observed integration configuration issue, not a comparative throughput benchmark.

We also observed an invalid credit assessment followed by repeated attempts to decide without a successful assessment. Deterministic guards prevented financial mutation. Exposing tools by completed prerequisites improved the live workflow without removing backend validation. Useful provider examples would cover bounded tool execution, prerequisite failures and recoverable monetary argument errors. We did not evaluate Nebius AI Cloud compute, Serverless Jobs, Serverless Endpoints, Tavily or other NVIDIA tools and make no claims of using them.

## Remaining entry steps

Select and approve the repository's intended license with the team, publish the intended source, provide and verify remote test access, confirm inference/hosting availability through judging, upload the public YouTube demonstration, review eligibility as a team and complete the separate Devpost entry. Choosing this event does not automatically complete those steps, and existing Cal Hacks assets are not a submitted Nebius entry.
