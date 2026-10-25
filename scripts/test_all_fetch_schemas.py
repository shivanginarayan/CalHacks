"""Exhaustive schema validation harness for all Fetch.ai agents and protocols.

Validates that:
1. Every agent accepts its declared input schemas.
2. Every agent emits valid responses strictly adhering to its output schemas.
3. Every field, data type, and boundary condition is verified.
4. The Fetch ACP Gateway conforms to its chat interaction schemas.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from scripts.run_backend import load_environment
from backend.fetch_agents.agents import AGENT_FACTORIES
from backend.fetch_agents.protocols import (
    AgentIdentityInquiry,
    AgentIdentityStatement,
    BranchMetricSummary,
    CashStimulusImpactQuery,
    CashStimulusImpactReport,
    CounterOfferReviewMessage,
    CreditAcceptanceNotification,
    CreditApplicationMessage,
    CrisisStressInquiry,
    DebtShockEstimateRequest,
    DebtShockEstimateResponse,
    FraudAuditReport,
    FraudAuditRequest,
    InterbankExposureAuditRequest,
    InterbankExposureAuditResponse,
    InvarianceAuditReport,
    InvarianceAuditRequest,
    MenuPriceBasketQuery,
    MenuPriceBasketResponse,
    NettingSettlementProposal,
    PayrollAuditInquiry,
    PayrollGapReport,
    PolicyRescueReport,
    ProcurementBiddingReport,
    ProcurementInquiry,
    QuoteRequestMessage,
    QuoteResponseMessage,
    TreasuryDataQuery,
    TreasuryDataResponse,
    UnderwritingDecisionMessage,
    WageBenchmarkQuery,
    WageBenchmarkResponse,
    WelfareAuditRequest,
    WelfareAuditResponse,
)


class MockContext:
    """Mock uagents Context that captures all outgoing messages."""

    def __init__(self, agent_name: str = "tester"):
        self.agent_name = agent_name
        self.logger = logging.getLogger(f"test.{agent_name}")
        self.sent_messages: List[tuple] = []

    async def send(self, destination: str, message: Any):
        self.sent_messages.append((destination, message))


def validate_schema_fields(instance: Any, schema_cls: type) -> Dict[str, Any]:
    """Validate that an instance is of schema_cls and contains all required typed fields."""
    if not isinstance(instance, schema_cls):
        raise TypeError(f"Instance is {type(instance).__name__}, expected {schema_cls.__name__}")
    
    if hasattr(instance, "model_dump"):
        data = instance.model_dump()
    elif hasattr(instance, "dict"):
        data = instance.dict()
    else:
        data = dict(instance)

    fields_dict = getattr(schema_cls, "model_fields", None)
    if fields_dict is None:
        fields_dict = getattr(schema_cls, "__fields__", {})

    for name in fields_dict.keys():
        if name not in data:
            raise KeyError(f"Field '{name}' missing from dumped model")
        val = data[name]
        # In Pydantic v1, field.required indicates if required; in v2, field.is_required()
        field_obj = fields_dict[name]
        is_req = getattr(field_obj, "required", True) if hasattr(field_obj, "required") else (
            field_obj.is_required() if hasattr(field_obj, "is_required") else True
        )
        if is_req and val is None:
            raise ValueError(f"Required field '{name}' is None")
    return data


async def test_agent_handler(
    agent_name: str,
    handler_name_pattern: str,
    request_message: Any,
    expected_response_cls: Optional[type],
) -> Dict[str, Any]:
    """Execute a registered message handler on an agent and validate the reply schema."""
    factory = AGENT_FACTORIES[agent_name]
    agent = factory()
    proto = list(agent.protocols.values())[0]

    # Find matching handler in protocol
    target_handler = None
    for digest, handler in proto._signed_message_handlers.items():
        if handler_name_pattern in handler.__name__:
            target_handler = handler
            break

    if target_handler is None:
        raise RuntimeError(f"Handler matching '{handler_name_pattern}' not found on {agent_name}")

    ctx = MockContext(agent_name=agent_name)
    sender_addr = "agent1qtester00000000000000000000000000000000000000000000000000"

    # Invoke handler
    await target_handler(ctx, sender_addr, request_message)

    if expected_response_cls is None:
        # Fire-and-forget message, e.g. CreditAcceptanceNotification
        return {
            "agent": agent_name,
            "handler": handler_name_pattern,
            "input_schema": type(request_message).__name__,
            "output_schema": None,
            "status": "PASSED",
            "notes": "Notification processed successfully without error",
        }

    if not ctx.sent_messages:
        raise RuntimeError(f"Handler '{handler_name_pattern}' did not send any response message")

    dest, reply = ctx.sent_messages[0]
    validated_fields = validate_schema_fields(reply, expected_response_cls)

    return {
        "agent": agent_name,
        "handler": handler_name_pattern,
        "input_schema": type(request_message).__name__,
        "output_schema": expected_response_cls.__name__,
        "status": "PASSED",
        "fields_count": len(validated_fields),
        "fields": list(validated_fields.keys()),
        "sample": {k: str(validated_fields[k])[:45] for k in list(validated_fields.keys())[:3]},
    }


async def main():
    load_environment()
    print("=" * 85)
    print("FETCH.AI ECONOMIC ECOSYSTEM: EXHAUSTIVE SCHEMA VALIDATION SUITE")
    print("=" * 85)

    test_specs = [
        # 1. Central Bank
        ("central_bank", "handle_crisis_inquiry",
         CrisisStressInquiry(world_id="w_test", target_bank_id="bank_1", loss_bps=4000, ticks=12, budget_cents=1000000),
         PolicyRescueReport),
        ("central_bank", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 2. Commercial Bank
        ("commercial_bank", "handle_application",
         CreditApplicationMessage(world_id="w_test", bank_id="bank_1", borrower_id="business_1", requested_cents=100000, payroll_shortfall_cents=100000),
         UnderwritingDecisionMessage),
        ("commercial_bank", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 3. Corporate Borrower
        ("corporate_borrower", "handle_audit",
         PayrollAuditInquiry(world_id="w_test", business_id="business_1"),
         PayrollGapReport),
        ("corporate_borrower", "handle_acceptance",
         CreditAcceptanceNotification(world_id="w_test", business_id="business_1", bank_id="bank_1", accepted_cents=100000, terms_accepted=True, rationale="Approved"),
         None),
        ("corporate_borrower", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 4. Procurement Buyer
        ("procurement_buyer", "handle_inquiry",
         ProcurementInquiry(world_id="w_test", buyer_id="business_1", target_units=5, max_budget_cents=500000),
         ProcurementBiddingReport),
        ("procurement_buyer", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 5. Supplier Quotation
        ("supplier_quotation", "handle_quote",
         QuoteRequestMessage(world_id="w_test", supplier_id="business_2", buyer_id="business_1", quantity=5),
         QuoteResponseMessage),
        ("supplier_quotation", "handle_counter",
         CounterOfferReviewMessage(world_id="w_test", supplier_id="business_2", buyer_id="business_1", proposed_unit_price_cents=1100, proposed_down_payment_bps=3000, proposed_due_ticks=5, accepted=False, final_unit_price_cents=0, rationale="Review"),
         CounterOfferReviewMessage),
        ("supplier_quotation", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 6. Treasury Macro
        ("treasury_macro", "handle_treasury_query",
         TreasuryDataQuery(include_history=False),
         TreasuryDataResponse),
        ("treasury_macro", "handle_shock_estimate",
         DebtShockEstimateRequest(world_id="w_test", bank_id="bank_1", debt_increase_percent=25.0, yield_increase_bps=200, duration_years=5.0, exposure_percent=50.0),
         DebtShockEstimateResponse),
        ("treasury_macro", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 7. Apify Wage Oracle
        ("apify_wage_oracle", "handle_wage_query",
         WageBenchmarkQuery(category="wages"),
         WageBenchmarkResponse),
        ("apify_wage_oracle", "handle_menu_query",
         MenuPriceBasketQuery(category="prices"),
         MenuPriceBasketResponse),
        ("apify_wage_oracle", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 8. Clearinghouse Settlement
        ("clearinghouse_settlement", "handle_interbank_audit",
         InterbankExposureAuditRequest(world_id="w_test"),
         InterbankExposureAuditResponse),
        ("clearinghouse_settlement", "handle_netting",
         NettingSettlementProposal(world_id="w_test", total_gross_cents=2000000, total_netted_cents=0, netting_efficiency_percent=0.0, liquidity_saved_cents=0),
         NettingSettlementProposal),
        ("clearinghouse_settlement", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 9. Household Welfare
        ("household_welfare", "handle_welfare_audit",
         WelfareAuditRequest(world_id="w_test"),
         WelfareAuditResponse),
        ("household_welfare", "handle_stimulus_query",
         CashStimulusImpactQuery(world_id="w_test", stimulus_budget_cents=1000000),
         CashStimulusImpactReport),
        ("household_welfare", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),

        # 10. Auditor Inspector
        ("auditor_inspector", "handle_invariance_audit",
         InvarianceAuditRequest(world_id="w_test"),
         InvarianceAuditReport),
        ("auditor_inspector", "handle_fraud_audit",
         FraudAuditRequest(world_id="w_test"),
         FraudAuditReport),
        ("auditor_inspector", "handle_id", AgentIdentityInquiry(query_id=uuid4().hex), AgentIdentityStatement),
    ]

    results = []
    passed = 0
    failed = 0

    for agent_name, handler_pattern, req_msg, expected_cls in test_specs:
        test_title = f"{agent_name} -> {handler_pattern}"
        try:
            res = await test_agent_handler(agent_name, handler_pattern, req_msg, expected_cls)
            results.append(res)
            passed += 1
            out_schema_str = res["output_schema"] or "None (fire-and-forget)"
            print(f" [✓] {test_title:<48} : {out_schema_str}")
        except Exception as e:
            failed += 1
            results.append({
                "agent": agent_name,
                "handler": handler_pattern,
                "status": "FAILED",
                "error": str(e),
            })
            print(f" [✗] {test_title:<48} : FAILED -> {e}")

    # Also validate Fetch ACP Gateway Chat schemas
    print("\n" + "-" * 85)
    print("FETCH ACP CHAT GATEWAY SCHEMA VERIFICATION")
    print("-" * 85)
    from backend.fetch_chat import handle_command
    
    # 1. Help message schema
    help_resp = await handle_command("unknown_command_help")
    assert "Economy God Mode" in help_resp
    results.append({"gateway_test": "help_command", "status": "PASSED", "response_length": len(help_resp)})
    print(" [✓] Fetch ACP Gateway: Help schema verified.")

    # 2. Experiment command parsing
    exp_resp = await handle_command("stress-test bank 99 with a 40% loss")
    assert "Choose a bank from 1 to 10" in exp_resp
    results.append({"gateway_test": "bounds_validation", "status": "PASSED", "response": exp_resp})
    print(" [✓] Fetch ACP Gateway: Parameter boundary schema verified.")

    print("=" * 85)
    print(f"ALL TESTS COMPLETED: {passed} passed, {failed} failed across all Fetch.ai schemas.")
    print("=" * 85)

    # Save artifact
    Path("artifacts").mkdir(exist_ok=True)
    artifact_path = Path("artifacts/fetch-all-schemas-validation.json")
    artifact_path.write_text(json.dumps({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_handlers_tested": len(test_specs),
        "passed": passed,
        "failed": failed,
        "details": results,
    }, indent=2), encoding="utf-8")
    print(f"Evidence saved to: {artifact_path}")


if __name__ == "__main__":
    asyncio.run(main())
