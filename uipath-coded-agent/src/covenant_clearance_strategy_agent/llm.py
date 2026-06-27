from __future__ import annotations

import os
from typing import Any

from .schemas import PolicyVarianceInput, PolicyVarianceOutput


SYSTEM_PROMPT = (
    "You are an administrative policy variance reviewer inside a UiPath-orchestrated treatment clearance workflow. "
    "Do not provide medical advice, do not claim medical necessity, and do not override required human review. "
    "Explain the workflow routing decision in concise staff-facing language."
)


def _config() -> dict[str, str | None]:
    return {
        "api_key": os.getenv("OPENROUTER_API_KEY"),
        "model": os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash-lite"),
        "base_url": os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        "http_referer": os.getenv(
            "OPENROUTER_HTTP_REFERER",
            "https://covenant-treatment-clearance.ndivij2004.workers.dev",
        ),
        "app_title": os.getenv("OPENROUTER_APP_TITLE", "Covenant Treatment Clearance"),
    }


def llm_enabled() -> bool:
    return bool(_config()["api_key"])


def enrich_with_openrouter(
    packet: PolicyVarianceInput,
    result: PolicyVarianceOutput,
) -> PolicyVarianceOutput:
    cfg = _config()
    if not cfg["api_key"]:
        result.llm_provider = "OpenRouter"
        result.llm_model = str(cfg["model"])
        result.llm_status = "not_configured"
        return result

    try:
        from langchain_openai import ChatOpenAI
    except Exception as exc:  # pragma: no cover
        result.llm_provider = "OpenRouter"
        result.llm_model = str(cfg["model"])
        result.llm_status = "failed"
        result.llm_error = f"langchain_openai import failed: {exc}"
        return result

    try:
        model = ChatOpenAI(
            api_key=cfg["api_key"],
            model=str(cfg["model"]),
            base_url=str(cfg["base_url"]),
            temperature=0.2,
            default_headers={
                "HTTP-Referer": str(cfg["http_referer"]),
                "X-Title": str(cfg["app_title"]),
            },
        )
        response = model.invoke(
            [
                ("system", SYSTEM_PROMPT),
                (
                    "user",
                    PolicyVarianceInput.model_validate(packet).model_dump_json(indent=2),
                ),
                (
                    "user",
                    result.model_dump_json(indent=2),
                ),
            ]
        )
        explanation = getattr(response, "content", "")
        if isinstance(explanation, list):
            explanation = " ".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in explanation
            )

        result.llm_provider = "OpenRouter"
        result.llm_model = str(cfg["model"])
        result.llm_status = "succeeded"
        result.llm_explanation = (
            explanation.strip()
            if isinstance(explanation, str) and explanation.strip()
            else "OpenRouter completed without a staff-facing explanation."
        )
        return result
    except Exception as exc:  # pragma: no cover
        result.llm_provider = "OpenRouter"
        result.llm_model = str(cfg["model"])
        result.llm_status = "failed"
        result.llm_error = str(exc)
        return result
