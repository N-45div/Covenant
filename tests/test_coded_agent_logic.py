import sys
import unittest
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1] / "uipath-coded-agent" / "src"),
)

from covenant_clearance_strategy_agent.logic import evaluate_packet


class CovenantClearanceStrategyAgentTests(unittest.TestCase):
    def test_missing_evidence_routes_to_remediation(self):
        result = evaluate_packet(
            {
                "order_id": "ORD-MRI-1001",
                "coverage": {
                    "requires_prior_auth": True,
                    "route": "prior_auth_required",
                },
                "evidence": {
                    "matched": [
                        {"id": "diagnosis", "label": "Lumbar radiculopathy diagnosis is documented"},
                    ],
                    "missing": [
                        {
                            "id": "therapy",
                            "label": "Six weeks of conservative therapy or PT documented",
                        }
                    ],
                },
            }
        )

        self.assertEqual(result.route, "missing_evidence")
        self.assertEqual(result.risk_level, "high")
        self.assertTrue(result.human_review_required)
        self.assertIn("conservative therapy", result.policy_gaps[0])

    def test_complete_prior_auth_routes_to_clinician_review(self):
        result = evaluate_packet(
            {
                "order_id": "ORD-MRI-1001",
                "coverage": {
                    "requires_prior_auth": True,
                    "route": "prior_auth_required",
                },
                "evidence": {
                    "matched": [
                        {"id": "diagnosis", "label": "Lumbar radiculopathy diagnosis is documented"},
                        {"id": "duration", "label": "Symptoms persisted for at least six weeks"},
                        {"id": "therapy", "label": "Six weeks of conservative therapy or PT documented"},
                        {"id": "specialist", "label": "Ordering specialist recommendation is present"},
                    ],
                    "missing": [],
                },
            }
        )

        self.assertEqual(result.route, "clinician_review")
        self.assertEqual(result.risk_level, "medium")
        self.assertTrue(result.human_review_required)

    def test_denial_routes_to_rescue(self):
        result = evaluate_packet(
            {
                "order_id": "ORD-MRI-1001",
                "coverage": {
                    "requires_prior_auth": True,
                    "route": "prior_auth_required",
                },
                "evidence": {
                    "matched": [
                        {"id": "diagnosis", "label": "Lumbar radiculopathy diagnosis is documented"},
                    ],
                    "missing": [],
                },
                "payer_decision": {
                    "status": "denied",
                    "reason": "Conservative therapy documentation not found",
                },
            }
        )

        self.assertEqual(result.route, "denial_rescue")
        self.assertEqual(result.risk_level, "high")
        self.assertTrue(result.human_review_required)
        self.assertIn("Conservative therapy", result.trace[-1].decision)

    def test_no_prior_auth_routes_to_ready_for_submission(self):
        result = evaluate_packet(
            {
                "order_id": "ORD-MRI-1001",
                "coverage": {
                    "requires_prior_auth": False,
                    "route": "no_prior_auth",
                },
                "evidence": {
                    "matched": [],
                    "missing": [],
                },
            }
        )

        self.assertEqual(result.route, "ready_for_submission")
        self.assertEqual(result.risk_level, "low")
        self.assertFalse(result.human_review_required)

    def test_camel_case_inputs_are_accepted(self):
        result = evaluate_packet(
            {
                "orderId": "ORD-MRI-1001",
                "coverage": {
                    "requiresPriorAuth": True,
                    "route": "prior_auth_required",
                    "documentationRequirements": [],
                },
                "evidence": {
                    "matched": [],
                    "missing": [],
                },
                "payerDecision": {
                    "status": "denied",
                    "reason": "Conservative therapy documentation not found",
                },
            }
        )

        self.assertEqual(result.route, "denial_rescue")
        self.assertTrue(result.human_review_required)


if __name__ == "__main__":
    unittest.main()
