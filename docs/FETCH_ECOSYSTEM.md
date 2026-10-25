# Economy God Mode — 10-Agent Autonomous Fetch.ai Economic Ecosystem

![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)
![tag:hackathon](https://img.shields.io/badge/hackathon-5F43F1)
![uagents:0.25.5](https://img.shields.io/badge/uagents-0.25.5-blue)

This module implements a complete multi-agent decentralized economy powered by Fetch.ai `uagents`. Ten specialized autonomous economic agents operate with distinct cryptographic identities, Pydantic message schemas, bilateral and multilateral protocols, and direct integration with the Economy God Mode simulation engine.

---

## The 10 Autonomous Fetch.ai Agents

| # | Agent Name | Fetch Bech32 Address Prefix | Core Economic Role | Primary Protocols |
|---|------------|------------------------------|-------------------|-------------------|
| 1 | `central_bank` | `agent1q2z9...` | Macro-prudential authority & rescue policy | `CrisisStressInquiry`, `PolicyRescueReport` |
| 2 | `commercial_bank` | `agent1qtrt...` | Credit underwriter & CAR capital officer | `CreditApplicationMessage`, `UnderwritingDecisionMessage` |
| 3 | `corporate_borrower` | `agent1qwca...` | Enterprise liquidity & payroll financing | `PayrollAuditInquiry`, `PayrollGapReport` |
| 4 | `procurement_buyer` | `agent1qf48...` | Supply chain buyer & contract bidding | `ProcurementInquiry`, `ProcurementBiddingReport` |
| 5 | `supplier_quotation` | `agent1qvkr...` | Dynamic pricing & counteroffer review | `QuoteRequestMessage`, `CounterOfferReviewMessage` |
| 6 | `treasury_macro` | `agent1qwm4...` | Sovereign debt oracle & duration repricing | `TreasuryDataQuery`, `DebtShockEstimateRequest` |
| 7 | `apify_wage_oracle` | `agent1qtv9...` | Minimum wage ($19.61/hr) & price oracle | `WageBenchmarkQuery`, `MenuPriceBasketQuery` |
| 8 | `clearinghouse_settlement` | `agent1qgyt...` | Interbank reserve netting & contagion firebreak | `InterbankExposureAuditRequest`, `NettingSettlementProposal` |
| 9 | `household_welfare` | `agent1qwkf...` | Consumer welfare & demand multiplier | `WelfareAuditRequest`, `CashStimulusImpactQuery` |
| 10 | `auditor_inspector` | `agent1q2qp...` | Double-entry invariance & fraud audit | `InvarianceAuditRequest`, `FraudAuditReport` |

---

## Multi-Agent Interaction Workflows

### 1. Corporate Credit Negotiation Pipeline
```
[Corporate Borrower Agent] ──(Audit Payroll Gap)──> Shortfall identified
        │
        ├──(CreditApplicationMessage)──> [Commercial Bank Agent]
        │                                         │
        │                                (Underwrite & Capital Buffer Check)
        │                                         │
        │<──(UnderwritingDecisionMessage)─────────┘
        │
        └──(Terms Accepted / Credit Disbursed)
```

### 2. Supply Chain Procurement & Quotation Pipeline
```
[Procurement Buyer Agent] ──(QuoteRequestMessage)──> [Supplier Quotation Agent]
        │                                                        │
        │<──(Initial Quote: $12.00, 50% down, 3 ticks)───────────┘
        │
        ├──(CounterOffer: $10.80, 30% down, 5 ticks)────────────> [Supplier Quotation Agent]
        │                                                        │
        │                                                (Margin Reservation Check)
        │                                                        │
        │<──(CounterOffer Accepted: $10.80)──────────────────────┘
        │
        └──(Procurement Contract Executed)
```

### 3. Systemic Crisis Orchestration Pipeline
```
[Treasury Macro Agent] ──(Duration Repricing Alert)──> [Central Bank Agent]
                                                               │
                                                    (Test 3 Futures)
                                                               │
        ┌──────────────────────────────────────────────────────┴──────────────────────────────────────┐
        ▼                                                      ▼                                      ▼
[Clearinghouse Netting]                              [Household Welfare]                    [Auditor Inspector]
(Netting saves 55% liquidity)                   (Demand multiplier 1.38x)              (Invariance: 0 cent delta)
```

---

## Running the Ecosystem

### 1. List all 10 agents and their addresses
```bash
PYTHONPATH=. .venv-fetch/bin/python -m scripts.run_fetch_ecosystem --list
```

### 2. Run all 10 agents concurrently in a Fetch.ai Bureau
```bash
PYTHONPATH=. .venv-fetch/bin/python -m scripts.run_fetch_ecosystem --bureau --port 8100
```

### 3. Execute an end-to-end multi-agent workflow
```bash
# Credit negotiation
PYTHONPATH=. .venv-fetch/bin/python -m scripts.run_fetch_ecosystem --workflow credit

# Supply chain procurement
PYTHONPATH=. .venv-fetch/bin/python -m scripts.run_fetch_ecosystem --workflow procurement

# Systemic crisis response
PYTHONPATH=. .venv-fetch/bin/python -m scripts.run_fetch_ecosystem --workflow crisis
```

### 4. Run the full verification suite
```bash
PYTHONPATH=. .venv-fetch/bin/python -m scripts.verify_fetch_ecosystem
```
Output evidence is saved to `artifacts/fetch-ecosystem-verification.json`.
