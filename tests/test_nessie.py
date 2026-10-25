"""Tests for Capital One Nessie banking integration and mirror."""
import pytest
from backend.nessie import (
    sync_world_entities,
    record_event_transaction,
    get_entity_nessie_account,
    get_nessie_summary,
    is_live_configured,
)


def test_nessie_sync_and_account_mapping():
    sim_id = "test_nessie_sim_1"
    sample_world = {
        "simulation_id": sim_id,
        "entities": {
            "business_1": {
                "id": "business_1",
                "name": "Cafe Seventy8",
                "kind": "business",
                "status": "active",
                "balance_sheet": {
                    "assets": {"deposit": 125000},
                    "assets_cents": 250000,
                    "liabilities_cents": 50000,
                    "equity_cents": 200000,
                },
            },
            "bank_1": {
                "id": "bank_1",
                "name": "First Commercial Bank",
                "kind": "bank",
                "status": "active",
                "balance_sheet": {
                    "assets": {"reserves": 500000},
                    "assets_cents": 1000000,
                    "liabilities_cents": 800000,
                    "equity_cents": 200000,
                },
            },
        },
    }

    sync_result = sync_world_entities(sample_world)
    assert sync_result["simulation_id"] == sim_id
    assert sync_result["customers_count"] == 2
    assert sync_result["accounts_count"] == 2

    # Verify specific entity account
    account = get_entity_nessie_account(sim_id, "business_1")
    assert account is not None
    assert account["type"] == "Checking"
    assert account["balance"] == 1250.00
    assert "Cafe Seventy8" in account["nickname"]

    # Record event
    event = {
        "event_type": "salary",
        "agent_id": "business_1",
        "counterparty_id": "bank_1",
        "amount_cents": 20000,
        "sequence": 42,
        "simulation_tick": 1,
    }
    tx = record_event_transaction(sim_id, event)
    assert tx is not None
    assert tx["amount"] == 200.00
    assert tx["type"] == "salary"

    # Verify summary
    summary = get_nessie_summary(sim_id)
    assert summary["customers_count"] == 2
    assert summary["transfers_count"] == 1
    assert len(summary["accounts"]) == 2
