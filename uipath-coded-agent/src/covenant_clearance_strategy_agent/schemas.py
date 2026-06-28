from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


Route = Literal[
    "missing_evidence",
    "clinician_review",
    "denial_rescue",
    "ready_for_submission",
]
RiskLevel = Literal["low", "medium", "high"]
LlmStatus = Literal["not_configured", "succeeded", "failed"]


class PolicyRequirement(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: str
    label: str
    fact: str | None = None
    expected: str | None = None
    minimum: float | None = None
    present: bool | None = None


class EvidenceItem(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: str | None = None
    label: str | None = None
    fact: str | None = None
    value: Any | None = None
    passed: bool | None = None


class CoverageInput(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    policy_id: str | None = Field(default=None, alias="policyId")
    requires_prior_auth: bool | None = Field(default=None, alias="requiresPriorAuth")
    route: str | None = None
    documentation_requirements: list[PolicyRequirement] = Field(default_factory=list, alias="documentationRequirements")


class EvidenceInput(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    complete: bool | None = None
    route: str | None = None
    matched: list[EvidenceItem] = Field(default_factory=list)
    missing: list[EvidenceItem] = Field(default_factory=list)
    summary: str | None = None


class PayerDecisionInput(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    status: str | None = None
    route: str | None = None
    reason: str | None = None


class PolicyVarianceInput(BaseModel):
    model_config = ConfigDict(extra="allow", populate_by_name=True)

    order_id: str = Field(default="ORD-MRI-1001", alias="orderId")
    coverage: CoverageInput = Field(default_factory=CoverageInput)
    evidence: EvidenceInput = Field(default_factory=EvidenceInput)
    payer_decision: PayerDecisionInput = Field(default_factory=PayerDecisionInput, alias="payerDecision")


class TraceItem(BaseModel):
    step: str
    decision: str


class PolicyVarianceOutput(BaseModel):
    agent: str = "CovenantClearanceStrategyAgent"
    framework: str = "LangGraph"
    llm_provider: str | None = None
    llm_model: str | None = None
    llm_status: LlmStatus | None = None
    llm_explanation: str | None = None
    llm_error: str | None = None
    route: Route
    risk_level: RiskLevel
    policy_gaps: list[str]
    next_best_action: str
    human_review_required: bool
    audit_note: str
    trace: list[TraceItem]
