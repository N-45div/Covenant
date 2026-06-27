from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


ORDERS: dict[str, dict[str, Any]] = {
    "ORD-MRI-1001": {
        "order_id": "ORD-MRI-1001",
        "patient": {
            "id": "PAT-2042",
            "name": "Maya Rodriguez",
            "dob": "1981-04-12",
            "phone": "+1-555-0104",
        },
        "provider": {
            "id": "NPI-4455667788",
            "name": "Dr. Priya Shah",
            "specialty": "Orthopedics",
        },
        "payer": {
            "id": "PAYER-ACME-MA",
            "name": "Acme Medicare Advantage",
            "member_id": "ACME-77-2042",
        },
        "treatment": {
            "name": "Lumbar spine MRI without contrast",
            "cpt": "72148",
            "icd10": "M54.16",
            "urgency": "standard",
        },
        "documents": [
            "clinical-note-1001",
            "referral-letter-1001",
            "insurance-card-1001",
        ],
    }
}

DOCUMENTS: dict[str, dict[str, Any]] = {
    "clinical-note-1001": {
        "document_id": "clinical-note-1001",
        "type": "clinical_note",
        "confidence": 0.93,
        "facts": {
            "diagnosis": "Lumbar radiculopathy",
            "duration_weeks": 10,
            "neurologic_deficit": True,
            "conservative_therapy_attempted": True,
            "red_flags": False,
        },
    },
    "referral-letter-1001": {
        "document_id": "referral-letter-1001",
        "type": "referral",
        "confidence": 0.89,
        "facts": {
            "specialist_recommendation": "MRI recommended after persistent symptoms",
            "ordering_provider": "Dr. Priya Shah",
        },
    },
    "insurance-card-1001": {
        "document_id": "insurance-card-1001",
        "type": "insurance_card",
        "confidence": 0.98,
        "facts": {
            "payer": "Acme Medicare Advantage",
            "member_id": "ACME-77-2042",
        },
    },
    "pt-note-1001": {
        "document_id": "pt-note-1001",
        "type": "physical_therapy_note",
        "confidence": 0.91,
        "facts": {
            "physical_therapy_weeks": 6,
            "home_exercise_program": True,
            "symptoms_persisted": True,
        },
    },
}

POLICIES: dict[str, dict[str, Any]] = {
    "ACME-MRI-LUMBAR": {
        "policy_id": "ACME-MRI-LUMBAR",
        "payer_id": "PAYER-ACME-MA",
        "cpt": "72148",
        "requires_prior_auth": True,
        "checklist": [
            {
                "id": "diagnosis",
                "label": "Lumbar radiculopathy diagnosis is documented",
                "fact": "diagnosis",
                "expected": "Lumbar radiculopathy",
            },
            {
                "id": "duration",
                "label": "Symptoms persisted for at least six weeks",
                "fact": "duration_weeks",
                "minimum": 6,
            },
            {
                "id": "therapy",
                "label": "Six weeks of conservative therapy or PT documented",
                "fact": "physical_therapy_weeks",
                "minimum": 6,
            },
            {
                "id": "specialist",
                "label": "Ordering specialist recommendation is present",
                "fact": "specialist_recommendation",
                "present": True,
            },
        ],
    }
}


@dataclass
class ClearanceStore:
    authorizations: dict[str, dict[str, Any]] = field(default_factory=dict)
    audit_packets: dict[str, dict[str, Any]] = field(default_factory=dict)

    def reset(self) -> None:
        self.authorizations.clear()
        self.audit_packets.clear()


STORE = ClearanceStore()


def get_order(order_id: str) -> dict[str, Any]:
    if order_id not in ORDERS:
        raise KeyError(f"unknown order: {order_id}")
    return deepcopy(ORDERS[order_id])


def extract_documents(document_ids: list[str]) -> dict[str, Any]:
    extracted = []
    for document_id in document_ids:
        if document_id not in DOCUMENTS:
            extracted.append(
                {
                    "document_id": document_id,
                    "status": "missing",
                    "confidence": 0,
                    "facts": {},
                }
            )
            continue
        extracted.append(deepcopy(DOCUMENTS[document_id]))
    low_confidence = [doc for doc in extracted if doc.get("confidence", 0) < 0.9]
    return {
        "status": "extracted",
        "documents": extracted,
        "requires_validation": bool(low_confidence),
        "validation_reasons": [
            f"{doc['document_id']} confidence {doc.get('confidence', 0)}"
            for doc in low_confidence
        ],
    }


def flatten_facts(extraction: dict[str, Any]) -> dict[str, Any]:
    facts: dict[str, Any] = {}
    for document in extraction["documents"]:
        facts.update(document.get("facts", {}))
    return facts


def check_coverage(order: dict[str, Any]) -> dict[str, Any]:
    treatment = order["treatment"]
    for policy in POLICIES.values():
        if policy["payer_id"] == order["payer"]["id"] and policy["cpt"] == treatment["cpt"]:
            return {
                "payer_id": order["payer"]["id"],
                "policy_id": policy["policy_id"],
                "requires_prior_auth": policy["requires_prior_auth"],
                "documentation_requirements": deepcopy(policy["checklist"]),
            }
    return {
        "payer_id": order["payer"]["id"],
        "policy_id": None,
        "requires_prior_auth": False,
        "documentation_requirements": [],
    }


def check_evidence(policy_id: str, facts: dict[str, Any]) -> dict[str, Any]:
    policy = POLICIES[policy_id]
    matches = []
    missing = []
    for item in policy["checklist"]:
        value = facts.get(item["fact"])
        passed = False
        if "expected" in item:
            passed = value == item["expected"]
        elif "minimum" in item:
            passed = isinstance(value, (int, float)) and value >= item["minimum"]
        elif item.get("present"):
            passed = value not in (None, "", [], {})

        record = {
            "id": item["id"],
            "label": item["label"],
            "fact": item["fact"],
            "value": value,
            "passed": passed,
        }
        if passed:
            matches.append(record)
        else:
            missing.append(record)

    return {
        "policy_id": policy_id,
        "complete": not missing,
        "matched": matches,
        "missing": missing,
        "summary": build_evidence_summary(matches, missing),
    }


def build_evidence_summary(matches: list[dict[str, Any]], missing: list[dict[str, Any]]) -> str:
    if not missing:
        return "All payer documentation requirements are supported by extracted evidence."
    missing_labels = ", ".join(item["label"] for item in missing)
    return f"Evidence packet is incomplete. Missing: {missing_labels}."


def submit_prior_auth(order: dict[str, Any], evidence: dict[str, Any]) -> dict[str, Any]:
    auth_id = f"AUTH-{uuid4().hex[:8].upper()}"
    status = "pending"
    decision = {
        "status": status,
        "reason": "Initial review pending",
        "submitted_at": utc_now(),
    }
    STORE.authorizations[auth_id] = {
        "auth_id": auth_id,
        "order_id": order["order_id"],
        "policy_id": evidence["policy_id"],
        "evidence": deepcopy(evidence),
        "history": [decision],
        "appeal_submitted": False,
    }
    return {"auth_id": auth_id, **decision}


def get_prior_auth_status(auth_id: str) -> dict[str, Any]:
    auth = STORE.authorizations[auth_id]
    if not auth["appeal_submitted"]:
        decision = {
            "status": "denied",
            "reason": "Payer requires explicit physical therapy duration and persistence after therapy.",
            "decided_at": utc_now(),
        }
        if auth["history"][-1]["status"] != "denied":
            auth["history"].append(decision)
        return {"auth_id": auth_id, **decision}

    decision = {
        "status": "approved",
        "reason": "Appeal accepted after physician attestation and PT documentation review.",
        "authorization_expires": "2026-09-30",
        "decided_at": utc_now(),
    }
    if auth["history"][-1]["status"] != "approved":
        auth["history"].append(decision)
    return {"auth_id": auth_id, **decision}


def build_appeal_packet(auth_id: str, physician_note: str) -> dict[str, Any]:
    auth = STORE.authorizations[auth_id]
    denial = next(item for item in reversed(auth["history"]) if item["status"] == "denied")
    return {
        "auth_id": auth_id,
        "denial_reason": denial["reason"],
        "appeal_summary": (
            "Appeal packet cites six weeks of physical therapy, persistent radicular symptoms, "
            "specialist recommendation, and physician attestation."
        ),
        "physician_note": physician_note,
        "requires_physician_approval": True,
        "generated_at": utc_now(),
    }


def submit_appeal(auth_id: str, appeal_packet: dict[str, Any], approved_by: str) -> dict[str, Any]:
    auth = STORE.authorizations[auth_id]
    auth["appeal_submitted"] = True
    event = {
        "status": "appeal_submitted",
        "approved_by": approved_by,
        "appeal_summary": appeal_packet["appeal_summary"],
        "submitted_at": utc_now(),
    }
    auth["history"].append(event)
    return {"auth_id": auth_id, **event}


def schedule_treatment(order: dict[str, Any], auth_id: str) -> dict[str, Any]:
    return {
        "appointment_id": f"APT-{uuid4().hex[:8].upper()}",
        "order_id": order["order_id"],
        "auth_id": auth_id,
        "scheduled_at": "2026-07-08T09:30:00-04:00",
        "site": "Northside Imaging Center",
    }


def notify_patient(order: dict[str, Any], appointment: dict[str, Any]) -> dict[str, Any]:
    return {
        "patient_id": order["patient"]["id"],
        "channel": "sms",
        "recipient": order["patient"]["phone"],
        "message": (
            f"Your {order['treatment']['name']} is approved and scheduled for "
            f"{appointment['scheduled_at']} at {appointment['site']}."
        ),
        "sent_at": utc_now(),
    }


def create_audit_packet(order: dict[str, Any], auth_id: str, appointment: dict[str, Any]) -> dict[str, Any]:
    packet_id = f"AUD-{uuid4().hex[:8].upper()}"
    packet = {
        "packet_id": packet_id,
        "order_id": order["order_id"],
        "auth_id": auth_id,
        "appointment_id": appointment["appointment_id"],
        "history": deepcopy(STORE.authorizations[auth_id]["history"]),
        "generated_at": utc_now(),
    }
    STORE.audit_packets[packet_id] = packet
    return packet


def run_demo() -> dict[str, Any]:
    STORE.reset()
    steps = []
    order = get_order("ORD-MRI-1001")
    steps.append({"step": "doctor_order_received", "actor": "EHR API", "output": order})

    coverage = check_coverage(order)
    steps.append({"step": "coverage_checked", "actor": "Payer API Workflow", "output": coverage})

    extraction = extract_documents(order["documents"])
    steps.append({"step": "documents_extracted", "actor": "IXP / Document Understanding", "output": extraction})

    evidence = check_evidence(coverage["policy_id"], flatten_facts(extraction))
    steps.append({"step": "evidence_checked", "actor": "Evidence Agent", "output": evidence})

    if not evidence["complete"]:
        order["documents"].append("pt-note-1001")
        steps.append(
            {
                "step": "missing_document_uploaded",
                "actor": "Clinic Coordinator User Task",
                "output": {"uploaded_document_id": "pt-note-1001"},
            }
        )
        extraction = extract_documents(order["documents"])
        evidence = check_evidence(coverage["policy_id"], flatten_facts(extraction))
        steps.append({"step": "evidence_rechecked", "actor": "Evidence Agent", "output": evidence})

    steps.append(
        {
            "step": "submission_approved",
            "actor": "Clinician User Task",
            "output": {"approved_by": "Dr. Priya Shah"},
        }
    )

    submission = submit_prior_auth(order, evidence)
    steps.append({"step": "prior_auth_submitted", "actor": "Payer API Workflow", "output": submission})

    decision = get_prior_auth_status(submission["auth_id"])
    steps.append({"step": "payer_decision_received", "actor": "Timer + Payer Status API", "output": decision})

    if decision["status"] == "denied":
        appeal = build_appeal_packet(submission["auth_id"], "Patient completed six weeks of PT with persistent radicular symptoms.")
        steps.append({"step": "appeal_packet_built", "actor": "Denial Rescue Agent", "output": appeal})
        steps.append(
            {
                "step": "appeal_approved",
                "actor": "Physician User Task",
                "output": {"approved_by": "Dr. Priya Shah"},
            }
        )
        appeal_submission = submit_appeal(submission["auth_id"], appeal, "Dr. Priya Shah")
        steps.append({"step": "appeal_submitted", "actor": "Payer API Workflow", "output": appeal_submission})
        decision = get_prior_auth_status(submission["auth_id"])
        steps.append({"step": "appeal_decision_received", "actor": "Timer + Payer Status API", "output": decision})

    appointment = schedule_treatment(order, submission["auth_id"])
    steps.append({"step": "treatment_scheduled", "actor": "Scheduling API Workflow", "output": appointment})

    notification = notify_patient(order, appointment)
    steps.append({"step": "patient_notified", "actor": "Patient Update Agent", "output": notification})

    audit = create_audit_packet(order, submission["auth_id"], appointment)
    steps.append({"step": "audit_packet_created", "actor": "Audit Service Task", "output": audit})

    return {
        "process": "Covenant Treatment Clearance",
        "status": "completed",
        "steps": steps,
        "final": {
            "order_id": order["order_id"],
            "auth_id": submission["auth_id"],
            "payer_status": decision["status"],
            "appointment_id": appointment["appointment_id"],
            "audit_packet_id": audit["packet_id"],
        },
    }
