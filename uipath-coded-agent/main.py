from __future__ import annotations

import sys
from pathlib import Path

from pydantic import BaseModel
from uipath.platform import UiPath

PROJECT_ROOT = Path(__file__).resolve().parent
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from covenant_clearance_strategy_agent.graph import run_graph
from covenant_clearance_strategy_agent.schemas import (
    PolicyVarianceInput,
    PolicyVarianceOutput,
)


class Input(PolicyVarianceInput):
    pass


class Output(PolicyVarianceOutput):
    pass


async def main(input_data: Input) -> Output:
    UiPath()
    result = run_graph(input_data)
    if isinstance(result, BaseModel):
        return Output.model_validate(result.model_dump())
    return Output.model_validate(result)
