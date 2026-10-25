"""Replay committed simulation events into a small shared SpacetimeDB read model."""
import asyncio
import json
import os
import re
import time
from urllib.parse import urlsplit

import httpx

from backend.provider import ProviderError, ProviderNotConfigured


def settings():
    base = os.getenv("SPACETIMEDB_URL", "http://127.0.0.1:3000").rstrip("/")
    parsed = urlsplit(base)
    if (parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1"))) or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ProviderNotConfigured("SpacetimeDB URL must use HTTPS or localhost HTTP")
    database = os.getenv("SPACETIMEDB_DATABASE", "")
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,128}", database):
        raise ProviderNotConfigured("Set SPACETIMEDB_DATABASE to the published database name")
    token = os.getenv("SPACETIMEDB_TOKEN", "")
    if not token:
        raise ProviderNotConfigured("Set the publishing identity's SPACETIMEDB_TOKEN")
    return base + "/v1/database/" + database, {"Authorization": "Bearer " + token}


def sync_status(store, simulation_id):
    world = store.get(simulation_id)
    with store.connection() as connection:
        row = connection.execute("SELECT cursor, enabled, error, updated FROM spacetime_sync WHERE source_id=?", (simulation_id,)).fetchone()
    return {"enabled": bool(row and row[1]), "last_sequence": row[0] if row else 0,
            "source_sequence": len(world.state["events"]), "error": row[2] if row else None,
            "updated_at": row[3] if row else None, "database": os.getenv("SPACETIMEDB_DATABASE") or None}


def enable(store, simulation_id):
    settings()
    store.get(simulation_id)
    with store.connection() as connection:
        connection.execute("INSERT INTO spacetime_sync (source_id, updated) VALUES (?,?) ON CONFLICT(source_id) DO UPDATE SET enabled=1",
                           (simulation_id, time.time()))
    sync_world(store, simulation_id)
    return sync_status(store, simulation_id)


def sync_world(store, simulation_id):
    base, headers = settings()
    world = store.get(simulation_id)
    cursor = sync_status(store, simulation_id)["last_sequence"]
    events = world.state["events"][cursor:cursor + 100]
    if not events:
        return
    # Fixed, bounded projection. No model prompts, identity payloads or private keys.
    batch = [{"key": f"{simulation_id}:{e['sequence']}", "simulation_id": simulation_id,
              "sequence": e["sequence"], "tick": e["simulation_tick"], "event_type": e["event_type"],
              "actor_id": e["agent_id"] or "", "counterparty_id": e["counterparty_id"] or "",
              "amount_cents": e["amount_cents"] or 0} for e in events]
    try:
        with httpx.Client(timeout=10, trust_env=False, follow_redirects=False) as client:
            response = client.post(base + "/call/ingest_events", headers=headers, json=[json.dumps(batch)])
            response.raise_for_status()
        with store.connection() as connection:
            connection.execute("UPDATE spacetime_sync SET cursor=MAX(cursor,?), error=NULL, updated=? WHERE source_id=?",
                               (events[-1]["sequence"], time.time(), simulation_id))
    except httpx.HTTPError:
        with store.connection() as connection:
            connection.execute("UPDATE spacetime_sync SET error=?, updated=? WHERE source_id=?",
                               ("SpacetimeDB delivery failed; committed events will be retried", time.time(), simulation_id))
        raise ProviderError("SpacetimeDB delivery failed; financial state is saved and events remain retryable") from None


def shared_events(simulation_id):
    base, headers = settings()
    # Server-generated world IDs still require validation before SQL interpolation.
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", simulation_id):
        raise ProviderError("Invalid world ID")
    try:
        with httpx.Client(timeout=10, trust_env=False, follow_redirects=False) as client:
            response = client.post(base + "/sql", headers=headers,
                                   content=f"SELECT * FROM economy_event WHERE simulation_id = '{simulation_id}' LIMIT 100")
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPError, ValueError):
        raise ProviderError("Could not read the SpacetimeDB shared event feed") from None


async def mirror_worker(store, stop):
    while not stop.is_set():
        with store.connection() as connection:
            ids = [r[0] for r in connection.execute("SELECT source_id FROM spacetime_sync WHERE enabled=1")]
        for simulation_id in ids:
            if stop.is_set():
                break
            try:
                await asyncio.to_thread(sync_world, store, simulation_id)
            except (ProviderError, KeyError):
                pass
        try:
            await asyncio.wait_for(stop.wait(), timeout=2)
        except TimeoutError:
            pass
