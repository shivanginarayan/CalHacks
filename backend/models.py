from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class WorldConfig(Request):
    seed: int = Field(default=42, ge=0, le=2**32 - 1)
    households: int = Field(default=40, ge=1, le=2000)
    businesses: int = Field(default=8, ge=1, le=150)
    banks: int = Field(default=5, ge=1, le=10)
    scenario: Literal["standard", "credit_crunch"] = "standard"


class StepRequest(Request):
    ticks: int = Field(default=1, ge=1, le=100)


class FinancialRequest(Request):
    transaction_id: str = Field(min_length=1, max_length=128)

    @field_validator("transaction_id")
    @classmethod
    def external_transaction_id(cls, value):
        if value.startswith(("genesis:", "tick:")):
            raise ValueError("The genesis: and tick: transaction prefixes are reserved")
        return value


class PaymentRequest(FinancialRequest):
    payer_id: str = Field(min_length=1, max_length=128)
    receiver_id: str = Field(min_length=1, max_length=128)
    amount_cents: int = Field(gt=0, le=10**12)


class LoanRequest(FinancialRequest):
    borrower_id: str = Field(min_length=1, max_length=128)
    amount_cents: int = Field(gt=0, le=10**12)


class ShockRequest(FinancialRequest):
    bank_id: str = Field(min_length=1, max_length=128)
    asset_category: Literal["risky_assets"] = "risky_assets"
    loss_bps: int = Field(default=4000, ge=1, le=10000)


class BalanceSheet(BaseModel):
    assets: dict[str, int]
    liabilities: dict[str, int]
    equity: dict[str, int]
    assets_cents: int
    liabilities_cents: int
    equity_cents: int
    balanced: bool


class Entity(BaseModel):
    id: str
    name: str
    kind: Literal["household", "business", "bank", "government", "central_bank"]
    status: str
    bank_id: str | None = None
    employer_id: str | None = None
    employees: list[str] | None = None
    price_cents: int | None = None
    wage_cents: int | None = None
    consumption_budget_cents: int | None = None
    loan_due_tick: int | None = None
    missed_debt_ticks: int = 0
    missed_payroll_ticks: int = 0
    interbank_default: bool = False
    capital_ratio: float | None = None
    liquidity_ratio: float | None = None
    lending_available: bool | None = None
    balance_sheet: BalanceSheet


class Metrics(BaseModel):
    simulation_tick: int
    households: int
    businesses: int
    banks: int
    employed_households: int
    employment_rate: float
    household_cash_cents: int
    business_cash_cents: int
    total_deposits_cents: int
    total_bank_reserves_cents: int
    total_loans_cents: int
    business_defaults: int
    stressed_banks: int
    insolvent_banks: int = 0
    public_intervention_cost_cents: int


class World(BaseModel):
    simulation_id: str
    seed: int
    simulation_tick: int
    status: Literal["paused"]
    config: WorldConfig
    metrics: Metrics
    entities: list[Entity]
    latest_event_sequence: int


class Event(BaseModel):
    sequence: int
    simulation_id: str
    simulation_tick: int
    event_type: str
    agent_id: str | None
    counterparty_id: str | None
    amount_cents: int | None
    transaction_id: str | None
    details: dict[str, Any]


class EventPage(BaseModel):
    events: list[Event]
    next_after: int
    has_more: bool


class JournalLine(BaseModel):
    account_id: str
    signed_cents: int


class Transaction(BaseModel):
    transaction_id: str
    lines: list[JournalLine]
    metadata: dict[str, Any]


class TransactionPage(BaseModel):
    transactions: list[Transaction]
    next_offset: int
    has_more: bool


class Audit(BaseModel):
    balanced: bool
    journal_matches_balances: bool
    bank_counterparties_match: bool
    interbank_counterparties_match: bool = True
    transaction_count: int
    account_count: int


class Exposure(BaseModel):
    kind: Literal["interbank", "customer_loan"]
    borrower_id: str
    lender_id: str
    amount_cents: int
    due_tick: int | None


class Network(BaseModel):
    simulation_id: str
    simulation_tick: int
    exposures: list[Exposure]
