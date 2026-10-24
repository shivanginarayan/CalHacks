import os
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend import __version__

from backend.engine import Economy
from backend.ledger import LedgerError
from backend.models import (Audit, Entity, EventPage, LoanRequest, Metrics, PaymentRequest,
                            StepRequest, Transaction, TransactionPage, World, WorldConfig,
                            ShockRequest, Network, InterventionRequest, ForkRequest, ForkComparison, ForkSummary)
from backend.store import Store
from backend.agents import run_agent
from backend.provider import ProviderNotConfigured, provider_status
from backend.models import AgentRunRequest, AgentReport, ApplyAgentRequest, AgentApplication
from backend.credit_agents import run_credit
from backend.models import CreditRunRequest, CreditReport, CreditSettlement
from backend.procurement import run_procurement
from backend.models import ProcurementRequest, ProcurementReport, ProcurementSettlement, SupplierContract


def create_app(db_path=None):
    app = FastAPI(title="Economy God Mode", version=__version__,
                  description="Financial simulation, Fork Reality, and central-bank agent workflows. All amounts are integer USD cents.")
    default_db = Path(__file__).resolve().parent.parent / "data" / "economy.sqlite3"
    store = Store(db_path or os.getenv("ECONOMY_DB_PATH", str(default_db)))
    app.state.store = store
    origins = os.getenv("ECONOMY_CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173")
    app.add_middleware(CORSMiddleware, allow_origins=[s.strip() for s in origins.split(",") if s.strip()],
                       allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

    @app.exception_handler(KeyError)
    async def missing(request: Request, error: KeyError):
        return JSONResponse(status_code=404, content={"detail": f"Unknown resource: {error.args[0]}"})

    @app.exception_handler(LedgerError)
    async def rejected(request: Request, error: LedgerError):
        return JSONResponse(status_code=409, content={"detail": str(error)})

    @app.exception_handler(ProviderNotConfigured)
    async def unconfigured(request: Request, error: ProviderNotConfigured):
        return JSONResponse(status_code=503, content={"detail": str(error)})

    @app.get("/health")
    def health():
        return {"status": "ok", "version": __version__}

    @app.post("/api/worlds", response_model=World, status_code=201)
    def create_world(config: WorldConfig):
        world = Economy.create(f"world_{uuid4().hex[:16]}", **config.model_dump())
        store.create(world)
        return world.view()

    @app.get("/api/worlds/{simulation_id}", response_model=World)
    def get_world(simulation_id: str):
        return store.get(simulation_id).view()

    @app.post("/api/worlds/{simulation_id}/step", response_model=World)
    def step(simulation_id: str, body: StepRequest):
        def operation(world):
            world.step(body.ticks)
            return world.view()
        return store.mutate(simulation_id, operation)

    @app.get("/api/worlds/{simulation_id}/entities/{entity_id}", response_model=Entity)
    def entity(simulation_id: str, entity_id: str):
        return store.get(simulation_id).entity_view(entity_id)

    @app.get("/api/worlds/{simulation_id}/metrics", response_model=list[Metrics])
    def metrics(simulation_id: str, after_tick: int = Query(default=-1, ge=-1)):
        return [m for m in store.get(simulation_id).state["history"] if m["simulation_tick"] > after_tick]

    @app.get("/api/worlds/{simulation_id}/events", response_model=EventPage)
    def events(simulation_id: str, after: int = Query(default=0, ge=0),
               limit: int = Query(default=200, ge=1, le=1000)):
        all_events = store.get(simulation_id).state["events"]
        page = all_events[after:after + limit]
        cursor = page[-1]["sequence"] if page else after
        return {"events": page, "next_after": cursor, "has_more": cursor < len(all_events)}

    @app.get("/api/worlds/{simulation_id}/transactions", response_model=TransactionPage)
    def transactions(simulation_id: str, offset: int = Query(default=0, ge=0),
                     limit: int = Query(default=100, ge=1, le=1000)):
        journal = store.get(simulation_id).ledger.state["journal"]
        page = journal[offset:offset + limit]
        return {"transactions": page, "next_offset": offset + len(page),
                "has_more": offset + len(page) < len(journal)}

    @app.post("/api/worlds/{simulation_id}/payments", response_model=Transaction)
    def payment(simulation_id: str, body: PaymentRequest):
        return store.mutate(simulation_id, lambda world: world.pay(**body.model_dump()))

    @app.post("/api/worlds/{simulation_id}/loans", response_model=Transaction)
    def loan(simulation_id: str, body: LoanRequest):
        return store.mutate(simulation_id, lambda world: world.loan(**body.model_dump()))

    @app.post("/api/worlds/{simulation_id}/loan-repayments", response_model=Transaction)
    def repayment(simulation_id: str, body: LoanRequest):
        return store.mutate(simulation_id, lambda world: world.loan(**body.model_dump(), repay=True))

    @app.get("/api/worlds/{simulation_id}/audit", response_model=Audit)
    def audit(simulation_id: str):
        return store.get(simulation_id).audit()

    @app.post("/api/worlds/{simulation_id}/shocks", response_model=Transaction)
    def shock(simulation_id: str, body: ShockRequest):
        return store.mutate(simulation_id, lambda world: world.shock(**body.model_dump()))

    @app.get("/api/worlds/{simulation_id}/network", response_model=Network)
    def network(simulation_id: str):
        return store.get(simulation_id).network()

    @app.post("/api/worlds/{simulation_id}/interventions", response_model=Transaction)
    def intervention(simulation_id: str, body: InterventionRequest):
        return store.mutate(simulation_id, lambda world: world.intervene(**body.model_dump()))

    @app.post("/api/worlds/{simulation_id}/forks", response_model=ForkComparison)
    def fork(simulation_id: str, body: ForkRequest):
        return store.fork(simulation_id, body.model_dump())

    @app.get("/api/worlds/{simulation_id}/forks", response_model=list[ForkSummary])
    def list_forks(simulation_id: str):
        return store.list_forks(simulation_id)

    @app.get("/api/forks/{fork_id}", response_model=ForkComparison)
    def comparison(fork_id: str):
        return store.get_fork(fork_id)

    @app.get("/api/agents/status")
    def agent_status():
        return provider_status()

    @app.post("/api/worlds/{simulation_id}/agent-runs", response_model=AgentReport)
    def agent_run(simulation_id: str, body: AgentRunRequest):
        return run_agent(store, simulation_id, body.model_dump())

    @app.get("/api/worlds/{simulation_id}/agent-runs", response_model=list[AgentReport])
    def agent_runs(simulation_id: str):
        return store.list_agents(simulation_id)

    @app.get("/api/agent-runs/{run_id}", response_model=AgentReport)
    def agent_report(run_id: str):
        return store.get_agent(run_id)

    @app.post("/api/agent-runs/{run_id}/apply", response_model=AgentApplication)
    def apply_agent(run_id: str, body: ApplyAgentRequest):
        return store.apply_agent(run_id, body.transaction_id)

    @app.post("/api/worlds/{simulation_id}/businesses/{business_id}/credit-runs", response_model=CreditReport)
    def credit_run(simulation_id: str, business_id: str, body: CreditRunRequest):
        return run_credit(store, simulation_id, business_id, body.model_dump())

    @app.get("/api/worlds/{simulation_id}/businesses/{business_id}/credit-runs", response_model=list[CreditReport])
    def credit_runs(simulation_id: str, business_id: str):
        return store.list_credit(simulation_id, business_id)

    @app.get("/api/credit-runs/{run_id}", response_model=CreditReport)
    def credit_report(run_id: str):
        return store.get_credit(run_id)

    @app.post("/api/credit-runs/{run_id}/settle", response_model=CreditSettlement)
    def settle_credit(run_id: str, body: ApplyAgentRequest):
        return store.settle_credit(run_id, body.transaction_id)

    @app.post("/api/worlds/{simulation_id}/businesses/{buyer_id}/procurement-runs", response_model=ProcurementReport)
    def procurement_run(simulation_id: str, buyer_id: str, body: ProcurementRequest):
        return run_procurement(store, simulation_id, buyer_id, body.model_dump())

    @app.get("/api/worlds/{simulation_id}/businesses/{buyer_id}/procurement-runs", response_model=list[ProcurementReport])
    def procurement_runs(simulation_id: str, buyer_id: str):
        return store.list_procurement(simulation_id, buyer_id)

    @app.get("/api/procurement-runs/{run_id}", response_model=ProcurementReport)
    def procurement_report(run_id: str):
        return store.get_procurement(run_id)

    @app.post("/api/procurement-runs/{run_id}/settle", response_model=ProcurementSettlement)
    def settle_procurement(run_id: str, body: ApplyAgentRequest):
        return store.settle_procurement(run_id, body.transaction_id)

    @app.get("/api/worlds/{simulation_id}/contracts", response_model=list[SupplierContract])
    def contracts(simulation_id: str):
        return list(store.get(simulation_id).state.get("contracts", {}).values())

    @app.get("/api/worlds/{simulation_id}/contracts/{contract_id}", response_model=SupplierContract)
    def contract(simulation_id: str, contract_id: str):
        return store.get(simulation_id).state.get("contracts", {})[contract_id]

    @app.post("/api/worlds/{simulation_id}/contracts/{contract_id}/pay", response_model=Transaction)
    def pay_contract(simulation_id: str, contract_id: str, body: ApplyAgentRequest):
        return store.mutate(simulation_id, lambda source: source.pay_contract(body.transaction_id, contract_id))

    return app


app = create_app()
