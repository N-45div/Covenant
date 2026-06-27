from __future__ import annotations

from typing import Any

from .schemas import PolicyVarianceInput, PolicyVarianceOutput, TraceItem


def matched_labels(packet: PolicyVarianceInput) -> list[str]:
    labels = []
    for item in packet.evidence.matched:
        label = item.label or item.id or "matched evidence"
        labels.append(label)
    return labels


def missing_labels(packet: PolicyVarianceInput) -> list[str]:
    labels = []
    for item in packet.evidence.missing:
        label = item.label or item.id or "missing evidence"
        labels.append(label)
    return labels


def dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    deduped: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        deduped.append(value)
    return deduped


def normalize_packet(payload: dict[str, Any] | PolicyVarianceInput) -> PolicyVarianceInput:
    if isinstance(payload, PolicyVarianceInput):
        return payload
    return PolicyVarianceInput.model_validate(payload)


def has_prior_auth_requirement(packet: PolicyVarianceInput) -> bool:
    return packet.coverage.requires_prior_auth is True or packet.coverage.route == "prior_auth_required"


def payer_status(packet: PolicyVarianceInput) -> str:
    return packet.payer_decision.status or packet.payer_decision.route or ""


def has_denial(packet: PolicyVarianceInput) -> bool:
    return payer_status(packet) == "denied"


def policy_gaps(packet: PolicyVarianceInput) -> list[str]:
    return dedupe_preserve_order(missing_labels(packet))


def build_trace(packet: PolicyVarianceInput, gaps: list[str]) -> list[TraceItem]:
    return [
        TraceItem(
            step="coverage",
            decision="prior authorization required" if has_prior_auth_requirement(packet) else "prior authorization not required",
        ),
        TraceItem(
            step="evidence",
            decision=f"{len(gaps)} documentation gap(s) found" if gaps else "payer evidence checklist complete",
        ),
    ]


def evaluate_packet(payload: dict[str, Any] | PolicyVarianceInput) -> PolicyVarianceOutput:
    packet = normalize_packet(payload)
    gaps = policy_gaps(packet)
    trace = build_trace(packet, gaps)

    if has_denial(packet):
        return PolicyVarianceOutput(
            route="denial_rescue",
            risk_level="high",
            policy_gaps=gaps or [packet.payer_decision.reason or "Payer denial requires appeal review"],
            next_best_action="Build denial rescue packet and route to physician approval before appeal submission.",
            human_review_required=True,
            audit_note=(
                "Covenant clearance strategy detected a payer denial and routed the case to denial rescue with mandatory physician review."
            ),
            trace=trace
            + [
                TraceItem(
                    step="payer_decision",
                    decision=packet.payer_decision.reason or "denied",
                )
            ],
        )

    if gaps:
        return PolicyVarianceOutput(
            route="missing_evidence",
            risk_level="high",
            policy_gaps=gaps,
            next_best_action="Route to clinic coordinator to upload missing payer-required evidence, then rerun evidence review.",
            human_review_required=True,
            audit_note=(
                "Covenant clearance strategy found a payer-policy evidence gap before submission and routed the case to remediation."
            ),
            trace=trace,
        )

    if has_prior_auth_requirement(packet):
        return PolicyVarianceOutput(
            route="clinician_review",
            risk_level="medium",
            policy_gaps=[],
            next_best_action="Route completed packet to clinician approval before payer submission.",
            human_review_required=True,
            audit_note=(
                "Covenant clearance strategy found no open payer checklist gaps, but prior authorization still requires clinician review."
            ),
            trace=trace,
        )

    return PolicyVarianceOutput(
        route="ready_for_submission",
        risk_level="low",
        policy_gaps=[],
        next_best_action="No prior authorization needed; schedule care and notify patient.",
        human_review_required=False,
        audit_note=(
            "Covenant clearance strategy found no prior authorization requirement and no policy variance requiring human escalation."
        ),
        trace=trace,
    )
