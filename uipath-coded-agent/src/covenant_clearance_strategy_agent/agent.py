from __future__ import annotations

from typing import Any

from .graph import run_graph
from .schemas import PolicyVarianceInput


def run_clearance_strategy_agent(payload: dict[str, Any]) -> dict[str, Any]:
    packet = PolicyVarianceInput.model_validate(payload)
    return run_graph(packet).model_dump()


if __name__ == "__main__":  # pragma: no cover
    import json
    import sys

    raw = sys.stdin.read().strip()
    payload = json.loads(raw) if raw else {}
    print(json.dumps(run_clearance_strategy_agent(payload), indent=2))
