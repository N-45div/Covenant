# Covenant Clearance Strategy Agent

Native coded-agent implementation for the Covenant treatment-clearance workflow.

This package ports the existing external policy-variance agent into a LangGraph + LangChain implementation that can be synced into UiPath Studio as a coded agent.

It is intentionally narrow:

- administrative only
- deterministic-first
- strict structured output
- optional OpenRouter explanation layer
- no treatment decisions or medical-necessity claims

## Inputs

- `order_id`
- `coverage`
- `evidence`
- `payer_decision`

## Outputs

- `route`
- `risk_level`
- `policy_gaps`
- `next_best_action`
- `human_review_required`
- `audit_note`
- `trace`
- optional OpenRouter explanation fields

## Local shape

- `schemas.py` defines the contract
- `logic.py` contains deterministic routing rules
- `graph.py` builds the LangGraph workflow
- `agent.py` exposes the callable entrypoint used for sync and local execution

## Sync intent

The Studio-side coded agent should call this package and then be invoked from Maestro BPMN using `Start and wait for agent`.
