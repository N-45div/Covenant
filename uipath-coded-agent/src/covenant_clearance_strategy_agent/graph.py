from __future__ import annotations

from typing import Any, TypedDict

from .llm import enrich_with_openrouter
from .logic import evaluate_packet, matched_labels, missing_labels, normalize_packet, policy_gaps
from .schemas import PolicyVarianceInput, PolicyVarianceOutput


class AgentState(TypedDict, total=False):
    packet: PolicyVarianceInput
    matched_labels: list[str]
    missing_labels: list[str]
    policy_gaps: list[str]
    result: PolicyVarianceOutput


def normalize_inputs(state: AgentState) -> AgentState:
    packet = normalize_packet(state["packet"])
    return {
        "packet": packet,
        "matched_labels": matched_labels(packet),
        "missing_labels": missing_labels(packet),
        "policy_gaps": policy_gaps(packet),
    }


def evaluate_route(state: AgentState) -> AgentState:
    result = evaluate_packet(state["packet"])
    return {"result": result}


def generate_staff_summary(state: AgentState) -> AgentState:
    enriched = enrich_with_openrouter(state["packet"], state["result"])
    return {"result": enriched}


def build_graph():
    from langgraph.graph import END, START, StateGraph

    graph = StateGraph(AgentState)
    graph.add_node("normalize_inputs", normalize_inputs)
    graph.add_node("evaluate_route", evaluate_route)
    graph.add_node("generate_staff_summary", generate_staff_summary)

    graph.add_edge(START, "normalize_inputs")
    graph.add_edge("normalize_inputs", "evaluate_route")
    graph.add_edge("evaluate_route", "generate_staff_summary")
    graph.add_edge("generate_staff_summary", END)
    return graph.compile()


def run_graph(payload: dict[str, Any] | PolicyVarianceInput) -> PolicyVarianceOutput:
    graph = build_graph()
    state = graph.invoke({"packet": normalize_packet(payload)})
    return state["result"]
