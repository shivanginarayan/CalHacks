"""Run from the project root: python -m scripts.export_contract."""

import json
from pathlib import Path

from backend.engine import Economy
from backend.main import app
from backend.models import Entity, EventPage, World, Network


def main():
    destination = Path(__file__).resolve().parent.parent / "docs"
    destination.mkdir(exist_ok=True)
    world = Economy.create("world_example", seed=42, households=6, businesses=2, banks=2)
    world.step()
    examples = {
        "create_world_request": {"seed": 42, "households": 6, "businesses": 2, "banks": 2},
        "world_after_one_tick": World.model_validate(world.view()).model_dump(),
        "business_detail": Entity.model_validate(world.entity_view("business_1")).model_dump(),
        "events": EventPage.model_validate({"events": world.state["events"],
                                           "next_after": len(world.state["events"]),
                                           "has_more": False}).model_dump(),
        "audit": world.audit(),
    }
    baseline = Economy.create("world_crisis_example", scenario="credit_crunch")
    shocked = Economy(baseline.state)
    before_network = Network.model_validate(shocked.network()).model_dump()
    shock_request = {"transaction_id": "demo-shock-1", "bank_id": "bank_1", "loss_bps": 4000}
    receipt = shocked.shock(**shock_request)
    baseline.step(12)
    shocked.step(12)
    crisis = {"create_world_request": {"seed": 42, "scenario": "credit_crunch"},
              "shock_request": shock_request, "shock_receipt": receipt,
              "network_before": before_network,
              "baseline_metrics": baseline.metrics(), "shocked_metrics": shocked.metrics(),
              "world_after_crisis": World.model_validate(shocked.view()).model_dump(),
              "network_after": Network.model_validate(shocked.network()).model_dump(),
              "crisis_events": [event for event in shocked.state["events"]
                                if event["event_type"] in {"bank_asset_loss", "bank_status_changed",
                                  "business_default", "loan_default", "interbank_default", "job_lost"}],
              "audit": shocked.audit()}
    for name, value in [("openapi.json", app.openapi()), ("examples.json", examples),
                        ("crisis_demo.json", crisis)]:
        (destination / name).write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote docs/{name}")


if __name__ == "__main__":
    main()
