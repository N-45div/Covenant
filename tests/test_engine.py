import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from covenantaccess import engine


class CovenantAccessEngineTests(unittest.TestCase):
    def setUp(self):
        engine.STORE.reset()

    def test_missing_evidence_then_pt_note_completes_packet(self):
        order = engine.get_order("ORD-MRI-1001")
        coverage = engine.check_coverage(order)
        extraction = engine.extract_documents(order["documents"])
        evidence = engine.check_evidence(coverage["policy_id"], engine.flatten_facts(extraction))

        self.assertFalse(evidence["complete"])
        self.assertEqual(evidence["missing"][0]["id"], "therapy")

        order["documents"].append("pt-note-1001")
        extraction = engine.extract_documents(order["documents"])
        evidence = engine.check_evidence(coverage["policy_id"], engine.flatten_facts(extraction))

        self.assertTrue(evidence["complete"])

    def test_demo_reaches_approved_scheduled_audited_end_state(self):
        result = engine.run_demo()

        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["final"]["payer_status"], "approved")
        self.assertTrue(result["final"]["appointment_id"].startswith("APT-"))
        self.assertTrue(result["final"]["audit_packet_id"].startswith("AUD-"))

        step_names = [step["step"] for step in result["steps"]]
        self.assertIn("missing_document_uploaded", step_names)
        self.assertIn("appeal_packet_built", step_names)
        self.assertIn("appeal_approved", step_names)

    def test_xray_order_has_no_prior_auth_route(self):
        order = engine.get_order("ORD-XRAY-1002")
        coverage = engine.check_coverage(order)

        self.assertFalse(coverage["requires_prior_auth"])
        self.assertEqual(coverage["route"], "no_prior_auth")
        self.assertEqual(coverage["documentation_requirements"], [])


if __name__ == "__main__":
    unittest.main()
