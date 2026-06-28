from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from covenantaccess import engine


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    if length == 0:
        return {}
    return json.loads(handler.rfile.read(length).decode("utf-8"))


def pick(payload: dict[str, Any], *keys: str, default: Any = None) -> Any:
    for key in keys:
        if key in payload and payload[key] is not None:
            return payload[key]
    return default


def pick_order(payload: dict[str, Any], fallback: str = "ORD-MRI-1001") -> dict[str, Any]:
    return payload.get("order") or engine.get_order(pick(payload, "order_id", "orderId", default=fallback))


class CovenantAccessHandler(BaseHTTPRequestHandler):
    server_version = "CovenantAccess/0.1"

    def do_GET(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            if path == "/health":
                json_response(self, 200, {"status": "ok", "service": "covenantaccess"})
                return
            if path.startswith("/ehr/orders/"):
                order_id = path.rsplit("/", 1)[-1]
                json_response(self, 200, engine.get_order(order_id))
                return
            if path.startswith("/payer/prior-auth/"):
                auth_id = path.rsplit("/", 1)[-1]
                json_response(self, 200, engine.get_prior_auth_status(auth_id))
                return
            json_response(self, 404, {"error": "not_found", "path": path})
        except KeyError as exc:
            json_response(self, 404, {"error": "not_found", "detail": str(exc)})
        except Exception as exc:  # pragma: no cover - final guard for HTTP boundary
            json_response(self, 500, {"error": "internal_error", "detail": str(exc)})

    def do_POST(self) -> None:  # noqa: N802
        path = urlparse(self.path).path
        try:
            payload = read_json(self)
            if path == "/demo/run":
                json_response(self, 200, engine.run_demo())
                return
            if path == "/documents/extract":
                json_response(self, 200, engine.extract_documents(pick(payload, "document_ids", "documentIds", default=[])))
                return
            if path == "/payer/coverage":
                order = pick_order(payload)
                json_response(self, 200, engine.check_coverage(order))
                return
            if path == "/evidence/check":
                json_response(self, 200, engine.check_evidence(payload["policy_id"], payload["facts"]))
                return
            if path == "/payer/prior-auth":
                json_response(self, 200, engine.submit_prior_auth(pick_order(payload), payload["evidence"]))
                return
            if path.endswith("/appeal") and path.startswith("/payer/prior-auth/"):
                auth_id = path.split("/")[-2]
                result = engine.submit_appeal(
                    auth_id,
                    pick(payload, "appeal_packet", "appealPacket"),
                    pick(payload, "approved_by", "approvedBy"),
                )
                json_response(self, 200, result)
                return
            if path == "/appeals/build":
                result = engine.build_appeal_packet(
                    pick(payload, "auth_id", "authId"),
                    pick(payload, "physician_note", "physicianNote"),
                )
                json_response(self, 200, result)
                return
            if path == "/schedule":
                result = engine.schedule_treatment(pick_order(payload), pick(payload, "auth_id", "authId"))
                json_response(self, 200, result)
                return
            if path == "/notify":
                result = engine.notify_patient(pick_order(payload), payload["appointment"])
                json_response(self, 200, result)
                return
            if path == "/audit/packet":
                result = engine.create_audit_packet(
                    pick_order(payload),
                    pick(payload, "auth_id", "authId"),
                    payload["appointment"],
                )
                json_response(self, 200, result)
                return
            json_response(self, 404, {"error": "not_found", "path": path})
        except KeyError as exc:
            json_response(self, 400, {"error": "bad_request", "detail": str(exc)})
        except Exception as exc:  # pragma: no cover - final guard for HTTP boundary
            json_response(self, 500, {"error": "internal_error", "detail": str(exc)})

    def log_message(self, format: str, *args: Any) -> None:
        return


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8088)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), CovenantAccessHandler)
    print(f"CovenantAccess mock API listening on http://{args.host}:{args.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
