"""Capital One Nessie Banking API Integration and State Mirror.

Maps simulated businesses, banks, and public entities into Capital One Nessie
customer profiles and deposit/loan accounts. Records matching transaction receipts
while strictly maintaining authoritative double-entry separation.
"""
from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional
import httpx

NESSIE_BASE_URL = os.getenv("NESSIE_BASE_URL", "http://api.nessieisreal.com").rstrip("/")
NESSIE_API_KEY = os.getenv("NESSIE_API_KEY", "")

# In-memory synchronous mirror stores per simulation ID
_NESSIE_STORES: Dict[str, Dict[str, Any]] = {}


def _get_or_create_store(simulation_id: str) -> Dict[str, Any]:
    if simulation_id not in _NESSIE_STORES:
        _NESSIE_STORES[simulation_id] = {
            "customers": {},
            "accounts": {},
            "transfers": [],
            "deposits": [],
            "loans": [],
            "synchronized_at": time.time(),
        }
    return _NESSIE_STORES[simulation_id]


def is_live_configured() -> bool:
    return bool(NESSIE_API_KEY)


def sync_world_entities(world_state: Dict[str, Any]) -> Dict[str, Any]:
    """Synchronize simulated entities to Nessie customer and account records."""
    simulation_id = world_state["simulation_id"]
    store = _get_or_create_store(simulation_id)
    entities = world_state.get("entities", {})
    if isinstance(entities, list):
        entities = {e["id"]: e for e in entities}

    for entity_id, entity in entities.items():
        if entity.get("kind") not in ("business", "bank", "government", "central_bank"):
            continue

        # 1. Customer record
        cust_id = f"nessie_cust_{simulation_id}_{entity_id}"
        if cust_id not in store["customers"]:
            store["customers"][cust_id] = {
                "_id": cust_id,
                "first_name": entity.get("name", entity_id),
                "last_name": "Commercial Corp" if entity.get("kind") == "business" else "Institution",
                "address": {
                    "street_number": "100",
                    "street_name": "Market St",
                    "city": "San Francisco",
                    "state": "CA",
                    "zip": "94105",
                },
                "entity_id": entity_id,
                "entity_kind": entity.get("kind"),
            }

        # 2. Operating Account record
        acct_id = f"nessie_acct_{simulation_id}_{entity_id}"
        sheet = entity.get("balance_sheet", {})
        assets = sheet.get("assets", {})
        cash_cents = assets.get("deposit") or assets.get("reserves") or 0
        balance_usd = round(cash_cents / 100, 2)

        store["accounts"][acct_id] = {
            "_id": acct_id,
            "type": "Checking",
            "nickname": f"{entity.get('name', entity_id)} Operating Account",
            "rewards": 0,
            "balance": balance_usd,
            "account_number": f"1000{abs(hash(entity_id)) % 10000000:07d}",
            "customer_id": cust_id,
            "entity_id": entity_id,
            "status": entity.get("status", "active"),
        }

    store["synchronized_at"] = time.time()
    return {
        "simulation_id": simulation_id,
        "customers_count": len(store["customers"]),
        "accounts_count": len(store["accounts"]),
        "synchronized_at": store["synchronized_at"],
    }


def record_event_transaction(simulation_id: str, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Record a matching Nessie transfer or deposit from an authoritative economy event."""
    store = _get_or_create_store(simulation_id)
    event_type = event.get("event_type")
    agent_id = event.get("agent_id")
    counterparty_id = event.get("counterparty_id")
    amount_cents = event.get("amount_cents") or 0

    if not agent_id or not counterparty_id or amount_cents <= 0:
        return None

    amount_usd = round(amount_cents / 100, 2)
    payer_acct = f"nessie_acct_{simulation_id}_{agent_id}"
    payee_acct = f"nessie_acct_{simulation_id}_{counterparty_id}"

    transfer_record = {
        "_id": f"nessie_tx_{event.get('sequence', len(store['transfers']) + 1)}",
        "type": event_type,
        "transaction_date": time.strftime("%Y-%m-%d"),
        "status": "completed",
        "medium": "balance",
        "payer_id": payer_acct,
        "payee_id": payee_acct,
        "amount": amount_usd,
        "description": f"{event_type.replace('_', ' ').title()} - {amount_usd} USD",
        "simulation_tick": event.get("simulation_tick", 0),
        "source_sequence": event.get("sequence"),
    }
    store["transfers"].append(transfer_record)
    return transfer_record


def get_entity_nessie_account(simulation_id: str, entity_id: str) -> Optional[Dict[str, Any]]:
    """Get the Nessie account record associated with a simulated entity."""
    store = _get_or_create_store(simulation_id)
    acct_id = f"nessie_acct_{simulation_id}_{entity_id}"
    return store["accounts"].get(acct_id)


def get_nessie_summary(simulation_id: str) -> Dict[str, Any]:
    """Get the comprehensive Nessie banking mirror summary for a simulation."""
    store = _get_or_create_store(simulation_id)
    return {
        "simulation_id": simulation_id,
        "live_configured": is_live_configured(),
        "endpoint": NESSIE_BASE_URL,
        "customers_count": len(store["customers"]),
        "accounts_count": len(store["accounts"]),
        "transfers_count": len(store["transfers"]),
        "accounts": list(store["accounts"].values()),
        "recent_transfers": store["transfers"][-10:],
    }
